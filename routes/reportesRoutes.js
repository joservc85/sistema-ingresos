import express from 'express';
import { gananciasPerdidas, reportePorPersonal, reporteClientesFrecuentes } from '../controllers/reportesController.js';
import { protegerRuta, esAdmin } from '../middleware/protegerRuta.js';

const router = express.Router();

// Muestra la página del reporte (solo para Admins)
router.get('/ganancias-perdidas',
    protegerRuta,
    esAdmin,
    gananciasPerdidas
);

// Muestra la página del reporte por personal
router.get('/por-personal',
    protegerRuta,
    esAdmin,
    reportePorPersonal
);

// Muestra la página del reporte de clientes frecuentes
router.get('/clientes-frecuentes',
    protegerRuta,
    esAdmin,
    reporteClientesFrecuentes
);


export default router;