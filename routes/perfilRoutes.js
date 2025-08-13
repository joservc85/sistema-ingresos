import express from 'express';
import { body } from 'express-validator';
import { formularioPerfil, cambiarPassword } from '../controllers/perfilController.js';
import { protegerRuta } from '../middleware/protegerRuta.js';

const router = express.Router();

// Muestra la página de "Mi Perfil"
router.get('/',
    protegerRuta,
    formularioPerfil
);

// Procesa el cambio de contraseña
router.post('/',
    protegerRuta,
    body('password_actual').notEmpty().withMessage('La contraseña actual es obligatoria.'),
    body('password_nuevo').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres.'),
    body('repetir_password').custom((value, { req }) => {
        if (value !== req.body.password_nuevo) {
            throw new Error('Las nuevas contraseñas no coinciden.');
        }
        return true;
    }),
    cambiarPassword
);

export default router;