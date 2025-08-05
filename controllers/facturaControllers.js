import PDFDocument from 'pdfkit';
import { Actividad, Cliente, Procedimiento, Precio, Factura } from '../models/index.js';

const construirPDFCarta = (doc, actividad, factura) => {
    // Encabezado del Negocio
    doc.fontSize(20).text('Damaris spa sas', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text('Nit 901625250', { align: 'center' });
    doc.text('Calle 9A #22-16', { align: 'center' });
    doc.text('dvspaasas@outlook.com', { align: 'center' });
    doc.moveDown(2);

    // Información del cliente y factura
    doc.fontSize(12);
    doc.text(`Factura N°: ${factura.numero_factura}`, { align: 'right' });
    doc.text(`Fecha de Emisión: ${new Date(factura.fecha_emision).toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();
    doc.text(`Cliente: ${actividad.cliente.nombre} ${actividad.cliente.apellidos}`);
    doc.moveDown(2);

    // Tabla de servicios
    const tableTop = 280; // Se ajusta la posición para dar espacio al nuevo encabezado
    doc.font('Helvetica-Bold');
    doc.text('Descripción', 50, tableTop);
    doc.text('Precio', 450, tableTop, { width: 100, align: 'right' });
    doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();
    
    doc.font('Helvetica');
    doc.text(actividad.procedimiento.nombre, 50, tableTop + 30);
    doc.text(`$${parseFloat(actividad.precio.monto).toLocaleString('es-CO')}`, 450, tableTop + 30, { width: 100, align: 'right' });
    doc.moveDown(2);
    
    // Totales
    const totalY = tableTop + 70;
    doc.moveTo(50, totalY).lineTo(550, totalY).stroke();
    doc.font('Helvetica-Bold').text('Total:', 50, totalY + 10);
    doc.text(`$${parseFloat(factura.total).toLocaleString('es-CO')}`, 450, totalY + 10, { width: 100, align: 'right' });

    // Pie de página
    doc.fontSize(10).text('Gracias por su preferencia.', 50, 700, { align: 'center', width: 500 });

    doc.end();
};

// --- FUNCIÓN DE DISEÑO PARA FORMATO TIQUETE ---
const construirPDFTicket = (doc, actividad, factura) => {
    doc.font('Helvetica').fontSize(9);
    const margin = 15;

    // Encabezado del Negocio
    doc.font('Helvetica-Bold').fontSize(14).text('Damaris spa sas', { align: 'center' });
    doc.font('Helvetica').fontSize(8);
    doc.text('Nit 901625250', { align: 'center' });
    doc.text('Calle 9A #22-16', { align: 'center' });
    doc.text('dvspaasas@outlook.com', { align: 'center' });
    doc.moveDown(2);

    // ... el resto de la función de tiquete no cambia ...
    doc.moveTo(margin, doc.y).lineTo(doc.page.width - margin, doc.y).dash(2, { space: 2 }).stroke();
    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Recibo N°: ${factura.numero_factura}`);
    doc.font('Helvetica').text(`Fecha: ${new Date(factura.fecha_emision).toLocaleString('es-VE')}`);
    doc.text(`Cliente: ${actividad.cliente.nombre} ${actividad.cliente.apellidos}`);
    doc.moveDown();
    doc.moveTo(margin, doc.y).lineTo(doc.page.width - margin, doc.y).dash(2, { space: 2 }).stroke();
    doc.moveDown();
    doc.font('Helvetica-Bold');
    doc.text('Descripción', margin, doc.y, { continued: true });
    doc.text('Total', { align: 'right' });
    doc.moveDown(0.5);
    doc.font('Helvetica');
    doc.text(actividad.procedimiento.nombre, margin, doc.y, { width: doc.page.width - margin * 2 - 50 });
    doc.text(`$${parseFloat(actividad.precio.monto).toLocaleString('es-CO')}`, { align: 'right' });
    doc.moveDown(2);
    doc.moveTo(margin, doc.y).lineTo(doc.page.width - margin, doc.y).dash(2, { space: 2 }).stroke();
    doc.moveDown();
    doc.font('Helvetica-Bold');
    doc.text('TOTAL:', margin, doc.y, { continued: true });
    doc.text(`$${parseFloat(factura.total).toLocaleString('es-CO')}`, { align: 'right' });
    doc.moveDown(3);
    doc.font('Helvetica-Oblique').fontSize(8).text('¡Gracias por su preferencia!', { align: 'center' });

    doc.end();
};

// --- NUEVA FUNCIÓN: VERIFICA SI LA FACTURA EXISTE ---
const verificarFactura = async (req, res) => {
    try {
        const { actividadId } = req.params;
        const factura = await Factura.findOne({ where: { actividadId } });

        if (factura) {
            res.json({ existe: true, actividadId: actividadId });
        } else {
            res.json({ existe: false });
        }
    } catch (error) {
        console.error('Error al verificar factura:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


const generarNuevaFacturaPDF = async (req, res) => {
    try {
        const { actividadId, formato } = req.params;

        const facturaExistente = await Factura.findOne({ where: { actividadId } });
        if (facturaExistente) {
            return res.status(409).send('La factura ya existe. Use la opción de reimprimir.');
        }

        const actividad = await Actividad.findByPk(actividadId, { include: [Cliente, Procedimiento, Precio] });
        if (!actividad || !actividad.cliente) {
            return res.status(404).send('Actividad no encontrada o no es facturable.');
        }

        const ultimaFactura = await Factura.findOne({ order: [['createdAt', 'DESC']] });
        const nuevoNumero = ultimaFactura ? parseInt(ultimaFactura.numero_factura.split('-')[1]) + 1 : 1;
        const numeroFacturaFormateado = `F-${String(nuevoNumero).padStart(4, '0')}`;

        const nuevaFactura = await Factura.create({
            numero_factura: numeroFacturaFormateado,
            fecha_emision: new Date(),
            total: actividad.precio.monto,
            actividadId: actividad.id
        });

        let doc;
        if (formato === 'ticket') {
            doc = new PDFDocument({ size: [227, 600], margins: { top: 15, bottom: 15, left: 15, right: 15 } });
            construirPDFTicket(doc, actividad, nuevaFactura);
        } else {
            // --- CAMBIO: de 'A4' a 'Letter' ---
            doc = new PDFDocument({ size: 'Letter', margin: 50 });
            construirPDFCarta(doc, actividad, nuevaFactura);
        }
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=factura-${nuevaFactura.numero_factura}.pdf`);
        doc.pipe(res);

    } catch (error) {
        console.error('Error al generar la factura:', error);
        res.status(500).send('No se pudo generar la factura.');
    }
};

// --- FUNCIÓN PRINCIPAL PARA REIMPRIMIR ---
const reimprimirFacturaPDF = async (req, res) => {
    try {
        const { actividadId, formato } = req.params;
        
        const factura = await Factura.findOne({ where: { actividadId } });
        if (!factura) {
            return res.status(404).send('No se encontró una factura para esta actividad.');
        }

        const actividad = await Actividad.findByPk(actividadId, { include: [Cliente, Procedimiento, Precio] });
        if (!actividad) {
            return res.status(404).send('Actividad asociada no encontrada.');
        }

        let doc;
        if (formato === 'ticket') {
            doc = new PDFDocument({ size: [227, 600], margins: { top: 15, bottom: 15, left: 15, right: 15 } });
            construirPDFTicket(doc, actividad, factura);
        } else {
            // --- CAMBIO: de 'A4' a 'Letter' ---
            doc = new PDFDocument({ size: 'Letter', margin: 50 });
            construirPDFCarta(doc, actividad, factura);
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=factura-${factura.numero_factura}.pdf`);
        doc.pipe(res);

    } catch (error) {
        console.error('Error al reimprimir la factura:', error);
        res.status(500).send('No se pudo reimprimir la factura.');
    }
};

export {
    verificarFactura,
    generarNuevaFacturaPDF,
    reimprimirFacturaPDF
};