const mysql = require('mysql');
const connection = require('../models/db');



// Registrar salida de producto y actualizar stock
exports.realizarSalida = async (req, res) => {
    const { id_producto, cantidad, descripcion, fecha_salida, anulado } = req.body;

    try {

        await new Promise((resolve, reject) => {
            connection.beginTransaction(err => {
                if (err) reject(err);
                resolve();
            });
        });


        await new Promise((resolve, reject) => {
            const query = `
                INSERT INTO salidasdevoluciones (id_producto, cantidad, descripcion, fecha_salida, anulado)
                VALUES (?, ?, ?, ?, ?)`;
            connection.query(query, [id_producto, cantidad, descripcion, fecha_salida, anulado], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

     
        await new Promise((resolve, reject) => {
            const query = 'UPDATE productos SET stock = stock - ? WHERE id_producto = ?';
            connection.query(query, [cantidad, id_producto], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

    
        await new Promise((resolve, reject) => {
            connection.commit(err => {
                if (err) return connection.rollback(() => reject(err));
                resolve();
            });
        });

        res.status(200).json({ message: 'Salida realizada exitosamente' });
    } catch (error) {
 
        await new Promise((resolve, reject) => {
            connection.rollback(() => {
                connection.end();
                reject(error);
            });
        });
        console.error('Error al registrar la salida de productos:', error);
        res.status(500).json({ error: 'Hubo un error al registrar la salida de productos.' });
    }
};

exports.listarSalidas = (req, res) => {
    const query = `
        SELECT 
            s.id_salida, 
            s.id_producto, 
            p.nombre AS nombre_producto,  
            s.cantidad, 
            s.anulado, 
            s.descripcion, 
            s.fecha_salida
        FROM 
            salidasdevoluciones s
        JOIN 
            productos p ON s.id_producto = p.id_producto 
        WHERE 
            s.anulado = 0
        ORDER BY 
            s.fecha_salida DESC
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al extraer salidas de productos:', err);
            return res.status(500).send('Error al extraer salidas de productos');
        }

        res.json(results);
    });
};
