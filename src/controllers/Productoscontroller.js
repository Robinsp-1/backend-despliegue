const mysql = require('mysql');
const connection = require('../models/db');


// Registrar un nuevo producto
module.exports.registrarProducto = (req, res) => {

    const { nombre, descripcion, stock, estado, fecha_ingreso, precio, precio_mayorista, unidad_medida, categoria, ctd_mayorista } = req.body;
    const imagen_url = req.file ? req.file.filename : null;

    if (!nombre || isNaN(estado) || !fecha_ingreso || !precio || !precio_mayorista || !unidad_medida || !categoria) {
        return res.status(400).json({ error: 'Faltan campos obligatorios o hay valores inválidos.' });
    }

    const query = `
        INSERT INTO productos (nombre, descripcion, stock, estado, fecha_ingreso, precio, precio_mayorista, unidad_medida, categoria, imagen_url, ctd_mayorista, anulado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `;

    const values = [
        nombre,
        descripcion || null,
        stock || 0,
        estado,
        fecha_ingreso,
        precio,
        precio_mayorista,
        unidad_medida,
        categoria,
        imagen_url,
        ctd_mayorista || 0
    ];

    connection.query(query, values, (err, results) => {
        if (err) {
            console.error('Error al insertar el producto:', err);
            return res.status(500).json({ error: 'Error al insertar el producto.' });
        }
        res.status(201).json({ id: results.insertId });
    });
};

// Listar todos los productos
module.exports.listarProductos = (req, res) => {
    const query = `
        SELECT id_producto, nombre, descripcion, stock, estado, fecha_ingreso, precio, precio_mayorista, unidad_medida, categoria, imagen_url, ctd_mayorista
        FROM productos
        WHERE anulado = 0
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al listar los productos:', err);
            return res.status(500).send('Error al listar los productos');
        }

        const baseUrl = 'https://back.capulina.store/Imagenes/productos/';

        const productosConImagenes = results.map(producto => {
            return {
                ...producto,
                imagen_url: `${baseUrl}${producto.imagen_url}`
            };
        });

        res.json(productosConImagenes);
    });
};

// Actualizar un producto
module.exports.actualizarProducto = (req, res) => {
    const { id_producto } = req.params;
    const { nombre, descripcion, stock, estado, fecha_ingreso, precio, precio_mayorista, unidad_medida, categoria, ctd_mayorista } = req.body;

    let imagen_url = null;

    if (req.file) {
        imagen_url = req.file.filename;
    } else if (req.body.imagen_url) {
        imagen_url = req.body.imagen_url.split('/').pop();
    }

    const query = `
        UPDATE productos 
        SET nombre = ?, descripcion = ?, stock = ?, estado = ?, fecha_ingreso = ?, precio = ?, precio_mayorista = ?, unidad_medida = ?, categoria = ?, ctd_mayorista = ?${imagen_url ? ', imagen_url = ?' : ''}
        WHERE id_producto = ?
    `;

    const values = [
        nombre,
        descripcion || null,
        stock || 0,
        estado,
        fecha_ingreso,
        precio,
        precio_mayorista,
        unidad_medida,
        categoria,
        ctd_mayorista || 0,
        ...(imagen_url ? [imagen_url] : []),
        id_producto
    ];

    connection.query(query, values, (err, result) => {
        if (err) {
            console.error('Error al actualizar el producto:', err);
            return res.status(500).json({ error: 'Error al actualizar el producto' });
        }
        res.status(200).json({ message: 'Producto actualizado exitosamente' });
    });
};


// Eliminar producto (marcar como anulado)
module.exports.eliminarProducto = (req, res) => {
    const { id_producto } = req.params;

    const updateAnuladoQuery = 'UPDATE productos SET anulado = 1 WHERE id_producto = ?';

    connection.query(updateAnuladoQuery, [id_producto], (err, result) => {
        if (err) {
            console.error('Error al anular el producto:', err);
            return res.status(500).send('Error al anular el producto');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Producto no encontrado');
        }

        res.status(200).send('Producto anulado exitosamente');
    });
};
// Obtener un producto por su ID
module.exports.listarproductoporid = (req, res) => {
    const { id_producto } = req.params;
    const query = `
        SELECT id_producto, nombre, descripcion, stock, estado, fecha_ingreso, precio, precio_mayorista, unidad_medida, categoria, imagen_url, ctd_mayorista
        FROM productos
        WHERE id_producto = ? AND anulado = 0
    `;

    connection.query(query, [id_producto], (err, results) => {
        if (err) {
            console.error('Error al obtener el producto:', err);
            return res.status(500).send('Error al obtener el producto');
        }

        if (results.length === 0) {
            return res.status(404).send('Producto no encontrado');
        }

        const baseUrl = 'https://back.capulina.store/Imagenes/productos/';
        const producto = results[0];
        producto.imagen_url = `${baseUrl}${producto.imagen_url}`;

        res.json(producto);
    });
};

