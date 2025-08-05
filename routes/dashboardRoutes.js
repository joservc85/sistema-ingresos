// routes/dashboardRoutes.js

import express from 'express';
import { mostrarDashboard } from '../controllers/dashboardController.js';
import { protegerRuta } from '../middleware/protegerRuta.js';

const router = express.Router();

// Muestra la página principal del dashboard
router.get('/',
    protegerRuta,
    mostrarDashboard
);

export default router;
