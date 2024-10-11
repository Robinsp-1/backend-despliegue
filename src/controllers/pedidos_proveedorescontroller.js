const mysql = require('mysql');
const connection =require('../models/db')

// Registrar un nuevo pedido
module.exports.registrarPedido = async (req, res) => {
    const { id_proveedor, fecha_pedido, fecha_estimada_entrega, anular, estado } = req.body;


    if (!id_proveedor || !fecha_pedido || !fecha_estimada_entrega || estado === null) {
        return res.status(400).json({ error: 'Por favor, complete todos los campos obligatorios.' });
    }

    try {
        const result = await connection.query(
            'INSERT INTO pedidosproveedores (id_proveedor, fecha_pedido, fecha_estimada_entrega, anular, estado) VALUES (?, ?, ?, ?, ?)',
            [id_proveedor, fecha_pedido, fecha_estimada_entrega, anular, estado]
        );

        res.status(201).json({ message: 'Pedido registrado exitosamente', pedidoId: result.insertId });
    } catch (error) {
        console.error('Error al registrar el pedido:', error);
        res.status(500).json({ error: 'No se pudo registrar el pedido' });
    }
};

// Listar todos los pedidos menos los anulados
module.exports.listarPedidos = (req, res) => {
    const query = `
        SELECT 
            id_pedido, 
            id_proveedor, 
            fecha_pedido, 
            fecha_estimada_entrega, 
            anular, 
            estado 
        FROM pedidosproveedores
        WHERE anular = 0
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al listar los pedidos:', err);
            return res.status(500).send('Error al listar los pedidos');
        }
        res.json(results);
    });
};


// Listar todos los pedidos.
module.exports.listartodoslospedidos = (req, res) => {
    const query =`
        SELECT
    id_pedido,
        id_proveedor,
        fecha_pedido,
        fecha_estimada_entrega,
        anular,
        estado 
        FROM pedidosproveedores
        `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al listar los pedidos:', err);
            return res.status(500).send('Error al listar los pedidos');
        }
        res.json(results);
    });
};

// Listar todos los pedidos completados
module.exports.getPedidosCompletados = (req, res) => {
    const query = 'SELECT * FROM pedidosproveedores WHERE estado = ?';

    pool.query(query, [0], (error, results) => {
        if (error) {
            console.error('Error en la consulta:', error);
            return res.status(500).json({ error: 'Error al obtener los pedidos' });
        }
        res.json(results);
    });
};


// Registrar detalles de un pedido
module.exports.registrarDetallePedido = (req, res) => {
    const { id_pedido, productos } = req.body;

    if (id_pedido === undefined || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ error: 'Faltan campos obligatorios o la lista de productos está vacía.' });
    }

    for (const producto of productos) {
        const { id_producto, cantidad, precio_unitario } = producto;

        if (id_producto === undefined || cantidad === undefined || precio_unitario === undefined) {
            return res.status(400).json({ error: 'Faltan campos en uno o más productos.' });
        }

        if (isNaN(cantidad) || isNaN(precio_unitario) || cantidad <= 0 || precio_unitario <= 0) {
            return res.status(400).json({ error: 'Cantidad y precio unitario deben ser números positivos.' });
        }
    }

    const query = `
        INSERT INTO detallespedidosproveedores (id_pedido, id_producto, cantidad, precio_unitario, total)
        VALUES ?
    `;

    const values = productos.map(producto => [
        id_pedido,
        producto.id_producto,
        producto.cantidad,
        producto.precio_unitario,
        producto.cantidad * producto.precio_unitario
    ]);

    connection.query(query, [values], (err, results) => {
        if (err) {
            console.error('Error al insertar los detalles del pedido:', err); 
            return res.status(500).json({ error: 'Error al insertar los detalles del pedido.', details: err.message });
        }
        res.status(201).json({ message: 'Detalles del pedido insertados exitosamente' });
    });
};

//Listar Detalles del pedido
module.exports.listarDetallesPedido = (req, res) => {
    const { id_pedido } = req.params;

    const query = `
        SELECT d.id_detalle_p, d.id_pedido, d.id_producto, p.nombre AS nombre_producto, p.stock, p.precio, d.cantidad, d.precio_unitario, d.total
        FROM detallespedidosproveedores d
        JOIN productos p ON d.id_producto = p.id_producto
        WHERE d.id_pedido = ?
    `;

    connection.query(query, [id_pedido], (err, results) => {
        if (err) {
            console.error('Error al listar los detalles del pedido:', err);
            return res.status(500).json({ error: 'Error al listar los detalles del pedido.' });
        }
        res.json(results);
    });
};

// Marcar un pedido como anulado
module.exports.eliminarPedido = (req, res) => {
    const { id_pedido } = req.params;

    if (!id_pedido) {
        return res.status(400).json({ error: 'ID del pedido es requerido.' });
    }

    const query = 'UPDATE pedidosproveedores SET anular = ? WHERE id_pedido = ?';

    connection.query(query, [1, id_pedido], (err, results) => {
        if (err) {
            console.error('Error al marcar el pedido como anulado:', err);
            return res.status(500).json({ error: 'Error al marcar el pedido como anulado.' });
        }

        res.status(200).json({ message: 'Pedido marcado como anulado exitosamente.' });
    });
};

// Obtener los detalles de un pedido específico
module.exports.obtenerPedido = (req, res) => {
    const { id_pedido } = req.params;

    if (!id_pedido) {
        return res.status(400).json({ error: 'ID del pedido es requerido.' });
    }

    const query = `
        SELECT 
            id_pedido, 
            id_proveedor, 
            fecha_pedido, 
            fecha_estimada_entrega, 
            anular, 
            estado 
        FROM pedidosproveedores
        WHERE id_pedido = ?
    `;

    connection.query(query, [id_pedido], (err, results) => {
        if (err) {
            console.error('Error al obtener el pedido:', err);
            return res.status(500).json({ error: 'Error al obtener el pedido.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado.' });
        }

        res.json(results[0]);
    });
};

// Actualizar los datos de un pedido
module.exports.actualizarPedido = (req, res) => {
    const { id_pedido } = req.params;
    const { id_proveedor, fecha_pedido, fecha_estimada_entrega, estado } = req.body;

    if (!id_proveedor || !fecha_pedido || estado === null) {
        return res.status(400).json({ error: 'Por favor, complete todos los campos obligatorios.' });
    }

    const query = `
        UPDATE pedidosproveedores
        SET id_proveedor = ?, fecha_pedido = ?, fecha_estimada_entrega = ?, estado = ?
        WHERE id_pedido = ?
    `;

    connection.query(query, [id_proveedor, fecha_pedido, fecha_estimada_entrega, estado, id_pedido], (err, results) => {
        if (err) {
            console.error('Error al actualizar el pedido:', err);
            return res.status(500).json({ error: 'Error al actualizar el pedido.' });
        }

        res.status(200).json({ message: 'Pedido actualizado exitosamente.' });
    });
};


module.exports.actualizarDetallePedido = (req, res) => {
    const { id_pedido, id_producto } = req.params;
    const { cantidad, precio_unitario } = req.body;

    if (!id_pedido || !id_producto || cantidad === undefined || precio_unitario === undefined) {
        return res.status(400).json({ error: 'ID del pedido, ID del producto, cantidad y precio unitario son requeridos.' });
    }

    const subtotal = cantidad * precio_unitario;

    const query = `
        UPDATE detallespedidosproveedores
        SET cantidad = ?, precio_unitario = ?, total = ?
        WHERE id_pedido = ? AND id_producto = ?
    `;

    connection.query(query, [cantidad, precio_unitario, subtotal, id_pedido, id_producto], (err, results) => {
        if (err) {
            console.error('Error al actualizar los detalles del pedido:', err);
            return res.status(500).json({ error: 'Error al actualizar los detalles del pedido.' });
        }

        res.status(200).json({ message: 'Detalles del pedido actualizados exitosamente.' });
    });
};


// Eliminar detalle de un pedido
module.exports.eliminarDetallePedido = (req, res) => {
    const { id_pedido, id_producto } = req.params;

    if (!id_pedido || !id_producto) {
        return res.status(400).json({ error: 'ID del pedido y del producto son requeridos.' });
    }


    const query = 'DELETE FROM detallespedidosproveedores WHERE id_pedido = ? AND id_producto = ?';

    connection.query(query, [id_pedido, id_producto], (err, results) => {
        if (err) {
            console.error('Error al eliminar el producto del pedido:', err);
            return res.status(500).json({ error: 'Error al eliminar el producto del pedido.' });
        }

        res.status(200).json({ message: 'Producto eliminado correctamente del pedido.' });
    });
};


//  Restaurar pedido
module.exports.restaurarPedido = (req, res) => {
    const { id_pedido } = req.params;

    if (!id_pedido) {
        return res.status(400).json({ error: 'ID del pedido es requerido.' });
    }

    const query = `
        UPDATE pedidosproveedores
        SET anular = 0
        WHERE id_pedido = ?
    `;

    connection.query(query, [id_pedido], (err, results) => {
        if (err) {
            console.error('Error al restaurar el pedido:', err);
            return res.status(500).json({ error: 'Error al restaurar el pedido.' });
        }

        res.status(200).json({ message: 'Pedido restaurado exitosamente.' });
    });
};


