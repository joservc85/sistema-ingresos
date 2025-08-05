// Reemplaza el contenido de tu archivo /routes/ropaRoutes.js con este código

import express from 'express';
import { body } from 'express-validator';
import { listarRopa, formularioRegistrar, guardarRopa, formularioEditar, guardarEdicion, eliminarRopa } from '../controllers/ropaController.js';
import {protegerRuta} from '../middleware/protegerRuta.js';

const router = express.Router();

// Muestra la lista de inventario de ropa
router.get('/', protegerRuta, listarRopa);

// Rutas para registrar un nuevo artículo
router.get('/registrar', protegerRuta, formularioRegistrar);
router.post('/registrar',
    protegerRuta,
    body('nombre').notEmpty().withMessage('El nombre del artículo es obligatorio.'),
    body('precio_venta').notEmpty().withMessage('El precio de venta es obligatorio.').isNumeric().withMessage('El precio debe ser un número.'),
    body('stock_actual').notEmpty().withMessage('El stock inicial es obligatorio.').isInt({ min: 0 }).withMessage('El stock debe ser un número entero positivo.'),
    guardarRopa
);

// --- ¡NUEVAS RUTAS PARA EDITAR! ---
router.get('/editar/:id', protegerRuta, formularioEditar);
router.post('/editar/:id',
    protegerRuta,
    body('nombre').notEmpty().withMessage('El nombre del artículo es obligatorio.'),
    body('precio_venta').notEmpty().withMessage('El precio de venta es obligatorio.').isNumeric().withMessage('El precio debe ser un número.'),
    body('stock_actual').notEmpty().withMessage('El stock es obligatorio.').isInt({ min: 0 }).withMessage('El stock debe ser un número entero positivo.'),
    guardarEdicion
);

// --- ¡NUEVA RUTA PARA ELIMINAR! ---
router.post('/eliminar/:id', protegerRuta, eliminarRopa);

export default router;
