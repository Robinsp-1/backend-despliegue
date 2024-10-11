const mysql = require('mysql');
const connection = require('../models/db');


exports.insertarIngreso = (req, res) => {
    const { id_pedido, observaciones, factura } = req.body;

    // Actualizar el estado del pedido a "1"
    const queryActualizarPedido = 'UPDATE pedidosproveedores SET estado = 1 WHERE id_pedido = ?';

    connection.query(queryActualizarPedido, [id_pedido], (err) => {
        if (err) {
            console.error('Error al actualizar estado del pedido:', err);
            return res.status(500).json({ error: 'Error en el servidor' });
        }

        const queryIngreso = `
            INSERT INTO ingresomercancias (id_pedido, observaciones, anulado, fecha_ingreso, factura)
            VALUES (?, ?, 0, NOW(), ?)
        `;

        connection.query(queryIngreso, [id_pedido, observaciones, factura], function (error, results) {
            if (error) {
                console.error('Error al insertar ingreso de mercancías:', error);
                return res.status(500).json({ error: 'Error en el servidor' });
            }

            const id_ingreso = results.insertId;
           

            // Actualizar el estado de los productos a "1"
            const queryActualizarProductos = `
                UPDATE productos 
                SET estado = 1 
                WHERE id_producto IN (
                    SELECT id_producto 
                    FROM detallespedidosproveedores 
                    WHERE id_pedido = ?
                )
            `;
            
            connection.query(queryActualizarProductos, [id_pedido], (errorActualizarProductos) => {
                if (errorActualizarProductos) {
                    console.error('Error al actualizar estado de los productos:', errorActualizarProductos);
                    return res.status(500).json({ error: 'Error al actualizar el estado de los productos' });
                }

                res.status(201).json({ message: 'Ingreso de mercancías registrado exitosamente', id_ingreso });
            });
        });
    });
};



// Insertar detalles de un ingreso de mercancías
exports.insertarDetalleIngreso = async (req, res) => {
    try {
        const { detalles } = req.body;

        if (!Array.isArray(detalles)) {
            return res.status(400).json({ error: "Los detalles deben ser un array." });
        }

        for (const detalle of detalles) {
            const { id_ingreso, id_producto, cantidad, precio_unitario, cantidad_anterior, precio_anterior } = detalle;

            
            await connection.query(
                'INSERT INTO detalleingreso (id_ingreso, id_producto, cantidad, precio_unidad, cantidad_anterior, precio_anterior) VALUES (?, ?, ?, ?, ?, ?)',
                [id_ingreso, id_producto, cantidad, precio_unitario, cantidad_anterior, precio_anterior]
            );

            
            await connection.query(
                'UPDATE productos SET stock = stock + ?, precio = ? WHERE id_producto = ?',
                [cantidad, precio_unitario, id_producto]
            );
        }

        res.json({ message: "Detalles de ingreso registrados y productos actualizados exitosamente" });
    } catch (error) {
        console.error('Error al insertar detalle de ingreso y actualizar productos:', error);
        res.status(500).json({ error: "Hubo un error al registrar los detalles de ingreso y actualizar los productos." });
    }
};


// Eliminar (anular) un ingreso de mercancías
exports.eliminarIngreso = (req, res) => {
    const { id_ingreso } = req.params;


    const queryCheck = 'SELECT COUNT(*) AS count FROM ingresomercancias WHERE id_ingreso = ?';

    connection.query(queryCheck, [id_ingreso], (err, results) => {
        if (err) {
            console.error('Error al verificar existencia de ingreso:', err);
            return res.status(500).json({ error: 'Error en el servidor' });
        }

        if (results[0].count === 0) {
            return res.status(404).json({ error: 'Ingreso no encontrado' });
        }


        const queryDetalles = `
            SELECT id_producto, cantidad, precio_unidad, cantidad_anterior, precio_anterior
            FROM detalleingreso
            WHERE id_ingreso = ?
        `;

        connection.query(queryDetalles, [id_ingreso], (err, detalles) => {
            if (err) {
                console.error('Error al obtener detalles del ingreso:', err);
                return res.status(500).json({ error: 'Error en el servidor' });
            }

    
            const queryAnular = `
                UPDATE ingresomercancias
                SET anulado = 1
                WHERE id_ingreso = ?
            `;

            connection.query(queryAnular, [id_ingreso], (err) => {
                if (err) {
                    console.error('Error al anular ingreso:', err);
                    return res.status(500).json({ error: 'Error en el servidor' });
                }

                
                detalles.forEach(detalle => {
                    const { id_producto, cantidad, cantidad_anterior, precio_anterior } = detalle;

                    // Revertir el precio y stock del producto
                    const queryRevertirProducto = `
                        UPDATE productos
                        SET precio = ?, stock = stock - ?
                        WHERE id_producto = ?
                    `;

                    connection.query(queryRevertirProducto, [precio_anterior, cantidad, id_producto], (err) => {
                        if (err) {
                            console.error('Error al revertir producto:', err);
                            return res.status(500).json({ error: 'Error en el servidor' });
                        }
                    });
                });

                res.json({ message: 'Ingreso de mercancías anulado exitosamente' });
            });
        });
    });
};


// Listar detalles de un ingreso de mercancías
exports.obtenerDetallesIngreso = (req, res) => {
    const { id_ingreso } = req.params;

    const query = `
        SELECT di.id_detalle, di.id_ingreso, di.id_producto, p.nombre AS nombre_producto, di.cantidad, di.precio_unidad, di.cantidad_anterior, di.precio_anterior
        FROM detalleingreso di
        JOIN productos p ON di.id_producto = p.id_producto
        WHERE di.id_ingreso = ?
    `;

    connection.query(query, [id_ingreso], (err, results) => {
        if (err) {
            console.error('Error al obtener los detalles del ingreso:', err);
            return res.status(500).json({ error: 'Hubo un error al obtener los detalles del ingreso.' });
        }
        

        if (results.length === 0) {
            console.warn('No se encontraron detalles para el ingreso:', id_ingreso);
        }

        res.json(results);
    });
};

// Listar todos los ingresos de mercancías
exports.listarIngresos = (req, res) => {
    const query = `
        SELECT id_ingreso, id_pedido, observaciones, fecha_ingreso, factura, anulado
        FROM ingresomercancias
        ORDER BY fecha_ingreso DESC
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al listar ingresos de mercancías:', err);
            return res.status(500).json({ error: 'Error en el servidor' });
        }
        res.json(results);
    });
};
