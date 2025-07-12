// controllers/apiController.js
import { Op } from 'sequelize'; 
import Articulo from '../models/Articulo.js';

const buscarArticulos = async (req, res) => {
    const { termino } = req.query;

    if (!termino || termino.trim() === '') {
        return res.json([]);
    }

    const articulos = await Articulo.findAll({
        where: {
            activo: true,
            [Op.or]: [
                // Corrección 1: 'Like' debe ser 'like' (minúscula)
                { nombre_articulo: { [Op.like]: `%${termino}%` } },
                
                // Corrección 2: 'iLike' también debe ser 'like' para MySQL
                { descripcion: { [Op.like]: `%${termino}%` } }
            ]
        },
        limit: 10
    });

    res.json(articulos);
};

export {
    buscarArticulos
};