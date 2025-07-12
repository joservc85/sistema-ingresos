import { check, validationResult } from 'express-validator'
import Cliente from '../models/Cliente.js'

// Mostrar listado de clientes
const leer = async (req, res) => {
    const elementosPorPagina = 6;
    const paginaActual = Number(req.query.page) || 1;
    const offset = (paginaActual - 1) * elementosPorPagina;

    // Obtener total y registros paginados
    const { count, rows } = await Cliente.findAndCountAll({
        limit: elementosPorPagina,
        offset,
        order: [['nombre', 'ASC']],
    });

    // Total de páginas
    const totalPaginas = Math.ceil(count / elementosPorPagina);

    res.render('cliente/leer', {
        pagina: 'Listado de los Clientes de Damaris Spa',
        barra: true,
        piePagina: true,
        clientes: rows,
        csrfToken: req.csrfToken(),
        query: req.query,
        paginaActual,
        totalPaginas
    });
}

// Mostrar Formulario para Crear un Cliente
const formularioCrear = async (req, res) => {
    res.render('cliente/crear', {
        pagina: 'Crear Clientes de Damaris Spa',
        csrfToken: req.csrfToken(),
        cliente: {}, // Cambiado de 'personal' a 'cliente'
        barra: true
    });
}

// Guardar datos de un nuevo cliente
const crear = async (req, res) => {
    await check('nombre').notEmpty().withMessage('El nombre es obligatorio').run(req)
    await check('apellidos').notEmpty().withMessage('Los apellidos son obligatorios').run(req)
    await check('email').isEmail().withMessage('Debe ser un email válido').run(req)
    await check('telefono').notEmpty().withMessage('El número de teléfono es obligatorio').isNumeric().withMessage('El número de teléfono solo debe contener dígitos')
        .isLength({ min: 7, max: 7 }) // Asegura que tenga exactamente 7 dígitos
        .withMessage('El número de teléfono debe tener 7 dígitos')
        .run(req);
    // Validaciones para el prefijo del teléfono
    await check('prefijo_telefono')
        .notEmpty().withMessage('El prefijo del teléfono es obligatorio')
        .isIn(['300', '301', '302', '304', '305', '310', '311', '312', '313', '314', '315', '316', '317', '318', '319', '320', '321', '322', '323', '324', '350', '351'])
        .withMessage('El prefijo de teléfono no es válido')
        .run(req);

    const resultado = validationResult(req)

    if (!resultado.isEmpty()) {
        return res.render('cliente/crear', { // Cambiado de 'personal/crear' a 'cliente/crear'
            pagina: 'Crear Cliente', // Cambiado el título de la página
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
            cliente: { // Cambiado de 'personal' a 'cliente'
                nombre: req.body.nombre,
                apellidos: req.body.apellidos,
                email: req.body.email,
                prefijo_telefono: req.body.prefijo_telefono,
                telefono: req.body.telefono
            }
        })
    }

    const { nombre, apellidos, email, prefijo_telefono, telefono } = req.body

    const telefono_completo = `${prefijo_telefono}${telefono}`;

    const existe = await Cliente.findOne({ where: { email } }) // Cambiado de 'Personal' a 'Cliente'
    if (existe) {
        return res.render('cliente/crear', { // Cambiado de 'personal/crear' a 'cliente/crear'
            pagina: 'Crear Cliente', // Cambiado el título de la página
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            errores: [{ msg: 'Este email ya está registrado' }],
            cliente: { // Cambiado de 'personal' a 'cliente'
                nombre: req.body.nombre,
                apellidos: req.body.apellidos,
                email: req.body.email,
                prefijo_telefono: req.body.prefijo_telefono,
                telefono: req.body.telefono
            }
        })
    }

    try {
        await Cliente.create({ nombre, apellidos, email, telefono: telefono_completo }) 
        return res.redirect('/cliente/leer?guardado=1'); 
    } catch (error) {
        console.log(error);
        // Manejo de errores en caso de fallo al guardar en la base de datos
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

    // Buscar el cliente por ID
    const cliente = await Cliente.findByPk(id); 

    if (!cliente) { 
        return res.redirect('/cliente/leer'); 
    }

    // Separar prefijo y teléfono para mostrar en el formulario
    const telefonoCompleto = cliente.telefono || ''; 
    const prefijo_telefono = telefonoCompleto.slice(0, 3);
    const telefono = telefonoCompleto.slice(3);

    res.render('cliente/editar', { 
        pagina: `Editar Cliente de Damaris Spa: ${cliente.nombre} ${cliente.apellidos}`, 
        csrfToken: req.csrfToken(),
        cliente: { 
            id: cliente.id,
            nombre: cliente.nombre,
            apellidos: cliente.apellidos,
            email: cliente.email,
            prefijo_telefono,
            telefono,
            activo: cliente.activo
        },
        barra: true,
        piePagina: true
    });
};

// Procesar Edición de Cliente
const actualizar = async (req, res) => {
    const { id } = req.params;

    await check('nombre').notEmpty().withMessage('El nombre es obligatorio').run(req);
    await check('apellidos').notEmpty().withMessage('Los apellidos son obligatorios').run(req);
    await check('email').isEmail().withMessage('Debe ser un email válido').run(req);
    await check('telefono')
        .notEmpty().withMessage('El número de teléfono es obligatorio')
        .isNumeric().withMessage('Solo se permiten dígitos')
        .isLength({ min: 7, max: 7 }).withMessage('El número debe tener 7 dígitos')
        .run(req);

    await check('prefijo_telefono')
        .notEmpty().withMessage('El prefijo del teléfono es obligatorio')
        .isIn(['300', '301', '302', '304', '305', '310', '311', '312', '313', '314', '315', '316', '317', '318', '319', '320', '321', '322', '323', '324', '350', '351'])
        .withMessage('El prefijo no es válido')
        .run(req);

    const resultado = validationResult(req);

    const { nombre, apellidos, email, prefijo_telefono, telefono, activo } = req.body;

    if (!resultado.isEmpty()) {
        return res.render('cliente/editar', { 
            pagina: 'Editar Cliente', 
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            errores: resultado.array(),
            cliente: { 
                id,
                nombre: req.body.nombre,
                apellidos: req.body.apellidos,
                email: req.body.email,
                prefijo_telefono: req.body.prefijo_telefono,
                telefono: req.body.telefono,
                activo: req.body.activo === 'on'
            }
        });
    }

    
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
        cliente.email = email; 
        cliente.telefono = telefono_completo;
        cliente.activo = estaActivo

        await cliente.save(); 

        return res.redirect('/cliente/leer?actualizado=1'); 
    } catch (error) {
        console.log(error);
        return res.render('cliente/editar', { 
            pagina: 'Editar Cliente', 
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            errores: [{ msg: 'Hubo un error al actualizar los datos' }],
            cliente: { 
                id,
                nombre,
                apellidos,
                email,
                prefijo_telefono,
                telefono,
                activo: estaActivo
            }
        });
    }
};

// Eliminar un cliente
const eliminar = async (req, res) => {
    const { id } = req.params;

    if (req.usuario.role.nombre !== 'Admin') {
      return res.status(403).send('No tienes permiso para eliminar este vale');
    }

    try {
        const cliente = await Cliente.findByPk(id); 

        if (!cliente) { 
            return res.status(404).send('Registro no encontrado');
        }

        await cliente.destroy(); 

        return res.redirect('/cliente/leer?eliminado=1'); 
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