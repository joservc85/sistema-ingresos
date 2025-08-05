// En routes/facturaRoutes.js

import express from 'express';
// Importa las tres funciones necesarias desde tu controlador de facturas
import { verificarFactura, generarNuevaFacturaPDF, reimprimirFacturaPDF } from '../controllers/facturaControllers.js';
// Importa tu middleware de protección si las rutas deben ser privadas
import { protegerRuta } from "../middleware/protegerRuta.js";

const router = express.Router();

// Ruta para verificar si una factura ya existe (devuelve un JSON)
// Es importante que esta ruta también esté protegida si la información es sensible.
router.get('/verificar/:actividadId',
    protegerRuta,
    verificarFactura
);

// Ruta para generar una nueva factura en un formato específico (carta o ticket)
router.get('/generar/:formato/:actividadId',
    protegerRuta,
    generarNuevaFacturaPDF
);

// Ruta para reimprimir una factura que ya existe en un formato específico
router.get('/reimprimir/:formato/:actividadId',
    protegerRuta,
    reimprimirFacturaPDF
);

export default router;
