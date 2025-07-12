import { check, validationResult } from 'express-validator';
import { Op } from 'sequelize'; // Asegúrate de importar Op de sequelize
import { Proveedor } from '../models/index.js';


// Mostrar listado de Proveedores
const leer = async (req, res) => {
  const elementosPorPagina = 6;
  const paginaActual = Number(req.query.page) || 1;
  const offset = (paginaActual - 1) * elementosPorPagina;

  try {
    // Obtener total y registros paginados
    const { count, rows } = await Proveedor.findAndCountAll({
      limit: elementosPorPagina,
      offset,
      order: [['razon_social', 'ASC']], // Ordenar por razón social
    });

    // Total de páginas
    const totalPaginas = Math.ceil(count / elementosPorPagina);

    res.render('proveedor/leer', { // Asegúrate de que esta vista exista
      pagina: 'Listado de Proveedores Damaris Spa',
      barra: true,
      piePagina: true,
      proveedores: rows, // Pasa los proveedores obtenidos
      csrfToken: req.csrfToken(),
      query: req.query,
      paginaActual,
      totalPaginas
    });
  } catch (error) {
    console.error('Error al leer proveedores:', error);
    res.render('error', { pagina: 'Error', mensaje: 'Hubo un error al cargar los proveedores.' });
  }
};

const formularioCrear = async (req, res) => {
  res.render('proveedor/crear', { // Asegúrate de que esta vista exista
    pagina: 'Crear Proveedor de Damaris Spa',
    csrfToken: req.csrfToken(),
    proveedor: {}, // Objeto vacío para rellenar el formulario
    barra: true
  });
};

// Guardar datos de un nuevo Proveedor
const crear = async (req, res) => {
  // Validaciones para Proveedor adaptadas a Colombia
  await check('tipo_documento')
    .notEmpty().withMessage('El tipo de documento es obligatorio')
    .isIn(['NIT', 'CC', 'CE', 'PASAPORTE', 'TI']) // Añadimos TI (Tarjeta de Identidad) si es necesario para proveedores (usualmente CC, NIT, CE)
    .withMessage('Tipo de documento no válido para Colombia.')
    .run(req);

  await check('numero_documento').notEmpty().withMessage('El número de documento es obligatorio').run(req);
  await check('razon_social').notEmpty().withMessage('La razón social es obligatoria').run(req);
  await check('email').isEmail().withMessage('Debe ser un email válido').optional({ checkFalsy: true }).run(req);
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

  if (!resultado.isEmpty()) {
    return res.render('proveedor/crear', {
      pagina: 'Crear Proveedor',
      barra: true,
      piePagina: true,
      csrfToken: req.csrfToken(),
      errores: resultado.array(),
      proveedor: req.body // Asegúrate de que los datos introducidos se mantengan
    });
  }

  const { tipo_documento, numero_documento, razon_social, email, prefijo_telefono, telefono } = req.body;

  const telefono_completo = `${prefijo_telefono}${telefono}`;

  try {
    const existeProveedor = await Proveedor.findOne({
      where: {
        [Op.or]: [
          { numero_documento: numero_documento },
          { razon_social: razon_social }
        ]
      }
    });

    if (existeProveedor) {
      return res.render('proveedor/crear', {
        pagina: 'Crear Proveedor',
        csrfToken: req.csrfToken(),
        barra: true,
        piePagina: true,
        errores: [{ msg: 'El número de documento o la razón social ya está registrada.' }],
        proveedor: req.body
      });
    }

    await Proveedor.create({
      tipo_documento,
      numero_documento,
      razon_social,
      email,
      telefono: telefono_completo,
      activo: true
    });
    return res.redirect('/proveedor/leer?guardado=1');
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    // Puedes añadir un manejo más específico para errores de base de datos
    return res.redirect('/proveedor/leer?error=1');
  }
};

// Mostrar Formulario de Edición de Proveedor
const editar = async (req, res) => {
  const { id } = req.params;

  const proveedor = await Proveedor.findByPk(id);

  if (!proveedor) {
    return res.redirect('/proveedor/leer');
  }

  // Separar prefijo y teléfono para mostrar en el formulario
  const telefonoCompleto = proveedor.telefono || '';
  const prefijo_telefono = telefonoCompleto.slice(0, 3);
  const telefono = telefonoCompleto.slice(3);

  res.render('proveedor/editar', { // Asegúrate de que esta vista exista
    pagina: `Editar Proveedor: ${proveedor.razon_social}`,
    csrfToken: req.csrfToken(),
    proveedor: {
      id: proveedor.id,
      tipo_documento: proveedor.tipo_documento,
      numero_documento: proveedor.numero_documento,
      razon_social: proveedor.razon_social,
      email: proveedor.email,
      prefijo_telefono,
      telefono,
      activo: proveedor.activo
    },
    barra: true,
    piePagina: true
  });
};

// Procesar Edición
const actualizar = async (req, res) => {
  const { id } = req.params;

  // Validaciones para Proveedor adaptadas a Colombia
  await check('tipo_documento')
    .notEmpty().withMessage('El tipo de documento es obligatorio')
    .isIn(['NIT', 'CC', 'CE', 'PASAPORTE', 'TI'])
    .withMessage('Tipo de documento no válido para Colombia.')
    .run(req);

  await check('numero_documento').notEmpty().withMessage('El número de documento es obligatorio').run(req);
  await check('razon_social').notEmpty().withMessage('La razón social es obligatoria').run(req);
  await check('email').isEmail().withMessage('Debe ser un email válido').optional({ checkFalsy: true }).run(req);

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

  const { tipo_documento, numero_documento, razon_social, email, prefijo_telefono, telefono, activo } = req.body;

  if (!resultado.isEmpty()) {
    return res.render('proveedor/editar', {
      pagina: 'Editar Proveedor',
      csrfToken: req.csrfToken(),
      barra: true,
      piePagina: true,
      errores: resultado.array(),
      proveedor: {
        id,
        tipo_documento,
        numero_documento,
        razon_social,
        email,
        prefijo_telefono,
        telefono,
        activo: activo === 'on'
      }
    });
  }

  const telefono_completo = `${prefijo_telefono}${telefono}`;

  try {
    const proveedor = await Proveedor.findByPk(id);

    if (!proveedor) {
      return res.redirect('/proveedor/leer');
    }

    const existeOtroProveedor = await Proveedor.findOne({
      where: {
        [Op.or]: [
          { numero_documento: numero_documento },
          { razon_social: razon_social }
        ],
        id: { [Op.ne]: id }
      }
    });

    if (existeOtroProveedor) {
      return res.render('proveedor/editar', {
        pagina: 'Editar Proveedor',
        csrfToken: req.csrfToken(),
        barra: true,
        piePagina: true,
        errores: [{ msg: 'El número de documento o la razón social ya está registrada por otro proveedor.' }],
        proveedor: {
          id,
          tipo_documento,
          numero_documento,
          razon_social,
          email,
          prefijo_telefono,
          telefono,
          activo: activo === 'on'
        }
      });
    }

    proveedor.tipo_documento = tipo_documento;
    proveedor.numero_documento = numero_documento;
    proveedor.razon_social = razon_social;
    proveedor.email = email;
    proveedor.telefono = telefono_completo;
    proveedor.activo = activo === 'on';

    await proveedor.save();

    return res.redirect('/proveedor/leer?actualizado=1');
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    return res.render('proveedores/editar', {
      pagina: 'Editar Proveedor',
      csrfToken: req.csrfToken(),
      barra: true,
      piePagina: true,
      errores: [{ msg: 'Hubo un error al actualizar los datos' }],
      proveedor: {
        id,
        tipo_documento,
        numero_documento,
        razon_social,
        email,
        prefijo_telefono,
        telefono,
        activo: activo === 'on'
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
    const proveedor = await Proveedor.findByPk(id);

    if (!proveedor) {
      return res.status(404).send('Registro de proveedor no encontrado');
    }

    // Antes de eliminar, considera si hay gastos_adicionales asociados a este proveedor.
    // Si hay una relación de clave foránea configurada con ON DELETE RESTRICT o NO ACTION,
    // la base de datos podría impedir la eliminación.
    // Si quieres permitir la eliminación, la relación en tu modelo Proveedor (o GastoAdicional)
    // debe tener ON DELETE SET NULL o CASCADE.

    await proveedor.destroy();

    return res.redirect('/proveedor/leer?eliminado=1');
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    // Puedes verificar si el error es por una restricción de clave foránea
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).send('No se puede eliminar el proveedor porque tiene gastos adicionales asociados.');
    }
    return res.status(500).send('Error al eliminar el proveedor.');
  }
};

export {
  leer,
  formularioCrear,
  crear,
  editar,
  actualizar,
  eliminar
};