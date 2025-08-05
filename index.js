// index.js (o app.js) - VERSIÓN FINAL

import express from 'express'
import session from 'express-session';
import csrf from 'csurf'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'

// --- ¡NUEVO! Importar el controlador del formulario de login ---
import { formularioLogin } from './controllers/usuarioControllers.js';

// Importaciones de Rutas
import dashboardRoutes from './routes/dashboardRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js'
import adminRoutes from './routes/adminRoutes.js';
import actividadesRoutes from './routes/actividadesRoutes.js';
import facturaRoutes from './routes/facturaRoutes.js'; 
import actividadesDiariasRoutes from './routes/actividadesDiariasRoutes.js';
import procedimientoRoutes from './routes/procedimientoRoutes.js';
import personalRoutes from './routes/personalRoutes.js'
import clienteRoutes from './routes/clienteRoutes.js'
import proveedorRoutes from './routes/proveedorRoutes.js'
import articulosRoutes from './routes/articulosRoutes.js';
import gastosRoutes from './routes/gastosRoutes.js';
import inventarioRoutes from './routes/inventarioRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import gastosAdministrativosRoutes from './routes/gastosAdministrativosRoutes.js';
// Importación de la Base de Datos
import db from './config/db.js'
// Importacion del modulo de inventario de ropa
import ropaRoutes from './routes/ropaRoutes.js';
import ventaRopaRoutes from './routes/ventaRopaRoutes.js';
// Cierre de Caja
import cierreCajaRoutes from './routes/cierreCajaRoutes.js';
// Auditoria
import auditoriaRoutes from './routes/auditoriaRoutes.js';
// --- 1. CONFIGURACIÓN INICIAL ---
const app = express()
dotenv.config({ path: '.env' })

// --- 2. CONEXIÓN A LA BASE DE DATOS ---
try {
    await db.authenticate();
    // En producción, esta línea debe estar comentada o eliminada
    await db.sync() 
    console.log('>> Conexión y Sincronización con la BD: OK')
} catch (error) {
    console.log(error)
}

// --- 3. CONFIGURACIÓN DEL MOTOR DE PLANTILLAS (PUG) ---
app.set('view engine', 'pug')
app.set('views','./views')

// --- 4. MIDDLEWARES ---
app.use(express.static('public'))
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(
  session({
    secret: process.env.SECRET_SESSION || 'un-secreto-muy-seguro-y-largo',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 // 1 día
    }
  })
);
app.use(csrf({cookie: true}))

// --- 5. RUTAS (Routing) ---

// --- ¡NUEVO! Ruta principal para el login ---
app.get('/DamarisSpa', formularioLogin);

// Rutas existentes
// Auditoria
app.use('/auditoria', auditoriaRoutes);
// Procesos Principales
app.use('/', actividadesRoutes)
app.use('/actividades', actividadesDiariasRoutes);
app.use('/api', apiRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/auth', usuarioRoutes)
app.use('/admin', adminRoutes)
app.use('/facturas', facturaRoutes);
app.use('/personal', personalRoutes)
app.use('/cliente', clienteRoutes)
// Inventario
app.use('/proveedor', proveedorRoutes)
app.use('/procedimientos', procedimientoRoutes);
app.use('/articulos', articulosRoutes);
app.use('/gastos', gastosRoutes);
app.use('/gastos-administrativos', gastosAdministrativosRoutes);
app.use('/inventario', inventarioRoutes);
// Iventario de Ropa 
app.use('/inventario/ropa', ropaRoutes);
app.use('/ventas/ropa', ventaRopaRoutes);
app.use('/cierre-caja', cierreCajaRoutes);

// --- 6. MANEJADOR DE ERRORES 404 ---
app.use((req, res) => {
    res.status(404).render('404', {
        pagina: 'No Encontrada'
    })
})

// --- 7. PUERTO Y ARRANQUE DEL SERVIDOR ---
const port = process.env.PORT || 4000;
app.listen(port, () =>{
    console.log(`El servidor Inicio en el puerto ${port}`)
})