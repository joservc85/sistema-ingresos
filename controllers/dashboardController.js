 //controllers/dashboardController.js
import { Op } from 'sequelize';
import { Actividad, Precio, Cliente } from '../models/index.js';

// Muestra el panel de control con las métricas del día
const mostrarDashboard = async (req, res) => {
    try {
        // --- 1. CÁLCULO DE MÉTRICAS DEL DÍA ACTUAL ---
        const hoy = new Date();
        const fechaQuery = hoy.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
        const inicioDelDia = new Date(`${fechaQuery}T00:00:00.000-05:00`);
        const finDelDia = new Date(`${fechaQuery}T23:59:59.999-05:00`);

        const [actividadesDelDia, valesDelDia] = await Promise.all([
            Actividad.findAll({
                where: { createdAt: { [Op.between]: [inicioDelDia, finDelDia] }, estado: 'Realizada', vales: null },
                include: [Precio, Cliente]
            }),
            Actividad.findAll({
                where: { createdAt: { [Op.between]: [inicioDelDia, finDelDia] }, vales: { [Op.ne]: null } }
            })
        ]);

        const totalVentasHoy = actividadesDelDia.reduce((total, act) => total + parseFloat(act.precio?.monto || 0), 0);
        const totalValesHoy = valesDelDia.reduce((total, vale) => total + parseFloat(vale.vales), 0);
        const clientesAtendidosHoy = new Set(actividadesDelDia.map(act => act.clienteId)).size;

        // --- 2. CÁLCULO DE DATOS PARA EL GRÁFICO (ÚLTIMOS 7 DÍAS) ---
        const ventasUltimos7Dias = [];
        const etiquetasDias = [];

        for (let i = 6; i >= 0; i--) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - i);
            const fechaFormateada = fecha.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
            
            const inicio = new Date(`${fechaFormateada}T00:00:00.000-05:00`);
            const fin = new Date(`${fechaFormateada}T23:59:59.999-05:00`);

            const totalVentas = await Actividad.sum('precio.monto', {
                include: [{ model: Precio, as: 'precio', attributes: [] }],
                where: {
                    createdAt: { [Op.between]: [inicio, fin] },
                    estado: 'Realizada'
                }
            }) || 0;

            ventasUltimos7Dias.push(totalVentas);
            etiquetasDias.push(fecha.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric' }));
        }

        res.render('dashboard/index', {
            pagina: 'Panel de Control',
            barra: true,
            piePagina: true,
            totalVentasHoy,
            clientesAtendidosHoy,
            totalValesHoy,
            // Se pasan los datos del gráfico a la vista
            ventasUltimos7Dias: JSON.stringify(ventasUltimos7Dias),
            etiquetasDias: JSON.stringify(etiquetasDias)
        });

    } catch (error) {
        console.error('Error al cargar el dashboard:', error);
    }
};

export {
    mostrarDashboard
};