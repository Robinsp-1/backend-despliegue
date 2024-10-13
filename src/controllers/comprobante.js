const PDFDocument = require('pdfkit');
const { DetallesVentas } = require('../controllers/ventas');
const { obtenerVentaPorId } = require('../controllers/ventas');
const path = require('path');

class ComprobanteController {
    constructor() {
        this.generarComprobante = this.generarComprobante.bind(this);
    }

    async generarComprobante(req, res) {
        const { id_venta } = req.params;
        try {
            const venta = await obtenerVentaPorId(id_venta);
            if (!venta) {
                return res.status(404).json({ error: 'Venta no encontrada' });
            }

            const detallesVenta = await DetallesVentas(id_venta);
            if (!detallesVenta || detallesVenta.length === 0) {
                return res.status(404).json({ error: 'No se encontraron detalles para la venta' });
            }

            const doc = new PDFDocument({ size: 'A4', margin: 50 });


            const filename = `comprobante-${id_venta}.pdf`;
            res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-type', 'application/pdf');
            doc.pipe(res);


            // Logo en la esquina superior izquierda
            const logoPath = path.join(__dirname, '..', '..', 'Imagenes', 'logo.png');
            doc.image(logoPath, 50, 30, { width: 50 });


            // Encabezado
            doc.fontSize(22).text('Tienda Capulina', { align: 'center' });
            doc.fontSize(20).text('Comprobante de Venta', { align: 'center' });

            // Espacio para separar el título
            doc.moveDown(2);

            // Fecha y hora a la que se genero el comprobante
            const fechaHoraActual = new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' });
            doc.fontSize(10).text(`F/H Generado: ${fechaHoraActual}`, { align: 'center' });
            doc.moveDown(2);

            // Datos de la venta
            doc.fontSize(12).text(`ID de Venta: ${venta.id_venta}`, 50, 150);
            doc.text(`Fecha: ${new Date(venta.fecha_venta).toLocaleDateString('es-GT')}`, 50, 170);
            doc.text(`Cliente: ${venta.nombre_cliente}`, 50, 190);
            doc.text(`Dirección: ${venta.direccion}`, 50, 210);
            doc.moveDown(2);

            // Tabla
            doc.moveTo(50, 230).lineTo(550, 230).stroke();


            // Encabezados de la tabla
            doc.moveDown().fontSize(12).text('Descripción', 50, 250)  
            .text('Cantidad', 250, 250)
            .text('Precio Unitario', 350, 250)
            .text('Total', 450, 250);
        
        doc.moveTo(50, 270).lineTo(550, 270).stroke();
        let yPosition = 280;


        const checkPageSpace = () => {
            if (yPosition > 700) {
                doc.addPage();
                yPosition = 50;
        
                doc.moveDown().fontSize(14).text('Descripción', 50, yPosition)
                    .text('Cantidad', 250, yPosition)
                    .text('Precio Unitario', 350, yPosition)
                    .text('Total', 450, yPosition);
                doc.moveTo(50, yPosition + 20).lineTo(550, yPosition + 20).stroke();
                yPosition += 40;
            }
        };
            // Mostrar detalles de productos
            detallesVenta.forEach(detalle => {
                checkPageSpace();
            
                // Dividir descripciones largas
                doc.text(detalle.nombre, 50, yPosition, {
                    width: 180,  
                    height: 50,  
                    ellipsis: true  
                });
                doc.text(detalle.cantidad.toString(), 250, yPosition);
                doc.text(`Q${detalle.precio_unidad.toFixed(2)}`, 350, yPosition);
                doc.text(`Q${detalle.total.toFixed(2)}`, 450, yPosition);
            
                yPosition += 20; 
            });
            
            // Total de la venta
            const totalVenta = detallesVenta.reduce((total, detalle) => total + detalle.total, 0);
            checkPageSpace();
            doc.moveDown().fontSize(14).text(`Total de Venta: Q${totalVenta.toFixed(2)}`, { align: 'right' });

            // Líneas para firmas
            checkPageSpace();
            doc.moveDown(2).moveTo(50, 750).lineTo(250, 750).stroke();
            doc.text('Firma del vendedor', 50, 760);

            doc.moveTo(300, 750).lineTo(500, 750).stroke();
            doc.text('Firma del cliente', 300, 760);

            doc.end();
        } catch (error) {
            console.error('Error al generar el comprobante:', error);
            res.status(500).json({ error: 'Error al generar el comprobante' });
        }
    }
}

module.exports = new ComprobanteController();
