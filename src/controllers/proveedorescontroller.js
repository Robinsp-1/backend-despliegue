const express = require('express');
const connection = require('../models/db');
const router = express.Router();

// Backend - Restaurar proveedor
module.exports.restaurarProveedor = (req, res) => {
    const { id_proveedor } = req.params;

    if (!id_proveedor) {
        return res.status(400).json({ error: 'ID del proveedor es requerido.' });
    }

    const query = `
        UPDATE proveedores
        SET anulado = 0
        WHERE id_proveedor = ?
    `;

    connection.query(query, [id_proveedor], (err, results) => {
        if (err) {
            console.error('Error al restaurar el proveedor:', err);
            return res.status(500).json({ error: 'Error al restaurar el proveedor.' });
        }

        res.status(200).json({ message: 'Proveedor restaurado exitosamente.' });
    });
};


// Listar todos los registros de la tabla proveedores.
module.exports.listartodoslosproveedores = (req, res) => {
    const query = `
        SELECT
            id_proveedor,
            nombre_proveedor,
            empresa,
            telefono,
            fecha_registro,
            estado,
            anulado,
            direccion
        FROM proveedores
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al listar los proveedores:', err);
            return res.status(500).send('Error al listar los proveedores');
        }
        res.json(results);
    });
};

// Insertar un nuevo proveedor
module.exports.registrarProveedor = (req, res) => {
    const { nombre_proveedor, empresa, telefono, fecha_registro, estado, direccion } = req.body;


    if (!nombre_proveedor || isNaN(estado)) {
        return res.status(400).json({ error: 'Faltan campos obligatorios o hay valores inválidos.' });
    }

 
    const query = `
        INSERT INTO proveedores (nombre_proveedor, empresa, telefono, fecha_registro, estado, anulado, direccion)
        VALUES (?, ?, ?, ?, ?, 0, ?)
    `;

    const values = [
        nombre_proveedor,
        empresa || null,
        telefono || null,
        fecha_registro || null,
        estado,
        direccion || null
    ];

    connection.query(query, values, (err, results) => {
        if (err) {
            console.error('Error al insertar el proveedor:', err);
            return res.status(500).json({ error: 'Error al insertar el proveedor.' });
        }
        res.status(201).json({ id: results.insertId });
    });
};

// Listar todos los proveedores
module.exports.listarProveedores = (req, res) => {
    const query = `
        SELECT 
            id_proveedor, 
            nombre_proveedor, 
            empresa, 
            telefono, 
            fecha_registro, 
            estado, 
            direccion
        FROM proveedores
        WHERE anulado = 0
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al listar los proveedores:', err);
            return res.status(500).send('Error al listar los proveedores');
        }
        res.json(results);
    });
};

// Actualizar proveedor
module.exports.actualizarProveedor = (req, res) => {
    const { id_proveedor } = req.params;
    const { nombre_proveedor, empresa, telefono, fecha_registro, estado, direccion } = req.body;

    const estadoInt = parseInt(estado, 10);

    if (isNaN(estadoInt)) {
        res.status(400).send('Estado no es válido');
        return;
    }

    const updateProveedorQuery = `
        UPDATE proveedores 
        SET nombre_proveedor = ?, empresa = ?, telefono = ?, estado = ?, direccion = ? 
        WHERE id_proveedor = ?
    `;

    connection.query(updateProveedorQuery, [nombre_proveedor, empresa, telefono, estadoInt, direccion, id_proveedor], (err, result) => {
        if (err) {
            console.error('Error al actualizar el proveedor:', err);
            return res.status(500).send('Error al actualizar el proveedor');
        }

        res.send('Proveedor actualizado exitosamente');
    });
};

// Eliminar proveedor (marcar como anulado)
module.exports.eliminarProveedor = (req, res) => {
    const { id_proveedor } = req.params;

    const updateAnuladoQuery = 'UPDATE proveedores SET anulado = 1 WHERE id_proveedor = ?';

    connection.query(updateAnuladoQuery, [id_proveedor], (err, result) => {
        if (err) {
            console.error('Error al anular el proveedor:', err);
            return res.status(500).send('Error al anular el proveedor');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Proveedor no encontrado');
        }

        res.status(200).send('Proveedor anulado exitosamente');
    });
};

// Listar un proveedor por id
module.exports.listarProveedor = (req, res) => {
    const { id_proveedor } = req.params;

    const getProveedorQuery = `
        SELECT id_proveedor, nombre_proveedor, empresa, telefono, fecha_registro, estado, direccion
        FROM proveedores 
        WHERE id_proveedor = ? AND anulado = 0
    `;

    connection.query(getProveedorQuery, [id_proveedor], (err, result) => {
        if (err) {
            console.error('Error al obtener el proveedor:', err);
            return res.status(500).send('Error al obtener el proveedor');
        }

        if (result.length === 0) {
            return res.status(404).send('Proveedor no encontrado');
        }

        res.json(result[0]);
    });
};


