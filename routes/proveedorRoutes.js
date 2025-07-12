import express from 'express'
import { leer, crear, formularioCrear, editar, actualizar, eliminar } from '../controllers/proveedorControllers.js'
import { protegerRuta } from "../middleware/protegerRuta.js" // Asegúrate de que esta ruta sea correcta

const router = express.Router()

// Ruta para mostrar todos los proveedores
router.get('/leer', protegerRuta, leer)

// Rutas para crear un nuevo proveedor
router.get('/crear', protegerRuta, formularioCrear)
router.post('/crear', protegerRuta, crear)

// Rutas para editar un proveedor existente
router.get('/editar/:id', protegerRuta, editar)
router.post('/editar/:id', protegerRuta, actualizar)

// Ruta para eliminar un proveedor
router.post('/eliminar/:id', protegerRuta, eliminar)

export default router