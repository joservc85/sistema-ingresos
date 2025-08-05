// Crea un nuevo archivo en: /controllers/ventaRopaController.js

import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import db from '../config/db.js';
import { ArticuloRopa, VentaRopa, DetalleVentaRopa, Cliente, Usuario } from '../models/index.js';



// Muestra el formulario para registrar una venta
const formularioVenta = async (req, res) => {
    // Buscamos artículos de ropa con stock disponible y clientes de tipo 'Ropa' o 'Ambos'
    const [articulos, clientes] = await Promise.all([
        ArticuloRopa.findAll({
            where: {
                activo: true,
                stock_actual: { [Op.gt]: 0 }
            },
            order: [['nombre', 'ASC']]
        }),
        Cliente.findAll({ 
            where: { 
                activo: true,
                tipo: { [Op.in]: ['Ropa', 'Ambos'] }
            }, 
            order: [['nombre', 'ASC']] 
        })
    ]);

    res.render('ventas/ropa/registrar', {
        pagina: 'Registrar Venta de Ropa',
        csrfToken: req.csrfToken(),
        barra: true,
        piePagina: true,
        articulos,
        clientes,
        datos: {}
    });
};

// Guarda la venta y descuenta del inventario
const guardarVenta = async (req, res) => {
    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
        const [articulos, clientes] = await Promise.all([
            ArticuloRopa.findAll({ where: { activo: true, stock_actual: { [Op.gt]: 0 } } }),
            Cliente.findAll({ where: { activo: true, tipo: { [Op.in]: ['Ropa', 'Ambos'] } } })
        ]);
        return res.render('ventas/ropa/registrar', {
            pagina: 'Registrar Venta de Ropa',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            articulos,
            clientes,
            errores: resultado.array(),
            datos: req.body
        });
    }

    const t = await db.transaction();
    try {
        let { clienteId, articuloId, cantidad } = req.body;
        const { id: usuarioId } = req.usuario;

        if (articuloId && !Array.isArray(articuloId)) {
            articuloId = [articuloId];
            cantidad = [cantidad];
        }

        let totalVenta = 0;
        const detallesParaGuardar = [];

        for (let i = 0; i < articuloId.length; i++) {
            const idArticulo = articuloId[i];
            const cantVendida = parseInt(cantidad[i], 10);

            if (idArticulo && cantVendida > 0) {
                const articulo = await ArticuloRopa.findByPk(idArticulo, { transaction: t });
                if (!articulo || articulo.stock_actual < cantVendida) {
                    throw new Error(`Stock insuficiente para: ${articulo ? articulo.nombre : 'Desconocido'}`);
                }
                
                const subtotal = cantVendida * parseFloat(articulo.precio_venta);
                totalVenta += subtotal;

                articulo.stock_actual -= cantVendida;
                await articulo.save({ transaction: t });

                detallesParaGuardar.push({
                    articuloRopaId: idArticulo,
                    cantidad: cantVendida,
                    precio_unitario: articulo.precio_venta,
                    subtotal: subtotal
                });
            }
        }

        if (detallesParaGuardar.length === 0) {
            throw new Error('No se han añadido artículos válidos a la venta.');
        }

        const nuevaVenta = await VentaRopa.create({
            clienteId: clienteId || null,
            total_venta: totalVenta,
            usuarioId
        }, { transaction: t });

        const detallesFinales = detallesParaGuardar.map(d => ({ ...d, ventaRopaId: nuevaVenta.id }));
        await DetalleVentaRopa.bulkCreate(detallesFinales, { transaction: t });

        await t.commit();
        res.redirect('/inventario/ropa?mensaje=Venta registrada correctamente');

    } catch (error) {
        await t.rollback();
        console.error('Error al guardar la venta:', error);
        const [articulos, clientes] = await Promise.all([
            ArticuloRopa.findAll({ where: { activo: true, stock_actual: { [Op.gt]: 0 } } }),
            Cliente.findAll({ where: { activo: true, tipo: { [Op.in]: ['Ropa', 'Ambos'] } } })
        ]);
        res.render('ventas/ropa/registrar', {
            pagina: 'Registrar Venta de Ropa',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            articulos,
            clientes,
            errores: [{ msg: error.message }],
            datos: req.body
        });
    }
};

// Listar Ventas
const listarVentas = async (req, res) => {
    const { page = 1, busqueda = '', fecha_inicio = '', fecha_fin = '' } = req.query;
    const elementosPorPagina = 10;
    const offset = (page - 1) * elementosPorPagina;

    // --- Lógica de Búsqueda y Filtros ---
    const where = {};
    const includeWhereCliente = {};

    if (busqueda) {
        // Si se busca algo, se aplica el filtro al nombre o apellido del cliente
        includeWhereCliente[Op.or] = [
            { nombre: { [Op.like]: `%${busqueda}%` } },
            { apellidos: { [Op.like]: `%${busqueda}%` } }
        ];
    }

    if (fecha_inicio && fecha_fin) {
        // Filtro por rango de fechas
        where.fecha_venta = { [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin + 'T23:59:59')] };
    }

    const { count, rows: ventas } = await VentaRopa.findAndCountAll({
        where,
        limit: elementosPorPagina,
        offset,
        include: [
            {
                model: Cliente,
                where: includeWhereCliente,
                required: busqueda ? true : false // Hace INNER JOIN solo si se está buscando
            },
            { model: Usuario, attributes: ['nombre'] }
        ],
        order: [['fecha_venta', 'DESC']]
    });

    const totalPaginas = Math.ceil(count / elementosPorPagina);

    res.render('ventas/ropa/historial', {
        pagina: 'Historial de Ventas de Ropa',
        ventas,
        csrfToken: req.csrfToken(),
        barra: true,
        piePagina: true,
        mensaje: req.query.mensaje,
        paginaActual: Number(page),
        totalPaginas,
        count,
        // Pasar los valores de búsqueda a la vista para rellenar el formulario
        busqueda,
        fecha_inicio,
        fecha_fin
    });
};

// Elimina una venta de ropa y revierte el stock
const eliminarVenta = async (req, res) => {
    const { id } = req.params;
    console.log(`DEBUG: Iniciando eliminación de venta con ID: ${id}`);

    const t = await db.transaction();
    try {
        // 1. Buscar la venta con sus detalles y los artículos asociados
        const venta = await VentaRopa.findByPk(id, {
            include: [{
                model: DetalleVentaRopa,
                as: 'detalles',
                include: [ArticuloRopa] // Incluimos el modelo directamente
            }],
            transaction: t
        });

        if (!venta) {
            throw new Error('Venta no encontrada.');
        }

        console.log('DEBUG: Venta encontrada. Detalles:', JSON.stringify(venta.detalles, null, 2));

        // 2. Revertir el stock: devolver los artículos al inventario
        for (const detalle of venta.detalles) {
            console.log('DEBUG: Procesando detalle:', detalle.toJSON());

            // --- ¡CORRECCIÓN APLICADA AQUÍ! ---
            // Usamos 'articulos_ropa' (en minúsculas) para que coincida con los datos del log
            if (detalle.articulos_ropa) {
                console.log(`DEBUG: Artículo encontrado: ${detalle.articulos_ropa.nombre}. Stock ANTES: ${detalle.articulos_ropa.stock_actual}`);
                
                // Sumamos la cantidad vendida de vuelta al stock actual
                detalle.articulos_ropa.stock_actual += detalle.cantidad;
                
                console.log(`DEBUG: Stock DESPUÉS: ${detalle.articulos_ropa.stock_actual}`);
                
                await detalle.articulos_ropa.save({ transaction: t });
                console.log('DEBUG: Stock guardado en la base de datos.');

            } else {
                console.log('DEBUG: ADVERTENCIA - No se encontró el artículo asociado a este detalle.');
            }
        }

        // 3. Eliminar la venta
        await venta.destroy({ transaction: t });
        console.log('DEBUG: Registro de venta eliminado.');

        // 4. Si todo fue exitoso, confirmar la transacción
        await t.commit();
        console.log('DEBUG: Transacción confirmada (commit).');
        res.redirect('/ventas/ropa/historial?mensaje=Venta eliminada y stock revertido correctamente');

    } catch (error) {
        await t.rollback();
        console.error('DEBUG: Error durante la eliminación, se hizo rollback.', error);
        res.redirect(`/ventas/ropa/historial?error=${encodeURIComponent('No se pudo eliminar la venta.')}`);
    }
};

// ============== PASO 1.A: Añade esta nueva función a /controllers/ventaRopaController.js ==============

const verVenta = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscamos la venta con sus relaciones: cliente, usuario y detalles (con el artículo de ropa)
        const venta = await VentaRopa.findByPk(id, {
            include: [
                { model: Cliente },
                { model: Usuario, attributes: ['nombre'] },
                {
                    model: DetalleVentaRopa,
                    as: 'detalles', // Usamos el alias que definimos en las relaciones
                    include: [{ model: ArticuloRopa }]
                }
            ]
        });

        if (!venta) {
            return res.status(404).json({ msg: 'Venta no encontrada' });
        }

        // Devolvemos el resultado como JSON
        res.json(venta);

    } catch (error) {
        console.error('Error al obtener el detalle de la venta:', error);
        res.status(500).json({ msg: 'Error en el servidor' });
    }
};

// Muestra el formulario para editar una venta
const formularioEditarVenta = async (req, res) => {
    const { id } = req.params;

    try {
        const venta = await VentaRopa.findByPk(id, {
            include: [{
                model: DetalleVentaRopa,
                as: 'detalles',
                include: [ArticuloRopa]
            }]
        });

        if (!venta) {
            return res.redirect('/ventas/ropa/historial');
        }

        const [articulos, clientes] = await Promise.all([
            ArticuloRopa.findAll({ where: { activo: true } }),
            Cliente.findAll({ where: { activo: true, tipo: { [Op.in]: ['Ropa', 'Ambos'] } } })
        ]);

        res.render('ventas/ropa/editar', {
            pagina: 'Editar Venta de Ropa',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            venta,
            articulos,
            clientes
        });

    } catch (error) {
        console.error('Error al mostrar el formulario de edición de venta:', error);
        res.redirect('/ventas/ropa/historial');
    }
};

// Guarda los cambios de una venta editada
const guardarVentaEditada = async (req, res) => {
    const { id } = req.params;
    // ... tu validación de express-validator ...

    const t = await db.transaction();
    try {
        let { clienteId, articuloId, cantidad } = req.body;

        // --- 1. Revertir el stock de los artículos originales ---
        const detallesViejos = await DetalleVentaRopa.findAll({
            where: { ventaRopaId: id },
            include: [ArticuloRopa],
            transaction: t
        });

        for (const detalle of detallesViejos) {
            if (detalle.ArticuloRopa) {
                detalle.ArticuloRopa.stock_actual += detalle.cantidad;
                await detalle.ArticuloRopa.save({ transaction: t });
            }
        }

        // --- 2. Eliminar los detalles antiguos ---
        await DetalleVentaRopa.destroy({ where: { ventaRopaId: id }, transaction: t });

        // --- 3. Normalizar y procesar los nuevos detalles ---
        if (articuloId && !Array.isArray(articuloId)) {
            articuloId = [articuloId];
            cantidad = [cantidad];
        }

        let totalVenta = 0;
        const detallesParaGuardar = [];

        for (let i = 0; i < articuloId.length; i++) {
            const idArticulo = articuloId[i];
            const cantVendida = parseInt(cantidad[i], 10);

            if (idArticulo && cantVendida > 0) {
                const articulo = await ArticuloRopa.findByPk(idArticulo, { transaction: t });
                if (!articulo || articulo.stock_actual < cantVendida) {
                    throw new Error(`Stock insuficiente para: ${articulo ? articulo.nombre : 'Desconocido'}`);
                }
                
                const subtotal = cantVendida * parseFloat(articulo.precio_venta);
                totalVenta += subtotal;

                articulo.stock_actual -= cantVendida;
                await articulo.save({ transaction: t });

                detallesParaGuardar.push({
                    articuloRopaId: idArticulo,
                    cantidad: cantVendida,
                    precio_unitario: articulo.precio_venta,
                    subtotal: subtotal
                });
            }
        }

        // --- 4. Actualizar la cabecera de la venta ---
        const venta = await VentaRopa.findByPk(id, { transaction: t });
        venta.clienteId = clienteId || null;
        venta.total_venta = totalVenta;
        await venta.save({ transaction: t });

        // --- 5. Crear los nuevos detalles ---
        const detallesFinales = detallesParaGuardar.map(d => ({ ...d, ventaRopaId: venta.id }));
        await DetalleVentaRopa.bulkCreate(detallesFinales, { transaction: t });

        await t.commit();
        res.redirect('/ventas/ropa/historial?mensaje=Venta actualizada correctamente');

    } catch (error) {
        await t.rollback();
        console.error('Error al actualizar la venta:', error);
        // ... Tu lógica para renderizar con errores ...
        res.redirect(`/ventas/ropa/editar/${id}?error=${encodeURIComponent(error.message)}`);
    }
};

export {
    formularioVenta,
    guardarVenta,
    eliminarVenta,
    listarVentas,
    verVenta,
    formularioEditarVenta,
    guardarVentaEditada
};