const soap = require('soap');
const xml2js = require('xml2js');
const { DetallesVentas } = require('../controllers/ventas');
const { obtenerVentaPorId } = require('../controllers/ventas');
const { actualizarVentaPorId } = require('../controllers/ventas');
const path = require('path');
const fs = require('fs');


class FacturaController {

  constructor() {
    this.facturar = this.facturar.bind(this); 
  }


  construirXML(datos, productos) {
    console.log("INGRESO XML CONSTR", productos);
    const builder = new xml2js.Builder({ headless: true });

    // Construir el objeto XML
    const xmlDoc = builder.buildObject({
      stdTWS: {
        $: { xmlns: 'FEL' },
        TrnEstNum: datos.TrnEstNum,
        TipTrnCod: datos.TipTrnCod,
        TrnNum: datos.TrnNum,
        TrnFec: datos.TrnFec,
        MonCod: datos.MonCod,
        TrnBenConNIT: datos.TrnBenConNIT,
        TrnExp: datos.TrnExp,
        TrnExento: datos.TrnExento,
        TrnFraseTipo: datos.TrnFraseTipo,
        TrnEscCod: datos.TrnEscCod,
        TrnEFACECliNom: datos.TrnEFACECliNom,
        TrnEFACECliDir: datos.TrnEFACECliDir,
        stdTWSD: {
          'stdTWS.stdTWSCIt.stdTWSDIt': productos.map((item) => ({
            TrnLiNum: item.TrnLiNum,
            TrnArtCod: item.TrnArtCod,
            TrnArtNom: item.TrnArtNom,
            TrnCan: item.TrnCan,
            TrnVUn: item.TrnVUn,
            TrnUniMed: item.TrnUniMed,
            TrnVDes: item.TrnVDes,
            TrnArtBienSer: item.TrnArtBienSer,
            TrnArtImpAdiCod: item.TrnArtImpAdiCod,
            TrnArtImpAdiUniGrav: item.TrnArtImpAdiUniGrav,
          })),
        },
      },
    });

    return xmlDoc;
  }

  async facturar(req, res) {
    console.log(req.body); 
    const { id_venta } = req.body;
    console.log('ID de venta recibido:', id_venta);

    try {
     
      const venta = await obtenerVentaPorId(id_venta);
      console.log('Venta encontrada:', venta);

      if (!venta) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada',
        });
      }

      // 2. Obtener los detalles de la venta
      const detallesVenta = await DetallesVentas(id_venta);
      console.log("DETALLES DE VENTA", detallesVenta)
      if (!detallesVenta || detallesVenta.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron detalles para la venta',
        });
      }
      // 3. Construir los datos generales de la factura usando los datos de la venta
      const datos = {
        TrnEstNum: '2',
        TipTrnCod: 'FPEQ',
        TrnNum: venta.id_venta.toString(),
        TrnFec: venta.fecha_venta.toISOString().split('T')[0],
        MonCod: 'GTQ',
        TrnBenConNIT: venta.nit || 'CF',
        TrnExp: '0',
        TrnExento: '0',
        TrnFraseTipo: '0',
        TrnEscCod: '0',
        TrnEFACECliNom: venta.nombre_cliente || 'CONSUMIDOR FINAL',
        TrnEFACECliDir: venta.direccion,
      };

      // 4. Construir la lista de productos usando los detalles de la venta
      const productos = detallesVenta.map((detalle, index) => ({
        TrnLiNum: (index + 1).toString(),
        TrnArtCod: detalle.id_producto.toString(),
        TrnArtNom: detalle.nombre || 'Producto',
        TrnCan: detalle.cantidad.toString(),
        TrnVUn: detalle.precio_unidad.toString(),
        TrnUniMed: 'UNI',
        TrnVDes: '0',
        TrnArtBienSer: 'B',
        TrnArtImpAdiCod: '0',
        TrnArtImpAdiUniGrav: '0',
      }));

      // 5. Construir el XML
      const xmlEnviar = this.construirXML(datos, productos);
      console.log(xmlEnviar);
      // 6. Crear el cliente SOAP
      const soapClient = await soap.createClientAsync(process.env.WSDL_URL_FACTURA);

      // 7. Configurar los argumentos para la solicitud SOAP

      const args = {
        Cliente: process.env.CLIENTE_FEL,
        Usuario: process.env.USUARIO_FEL,
        Clave: process.env.CLAVE_FEL,
        Nitemisor: process.env.CLIENTE_FEL,
        Xmldoc: xmlEnviar,
      };
      console.log('PARAMETROS:', args);
      // 8. Enviar la solicitud al servicio SOAP
      const resultado = await new Promise((resolve, reject) => {
        soapClient.Documento.DocumentoSoapPort.Execute(args, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
      console.log('RESULTADO:', resultado);
      // 9. Procesar la respuesta
      const xml = resultado?.Respuesta;

      if (!xml) {
        return res.status(500).json({
          success: false,
          message: 'No se recibió información válida desde el servicio SOAP',
        });
      }

      const parser = new xml2js.Parser();
      const parsedResult = await parser.parseStringPromise(xml);

      const errores = parsedResult?.Errores;
      if (errores) {
        const error = errores?.Error?.[0];
        return res.status(500).json({
          success: false,
          error: error['_'],
          codigoError: error['$']['Codigo'],
        });
      }

      const DTE = parsedResult?.DTE;
      if (!DTE) {
        return res.status(500).json({
          success: false,
          error: 'Formato de respuesta no esperado',
        });
      }

      // 10. Extraer los datos de la respuesta
      const fechaEmision = DTE['$']['FechaEmision'];
      const fechaCertificacion = DTE['$']['FechaCertificacion'];
      const numeroAutorizacion = DTE['$']['NumeroAutorizacion'];
      const serie = DTE['$']['Serie'];
      const numero = DTE['$']['Numero'];
      const xmlDTE = DTE?.Xml?.[0] || '';
      const pdfDTE = DTE?.Pdf?.[0] || '';

      // 11. Guardar el XML en un archivo
      const carpetaDestino = path.join(__dirname, '../../xml');
      const nombreArchivo = `${id_venta}.xml`; // Nombre del archivo usando id_venta
      const rutaArchivo = path.join(carpetaDestino, nombreArchivo);

      try {
        // Verificar si la carpeta existe, si no, crearla
        if (!fs.existsSync(carpetaDestino)) {
          fs.mkdirSync(carpetaDestino, { recursive: true });
        }

        // Guardar el XML en un archivo
        fs.writeFileSync(rutaArchivo, xml);
        console.log(`XML guardado en: ${rutaArchivo}`);
      } catch (err) {
        console.error('Error al guardar el XML:', err);
        return res.status(500).json({
          success: false,
          message: 'Error al guardar el XML',
          error: err.message,
        });
      }

      // 12. Actualizar la venta con los datos de facturación
      await actualizarVentaPorId(id_venta, {
        emisionFEL: fechaEmision,
        serieFEL: serie,
        numeroFEL: numero,
        autorizacionFEL: numeroAutorizacion,
      });

      // 13. Enviar la respuesta
      return res.status(200).json({
        success: true,
        data: {
          fechaEmision,
          fechaCertificacion,
          numeroAutorizacion,
          serie,
          numero,
          xmlDTE,
          pdfDTE,
        },
      });
    } catch (error) {
      console.error('Error al enviar la respuesta:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al enviar la respuesta',
        error: error.message,
      });
    }


  };
   
  // Consultar NIT
  async consultarNIT({ params }, response) {
    const receptorId = params.nit;

    try {
      console.log(process.env.WSDL_URL_CONSULTA_NIT);
      const soapClient = await soap.createClientAsync(process.env.WSDL_URL_CONSULTA_NIT);

      const args = {


        Cliente: process.env.CLIENTE_FEL,
        Usuario: process.env.USUARIO_FEL,
        Clave: process.env.CLAVE_FEL,
        Receptorid: receptorId,
      };
      console.log('ReceptorId:', args);
      const resultado = await new Promise((resolve, reject) => {
        soapClient.ReceptorInfo.ReceptorInfoSoapPort.Execute(args, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
      console.log('ReceptorInfo:', resultado);
    
      const xml = resultado?.Informacion;

      if (!xml) {
        return response.status(500).json({
          success: false,
          message: 'No se recibió información válida desde el servicio SOAP',
        });
      }

    
      const parser = new xml2js.Parser();
      const parsedResult = await parser.parseStringPromise(xml);

      // Extraer los campos NIT, NOMBRE y DIRECCION
      const receptorInfo = parsedResult?.RECEPTOR;
      if (!receptorInfo) {
        const errores = parsedResult?.Errores;
        const error = errores?.Error?.[0];
        return response.status(200).json({
          success: false,
          error: error['_'],
          codigoError: error['$']['Codigo'],
        });
      }
      const nit = receptorInfo?.NIT?.[0] || '';
      const nombre = receptorInfo?.NOMBRE?.[0] || '';
      const direccion = receptorInfo?.DIRECCION?.[0] || ' ';

      // Retornar la respuesta con los datos extraídos
      return response.status(200).json({
        success: true,
        data: {
          nit,
          nombre,
          direccion,
        },
      });
    } catch (error) {

      console.error('Error al procesar la transacción:', error);
      response.status(500).json({ success: false, message: 'Error al procesar la transacción' });

    }
  }
  async anularFactura(req, res) {
    const { id_venta } = req.body;
    
    console.log('ID de venta:', id_venta , 'Motivo de anulación:', req.body.motivo_anulacion);
    try {
      // 1. Obtener la venta y verificar que exista
      const venta = await obtenerVentaPorId(id_venta);
      if (!venta) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada',
        });
      }
  
    
  
      // Si el motivo de anulación está en la venta, lo extraemos, o usamos el que se manda en la solicitud
      const motivo_anulacion = venta.motivo_anulacion || req.body.motivo_anulacion || 'Motivo no especificado';
      
      console.log('Motivo de anulación:', motivo_anulacion);
  
      // 3. Construir los datos para la solicitud de anulación
      const args = {
        Cliente: process.env.CLIENTE_FEL,
        Usuario: process.env.USUARIO_FEL,
        Clave: process.env.CLAVE_FEL,
        Nitemisor: process.env.CLIENTE_FEL,
        Numautorizacionuuid: venta.autorizacionFEL,  
        Motivoanulacion: motivo_anulacion, 
      };
      
      console.log('Args para SOAP:', args);
  
      // 4. Crear el cliente SOAP y enviar la solicitud
      const soapClient = await soap.createClientAsync(process.env.WSDL_ANULACION );
      const resultado = await new Promise((resolve, reject) => {
        soapClient.Execute(args, (err, result) => {
          if (err) {
            reject(err);
          } else {
            console.log('Resultado SOAP:', result);
            resolve(result);
          }
        });
      });
  
      // 5. Procesar la respuesta del servicio SOAP
      const xml2 = resultado?.Respuesta;
      if (!xml2) {
        return res.status(500).json({
          success: false,
          message: 'No se recibió información válida desde el servicio SOAP',
        });
      }
  
      // 6. Verificar si la respuesta tiene errores
      const parser = new xml2js.Parser();
      const parsedResult = await parser.parseStringPromise(xml2);
      const errores = parsedResult?.Errores;
      if (errores) {
        const error = errores?.Error?.[0];
        return res.status(500).json({
          success: false,
          error: error['_'],
          codigoError: error['$']['Codigo'],
        });
      }
  
      // 7. Guardar el nuevo XML de la anulación, reemplazando el anterior
      const carpetaDestino = path.join(__dirname, '../../xml');
      const nombreArchivo = `${id_venta}.xml`;
      const rutaArchivo = path.join(carpetaDestino, nombreArchivo);
  
      try {
        if (!fs.existsSync(carpetaDestino)) {
          fs.mkdirSync(carpetaDestino, { recursive: true });
        }
  
        // Guardar el XML de la anulación, reemplazando el existente
        fs.writeFileSync(rutaArchivo, xml2);
        console.log(`XML de anulación guardado en: ${rutaArchivo}`);
      } catch (err) {
        console.error('Error al guardar el XML de anulación:', err);
        return res.status(500).json({
          success: false,
          message: 'Error al guardar el XML de anulación',
          error: err.message,
        });
      }
  
      // 8. Enviar la respuesta incluyendo el motivo de anulación
      return res.status(200).json({
        success: true,
        message: 'Documento anulado exitosamente',
        xmlAnulacion: xml2,
        motivo_anulacion, 
      });
  
    } catch (error) {
      console.error('Error al anular la factura:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al anular la factura',
        error: error.message,
        stack: error.stack
      });
    }
  }
  
  

}


module.exports = new FacturaController();


const extraerPDFDesdeXML = async (nombreXml) => {
  try {

    const xmlPath = path.join(__dirname, '../../xml', nombreXml);

    const xmlContent = await fs.promises.readFile(xmlPath, 'utf-8');

    // Parsear el XML para obtener el PDF
    const parser = new xml2js.Parser();
    const parsedResult = await parser.parseStringPromise(xmlContent);

    // Extraer el PDF en formato Base64
    const pdfBase64 = parsedResult?.DTE?.Pdf?.[0];
    if (!pdfBase64) {
      throw new Error('No se encontró el PDF en el XML');
    }

    // Convertir de Base64 a Buffer
    return Buffer.from(pdfBase64, 'base64'); 
  } catch (error) {
    throw new Error(`Error al extraer PDF del XML: ${error.message}`);
  }
};

// Endpoint para descargar el PDF
module.exports.descargarPDF = (req, res) => {
  const nombreXml = req.params.nombreXml;

  
  if (!nombreXml) {
    return res.status(400).json({
      success: false,
      message: 'El parámetro nombreXml es obligatorio',
    });
  }

  // Extraer y enviar el PDF
  extraerPDFDesdeXML(nombreXml)
    .then((pdfBuffer) => {
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=${nombreXml.replace('.xml', '.pdf')}`,
        'Content-Length': pdfBuffer.length,
      });
      // Enviar el PDF
      res.send(pdfBuffer);
    })
    .catch((error) => {
      console.error('Error al extraer el PDF:', error);
      res.status(500).json({ success: false, message: error.message });
    });
};