import { validationResult } from 'express-validator';
import { Actividad, DetalleActividad, Personal, Cliente, Procedimiento, Precio, Articulo } from '../models/index.js'
import db from '../config/db.js';
import { Op } from 'sequelize';


const admin = async (req, res) => {
  const elementosPorPagina = 4;
  const paginaActual = Number(req.query.page) || 1;
  const offset = (paginaActual - 1) * elementosPorPagina;
  const buscar = req.query.buscar?.toLowerCase() || '';
  const personalId = req.query.personalId || '';
  const clienteId = req.query.clienteId || '';
  const procedimientoId = req.query.procedimientoId || '';
  const fechaInicio = req.query.fechaInicio || '';
  const fechaFin = req.query.fechaFin || '';

  // Obtener todas las actividades con relaciones
  const actividades = await Actividad.findAll({
    include: [Cliente, Personal, Procedimiento, Precio,
      {
        model: DetalleActividad,
        as: 'detalle_actividads',
        include: [{
          model: Articulo
        }]
      }
    ],
    order: [['createdAt', 'DESC']],
  });

  const fichas = {};

  actividades.forEach(act => {
    const fecha = act.createdAt.toISOString().slice(0, 10);
    const personal = act.personal?.nombre || 'Sin Personal';
    const cliente = act.cliente?.nombre || 'Sin Cliente';
    const procedimiento = act.procedimiento?.nombre || 'Sin Procedimiento';

    // Filtro por búsqueda de nombre de personal
    if (
      buscar &&
      !personal.toLowerCase().includes(buscar) &&
      !cliente.toLowerCase().includes(buscar) &&
      !procedimiento.toLowerCase().includes(buscar)
    ) {
      return;
    }

    // Filtros específicos por ID
    if (personalId && String(act.personalId) !== personalId) return;
    if (clienteId && String(act.clienteId) !== clienteId) return;
    if (procedimientoId && String(act.procedimientoId) !== procedimientoId) return;

    // Filtro por fecha de inicio y fin
    if (fechaInicio && fecha < fechaInicio) return;
    if (fechaFin && fecha > fechaFin) return;

    if (!fichas[fecha]) fichas[fecha] = {};
    if (!fichas[fecha][personal]) {
      fichas[fecha][personal] = {
        actividades: [],
        vales: [],
        totalActividades: 0,
        totalVales: 0
      };
    }

    const esVale = !act.clienteId && !act.procedimientoId && !act.precioId && act.vales;

    if (esVale) {
      fichas[fecha][personal].vales.push(act);
      fichas[fecha][personal].totalVales += parseFloat(act.vales || 0);
    } else {
      fichas[fecha][personal].actividades.push(act);
      fichas[fecha][personal].totalActividades += parseFloat(act.precio?.monto || 0);
    }
  });

  const fichasArray = [];
  for (const fecha in fichas) {
    for (const personalNombre in fichas[fecha]) {
      fichasArray.push({
        fecha,
        personal: personalNombre,
        ...fichas[fecha][personalNombre]
      });
    }
  }

  fichasArray.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const totalFichas = fichasArray.length;
  const totalPaginas = Math.ceil(totalFichas / elementosPorPagina);
  const fichasPaginadas = fichasArray.slice(offset, offset + elementosPorPagina);

  // 🔽 Listas para los filtros desplegables
  const [personales, clientes, procedimientos] = await Promise.all([
    Personal.findAll(),
    Cliente.findAll(),
    Procedimiento.findAll()
  ]);

  res.render('actividades/admin', {
    pagina: 'Actividades diarias Damaris Spa',
    barra: true,
    piePagina: true,
    fichas: fichasPaginadas,
    paginaActual,
    totalPaginas,
    query: req.query,
    personales,
    clientes,
    procedimientos,
    csrfToken: req.csrfToken()
  });
};

// Mostrar formulario para crear una nueva Actividad
const crear = async (req, res) => {
  // Consultar los modelos de Personal, Clientes, Procedimientos (con sus Precios asociados)
  const [personals, clientes, procedimientos] = await Promise.all([
    Personal.findAll({ order: [['nombre', 'ASC']] }),
    Cliente.findAll({ order: [['nombre', 'ASC']] }),
    Procedimiento.findAll({
      include: {
        model: Precio,
        attributes: ['id', 'monto']
      },
      order: [['nombre', 'ASC']]
    })
  ]);

  const articulos = await Articulo.findAll({
    where: {
      categoriaId: 1,
      stock_actual: {
        [Op.gt]: 0
      }
    },
    order: [['nombre_articulo', 'ASC']]
  });

  res.render('actividades/crear', {
    pagina: 'Crear Actividad',
    barra: true,
    piePagina: true,
    csrfToken: req.csrfToken(),
    personals,
    clientes,
    procedimientos,
    articulos,
    datos: {}
  });
}

const guardar = async (req, res) => {

    // --- 1. VALIDACIÓN DE CAMPOS OBLIGATORIOS (con express-validator) ---
    let resultado = validationResult(req);

    if (!resultado.isEmpty()) {
        // Si hay errores, vuelve a cargar los datos para el formulario y renderiza con los errores
        const [personals, clientes, procedimientos, articulos] = await Promise.all([
            Personal.findAll({ where: { activo: true }, order: [['nombre', 'ASC']] }),
            Cliente.findAll({ where: { activo: true }, order: [['nombre', 'ASC']] }),
            Procedimiento.findAll({ include: [{ model: Precio, as: 'precio' }] }),
            Articulo.findAll({ where: { activo: true, categoriaId: 1, stock_actual: { [Op.gt]: 0 } }, order: [['nombre_articulo', 'ASC']] })
        ]);

        return res.render('actividades/crear', {
            pagina: 'Crear Actividad',
            csrfToken: req.csrfToken(),
            personals, clientes, procedimientos, articulos,
            errores: resultado.array(),
            datos: req.body
        });
    }

    // --- 2. VALIDACIÓN MANUAL DE STOCK (antes de tocar la base de datos) ---
    let { soloVales, articuloId, cantidad } = req.body;
    const erroresDeStock = [];

    // Solo validamos el stock si NO es un registro de "solo vales"
    if (soloVales !== 'on') {
        // Normalizar datos para asegurar que sean arrays
        if (articuloId && !Array.isArray(articuloId)) {
            articuloId = [articuloId];
            cantidad = [cantidad];
        }
        
        if (articuloId && Array.isArray(articuloId)) {
            for (let i = 0; i < articuloId.length; i++) {
                const idDelArticulo = articuloId[i];
                const cantidadSolicitada = parseFloat(cantidad[i]);

                if (idDelArticulo && cantidadSolicitada > 0) {
                    const articulo = await Articulo.findByPk(idDelArticulo);
                    if (!articulo || articulo.stock_actual < cantidadSolicitada) {
                        const nombre = articulo ? articulo.nombre_articulo : `ID ${idDelArticulo}`;
                        erroresDeStock.push({ msg: `Cantidad para "${nombre}" supera el stock. Verifica el inventario.` });
                    }
                }
            }
        }
    }

    // --- 3. SI HAY ERRORES DE STOCK, DETENER Y MOSTRAR MENSAJES ---
    if (erroresDeStock.length > 0) {
        // Este bloque es casi idéntico al de arriba, para mantener la consistencia
        const [personals, clientes, procedimientos, articulos] = await Promise.all([
            Personal.findAll({ where: { activo: true }, order: [['nombre', 'ASC']] }),
            Cliente.findAll({ where: { activo: true }, order: [['nombre', 'ASC']] }),
            Procedimiento.findAll({ include: [{ model: Precio, as: 'precio' }] }),
            Articulo.findAll({ where: { activo: true, categoriaId: 1, stock_actual: { [Op.gt]: 0 } }, order: [['nombre_articulo', 'ASC']] })
        ]);

        return res.render('actividades/crear', {
            pagina: 'Crear Actividad',
            csrfToken: req.csrfToken(),
            personals, clientes, procedimientos, articulos,
            errores: erroresDeStock, // Le pasamos nuestros errores de stock a la vista
            datos: req.body
        });
    }

    // --- 4. SI TODAS LAS VALIDACIONES PASAN, PROCEDER A GUARDAR CON UNA TRANSACCIÓN ---
    const t = await db.transaction();
    try {
        const { personal, cliente, procedimiento, precio, vales, descripcion } = req.body;
        const { id: usuarioId } = req.usuario;

        // Caso A: Guardar solo un Vale
        if (soloVales === 'on') {
            await Actividad.create({
                personalId: personal,
                vales,
                descripcion,
                usuarioId
            }, { transaction: t });
        
        // Caso B: Guardar una Actividad completa
        } else {
            const nuevaActividad = await Actividad.create({
                personalId: personal,
                clienteId: cliente,
                procedimientoId: procedimiento,
                precioId: precio,
                usuarioId
            }, { transaction: t });

            // Bucle para guardar detalles y actualizar stock (ya no necesita validar)
            if (articuloId && Array.isArray(articuloId)) {
                for (let i = 0; i < articuloId.length; i++) {
                    const idDelArticulo = articuloId[i];
                    const cantidadUsada = parseFloat(cantidad[i]);

                    if (idDelArticulo && cantidadUsada > 0) {
                        const articulo = await Articulo.findByPk(idDelArticulo, { transaction: t });
                        articulo.stock_actual -= cantidadUsada;
                        await articulo.save({ transaction: t });

                        await DetalleActividad.create({
                            actividadId: nuevaActividad.id,
                            articuloId: idDelArticulo,
                            cantidad: cantidadUsada
                        }, { transaction: t });
                    }
                }
            }
        }

        await t.commit();
        return res.redirect('/mis-actividades?guardado=1');

    } catch (error) {
        await t.rollback();
        console.error(error);
        return res.redirect(`/actividades/crear?error=Ocurrió un error inesperado al guardar la actividad.`);
    }
};

const eliminarActividad = async (req, res) => {
  const { id } = req.params;

  // 1. Verificar permisos
  if (req.usuario.role.nombre !== 'Admin') {
    return res.status(403).send('No tienes permiso para realizar esta acción');
  }

  // 2. Iniciar una transacción
  const t = await db.transaction();

  try {
    // 3. Buscar la actividad y sus detalles asociados dentro de la transacción
    const actividad = await Actividad.findByPk(id, {
      include: [{
        model: DetalleActividad,
        as: 'detalle_actividads'
      }],
      transaction: t
    });

    // Si la actividad no existe, cancelar todo
    if (!actividad) {
      await t.rollback();
      return res.status(404).send('Actividad no encontrada');
    }

    // 4. Devolver los artículos al stock si la actividad los tiene
    if (actividad.detalle_actividads && actividad.detalle_actividads.length > 0) {
      for (const detalle of actividad.detalle_actividads) {
        const articulo = await Articulo.findByPk(detalle.articuloId, { transaction: t });
        if (articulo) {
          articulo.stock_actual = parseFloat(articulo.stock_actual) + parseFloat(detalle.cantidad);
          await articulo.save({ transaction: t });
        }
      }
    }

    // 5. Eliminar la actividad principal
    await actividad.destroy({ transaction: t });

    // 6. Si todo fue exitoso, confirmar la transacción
    await t.commit();

    return res.redirect('/mis-actividades?eliminado=1');

  } catch (error) {
    // 7. Si algo falla, deshacer la transacción y registrar el error
    console.error(error);
    await t.rollback();
    return res.status(500).send('Error al eliminar la actividad y actualizar el stock');
  }
};

const eliminarVale = async (req, res) => {
  const { id } = req.params;

  if (req.usuario.role.nombre !== 'Admin') {
    return res.status(403).send('No tienes permiso para eliminar este vale');
  }

  try {
    await Actividad.destroy({
      where: {
        id,
        clienteId: null,
        procedimientoId: null,
        precioId: null
      }
    });

    return res.redirect('/mis-actividades?eliminadoVale=1');
  } catch (error) {
    console.log(error);
    return res.redirect('/mis-actividades?errorVale=1');
  }
};

export {
  admin,
  crear,
  guardar,
  eliminarActividad,
  eliminarVale
}