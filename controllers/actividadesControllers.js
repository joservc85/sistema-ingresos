import { validationResult } from 'express-validator';
import { Actividad, DetalleActividad, Personal, Cliente, Procedimiento, Precio, Articulo, FormaDePago, Banco, Auditoria } from '../models/index.js'
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
    where: { estado: 'Realizada' },
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
    // --- CONSULTA ACTUALIZADA ---
    // Ahora también traemos las formas de pago y los bancos
    const [personals, clientes, procedimientos, articulos, formasDePago, bancos] = await Promise.all([
        Personal.findAll({ order: [['nombre', 'ASC']] }),
        Cliente.findAll({ 
            where: { activo: true, tipo: { [Op.in]: ['Spa', 'Ambos'] } },
            order: [['nombre', 'ASC']] 
        }),
        Procedimiento.findAll({
            include: {
                model: Precio,
                attributes: ['id', 'monto']
            },
            order: [['nombre', 'ASC']]
        }),
        Articulo.findAll({
            where: {
                categoriaId: 1,
                stock_actual: { [Op.gt]: 0 }
            },
            order: [['nombre_articulo', 'ASC']]
        }),
        FormaDePago.findAll(), 
        Banco.findAll()       
    ]);

    res.render('actividades/crear', {
        pagina: 'Crear Actividad',
        barra: true,
        piePagina: true,
        csrfToken: req.csrfToken(),
        personals,
        clientes,
        procedimientos,
        articulos,
        formasDePago, 
        bancos,       
        datos: {}
    });
}

const guardar = async (req, res) => {

    // --- 1. VALIDACIÓN DE CAMPOS OBLIGATORIOS (con express-validator) ---
    let resultado = validationResult(req);

    if (!resultado.isEmpty()) {
        const [personals, clientes, procedimientos, articulos, formasDePago, bancos] = await Promise.all([
            Personal.findAll({ where: { activo: true }, order: [['nombre', 'ASC']] }),
            Cliente.findAll({ where: { activo: true }, order: [['nombre', 'ASC']] }),
            Procedimiento.findAll({ include: [{ model: Precio, as: 'precio' }] }),
            Articulo.findAll({ where: { activo: true, categoriaId: 1, stock_actual: { [Op.gt]: 0 } }, order: [['nombre_articulo', 'ASC']] }),
            FormaDePago.findAll(),
            Banco.findAll()
        ]);

        return res.render('actividades/crear', {
            pagina: 'Crear Actividad',
            csrfToken: req.csrfToken(),
            personals, clientes, procedimientos, articulos, formasDePago, bancos,
            errores: resultado.array(),
            datos: req.body
        });
    }

    // --- 2. VALIDACIÓN MANUAL DE STOCK (antes de tocar la base de datos) ---
    let { soloVales, articuloId, cantidad } = req.body;
    const erroresDeStock = [];

    if (soloVales !== 'on') {
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
        const [personals, clientes, procedimientos, articulos, formasDePago, bancos] = await Promise.all([
            Personal.findAll({ where: { activo: true }, order: [['nombre', 'ASC']] }),
            Cliente.findAll({ where: { activo: true }, order: [['nombre', 'ASC']] }),
            Procedimiento.findAll({ include: [{ model: Precio, as: 'precio' }] }),
            Articulo.findAll({ where: { activo: true, categoriaId: 1, stock_actual: { [Op.gt]: 0 } }, order: [['nombre_articulo', 'ASC']] }),
            FormaDePago.findAll(),
            Banco.findAll()
        ]);

        return res.render('actividades/crear', {
            pagina: 'Crear Actividad',
            csrfToken: req.csrfToken(),
            personals, clientes, procedimientos, articulos, formasDePago, bancos,
            errores: erroresDeStock,
            datos: req.body
        });
    }

    // --- 4. SI TODAS LAS VALIDACIONES PASAN, PROCEDER A GUARDAR CON UNA TRANSACCIÓN ---
    const t = await db.transaction();
    try {
        // --- CORRECCIÓN: Extraer todos los campos, incluyendo 'referencia_pago' ---
        const { personal, cliente, procedimiento, precio, vales, descripcion, formaDePagoId, bancoId, referencia_pago } = req.body;
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
                usuarioId,
                // --- CORRECCIÓN: Guardar los nuevos campos de pago ---
                formaDePagoId: formaDePagoId || null,
                bancoId: bancoId || null,
                referencia_pago: referencia_pago || null
            }, { transaction: t });

            // Bucle para guardar detalles y actualizar stock (sin cambios)
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
        return res.redirect('/mis-actividades?mensaje=Actividad Guardada Correctamente');

    } catch (error) {
        await t.rollback();
        console.error(error);
        return res.redirect(`/actividades/crear?error=Ocurrió un error inesperado al guardar la actividad.`);
    }
};

// --- FUNCIÓN ACTUALIZADA: DE ELIMINAR A ANULAR ---
const anularActividad = async (req, res) => {
    const { id } = req.params;
    const { id: usuarioId, nombre: nombreUsuario } = req.usuario;

    // Verificar permisos
    if (req.usuario.role.nombre !== 'Admin' && req.usuario.role.nombre !== 'Supervisor') {
        return res.status(403).send('No tienes permiso para realizar esta acción');
    }

    const t = await db.transaction();
    try {
        const actividad = await Actividad.findByPk(id, {
            include: [{
                model: DetalleActividad,
                as: 'detalle_actividads',
                include: [Articulo]
            }],
            transaction: t
        });

        if (!actividad) {
            throw new Error('Actividad no encontrada.');
        }

        if (actividad.estado === 'Anulada') {
            throw new Error('Esta actividad ya ha sido anulada previamente.');
        }

        // 1. Revertir el stock de los materiales utilizados
        for (const detalle of actividad.detalle_actividads) {
            if (detalle.Articulo) {
                detalle.Articulo.stock_actual = parseFloat(detalle.Articulo.stock_actual) + parseFloat(detalle.cantidad);
                await detalle.Articulo.save({ transaction: t });
            }
        }

        // 2. Cambiar el estado de la actividad a "Anulada"
        actividad.estado = 'Anulada';
        await actividad.save({ transaction: t });

        // 3. Registrar la acción en la tabla de auditoría
        await Auditoria.create({
            accion: 'ANULAR',
            tabla_afectada: 'actividades',
            registro_id: id,
            descripcion: `El usuario ${nombreUsuario} anuló la actividad #${id}.`,
            usuarioId: usuarioId
        }, { transaction: t });

        await t.commit();
        res.redirect('/mis-actividades?mensaje=Actividad anulada y stock revertido correctamente.');

    } catch (error) {
        await t.rollback();
        console.error('Error al anular la actividad:', error);
        res.redirect(`/mis-actividades?error=${encodeURIComponent(error.message)}`);
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
  anularActividad,
  eliminarVale
}