const express = require('express');
const connection = require('../models/db');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;


// Registrar usuario
module.exports.registrarusuario = async (req, res) => {
    const { nombres, apellidos, nombre_user, telefono, direccion, fecha_registro, dpi, nit, estado, contraseña, aplica_credito } = req.body;

    if (!nombres || !estado || isNaN(aplica_credito)) {
        return res.status(400).json({ error: 'Faltan campos obligatorios o hay valores inválidos.' });
    }

    try {
        // Verificar si el nombre de usuario ya existe
        const checkQuery = 'SELECT COUNT(*) AS count FROM usuarios WHERE nombre_user = ?';
        connection.query(checkQuery, [nombre_user], async (err, results) => {
            if (err) {
                console.error('Error al verificar el usuario:', err);
                return res.status(500).json({ error: 'Error al verificar el usuario.' });
            }

            if (results[0].count > 0) {
                return res.status(400).json({ error: 'El nombre de usuario ya está en uso.' });
            }

            try {
                const hashedPassword = await bcrypt.hash(contraseña, saltRounds);

                const query = `
                    INSERT INTO usuarios (nombres, apellidos, nombre_user, telefono, direccion, fecha_registro, dpi, nit, estado, contraseña, aplica_credito, anulado, cambio_contraseña)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
                `;

                const values = [
                    nombres, 
                    apellidos || null, 
                    nombre_user || null, 
                    telefono || null, 
                    direccion || null, 
                    fecha_registro || null, 
                    dpi || null, 
                    nit || null, 
                    estado, 
                    hashedPassword,  
                    aplica_credito
                ];

                connection.query(query, values, (err, results) => {
                    if (err) {
                        console.error('Error al insertar el usuario:', err);
                        return res.status(500).json({ error: 'Error al insertar el usuario.' });
                    }
                    res.status(201).json({ id: results.insertId });
                });
            } catch (err) {
                console.error('Error al encriptar la contraseña:', err);
                res.status(500).json({ error: 'Error al encriptar la contraseña.' });
            }
        });
    } catch (err) {
        console.error('Error al registrar el usuario:', err);
        res.status(500).json({ error: 'Error al registrar el usuario.' });
    }
};



// Asignar un rol a un usuario
module.exports.asignarol = (req, res) => {
    const { rol_id, id_usuario } = req.body;
    const queryUsuarioRol = 'INSERT INTO usuariorol (id_usuario, rol_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE rol_id = ?';

    connection.query(queryUsuarioRol, [id_usuario, rol_id, rol_id], (err, result) => {
        if (err) {
            console.error('Error al asignar el rol:', err);
            res.status(500).send('Error al asignar el rol');
            return;
        }
        res.status(201).send({ message: 'Rol asignado exitosamente' });
    });
};



// Listar usuarios con búsqueda
module.exports.listarusuariosbusqueda = (req, res) => {
    const searchQuery = req.query.q || '';

    const query = `
        SELECT 
            u.id_usuario AS id, 
            u.nombres, 
            u.apellidos, 
            u.nombre_user, 
            u.telefono, 
            u.direccion, 
            u.fecha_registro, 
            u.dpi, 
            u.nit, 
            u.estado, 
            u.contraseña, 
            u.aplica_credito, 
            r.nombre AS rol
        FROM usuarios u
        LEFT JOIN usuariorol ur ON u.id_usuario = ur.id_usuario
        LEFT JOIN roles r ON ur.rol_id = r.rol_id
        WHERE u.anulado = 0
         AND u.estado = 1
        AND (u.nombres LIKE ? OR u.apellidos LIKE ?)
    `;

    const searchValues = [`%${searchQuery}%`, `%${searchQuery}%`];

    connection.query(query, searchValues, (err, results) => {
        if (err) {
            console.error('Error al extraer usuarios:', err);
            return res.status(500).send('Error al extraer usuarios');
        }
        res.json(results);
    });
};


// Listar usuarios
module.exports.listarusuarios = (req, res) => {
    const query = `
        SELECT 
            u.id_usuario AS id, 
            u.nombres, 
            u.apellidos, 
            u.nombre_user, 
            u.telefono, 
            u.direccion, 
            u.fecha_registro, 
            u.dpi, 
            u.nit, 
            u.estado, 
            u.contraseña, 
            u.aplica_credito, 
            r.nombre AS rol
        FROM usuarios u
        LEFT JOIN usuariorol ur ON u.id_usuario = ur.id_usuario
        LEFT JOIN roles r ON ur.rol_id = r.rol_id
        WHERE u.anulado = 0
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al extraer usuarios:', err);
            return res.status(500).send('Error al extraer usuarios');
        }
        res.json(results);
    });
};

// Listar todos los registros 
module.exports.listartodoslosusuarios = (req, res) => {
    const query = `
        SELECT
            id_usuario,
            nombres,
            apellidos,
            nombre_user,
            telefono,
            direccion,
            fecha_registro,
            dpi,
            nit,
            estado,
            aplica_credito,
            anulado,
            contraseña
        FROM usuarios
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al listar los registros:', err);
            return res.status(500).send('Error al listar los registros');
        }
        res.json(results);
    });
};
// Restaurar usuario
module.exports.restaurarUsuario = (req, res) => {
    const { id_usuario} = req.params;

    if (!id_usuario) {
        return res.status(400).json({ error: 'ID del usuario es requerido.' });
    }

    const query = `
        UPDATE usuarios
        SET anulado = 0
        WHERE id_usuario = ?
    `;

    connection.query(query, [id_usuario], (err, results) => {
        if (err) {
            console.error('Error al restaurar el usuario:', err);
            return res.status(500).json({ error: 'Error al restaurar el usuario.' });
        }

        res.status(200).json({ message: 'Usuario restaurado exitosamente.' });
    });
};




module.exports.actualizarusuario = async (req, res) => {
    const { id_usuario } = req.params;
    const { nombres, apellidos, nombre_user, telefono, direccion, dpi, nit, estado, contraseña, aplica_credito } = req.body;

    const estadoInt = parseInt(estado, 10);
    const aplicaCreditoInt = parseInt(aplica_credito, 10);

    if (isNaN(estadoInt) || isNaN(aplicaCreditoInt)) {
        return res.status(400).send('Estado o Aplica Crédito no son válidos');
    }

    try {
        let hashedPassword = contraseña;
        
        if (contraseña) {
            hashedPassword = await bcrypt.hash(contraseña, saltRounds);
        }

        const updateUserQuery = `
            UPDATE usuarios 
            SET nombres = ?, apellidos = ?, nombre_user = ?, telefono = ?, direccion = ?, dpi = ?, nit = ?, estado = ?, contraseña = ?, aplica_credito = ? 
            WHERE id_usuario = ?
        `;

        connection.query(updateUserQuery, [nombres, apellidos, nombre_user, telefono, direccion, dpi, nit, estadoInt, hashedPassword, aplicaCreditoInt, id_usuario], (err, result) => {
            if (err) {
                console.error('Error updating user:', err);
                return res.status(500).send('Error al actualizar usuario');
            }

            res.send('Usuario actualizado');
        });
    } catch (err) {
        console.error('Error al encriptar la contraseña:', err);
        res.status(500).json({ error: 'Error al encriptar la contraseña.' });
    }
};

// Eliminar usuario
module.exports.eliminarusuario = (req, res) => {
    const { id_usuario } = req.params;

    const getUserRoleQuery = `
        SELECT r.nombre AS rol
        FROM usuarios u
        LEFT JOIN usuariorol ur ON u.id_usuario = ur.id_usuario
        LEFT JOIN roles r ON ur.rol_id = r.rol_id
        WHERE u.id_usuario = ?
    `;

    connection.query(getUserRoleQuery, [id_usuario], (err, results) => {
        if (err) {
            console.error('Error al extraer el rol:', err);
            return res.status(500).send('Error al extraer el rol del usuario');
        }

        if (results.length === 0) {
            return res.status(404).send('Usuario no encontrado');
        }

        const userRole = results[0].rol;

        if (userRole === 'Administrador') {
            return res.status(403).send('No se puede eliminar un administrador');
        }

        const updateAnuladoQuery = 'UPDATE usuarios SET anulado = 1 WHERE id_usuario = ?';

        connection.query(updateAnuladoQuery, [id_usuario], (err, result) => {
            if (err) {
                console.error('Error al actualizar el usuario:', err);
                return res.status(500).send('Error al actualizar el estado del usuario');
            }

            if (result.affectedRows === 0) {
                return res.status(404).send('Usuario no ecnontrado');
            }

            res.status(200).send('Estado del usuarioa actualizado');
        });
    });
};



// Listar un usuario
module.exports.listarusuario = (req, res) => {
    const { id_usuario } = req.params;
    
    const getUserQuery = `
        SELECT u.*, ur.rol_id 
        FROM usuarios u 
        LEFT JOIN usuariorol ur ON u.id_usuario = ur.id_usuario 
        WHERE u.id_usuario = ?`;

    connection.query(getUserQuery, [id_usuario], (err, result) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Error');
        }

        if (result.length === 0) {
            return res.status(404).send('Usuario no encontrado');
        }

        res.json(result[0]);
    });
};



// Verificar usuario
module.exports.verificarusuario = (req, res) => {
    const { nombre_user, telefono, dpi } = req.body;

    if (!nombre_user || !telefono || !dpi) {
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    const verificarUsuarioQuery = `
        SELECT id_usuario
        FROM usuarios
        WHERE nombre_user = ? AND telefono = ? AND dpi = ? AND anulado = 0
    `;

    connection.query(verificarUsuarioQuery, [nombre_user, telefono, dpi], (err, results) => {
        if (err) {
            console.error('Error al verificar el usuario:', err);
            return res.status(500).json({ error: 'Error al verificar el usuario.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        res.status(200).json({ message: 'Usuario verificado.', id_usuario: results[0].id_usuario });
    });
};


// Cambiar la contraseña del usuario primeringreso
module.exports.cambiarContraseñaprimeringreso = (req, res) => {
    const { id_usuario, nuevaContraseña } = req.body;

    if (!id_usuario || !nuevaContraseña) {
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    bcrypt.hash(nuevaContraseña, 10, (err, hashedContraseña) => {
        if (err) {
            console.error('Error al encriptar la contraseña:', err);
            return res.status(500).json({ error: 'Error al encriptar la contraseña.' });
        }

        const actualizarContraseñaQuery = `
            UPDATE usuarios
            SET contraseña = ?, cambio_contraseña = 0
            WHERE id_usuario = ?
        `;

        connection.query(actualizarContraseñaQuery, [hashedContraseña, id_usuario], (err, results) => {
            if (err) {
                console.error('Error al actualizar la contraseña:', err);
                return res.status(500).json({ error: 'Error al actualizar la contraseña.' });
            }

            res.status(200).json({ message: 'Contraseña actualizada y cambio de contraseña desactivado.' });
        });
    });
};

// Cambiar contraseña recuperacion
module.exports.cambiarContraseña = (req, res) => {
    const { id_usuario, nuevaContraseña } = req.body;


    if (!id_usuario || !nuevaContraseña) {
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    bcrypt.hash(nuevaContraseña, 10, (err, hashedContraseña) => {
        if (err) {
            console.error('Error al encriptar la contraseña:', err);
            return res.status(500).json({ error: 'Error al encriptar la contraseña.' });
        }

        const actualizarContraseñaQuery = `
            UPDATE usuarios
            SET contraseña = ?
            WHERE id_usuario = ?
        `;

        connection.query(actualizarContraseñaQuery, [hashedContraseña, id_usuario], (err, results) => {
            if (err) {
                console.error('Error al actualizar la contraseña:', err);
                return res.status(500).json({ error: 'Error al actualizar la contraseña.' });
            }

            res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
        });
    });
};