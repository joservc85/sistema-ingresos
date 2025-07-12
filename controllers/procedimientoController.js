import { check, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { Procedimiento, Precio } from '../models/index.js'; // Importamos ambos modelos

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
    // 1. Validación (simple para el nombre)
    await check('nombre').notEmpty().withMessage('El nombre del procedimiento es obligatorio').run(req);
    const resultado = validationResult(req);

    const { nombre, precioExistente, precioNuevo } = req.body;

    // Si la validación del nombre falla
    if (!resultado.isEmpty()) {
        const precios = await Precio.findAll({ order: [['monto', 'ASC']] });
        return res.render('procedimientos/crear', {
            pagina: 'Crear Procedimiento',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            errores: resultado.array(),
            procedimiento: { nombre }, // Devolvemos el nombre que se escribió
            precios
        });
    }

    try {
        // 2. Comprobar si ya existe un procedimiento con ese nombre
        const existeProcedimiento = await Procedimiento.findOne({ where: { nombre } });
        if (existeProcedimiento) {
            const precios = await Precio.findAll({ order: [['monto', 'ASC']] });
            return res.render('procedimientos/crear', {
                pagina: 'Crear Procedimiento',
                csrfToken: req.csrfToken(),
                barra: true, piePagina: true,
                errores: [{ msg: 'Ya existe un procedimiento con este nombre.' }],
                procedimiento: { nombre },
                precios
            });
        }

        // 3. Lógica para determinar el precioId
        let precioId;
        if (precioNuevo && precioNuevo.trim() !== '') {
            const nuevoPrecioGuardado = await Precio.create({  monto: precioNuevo });
            precioId = nuevoPrecioGuardado.id;
        } else if (precioExistente && precioExistente.trim() !== '') {
            precioId = precioExistente;
        } else {
            // Si no se proporcionó precio, devolvemos un error.
            const precios = await Precio.findAll({ order: [['monto', 'ASC']] });
            return res.render('procedimientos/crear', {
                pagina: 'Crear Procedimiento',
                csrfToken: req.csrfToken(),
                barra: true, piePagina: true,
                errores: [{ msg: 'Debes seleccionar un precio existente o ingresar uno nuevo.' }],
                procedimiento: { nombre },
                precios
            });
        }

        // 4. Crear el procedimiento
        await Procedimiento.create({
            nombre,
            precioId,
            activo: true
        });

        res.redirect('/procedimientos/leer?guardado=1');

    } catch (error) {
        console.error('Error al crear procedimiento:', error);
        res.redirect('/procedimientos/leer?error=1');
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
    const { id } = req.params;

    // Validación
    await check('nombre').notEmpty().withMessage('El nombre del procedimiento es obligatorio').run(req);
    await check('precioExistente').notEmpty().withMessage('Debe seleccionar un precio.').run(req);
    const resultado = validationResult(req);
    
    const { nombre, precioExistente, activo } = req.body;

    if (!resultado.isEmpty()) {
        const [procedimiento, precios] = await Promise.all([
            Procedimiento.findByPk(id),
            Precio.findAll({ order: [['monto', 'ASC']] })
        ]);
        return res.render('procedimientos/editar', {
            pagina: 'Editar Procedimiento',
            csrfToken: req.csrfToken(),
            barra: true, piePagina: true,
            errores: resultado.array(),
            procedimiento: { ...procedimiento.dataValues, nombre, precioId: precioExistente, activo: activo === 'on' },
            precios
        });
    }

    try {
        const procedimiento = await Procedimiento.findByPk(id);
        if (!procedimiento) {
            return res.redirect('/procedimientos/leer');
        }

        // Comprobar que el nuevo nombre no esté ya en uso por otro procedimiento
        const existeOtroProcedimiento = await Procedimiento.findOne({
            where: { nombre, id: { [Op.ne]: id } }
        });

        if (existeOtroProcedimiento) {
            const precios = await Precio.findAll({ order: [['monto', 'ASC']] });
            return res.render('procedimientos/editar', {
                pagina: 'Editar Procedimiento',
                csrfToken: req.csrfToken(),
                barra: true, piePagina: true,
                errores: [{ msg: 'El nombre del procedimiento ya está en uso.' }],
                procedimiento: { ...procedimiento.dataValues, nombre, precioId: precioExistente, activo: activo === 'on' },
                precios
            });
        }

        // Actualizar datos
        procedimiento.nombre = nombre;
        procedimiento.precioId = precioExistente; // En edición solo re-asignamos
        procedimiento.activo = activo === 'on';

        await procedimiento.save();
        res.redirect('/procedimientos/leer?actualizado=1');

    } catch (error) {
        console.error('Error al actualizar procedimiento:', error);
        res.redirect('/procedimientos/leer?error=1');
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