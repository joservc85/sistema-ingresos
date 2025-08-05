 //controllers/dashboardController.js
import { Op } from 'sequelize';
import { Actividad, Precio, Cliente } from '../models/index.js';

// Muestra el panel de control con las métricas del día
const mostrarDashboard = async (req, res) => {
    try {
        // Configurar el rango de fechas para el día actual en la zona horaria de Bogotá
        const hoy = new Date();
        const fechaQuery = hoy.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
        const inicioDelDia = new Date(`${fechaQuery}T00:00:00.000-05:00`);
        const finDelDia = new Date(`${fechaQuery}T23:59:59.999-05:00`);

        // Obtener todas las actividades y vales del día
        const [actividadesDelDia, valesDelDia] = await Promise.all([
            Actividad.findAll({
                where: {
                    createdAt: { [Op.between]: [inicioDelDia, finDelDia] },
                    estado: 'Realizada',
                    vales: null
                },
                include: [Precio, Cliente]
            }),
            Actividad.findAll({
                where: {
                    createdAt: { [Op.between]: [inicioDelDia, finDelDia] },
                    vales: { [Op.ne]: null }
                }
            })
        ]);

        // Calcular las métricas
        const totalVentasHoy = actividadesDelDia.reduce((total, act) => total + parseFloat(act.precio?.monto || 0), 0);
        const totalValesHoy = valesDelDia.reduce((total, vale) => total + parseFloat(vale.vales), 0);
        
        // Contar clientes únicos
        const clientesIds = new Set();
        actividadesDelDia.forEach(act => {
            if (act.clienteId) {
                clientesIds.add(act.clienteId);
            }
        });
        const clientesAtendidosHoy = clientesIds.size;

        res.render('dashboard/index', { // Crearemos esta vista
            pagina: 'Panel de Control',
            barra: true,
            piePagina: true,
            totalVentasHoy,
            clientesAtendidosHoy,
            totalValesHoy
        });

    } catch (error) {
        console.error('Error al cargar el dashboard:', error);
        // Manejo de error
    }
};

export {
    mostrarDashboard
};