const axios = require('axios');
const db = require('../models/db');
const mysql = require('mysql');


module.exports.enviarRecordatorio = async (req, res) => {
    const { phoneNumbers, templateName, templateParams } = req.body;

    if (!phoneNumbers || !templateName || !templateParams) {
        return res.status(400).json({ error: 'Números de teléfono, nombre del template y parámetros son requeridos.' });
    }

    const url = process.env.WHATSAPP_API_URL;
    const token = process.env.WHATSAPP_TOKEN;


    try {
        for (const phone of phoneNumbers) {
            const response = await axios.post(url, {
                messaging_product: "whatsapp",
                to: phone,
                type: "template",
                template: {
                    name: templateName,
                    language: {
                        code: "es_MX"
                    },
                    components: [
                        {
                            type: "body",
                            parameters: templateParams.map(param => ({
                                type: "text",
                                text: param.text
                            }))
                        }
                    ]
                }
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            
        }

        res.status(200).json({ message: 'Recordatorios enviados exitosamente.' });
    } catch (error) {
        console.error('Error al enviar el mensaje:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error al enviar los recordatorios.' });
    }
};


//Programar recordatorios
module.exports.programarRecordatorio = async (req, res) => {
    const { fecha, hora, fecha_pago } = req.body;

    try {
        const result = await db.query(
            'INSERT INTO recordatorios (fecha, hora,fecha_pago) VALUES (?, ?, ?)',
            [fecha, hora, fecha_pago]
        );
        res.status(201).json({ success: true, message: 'Recordatorio programado con éxito', id: result.insertId });
    } catch (error) {
        console.error('Error al programar el recordatorio:', error);
        res.status(500).json({ success: false, message: 'Error al programar el recordatorio' });
    }
};



//Listar recordatorios
module.exports.listarRecordatorios = async (req, res) => {
    try {
        db.query('SELECT * FROM recordatorios ORDER BY fecha, hora ASC', (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                res.status(500).json({ success: false, message: 'Error al listar los recordatorios' });
                return;
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error('Error al listar recordatorios:', error);
        res.status(500).json({ success: false, message: 'Error al listar los recordatorios' });
    }
};


// Recordatorios programados

const queryPromise = (query, values) => {
    return new Promise((resolve, reject) => {
        db.query(query, values, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results); 
            }
        });
    });
};

module.exports.enviarRecordatorioProgramado = async (req, res) => {
    
    const url = process.env.WHATSAPP_API_URL;
    const token = process.env.WHATSAPP_TOKEN;
    const templateName = "recordatorios";

    try {
        // Verificar si la conexión a la base de datos está activa
        if (!db) {
            return res.status(500).json({ error: 'No se pudo conectar a la base de datos.' });
        }
        // Obtener la fecha de pago desde la tabla `recordatorios`
        const recordatorios = await queryPromise('SELECT fecha_pago FROM recordatorios LIMIT 1');

        if (!recordatorios || recordatorios.length === 0) {
            return res.status(400).json({ error: 'No se encontró la fecha de pago.' });
        }

        const fechaPago = recordatorios[0]?.fecha_pago || null;
        console.log('Fecha de pago:', fechaPago);

        if (!fechaPago) {
            return res.status(400).json({ error: 'No se pudo obtener la fecha de pago.' });
        }

        // Obtener los usuarios con crédito que tienen número de celular
        const usuarios = await queryPromise(
            `SELECT u.telefono, c.credito_usado 
             FROM usuarios u 
             INNER JOIN creditos c ON u.id_usuario = c.id_usuario 
             WHERE u.aplica_credito = 1 AND u.telefono IS NOT NULL`
        );

        console.log('Usuarios obtenidos:', usuarios);

        if (!usuarios || usuarios.length === 0) {
            return res.status(404).json({ message: 'No hay usuarios para enviar recordatorios.' });
        }

        // Enviar mensajes a todos los usuarios obtenidos
        for (const usuario of usuarios) {
            const phone = `502${usuario.telefono}`;
            const montoPago = usuario.credito_usado?.toString() || "0";

            const templateParams = [
                { type: "text", text: montoPago },
                { type: "text", text: fechaPago }
            ];

            console.log('Enviando mensaje a:', phone, 'con params:', templateParams);

            await axios.post(url, {
                messaging_product: "whatsapp",
                to: phone,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: "es_MX" },
                    components: [
                        {
                            type: "body",
                            parameters: templateParams
                        }
                    ]
                }
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }

        res.status(200).json({ message: 'Recordatorios enviados exitosamente.' });

    } catch (error) {
        console.error('Error al enviar el mensaje:', error?.response?.data || error.message);
        res.status(500).json({ error: 'Error al enviar los recordatorios.' });
    }
};
