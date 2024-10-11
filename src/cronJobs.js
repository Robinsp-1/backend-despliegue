const cron = require('node-cron');
const fetch = require('node-fetch');
const mysql = require('mysql'); 
const db = require('./models/db');
const moment = require('moment-timezone');


const eliminarRecordatorio = (id_recordatorios, callback) => {
    db.query('DELETE FROM recordatorios WHERE id_recordatorios = ?', [id_recordatorios], callback);
};

// Programar la tarea cron
cron.schedule('* * * * *', async () => { 
    const now = moment().tz('America/Guatemala'); 
    const currentDate = now.format('YYYY-MM-DD'); 
    const currentTime = now.format('HH:mm:ss');


    try {
        // Realizar la consulta en la base de datos
        db.query(
            'SELECT * FROM recordatorios WHERE DATE(fecha) = ? AND hora = ? LIMIT 1', 
            [currentDate, currentTime],
            (error, results) => {
                if (error) {
                    console.error('Error en la consulta:', error);
                    return;
                }

                if (results.length > 0) {
                    const recordatorio = results[0]; 
                    console.log('Resultado de la consulta:', recordatorio);

                    // Llama a la función para enviar recordatorios
                    fetch('http://161.35.181.61:3000/enviar-recordatorios-programados', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    })
                    .then(response => response.text())
                    .then(body => {
                        console.log('Respuesta del envío:', body);

                        // Elimina el recordatorio después de enviarlo
                        eliminarRecordatorio(recordatorio.id_recordatorios, (deleteError, deleteResult) => {
                            if (deleteError) {
                                console.error('Error al eliminar el recordatorio:', deleteError);
                            } else {
                                console.log('Recordatorio eliminado exitosamente:', deleteResult);
                            }
                        });
                    })
                    .catch(error => console.error('Error en el envío de recordatorios:', error));
                } else {
                    
                }
            }
        );
    } catch (error) {
        console.error('Error al buscar los recordatorios:', error);
    }
});
