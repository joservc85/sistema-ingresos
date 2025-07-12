// routes/procedimientoRoutes.js

import express from 'express';
import { leer, crear, formularioCrear, editar, actualizar, eliminar } from '../controllers/procedimientoController.js';
import { protegerRuta } from "../middleware/protegerRuta.js" // Asegúrate de que esta ruta sea correcta

const router = express.Router();

// Ruta para mostrar todos los procedimientos
router.get('/leer', protegerRuta, leer);

// Rutas para crear un nuevo procedimiento
router.get('/crear', protegerRuta, formularioCrear);
router.post('/crear', protegerRuta, crear);

// Rutas para editar un procedimiento existente
router.get('/editar/:id', protegerRuta, editar);
router.post('/editar/:id', protegerRuta, actualizar);

// Ruta para eliminar un procedimiento
router.post('/eliminar/:id', protegerRuta, eliminar);

export default router;