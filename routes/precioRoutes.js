import express from 'express';
import { formularioNuevoPrecio, guardarNuevoPrecio } from '../controllers/precioController.js';
import { protegerRuta } from '../middleware/protegerRuta.js';

const router = express.Router();

// Muestra el formulario para crear un nuevo precio
router.get('/precios/nuevo', 
    protegerRuta, 
    formularioNuevoPrecio
);

// Maneja el envío del formulario para guardar un nuevo precio
router.post('/precios/nuevo', 
    protegerRuta, 
    guardarNuevoPrecio
);

export default router;