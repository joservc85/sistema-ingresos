import { check, validationResult } from 'express-validator';
import db from '../config/db.js';
import { Procedimiento, Precio, Auditoria } from '../models/index.js'; // Importamos ambos modelos

// =================================================================
// FUNCIÓN 1: Mostrar listado de Procedimientos (leer.pug)
// =================================================================
const leer = async (req, res) => {
    const elementosPorPagina = 8; // Puedes ajustar este número
    const paginaActual = Number(req.query.page) || 1;
    const offset = (paginaActual - 1) * elementosPorPagina;

    try {
        const { count: total, rows: procedimientos } = await Procedimiento.findAndCountAll({
            limit: elementosPorPagina,
            offset,
            order: [['nombre', 'ASC']],
            include: [{ model: Precio, attributes: ['monto'] }]
        });

        const totalPaginas = Math.ceil(total / elementosPorPagina);

        res.render('procedimientos/leer', { // Usamos la vista /leer para ser consistentes
            pagina: 'Listado de Procedimientos',
            barra: true,
            piePagina: true,
            procedimientos, // La data para las tarjetas
            csrfToken: req.csrfToken(),
            query: req.query,
            paginaActual,
            totalPaginas
        });
    } catch (error) {
        console.error('Error al leer procedimientos:', error);
        res.render('error', { pagina: 'Error', mensaje: 'Hubo un error al cargar los procedimientos.' });
    }
};

// =================================================================
// FUNCIÓN 2: Mostrar el formulario para crear un nuevo Procedimiento
// =================================================================
const formularioCrear = async (req, res) => {
    try {
        const precios = await Precio.findAll({ order: [['monto', 'ASC']] });
        res.render('procedimientos/crear', {
            pagina: 'Crear Procedimiento',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            procedimiento: {}, // Objeto vacío como en tu ejemplo
            precios // Pasamos la lista de precios para el <select>
        });
    } catch (error) {
        console.error('Error al cargar formulario de creación:', error);
    }
};

// =================================================================
// FUNCIÓN 3: Guardar un nuevo Procedimiento (con la lógica de precio)
// =================================================================
const crear = async (req, res) => {
    // 1. Validación
    await check('nombre').notEmpty().withMessage('El nombre del procedimiento es obligatorio').run(req);
    // Validación personalizada para asegurar que se ingrese al menos un precio
    await check('precioExistente').custom((value, { req }) => {
        if (!value && !req.body.precioNuevo) {
            throw new Error('Debes seleccionar un precio existente o ingresar uno nuevo.');
        }
        return true;
    }).run(req);
    await check('precioNuevo').optional({ checkFalsy: true }).isDecimal().withMessage('El nuevo precio debe ser un número.').run(req);

    const resultado = validationResult(req);
    const { nombre, precioExistente, precioNuevo } = req.body;

    // Si la validación falla
    if (!resultado.isEmpty()) {
        const precios = await Precio.findAll({ order: [['monto', 'ASC']] });
        return res.render('procedimientos/crear', {
            pagina: 'Crear Procedimiento',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            errores: resultado.array(),
            procedimiento: { nombre, precioExistente, precioNuevo },
            precios
        });
    }

    const { id: usuarioId, nombre: nombreUsuario } = req.usuario;
    const t = await db.transaction();

    try {
        // 2. Comprobar si ya existe un procedimiento con ese nombre
        const existeProcedimiento = await Procedimiento.findOne({ where: { nombre }, transaction: t });
        if (existeProcedimiento) {
            throw new Error('Ya existe un procedimiento con este nombre.');
        }

        // 3. Lógica para determinar el precioId
        let precioId;
        let precioCreado = false;
        let montoDelPrecio;

        if (precioNuevo && precioNuevo.trim() !== '') {
            montoDelPrecio = precioNuevo.trim();
            const [precio, creado] = await Precio.findOrCreate({
                where: { monto: montoDelPrecio },
                defaults: { monto: montoDelPrecio },
                transaction: t
            });
            precioId = precio.id;
            precioCreado = creado;
        } else {
            precioId = precioExistente;
        }

        // 4. Crear el procedimiento y asociarlo con el precio
        const nuevoProcedimiento = await Procedimiento.create({
            nombre,
            precioId: precioId,
            activo: true
        }, { transaction: t });

        // 5. Registrar en auditoría
        await Auditoria.create({
            accion: 'CREAR',
            tabla_afectada: 'procedimientos',
            registro_id: nuevoProcedimiento.id,
            descripcion: `El usuario ${nombreUsuario} creó el procedimiento: ${nombre}.`,
            usuarioId
        }, { transaction: t });

        if (precioCreado) { // Si se creó un precio nuevo, también se audita
            await Auditoria.create({
                accion: 'CREAR',
                tabla_afectada: 'precios',
                registro_id: precioId,
                descripcion: `El usuario ${nombreUsuario} creó un nuevo precio: ${montoDelPrecio}.`,
                usuarioId
            }, { transaction: t });
        }

        await t.commit();
        res.redirect('/procedimientos/leer?mensaje=Procedimiento creado correctamente');

    } catch (error) {
        await t.rollback();
        console.error('Error al crear procedimiento:', error);
        const precios = await Precio.findAll({ order: [['monto', 'ASC']] });
        return res.render('procedimientos/crear', {
            pagina: 'Crear Procedimiento',
            csrfToken: req.csrfToken(),
            barra: true, piePagina: true,
            errores: [{ msg: error.message }],
            procedimiento: { nombre, precioExistente, precioNuevo },
            precios
        });
    }
};

// =================================================================
// FUNCIÓN 4: Mostrar el formulario para editar un Procedimiento
// =================================================================
const editar = async (req, res) => {

    if (req.usuario.role.nombre !== 'Admin') {
      return res.status(403).send('No tienes permiso para eliminar este vale');
    }

    const { id } = req.params;
    try {
        const [procedimiento, precios] = await Promise.all([
            Procedimiento.findByPk(id),
            Precio.findAll({ order: [['monto', 'ASC']] })
        ]);

        if (!procedimiento) {
            return res.redirect('/procedimientos/leer');
        }

        res.render('procedimientos/editar', {
            pagina: `Editar Procedimiento`,
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            procedimiento,
            precios
        });
    } catch (error) {
        console.error('Error al cargar formulario de edición:', error);
    }
};

// =================================================================
// FUNCIÓN 5: Procesar y guardar los cambios de un Procedimiento
// =================================================================
const actualizar = async (req, res) => {
    // 1. Validación
    await check('nombre').notEmpty().withMessage('El nombre del procedimiento es obligatorio').run(req);
    await check('precioExistente').custom((value, { req }) => {
        if (!value && !req.body.precioNuevo) {
            throw new Error('Debes seleccionar un precio existente o ingresar uno nuevo.');
        }
        return true;
    }).run(req);
    await check('precioNuevo').optional({ checkFalsy: true }).isDecimal().withMessage('El nuevo precio debe ser un número.').run(req);

    const resultado = validationResult(req);
    const { id } = req.params;
    const { nombre, precioExistente, precioNuevo } = req.body;

    // Si la validación falla
    if (!resultado.isEmpty()) {
        const [procedimiento, precios] = await Promise.all([
            Procedimiento.findByPk(id),
            Precio.findAll({ order: [['monto', 'ASC']] })
        ]);
        return res.render('procedimientos/editar', {
            pagina: `Editar: ${procedimiento.nombre}`,
            csrfToken: req.csrfToken(),
            barra: true, piePagina: true,
            errores: resultado.array(),
            procedimiento: { id, nombre, precioExistente, precioNuevo },
            precios
        });
    }

    const { id: usuarioId, nombre: nombreUsuario } = req.usuario;
    const t = await db.transaction();
    try {
        const procedimiento = await Procedimiento.findByPk(id, { transaction: t });
        if (!procedimiento) throw new Error('Procedimiento no encontrado.');

        // --- LÓGICA DE PRECIO REESTRUCTURADA ---
        let precioId;
        let precioCreado = false;
        let montoDelPrecio;

        // Se determina qué precio usar: el nuevo o el existente.
        if (precioNuevo && precioNuevo.trim() !== '') {
            montoDelPrecio = precioNuevo.trim();
        } else {
            const precioExistenteObj = await Precio.findByPk(precioExistente, { transaction: t });
            if (precioExistenteObj) {
                montoDelPrecio = precioExistenteObj.monto;
            } else {
                throw new Error('El precio seleccionado no es válido.');
            }
        }

        // Ahora que tenemos un monto garantizado, usamos findOrCreate
        const [precio, creado] = await Precio.findOrCreate({
            where: { monto: montoDelPrecio },
            defaults: { monto: montoDelPrecio },
            transaction: t
        });
        precioId = precio.id;
        precioCreado = creado;


        // 3. Registrar en auditoría
        await Auditoria.create({
            accion: 'MODIFICAR',
            tabla_afectada: 'procedimientos',
            registro_id: id,
            descripcion: `El usuario ${nombreUsuario} actualizó el procedimiento: ${procedimiento.nombre}.`,
            usuarioId
        }, { transaction: t });

        if (precioCreado) {
            await Auditoria.create({
                accion: 'CREAR',
                tabla_afectada: 'precios',
                registro_id: precioId,
                descripcion: `El usuario ${nombreUsuario} creó un nuevo precio: ${montoDelPrecio}.`,
                usuarioId
            }, { transaction: t });
        }

        // 4. Actualizar el procedimiento
        procedimiento.nombre = nombre;
        procedimiento.precioId = precioId;
        await procedimiento.save({ transaction: t });

        await t.commit();
        res.redirect('/procedimientos/leer?mensaje=Procedimiento actualizado correctamente');

    } catch (error) {
        await t.rollback();
        console.error('Error al actualizar procedimiento:', error);
        // ... tu manejo de errores ...
    }
};

// =================================================================
// FUNCIÓN 6: Eliminar un Procedimiento
// =================================================================
const eliminar = async (req, res) => {
    const { id } = req.params;

    if (req.usuario.role.nombre !== 'Admin') {
      return res.status(403).send('No tienes permiso para eliminar este vale');
    }
    
    try {
        const procedimiento = await Procedimiento.findByPk(id);
        if (!procedimiento) {
            return res.status(404).send('Procedimiento no encontrado.');
        }

        await procedimiento.destroy();
        res.redirect('/procedimientos/leer?eliminado=1');

    } catch (error) {
        console.error('Error al eliminar procedimiento:', error);
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).send('No se puede eliminar porque está en uso.');
        }
        res.status(500).send('Error al eliminar el procedimiento.');
    }
};

export {
    leer,
    formularioCrear,
    crear,
    editar,
    actualizar,
    eliminar
};