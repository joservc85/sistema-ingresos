// routes/actividadesDiariasRoutes.js
import express from 'express';
import { vistaPagosDiarios, exportarPagosDiariosExcel } from '../controllers/actividadesDiariasController.js';
import { protegerRuta } from '../middleware/protegerRuta.js';

const router = express.Router();
router.get('/pagos', protegerRuta, vistaPagosDiarios);
router.get('/pagos/exportar', protegerRuta,exportarPagosDiariosExcel);
export default router;