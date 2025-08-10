import express from 'express';
import { body } from 'express-validator';
// --- CORRECCIÓN: Se importan TODAS las funciones desde el controlador unificado ---
import {
    formularioLogin,
    autenticar,
    logout,
    listarUsuarios,
    formularioCrearUsuario,
    registrarUsuario,
    formularioEditarUsuario,
    guardarCambiosUsuario,
    eliminarUsuario
} from '../controllers/adminController.js';
import { protegerRuta, esAdmin } from '../middleware/protegerRuta.js';

const router = express.Router();

// --- Rutas de Autenticación ---
router.post('/auth/login', autenticar);
router.post('/auth/logout', logout);


// --- Rutas de Gestión de Usuarios (Panel de Admin) ---

// Muestra la lista de usuarios
router.get('/admin/usuarios',
    protegerRuta,
    esAdmin,
    listarUsuarios // Se actualiza el nombre de la función
);

// Muestra el formulario para crear un nuevo usuario
router.get('/admin/usuarios/crear',
    protegerRuta,
    esAdmin,
    formularioCrearUsuario
);

// Procesa el formulario de creación
router.post('/admin/usuarios/crear',
    protegerRuta,
    esAdmin,
    body('nombre').notEmpty().withMessage('El Nombre no puede ir Vacio'),
    body('username').notEmpty().withMessage('El Nombre de Usuario es obligatorio'),
    body('rolId').notEmpty().withMessage('Debes seleccionar un rol para el usuario'),
    body('password').isLength({ min: 6 }).withMessage('El Password debe ser de al menos 6 caracteres'),
    body('repetir_password').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Las Contraseñas no coinciden');
        }
        return true;
    }),
    registrarUsuario // Se actualiza el nombre de la función
);

// Muestra el formulario de edición
router.get('/admin/usuarios/editar/:id',
    protegerRuta,
    esAdmin,
    formularioEditarUsuario
);

// Guarda los cambios del formulario de edición
router.post('/admin/usuarios/editar/:id',
    protegerRuta,
    esAdmin,
    body('nombre').notEmpty().withMessage('El Nombre no puede ir Vacio'),
    body('username').notEmpty().withMessage('El Nombre de Usuario es obligatorio'),
    body('rolId').notEmpty().withMessage('Debes seleccionar un rol para el usuario'),
    guardarCambiosUsuario
);

// Elimina un usuario
router.post('/admin/usuarios/eliminar/:id',
    protegerRuta,
    esAdmin,
    eliminarUsuario
);

export default router;