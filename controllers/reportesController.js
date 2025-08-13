import { Op, fn, col, literal } from 'sequelize';
// Se importan todos los modelos necesarios para ambos reportes
import { Actividad, GastoAdicional, DetalleGastoAdministrativo, Articulo, Personal, Precio, Cliente } from '../models/index.js';

// Muestra el reporte de Ganancias y Pérdidas (enfocado en el Spa)
const gananciasPerdidas = async (req, res) => {
    const fechaFin = req.query.fecha_fin || new Date().toLocaleDateString('en-CA');
    const fechaInicio = req.query.fecha_inicio || new Date(new Date(fechaFin).setDate(1)).toLocaleDateString('en-CA');

    try {
        const inicio = new Date(`${fechaInicio}T00:00:00.000-05:00`);
        const fin = new Date(`${fechaFin}T23:59:59.999-05:00`);

        const totalIngresos = await Actividad.sum('precio.monto', {
            include: [{ model: Precio, as: 'precio', attributes: [] }],
            where: {
                createdAt: { [Op.between]: [inicio, fin] },
                estado: 'Realizada'
            }
        }) || 0;

        const totalCompras = await GastoAdicional.sum('valor_total', {
            where: {
                fecha_gasto: { [Op.between]: [inicio, fin] },
                estado: 'Consolidado'
            }
        }) || 0;

        const detallesConsumo = await DetalleGastoAdministrativo.findAll({
            include: [{ model: Articulo, as: 'articulo' }],
            where: { createdAt: { [Op.between]: [inicio, fin] } }
        });

        const totalConsumos = detallesConsumo.reduce((total, detalle) => {
            if (detalle.articulo && detalle.articulo.precio_compra) {
                return total + (parseFloat(detalle.articulo.precio_compra) * parseFloat(detalle.cantidad));
            }
            return total;
        }, 0);

        const totalGastos = totalCompras + totalConsumos;
        const gananciaNeta = totalIngresos - totalGastos;

        res.render('reportes/ganancias-perdidas', {
            pagina: 'Reporte de Ganancias y Pérdidas',
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            fechaInicio,
            fechaFin,
            totalIngresos,
            totalGastos,
            gananciaNeta
        });

    } catch (error) {
        console.error('Error al generar el reporte de ganancias y pérdidas:', error);
    }
};

// Muestra el reporte de rendimiento por personal
const reportePorPersonal = async (req, res) => {
    // --- 1. Se leen los parámetros de la URL para paginación y fechas ---
    const { page = 1 } = req.query;
    const elementosPorPagina = 10; // Puedes ajustar este número
    const offset = (page - 1) * elementosPorPagina;

    const fechaFin = req.query.fecha_fin || new Date().toLocaleDateString('en-CA');
    const fechaInicio = req.query.fecha_inicio || new Date(new Date(fechaFin).setDate(1)).toLocaleDateString('en-CA');

    try {
        const inicio = new Date(`${fechaInicio}T00:00:00.000-05:00`);
        const fin = new Date(`${fechaFin}T23:59:59.999-05:00`);

        // --- 2. Se ejecuta la consulta para obtener el reporte COMPLETO (sin paginación aquí) ---
        const reporteCompleto = await Actividad.findAll({
            attributes: [
                'personalId',
                [literal('COUNT(actividades.id)'), 'totalServicios'],
                [fn('SUM', col('precio.monto')), 'totalFacturado'],
                [fn('SUM', col('vales')), 'totalVales']
            ],
            include: [
                { model: Personal, as: 'personal', attributes: ['nombre', 'apellidos'], required: true },
                { model: Precio, as: 'precio', attributes: [] }
            ],
            where: {
                createdAt: { [Op.between]: [inicio, fin] },
                estado: 'Realizada'
            },
            group: ['personalId', 'personal.id'],
            order: [[literal('totalFacturado'), 'DESC']]
        });

        // 3. Se procesan los resultados para calcular la ganancia
        const reporteProcesado = reporteCompleto.map(item => {
            const data = item.toJSON();
            let porcentaje = 0.50;
            if (data.personalId === 6) {
                porcentaje = 0.60;
            }
            data.gananciaPersonal = data.totalFacturado * porcentaje;
            return data;
        });

        // --- 4. Se aplica la paginación sobre los resultados ya procesados ---
        const totalRegistros = reporteProcesado.length;
        const totalPaginas = Math.ceil(totalRegistros / elementosPorPagina);
        const reportePaginado = reporteProcesado.slice(offset, offset + elementosPorPagina);

        // 5. Se renderiza la vista con los datos paginados
        res.render('reportes/por-personal', {
            pagina: 'Reporte por Personal',
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            fechaInicio,
            fechaFin,
            reporte: reportePaginado, // Se envían solo las filas de la página actual
            paginaActual: Number(page),
            totalPaginas,
            count: totalRegistros
        });

    } catch (error) {
        console.error('Error al generar el reporte por personal:', error);
    }
};

// Muestra el reporte de los clientes más frecuentes
const reporteClientesFrecuentes = async (req, res) => {
    const fechaFin = req.query.fecha_fin || new Date().toLocaleDateString('en-CA');
    const fechaInicio = req.query.fecha_inicio || new Date(new Date(fechaFin).setMonth(new Date(fechaFin).getMonth() - 1)).toLocaleDateString('en-CA'); // Por defecto, el último mes

    try {
        const inicio = new Date(`${fechaInicio}T00:00:00.000-05:00`);
        const fin = new Date(`${fechaFin}T23:59:59.999-05:00`);

        // --- LÓGICA SIMPLIFICADA ---
        // 1. Obtener gastos de clientes únicamente en actividades del spa
        const gastosSpa = await Actividad.findAll({
            attributes: [
                'clienteId',
                [fn('SUM', col('precio.monto')), 'totalGastado']
            ],
            include: [
                { model: Cliente, attributes: ['nombre', 'apellidos'], required: true },
                { model: Precio, as: 'precio', attributes: [] }
            ],
            where: {
                createdAt: { [Op.between]: [inicio, fin] },
                estado: 'Realizada',
                clienteId: { [Op.ne]: null }
            },
            group: ['clienteId', 'Cliente.id']
        });

        // 2. Procesar, ordenar y tomar el Top 10
        const reporteFinal = gastosSpa.map(gasto => ({
            nombre: `${gasto.cliente.nombre} ${gasto.cliente.apellidos}`,
            totalGastado: parseFloat(gasto.dataValues.totalGastado)
        }))
        .sort((a, b) => b.totalGastado - a.totalGastado)
        .slice(0, 10);

        res.render('reportes/clientes-frecuentes', {
            pagina: 'Top 10 Clientes',
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            fechaInicio,
            fechaFin,
            reporte: reporteFinal
        });

    } catch (error) {
        console.error('Error al generar el reporte de clientes:', error);
    }
};

export {
    gananciasPerdidas,
    reportePorPersonal,
    reporteClientesFrecuentes
};