import { Op } from 'sequelize';
import { Actividad, FormaDePago, Precio, CierreDeCaja, Usuario, Auditoria } from '../models/index.js';
import db from '../config/db.js';

// Muestra la vista del cierre de caja para una fecha específica
const mostrarCierre = async (req, res) => {
    const fechaQuery = req.query.fecha || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    try {
        const cierreExistente = await CierreDeCaja.findOne({
            where: {
                fecha_cierre: fechaQuery,
                estado: 'Consolidado'
            }
        });

        if (cierreExistente) {
            return res.render('caja/cierre-existente', {
                pagina: 'Cierre ya Realizado',
                cierre: cierreExistente,
                barra: true,
                piePagina: true
            });
        }

        const inicioDelDia = new Date(`${fechaQuery}T00:00:00.000-05:00`);
        const finDelDia = new Date(`${fechaQuery}T23:59:59.999-05:00`);

        const [actividadesDelDia, valesDelDia] = await Promise.all([
            Actividad.findAll({
                where: { 
                    createdAt: { [Op.between]: [inicioDelDia, finDelDia] }, 
                    vales: null,
                    estado: 'Realizada' 
                },
                include: [Precio, FormaDePago]
            }),
            Actividad.findAll({
                where: { 
                    createdAt: { [Op.between]: [inicioDelDia, finDelDia] }, 
                    vales: { [Op.ne]: null } 
                }
            })
        ]);

        if (actividadesDelDia.length === 0 && valesDelDia.length === 0) {
            return res.redirect(`/mis-actividades?mensaje=No hay actividades o vales para cerrar en la fecha seleccionada.`);
        }

        let totalEfectivo = 0, totalDatafono = 0, totalTransferencia = 0;
        const totalVales = valesDelDia.reduce((total, vale) => total + parseFloat(vale.vales), 0);

        actividadesDelDia.forEach(actividad => {
            const monto = parseFloat(actividad.precio?.monto || 0);
            const formaDePago = actividad.formas_de_pago?.nombre || 'Efectivo';

            if (formaDePago === 'Efectivo') totalEfectivo += monto;
            else if (formaDePago === 'Datafono') totalDatafono += monto;
            else if (formaDePago === 'Transferencia') totalTransferencia += monto;
        });

        const totalVentasDia = totalEfectivo + totalDatafono + totalTransferencia;

        res.render('caja/cierre', {
            pagina: `Cierre de Caja - ${new Date(fechaQuery + 'T12:00:00').toLocaleDateString('es-VE')}`,
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            fechaSeleccionada: fechaQuery,
            totalEfectivo,
            totalDatafono,
            totalTransferencia,
            totalVales,
            totalVentasDia
        });

    } catch (error) {
        console.error('Error al calcular el cierre de caja:', error);
    }
};

// Guarda el cierre de caja en la base de datos
const guardarCierre = async (req, res) => {
    const { id: usuarioId, nombre: nombreUsuario } = req.usuario;
    const { fecha_cierre, total_efectivo_sistema, total_efectivo_contado, desglose_efectivo, descuadre, total_datafono, total_transferencia, total_vales, total_ventas_dia, observaciones } = req.body;

    const t = await db.transaction();
    try {
        // Prevenir cierres duplicados
        const cierreExistente = await CierreDeCaja.findOne({ 
            where: { 
                fecha_cierre,
                estado: 'Consolidado' 
            } 
        });
        if (cierreExistente) {
            throw new Error('Ya existe un cierre consolidado para esta fecha.');
        }

        // Parsear el desglose de forma segura
        let desgloseJSON = null;
        if (desglose_efectivo && desglose_efectivo.trim() !== '{}') {
            try {
                desgloseJSON = JSON.parse(desglose_efectivo);
            } catch (e) {
                throw new Error('El formato del desglose de efectivo es inválido.');
            }
        }

        const nuevoCierre = await CierreDeCaja.create({
            fecha_cierre,
            total_efectivo_sistema,
            total_efectivo_contado,
            desglose_efectivo: desgloseJSON,
            descuadre,
            total_datafono,
            total_transferencia,
            total_vales,
            total_ventas_dia,
            observaciones,
            usuarioId
        }, { transaction: t });

        // --- ¡REGISTRO DE AUDITORÍA AÑADIDO! ---
        await Auditoria.create({
            accion: 'CREAR',
            tabla_afectada: 'cierres_de_caja',
            registro_id: nuevoCierre.id,
            descripcion: `El usuario ${nombreUsuario} guardó el cierre de caja del día ${fecha_cierre}.`,
            usuarioId
        }, { transaction: t });

        await t.commit();
        res.redirect('/cierre-caja/historial?mensaje=Cierre de caja guardado exitosamente.');

    } catch (error) {
        await t.rollback();
        console.error('Error al guardar el cierre de caja:', error);
        
        let mensajeError = 'No se pudo guardar el cierre.';
        // Si es un error de validación de Sequelize, usamos un mensaje más específico.
        if (error.name === 'SequelizeValidationError') {
            mensajeError = error.errors.map(e => e.message).join(', ');
        } else {
            mensajeError = error.message;
        }
        
        res.redirect(`/cierre-caja?fecha=${fecha_cierre}&error=${encodeURIComponent(mensajeError)}`);
    }
};

// Muestra el historial de todos los cierres de caja ---
const listarCierres = async (req, res) => {
    try {
        const cierres = await CierreDeCaja.findAll({
            include: [
                { model: Usuario, attributes: ['nombre'] }
            ],
            order: [['fecha_cierre', 'DESC']]
        });

        res.render('caja/historial', {
            pagina: 'Historial de Cierres de Caja',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            cierres
        });
    } catch (error) {
        console.error('Error al listar los cierres de caja:', error);
        // Manejo de error
    }
};

// Devuelve los datos de un cierre específico como JSON ---
const verCierre = async (req, res) => {
    try {
        const { id } = req.params;
        const cierre = await CierreDeCaja.findByPk(id, {
            include: [{ model: Usuario, attributes: ['nombre'] }]
        });

        if (!cierre) {
            return res.status(404).json({ msg: 'Cierre no encontrado' });
        }
        res.json(cierre);
    } catch (error) {
        console.error('Error al ver el cierre de caja:', error);
        res.status(500).json({ msg: 'Error en el servidor' });
    }
};

// Anular Cierre e caja
const anularCierre = async (req, res) => {
    const { id } = req.params;
    const { id: usuarioId, nombre: nombreUsuario } = req.usuario;

    // Solo el Admin puede anular
    if (req.usuario.role.nombre !== 'Admin') {
        return res.redirect(`/cierre-caja/historial?error=No tienes permiso para anular cierres.`);
    }

    const t = await db.transaction();
    try {
        const cierre = await CierreDeCaja.findByPk(id, { transaction: t });

        if (!cierre) {
            throw new Error('Cierre de caja no encontrado.');
        }

        if (cierre.estado === 'Anulado') {
            throw new Error('Este cierre ya ha sido anulado previamente.');
        }

        // Cambiar el estado a "Anulado"
        cierre.estado = 'Anulado';
        await cierre.save({ transaction: t });

        // Registrar la acción en la tabla de auditoría
        await Auditoria.create({
            accion: 'ANULAR',
            tabla_afectada: 'cierres_de_caja',
            registro_id: id,
            descripcion: `El usuario ${nombreUsuario} anuló el cierre de caja del día ${cierre.fecha_cierre}.`,
            usuarioId: usuarioId
        }, { transaction: t });

        await t.commit();
        res.redirect('/cierre-caja/historial?mensaje=Cierre de caja anulado correctamente.');

    } catch (error) {
        await t.rollback();
        console.error('Error al anular el cierre de caja:', error);
        res.redirect(`/cierre-caja/historial?error=${encodeURIComponent(error.message)}`);
    }
};

export {
    mostrarCierre,
    guardarCierre,
    listarCierres,
    verCierre,
    anularCierre
};