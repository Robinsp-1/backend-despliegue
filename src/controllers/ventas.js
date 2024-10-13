
const connection = require('../models/db');

// Registrar una nueva venta (contado o crédito)

module.exports.registrarVenta = async (req, res) => {
    const { id_usuario, fecha_venta, nit, estado_pago, nombre_cliente, productos, tipo_venta, id_credito, direccion } = req.body;


    if (!fecha_venta || !estado_pago || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ error: 'Por favor, complete todos los campos obligatorios.' });
    }

    if (tipo_venta === 1 && !id_credito) {
        return res.status(400).json({ error: 'Debe proporcionar un crédito válido para la venta al crédito.' });
    }

    try {


        // Iniciar la transacción de la venta
        connection.beginTransaction(async (err) => {
            if (err) throw err;

            // Validar stock de productos
            const stockValidations = productos.map(producto => {
                return new Promise((resolve, reject) => {
                    connection.query(
                        'SELECT stock FROM productos WHERE id_producto = ?',
                        [producto.id_producto],
                        (err, result) => {
                            if (err) return reject(err);
                            if (result.length === 0 || result[0].stock < producto.cantidad) {
                                return reject(new Error(`No hay suficiente stock para el producto ID ${producto.id_producto}`));
                            }
                            resolve();
                        }
                    );
                });
            });

            // Esperar la validación de stock
            Promise.all(stockValidations)
                .then(() => {
                    // Función para registrar la venta al crédito
                    const registrarVentaCredito = (id_credito, totalVenta) => {
                        connection.query(
                            'INSERT INTO ventas (id_usuario, fecha_venta, nit, estado_pago, nombre_cliente, tipo_venta, id_credito, total, anulado) VALUES (?, ?, ?, ?, ?, 1, ?, ?, 0)',
                            [id_usuario, fecha_venta, nit, estado_pago, nombre_cliente, id_credito, totalVenta],
                            (err, result) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        throw err;
                                    });
                                }
                                const id_venta = result.insertId;
                                registrarDetallesVenta(id_venta, totalVenta, id_credito);
                            }
                        );
                    };

                    // Función para registrar la venta al contado
                    const registrarVentaContado = () => {
                        const totalVenta = productos.reduce((acc, prod) => acc + prod.total, 0);
                        connection.query(
                            'INSERT INTO ventas (id_usuario, fecha_venta, nit, estado_pago, nombre_cliente, tipo_venta, id_credito, total, direccion, anulado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)', // Cambié el 1 por el valor de tipo_venta
                            [id_usuario, fecha_venta, nit, estado_pago, nombre_cliente, tipo_venta, id_credito, totalVenta, direccion],
                            (err, result) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        throw err;
                                    });
                                }
                                const id_venta = result.insertId;
                                registrarDetallesVenta(id_venta);
                            }
                        );
                    };

                    // Función común para registrar los detalles de la venta
                    const registrarDetallesVenta = (id_venta, totalVenta = null, id_credito = null) => {
                        const detalleValues = productos.map(producto => [
                            id_venta,
                            producto.id_producto,
                            producto.cantidad,
                            producto.total,
                            producto.precio_unidad
                        ]);

                        connection.query(
                            'INSERT INTO detallesventas (id_venta, id_producto, cantidad, total, precio_unidad) VALUES ?',
                            [detalleValues],
                            (err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        throw err;
                                    });
                                }

                                // Actualizar el stock de productos
                                const updates = productos.map(producto => {
                                    return new Promise((resolve, reject) => {
                                        connection.query(
                                            'UPDATE productos SET stock = stock - ? WHERE id_producto = ?',
                                            [producto.cantidad, producto.id_producto],
                                            (err) => {
                                                if (err) return reject(err);
                                                resolve(producto.id_producto);
                                            }
                                        );
                                    });
                                });

                                // Ejecutar todas las actualizaciones de stock en paralelo
                                Promise.all(updates)
                                    .then(updatedProducts => {
                                        // Cambiar el estado a "no disponible" si el stock es 0
                                        const statusUpdates = updatedProducts.map(id_producto => {
                                            return new Promise((resolve, reject) => {
                                                connection.query(
                                                    'UPDATE productos SET estado = 0 WHERE id_producto = ? AND stock = 0',
                                                    [id_producto],
                                                    (err) => {
                                                        if (err) return reject(err);
                                                        resolve();
                                                    }
                                                );
                                            });
                                        });

                                        return Promise.all(statusUpdates);
                                    })
                                    .then(() => {
                                        // Si es venta al crédito, actualizar el crédito usado
                                        if (tipo_venta === 1) {
                                            connection.query(
                                                'UPDATE creditos SET credito_usado = credito_usado + ? WHERE id_credito = ?',
                                                [totalVenta, id_credito],
                                                (err) => {
                                                    if (err) {
                                                        return connection.rollback(() => {
                                                            throw err;
                                                        });
                                                    }

                                                    connection.commit((err) => {
                                                        if (err) {
                                                            return connection.rollback(() => {
                                                                throw err;
                                                            });
                                                        }
                                                        res.status(201).json({ message: 'Venta al crédito registrada exitosamente', id_venta });
                                                    });
                                                }
                                            );
                                        } else {
                                            // Venta al contado, solo confirmar
                                            connection.commit((err) => {
                                                if (err) {
                                                    return connection.rollback(() => {
                                                        throw err;
                                                    });
                                                }
                                                res.status(201).json({ message: 'Venta registrada exitosamente', id_venta });
                                            });
                                        }
                                    })
                                    .catch(err => {
                                        connection.rollback(() => {
                                            res.status(400).json({ error: err.message });
                                        });
                                    });
                            }
                        );
                    };

                    // Validar si es venta al crédito y si el crédito está disponible
                    if (tipo_venta === 1) {
                        connection.query(
                            'SELECT * FROM creditos WHERE id_credito = ? AND anulado = 0 AND estado = 1',
                            [id_credito],
                            (err, credito) => {
                                if (err) throw err;

                                if (credito.length === 0) {
                                    return res.status(400).json({ error: 'El crédito no está disponible o ha sido anulado.' });
                                }

                                const creditoDisponible = credito[0].limite_credito - credito[0].credito_usado;
                                const totalVenta = productos.reduce((acc, prod) => acc + prod.total, 0);

                                if (totalVenta > creditoDisponible) {
                                    return res.status(400).json({ error: 'El crédito disponible no es suficiente para esta venta.' });
                                }

                                registrarVentaCredito(id_credito, totalVenta);
                            }
                        );
                    } else {
                        // Venta al contado
                        registrarVentaContado();
                    }
                })
                .catch(err => {
                    connection.rollback(() => {
                        res.status(400).json({ error: err.message });
                    });
                });
        });
    } catch (error) {
        console.error('Error al registrar la venta:', error);
        res.status(500).json({ error: 'No se pudo registrar la venta' });
    }
};


//Listar detalles ventas para uso general
module.exports.listarDetallesVenta = async (req, res) => {
    const { id_venta } = req.params;

    if (!id_venta) {
        return res.status(400).json({ error: 'El ID de la venta es obligatorio.' });
    }

    try {

        const query = `
            SELECT dv.id_detalle, dv.cantidad, dv.total, dv.precio_unidad, p.nombre AS nombre_producto
            FROM detallesventas dv
            JOIN productos p ON dv.id_producto = p.id_producto
            WHERE dv.id_venta = ?`;

        connection.query(query, [id_venta], (err, resultados) => {
            if (err) {
                console.error('Error al obtener los detalles de la venta:', err);
                return res.status(500).json({ error: 'Error al obtener los detalles de la venta.' });
            }

            if (resultados.length === 0) {
                return res.status(404).json({ error: 'No se encontraron detalles para la venta.' });
            }


            res.status(200).json(resultados);
        });
    } catch (error) {
        console.error('Error en la solicitud:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Actualizar el NIT de una venta
module.exports.actualizarNitVenta = async (req, res) => {
    const { id_venta } = req.params;
    const { nit, nombre_cliente } = req.body;

    if (!id_venta) {
        return res.status(400).json({ error: 'El ID de la venta es obligatorio.' });
    }

    if (!nit) {
        return res.status(400).json({ error: 'El NIT es obligatorio.' });
    }

    if (!nombre_cliente) {
        return res.status(400).json({ error: 'El nombre del cliente es obligatorio.' });
    }

    try {
        const query = `
            UPDATE ventas
            SET nit = ?, nombre_cliente = ?
            WHERE id_venta = ?`;

        connection.query(query, [nit, nombre_cliente, id_venta], (err, resultados) => {
            if (err) {
                console.error('Error al actualizar el NIT de la venta:', err);
                return res.status(500).json({ error: 'Error al actualizar el NIT de la venta.' });
            }

            if (resultados.affectedRows === 0) {
                return res.status(404).json({ error: 'No se encontró la venta con el ID proporcionado.' });
            }

            res.status(200).json({ message: 'NIT actualizado correctamente.' });
        });
    } catch (error) {
        console.error('Error en la solicitud:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};


// Obtener venta por id_venta para comprobante
module.exports.VentaPorId = (req, res) => {
    const id_venta = req.params.id_venta;


    if (!id_venta) {
        return res.status(400).json({
            success: false,
            message: 'El parámetro id_venta es obligatorio',
        });
    }


    obtenerVentaPorId(id_venta)
        .then((venta) => {
            // Retornar la información de la venta
            res.status(200).json({
                success: true,
                data: venta,
            });
        })
        .catch((error) => {
            console.error('Error al obtener la venta:', error);
            res.status(500).json({ error: 'No se pudo obtener la venta' });
        });
};

// Función para obtener venta por id_venta para factura
module.exports.obtenerVentaPorId = (id_venta) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT v.id_venta, v.fecha_venta, v.nit, v.estado_pago, v.total, v.direccion, motivo_anulacion, autorizacionFEL,
                   u.nombres AS nombre_usuario, v.id_credito, v.nombre_cliente
            FROM ventas v
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
            WHERE v.anulado = 0 AND v.id_venta = ?`;

        connection.query(query, [id_venta], (err, ventas) => {
            if (err) {
                return reject(err);
            }


            if (ventas.length === 0) {
                return reject(new Error('Venta no encontrada'));
            }

            resolve(ventas[0]);
        });
    });
};

// Función para actualizar la venta por id_venta factura
module.exports.actualizarVentaPorId = (id_venta, datosActualizacion) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE ventas
            SET 
                emisionFEL = ?, 
                serieFEL = ?, 
                numeroFEL = ?, 
                autorizacionFEL = ?
            WHERE id_venta = ? AND anulado = 0`;

        const params = [
            datosActualizacion.emisionFEL,
            datosActualizacion.serieFEL,
            datosActualizacion.numeroFEL,
            datosActualizacion.autorizacionFEL,
            id_venta
        ];

        connection.query(query, params, (err, result) => {
            if (err) {
                return reject(err);
            }


            if (result.affectedRows === 0) {
                return reject(new Error('No se pudo actualizar la venta, verifique el ID'));
            }

            resolve({ success: true, message: 'Venta actualizada correctamente' });
        });
    });
};

// Obtener detalles de una venta factura
module.exports.DetallesVentas = async (id_venta) => {
    try {
        return new Promise((resolve, reject) => {
            connection.query(
                `SELECT dv.*, p.nombre
                 FROM detallesventas dv
                 JOIN productos p ON dv.id_producto = p.id_producto
                 WHERE dv.id_venta = ?`,
                [id_venta],
                (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Error al obtener detalles de la venta:', error);
        throw new Error('Error al obtener los detalles de la venta');
    }
};



// Listar ventas sin anulados uso general
module.exports.Ventas = (req, res) => {
    try {
        connection.query(
            `SELECT v.id_venta, v.fecha_venta, v.nit, v.estado_pago, v.total, 
                    v.nombre_cliente, u.nombres AS nombre_usuario, v.id_credito
             FROM ventas v
             LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
             WHERE v.anulado = 0`,
            (err, ventas) => {
                if (err) throw err;

                // Responder con las ventas obtenidas
                res.status(200).json(ventas);
            }
        );
    } catch (error) {
        console.error('Error al listar ventas:', error);
        res.status(500).json({ error: 'No se pudo obtener la lista de ventas' });
    }
};


// Listar solo las ventas anuladas
module.exports.listarVentasAnuladas = (req, res) => {
    try {
        connection.query(
            `SELECT 
                    v.id_venta, 
                    v.fecha_venta, 
                    v.nit, 
                    v.estado_pago, 
                    v.total, 
                    v.anulado, 
                    v.nombre_cliente AS nombre_cliente,  -- Esto es correcto, proviene de 'ventas'
                    v.id_credito
                FROM 
                    ventas v
                LEFT JOIN 
                    usuarios u ON v.id_usuario = u.id_usuario
                WHERE 
                    v.anulado = 1
               `,
            (err, ventas) => {
                if (err) throw err;

                const ventaIds = ventas.map(venta => venta.id_venta);

                // Consulta para obtener los detalles de las ventas anuladas
                connection.query(
                    `SELECT dv.id_venta, dv.id_producto, dv.cantidad, dv.total, dv.precio_unidad
                     FROM detallesventas dv
                     WHERE dv.id_venta IN (?)`,
                    [ventaIds],
                    (err, detalles) => {
                        if (err) throw err;

                        // Agregar los detalles a las ventas correspondientes
                        const ventasConDetalles = ventas.map(venta => {
                            return {
                                ...venta,
                                detalles: detalles.filter(detalle => detalle.id_venta === venta.id_venta)
                            };
                        });

                        res.status(200).json(ventasConDetalles);
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error al listar las ventas anuladas:', error);
        res.status(500).json({ error: 'No se pudo obtener la lista de ventas anuladas' });
    }
};


module.exports.listarVentasCreditoNoFacturadas = async (req, res) => {
    try {
        connection.query(
            `SELECT v.*, u.nit 
             FROM ventas v 
             JOIN usuarios u ON v.id_usuario = u.id_usuario 
             WHERE v.tipo_venta = 1 AND v.estado_pago = "No facturado"`,
            (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Error al obtener las ventas.' });
                }
                res.status(200).json(result);
            }
        );
    } catch (error) {
        console.error('Error al listar ventas al crédito no facturadas:', error);
        res.status(500).json({ error: 'No se pudo listar las ventas.' });
    }
};

// Obtener el NIT del usuario
module.exports.obtenerNitUsuario = async (req, res) => {
    const { id_usuario } = req.params;

    try {
        connection.query(
            `SELECT nit 
             FROM usuarios 
             WHERE id_usuario = ?`,
            [id_usuario],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Error al obtener el NIT del usuario.' });
                }

                if (result.length > 0) {
                    res.status(200).json({ nit: result[0].nit });
                } else {
                    res.status(404).json({ error: 'Usuario no encontrado.' });
                }
            }
        );
    } catch (error) {
        console.error('Error al obtener NIT del usuario:', error);
        res.status(500).json({ error: 'No se pudo obtener el NIT del usuario.' });
    }
};


// ventasController.js
module.exports.facturarVenta = async (req, res) => {
    const { id_venta } = req.params;

    try {
        connection.beginTransaction(async (err) => {
            if (err) throw err;

            connection.query(
                'UPDATE ventas SET estado_pago = "Facturado" WHERE id_venta = ? AND estado_pago = "No facturado"',
                [id_venta],
                (err, result) => {
                    if (err) {
                        return connection.rollback(() => {
                            throw err;
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.status(400).json({ error: 'La venta no se pudo facturar o ya está facturada.' });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                throw err;
                            });
                        }
                        res.status(200).json({ message: 'Venta facturada exitosamente.' });
                    });
                }
            );
        });
    } catch (error) {
        console.error('Error al facturar la venta:', error);
        res.status(500).json({ error: 'No se pudo facturar la venta.' });
    }
};





// PARTE QUE SE BORRÓ

module.exports.registrarAnulacion = async (req, res) => {
    console.log(req.body);
    const { id_venta, usuario, fecha } = req.body;

    try {
        const query = 'INSERT INTO anulacion (fecha, usuario, id_venta) VALUES (?, ?, ?)';
        connection.query(query, [fecha, usuario, id_venta], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error al registrar la anulación.' });
            }
            res.status(200).json({ message: 'Anulación registrada correctamente.' });
        });
    } catch (error) {
        console.error('Error al registrar la anulación:', error);
        res.status(500).json({ error: 'No se pudo registrar la anulación.' });
    }
};






module.exports.actualizarMotivoAnulacion = async (req, res) => {
    const { id_venta } = req.params;
    const { motivo_anulacion } = req.body;

    try {
        const query = 'UPDATE ventas SET motivo_anulacion = ? WHERE id_venta = ?';
        connection.query(query, [motivo_anulacion, id_venta], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error al actualizar el motivo de anulación.' });
            }
            res.status(200).json({ message: 'Motivo de anulación actualizado correctamente.' });
        });
    } catch (error) {
        console.error('Error al actualizar el motivo de anulación:', error);
        res.status(500).json({ error: 'No se pudo actualizar el motivo de anulación.' });
    }
};



// Anular venta facturada y actualizar stock
module.exports.anularVenta = async (req, res) => {
    const { id_venta } = req.body;

    try {
        // Primero, obtenemos los detalles de la venta
        const queryDetalles = 'SELECT id_producto, cantidad FROM detallesventas WHERE id_venta = ?';
        connection.query(queryDetalles, [id_venta], (err, detalles) => {
            if (err) {
                return res.status(500).json({ error: 'Error al obtener los detalles de la venta.' });
            }

            // Actualizamos el stock de cada producto relacionado con la venta
            detalles.forEach((detalle) => {
                const queryStock = 'UPDATE productos SET stock = stock + ? WHERE id_producto = ?';
                connection.query(queryStock, [detalle.cantidad, detalle.id_producto], (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error al actualizar el stock.' });
                    }
                });
            });

            // Una vez actualizado el stock, actualizamos el estado de "anulado" en la tabla ventas
            const queryAnulacion = 'UPDATE ventas SET anulado = 1 WHERE id_venta = ?';
            connection.query(queryAnulacion, [id_venta], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Error al actualizar el estado de anulación.' });
                }

                res.status(200).json({ message: 'Venta anulada y stock actualizado correctamente.' });
            });
        });
    } catch (error) {
        console.error('Error al anular la venta facturada:', error);
        res.status(500).json({ error: 'No se pudo anular la venta.' });
    }
};
