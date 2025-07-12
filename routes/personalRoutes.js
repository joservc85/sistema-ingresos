import express from 'express'
import { leer, crear, formularioCrear, editar, actualizar, eliminar } from '../controllers/personalControllers.js'
import { protegerRuta } from "../middleware/protegerRuta.js"

const router = express.Router()

router.get('/leer', protegerRuta, leer)     //  mostrar Personal de Damaris Spa

router.get('/crear', protegerRuta, formularioCrear)
router.post('/crear', protegerRuta, crear)  //  Guardar Personal

router.get('/editar/:id',protegerRuta, editar);
router.post('/editar/:id', protegerRuta, actualizar);

router.post('/eliminar/:id', protegerRuta, eliminar)

export default router