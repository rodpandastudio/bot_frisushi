require('dotenv').config()
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Client, LocalAuth  } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const keywordsDB = require('./models/keywords')
const keyDB = require('./models/key')
const ordenCompraDB = require('./models/orden-compra')
const ventasDB = require('./models/ventas')
const productosDB = require('./models/productos')
const promocionesDB = require('./models/promociones')
const stepsDB = require('./models/steps')
const usersDB = require('./models/users')
const methodOverride = require("method-override");
const moment = require('moment')
const push = require('./utils/push')
const {actualizarIndicadores} = require('./utils/indicadores');
const {actualizarIndicadoresResta} = require('./utils/indicadoresResta');



let promoActiva
let promoBase
let productoBase  
let Promociones = {}
let Productos = {}
let Opciones = []
let subdataOpciones = {}
let _idUltimaVenta = false

let ultimaVentaRealizada = false

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

//Inicializacion
const app = express();


//routes
require("./database");

app.set("port", process.env.PORT || 4000);

//Middlewears
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));
app.use(bodyParser.json()).use(bodyParser.urlencoded({ extended: true }));
app.use(cors());


//routes
app.get('/', (req, res) => {
    res.send('Hello World!')
})


app.post('/api/anular-venta', async (req, res) => {
    let {password, Motivo, Numero, Sucursal} = req.body
    console.log(req.body)
    let validacion = await usersDB.findOne({password})
    if(validacion){
        let descripcion = `Solicitud de anulación de venta
*Venta*: ${Numero}
*Sucursal*: ${Sucursal}
*Motivo*: ${Motivo}
    
Si desea anular la  venta, por favor ingrese el siguiente comando:
*anular* *${Numero}*`
        //send message whatsapp

        client.sendMessage(process.env.NUMBER_ADMIN, descripcion)
    }

    res.json('ok').status(200)
})

//Incialización del whatsapp bot 


// Enviar QR al cliente
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
})

// Indicador de inició de sesión
client.on('ready', () => {
    console.log('Client is ready!');
});


// escuchar mensajes

let step = null;



client.on('message', async message => {
    try {
        let mensaje = message.body.toLowerCase()
        let from = message.from
        message = message.body
        console.log(message)
        
        if(mensaje.includes('anular')){
            let numero = mensaje.split(' ')[1]
            let venta = await ventasDB.findOne({Numero: numero})
            step = 'anulacion'
            if(venta){
                venta.Estado = 'Anulada'
                venta.save()

                //actualizar dashboard de ventas
                actualizarIndicadoresResta(
                    PrecioTotal = venta.PrecioTotal, 
                    CantidadTotal = venta.CantidadTotal, 
                    ItemProductos = venta.Productos || [], 
                    ItemPromociones = venta.Promociones || [], 
                    ItemMateriales = [], 
                    Sucursal = process.env.SUCURSAL_ID, 
                    Cliente = venta.Telefono, 
                    Fecha = venta.Fecha, 
                    Gastos = null, 
                )

                client.sendMessage(from, `La venta *${numero}* ha sido anulada`)

            }else{
                client.sendMessage(from, `La venta *${numero}* no existe`)
            }
        }else{
      
        let arr = message.split(/\r?\n/);
        let cliente 
        let direccion
        let telefono
        let tipo
        let lineaPromociones
        let lineaProductos
        arr.forEach((line, idx)=> {
            line = line.toLowerCase()
            if(line.includes('cliente:')){
                cliente = line.replace('cliente:', '').trim()
            }
            if(line.includes('direccion:')){
                direccion = line.replace('direccion:', '').trim()
            }
            if(line.includes('telefono:')){
                telefono = line.replace('telefono:', '').trim()
            }
            if(line.includes('tipo:')){
                tipo = line.replace('tipo:', '').trim()
            }
            //get index of promos
            if (line.includes('productos:')){
                lineaProductos = idx
            }
            if(line.includes('promociones:')){
                lineaPromociones = idx
            }

        });

        //get the line between promos and products
        let promos = lineaPromociones ? arr.slice(lineaPromociones + 1, lineaProductos) : []
        let productos = lineaProductos ?  arr.slice(lineaProductos + 1, arr.length) : []
        let opciones = []
        let promocion 
        let Promociones = []
        let Productos = []
        let errors = []
        let CantidadTotalVenta = 0
        let PrecioTotalVenta = 0

        //agregando promociones
        for(let i = 0; i < promos.length; i++){
            let promoBase = promos[i].split(':')[0]
            let cantidad = promos[i].split(':')[1]
            if(!cantidad){
                cantidad = 1
            }
            promoBase = promoBase.trim()
            promoBase = new RegExp(promoBase, "i")
            let promoDB = await promocionesDB.findOne({Nombre: promoBase})
            if(promoDB){
                if(opciones.length > 0){
                    promocion.Opciones = opciones
                    opciones = []
                    Promociones.push(promocion)
                }else{
                    CantidadTotalVenta = +CantidadTotalVenta + +cantidad
                    let precioTotal = (+cantidad * +promoDB.Precio).toFixed(2)
                    PrecioTotalVenta = (+PrecioTotalVenta + +precioTotal).toFixed(2) 
                    promocion = {
                        _idPromocion: promoDB._id, 
                        Nombre: promoDB.Nombre, 
                        PrecioUnidad: promoDB.Precio, 
                        PrecioTotal: precioTotal, 
                        Descripcion: promoDB.Descripcion, 
                        Nota: "", 
                        Cantidad: cantidad, 
                    }
                }
            }else{
                //look if promos[i] includes the word 'nota'
                if(promos[i].includes('Nota')){
                    let nota = promos[i].split(':')[1]
                    promocion.Nota = nota
                }else{
                    let nombreOpcion = promos[i].split('(')[0]
                    let tipo = promos[i].split('(')[1]
                    if(!tipo){
                        tipo = 'Normal'
                    }else{
                        tipo = `(${tipo}`
                    }
                    let subdataOpciones = {
                        nombreOpcion: nombreOpcion,
                        tipo: tipo,
                    }
                    opciones.push(subdataOpciones)
                    if(i === promos.length - 1){
                        promocion.Opciones = opciones
                        opciones = []
                        Promociones.push(promocion)
                    }
                }
            }         
        }
        //validando errores de promociones
        if(promos.length > 0 && Promociones.length === 0){
            errors.push('No se encontraron las promociones. Valida que esten escritas correctamente')
        }

        //agregando productos


        //delete the empty lines
        productos = productos.filter(function (el) {
            return el != "";
        });

        for(i=0; i< productos.length; i++){
            let nombreProducto = productos[i].split('(')[0]
            
            let cantidad = productos[i].split(':')[1]
            if(!cantidad){
                cantidad = 1
            }
            let tipo = productos[i].split('(')[1]
            let nota = tipo.split('-')[1].split(')')[0]
            tipo = tipo.split('-')[0]
            nombreProducto = nombreProducto.trim()
            let productoBase = new RegExp(nombreProducto, "i")
            let productoDB = await productosDB.findOne({Nombre: productoBase})
            if(productoDB){
                let precioTotal = (+productoDB.Precio * +cantidad).toFixed(2)
                CantidadTotalVenta = +CantidadTotalVenta + +cantidad
                PrecioTotalVenta = (+PrecioTotalVenta + +precioTotal).toFixed(2)  
                let subdataProducto = {
                    _idProducto: productoDB._id, 
                    Nombre: productoDB.Nombre, 
                    PrecioUnidad: productoDB.Precio, 
                    PrecioTotal: precioTotal, 
                    Descripcion: productoDB.Descripcion, 
                    Tipo: tipo, 
                    Nota: nota, 
                    Cantidad: cantidad, 
                }

                Productos.push(subdataProducto)

            }else{
                //valindando errores de productos
                errors.push(`No se encontro el producto ${nombreProducto}. Valida que este escrito correctamente`) 
            }
        }

        if(errors.length > 0){
           //send errors

          throw new Error(errors)
        }else{

            let Fecha = moment().format('L');
            Fecha = Fecha.split('/');
            Fecha = `${Fecha[1]}/${Fecha[0]}/${Fecha[2]}`;
            let hora = moment().format('LTS');

            let Numero = await ventasDB.findOne({}).sort({Timestamp: -1})
            Numero = Numero ? Numero.Numero + 1 : 1

            let nuevaVenta = new ventasDB({
                Fecha: Fecha,
                FechaCompleta: `${Fecha} ${hora}`,
                Timestamp: Date.now(),
                Numero: Numero,
                Cliente: cliente,
                Dirección: direccion,
                Telefono: telefono,
                Vendedor: process.env.VENDEDOR,
                Sucursal: process.env.SUCURSAL,
                TipoEntrega: tipo,
                CantidadTotal: CantidadTotalVenta,
                PrecioTotal: PrecioTotalVenta,
                Promociones:Promociones ,
                Productos:Productos ,
            })

            await nuevaVenta.save()

                await actualizarIndicadores(
                    PrecioTotal = PrecioTotalVenta, 
                    CantidadTotal = CantidadTotalVenta, 
                    ItemProductos = nuevaVenta.Productos || [], 
                    ItemPromociones = nuevaVenta.Promociones || [], 
                    ItemMateriales = [], 
                    Sucursal = process.env.SUCURSAL_ID, 
                    Cliente = nuevaVenta.Telefono, 
                    Fecha = Fecha, 
                    Gastos = null, 
                )
                  //Enviar notificacion
                let post = {
                    titulo: `Nuevo pedido pedido #${Numero}`,
                    descripcion: `El pedido #${Numero} ha sido creado`,
                    url: `${ process.env.URL }ventas/todas-ventas`,
                    sucursal: process.env.SUCURSAL
                }
                push.sendNotification(post)

                client.sendMessage(from, 'Venta registrada correctamente')
            }

        }
       
    }catch(e){
        console.log("********Errror**********")
        client.sendMessage(process.env.PRIMARY_NUMBER, 'Ups! Ocurrio un error al intentar responderte. Es comun que este error aparezca si escribiste el nombre de un producto o promocion incorrectamente. Intenta nuevamente y si el error persiste, contacta a un administrador.')
    }
});
 

//cierre

client.initialize();

// cierre del whatsap bot




app.listen(app.get("port"), () => {
    console.log("Escuchando en " + app.get("port"));
});