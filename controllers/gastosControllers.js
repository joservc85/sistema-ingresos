// controllers/gastosController.js
import { validationResult } from 'express-validator';
import { Sequelize } from 'sequelize';
import db from '../config/db.js';
import { GastoAdicional, GastoAdministrativo, Proveedor, Usuario, Articulo, GastoAdicionalDetalle, DetalleGastoAdministrativo, Auditoria } from '../models/index.js';

const { Op } = Sequelize; // Operadores de Sequelize para búsquedas complejas

const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valor || 0);
};

// Lsitar Gastos
const listarGastos = async (req, res) => {
    try {
        // --- 1. Recolección de Parámetros y Paginación ---
        const { page = 1, busqueda = '', proveedorId = '', fecha_inicio = '', fecha_fin = '' } = req.query;
        const elementosPorPagina = 10;
        const offset = (page - 1) * elementosPorPagina;

        // --- 2. Construcción de Cláusulas `where` para cada tipo de gasto ---
        const whereCompras = {};
        const whereConsumos = {};

        if (fecha_inicio && fecha_fin) {
            const fechaClause = { [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin + 'T23:59:59')] };
            whereCompras.fecha_gasto = fechaClause;
            whereConsumos.createdAt = fechaClause;
        }

        if (proveedorId) {
            whereCompras.proveedorId = proveedorId;
        }

        if (busqueda) {
            const likeClause = { [Op.like]: `%${busqueda}%` };
            whereCompras[Op.or] = [
                { numero_factura: likeClause },
                { '$proveedore.razon_social$': likeClause }
            ];
            whereConsumos.descripcion = likeClause;
        }

        // --- 3. Consultas a la Base de Datos ---
        const [compras, consumos, proveedores] = await Promise.all([
            GastoAdicional.findAll({
                where: whereCompras,
                include: [
                    { model: Proveedor, as: 'proveedore', required: !!proveedorId || (busqueda && !whereCompras.numero_factura) },
                    { model: Usuario, as: 'usuario', attributes: ['nombre'] }
                ]
            }),
            GastoAdministrativo.findAll({
                where: whereConsumos,
                include: [{ model: Usuario, as: 'usuario', attributes: ['nombre'] }]
            }),
            Proveedor.findAll({ order: [['razon_social', 'ASC']] })
        ]);

        // --- 4. Normalización y Combinación de Datos ---
        const gastosNormalizados = [];

        compras.forEach(g => {
            gastosNormalizados.push({
                id: g.id,
                fecha: g.fecha_gasto,
                tipo: 'Compra a Proveedor',
                descripcion: g.proveedore.razon_social,
                monto: g.valor_total,
                usuarioNombre: g.usuario.nombre,
                esAdmin: false,
                estado: g.estado
            });
        });

        consumos.forEach(g => {
            gastosNormalizados.push({
                id: g.id,
                fecha: g.createdAt,
                tipo: 'Consumo Interno',
                descripcion: g.descripcion,
                monto: null,
                usuarioNombre: g.usuario.nombre,
                esAdmin: true,
                estado: g.estado
            });
        });

        // --- 5. Ordenamiento y Paginación ---
        gastosNormalizados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        const totalGastos = gastosNormalizados.length;
        const totalPaginas = Math.ceil(totalGastos / elementosPorPagina);
        const gastosPaginados = gastosNormalizados.slice(offset, offset + elementosPorPagina);

        // --- 6. Renderizado de la Vista ---
        res.render('gastos/leer', {
            pagina: 'Gestión de Gastos',
            gastos: gastosPaginados,
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            paginaActual: Number(page),
            totalPaginas,
            count: totalGastos,
            proveedores,
            query: req.query
        });

    } catch (error) {
        console.error('Error al leer los gastos:', error);
        res.status(500).send('Hubo un error al cargar los gastos.');
    }
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

    if (numero_factura) {
        const facturaExistente = await GastoAdicional.findOne({ where: { numero_factura } });
        if (facturaExistente) {
            const proveedores = await Proveedor.findAll({ where: { activo: true } });
            return res.render('gastos/crear-gasto', {
                pagina: 'Registrar Nuevo Gasto',
                csrfToken: req.csrfToken(),
                barra: true,
                piePagina: true,
                proveedores,
                errores: [{ msg: 'El número de factura ya está registrado.' }],
                datos: req.body,
                formatearMoneda
            });
        }
    }

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
                    //console.log(`Verificando artículo: ${articulo.nombre_articulo}, Categoria ID: ${articulo.categoriaId}, Tipo: ${typeof articulo.categoriaId}`);

                    // ¡CONDICIÓN CORREGIDA! Usamos parseInt para evitar problemas de tipo (ej: "1" vs 1)
                    const categoriasDeInventario = [1, 4];

                    // Comprueba si la categoría del artículo está en el array
                    if (categoriasDeInventario.includes(parseInt(articulo.categoriaId, 10))) {
                        console.log(`-> La categoría es ${articulo.categoriaId}. Actualizando stock...`);
                        const nuevoStock = parseFloat(articulo.stock_actual) + cantidadActual;
                        await articulo.update({ stock_actual: nuevoStock }, { transaction: t });
                    } else {
                        console.log(`-> La categoría ${articulo.categoriaId} NO es de inventario. No se actualiza el stock.`);
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
            formatearMoneda: formatearMoneda
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
                include: [{ model: Articulo, as: 'articulo' }],
                transaction: t
            });

            // --- Define las categorías que afectan el inventario ---
            const categoriasDeInventario = [1, 4];

            for (const detalle of detallesViejos) {
                // --- CORRECCIÓN: Comprobar si la categoría está en la lista ---
                if (detalle.articulo && categoriasDeInventario.includes(parseInt(detalle.articulo.categoriaId, 10))) {
                    const stockActual = parseFloat(detalle.articulo.stock_actual);
                    const cantidadAnterior = parseFloat(detalle.cantidad);
                    const stockDespuesDeReversion = stockActual - cantidadAnterior;

                    if (stockDespuesDeReversion < 0) {
                        throw new Error(`No se puede editar. Al revertir la compra del artículo "${detalle.articulo.nombre_articulo}", el stock sería negativo.`);
                    }

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
                // --- CORRECCIÓN: Comprobar si la categoría está en la lista ---
                if (articulo && categoriasDeInventario.includes(parseInt(articulo.categoriaId, 10))) {
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
            errores: [{ msg: error.message }],
            gasto,
            formatearMoneda: formatearMoneda
        });
    }
};

// --- Función para Anular un gasto ---
const anularGasto = async (req, res) => {
    const { id } = req.params;
    const { id: usuarioId, nombre: nombreUsuario } = req.usuario;

    if (req.usuario.role.nombre !== 'Admin' && req.usuario.role.nombre !== 'Supervisor') {
        return res.redirect(`/gastos?error=No tienes permiso para anular gastos.`);
    }

    const t = await db.transaction();
    try {
        const gasto = await GastoAdicional.findByPk(id, {
            include: [{ 
                model: GastoAdicionalDetalle, 
                as: 'gastos_adicionales_detalles', 
                include: [{ model: Articulo, as: 'articulo' }] 
            }],
            transaction: t
        });

        if (!gasto) throw new Error('Gasto no encontrado.');
        if (gasto.estado === 'Anulado') throw new Error('Este gasto ya ha sido anulado.');

        const categoriasDeInventario = [1, 4];
        for (const detalle of gasto.gastos_adicionales_detalles) {
            if (detalle.articulo && categoriasDeInventario.includes(parseInt(detalle.articulo.categoriaId, 10))) {
                const stockDespuesDeReversion = parseFloat(detalle.articulo.stock_actual) - parseFloat(detalle.cantidad);
                if (stockDespuesDeReversion < 0) {
                    throw new Error(`No se puede anular. El stock del artículo "${detalle.articulo.nombre_articulo}" resultaría negativo.`);
                }
                detalle.articulo.stock_actual = stockDespuesDeReversion;
                await detalle.articulo.save({ transaction: t });
            }
        }

        gasto.estado = 'Anulado';
        await gasto.save({ transaction: t });

        await Auditoria.create({
            accion: 'ANULAR',
            tabla_afectada: 'gastos_adicionales',
            registro_id: id,
            descripcion: `El usuario ${nombreUsuario} anuló el gasto #${gasto.numero_factura}.`,
            usuarioId
        }, { transaction: t });

        await t.commit();
        res.redirect('/gastos?mensaje=Gasto anulado y stock revertido correctamente.');
    } catch (error) {
        await t.rollback();
        console.error('Error al anular el gasto:', error);
        res.redirect(`/gastos?error=${encodeURIComponent(error.message)}`);
    }
};

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
    formatearMoneda,
    listarGastos,
    formCrearGasto,
    guardarGasto,
    formEditarGasto,
    editarGasto,
    anularGasto,
    obtenerGastoJSON
}