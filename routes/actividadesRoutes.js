import express from "express";
import { body } from 'express-validator'
import { admin, crear, guardar, anularActividad, eliminarVale } from '../controllers/actividadesControllers.js'
import { protegerRuta } from "../middleware/protegerRuta.js"
import { Precio, FormaDePago } from '../models/index.js'; 

const router = express.Router()

router.get('/mis-actividades', protegerRuta, admin)
router.get('/actividades/crear', protegerRuta, crear)

router.post('/actividades/crear', protegerRuta,
    // --- TUS VALIDACIONES EXISTENTES (SIN CAMBIOS) ---
    body('personal').notEmpty().withMessage('El personal es obligatorio').isNumeric().withMessage('Selecciona un personal válido'),
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
    body('cliente').custom((value, { req }) => {
        if (req.body.soloVales !== 'on' && !value) {
            throw new Error('El cliente es obligatorio');
        }
        return true;
    }),
    body('procedimiento').custom((value, { req }) => {
        if (req.body.soloVales !== 'on' && !value) {
            throw new Error('El procedimiento es obligatorio');
        }
        return true;
    }),
    body('precio').custom((value, { req }) => {
        if (req.body.soloVales !== 'on' && !value) {
            throw new Error('El precio es obligatorio');
        }
        return true;
    }),
    body('formaDePagoId').if(body('soloVales').not().exists())
        .notEmpty().withMessage('Debes seleccionar una Forma de Pago para la actividad.'),
    
    // --- ¡NUEVA VALIDACIÓN PERSONALIZADA PARA PAGOS AÑADIDA AQUÍ! ---
    body('monto').if(body('soloVales').not().exists()).custom(async (monto, { req }) => {
        const { precio: precioId, formaDePagoId, bancoId, referencia_pago } = req.body;
        
        // 1. Validar que la suma de los pagos coincida con el precio
        const precioProcedimiento = await Precio.findByPk(precioId);
        if (!precioProcedimiento) {
            throw new Error('El precio del procedimiento no es válido.');
        }
        
        const montosArray = Array.isArray(monto) ? monto : [monto];
        const totalPagado = montosArray.reduce((total, m) => total + (parseFloat(String(m).replace(/[^0-9]/g, '')) || 0), 0);

        if (totalPagado !== parseFloat(precioProcedimiento.monto)) {
            throw new Error('La suma de los pagos no coincide con el precio del procedimiento.');
        }

        // 2. Validar campos condicionales (banco y referencia)
        const formasDePagoDB = await FormaDePago.findAll();
        const formasArray = Array.isArray(formaDePagoId) ? formaDePagoId : [formaDePagoId];
        const bancosArray = Array.isArray(bancoId) ? bancoId : [bancoId];
        const referenciasArray = Array.isArray(referencia_pago) ? referencia_pago : [referencia_pago];

        for (let i = 0; i < formasArray.length; i++) {
            const forma = formasDePagoDB.find(f => f.id == formasArray[i]);
            if (forma) {
                if (forma.nombre === 'Datafono' && !referenciasArray[i]) {
                    throw new Error(`La referencia es obligatoria para el pago con Datafono (fila ${i + 1}).`);
                }
                if (forma.nombre === 'Transferencia') {
                    if (!bancosArray[i]) throw new Error(`El banco es obligatorio para la Transferencia (fila ${i + 1}).`);
                    if (!referenciasArray[i]) throw new Error(`La referencia es obligatoria para la Transferencia (fila ${i + 1}).`);
                }
            }
        }

        return true; // Si todo está bien, la validación pasa
    }),

    guardar
);

// --- RUTA ACTUALIZADA: DE ELIMINAR A ANULAR ---
router.post('/actividades/anular/:id',
    protegerRuta,
    anularActividad
);
router.post('/actividades/eliminar/vale/:id', protegerRuta, eliminarVale);

export default router;
