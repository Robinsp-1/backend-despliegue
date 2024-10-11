const ExcelJS = require('exceljs');
const db = require('../models/db'); 


module.exports.generarReporte = (req, res) => {
    const { tabla } = req.params;
    const { campos, fechaInicio, fechaFin } = req.body;

    if (!campos || campos.length === 0) {
        return res.status(400).json({ error: 'Se deben especificar los campos a incluir en el reporte.' });
    }

    let query;
    // Verificar si el usuario tiene el campo 'id_usuario' y agregarle su nombre
    const hasUserIdField = campos.includes('id_usuario');
    if (tabla === 'solicitudpedidos' && hasUserIdField) {
        const camposSinIdUsuario = campos.filter(campo => campo !== 'id_usuario');
        query = `SELECT ${camposSinIdUsuario.join(', ')}, sp.id_usuario AS id_usuario, u.nombres AS nombres
                 FROM ${tabla} sp
                 JOIN usuarios u ON sp.id_usuario = u.id_usuario`;
    } else {
        query = `SELECT ${campos.join(', ')} FROM ${tabla}`;
    }

    // Agregar filtro de fechas
    let campoFecha;
    switch (tabla) {
        case 'usuarios':
            campoFecha = 'fecha_registro';
            break;
        case 'ventas':
            campoFecha = 'fecha_venta';
            break;
        case 'solicitudpedidos':
            campoFecha = 'fecha_pedido';
            break;
        case 'productos':
            campoFecha = 'fecha_ingreso';
            break;
        case 'creditos':
            campoFecha = 'fecha_asignado';
            break;
        case 'abonos':
            campoFecha = 'fecha';
            break;
        default:
            campoFecha = null;
    }

    // Añadir el filtro de fechas solo si hay un campo de fecha definido
    if (campoFecha && fechaInicio && fechaFin) {
        
        query += ` WHERE ${campoFecha} BETWEEN '${fechaInicio}' AND '${fechaFin}'`;
    }

    db.query(query, async (err, rows) => {
        if (err) {
            console.error('Error al ejecutar la consulta:', err);
            return res.status(500).json({ error: 'Error al generar el reporte' });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(tabla);

        if (rows.length > 0) {
            const headers = Object.keys(rows[0]);
            worksheet.addRow(headers);
            rows.forEach(row => {
                worksheet.addRow(Object.values(row));
            });
        }

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename=${tabla}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    });
};
