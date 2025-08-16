import express from 'express';
import { body } from 'express-validator';
import { listarBancos, formularioCrear, guardarBanco, formularioEditar, guardarEdicion, eliminarBanco } from '../controllers/bancoController.js';
import { protegerRuta, esAdmin } from '../middleware/protegerRuta.js';

const router = express.Router();

router.get('/leer', protegerRuta, esAdmin, listarBancos);
router.get('/crear', protegerRuta, esAdmin, formularioCrear);
router.post('/crear',
    protegerRuta,
    esAdmin,
    body('nombre').notEmpty().withMessage('El nombre del banco es obligatorio.'),
    guardarBanco
);
router.get('/editar/:id', protegerRuta, esAdmin, formularioEditar);
router.post('/editar/:id',
    protegerRuta,
    esAdmin,
    body('nombre').notEmpty().withMessage('El nombre del banco es obligatorio.'),
    guardarEdicion
);
router.post('/eliminar/:id', protegerRuta, esAdmin, eliminarBanco);

export default router;