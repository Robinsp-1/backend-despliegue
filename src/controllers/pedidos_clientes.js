const mysql = require('mysql');
const connection = require('../models/db');

// Registrar una nueva solicitud de pedido
module.exports.registrarSolicitudPedido = async (req, res) => {
    const { id_usuario, fecha_pedido, fecha_entrega, anulado, direccion_entrega, estado, productos } = req.body;

    if (!id_usuario || !fecha_pedido || !fecha_entrega || estado === undefined || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ error: 'Por favor, complete todos los campos obligatorios y asegúrese de incluir los productos.' });
    }

    try {
        connection.beginTransaction(async (err) => {
            if (err) throw err;

            // Registrar la solicitud de pedido
            connection.query(
                'INSERT INTO solicitudpedidos (id_usuario, fecha_pedido, fecha_entrega, anulado, direccion_entrega, estado) VALUES (?, ?, ?, ?, ?, ?)',
                [id_usuario, fecha_pedido, fecha_entrega, anulado, direccion_entrega, estado],
                (err, result) => {
                    if (err) {
                        return connection.rollback(() => {
                            throw err;
                        });
                    }
                    const id_solicitud_pedido = result.insertId;

                    // Registrar los detalles del pedido
                    const detalleValues = productos.map(producto => [
                        id_solicitud_pedido,
                        producto.id_producto,
                        producto.cantidad,
                        producto.total
                    ]);

                    connection.query(
                        'INSERT INTO detallespedidos (id_solicitud_pedido, id_producto, cantidad, total) VALUES ?',
                        [detalleValues],
                        (err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    throw err;
                                });
                            }

                            // Eliminar la actualización del stock
                            /*
                            const updateStockPromises = productos.map(producto => 
                                new Promise((resolve, reject) => {
                                    connection.query(
                                        'UPDATE productos SET stock = stock - ? WHERE id_producto = ?',
                                        [producto.cantidad, producto.id_producto],
                                        (err) => {
                                            if (err) return reject(err);
                                            resolve();
                                        }
                                    );
                                })
                            );

                            Promise.all(updateStockPromises)
                                .then(() => {
                                    connection.commit((err) => {
                                        if (err) {
                                            return connection.rollback(() => {
                                                throw err;
                                            });
                                        }
                                        res.status(201).json({ message: 'Solicitud de pedido registrada exitosamente', id_solicitud_pedido });
                                    });
                                })
                                .catch(err => {
                                    connection.rollback(() => {
                                        throw err;
                                    });
                                });
                            */

                           
                            connection.commit((err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        throw err;
                                    });
                                }
                                res.status(201).json({ message: 'Solicitud de pedido registrada exitosamente', id_solicitud_pedido });
                            });
                        }
                    );
                }
            );
        });
    } catch (error) {
        console.error('Error al registrar la solicitud de pedido:', error);
        res.status(500).json({ error: 'No se pudo registrar la solicitud de pedido' });
    }
};

// Obtener los detalles de una solicitud de pedido específica
module.exports.listarDetallesPedidoCliente = (req, res) => {
    const { id_solicitud_pedido } = req.params;
    
    const query = `
        SELECT d.id_detalle_pedido, d.id_solicitud_pedido, d.id_producto, p.nombre AS nombre_producto, p.stock, p.precio, p.imagen_url, d.cantidad, d.total
        FROM detallespedidos d
        JOIN productos p ON d.id_producto = p.id_producto
        JOIN solicitudpedidos sp ON d.id_solicitud_pedido = sp.id_solicitud_pedido
        JOIN usuarios u ON sp.id_usuario = u.id_usuario
        WHERE d.id_solicitud_pedido = ?
    `;


    connection.query(query, [id_solicitud_pedido], (err, results) => {
        if (err) {
            console.error('Error al listar los detalles del pedido:', err);
            return res.status(500).json({ error: 'Error al listar los detalles del pedido.' });
        }

       

        const baseUrl = 'http://localhost:3000/Imagenes/productos/';

        const detallesConImagenes = results.map(detalle => {
            return {
                ...detalle,
                imagen_url: `${baseUrl}${detalle.imagen_url}`
            };
        });

        res.json(detallesConImagenes);
    });
};


// Anular un pedido
module.exports.anularSolicitudPedido = (req, res) => {
    const { id_solicitud_pedido } = req.params;

    if (!id_solicitud_pedido) {
        return res.status(400).json({ error: 'ID de la solicitud de pedido es requerido.' });
    }


    const queryCheck = 'SELECT COUNT(*) AS count FROM solicitudpedidos WHERE id_solicitud_pedido = ?';

    connection.query(queryCheck, [id_solicitud_pedido], (err, results) => {
        if (err) {
            console.error('Error al verificar existencia de pedido:', err);
            return res.status(500).json({ error: 'Error en el servidor' });
        }

        if (results[0].count === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

     
        const queryDetalles = `
            SELECT id_producto, cantidad
            FROM detallespedidos
            WHERE id_solicitud_pedido = ?
        `;

        connection.query(queryDetalles, [id_solicitud_pedido], (err, detalles) => {
            if (err) {
                console.error('Error al obtener detalles del pedido:', err);
                return res.status(500).json({ error: 'Error en el servidor' });
            }


            const queryAnular = `
                UPDATE solicitudpedidos
                SET anulado = 1
                WHERE id_solicitud_pedido = ?
            `;

            connection.query(queryAnular, [id_solicitud_pedido], (err) => {
                if (err) {
                    console.error('Error al anular pedido:', err);
                    return res.status(500).json({ error: 'Error en el servidor' });
                }


                res.json({ message: 'Pedido marcado como anulado exitosamente' });
            });
        });
    });
};



// Obtener los detalles de una solicitud de pedido específica
module.exports.obtenerSolicitudPedido = (req, res) => {
    const { id_solicitud_pedido } = req.params;

    if (!id_solicitud_pedido) {
        return res.status(400).json({ error: 'ID de la solicitud de pedido es requerido.' });
    }

    const query = `
        SELECT 
            id_solicitud_pedido, 
            id_usuario, 
            fecha_pedido, 
            fecha_entrega, 
            anulado, 
            direccion_entrega, 
            estado 
        FROM solicitudpedidos
        WHERE id_solicitud_pedido = ?
    `;

    connection.query(query, [id_solicitud_pedido], (err, results) => {
        if (err) {
            console.error('Error al obtener la solicitud de pedido:', err);
            return res.status(500).json({ error: 'Error al obtener la solicitud de pedido.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Solicitud de pedido no encontrada.' });
        }

        res.json(results[0]);
    });
};



// Listar solicitudes no anuladas y no completadas
module.exports.listarSolicitudesPedidosClientes = (req, res) => {
    const query = `
        SELECT 
            id_solicitud_pedido, 
            id_usuario, 
            fecha_pedido, 
            fecha_entrega, 
            anulado, 
            direccion_entrega, 
            estado 
        FROM solicitudpedidos
        WHERE estado != 1 AND anulado = 0
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al listar las solicitudes de pedidos:', err);
            return res.status(500).json({ error: 'Error al listar las solicitudes de pedidos.' });
        }
        res.json(results);
    });
};

// Listar todas las solicitudes de pedidos
module.exports.listarSolicitudesPedidosClientestodos = (req, res) => {
    const query = `
        SELECT 
            id_solicitud_pedido, 
            id_usuario, 
            fecha_pedido, 
            fecha_entrega, 
            anulado, 
            direccion_entrega, 
            estado 
        FROM solicitudpedidos
      
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al listar las solicitudes de pedidos:', err);
            return res.status(500).json({ error: 'Error al listar las solicitudes de pedidos.' });
        }
        res.json(results);
    });
};



// Listar todas las solicitudes de pedidos de un usuario específico
module.exports.listarSolicitudesPedidosPorUsuario = (req, res) => {
    const { id_usuario } = req.params;
     
    if (!id_usuario) {
        return res.status(400).json({ error: 'ID del usuario es requerido.' });
    }

    const query = `
        SELECT 
            id_solicitud_pedido, 
            id_usuario, 
            fecha_pedido, 
            fecha_entrega, 
            anulado, 
            direccion_entrega, 
            estado 
        FROM solicitudpedidos
        WHERE id_usuario = ? AND anulado = 0
    `;

    connection.query(query, [id_usuario], (err, results) => {
        if (err) {
            console.error('Error al listar las solicitudes de pedidos del usuario:', err);
            return res.status(500).json({ error: 'Error al listar las solicitudes de pedidos del usuario.' });
        }

        res.json(results);
    });
};

// Completar un pedido cambiando su estado a 'Completado'
module.exports.completarPedido = (req, res) => {
    const { id_solicitud_pedido } = req.params;

    if (!id_solicitud_pedido) {
        return res.status(400).json({ error: 'ID de la solicitud de pedido es requerido.' });
    }

    const query = `
        UPDATE solicitudpedidos
        SET estado = 1
        WHERE id_solicitud_pedido = ?
    `;

    connection.query(query, [id_solicitud_pedido], (err, result) => {
        if (err) {
            console.error('Error al completar el pedido:', err);
            return res.status(500).json({ error: 'Error al completar el pedido.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado.' });
        }

        res.json({ message: 'Pedido completado correctamente.' });
    });
};
