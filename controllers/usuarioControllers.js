import { check, validationResult } from 'express-validator'
import Usuario from '../models/Usuario.js'
import { generarJWT } from '../helpers/token.js'


const formularioLogin = (req, res) => {
    res.render('auth/login', {
        pagina: 'Iniciar Sesión',
        csrfToken: req.csrfToken(),
        query: req.query
    })
}

const autenticar = async (req, res) => {
    // Validacion
    await check('username').notEmpty().withMessage('El Nombre de Usuario es Obligatorio').run(req);
    await check('password').notEmpty().withMessage('El Password es obligatorio').run(req)

    let resultado = validationResult(req)
    // Verificar que el resultado este vacio
    if (!resultado.isEmpty()) {
        // Errores
        return res.render('auth/login', {
            pagina: 'Iniciar Sesion',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
            query: {}
        })
    }

    const { username, password } = req.body
    // Comprobar si es el usuario existe
    const usuario = await Usuario.findOne({ where: { username  } })
    if (!usuario) {
        return res.render('auth/login', {
            pagina: 'Iniciar Sesion',
            csrfToken: req.csrfToken(),
            query: req.query || {},
            errores: [{ msg: 'El Usuario No Existe' }]
        })
    }

 
    // Revisar el password
    if(!usuario.verificarPassword(password)){
        return res.render('auth/login', {
            pagina: 'Iniciar Sesion',
            csrfToken: req.csrfToken(),
            query: req.query || {},
            errores: [{ msg: 'El password es incorrecto' }]
        })
    }

    // Autenticar el Usuario
    const token = generarJWT({id: usuario.id, nombre: usuario.nombre})

    console.log(token)

    // Almacenar en un cookie
    return res.cookie('_token', token, {
        httpOnly: true,
       // secure: true
    }).redirect('/mis-actividades')
}

const formularioRegistro = (req, res) => {
    res.render('auth/registro', {
        pagina: 'Crear Cuenta',
        csrfToken: req.csrfToken()
    })
}

const registrar = async (req, res) => {
    // 1. La validación sigue siendo correcta y necesaria.
    await check('nombre').notEmpty().withMessage('El Nombre no puede ir Vacio').run(req);
    await check('username').notEmpty().withMessage('El Nombre de Usuario es obligatorio').run(req);
    await check('password').isLength({ min: 6 }).withMessage('El Password minimo debe ser de 6 caracteres').run(req);
    // Nota: 'repetir_password' lo mantendremos por ahora, es útil en el formulario.

    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
        // En el futuro, esto renderizará la vista del panel de admin.
        // Por ahora lo dejamos así.
        return res.render('auth/registro', {
            pagina: 'Crear Cuenta',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
            usuario: {
                nombre: req.body.nombre,
                username: req.body.username
            }
        });
    }

    // 2. Extraer los datos (el rol también vendrá del formulario del admin).
    const { nombre, username, password, rolId } = req.body;

    // 3. Verificar si el usuario ya existe (esto no cambia).
    const existeUsuario = await Usuario.findOne({ where: { username } });
    if (existeUsuario) {
        return res.render('auth/registro', {
            // ... (código de error sin cambios)
            errores: [{ msg: 'El Usuario ya esta Registrado' }],
            // ...
        });
    }

    // 4. Almacenar el nuevo usuario.
    //    Quitamos la generación de token. El usuario se crea activo por defecto.
    await Usuario.create({
        nombre,
        username,
        password,
        rolId: rolId || 2 // Si no se especifica un rol, se asigna 'Empleado' (ID 2) por defecto
    });

    return res.redirect('/admin/usuarios?mensaje=Usuario Creado Correctamente');
};

// Funcion que compruena una cuenta
const confirmar = async (req, res) => {

    const { token } = req.params;

    // Verificar si el token es valido
    const usuario = await Usuario.findOne({ where: { token } })

    if (!usuario) {
        return res.render('auth/confirmar-cuenta', {
            pagina: 'Error al confirmar tu cuenta',
            mensaje: 'Hubo un error al confirmar tu cuenta, intenta de nuevo',
            error: true
        })
    }

    // Confirmar la cuenta
    usuario.token = null;
    usuario.confirmado = true;

    await usuario.save();

    return res.render('auth/confirmar-cuenta', {
        pagina: 'Cuenta Confirmada',
        mensaje: 'La cuenta se confirmo Correctamente'
    })

}

const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/DamarisSpa?logout=1');
  });
};

// --- CORRECCIÓN: Un único bloque de exportación al final ---
export {
    formularioLogin,
    autenticar,
    formularioRegistro,
    registrar,
    confirmar,
    logout
}