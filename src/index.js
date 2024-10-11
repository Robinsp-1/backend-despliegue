const express = require('express');
const port = 3000;
const routes = require('./api/Rutas');
const cors = require('cors');
const path = require('path');


require('./cronJobs'); 
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); 

const app = express();



app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.static(path.join(__dirname, './Imagenes/productos')));

app.use('/', routes);

app.listen(process.env.PORT || port, () => {
    console.log(`Corriendo en el puerto ${process.env.PORT || port}`);
});
