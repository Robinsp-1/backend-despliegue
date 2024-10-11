const express = require('express');
const router = express.Router();
const upload = require('./multerconfig');
const path = require('path');
require('dotenv').config();

const { login } = require('../controllers/logincontroller');
const { ping } = require('../controllers/ping');
const { registrarusuario,verificarusuario,cambiarContraseña,listarusuariopropio,actualizarusuariopropio, listarusuariosbusqueda,listartodoslosusuarios,restaurarUsuario, asignarol, listarusuario, listarusuarios, actualizarusuario, eliminarusuario ,cambiarContraseñaprimeringreso} = require('../controllers/usuariocontroller');
const { registrarProveedor,listartodoslosproveedores,restaurarProveedor, listarProveedores, listarProveedor, actualizarProveedor, eliminarProveedor } = require('../controllers/proveedorescontroller');
const { registrarDetallePedido, listarDetallesPedido, listarPedidos, registrarPedido, eliminarPedido, obtenerPedido
        , actualizarPedido,actualizarDetallePedido,eliminarDetallePedido,restaurarPedido,listartodoslospedidos} = require('../controllers/pedidos_proveedorescontroller');

const { registrarProducto, listarProductos, listarproductoporid, actualizarProducto, eliminarProducto } = require('../controllers/Productoscontroller');
const { obtenerDetallesIngreso,listarIngresos,eliminarIngreso,insertarIngreso,insertarDetalleIngreso } = require('../controllers/ingresomercancias');	
const { realizarSalida, listarSalidas } = require('../controllers/devoluciones');

const {registrarSolicitudPedido,listarDetallesPedidoCliente ,anularSolicitudPedido,obtenerSolicitudPedido, 
        listarSolicitudesPedidosClientes, listarSolicitudesPedidosPorUsuario,completarPedido, listarSolicitudesPedidosClientestodos
} = require('../controllers/pedidos_clientes');

const {enviarRecordatorio, programarRecordatorio,listarRecordatorios,enviarRecordatorioProgramado} = require('../controllers/whatsapp');
const {generarReporte} = require('../controllers/reportes');
const {listarCreditos,listarusuariosbusquedacredito, listarCreditosusuarios,listarUsuarioscredito,listarTodosLosCreditos,insertarCredito,editarCredito,anularCredito,listarusuariossincreditos,obtenerCreditoPorId,restaurarCredito, listarCreditosusuarioswsp}=require('../controllers/creditos');

const { facturar,consultarNIT, descargarPDF, anularFactura} = require('../controllers/factura');
const {  registrarVenta,registrarAnulacion,actualizarMotivoAnulacion,anularVenta ,actualizarNitVenta, Ventas, VentaPorId, DetallesVentas,listarDetallesVenta, listarVentasCreditoNoFacturadas, facturarVenta,obtenerNitUsuario, obtenerVentaPorId,listarVentasAnuladas} = require('../controllers/ventas');

const{listarAbonos,listarTodosLosAbonos,insertarAbono,anularAbono}=require('../controllers/abonos');

const {generarComprobante} = require('../controllers/comprobante');

// Rutas para el ping y login
router.get('/ping', ping);
router.post('/login', login);

// Rutas para usuarios y roles
router.post('/usuarios', registrarusuario); 
router.put('/usuarios/:id_usuario', actualizarusuario); 
router.delete('/usuarios/:id_usuario', eliminarusuario); 
router.get('/usuarios/:id_usuario', listarusuario); 
router.get('/usuarios', listarusuarios); 
router.put('/restaurar_usuario/:id_usuario', restaurarUsuario);
router.get('/Usuarios_todos', listartodoslosusuarios);
router.get('/usuariosbusqueda',listarusuariosbusqueda);

//Rutas para verificacion de usuario y cambio de contraseña
router.post('/verificarusuario', verificarusuario);
router.put('/cambiarContrasena', cambiarContraseña);
router.put('/cambiarContrasenaPrimerIngreso', cambiarContraseñaprimeringreso);

// Rutas para asignar roles
router.post('/usuario_rol', asignarol);

//RUtas para proveedores
router.post('/proveedores', registrarProveedor);
router.get('/proveedores', listarProveedores);
router.get('/proveedores/:id_proveedor', listarProveedor);
router.put('/proveedores/:id_proveedor',actualizarProveedor);
router.delete('/proveedores/:id_proveedor', eliminarProveedor);
router.put('/restaurar_proveedor/:id_proveedor', restaurarProveedor);
router.get('/Proveedores_todos', listartodoslosproveedores);

// Rutas para detalles del pedido
router.post('/detalle_pedido_prov', registrarDetallePedido); 
router.get('/detalle_pedido_prov/:id_pedido', listarDetallesPedido); 
router.delete('/eliminar_detalle_pedido_prov/:id_pedido/:id_producto', eliminarDetallePedido);
router.put('/detalle_pedido_prov/:id_pedido/:id_producto', actualizarDetallePedido);

// Rutas para pedidos
router.post('/pedidos_prov', registrarPedido);
router.get('/pedidos_prov', listarPedidos);
router.put('/eliminar_pedidos_prov/:id_pedido', eliminarPedido);
router.get('/pedidos_prov/:id_pedido', obtenerPedido);  
router.put('/pedidos_prov/:id_pedido', actualizarPedido);  
router.put('/restaurar_pedido/:id_pedido', restaurarPedido);
router.get('/pedidos_prov_todos', listartodoslospedidos);

// Rutas para productos
router.post('/productos', upload.single('imagen_url'), registrarProducto);
router.put('/productos/:id_producto', upload.single('imagen_url'), actualizarProducto);
router.get('/productos', listarProductos);
router.get('/productos/:id_producto', listarproductoporid);
router.delete('/productos/:id_producto', eliminarProducto);
router.use('/Imagenes/productos', express.static(path.join(__dirname, '../../Imagenes/productos')));

// Rutas para ingresos de mercancías
router.get('/ingresos', listarIngresos);
router.get('/detalle_ingreso/:id_ingreso', obtenerDetallesIngreso);
router.post('/ingresos', insertarIngreso);
router.delete('/ingresos/:id_ingreso', eliminarIngreso);
router.post('/detalle_ingreso', insertarDetalleIngreso);

//Salidas por devoluciones
router.post('/salidas', realizarSalida);
router.get('/salidas', listarSalidas);

// Rutas Pedidos Clientes
router.post('/solicitudes_pedidos', registrarSolicitudPedido);//USADO
router.delete('/solicitudes_pedidos/:id_solicitud_pedido', anularSolicitudPedido);//USADO
router.get('/detalle_pedido_cli/:id_solicitud_pedido',listarDetallesPedidoCliente );//USADO
router.get('/solicitudes_pedidos', listarSolicitudesPedidosClientes);// USADO
router.get('/solicitudes_pedidos/:id_solicitud_pedido', obtenerSolicitudPedido);
router.get('/solicitudes_pedidos_todos',listarSolicitudesPedidosClientestodos);//USADO
router.get('/solicitudes_pedidos/usuario/:id_usuario', listarSolicitudesPedidosPorUsuario);//USADO
router.put('/completarpedidos/:id_solicitud_pedido',completarPedido);//USADO

//Reportes
router.post('/reporte/:tabla', generarReporte);


//Recordatorios
router.post('/enviar-recordatorio', enviarRecordatorio);
router.post('/programar-recordatorio', programarRecordatorio);
router.get('/listar-recordatorios', listarRecordatorios);
router.get('/enviar-recordatorios-programados', enviarRecordatorioProgramado);

//creditos
//USADOS PARA RECORDATORIOS
router.get('/creditosusuarios/:id_usuario', listarCreditosusuarios);
router.get('/listarusuarioscreditos',listarUsuarioscredito);
router.get('/creditoswsp/:id_usuario',listarCreditosusuarioswsp);


//USADOS PARA CRUD CREDITOS
router.get('/listarcreditostodos',listarTodosLosCreditos);
router.post('/creditos', insertarCredito);
router.put('/editarcreditos/:id', editarCredito);
router.delete('/anularcredito/:id', anularCredito);
router.get('/creditos', listarCreditos);
router.get('/usuariossincreditos',listarusuariossincreditos);
router.get('/listarcreditos/:id_credito', obtenerCreditoPorId);
router.put('/restaurar_credito/:id_credito', restaurarCredito);
router.get('/busquedausuarioscredito',listarusuariosbusquedacredito);

//ABONOS
router.get('/abonos',listarAbonos);
router.post('/abonos', insertarAbono);
router.get('/listartodoslosabonos',listarTodosLosAbonos);
router.delete('/abonos/:id_abono', anularAbono);

// Ruta para registrar una venta
router.post('/registrarventas', registrarVenta);
router.get('/ventas', Ventas);
router.get('/venta/:id_venta', VentaPorId);
router.get('/detalles_ventas/:id_venta', DetallesVentas);
router.get('/detalles_venta/:id_venta', listarDetallesVenta);
router.get('/ventas/nofacturadas', listarVentasCreditoNoFacturadas);
router.post('/ventasfacturar/:id_venta', facturarVenta);
router.get('/nit/:id_usuario', obtenerNitUsuario);
router.get('/venta/:id_venta', obtenerVentaPorId);
router.put('/actualizarnitventas/:id_venta', actualizarNitVenta);
router.post('/registraranulacion', registrarAnulacion);
router.post('/actualizarmotivo/:id_venta',actualizarMotivoAnulacion);
router.put('/anularventa', anularVenta);
router.get('/ventas_todas', listarVentasAnuladas);

//Facturas
router.post('/facturar', facturar);
router.get('/consultarNIT/:nit',consultarNIT);
router.get('/descargarPDF/:nombreXml', descargarPDF);
router.post('/anularfactura', anularFactura);

//Comprobante
router.get('/comprobante/:id_venta', generarComprobante);


module.exports = router;



