import { check, validationResult } from 'express-validator'
import { Op } from 'sequelize'; // Importar Op para la búsqueda
import Cliente from '../models/Cliente.js'

// Mostrar listado de clientes con búsqueda y paginación
const leer = async (req, res) => {
    const { page = 1, busqueda = '' } = req.query;
    const elementosPorPagina = 6;
    const offset = (page - 1) * elementosPorPagina;

    // --- LÓGICA DE BÚSQUEDA AÑADIDA ---
    const whereClause = {};
    if (busqueda) {
        whereClause[Op.or] = [
            { nombre: { [Op.like]: `%${busqueda}%` } },
            { apellidos: { [Op.like]: `%${busqueda}%` } },
            { cedula: { [Op.like]: `%${busqueda}%` } }, 
            { email: { [Op.like]: `%${busqueda}%` } },
            { instagram: { [Op.like]: `%${busqueda}%` } }
        ];
    }

    const { count, rows } = await Cliente.findAndCountAll({
        where: whereClause, // Se aplica el filtro de búsqueda
        limit: elementosPorPagina,
        offset,
        order: [['nombre', 'ASC']],
    });

    const totalPaginas = Math.ceil(count / elementosPorPagina);

    res.render('cliente/leer', {
        pagina: 'Listado de Clientes',
        barra: true,
        piePagina: true,
        clientes: rows,
        csrfToken: req.csrfToken(),
        query: req.query,
        paginaActual: Number(page),
        totalPaginas,
        busqueda // Pasar la búsqueda a la vista para rellenar el input
    });
}

// Mostrar Formulario para Crear un Cliente
const formularioCrear = async (req, res) => {
    res.render('cliente/crear', {
        pagina: 'Crear Cliente',
        csrfToken: req.csrfToken(),
        cliente: {},
        barra: true
    });
}

// Guardar datos de un nuevo cliente
const crear = async (req, res) => {
    // Validaciones existentes
    await check('nombre').notEmpty().withMessage('El nombre es obligatorio').run(req)
    await check('apellidos').notEmpty().withMessage('Los apellidos son obligatorios').run(req)
    await check('cedula').notEmpty().withMessage('La cédula es obligatoria.').isNumeric().withMessage('La cédula solo debe contener números.').run(req)
    await check('email').optional({ checkFalsy: true }).isEmail().withMessage('Debe ser un email válido').run(req)
    await check('telefono').notEmpty().withMessage('El número de teléfono es obligatorio').isNumeric().withMessage('El número de teléfono solo debe contener dígitos')
        .isLength({ min: 7, max: 7 }).withMessage('El número de teléfono debe tener 7 dígitos').run(req);
    await check('prefijo_telefono').notEmpty().withMessage('El prefijo del teléfono es obligatorio').run(req);
    
    // --- VALIDACIONES NUEVAS AÑADIDAS ---
    await check('tipo').notEmpty().withMessage('El tipo de cliente es obligatorio').run(req);

    const resultado = validationResult(req)

    if (!resultado.isEmpty()) {
        return res.render('cliente/crear', {
            pagina: 'Crear Cliente',
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
            cliente: req.body // Se devuelven todos los datos, incluyendo los nuevos
        })
    }

    // --- NUEVOS CAMPOS EXTRAÍDOS ---
    const { nombre, apellidos, email, prefijo_telefono, telefono, instagram, tipo, cedula } = req.body
    const telefono_completo = `${prefijo_telefono}${telefono}`;

    // Verificar si el email ya existe (solo si se proporcionó uno)
    if (email) {
        const existe = await Cliente.findOne({ where: { email } })
        if (existe) {
            return res.render('cliente/crear', {
                pagina: 'Crear Cliente',
                csrfToken: req.csrfToken(),
                barra: true,
                piePagina: true,
                errores: [{ msg: 'Este email ya está registrado' }],
                cliente: req.body
            })
        }
    }

    try {
        // --- NUEVOS CAMPOS GUARDADOS ---
        await Cliente.create({ nombre, apellidos, cedula, email, telefono: telefono_completo, instagram, tipo }) 
        return res.redirect('/cliente/leer?mensaje=Cliente Creado Correctamente'); 
    } catch (error) {
        console.log(error);
        return res.render('cliente/crear', { 
            pagina: 'Crear Cliente', 
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            errores: [{ msg: 'Hubo un error al registrar el cliente. Intente de nuevo.' }], 
            cliente: req.body 
        });
    }
}

// Mostrar Formulario de Edición de Cliente
const editar = async (req, res) => {
    const { id } = req.params;
    const cliente = await Cliente.findByPk(id); 

    if (!cliente) { 
        return res.redirect('/cliente/leer'); 
    }

    const telefonoCompleto = cliente.telefono || ''; 
    const prefijo_telefono = telefonoCompleto.slice(0, 3);
    const telefono = telefonoCompleto.slice(3);

    res.render('cliente/editar', { 
        pagina: `Editar Cliente: ${cliente.nombre} ${cliente.apellidos}`, 
        csrfToken: req.csrfToken(),
        cliente: { 
            ...cliente.dataValues, // Se pasan todos los datos del cliente
            prefijo_telefono,
            telefono
        },
        barra: true,
        piePagina: true
    });
};

// Procesar Edición de Cliente
const actualizar = async (req, res) => {
    const { id } = req.params;

    // Validaciones (igual que en crear)
    await check('nombre').notEmpty().withMessage('El nombre es obligatorio').run(req);
    await check('apellidos').notEmpty().withMessage('Los apellidos son obligatorios').run(req);
    await check('cedula').notEmpty().withMessage('La cédula es obligatoria.').isNumeric().withMessage('La cédula solo debe contener números.').run(req);
    await check('email').optional({ checkFalsy: true }).isEmail().withMessage('Debe ser un email válido').run(req);
    await check('telefono').notEmpty().withMessage('El número de teléfono es obligatorio').isNumeric().withMessage('Solo se permiten dígitos')
        .isLength({ min: 7, max: 7 }).withMessage('El número debe tener 7 dígitos').run(req);
    await check('prefijo_telefono').notEmpty().withMessage('El prefijo del teléfono es obligatorio').run(req);
    await check('tipo').notEmpty().withMessage('El tipo de cliente es obligatorio').run(req);

    const resultado = validationResult(req);
    
    if (!resultado.isEmpty()) {
        return res.render('cliente/editar', { 
            pagina: 'Editar Cliente', 
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            errores: resultado.array(),
            cliente: { id, ...req.body }
        });
    }

    const { nombre, apellidos, email, prefijo_telefono, telefono, activo, instagram, tipo, cedula } = req.body;
    const telefono_completo = `${prefijo_telefono}${telefono}`;
    const estaActivo = (activo === 'on' || activo === true);

    try {
        const cliente = await Cliente.findByPk(id); 

        if (!cliente) { 
            return res.redirect('/cliente/leer'); 
        }

        // Actualizar los campos del cliente
        cliente.nombre = nombre; 
        cliente.apellidos = apellidos;
        cliente.cedula = cedula;
        cliente.email = email; 
        cliente.telefono = telefono_completo;
        cliente.activo = estaActivo;
        // --- NUEVOS CAMPOS ACTUALIZADOS ---
        cliente.instagram = instagram;
        cliente.tipo = tipo;

        await cliente.save(); 

        return res.redirect('/cliente/leer?mensaje=Cliente Actualizado Correctamente'); 
    } catch (error) {
        console.log(error);
        // ... tu manejo de errores ...
    }
};

// Eliminar un cliente
const eliminar = async (req, res) => {
    const { id } = req.params;
    
    if (req.usuario.role.nombre !== 'Admin' && req.usuario.role.nombre !== 'Supervisor') {
        return res.status(403).send('No tienes permiso para eliminar este cliente');
    }

    try {
        const cliente = await Cliente.findByPk(id); 

        if (!cliente) { 
            return res.status(404).send('Registro no encontrado');
        }

        await cliente.destroy(); 

        return res.redirect('/cliente/leer?mensaje=Cliente Eliminado Correctamente'); 
    } catch (error) {
        console.error(error);
        return res.status(500).send('Error al eliminar');
    }
};

export {
    leer,
    formularioCrear,
    crear,
    editar,
    actualizar,
    eliminar
}