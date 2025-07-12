// controllers/adminController.js

import { Usuario, Rol } from '../models/index.js';
import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';

// Muestra el panel principal con la lista de usuarios
const paginaAdmin = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            include: {
                model: Rol,
                attributes: ['nombre']
            },
            order: [['id', 'ASC']]
        });

        res.render('admin/usuarios', {
            pagina: 'Panel de Administración de Usuarios',
            barra: true,
            piePagina: true,
            usuarios,
            csrfToken: req.csrfToken()
        });

    } catch (error) {
        console.error("Error al cargar el panel de administración:", error);
        return res.status(500).send('Ocurrió un error al cargar el panel.');
    }
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
        usuario: {}, // Objeto vacío para el formulario
        action: '/admin/usuarios/crear'
    });
};

// Procesa el formulario para crear (registrar) un nuevo usuario
const registrarUsuarioAdmin = async (req, res) => {
    const roles = await Rol.findAll();

    // Validar con express-validator
    let resultado = validationResult(req);
    if (!resultado.isEmpty()) {
        return res.render('admin/crear-usuario', {
            pagina: 'Crear Nuevo Usuario',
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            roles,
            errores: resultado.array(),
            usuario: { // Devolvemos los datos que el usuario ya escribió
                nombre: req.body.nombre,
                username: req.body.username
            }
        });
    }

    const { nombre, username, password, rolId } = req.body;

    // ----- CORRECCIÓN CLAVE AQUÍ -----
    // Verificar que el usuario no esté duplicado (versión corregida para CREAR)
    const existeUsuario = await Usuario.findOne({ where: { username } });

    if (existeUsuario) {
        return res.render('admin/crear-usuario', {
            pagina: 'Crear Nuevo Usuario',
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            roles,
            errores: [{ msg: 'El nombre de usuario ya está registrado' }],
            usuario: { nombre, username }
        });
    }

    try {
        // Hashear la contraseña antes de guardarla
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Crear el usuario
        await Usuario.create({
            nombre,
            username,
            password: hashedPassword, // Guardamos la contraseña hasheada
            rolId
        });

        // ----- CORRECCIÓN DE REDIRECCIÓN -----
        // Redirigimos con el parámetro correcto para que lo detecte 'usuario.js'
        res.redirect('/admin/usuarios?guardado=true');

    } catch (error) {
        console.log("Error al crear el usuario:", error);
        // Opcional: manejar el error en la vista
        res.status(500).send('Hubo un error al guardar el usuario');
    }
};

// Muestra el formulario para editar un usuario existente
const formularioEditarUsuario = async (req, res) => {
    const { id } = req.params;
    const [usuario, roles] = await Promise.all([
        Usuario.findByPk(id),
        Rol.findAll()
    ]);

    if (!usuario) {
        return res.redirect('/admin/usuarios');
    }

    res.render('admin/crear-usuario', { // Reutilizamos la misma vista
        pagina: `Editar Usuario: ${usuario.nombre}`,
        barra: true,
        piePagina: true,
        csrfToken: req.csrfToken(),
        roles,
        usuario, // Le pasamos los datos del usuario para rellenar el formulario
        action: `/admin/usuarios/editar/${usuario.id}`
    });
};

// Guarda los cambios hechos en un usuario
const guardarCambiosUsuario = async (req, res) => {
    const { id } = req.params;
    const { nombre, username, rolId, password } = req.body;

    // Busca al usuario que se está editando
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
        return res.redirect('/admin/usuarios');
    }
    
    // Validar con express-validator (puedes añadir las reglas en tus rutas)
    // ...

    // Verificamos que el nuevo username no esté ya en uso por OTRO usuario
    const existeUsuario = await Usuario.findOne({ where: { username, id: { [Op.ne]: id } } });
    if (existeUsuario) {
         const roles = await Rol.findAll();
         return res.render('admin/crear-usuario', {
            pagina: `Editar Usuario: ${usuario.nombre}`,
            barra: true,
            csrfToken: req.csrfToken(),
            roles,
            errores: [{ msg: 'El nombre de usuario ya pertenece a otro usuario' }],
            usuario: {id: req.params.id, nombre, username, rolId}, // Pasamos los datos que el usuario intentó guardar
            action: `/admin/usuarios/editar/${usuario.id}`
        });
    }

    // Actualizamos los datos del objeto en memoria
    usuario.nombre = nombre;
    usuario.username = username;
    usuario.rolId = rolId;

    // Solo actualizamos la contraseña si el usuario escribió una nueva
    if (password && password.trim() !== '') {
        const salt = await bcrypt.genSalt(10);
        usuario.password = await bcrypt.hash(password, salt);
    }

    try {
        await usuario.save(); // Guardamos los cambios en la BD

        // ----- CORRECCIÓN DE REDIRECCIÓN -----
        res.redirect('/admin/usuarios?actualizado=true');

    } catch (error) {
        console.log("Error al actualizar usuario:", error);
    }
};

// Elimina un usuario de la base de datos
const eliminarUsuario = async (req, res) => {
    const { id } = req.params;

    // Evitar que un admin se borre a sí mismo (req.usuario viene de tu middleware de auth)
    if(req.usuario && req.usuario.id.toString() === id) {
        // En lugar de un parámetro de error, es mejor usar connect-flash o una técnica similar
        // Pero por ahora, una redirección simple funciona.
        return res.redirect('/admin/usuarios');
    }

    const usuario = await Usuario.findByPk(id);
    if (usuario) {
        await usuario.destroy();
        
        // ----- CORRECCIÓN DE REDIRECCIÓN -----
        return res.redirect('/admin/usuarios?eliminado=true');
    } else {
        return res.redirect('/admin/usuarios');
    }
};

export {
    paginaAdmin,
    formularioCrearUsuario,
    registrarUsuarioAdmin,
    formularioEditarUsuario,
    guardarCambiosUsuario,
    eliminarUsuario
}