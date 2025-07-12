// routes/gastosRoutes.js

import express from 'express';
import { body } from 'express-validator';
import {
    listarGastos,
    formCrearGasto,
    guardarGasto,
    formEditarGasto,
    editarGasto,
    eliminarGasto,
    obtenerGastoJSON
} from '../controllers/gastosControllers.js'; // Importaremos las funciones del controlador
import { protegerRuta } from '../middleware/protegerRuta.js';

const router = express.Router();

// Ruta para mostrar el listado de todos los gastos
router.get('/', protegerRuta, listarGastos);

// Ruta para mostrar el formulario de creación de un nuevo gasto
router.get('/crear', protegerRuta, formCrearGasto);

// Ruta para procesar y guardar un nuevo gasto
router.post('/crear',
    protegerRuta,
    // Aquí van las validaciones basadas en tu modelo GastoAdicional
    body('numero_factura').notEmpty().withMessage('El número de factura o recibo es obligatorio.').trim(),
    body('proveedorId').notEmpty().withMessage('Debes seleccionar un proveedor.').isNumeric().withMessage('Proveedor no válido.'),
    //body('valor_total').notEmpty().withMessage('El valor total es obligatorio.').isDecimal().withMessage('El valor total debe ser un número.'),
    body('fecha_gasto').isISO8601().withMessage('La fecha del gasto es obligatoria.'),
    body('descripcion').trim(), // La descripción es opcional, solo limpiamos espacios
    body('articuloId').custom((value, { req }) => {
        // 'value' es lo que llega en req.body.articuloId
        // Puede ser undefined, un string, o un array.

        // Caso 1: Si no llega nada (undefined) o es un array vacío.
        if (!value || (Array.isArray(value) && value.length === 0)) {
            throw new Error('Debes agregar al menos un artículo al gasto.');
        }

        // Caso 2: Asegurarnos de que al menos un artículo seleccionado sea válido.
        // Esto previene que se envíen filas vacías (con valor '').
        const articulos = Array.isArray(value) ? value : [value]; // Lo convertimos a array si no lo es

        const hayAlMenosUnArticuloValido = articulos.some(id => id && id.trim() !== '');

        if (!hayAlMenosUnArticuloValido) {
            throw new Error('Debes seleccionar un artículo en al menos una de las filas.');
        }

        // Si todas las validaciones pasan, retornamos true.
        return true;
    }),
    guardarGasto
);

// --- Rutas para Editar (las creamos de una vez para seguir la estructura) ---
// Ruta para mostrar el formulario de edición
router.get('/editar/:id', protegerRuta, formEditarGasto);

// Ruta para procesar la actualización del gasto
router.post('/editar/:id',
    protegerRuta,
    // Las validaciones son las mismas que al crear
    body('numero_factura').notEmpty().withMessage('El número de factura o recibo es obligatorio.').trim(),
    body('proveedorId').notEmpty().withMessage('Debes seleccionar un proveedor.').isNumeric().withMessage('Proveedor no válido.'),
    body('fecha_gasto').isISO8601().withMessage('La fecha del gasto es obligatoria.'),
    body('descripcion').trim(),
    body('articuloId').custom((value, { req }) => {
        // 'value' es lo que llega en req.body.articuloId
        // Puede ser undefined, un string, o un array.

        // Caso 1: Si no llega nada (undefined) o es un array vacío.
        if (!value || (Array.isArray(value) && value.length === 0)) {
            throw new Error('Debes agregar al menos un artículo al gasto.');
        }

        // Caso 2: Asegurarnos de que al menos un artículo seleccionado sea válido.
        // Esto previene que se envíen filas vacías (con valor '').
        const articulos = Array.isArray(value) ? value : [value]; // Lo convertimos a array si no lo es

        const hayAlMenosUnArticuloValido = articulos.some(id => id && id.trim() !== '');

        if (!hayAlMenosUnArticuloValido) {
            throw new Error('Debes seleccionar un artículo en al menos una de las filas.');
        }

        // Si todas las validaciones pasan, retornamos true.
        return true;
    }),
    
    editarGasto
);


// --- Ruta para Eliminar ---
router.post('/eliminar/:id',
    protegerRuta,
    eliminarGasto
);

router.get('/api/:id',
    protegerRuta,
    obtenerGastoJSON // Necesitaremos crear esta función en el controlador
);

export default router;