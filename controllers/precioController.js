import { check, validationResult } from 'express-validator';
import { Precio } from '../models/index.js';

// Muestra el formulario para crear un nuevo precio
const formularioNuevoPrecio = async (req, res) => {
    
    res.render('precios/crear', {
        pagina: 'Registrar Nuevo Precio',
        barra: true,
        piePagina: true,
        csrfToken: req.csrfToken(),
        datos: {} // Pasamos datos vacíos la primera vez
    });
};

// Guarda un nuevo precio enviado desde el formulario
const guardarNuevoPrecio = async (req, res) => {
    // Validar que los campos no estén vacíos
    await check('monto').notEmpty().withMessage('El campo Monto es obligatorio').isFloat({ gt: 0 }).withMessage('El monto debe ser un número mayor a cero').run(req);

    let resultado = validationResult(req);
    
    // Si hay errores de validación...
    if (!resultado.isEmpty()) {
        return res.render('precios/crear', {
            pagina: 'Registrar Nuevo Precio',
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
            datos: req.body // Mantenemos los datos que el usuario ya había escrito
        });
    }

    const { monto } = req.body;

    try {
        // Buscar si el precio ya existe para evitar duplicados exactos
        const precioExistente = await Precio.findOne({ where: { monto } });
        if (precioExistente) {
            return res.render('precios/crear', {
                pagina: 'Registrar Nuevo Precio',
                barra: true,
                piePagina: true,
                csrfToken: req.csrfToken(),
                errores: [{ msg: 'Este monto ya ha sido registrado.' }],
                datos: req.body
            });
        }

        // Crear el nuevo precio
        await Precio.create({ monto });

        // Redirigir a una página de éxito (puedes crear una lista de precios más adelante)
        res.redirect('/procedimientos/leer?mensaje=Precio registrado exitosamente');

    } catch (error) {
               
        return res.render('precios/crear', {
            pagina: 'Registrar Nuevo Precio',
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            errores,
            datos: req.body
        });
    }
};

export {
    formularioNuevoPrecio,
    guardarNuevoPrecio
};