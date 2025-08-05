// Crea un nuevo archivo en: /routes/ventaRopaRoutes.js

import express from 'express';
import { body } from 'express-validator';
import { formularioVenta, guardarVenta, listarVentas, eliminarVenta, verVenta, formularioEditarVenta, guardarVentaEditada } from '../controllers/ventaRopaController.js';
import { protegerRuta} from '../middleware/protegerRuta.js';

const router = express.Router();

// Muestra el formulario para registrar una nueva venta de ropa
router.get('/registrar',
    protegerRuta,
    formularioVenta
);

// Guarda la nueva venta
router.post('/registrar',
    protegerRuta,
    body('articuloId').notEmpty().withMessage('Debes agregar al menos un artículo a la venta.'),
    guardarVenta
);

// Muestra el historial de ventas
router.get('/historial', protegerRuta, listarVentas);

// Elimina una venta
router.post('/eliminar/:id', protegerRuta, eliminarVenta);

// --- NUEVA RUTA PARA VER EL DETALLE DE UNA VENTA ---
router.get('/ver/:id', protegerRuta, verVenta);

// --- ¡Editar
router.get('/editar/:id', protegerRuta, formularioEditarVenta);
router.post('/editar/:id', protegerRuta, guardarVentaEditada);

export default router;