const conection = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports.login = (req, res) => {
    const { username, password } = req.body;


    const consult = `
    SELECT u.id_usuario, u.nombre_user, u.contraseña AS hashedPassword, u.nombres, r.nombre AS role, u.cambio_contraseña, u.anulado
    FROM usuarios u
    JOIN usuariorol ur ON u.id_usuario = ur.id_usuario
    JOIN roles r ON ur.rol_id = r.rol_id
    WHERE u.nombre_user = ?
    `;

    try {
        conection.query(consult, [username], async (err, result) => {
            if (err) {
                console.error('Error en la consulta de la base de datos:', err);
                return res.status(500).send({ message: 'Error en la consulta de la base de datos' });
            }

            if (result.length > 0) {
                const user = result[0];

                // Verifica si el usuario está anulado
                if (user.anulado === 1) {
                    return res.status(403).send({ message: 'Cuenta anulada, no se puede acceder' });
                }

                const match = await bcrypt.compare(password, user.hashedPassword);

                if (match) {
                    const token = jwt.sign({
                        username: user.nombre_user,
                        id_usuario: user.id_usuario,
                        role: user.role,
                        nombres: user.nombres,
                        cambio_contraseña: user.cambio_contraseña
                    }, "Stack", {
                        expiresIn: '12h'
                    });

                    return res.send({ token });
                } else {
                    return res.status(401).send({ message: 'Usuario o contraseña incorrectos' });
                }
            } else {
                return res.status(401).send({ message: 'Usuario o contraseña incorrectos' });
            }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).send({ message: 'Error en el servidor' });
    }
};
