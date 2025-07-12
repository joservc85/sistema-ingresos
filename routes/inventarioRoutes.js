import express from 'express';
import { vistaInventario, exportarInventarioExcel } from '../controllers/inventarioController.js';
import { protegerRuta } from '../middleware/protegerRuta.js';

const router = express.Router();

router.get('/', protegerRuta, vistaInventario);
router.get('/exportar', protegerRuta, exportarInventarioExcel);

export default router;
