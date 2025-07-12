// routes/articulosRoutes.js
import express from 'express';
import {leerArticulos,formularioCrearArticulo,crearArticulo,formularioEditarArticulo,actualizarArticulo, eliminarArticulo} from '../controllers/articulosControllers.js';
import { protegerRuta } from "../middleware/protegerRuta.js";

const router = express.Router();

// Ruta principal para mostrar todos los artículos
router.get('/leer', protegerRuta, leerArticulos);

// Rutas para crear un nuevo artículo
router.get('/crear', protegerRuta, formularioCrearArticulo);
router.post('/crear', protegerRuta, crearArticulo);

// Rutas para editar un artículo existente
router.get('/editar/:id', protegerRuta, formularioEditarArticulo);
router.post('/editar/:id', protegerRuta, actualizarArticulo);

// Ruta para eliminar un artículo
router.post('/eliminar/:id', protegerRuta, eliminarArticulo);

export default router;