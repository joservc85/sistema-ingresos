import { validationResult } from 'express-validator';
import { Usuario, Rol } from '../models/index.js';
import { generarJWT } from '../helpers/token.js';

// --- FUNCIONES DE AUTENTICACIÓN ---

const formularioLogin = (req, res) => {
    res.render('auth/login', {
        pagina: 'Iniciar Sesión',
        csrfToken: req.csrfToken(),
        query: req.query
    });
};

const autenticar = async (req, res) => {
    const { username, password } = req.body;
    const usuario = await Usuario.findOne({ where: { username } });

    if (!usuario || !usuario.verificarPassword(password)) {
        return res.render('auth/login', {
            pagina: 'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: [{ msg: 'Usuario o Contraseña Incorrectos' }],
            query: {}
        });
    }

    const token = generarJWT({ id: usuario.id, nombre: usuario.nombre });
    return res.cookie('_token', token, { httpOnly: true }).redirect('/dashboard');
};

// Cerrar Sesion
const logout = (req, res) => {
    // req.session.destroy() destruye la sesión en el servidor.
    req.session.destroy(() => {
        // res.clearCookie() borra las cookies del navegador y luego redirige.
        res.clearCookie('_token')
           .clearCookie('_csrf') // Se borra la cookie del token CSRF
           .status(200)
           .redirect('/DamarisSpa?logout=1');
    });
};
// --- FUNCIONES DE GESTIÓN DE USUARIOS (PANEL DE ADMIN) ---

// Muestra la lista de usuarios
const listarUsuarios = async (req, res) => {
    const usuarios = await Usuario.findAll({
        include: { model: Rol, as: 'role' },
        order: [['id', 'ASC']]
    });

    res.render('admin/usuarios', {
        pagina: 'Panel de Administración de Usuarios',
        barra: true,
        piePagina: true,
        usuarios,
        csrfToken: req.csrfToken()
    });
};

// Muestra el formulario para crear un nuevo usuario
const formularioCrearUsuario = async (req, res) => {
    const roles = await Rol.findAll();
    res.render('admin/crear-usuario', {
        pagina: 'Crear Nuevo Usuario',
        barra: true,
        piePagina: true,
        csrfToken: req.csrfToken(),
        roles,
        datos: {}
    });
};

// Procesa el formulario para crear un nuevo usuario
const registrarUsuario = async (req, res) => {
    const roles = await Rol.findAll();
    const resultado = validationResult(req);

    if (!resultado.isEmpty()) {
        return res.render('admin/crear-usuario', {
            pagina: 'Crear Nuevo Usuario',
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            roles,
            errores: resultado.array(),
            datos: req.body
        });
    }

    const { nombre, username, password, rolId } = req.body;
    const existeUsuario = await Usuario.findOne({ where: { username } });

    if (existeUsuario) {
        return res.render('admin/crear-usuario', {
            // ... (código de error para usuario duplicado)
        });
    }

    try {
        await Usuario.create({ nombre, username, password, rolId });
        res.redirect('/admin/usuarios?mensaje=Usuario Creado Correctamente');
    } catch (error) {
        console.log("Error al crear el usuario:", error);
    }
};

// Muestra el formulario para editar un usuario
const formularioEditarUsuario = async (req, res) => {
    const { id } = req.params;
    const [usuario, roles] = await Promise.all([
        Usuario.findByPk(id),
        Rol.findAll()
    ]);

    if (!usuario) {
        return res.redirect('/admin/usuarios');
    }

    res.render('admin/editar', {
        pagina: `Editar Usuario: ${usuario.nombre}`,
        barra: true,
        piePagina: true,
        csrfToken: req.csrfToken(),
        roles,
        datosUsuario: usuario
    });
};

// Guarda los cambios de un usuario editado
const guardarCambiosUsuario = async (req, res) => {
    const { id } = req.params;
    const resultado = validationResult(req);

    if (!resultado.isEmpty()) {
        const roles = await Rol.findAll();
        return res.render('admin/editar', {
            pagina: `Editar Usuario`,
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            errores: resultado.array(),
            datosUsuario: { id, ...req.body },
            roles
        });
    }

    try {
        const { nombre, username, rolId, password } = req.body;
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            return res.redirect('/admin/usuarios');
        }

        usuario.nombre = nombre;
        usuario.username = username;
        usuario.rolId = rolId;

        if (password) {
            usuario.password = password;
        }

        await usuario.save();
        res.redirect('/admin/usuarios?mensaje=Usuario actualizado correctamente');
    } catch (error) {
        console.error('Error al guardar los cambios del usuario:', error);
    }
};

// Elimina un usuario
const eliminarUsuario = async (req, res) => {
    const { id } = req.params;
    if(req.usuario && req.usuario.id.toString() === id) {
        return res.redirect('/admin/usuarios');
    }

    const usuario = await Usuario.findByPk(id);
    if (usuario) {
        await usuario.destroy();
        return res.redirect('/admin/usuarios?mensaje=Usuario Eliminado Correctamente');
    } else {
        return res.redirect('/admin/usuarios');
    }
};

export {
    formularioLogin,
    autenticar,
    logout,
    listarUsuarios,
    formularioCrearUsuario,
    registrarUsuario,
    formularioEditarUsuario,
    guardarCambiosUsuario,
    eliminarUsuario
}