import { validationResult } from 'express-validator';
import db from '../config/db.js';
import { Banco, Auditoria } from '../models/index.js';

// Muestra la lista de bancos
const listarBancos = async (req, res) => {
    const bancos = await Banco.findAll({
        order: [['nombre', 'ASC']]
    });
    res.render('bancos/leer', {
        pagina: 'Gestión de Bancos',
        barra: true,
        piePagina: true,
        csrfToken: req.csrfToken(),
        bancos
    });
};

// Muestra el formulario para crear un nuevo banco
const formularioCrear = (req, res) => {
    res.render('bancos/crear', {
        pagina: 'Registrar Nuevo Banco',
        barra: true,
        piePagina: true,
        csrfToken: req.csrfToken(),
        datos: {}
    });
};

// Guarda un nuevo banco
const guardarBanco = async (req, res) => {
    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
        return res.render('bancos/crear', {
            pagina: 'Registrar Nuevo Banco',
            barra: true, piePagina: true, csrfToken: req.csrfToken(),
            errores: resultado.array(),
            datos: req.body
        });
    }

    const { nombre } = req.body;
    const { id: usuarioId, nombre: nombreUsuario } = req.usuario;

    const t = await db.transaction();
    try {
        const existeBanco = await Banco.findOne({ where: { nombre }, transaction: t });
        if (existeBanco) {
            throw new Error('El banco ya está registrado.');
        }

        const nuevoBanco = await Banco.create({ nombre }, { transaction: t });

        await Auditoria.create({
            accion: 'CREAR',
            tabla_afectada: 'bancos',
            registro_id: nuevoBanco.id,
            descripcion: `El usuario ${nombreUsuario} creó el banco: ${nombre}.`,
            usuarioId
        }, { transaction: t });

        await t.commit();
        res.redirect('/bancos/leer?mensaje=Banco registrado correctamente');
    } catch (error) {
        await t.rollback();
        res.render('bancos/crear', {
            pagina: 'Registrar Nuevo Banco',
            barra: true, piePagina: true, csrfToken: req.csrfToken(),
            errores: [{ msg: error.message }],
            datos: req.body
        });
    }
};

// Muestra el formulario para editar un banco
const formularioEditar = async (req, res) => {
    const { id } = req.params;
    const banco = await Banco.findByPk(id);
    if (!banco) {
        return res.redirect('/bancos/leer');
    }
    res.render('bancos/editar', {
        pagina: `Editar Banco: ${banco.nombre}`,
        barra: true, piePagina: true, csrfToken: req.csrfToken(),
        banco
    });
};

// Guarda los cambios de un banco editado
const guardarEdicion = async (req, res) => {
    const { id } = req.params;
    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
        const banco = { id, ...req.body };
        return res.render('bancos/editar', {
            pagina: `Editar Banco`,
            barra: true, piePagina: true, csrfToken: req.csrfToken(),
            errores: resultado.array(),
            banco
        });
    }

    const { nombre } = req.body;
    const { id: usuarioId, nombre: nombreUsuario } = req.usuario;

    const t = await db.transaction();
    try {
        const banco = await Banco.findByPk(id, { transaction: t });
        if (!banco) throw new Error('Banco no encontrado.');

        await Auditoria.create({
            accion: 'MODIFICAR',
            tabla_afectada: 'bancos',
            registro_id: id,
            descripcion: `El usuario ${nombreUsuario} actualizó el banco: ${banco.nombre}.`,
            usuarioId
        }, { transaction: t });

        banco.nombre = nombre;
        await banco.save({ transaction: t });

        await t.commit();
        res.redirect('/bancos/leer?mensaje=Banco actualizado correctamente');
    } catch (error) {
        await t.rollback();
        res.render('bancos/crear', {
            pagina: 'Registrar Nuevo Banco',
            barra: true, piePagina: true, csrfToken: req.csrfToken(),
            errores: [{ msg: error.message }],
            datos: req.body
        });
    }
};

// Elimina un banco
const eliminarBanco = async (req, res) => {
    const { id } = req.params;
    const { id: usuarioId, nombre: nombreUsuario } = req.usuario;

    const t = await db.transaction();
    try {
        const banco = await Banco.findByPk(id, { transaction: t });
        if (!banco) throw new Error('Banco no encontrado.');

        await Auditoria.create({
            accion: 'ELIMINAR',
            tabla_afectada: 'bancos',
            registro_id: id,
            descripcion: `El usuario ${nombreUsuario} eliminó el banco: ${banco.nombre}.`,
            usuarioId
        }, { transaction: t });

        await banco.destroy({ transaction: t });

        await t.commit();
        res.redirect('/bancos/leer?mensaje=Banco eliminado correctamente');
    } catch (error) {
        await t.rollback();
        res.redirect(`/bancos/leer?error=${encodeURIComponent(error.message)}`);
    }
};

export {
    listarBancos,
    formularioCrear,
    guardarBanco,
    formularioEditar,
    guardarEdicion,
    eliminarBanco
};