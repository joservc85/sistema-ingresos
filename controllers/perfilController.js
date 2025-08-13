import { validationResult } from 'express-validator';
import { Usuario } from '../models/index.js';

// Muestra el formulario para que el usuario cambie su contraseña
const formularioPerfil = (req, res) => {
    res.render('perfil/index', {
        pagina: 'Mi Perfil',
        barra: true,
        piePagina: true,
        csrfToken: req.csrfToken(),
        usuario: req.usuario // El usuario logueado
    });
};

// Procesa el cambio de contraseña
const cambiarPassword = async (req, res) => {
    // Validar con express-validator (se define en las rutas)
    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
        return res.render('perfil/index', {
            pagina: 'Mi Perfil',
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            usuario: req.usuario,
            errores: resultado.array()
        });
    }

    const { id } = req.usuario;
    const { password_actual, password_nuevo } = req.body;

    try {
        const usuario = await Usuario.findByPk(id);

        // 1. Verificar que la contraseña actual sea correcta
        if (!usuario.verificarPassword(password_actual)) {
            return res.render('perfil/index', {
                pagina: 'Mi Perfil',
                barra: true,
                piePagina: true,
                csrfToken: req.csrfToken(),
                usuario: req.usuario,
                errores: [{ msg: 'La contraseña actual es incorrecta.' }]
            });
        }

        // 2. Si es correcta, asignar la nueva contraseña
        usuario.password = password_nuevo; // El hook 'beforeUpdate' del modelo se encargará de hashearla

        // 3. Guardar los cambios
        await usuario.save();

        // 4. Redirigir con mensaje de éxito
        res.redirect('/dashboard?mensaje=Contraseña actualizada correctamente.');

    } catch (error) {
        console.error('Error al cambiar la contraseña:', error);
        return res.render('perfil/index', {
            pagina: 'Mi Perfil',
            barra: true,
            piePagina: true,
            csrfToken: req.csrfToken(),
            usuario: req.usuario,
            errores: [{ msg: 'No se pudo actualizar la contraseña. Inténtalo de nuevo.' }]
        });
    }
};

export {
    formularioPerfil,
    cambiarPassword
};