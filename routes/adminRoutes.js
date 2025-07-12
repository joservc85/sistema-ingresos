// routes/adminRoutes.js

import express from 'express';
import { protegerRuta, esAdmin } from '../middleware/protegerRuta.js';
import { paginaAdmin, formularioCrearUsuario, registrarUsuarioAdmin, formularioEditarUsuario, guardarCambiosUsuario, eliminarUsuario  } from '../controllers/adminController.js';
import { body } from 'express-validator';

const router = express.Router();

// Ruta para mostrar el panel principal con la lista de usuarios
router.get('/usuarios',
    protegerRuta, // 1. ¿El usuario ha iniciado sesión?
    esAdmin,      // 2. ¿Es un administrador?
    paginaAdmin   // 3. Si ambas son ciertas, muestra la página
);

// Ruta para mostrar el formulario de creación de un nuevo usuario
router.get('/usuarios/crear',
    protegerRuta,
    esAdmin,
    formularioCrearUsuario
);

// Ruta para procesar el formulario de creación de un nuevo usuario
router.post('/usuarios/crear',
    protegerRuta,
    esAdmin,
    // Aquí podemos añadir las validaciones
    body('nombre').notEmpty().withMessage('El Nombre no puede ir Vacio'),
    body('username').notEmpty().withMessage('El Nombre de Usuario es obligatorio'),
    body('rolId').notEmpty().withMessage('Debes seleccionar un rol para el usuario'),
    body('password').isLength({ min: 6 }).withMessage('El Password debe ser de al menos 6 caracteres'),
    body('repetir_password').custom((value, { req }) => {
        // 'value' es el valor del campo repetir_password
        // 'req.body.password' es el valor del otro campo de contraseña
        if (value !== req.body.password) {
            // Si no coinciden, lanzamos un error con nuestro mensaje.
            throw new Error('Las Contraseñas no coinciden');
        }
        // Si todo está bien, retornamos true.
        return true;
    }),
    registrarUsuarioAdmin
);

// Ruta para MOSTRAR el formulario de edición
router.get('/usuarios/editar/:id',
    protegerRuta,
    esAdmin,
    formularioEditarUsuario
);

// Ruta para GUARDAR los cambios del formulario de edición
router.post('/usuarios/editar/:id',
    protegerRuta,
    esAdmin,
    // Puedes añadir las mismas validaciones que en la creación
    body('nombre').notEmpty().withMessage('El Nombre no puede ir Vacio'),
    body('username').notEmpty().withMessage('El Nombre de Usuario es obligatorio'),
    body('rolId').notEmpty().withMessage('Debes seleccionar un rol para el usuario'),
    // La validación de la contraseña es opcional aquí, lo manejaremos en el controlador
    guardarCambiosUsuario
);

// Ruta para ELIMINAR un usuario
router.post('/usuarios/eliminar/:id',
    protegerRuta,
    esAdmin,
    eliminarUsuario
);

export default router;