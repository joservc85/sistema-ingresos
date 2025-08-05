// Añade estas nuevas funciones a tu archivo /controllers/ropaController.js

import { validationResult } from 'express-validator';
import { ArticuloRopa } from '../models/index.js';
import { Op } from 'sequelize';

// Muestra la lista de artículos de ropa
const listarRopa = async (req, res) => {
    const { page = 1, busqueda = '' } = req.query;
    const elementosPorPagina = 10; // Puedes ajustar este número
    const offset = (page - 1) * elementosPorPagina;

    const whereClause = {};
    if (busqueda) {
        whereClause[Op.or] = [
            { nombre: { [Op.like]: `%${busqueda}%` } },
            { marca: { [Op.like]: `%${busqueda}%` } },
            { color: { [Op.like]: `%${busqueda}%` } },
            { talla: { [Op.like]: `%${busqueda}%` } }
        ];
    }

    // Usamos findAndCountAll para obtener el total para la paginación
    const { count, rows: articulos } = await ArticuloRopa.findAndCountAll({
        where: whereClause,
        limit: elementosPorPagina,
        offset,
        order: [['nombre', 'ASC']]
    });

    const totalPaginas = Math.ceil(count / elementosPorPagina);

    res.render('ropa/leer', {
        pagina: 'Inventario de Ropa',
        articulos, // 'articulos' ahora contiene solo los de la página actual
        csrfToken: req.csrfToken(),
        barra: true,
        piePagina: true,
        busqueda,
        mensaje: req.query.mensaje,
        // --- Variables de paginación añadidas ---
        paginaActual: Number(page),
        totalPaginas,
        count
    });
};

// Muestra el formulario para registrar un nuevo artículo
const formularioRegistrar = async (req, res) => {
    res.render('ropa/registrar', {
        pagina: 'Registrar Artículo de Ropa',
        csrfToken: req.csrfToken(),
        barra: true,
        piePagina: true,
        datos: {}
    });
};

// Guarda un nuevo artículo de ropa
const guardarRopa = async (req, res) => {
    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
        return res.render('ropa/registrar', {
            pagina: 'Registrar Artículo de Ropa',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
            datos: req.body
        });
    }

    try {
        const datosRopa = req.body;
        if (!datosRopa.precio_compra) {
            datosRopa.precio_compra = null;
        }

        await ArticuloRopa.create(req.body);
        res.redirect('/inventario/ropa?mensaje=Artículo registrado correctamente');
    } catch (error) {
        console.error('Error al guardar el artículo de ropa:', error);
    }
};

// --- ¡NUEVAS FUNCIONES AÑADIDAS! ---

// Muestra el formulario para editar un artículo de ropa
const formularioEditar = async (req, res) => {
    const { id } = req.params;
    const articulo = await ArticuloRopa.findByPk(id);

    if (!articulo) {
        return res.redirect('/inventario/ropa');
    }

    res.render('ropa/editar', {
        pagina: `Editar Artículo: ${articulo.nombre}`,
        csrfToken: req.csrfToken(),
        barra: true,
        piePagina: true,
        articulo // Pasamos el artículo a la vista
    });
};

// Guarda los cambios de un artículo editado
const guardarEdicion = async (req, res) => {
    // Validación (similar a la de guardar)
    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
        const { id } = req.params;
        const articuloParaVista = { id, ...req.body };
        return res.render('ropa/editar', {
            pagina: `Editar Artículo: ${req.body.nombre || ''}`,
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
            articulo: articuloParaVista
        });
    }

    const { id } = req.params;
    const articulo = await ArticuloRopa.findByPk(id);

    if (!articulo) {
        return res.redirect('/inventario/ropa');
    }

    try {
        const datosActualizados = req.body;
        if (!datosActualizados.precio_compra) {
            datosActualizados.precio_compra = null;
        }
        
        req.body.activo = req.body.activo === 'on';
        await articulo.update(req.body);
        res.redirect('/inventario/ropa?mensaje=Artículo actualizado correctamente');
    } catch (error) {
        console.error('Error al actualizar el artículo de ropa:', error);
    }
};

// Elimina un artículo de ropa
const eliminarRopa = async (req, res) => {
    const { id } = req.params;
    const articulo = await ArticuloRopa.findByPk(id);

    if (!articulo) {
        return res.redirect('/inventario/ropa');
    }

    try {
        await articulo.destroy();
        res.redirect('/inventario/ropa?mensaje=Artículo eliminado correctamente');
    } catch (error) {
        console.error('Error al eliminar el artículo de ropa:', error);
    }
};


// No olvides exportar las nuevas funciones
export {
    listarRopa,
    formularioRegistrar,
    guardarRopa,
    formularioEditar,
    guardarEdicion,
    eliminarRopa
};