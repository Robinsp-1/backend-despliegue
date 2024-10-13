const db = require('../models/db');

// Obtener los creditos menos los anulados
module.exports.listarCreditos = async (req, res) => {
    try {
        db.query(`
            SELECT c.id_credito, c.id_usuario, u.nombres, c.limite_credito, c.tiempo_pago, 
                   c.estado, c.mora, c.fecha_asignado, c.credito_usado 
            FROM creditos c
            JOIN usuarios u ON c.id_usuario = u.id_usuario
            WHERE c.anulado = 0
            ORDER BY c.fecha_asignado ASC
        `, (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                res.status(500).json({ success: false, message: 'Error al listar los créditos' });
                return;
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error('Error al listar créditos:', error);
        res.status(500).json({ success: false, message: 'Error al listar los créditos' });
    }
};

// Obtener los creditos por usuario
module.exports.listarCreditosusuarios = async (req, res) => {
    const { id_usuario } = req.params;

    if (!id_usuario) {
        return res.status(400).json({ success: false, message: 'ID de usuario es requerido' });
    }

    try {
        db.query('SELECT * FROM creditos WHERE id_usuario = ? ORDER BY fecha_asignado ASC', [id_usuario], (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                res.status(500).json({ success: false, message: 'Error al listar los créditos' });
                return;
            }

            if (results.length === 0) {
                return res.status(404).json({ success: false, message: 'No se encontraron créditos para este usuario' });
            }

            res.status(200).json(results[0]); 
        });

    } catch (error) {
        console.error('Error al listar créditos:', error);
        res.status(500).json({ success: false, message: 'Error al listar los créditos' });
    }
};

// Obtener el crédito usado por usuario

module.exports.listarCreditosusuarioswsp = async (req, res) => {
    const { id_usuario } = req.params;

    if (!id_usuario) {
        return res.status(400).json({ success: false, message: 'ID de usuario es requerido' });
    }

    console.log("ID de usuario recibido:", id_usuario); // Para depurar el valor de id_usuario

    try {
        // Modificamos la consulta para obtener el crédito con el valor más alto de crédito_usado
        db.query(`
            SELECT MAX(credito_usado) AS credito_usado 
            FROM creditos 
            WHERE id_usuario = ? AND anulado = 0
        `, [id_usuario], (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                return res.status(500).json({ success: false, message: 'Error al listar los créditos' });
            }

            if (results.length === 0 || results[0].credito_usado === null) {
                return res.status(404).json({ success: false, message: 'No se encontró ningún crédito usado para este usuario' });
            }

            const credito = results[0].credito_usado || '0'; // Valor por defecto si no hay crédito usado
            console.log("Crédito usado encontrado:", credito); // Para ver el valor encontrado
            return res.status(200).json({ credito_usado: credito });
        });

    } catch (error) {
        console.error('Error al listar créditos:', error);
        return res.status(500).json({ success: false, message: 'Error al listar los créditos' });
    }
};



// Obtener los creditos de los usuarios
module.exports.listarUsuarioscredito = async (req, res) => {
    try {
        db.query(`
            SELECT u.id_usuario, u.nombres, u.telefono, u.aplica_credito, c.credito_usado
            FROM usuarios u
            LEFT JOIN creditos c ON u.id_usuario = c.id_usuario
            WHERE u.telefono IS NOT NULL 
              AND u.aplica_credito = 1
              AND u.anulado = 0
              AND c.credito_usado > 0
            ORDER BY u.id_usuario
        `, (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                return res.status(500).json({ success: false, message: 'Error al listar usuarios' });
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ success: false, message: 'Error al listar usuarios' });
    }
};


// Obtener los creditos
module.exports.listarTodosLosCreditos = async (req, res) => {
    try {
        db.query(`
            SELECT c.id_credito, c.id_usuario, u.nombres, c.limite_credito, c.tiempo_pago, 
                   c.estado, c.mora, c.fecha_asignado, c.credito_usado, c.anulado
            FROM creditos c
            JOIN usuarios u ON c.id_usuario = u.id_usuario
            ORDER BY c.fecha_asignado ASC
        `, (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                res.status(500).json({ success: false, message: 'Error al listar los créditos' });
                return;
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error('Error al listar créditos:', error);
        res.status(500).json({ success: false, message: 'Error al listar los créditos' });
    }
};


// Crear credito
module.exports.insertarCredito = async (req, res) => {
    const { id_usuario, limite_credito, tiempo_pago, estado, mora, fecha_asignado, credito_usado } = req.body;

    try {

        db.query(`
            SELECT aplica_credito 
            FROM usuarios 
            WHERE id_usuario = ?
        `, [id_usuario], (error, results) => {
            if (error) {
                console.error('Error al verificar el usuario:', error);
                res.status(500).json({ success: false, message: 'Error al verificar el usuario' });
                return;
            }

            if (results.length === 0) {
                res.status(404).json({ success: false, message: 'Usuario no encontrado' });
                return;
            }

            // Verificamos si el usuario aplica para crédito
            const aplicaCredito = results[0].aplica_credito;

            if (aplicaCredito !== 1) {
                res.status(403).json({ success: false, message: 'El usuario no aplica para créditos' });
                return;
            }

            // Si aplica para crédito, procedemos a insertar el crédito
            db.query(`
                INSERT INTO creditos (id_usuario, limite_credito, tiempo_pago, estado, mora, fecha_asignado, credito_usado, anulado)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            `, [id_usuario, limite_credito, tiempo_pago, estado, mora, fecha_asignado, credito_usado], (error, results) => {
                if (error) {
                    console.error('Error en la consulta:', error);
                    res.status(500).json({ success: false, message: 'Error al asignar el crédito' });
                    return;
                }
                res.status(201).json({ success: true, message: 'Crédito asignado exitosamente' });
            });
        });
    } catch (error) {
        console.error('Error al insertar crédito:', error);
        res.status(500).json({ success: false, message: 'Error al asignar el crédito' });
    }
};


// Editar credito
module.exports.editarCredito = async (req, res) => {
    const { id } = req.params;
    const { limite_credito, tiempo_pago, estado, mora, credito_usado } = req.body;

    try {
        db.query(`
            UPDATE creditos
            SET limite_credito = ?, tiempo_pago = ?, estado = ?, mora = ?, credito_usado = ?
            WHERE id_credito = ?
        `, [limite_credito, tiempo_pago, estado, mora, credito_usado, id], (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                res.status(500).json({ success: false, message: 'Error al actualizar el crédito' });
                return;
            }
            res.status(200).json({ success: true, message: 'Crédito actualizado exitosamente' });
        });
    } catch (error) {
        console.error('Error al actualizar crédito:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el crédito' });
    }
};


// Anular credito
module.exports.anularCredito = async (req, res) => {
    const { id } = req.params;

    try {
        db.query(`
            UPDATE creditos
            SET anulado = 1
            WHERE id_credito = ?
        `, [id], (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                res.status(500).json({ success: false, message: 'Error al anular el crédito' });
                return;
            }
            res.status(200).json({ success: true, message: 'Crédito anulado exitosamente' });
        });
    } catch (error) {
        console.error('Error al anular crédito:', error);
        res.status(500).json({ success: false, message: 'Error al anular el crédito' });
    }
};

// Listar usuarios sin credito
module.exports.listarusuariossincreditos = (req, res) => {
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
        LEFT JOIN creditos c ON u.id_usuario = c.id_usuario
        WHERE u.anulado = 0
        AND c.id_usuario IS NULL
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al extraer usuarios:', err);
            return res.status(500).send('Error al extraer usuarios');
        }
        res.json(results);
    });
};

// Obtener credito por id 
module.exports.obtenerCreditoPorId = (req, res) => {
    const { id_credito } = req.params;

    const query = `
        SELECT 
            c.id_credito, 
            c.id_usuario, 
            u.nombres AS nombre_usuario,
            c.limite_credito, 
            c.tiempo_pago, 
            c.mora, 
            c.fecha_asignado, 
            c.credito_usado, 
            c.estado, 
            c.anulado 
        FROM creditos c
        JOIN usuarios u ON c.id_usuario = u.id_usuario
        WHERE c.id_credito = ?
    `;

    db.query(query, [id_credito], (err, results) => {
        if (err) {
            console.error('Error al obtener el crédito:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener el crédito' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Crédito no encontrado' });
        }

        res.status(200).json({ success: true, data: results[0] });
    });
};

//  Restaurar crédito
module.exports.restaurarCredito = (req, res) => {
    const { id_credito } = req.params;

    if (!id_credito) {
        return res.status(400).json({ error: 'ID del crédito es requerido.' });
    }

    const query = `
        UPDATE creditos
        SET anulado = 0
        WHERE id_credito = ?
    `;

    db.query(query, [id_credito], (err, results) => {
        if (err) {
            console.error('Error al restaurar el crédito:', err);
            return res.status(500).json({ error: 'Error al restaurar el crédito.' });
        }

        res.status(200).json({ message: 'Crédito restaurado exitosamente.' });
    });
};

// Listar usuarios con búsqueda y que aplican crédito
module.exports.listarusuariosbusquedacredito = (req, res) => {
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
            r.nombre AS rol,
            c.id_credito,
            c.limite_credito,
            c.mora,
            c.credito_usado
        FROM usuarios u
        LEFT JOIN usuariorol ur ON u.id_usuario = ur.id_usuario
        LEFT JOIN roles r ON ur.rol_id = r.rol_id
        LEFT JOIN creditos c ON u.id_usuario = c.id_usuario
        WHERE u.anulado = 0
        AND u.estado = 1
        AND u.aplica_credito = 1
        AND (u.nombres LIKE ? OR u.apellidos LIKE ?)
    `;

    const searchValues = [`%${searchQuery}%`, `%${searchQuery}%`];

    db.query(query, searchValues, (err, results) => {
        if (err) {
            console.error('Error al extraer usuarios:', err);
            return res.status(500).send('Error al extraer usuarios');
        }
        res.json(results);
    });
};
