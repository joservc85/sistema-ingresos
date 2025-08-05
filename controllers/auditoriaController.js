// Crea un nuevo archivo en: /controllers/auditoriaController.js

import { Op } from 'sequelize';
import { Auditoria, Usuario } from '../models/index.js';

// Muestra el historial de auditoría con filtros y paginación
const listarAuditoria = async (req, res) => {
    const { page = 1, accion = '', usuarioId = '', fecha_inicio = '', fecha_fin = '' } = req.query;
    const elementosPorPagina = 15;
    const offset = (page - 1) * elementosPorPagina;

    const whereClause = {};
    if (accion) {
        whereClause.accion = accion;
    }
    if (usuarioId) {
        whereClause.usuarioId = usuarioId;
    }
    if (fecha_inicio && fecha_fin) {
        whereClause.createdAt = { [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin + 'T23:59:59')] };
    }

    try {
        const [usuarios, { count, rows: auditorias }] = await Promise.all([
            Usuario.findAll({ order: [['nombre', 'ASC']] }),
            Auditoria.findAndCountAll({
                where: whereClause,
                limit: elementosPorPagina,
                offset,
                include: [
                    { model: Usuario, attributes: ['nombre'] }
                ],
                order: [['createdAt', 'DESC']]
            })
        ]);

        const totalPaginas = Math.ceil(count / elementosPorPagina);

        res.render('auditoria/leer', {
            pagina: 'Historial de Auditoría',
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            auditorias,
            usuarios, // Para el filtro
            paginaActual: Number(page),
            totalPaginas,
            count,
            query: req.query
        });

    } catch (error) {
        console.error('Error al listar el historial de auditoría:', error);
    }
};

export {
    listarAuditoria
};