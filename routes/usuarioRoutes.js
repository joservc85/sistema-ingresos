import express from "express";
import { formularioLogin, autenticar, confirmar, logout } from "../controllers/usuarioControllers.js";

const router = express.Router();

router.get('/login', formularioLogin);
router.post('/login', autenticar);

router.get('/confirmar/:token', confirmar)

router.post('/logout', logout);

export default router
