// controllers/gastosController.js
import { validationResult } from 'express-validator';
import { Sequelize } from 'sequelize';
import db from '../config/db.js';
import GastoAdicional from '../models/GastoAdicional.js';
import GastoAdicionalDetalle from '../models/GastoAdicionalDetalle.js';
import Proveedor from '../models/Proveedor.js';
import Usuario from '../models/Usuario.js';
import Articulo from '../models/Articulo.js';

const { Op } = Sequelize; // Operadores de Sequelize para búsquedas complejas


// En tu archivo controllers/gastosController.js

const listarGastos = async (req, res) => {
    // --- 1. Recolección de Parámetros ---
    const { page = 1, busqueda = '', proveedorId = '', fecha_inicio = '', fecha_fin = '' } = req.query;

    // --- 2. Configuración de Paginación ---
    const elementosPorPagina = 10;
    const offset = (page - 1) * elementosPorPagina;

    // --- 3. Construcción de la Cláusula `where` ---
    const whereClause = {};

    if (busqueda) {
        whereClause[Op.or] = [
            { numero_factura: { [Op.like]: `%${busqueda}%` } },
            { descripcion: { [Op.like]: `%${busqueda}%` } },
            { '$Proveedor.razon_social$': { [Op.like]: `%${busqueda}%` } },
            { '$gastos_adicionales_detalles.articulo.nombre_articulo$': { [Op.like]: `%${busqueda}%` } }
        ];
    }

    if (proveedorId) {
        whereClause.proveedorId = proveedorId;
    }

    // 3c. Filtro por Rango de Fechas (CORREGIDO)
    // Apuntamos al campo correcto: 'createdAt'
    if (fecha_inicio && fecha_fin) {
        whereClause.createdAt = { [Op.between]: [fecha_inicio, fecha_fin] };
    } else if (fecha_inicio) {
        whereClause.createdAt = { [Op.gte]: fecha_inicio };
    } else if (fecha_fin) {
        whereClause.createdAt = { [Op.lte]: fecha_fin };
    }

    try {
        // --- 4. Consultas a la Base de Datos ---
        const proveedores = await Proveedor.findAll({ order: [['razon_social', 'ASC']] });

        const { count, rows: gastos } = await GastoAdicional.findAndCountAll({
            where: whereClause,
            limit: elementosPorPagina,
            offset,
            // Ordenamiento (CORREGIDO)
            // Ordenamos por el campo correcto: 'createdAt'
            order: [['createdAt', 'DESC']],
            distinct: true,
            include: [
                { model: Proveedor, required: true },
                { model: Usuario, as: 'usuario', attributes: ['nombre'] },
                {
                    model: GastoAdicionalDetalle,
                    as: 'gastos_adicionales_detalles',
                    attributes: [],
                    include: [{
                        model: Articulo,
                        as: 'articulo',
                        attributes: []
                    }]
                }
            ]
        });

        // --- 5. Cálculo de Paginación ---
        const totalPaginas = Math.ceil(count / elementosPorPagina);

        // --- 6. Renderizado de la Vista ---
        res.render('gastos/leer', {
            pagina: 'Gestión de Gastos',
            gastos,
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            paginaActual: Number(page),
            totalPaginas,
            count,
            proveedores,
            query: req.query
        });

    } catch (error) {
        console.error('Error al leer los gastos:', error);
        res.status(500).send('Hubo un error al cargar los gastos.');
    }
}

function formatearMoneda(numero) {
    const valorNumerico = parseFloat(numero);
    if (isNaN(valorNumerico)) {
        return ''; // Devuelve vacío si no es un número válido
    }
    // Formatea el número sin símbolo de moneda, ideal para un input
    return new Intl.NumberFormat('es-CO').format(valorNumerico);
}

// Muestra el formulario para registrar un nuevo gasto
const formCrearGasto = async (req, res) => {
    try {
        // Consultamos todos los proveedores para pasarlos al <select> del formulario
        const proveedores = await Proveedor.findAll({
            where: { activo: true }, // Solo proveedores activos
            order: [['razon_social', 'ASC']]
        });

        res.render('gastos/crear-gasto', { // Usaremos este nombre de archivo para la vista
            pagina: 'Registrar Nuevo Gasto',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            proveedores,
            formatearMoneda: formatearMoneda
        });

    } catch (error) {
        console.error('Error al cargar el formulario de crear gasto:', error);
        // Aquí podrías redirigir al listado con un mensaje de error
        res.redirect('/gastos');
    }
}

// Función para guardar un nuevo gasto
const guardarGasto = async (req, res) => {
    // 1. Validación de la cabecera con express-validator
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        // Si hay errores, volvemos a renderizar el formulario con los errores y los datos
        const proveedores = await Proveedor.findAll({ where: { activo: true }, order: [['razon_social', 'ASC']] });
        return res.render('gastos/crear-gasto', {
            pagina: 'Registrar Nuevo Gasto',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            proveedores,
            errores: errores.array(),
            datos: req.body, // Devolvemos los datos que el usuario ya había escrito
            formatearMoneda: formatearMoneda
        });
    }

    // Extraemos los datos de la cabecera y los arrays de detalles del request
    const { proveedorId, fecha_gasto, numero_factura, descripcion, articuloId, cantidad, precio_unitario } = req.body;
    const { id: usuarioId } = req.usuario; // Obtenemos el ID del usuario logueado

    try {
        // 1. Iniciamos la transacción
        await db.transaction(async (t) => {
            // --- Normalizamos los datos y calculamos el total del gasto ---
            let valor_total = 0;
            const articulosIds = Array.isArray(req.body.articuloId) ? req.body.articuloId : [req.body.articuloId];
            const cantidades = Array.isArray(req.body.cantidad) ? req.body.cantidad : [req.body.cantidad];
            const preciosUnitarios = Array.isArray(req.body.precio_unitario) ? req.body.precio_unitario : [req.body.precio_unitario];

            cantidades.forEach((cant, index) => {
                if (cant && preciosUnitarios[index]) { // Asegurarse de que hay valores para calcular
                    valor_total += parseFloat(cant) * parseFloat(preciosUnitarios[index]);
                }
            });

            // 2. Guardamos la cabecera del gasto
            const gasto = await GastoAdicional.create({
                proveedorId,
                fecha_gasto,
                numero_factura,
                descripcion,
                valor_total,
                usuarioId
            }, { transaction: t });

            // 3. Preparamos y guardamos los detalles
            const detallesPromises = articulosIds.map(async (id, index) => {
                if (!id) return; // Omitir filas vacías que no tienen un artículo seleccionado

                const cantidadActual = parseFloat(cantidades[index]);
                const precioActual = parseFloat(preciosUnitarios[index]);
                const subtotal = cantidadActual * precioActual;

                // Buscamos el artículo para obtener su categoría
                const articulo = await Articulo.findByPk(id, { transaction: t });

                if (articulo) {
                    // =================================================================
                    // DEBUG: Mostramos la categoría del artículo para verificar
                    // =================================================================
                    console.log(`Verificando artículo: ${articulo.nombre_articulo}, Categoria ID: ${articulo.categoriaId}, Tipo: ${typeof articulo.categoriaId}`);

                    // ¡CONDICIÓN CORREGIDA! Usamos parseInt para evitar problemas de tipo (ej: "1" vs 1)
                    if (parseInt(articulo.categoriaId, 10) === 1) {
                        console.log(`-> La categoría es 1. Actualizando stock...`);
                        const nuevoStock = parseFloat(articulo.stock_actual) + cantidadActual;
                        await articulo.update({ stock_actual: nuevoStock }, { transaction: t });
                    } else {
                        console.log(`-> La categoría NO es 1. No se actualiza el stock.`);
                    }
                }

                // El detalle del gasto se crea SIEMPRE, sin importar la categoría.
                return GastoAdicionalDetalle.create({
                    gastoAdicionalId: gasto.id,
                    articuloId: id,
                    cantidad: cantidadActual,
                    precio_unitario: precioActual,
                    subtotal
                }, { transaction: t });
            });

            // Ejecutamos todas las promesas de guardado de detalles
            await Promise.all(detallesPromises);
        });

        // 4. Si la transacción fue exitosa, redirigimos
        res.redirect('/gastos?guardado=true');

    } catch (error) {
        console.error('Error al guardar el gasto:', error);
        // Si algo falla, volvemos a renderizar el formulario con un mensaje de error general
        const proveedores = await Proveedor.findAll({ where: { activo: true }, order: [['razon_social', 'ASC']] });
        res.render('gastos/crear-gasto', {
            pagina: 'Registrar Nuevo Gasto',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            proveedores,
            errorGeneral: [{ msg: 'No se pudo guardar el gasto. Inténtalo de nuevo.' }],
            datos: req.body,
            formatearMoneda: formatearMoneda
        });
    }
};


// ==================================================================
// --- Muestra el formulario para editar un gasto existente ---
// ==================================================================
const formEditarGasto = async (req, res) => {
    
    if (req.usuario.role.nombre !== 'Admin') {
      return res.status(403).send('No tienes permiso para eliminar este vale');
    }

    
    const { id } = req.params;

    try {
        const gasto = await GastoAdicional.findOne({
            where: { id, usuarioId: req.usuario.id },
            include: [
                {
                    model: GastoAdicionalDetalle,
                    as: 'gastos_adicionales_detalles',
                    include: [{ model: Articulo, as: 'articulo' }]
                },
                { model: Proveedor }
            ]
        });

        if (!gasto) {
            return res.redirect('/gastos');
        }

        const proveedores = await Proveedor.findAll({
            where: { activo: true },
            order: [['razon_social', 'ASC']]
        });

        res.render('gastos/editar', {
            pagina: `Editar Gasto: Factura #${gasto.numero_factura}`,
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            proveedores,
            gasto,
            // ¡IMPORTANTE! Pasar la función a la plantilla
            formatearMoneda: formatearMoneda
        });

    } catch (error) {
        console.error('Error al cargar el formulario de editar gasto:', error);
        res.redirect('/gastos');
    }
};

// ==================================================================
// --- Procesa la actualización de un gasto (LÓGICA MEJORADA) ---
// ==================================================================

const editarGasto = async (req, res) => {
    // 1. Validación (igual que en crear)
    const errores = validationResult(req);

    if (!errores.isEmpty()) {
        const { id } = req.params;
        const [gasto, proveedores] = await Promise.all([
            GastoAdicional.findByPk(id, { include: [{ model: GastoAdicionalDetalle, as: 'gastos_adicionales_detalles', include: [{ model: Articulo, as: 'articulo' }] }] }),
            Proveedor.findAll({ where: { activo: true } })
        ]);

        return res.render('gastos/editar', {
            pagina: `Editar Gasto: Factura #${gasto.numero_factura}`,
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            proveedores,
            errores: errores.array(),
            gasto,
            formatearMoneda: formatearMoneda // No olvides pasar el helper
        });
    }

    const { id } = req.params;
    const { proveedorId, fecha_gasto, numero_factura, descripcion } = req.body;

    try {
        const gastoOriginal = await GastoAdicional.findOne({ where: { id, usuarioId: req.usuario.id } });
        if (!gastoOriginal) {
            return res.redirect('/gastos');
        }

        // 2. Iniciamos una transacción
        await db.transaction(async (t) => {
            // 3. REVERTIR EL STOCK: Buscamos los detalles viejos para saber qué revertir
            const detallesViejos = await GastoAdicionalDetalle.findAll({
                where: { gastoAdicionalId: gastoOriginal.id },
                include: [{ model: Articulo, as: 'articulo'  }],
                transaction: t
            });

            for (const detalle of detallesViejos) {
                if (detalle.articulo && parseInt(detalle.articulo.categoriaId, 10) === 1) {
                    const stockActual = parseFloat(detalle.articulo.stock_actual);
                    const cantidadAnterior = parseFloat(detalle.cantidad);
                    
                    const stockDespuesDeReversion = stockActual - cantidadAnterior;

                    // ¡NUEVA VALIDACIÓN! Prevenimos el error antes de que ocurra.
                    if (stockDespuesDeReversion < 0) {
                        throw new Error(`No se puede editar. Al revertir la compra del artículo "${detalle.articulo.nombre_articulo}", el stock sería negativo. Stock actual: ${stockActual}, Cantidad a revertir: ${cantidadAnterior}.`);
                    }

                    // Si la validación pasa, procedemos a revertir
                    detalle.articulo.stock_actual = stockDespuesDeReversion;
                    await detalle.articulo.save({ transaction: t });
                }
            }

            // 4. BORRAMOS los detalles antiguos
            await GastoAdicionalDetalle.destroy({ where: { gastoAdicionalId: gastoOriginal.id }, transaction: t });

            // 5. NORMALIZAMOS y CALCULAMOS los nuevos datos
            let valor_total = 0;
            const articulosIds = Array.isArray(req.body.articuloId) ? req.body.articuloId : [req.body.articuloId];
            const cantidades = Array.isArray(req.body.cantidad) ? req.body.cantidad : [req.body.cantidad];
            const preciosUnitarios = Array.isArray(req.body.precio_unitario) ? req.body.precio_unitario : [req.body.precio_unitario];

            cantidades.forEach((cant, index) => {
                if (cant && preciosUnitarios[index]) {
                    valor_total += parseFloat(cant) * parseFloat(preciosUnitarios[index]);
                }
            });

            // 6. ACTUALIZAMOS la cabecera del gasto
            gastoOriginal.proveedorId = proveedorId;
            gastoOriginal.fecha_gasto = fecha_gasto;
            gastoOriginal.numero_factura = numero_factura;
            gastoOriginal.descripcion = descripcion;
            gastoOriginal.valor_total = valor_total;
            await gastoOriginal.save({ transaction: t });

            // 7. CREAMOS los nuevos detalles y APLICAMOS el nuevo stock
            const detallesPromises = articulosIds.map(async (artId, index) => {
                if (!artId) return;
                const cantidadActual = parseFloat(cantidades[index]);
                const precioActual = parseFloat(preciosUnitarios[index]);
                const subtotal = cantidadActual * precioActual;

                const articulo = await Articulo.findByPk(artId, { transaction: t });
                if (articulo && parseInt(articulo.categoriaId, 10) === 1) {
                    const nuevoStock = parseFloat(articulo.stock_actual) + cantidadActual;
                    await articulo.update({ stock_actual: nuevoStock }, { transaction: t });
                }

                return GastoAdicionalDetalle.create({
                    gastoAdicionalId: gastoOriginal.id,
                    articuloId: artId,
                    cantidad: cantidadActual,
                    precio_unitario: precioActual,
                    subtotal
                }, { transaction: t });
            });

            await Promise.all(detallesPromises);
        });

        res.redirect('/gastos?actualizado=true');

    } catch (error) {
        console.error('Error al actualizar el gasto:', error);
        // Si algo falla, volvemos a renderizar el formulario con el error específico
        const { id } = req.params;
        const [gasto, proveedores] = await Promise.all([
            GastoAdicional.findByPk(id, { include: [{ model: GastoAdicionalDetalle, as: 'gastos_adicionales_detalles', include: [{ model: Articulo, as: 'articulo' }] }] }),
            Proveedor.findAll({ where: { activo: true } })
        ]);

        res.render('gastos/editar', {
            pagina: `Editar Gasto: Factura #${gasto.numero_factura}`,
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            proveedores,
            // Mostramos el error específico que lanzamos en la transacción
            errores: [{ msg: error.message }],
            gasto,
            formatearMoneda: formatearMoneda
        });
    }
};


// --- Función para eliminar un gasto ---
const eliminarGasto = async (req, res) => {
    const { id } = req.params;
    const { id: usuarioId } = req.usuario;

    if (req.usuario.role.nombre !== 'Admin') {
      return res.status(403).send('No tienes permiso para eliminar este vale');
    }

    try {
        // Iniciamos la transacción para asegurar que todas las operaciones se completen o ninguna
        await db.transaction(async (t) => {
            // 1. Buscamos el gasto a eliminar y sus detalles, incluyendo el artículo y su categoría
            const gasto = await GastoAdicional.findOne({
                where: { id, usuarioId },
                include: [{
                    model: GastoAdicionalDetalle,
                    as: 'gastos_adicionales_detalles',
                    include: [{ model: Articulo, as: 'articulo' }]
                }],
                transaction: t
            });

            // Si el gasto no existe o no pertenece al usuario, lanzamos un error para detener la transacción
            if (!gasto) {
                throw new Error('Gasto no encontrado o no tienes permiso para eliminarlo.');
            }

            // 2. Revertimos el stock para cada artículo del detalle (si aplica)
            for (const detalle of gasto.gastos_adicionales_detalles) {
                // Verificamos que el artículo exista y que su categoría sea la que afecta el stock
                if (detalle.articulo && parseInt(detalle.articulo.categoriaId, 10) === 1) {
                    
                    const stockActual = parseFloat(detalle.articulo.stock_actual);
                    const cantidadComprada = parseFloat(detalle.cantidad);

                    const nuevoStock = stockActual - cantidadComprada;

                    // ¡VALIDACIÓN CRÍTICA! Prevenimos que el stock se vuelva negativo
                    if (nuevoStock < 0) {
                        throw new Error(`No se puede eliminar. El stock del artículo "${detalle.articulo.nombre_articulo}" resultaría negativo, indicando que ya fue utilizado.`);
                    }

                    // Si la validación pasa, actualizamos el stock del artículo
                    await detalle.articulo.update({ stock_actual: nuevoStock }, { transaction: t });
                }
            }

            // 3. Eliminamos los detalles del gasto
            // (Esto podría ser redundante si la eliminación en cascada está bien configurada, pero es más seguro hacerlo explícitamente)
            await GastoAdicionalDetalle.destroy({
                where: { gastoAdicionalId: id },
                transaction: t
            });

            // 4. Finalmente, eliminamos la cabecera del gasto
            await gasto.destroy({ transaction: t });
        });

        // 5. Si la transacción fue exitosa, redirigimos
        res.redirect('/gastos?eliminado=true');

    } catch (error) {
        console.error('Error al eliminar el gasto:', error);
        // Si el error es el que lanzamos nosotros, lo mostramos. Si no, un mensaje genérico.
                 
        // Idealmente, aquí se redirigiría a la página anterior mostrando el error con un flash message.
        // Por ahora, enviamos una respuesta de error.
        res.redirect('/gastos?errorEliminado=true');
    }
}

// ==================================================================
// --- API: Obtiene los datos de un gasto para mostrar en un modal ---
// ==================================================================
const obtenerGastoJSON = async (req, res) => {
    const { id } = req.params;

    try {
        // Buscamos el gasto con todas sus relaciones
        const gasto = await GastoAdicional.findOne({
            where: { id, usuarioId: req.usuario.id }, // ¡La seguridad es clave!
            include: [
                {
                    model: GastoAdicionalDetalle,
                    as: 'gastos_adicionales_detalles', // El alias correcto que ya descubrimos
                    attributes: ['cantidad', 'precio_unitario', 'subtotal'],
                    include: {
                        model: Articulo,
                        as: 'articulo',
                        attributes: ['nombre_articulo']
                    }
                },
                {
                    model: Proveedor,
                    attributes: ['razon_social']
                }
            ]
        });

        // Si no se encuentra el gasto, devolvemos un error 404
        if (!gasto) {
            return res.status(404).json({ msg: 'Gasto no encontrado o no autorizado.' });
        }

        // Si se encuentra, lo devolvemos como JSON
        res.json(gasto);

    } catch (error) {
        console.error('Error al obtener el gasto en formato JSON:', error);
        res.status(500).json({ msg: 'Error en el servidor.' });
    }
};


export {
    listarGastos,
    formCrearGasto,
    guardarGasto,
    formEditarGasto,
    editarGasto,
    eliminarGasto,
    obtenerGastoJSON
}