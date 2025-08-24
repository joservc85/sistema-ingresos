// controllers/dashboardController.js
import { Op, fn, col } from 'sequelize';
// --- 1. AÑADE AperturaDeCaja AQUÍ ---
import { Actividad, Precio, AperturaDeCaja } from '../models/index.js';
import sequelize from '../config/db.js';

const mostrarDashboard = async (req, res) => {
    try {
        // --- DEFINIR RANGOS DE FECHA ---
        const hoy = new Date();
        const fechaQueryHoy = hoy.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
        const inicioDelDia = new Date(`${fechaQueryHoy}T00:00:00.000-05:00`);
        const finDelDia = new Date(`${fechaQueryHoy}T23:59:59.999-05:00`);

        const fechaInicioSemana = new Date(inicioDelDia);
        fechaInicioSemana.setDate(inicioDelDia.getDate() - 6);

        // --- 2. MODIFICA ESTE BLOQUE PARA AÑADIR LA CONSULTA DE APERTURA ---
        const [resultadosAgrupados, aperturaHoy] = await Promise.all([
            Actividad.findAll({
                attributes: [
                    [fn('DATE', col('actividades.createdAt')), 'fecha'],
                    [fn('SUM', col('precio.monto')), 'totalVentas'],
                    [fn('COUNT', fn('DISTINCT', col('actividades.clienteId'))), 'clientesAtendidos'],
                    [fn('SUM', col('vales')), 'totalVales']
                ],
                include: [{ model: Precio, as: 'precio', attributes: [] }],
                where: {
                    createdAt: { [Op.between]: [fechaInicioSemana, finDelDia] },
                    estado: 'Realizada'
                },
                group: [fn('DATE', col('actividades.createdAt'))],
                order: [[fn('DATE', col('actividades.createdAt')), 'ASC']],
                raw: true
            }),
            // Esta es la nueva consulta que se añade
            AperturaDeCaja.findOne({
                where: { fecha_apertura: fechaQueryHoy }
            })
        ]);

        // Se crea la variable para la vista
        const cajaAbierta = !!aperturaHoy;

        // --- PROCESAR LOS RESULTADOS (sin cambios) ---
        let totalVentasHoy = 0;
        let clientesAtendidosHoy = 0;
        let totalValesHoy = 0;
        const ventasPorDia = {};

        resultadosAgrupados.forEach(item => {
            const fecha = item.fecha;
            ventasPorDia[fecha] = parseFloat(item.totalVentas || 0);

            if (fecha === fechaQueryHoy) {
                totalVentasHoy = parseFloat(item.totalVentas || 0);
                clientesAtendidosHoy = parseInt(item.clientesAtendidos || 0, 10);
                totalValesHoy = parseFloat(item.totalVales || 0);
            }
        });

        // --- PREPARAR DATOS PARA EL GRÁFICO (sin cambios) ---
        const ventasUltimos7Dias = [];
        const etiquetasDias = [];
        for (let i = 6; i >= 0; i--) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - i);
            const fechaFormateada = fecha.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
            
            ventasUltimos7Dias.push(ventasPorDia[fechaFormateada] || 0);
            etiquetasDias.push(fecha.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric' }));
        }

        // --- 3. AÑADE la variable 'cajaAbierta' AL RENDERIZAR LA VISTA ---
        res.render('dashboard/index', {
            pagina: 'Panel de Control',
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            totalVentasHoy,
            clientesAtendidosHoy,
            totalValesHoy,
            ventasUltimos7Dias: JSON.stringify(ventasUltimos7Dias),
            etiquetasDias: JSON.stringify(etiquetasDias),
            cajaAbierta // <-- Esta es la nueva variable para la vista
        });

    } catch (error) {
        console.error('Error al cargar el dashboard:', error);
        res.status(500).render('error', {
             pagina: 'Error en el Servidor',
             mensaje: 'No se pudo cargar la información del dashboard. Intente más tarde.'
        });
    }
};

export {
    mostrarDashboard
};