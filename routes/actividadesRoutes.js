import express from "express";
import { body } from 'express-validator'
import { admin, crear, guardar, anularActividad, eliminarVale } from '../controllers/actividadesControllers.js'
import { protegerRuta } from "../middleware/protegerRuta.js"

const router = express.Router()

router.get('/mis-actividades', protegerRuta, admin)
router.get('/actividades/crear', protegerRuta, crear)

router.post('/actividades/crear', protegerRuta,
    // Validaciones comunes para ambos casos
    body('personal').notEmpty().withMessage('El personal es obligatorio').isNumeric().withMessage('Selecciona un personal válido'),

    // Si se está creando un vale (con soloVales)
    body('soloVales').custom((value, { req }) => {
        if (value === 'on') {
            if (!req.body.vales || req.body.vales <= 0) {
                throw new Error('El valor del vale es obligatorio');
            }
            if (!req.body.descripcion || req.body.descripcion.trim() === '') {
                throw new Error('La descripción del vale es obligatoria');
            }
        }
        return true;
    }),

    // Si no es un vale, validar los campos de actividad normal
    body('cliente').custom((value, { req }) => {
        if (req.body.soloVales !== 'on') {
            if (!value) {
                throw new Error('El cliente es obligatorio');
            }
        }
        return true;
    }),
    body('procedimiento').custom((value, { req }) => {
        if (req.body.soloVales !== 'on') {
            if (!value) {
                throw new Error('El procedimiento es obligatorio');
            }
        }
        return true;
    }),
    body('precio').custom((value, { req }) => {
        if (req.body.soloVales !== 'on') {
            if (!value) {
                throw new Error('El precio es obligatorio');
            }
        }
        return true;
    }),
    body('formaDePagoId').if(body('soloVales').not().exists())
        .notEmpty().withMessage('Debes seleccionar una Forma de Pago para la actividad.'),
    
    guardar
)

// --- RUTA ACTUALIZADA: DE ELIMINAR A ANULAR ---
router.post('/actividades/anular/:id',
    protegerRuta,
    anularActividad
);
router.post('/actividades/eliminar/vale/:id', protegerRuta, eliminarVale);

export default router;
