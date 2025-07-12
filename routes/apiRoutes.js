// routes/apiRoutes.js
import express from 'express';
import { buscarArticulos } from '../controllers/apiController.js'; // Usaremos un nuevo controlador

const router = express.Router();

// Cuando se haga una petición GET a /api/articulos/buscar?termino=... se ejecutará esta función
router.get('/articulos/buscar', buscarArticulos);

export default router;