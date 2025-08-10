import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import db from '../config/db.js';
import { Articulo, GastoAdministrativo, DetalleGastoAdministrativo, Usuario, Auditoria } from '../models/index.js';

// Muestra el formulario para registrar un gasto administrativo
const formularioGasto = async (req, res) => {
    // Buscamos artículos que sean de categorías administrativas (ej: Insumos, Papelería)
    // y que tengan stock disponible. Ajusta los IDs de categoría según tu configuración.
    const articulos = await Articulo.findAll({
        where: {
            activo: true,
            categoriaId: { [Op.in]: [4] }, 
            stock_actual: { [Op.gt]: 0 }
        },
        order: [['nombre_articulo', 'ASC']]
    });

    res.render('gastos/administrativos/crear', { 
        pagina: 'Registrar Consumo Interno',
        csrfToken: req.csrfToken(),
        barra: true,
        piePagina: true,
        articulos,
        datos: {}
    });
};

// Guarda el gasto y descuenta del inventario
const guardarGasto = async (req, res) => {
    // 1. Validación de campos obligatorios con express-validator
    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
        const articulos = await Articulo.findAll({ where: { activo: true, stock_actual: { [Op.gt]: 0 } } });
        return res.render('gastos/administrativos/crear', {
            pagina: 'Registrar Consumo Interno',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            articulos,
            errores: resultado.array(),
            datos: req.body
        });
    }

    // 2. Validación manual de Stock ANTES de la transacción
    let { articuloId, cantidad } = req.body;
    const erroresDeStock = [];

    if (articuloId && !Array.isArray(articuloId)) {
        articuloId = [articuloId];
        cantidad = [cantidad];
    }
    
    if (articuloId && Array.isArray(articuloId)) {
        for (let i = 0; i < articuloId.length; i++) {
            const id = articuloId[i];
            const cant = parseFloat(cantidad[i]);
            if (id && cant > 0) {
                const articulo = await Articulo.findByPk(id);
                if (!articulo || articulo.stock_actual < cant) {
                    erroresDeStock.push({ msg: `Stock insuficiente para: ${articulo ? articulo.nombre_articulo : `ID ${id}`}` });
                }
            }
        }
    }

    if (erroresDeStock.length > 0) {
        const articulos = await Articulo.findAll({ where: { activo: true, stock_actual: { [Op.gt]: 0 } } });
        return res.render('gastos/administrativos', {
            pagina: 'Registrar Consumo Interno',
            csrfToken: req.csrfToken(),
            articulos,
            errores: erroresDeStock,
            datos: req.body
        });
    }

    // 3. Si todo es válido, procedemos a guardar con una transacción
    const t = await db.transaction();
    try {
        const { descripcion } = req.body;
        const { id: usuarioId } = req.usuario;

        // Crear el registro principal del gasto
        const nuevoGasto = await GastoAdministrativo.create({
            descripcion,
            usuarioId
        }, { transaction: t });

        // Procesar y guardar cada artículo
        if (articuloId && Array.isArray(articuloId)) {
            for (let i = 0; i < articuloId.length; i++) {
                const idArticulo = articuloId[i];
                const cantUsada = parseFloat(cantidad[i]);

                if (idArticulo && cantUsada > 0) {
                    const articulo = await Articulo.findByPk(idArticulo, { transaction: t });
                    // Restar del stock
                    articulo.stock_actual -= cantUsada;
                    await articulo.save({ transaction: t });

                    // Crear el registro del detalle
                    await DetalleGastoAdministrativo.create({
                        gastoId: nuevoGasto.id,
                        articuloId: idArticulo,
                        cantidad: cantUsada
                    }, { transaction: t });
                }
            }
        }

        await t.commit();
        res.redirect('/gastos?mensaje=Gasto Administrativo registrado correctamente');

    } catch (error) {
        await t.rollback();
        console.error('Error al guardar el gasto administrativo:', error);
        const articulos = await Articulo.findAll({ where: { activo: true, stock_actual: { [Op.gt]: 0 } } });
        res.render('gastos/administrativos', {
            pagina: 'Registrar Consumo Interno',
            csrfToken: req.csrfToken(),
            articulos,
            errores: [{ msg: 'No se pudo registrar el gasto. Inténtalo de nuevo.' }],
            datos: req.body
        });
    }
};

// Muestra el formulario para editar un gasto administrativo
const formularioEditarGasto = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar el gasto a editar con sus detalles y los artículos asociados
        const gasto = await GastoAdministrativo.findByPk(id, {
            include: [{
                model: DetalleGastoAdministrativo,
                as: 'detalles',
                include: [{ model: Articulo }]
            }]
        });

        if (!gasto) {
            return res.redirect('/gastos'); // O a una página de error 404
        }

        // Buscar todos los artículos disponibles para añadir al gasto
        const articulos = await Articulo.findAll({
            where: {
                activo: true,
                categoriaId: { [Op.in]: [1, 3, 4] }, // Ajusta las categorías si es necesario
            },
            order: [['nombre_articulo', 'ASC']]
        });

        res.render('gastos/administrativos/editar', { // Asegúrate de crear esta nueva vista
            pagina: 'Editar Gasto Administrativo',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            gasto,
            articulos
        });

    } catch (error) {
        console.error('Error al mostrar el formulario de edición:', error);
        res.redirect('/gastos');
    }
};

// Guarda los cambios del gasto administrativo editado
const guardarGastoEditado = async (req, res) => {
    const { id } = req.params;
    
    // ... (Aquí iría tu bloque de validación de errores con express-validator) ...

    const t = await db.transaction();
    try {
        let { descripcion, articuloId, cantidad } = req.body;
        
        // --- 1. Revertir el stock de los artículos originales ---
        const detallesViejos = await DetalleGastoAdministrativo.findAll({
            where: { gastoId: id },
            include: [Articulo],
            transaction: t
        });

        for (const detalle of detallesViejos) {
            if (detalle.Articulo) {
                detalle.Articulo.stock_actual = parseFloat(detalle.Articulo.stock_actual) + parseFloat(detalle.cantidad);
                await detalle.Articulo.save({ transaction: t });
            }
        }

        // --- 2. Eliminar los detalles antiguos ---
        await DetalleGastoAdministrativo.destroy({ where: { gastoId: id }, transaction: t });

        // --- 3. Actualizar la cabecera del gasto ---
        const gasto = await GastoAdministrativo.findByPk(id, { transaction: t });
        gasto.descripcion = descripcion;
        await gasto.save({ transaction: t });

        // --- 4. Normalizar y procesar los nuevos detalles ---
        if (articuloId && !Array.isArray(articuloId)) {
            articuloId = [articuloId];
            cantidad = [cantidad];
        }

        if (articuloId && Array.isArray(articuloId)) {
            for (let i = 0; i < articuloId.length; i++) {
                const idArticulo = articuloId[i];
                const cantUsada = parseFloat(cantidad[i]);

                if (idArticulo && cantUsada > 0) {
                    const articulo = await Articulo.findByPk(idArticulo, { transaction: t });
                    if (!articulo || articulo.stock_actual < cantUsada) {
                        throw new Error(`Stock insuficiente para: ${articulo ? articulo.nombre_articulo : 'Desconocido'}`);
                    }
                    articulo.stock_actual -= cantUsada;
                    await articulo.save({ transaction: t });

                    await DetalleGastoAdministrativo.create({
                        gastoId: gasto.id,
                        articuloId: idArticulo,
                        cantidad: cantUsada
                    }, { transaction: t });
                }
            }
        }

        await t.commit();
        res.redirect('/gastos?mensaje=Gasto Administrativo actualizado correctamente');

    } catch (error) {
        await t.rollback();
        console.error('Error al actualizar el gasto administrativo:', error);
        // ... (Tu lógica para renderizar con errores, similar a la de crear)       
        const articulos = await Articulo.findAll({ where: { activo: true, stock_actual: { [Op.gt]: 0 } } });
        res.render('gastos/administrativos', {
            pagina: 'Registrar Consumo Interno',
            csrfToken: req.csrfToken(),
            articulos,
            errores: [{ msg: 'No se pudo registrar el gasto. Inténtalo de nuevo.' }],
            datos: req.body
        });
    }
};

const verGastoAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscamos el gasto con sus relaciones: usuario y detalles (con el artículo)
        const gasto = await GastoAdministrativo.findByPk(id, {
            include: [
                { model: Usuario, as: 'usuario', attributes: ['nombre'] },
                {
                    model: DetalleGastoAdministrativo,
                    as: 'detalles',
                    include: [{ model: Articulo, as: 'articulo' }]
                }
            ]
        });

        if (!gasto) {
            return res.status(404).json({ msg: 'Gasto administrativo no encontrado' });
        }

        // Devolvemos el resultado como JSON
        res.json(gasto);

    } catch (error) {
        console.error('Error al obtener el detalle del gasto administrativo:', error);
        res.status(500).json({ msg: 'Error en el servidor' });
    }
};

// Anular Gastos Administrativos
const anularGastoAdmin = async (req, res) => {
    const { id } = req.params;
    const { id: usuarioId, nombre: nombreUsuario } = req.usuario;

    console.log(`DEBUG: Iniciando anulación de Gasto Administrativo con ID: ${id}`);

    if (req.usuario.role.nombre !== 'Admin' && req.usuario.role.nombre !== 'Supervisor') {
        return res.redirect(`/gastos?error=No tienes permiso para anular gastos.`);
    }

    const t = await db.transaction();
    try {
        const gasto = await GastoAdministrativo.findByPk(id, {
            include: [{ 
                model: DetalleGastoAdministrativo, 
                as: 'detalles', 
                include: [{ model: Articulo, as: 'articulo' }] 
            }],
            transaction: t
        });

        if (!gasto) throw new Error('Consumo no encontrado.');
        if (gasto.estado === 'Anulado') throw new Error('Este consumo ya ha sido anulado.');

        for (const detalle of gasto.detalles) {
            // Verificamos si el artículo asociado existe en el detalle
            if (detalle.articulo) {
                              
                // Sumamos la cantidad consumida de vuelta al stock actual
                detalle.articulo.stock_actual = parseFloat(detalle.articulo.stock_actual) + parseFloat(detalle.cantidad);                              
                await detalle.articulo.save({ transaction: t });
                
            } else {
                console.log('DEBUG: ADVERTENCIA - No se encontró el artículo asociado a este detalle (detalle.articulo es nulo).');
            }
        }

        gasto.estado = 'Anulado';
        await gasto.save({ transaction: t });
        console.log('DEBUG: Estado del gasto cambiado a "Anulado".');

        await Auditoria.create({
            accion: 'ANULAR',
            tabla_afectada: 'gastos_administrativos',
            registro_id: id,
            descripcion: `El usuario ${nombreUsuario} anuló el consumo interno #${id}.`,
            usuarioId
        }, { transaction: t });
        
        await t.commit();
        res.redirect('/gastos?mensaje=Consumo interno anulado correctamente.');

    } catch (error) {
        await t.rollback();
        res.redirect(`/gastos?error=${encodeURIComponent(error.message)}`);
    }
};

export {
    formularioGasto,
    guardarGasto,
    formularioEditarGasto,
    guardarGastoEditado,
    verGastoAdmin,
    anularGastoAdmin
};