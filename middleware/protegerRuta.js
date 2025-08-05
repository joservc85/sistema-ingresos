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
            include: [{ model: Rol, as: 'role', attributes: ['nombre'] }] 
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
    // Esta función se ejecuta DESPUÉS de protegerRuta, por lo que req.usuario ya existe.
    const userRole = req.usuario?.role?.nombre;
    if (userRole === 'Admin' || userRole === 'Supervisor') {
        return next(); // Si es Admin o Supervisor, permite el acceso
    }
    // Si no tiene el rol correcto, redirige
    return res.redirect('/mis-actividades?error=Acceso Denegado');
};

// --- EXPORTACIÓN DE AMBAS FUNCIONES ---
export {
    protegerRuta,
    esAdmin
}