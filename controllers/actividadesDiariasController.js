import { Op } from 'sequelize';
import { Actividad, Personal, Procedimiento, Precio } from '../models/index.js';
import ExcelJS from 'exceljs';

const vistaPagosDiarios = async (req, res) => {
    try {
        const elementosPorPagina = 12;
        const paginaActual = Number(req.query.page) || 1;
        const offset = (paginaActual - 1) * elementosPorPagina;
        const { fechaInicio, fechaFin, personalId } = req.query;

        // --- 1. Definir los filtros para la consulta ---
        const whereClause = {};
        if (fechaInicio && fechaFin) {
            whereClause.createdAt = {
                [Op.between]: [new Date(fechaInicio), new Date(fechaFin + 'T23:59:59')]
            };
        }
        if (personalId) {
            whereClause.personalId = personalId;
        }

        // --- 2. Consulta a la BD (Modificada) ---
        // Se traen TODAS las actividades y vales del período (sin paginación aquí)
        const actividadesYVales = await Actividad.findAll({
            where: whereClause,
            include: [
                Personal,
                { // Se quita required: true para incluir actividades sin procedimiento (vales)
                    model: Procedimiento,
                    attributes: ['nombre'],
                    include: [{ model: Precio }]
                },
                Precio
            ],
            order: [['createdAt', 'ASC']]
        });


        // --- 3. Agrupación y Cálculos ---
        const pagosPorPersonal = {};

        for (const actividad of actividadesYVales) {
            if (!actividad.personalId) continue;

            const pId = actividad.personalId;
            const pNombre = actividad.personal?.nombre || 'Sin Asignar';

            if (!pagosPorPersonal[pId]) {
                pagosPorPersonal[pId] = {
                    nombre: pNombre,
                    totalGanancias: 0,
                    totalVales: 0,
                    actividades: [],
                    vales: []
                };
            }

            const esVale = !actividad.procedimientoId && actividad.vales > 0;

            if (esVale) {
                pagosPorPersonal[pId].totalVales += parseFloat(actividad.vales || 0);
                pagosPorPersonal[pId].vales.push(actividad.toJSON());
            } else if (actividad.precio && actividad.personal) { // Verificamos que exista el personal

                // --- LÓGICA DE CÁLCULO DE GANANCIA CORREGIDA ---
                const monto = parseFloat(actividad.precio?.monto || 0);
                let porcentaje = 0.50; // 50% por defecto para todos

                // Regla especial para el personal con ID 6
                if (actividad.personalId === 6) {
                    porcentaje = 0.60; // 60% para este trabajador
                }

                const gananciaPersonal = monto * porcentaje;
                // --- FIN DE LA LÓGICA DE CÁLCULO ---

                pagosPorPersonal[pId].totalGanancias += gananciaPersonal;
                const actividadConGanancia = { ...actividad.toJSON(), gananciaPersonal };
                pagosPorPersonal[pId].actividades.push(actividadConGanancia);
            }
        }

        // --- 4. Cálculo Final y Paginación ---
        const resumenPagos = Object.values(pagosPorPersonal).map(p => {
            p.pagoNeto = p.totalGanancias - p.totalVales;
            return p;
        });

        // Calcular los totales generales a partir del resumen completo (antes de paginar)
        const granTotalGanancias = resumenPagos.reduce((total, p) => total + p.totalGanancias, 0);
        const granTotalVales = resumenPagos.reduce((total, p) => total + p.totalVales, 0);
        const granTotalNeto = granTotalGanancias - granTotalVales;

        // Aplicar la paginación SOBRE EL RESUMEN, no sobre la consulta inicial
        const totalPaginas = Math.ceil(resumenPagos.length / elementosPorPagina);
        const pagosPaginados = resumenPagos.slice(offset, offset + elementosPorPagina);

        // --- 5. Renderizado ---
        const personal = await Personal.findAll(); // Para los filtros

        res.render('actividades/pagos', {
            pagina: 'Pagos Diarios',
            barra: true,
            piePagina: true,
            resumenPagos: pagosPaginados, // <-- Le pasamos el nuevo resumen paginado
            personal,
            csrfToken: req.csrfToken(),
            paginaActual,
            totalPaginas,
            count: resumenPagos.length,
            fechaInicio: fechaInicio || '',
            fechaFin: fechaFin || '',
            personalSeleccionado: personalId || '',
            granTotalGanancias,
            granTotalVales,
            granTotalNeto
        });

    } catch (error) {
        console.error('Error al obtener pagos diarios:', error);
        res.status(500).send('Error al obtener los pagos diarios.');
    }
};


const exportarPagosDiariosExcel = async (req, res) => {
    const { fechaInicio, fechaFin, personalId } = req.query;

    const filtros = {};

    if (fechaInicio && fechaFin) {
        filtros.createdAt = {
            [Op.between]: [new Date(fechaInicio), new Date(fechaFin + 'T23:59:59')]
        };
    }

    if (personalId) {
        filtros.personalId = personalId;
    }

    try {
        const actividades = await Actividad.findAll({
            where: filtros,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: Personal,
                    attributes: ['nombre'],
                    required: true
                },
                {
                    model: Procedimiento,
                    attributes: ['nombre'],
                    required: true,
                    include: [{
                        model: Precio,
                        attributes: ['monto']
                    }]
                }
            ]
        });

        // Crear archivo Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Pagos Diarios');

        // Encabezados
        worksheet.columns = [
            { header: 'Fecha', key: 'fecha', width: 15 },
            { header: 'Personal', key: 'personal', width: 25 },
            { header: 'Procedimiento', key: 'procedimiento', width: 25 },
            { header: 'Monto', key: 'monto', width: 15 },
            { header: '% Personal', key: 'gananciaPersonal', width: 15 },
            { header: '% Negocio', key: 'gananciaNegocio', width: 15 }
        ];

        let totalMonto = 0;
        let totalGananciaPersonal = 0;
        let totalGananciaNegocio = 0;

        // Agregar datos
        actividades.forEach(act => {
            const monto = parseFloat(act.procedimiento?.precio?.monto || 0);
            const porcentaje = act.personalId === 4 ? 0.6 : 0.5;
            const gananciaPersonal = monto * porcentaje;
            const gananciaNegocio = monto - gananciaPersonal;

            totalMonto += monto;
            totalGananciaPersonal += gananciaPersonal;
            totalGananciaNegocio += gananciaNegocio;

            worksheet.addRow({
                fecha: new Date(act.createdAt).toLocaleDateString(),
                personal: act.personal?.nombre || 'N/A',
                procedimiento: act.procedimiento?.nombre || 'N/A',
                monto,
                gananciaPersonal,
                gananciaNegocio
            });
        });

        // Agregar fila vacía y totales
        worksheet.addRow([]);
        worksheet.addRow({
            fecha: 'Totales:',
            monto: totalMonto,
            gananciaPersonal: totalGananciaPersonal,
            gananciaNegocio: totalGananciaNegocio
        });

        // Estilos para totales
        const lastRow = worksheet.lastRow;
        lastRow.font = { bold: true };
        lastRow.getCell('A').alignment = { horizontal: 'right' };

        // Descargar
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=pagos-diarios.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error al exportar a Excel:', error.message);
        res.status(500).send('Error al exportar pagos a Excel');
    }
};

export {
    vistaPagosDiarios,
    exportarPagosDiariosExcel
};
