// Crea un nuevo archivo en: /routes/auditoriaRoutes.js

import express from 'express';
import { listarAuditoria } from '../controllers/auditoriaController.js';
import { protegerRuta, esAdmin } from '../middleware/protegerRuta.js';

const router = express.Router();

// Muestra la página del historial de auditoría (solo para Admins)
router.get('/',
    protegerRuta,
    esAdmin, // Middleware para asegurar que solo los admins puedan ver esta página
    listarAuditoria
);

export default router;