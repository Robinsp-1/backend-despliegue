const connection = require('../models/db');

module.exports.registrar_rol = (req, res) => {
    const { usuarioId, rol } = req.body;

    const query = 'INSERT INTO roles (usuario_id, rol) VALUES (?, ?)';

    connection.query(query, [usuarioId, rol], (err, result) => {
        if (err) {
            console.error('Error al insertar rol:', err);
            res.status(500).send('Error al insertar rol');
            return;
        }
        res.status(201).send({ id: result.insertId, message: 'Rol registrado' });
    });
};
