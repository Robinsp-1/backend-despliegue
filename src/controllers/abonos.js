const db = require('../models/db');

// Obtener los abonos menos los anulados
module.exports.listarAbonos = async (req, res) => {
    try {
        db.query(`
            SELECT a.id_abono, a.id_credito, u.nombres AS nombre_usuario, a.monto,  a.fecha, a.descripcion
            FROM abonos a
            JOIN creditos c ON a.id_credito = c.id_credito
            JOIN usuarios u ON c.id_usuario = u.id_usuario
            WHERE a.anular = 0
            ORDER BY a.fecha ASC
        `, (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                res.status(500).json({ success: false, message: 'Error al listar los abonos' });
                return;
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error('Error al listar abonos:', error);
        res.status(500).json({ success: false, message: 'Error al listar los abonos' });
    }
};

// Obtener todos los abonos
module.exports.listarTodosLosAbonos = async (req, res) => {
    try {
        db.query(`
            SELECT a.id_abono, a.id_credito, u.nombres AS nombre_usuario, a.monto, a.fecha, a.anular, a.descripcion
            FROM abonos a
            JOIN creditos c ON a.id_credito = c.id_credito
            JOIN usuarios u ON c.id_usuario = u.id_usuario
            ORDER BY a.fecha ASC
        `, (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                res.status(500).json({ success: false, message: 'Error al listar los abonos' });
                return;
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error('Error al listar abonos:', error);
        res.status(500).json({ success: false, message: 'Error al listar los abonos' });
    }
};

// Insertar un abono
module.exports.insertarAbono = async (req, res) => {
    const { id_credito, monto,  fecha, descripcion } = req.body;
    console.log(req.body);

    try {
  
        await db.beginTransaction();

       
        db.query(`
            INSERT INTO abonos (id_credito, monto,  fecha, descripcion, anular)
            VALUES (?, ?, ?, ? , 0)
        `, [id_credito, monto, fecha, descripcion], (error, results) => {
            if (error) {
                console.error('Error al insertar el abono:', error);
                db.rollback();
                res.status(500).json({ success: false, message: 'Error al insertar el abono' });
                return;
            }

           
            db.query(`
                UPDATE creditos
                SET credito_usado = credito_usado - ?
                WHERE id_credito = ?
            `, [monto, id_credito], (error, results) => {
                if (error) {
                    console.error('Error al actualizar el crédito:', error);
                    db.rollback();
                    res.status(500).json({ success: false, message: 'Error al actualizar el crédito' });
                    return;
                }

             
                db.commit();
                res.status(201).json({ success: true, message: 'Abono insertado y crédito actualizado exitosamente' });
            });
        });
    } catch (error) {
        db.rollback();
        console.error('Error al procesar la transacción:', error);
        res.status(500).json({ success: false, message: 'Error al procesar la transacción' });
    }
};

// Anular abono
module.exports.anularAbono = async (req, res) => {
    const { id_abono } = req.params;

    try {
      
        await db.beginTransaction();

        
        db.query(`
            SELECT id_credito, monto
            FROM abonos
            WHERE id_abono = ?
        `, [id_abono], (error, results) => {
            if (error) {
                console.error('Error al obtener el abono:', error);
                db.rollback();
                res.status(500).json({ success: false, message: 'Error al obtener el abono' });
                return;
            }

            if (results.length === 0) {
                res.status(404).json({ success: false, message: 'Abono no encontrado' });
                return;
            }

            const { id_credito, monto } = results[0];

           
            db.query(`
                UPDATE abonos
                SET anular = 1
                WHERE id_abono = ?
            `, [id_abono], (error, results) => {
                if (error) {
                    console.error('Error al anular el abono:', error);
                    db.rollback();
                    res.status(500).json({ success: false, message: 'Error al anular el abono' });
                    return;
                }

             
                db.query(`
                    UPDATE creditos
                    SET credito_usado = credito_usado + ?
                    WHERE id_credito = ?
                `, [monto, id_credito], (error, results) => {
                    if (error) {
                        console.error('Error al actualizar el crédito:', error);
                        db.rollback();
                        res.status(500).json({ success: false, message: 'Error al actualizar el crédito' });
                        return;
                    }

                   
                    db.commit();
                    res.status(200).json({ success: true, message: 'Abono anulado y crédito actualizado exitosamente' });
                });
            });
        });
    } catch (error) {
        db.rollback();
        console.error('Error al procesar la transacción:', error);
        res.status(500).json({ success: false, message: 'Error al procesar la transacción' });
    }
};
