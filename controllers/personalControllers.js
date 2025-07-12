import { check, validationResult } from 'express-validator'
import Personal from '../models/Personal.js'
import { Op } from 'sequelize' // asegúrate de importar tu modelo


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

  try {
    await Personal.create({ nombre, apellidos, email, telefono: telefono_completo })
    return res.redirect('/personal/leer?guardado=1');
  } catch (error) {
    console.log(error);
    return res.redirect('/personal/leer?error=1');
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

  try {
    const personal = await Personal.findByPk(id);

    if (!personal) {
      // Si el personal no se encuentra, redirige.
      // Aquí podrías usar un query param para error si lo tienes configurado en leer.pug
      return res.redirect('/personal/leer'); // O '/personal/leer?error=personal_no_encontrado'
    }

    const existeOtroPersonalConMismoEmail = await Personal.findOne({
      where: {
        email: email,
        id: { [Op.ne]: id }
      }
    });

    if (existeOtroPersonalConMismoEmail) {
      // Si el email ya está en uso por otro personal, renderiza con error
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

    // Actualizar los campos del modelo de Personal
    personal.nombre = nombre;
    personal.apellidos = apellidos;
    personal.email = email;
    personal.telefono = telefono_completo;
    personal.activo = estaActivo;

    // Guardar los cambios en la base de datos
    await personal.save();

    // *** Redirigir con el query parameter 'actualizado=1' para el SweetAlert ***
    return res.redirect('/personal/leer?actualizado=1');

  } catch (error) {
    console.error('Error al actualizar personal:', error);
    // En caso de un error interno del servidor al actualizar, puedes redirigir con un error genérico
    // O puedes renderizar la página de edición nuevamente con un mensaje de error genérico
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

  if (req.usuario.role.nombre !== 'Admin') {
      return res.status(403).send('No tienes permiso para eliminar este vale');
    }

  try {
    const persona = await Personal.findByPk(id);

    if (!persona) {
      return res.status(404).send('Registro no encontrado');
    }

    await persona.destroy();

    return res.redirect('/personal/leer?eliminado=1');
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
