// middleware/protegerRuta.js

import jwt from 'jsonwebtoken'
import { Usuario, Rol } from '../models/index.js'

// --- FUNCIÓN 1: protegerRuta ---
const protegerRuta = async (req, res, next) => {
    // Verificar si hay un Token
    const {_token} = req.cookies
    if(!_token){
        return res.redirect('/auth/login')
    }

    // Comprobar el Token
    try {
        const decoded = jwt.verify(_token, process.env.JWT_SECRET)
        // Buscamos al usuario y también incluimos el modelo Rol para traer sus datos.
        const usuario = await Usuario.scope('eliminarPassword').findByPk(decoded.id, {
            include: [{ model: Rol, attributes: ['nombre'] }] 
        })
        
        // Almacenar el usuario en el Req Y en las Vistas
        if(usuario){
            req.usuario = usuario; // Para los controladores y otros middlewares
            res.locals.usuario = usuario; // Para que las vistas Pug lo puedan usar
            
            return next(); // Continuamos a la siguiente función
        } else {
            return res.redirect('/auth/login')
        }
    } catch (error) {
        return res.clearCookie('_token').redirect('/auth/login')    
    }
}


const esAdmin = (req, res, next) => {
    console.log('--- 1. ENTRANDO AL MIDDLEWARE esAdmin ---');
    
    if (!req.usuario) {
        console.log('--- 2. ERROR: req.usuario no existe. Redirigiendo al login. ---');
        return res.redirect('/auth/login');
    }

    console.log('--- 2. DATOS DEL USUARIO A VERIFICAR: ---');
    // --- CAMBIO CLAVE AQUÍ ---
    // Usamos .toJSON() para imprimir un objeto limpio y seguro, sin que se caiga el servidor.
    console.dir(req.usuario.toJSON(), { depth: null });
    console.log('-----------------------------------------');const esAdmin = (req, res, next) => {
    console.log('--- 1. ENTRANDO AL MIDDLEWARE esAdmin ---');
    
    if (!req.usuario) {
        console.log('--- 2. ERROR: req.usuario no existe. Redirigiendo al login. ---');
        return res.redirect('/auth/login');
    }

    console.log('--- 2. DATOS DEL USUARIO A VERIFICAR: ---');
    // --- CAMBIO CLAVE AQUÍ ---
    // Usamos .toJSON() para imprimir un objeto limpio y seguro, sin que se caiga el servidor.
    console.dir(req.usuario.toJSON(), { depth: null });
    console.log('-----------------------------------------');

    // Hacemos la comprobación de forma segura
    if (req.usuario && req.usuario.role && req.usuario.role.nombre === 'Admin') {
        console.log("--- 3. VEREDICTO: El usuario ES Admin. Permitiendo acceso. ---");
        return next();
    } else {
        console.log(`--- 3. VEREDICTO: El usuario NO es Admin. Rol encontrado: ${req.usuario?.role?.nombre}. Redirigiendo... ---`);
        return res.status(403).redirect('/mis-actividades?error=acceso_denegado');
    }
};

    // Hacemos la comprobación de forma segura
    if (req.usuario && req.usuario.role && req.usuario.role.nombre === 'Admin') {
        console.log("--- 3. VEREDICTO: El usuario ES Admin. Permitiendo acceso. ---");
        return next();
    } else {
        console.log(`--- 3. VEREDICTO: El usuario NO es Admin. Rol encontrado: ${req.usuario?.role?.nombre}. Redirigiendo... ---`);
        return res.status(403).redirect('/mis-actividades?error=acceso_denegado');
    }
};


// --- EXPORTACIÓN DE AMBAS FUNCIONES ---
export {
    protegerRuta,
    esAdmin
}