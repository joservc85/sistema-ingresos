import { check, validationResult } from 'express-validator'
import { Personal, Auditoria } from '../models/index.js'
import { Op } from 'sequelize'
import db from '../config/db.js';


// Mostrar listado del personal
const leer = async (req, res) => {

  const elementosPorPagina = 8;
  const paginaActual = Number(req.query.page) || 1;
  const offset = (paginaActual - 1) * elementosPorPagina;

  // Obtener total y registros paginados
  const { count, rows } = await Personal.findAndCountAll({
    limit: elementosPorPagina,
    offset,
    order: [['nombre', 'ASC']],
  });

  // Total de páginas
  const totalPaginas = Math.ceil(count / elementosPorPagina);

  //const personals = await Personal.findAll();

  res.render('personal/leer', {
    pagina: 'Listado del Personal Damaris Spa',
    barra: true,
    piePagina: true,
    personals: rows,
    csrfToken: req.csrfToken(),
    query: req.query,
    paginaActual,
    totalPaginas
  });
}

// Mostrar Formulario
const formularioCrear = async (req, res) => {
  res.render('personal/crear', {
    pagina: 'Crear Personal  de Damaris Spa',
    csrfToken: req.csrfToken(),
    personal: {},
    barra: true,
    piePagina: true
  });
}

// Guardar datos enviados
const crear = async (req, res) => {
  await check('nombre').notEmpty().withMessage('El nombre es obligatorio').run(req)
  await check('apellidos').notEmpty().withMessage('Los apellidos son obligatorios').run(req)
  await check('email').isEmail().withMessage('Debe ser un email válido').run(req)
  await check('telefono').notEmpty().withMessage('El número de teléfono es obligatorio').isNumeric().withMessage('El número de teléfono solo debe contener dígitos')
    .isLength({ min: 7, max: 7 }) // Asegura que tenga exactamente 7 dígitos
    .withMessage('El número de teléfono debe tener 7 dígitos')
    .run(req);
  // Validaciones para el prefijo del teléfono
  await check('prefijo_telefono')
    .notEmpty().withMessage('El prefijo del teléfono es obligatorio')
    .isIn(['300', '301', '302', '304', '305', '310', '311', '312', '313', '314', '315', '316', '317', '318', '319', '320', '321', '322', '323', '324', '350', '351'])
    .withMessage('El prefijo de teléfono no es válido')
    .run(req);

  const resultado = validationResult(req)

  if (!resultado.isEmpty()) {
    return res.render('personal/crear', {
      pagina: 'Crear Personal',
      barra: true,
      piePagina: true,
      csrfToken: req.csrfToken(),
      errores: resultado.array(),
      personal: {
        nombre: req.body.nombre,
        apellidos: req.body.apellidos,
        email: req.body.email,
        prefijo_telefono: req.body.prefijo_telefono,
        telefono: req.body.telefono
      }
    })
  }

  const { nombre, apellidos, email, prefijo_telefono, telefono } = req.body
  const telefono_completo = `${prefijo_telefono}${telefono}`;
  const existe = await Personal.findOne({ where: { email } })
  const { id: usuarioId, nombre: nombreUsuario } = req.usuario;

  if (existe) {
    return res.render('personal/crear', {
      pagina: 'Crear Personal',
      csrfToken: req.csrfToken(),
      barra: true,
      piePagina: true,
      errores: [{ msg: 'Este email ya está registrado' }],
      personal: {
        nombre: req.body.nombre,
        apellidos: req.body.apellidos,
        email: req.body.email,
        prefijo_telefono: req.body.prefijo_telefono,
        telefono: req.body.telefono
      }
    })
  }

  const t = await db.transaction();
  try {
    const nuevoPersonal = await Personal.create({
      nombre, apellidos, email, telefono: telefono_completo
    }, { transaction: t });

    await Auditoria.create({
      accion: 'CREAR',
      tabla_afectada: 'clientes',
      registro_id: nuevoPersonal.id,
      descripcion: `El usuario ${nombreUsuario} creó al personal: ${nombre} ${apellidos}.`,
      usuarioId
    }, { transaction: t });
    await t.commit();

    return res.redirect('/personal/leer?guardado=Personal Creado Correctamente');

  } catch (error) {
    console.log(error);
    return res.render('personal/crear', {
      pagina: 'Crear Personal',
      csrfToken: req.csrfToken(),
      barra: true,
      piePagina: true,
      errores: [{ msg: 'Hubo un error al registrar el Personal. Intente de nuevo.' }],
      personal: req.body
    });
  }
}

// Mostrar Formulario de Edición
const editar = async (req, res) => {
  const { id } = req.params;

  // Buscar el personal por ID
  const personal = await Personal.findByPk(id);

  if (!personal) {
    return res.redirect('/personal/leer');
  }

  // Separar prefijo y teléfono para mostrar en el formulario
  const telefonoCompleto = personal.telefono || '';
  const prefijo_telefono = telefonoCompleto.slice(0, 3);
  const telefono = telefonoCompleto.slice(3);

  res.render('personal/editar', {
    pagina: `Editar Personal de Damaris Spa: ${personal.nombre} ${personal.apellidos}`,
    csrfToken: req.csrfToken(),
    personal: {
      id: personal.id,
      nombre: personal.nombre,
      apellidos: personal.apellidos,
      email: personal.email,
      prefijo_telefono,
      telefono,
      activo: personal.activo
    },
    barra: true,
    piePagina: true
  });
};

// Procesar Edición
const actualizar = async (req, res) => {
  const { id } = req.params;

  const {
    nombre,
    apellidos,
    email,
    prefijo_telefono,
    telefono,
    activo
  } = req.body;

  const { id: usuarioId, nombre: nombreUsuario } = req.usuario;

  // Validaciones
  await check('nombre').notEmpty().withMessage('El nombre es obligatorio').run(req);
  await check('apellidos').notEmpty().withMessage('Los apellidos son obligatorios').run(req);
  await check('email').isEmail().withMessage('Debe ser un email válido').run(req);

  await check('telefono')
    .notEmpty().withMessage('El número de teléfono es obligatorio')
    .isNumeric().withMessage('Solo se permiten dígitos')
    .isLength({ min: 7, max: 7 }).withMessage('El número debe tener 7 dígitos')
    .run(req);

  await check('prefijo_telefono')
    .notEmpty().withMessage('El prefijo del teléfono es obligatorio')
    .isIn(['300', '301', '302', '304', '305', '310', '311', '312', '313', '314', '315', '316', '317', '318', '319', '320', '321', '322', '323', '324', '350', '351'])
    .withMessage('El prefijo no es válido')
    .run(req);

  const resultado = validationResult(req);

  // Manejar errores de validación
  if (!resultado.isEmpty()) {
    // Si hay errores de validación, se renderiza la misma página de edición
    return res.render('personal/editar', {
      pagina: 'Editar Personal',
      csrfToken: req.csrfToken(),
      barra: true,
      piePagina: true,
      errores: resultado.array(),
      personal: {
        id,
        nombre,
        apellidos,
        email,
        prefijo_telefono,
        telefono,
        activo: activo === 'on' || activo === true
      }
    });
  }

  const telefono_completo = `${prefijo_telefono}${telefono}`;
  const estaActivo = (activo === 'on' || activo === true);

  const t = await db.transaction();
  try {
    const personal = await Personal.findByPk(id, { transaction: t });
    if (!personal) {
      throw new Error('Personal no encontrado.');
    }

    const existeOtroPersonalConMismoEmail = await Personal.findOne({
      where: { email: email, id: { [Op.ne]: id } },
      transaction: t
    });

    if (existeOtroPersonalConMismoEmail) {
      return res.render('personal/editar', {
        pagina: 'Editar Personal',
        csrfToken: req.csrfToken(),
        barra: true,
        piePagina: true,
        errores: [{ msg: 'El email ya está registrado por otro personal.' }],
        personal: {
          id,
          nombre,
          apellidos,
          email,
          prefijo_telefono,
          telefono,
          activo: estaActivo
        }
      });
    }

    // --- ¡REGISTRO DE AUDITORÍA AÑADIDO! ---
    await Auditoria.create({
      accion: 'MODIFICAR',
      tabla_afectada: 'personals',
      registro_id: id,
      descripcion: `El usuario ${nombreUsuario} actualizó los datos del personal: ${personal.nombre} ${personal.apellidos}.`,
      usuarioId
    }, { transaction: t });

    // Actualizar los campos del modelo de Personal
    personal.nombre = nombre;
    personal.apellidos = apellidos;
    personal.email = email;
    personal.telefono = telefono_completo;
    personal.activo = estaActivo;

    await personal.save({ transaction: t });

    await t.commit();
    return res.redirect('/personal/leer?mensaje=Personal actualizado correctamente');

  } catch (error) {
    console.error('Error al actualizar personal:', error);

    return res.render('personal/editar', {
      pagina: 'Editar Personal',
      csrfToken: req.csrfToken(),
      barra: true,
      piePagina: true,
      errores: [{ msg: 'Hubo un error al actualizar los datos. Intenta de nuevo.' }],
      personal: {
        id,
        nombre,
        apellidos,
        email,
        prefijo_telefono,
        telefono,
        activo: estaActivo
      }
    });
  }
};

const eliminar = async (req, res) => {
  const { id } = req.params;
  const { id: usuarioId, nombre: nombreUsuario } = req.usuario;

  if (req.usuario.role.nombre !== 'Admin') {
    return res.status(403).send('No tienes permiso para eliminar este vale');
  }

  const t = await db.transaction();
  try {
    const personal = await Personal.findByPk(id, { transaction: t });
    if (!personal) {
      throw new Error('Personal no encontrado.');
    }

    // --- ¡REGISTRO DE AUDITORÍA AÑADIDO! ---
    await Auditoria.create({
      accion: 'ELIMINAR',
      tabla_afectada: 'personals',
      registro_id: id,
      descripcion: `El usuario ${nombreUsuario} eliminó al miembro del personal: ${personal.nombre} ${personal.apellidos}.`,
      usuarioId
    }, { transaction: t });

    await personal.destroy({ transaction: t });

    await t.commit();
    return res.redirect('/personal/leer?mensaje=Personal eliminado correctamente.');

  } catch (error) {
    console.error(error);
    return res.status(500).send('Error al eliminar');
  }
};

export {
  leer,
  formularioCrear,
  crear,
  editar,
  actualizar,
  eliminar
}
