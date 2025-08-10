import express from 'express';
import { body } from 'express-validator';
import { formularioGasto, guardarGasto, formularioEditarGasto, guardarGastoEditado, verGastoAdmin, anularGastoAdmin } from '../controllers/gastoAdministrativoController.js';
import {protegerRuta, esAdmin} from '../middleware/protegerRuta.js';

const router = express.Router();

// Muestra el formulario para registrar un nuevo gasto
router.get('/registrar',
    protegerRuta,
    formularioGasto
);

// Guarda el nuevo gasto
router.post('/registrar',
    protegerRuta,
    body('descripcion').notEmpty().withMessage('La descripción es obligatoria.'),
    // Validamos que al menos una de las filas de artículo esté seleccionada
    body('articuloId').if((value, { req }) => !Array.isArray(req.body.articuloId) || req.body.articuloId.length > 0)
        .notEmpty().withMessage('Debes agregar y seleccionar al menos un artículo.'),
    guardarGasto
);

// --- NUEVAS RUTAS PARA EDITAR ---
router.get('/editar/:id', protegerRuta, formularioEditarGasto);
router.post('/editar/:id',
    protegerRuta,
    body('descripcion').notEmpty().withMessage('La descripción es obligatoria.'),
    body('articuloId').notEmpty().withMessage('Debes agregar al menos un artículo.'),
    guardarGastoEditado
);

router.get('/ver/:id', protegerRuta, verGastoAdmin);

router.post('/anular/:id', protegerRuta, esAdmin, anularGastoAdmin);

export default router;