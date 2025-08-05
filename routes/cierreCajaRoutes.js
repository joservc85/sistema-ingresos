import express from 'express';
import { mostrarCierre, guardarCierre, listarCierres, verCierre, anularCierre } from '../controllers/cierreCajaController.js';
import {protegerRuta} from '../middleware/protegerRuta.js';

const router = express.Router();

// Muestra la página del cierre de caja
router.get('/',
    protegerRuta,
    mostrarCierre
);

// Guarda el cierre de caja
router.post('/guardar',
    protegerRuta,
    guardarCierre
);

router.get('/historial', protegerRuta, listarCierres);
router.get('/ver/:id', protegerRuta, verCierre);

router.post('/anular/:id',
    protegerRuta,
    anularCierre
);

export default router;