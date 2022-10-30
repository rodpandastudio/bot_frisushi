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


app.post('/api/anular-venta', async (req, res) => {
    let {password, Motivo, Numero, Sucursal} = req.body
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
        let replyMessage = ``

        let mensaje = message.body.toLowerCase()
        
        if(mensaje == "nuevo pedido" ){
            step = 1 // preguntar si es promo o producto
            await ordenCompraDB.findOneAndRemove({Sucursal: process.env.SUCURSAL})
            let orden = new ordenCompraDB({
                Sucursal: process.env.SUCURSAL
            })
            orden.save()
        }else if(mensaje.includes('anular')){
            let numero = mensaje.split(' ')[1]
            let venta = await ventasDB.findOne({Numero: numero})
            step = 'anulacion'
            if(venta){
                venta.Estado = 'Anulada'
                venta.save()
                replyMessage = `La venta *${numero}* ha sido anulada`
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


            }else{
                replyMessage = `La venta *${numero}* no existe`
            }
        } 
        else if (mensaje == "ver resumen"){
            if(_idUltimaVenta){
                step = 11
            }else{
                step = 0                
            }
        }
         else if(mensaje == "promo" ){
            step = 2.1 //motrar promos
        }else if(mensaje == "productos" ){
            step = 2.2 //mostrar productos
        } else if (mensaje == "finalizar"){
            step = 6
        } else if (mensaje == "agregar mas"){
            step = 1
        }  
        else{
            let stepBase = await stepsDB.findOne()
            if(stepBase){
                if(stepBase.step == "Promo"){
                    promoActiva = mensaje
                    let nombrePromocion = new RegExp(mensaje, 'i')
                    promoBase = await promocionesDB.findOne({Nombre: nombrePromocion})
                    Promociones._idPromocion = promoBase._id
                    Promociones.Nombre = promoBase.Nombre
                    Promociones.Descripcion = promoBase.Descripcion
                    Promociones.PrecioUnidad = promoBase.Precio
                    step = 2.3 // mostrar opciones
                }
                if(stepBase.step == "Tipo"){
                    Productos.Tipo = mensaje
                    step = 3 // Preguntar cantidad
                }
                if (stepBase.step == "Productos"){
                    let nombreProducto = new RegExp(mensaje, 'i')
                    productoBase = await productosDB.findOne({nombre: nombreProducto})
                    Productos.Nombre = mensaje
                    Productos._idProducto = productoBase._id
                    Productos.PrecioUnidad = productoBase.Precio
                    Productos.Descripcion = productoBase.Descripcion
                    step = 3.1 // Tipo 
                }
                if (stepBase.step == "Agregando opciones"){
                    subdataOpciones.nombreOpcion = mensaje
                    step = 3.5 //Tipo
                }
                if (stepBase.step == "Tipo opciones"){
                    step = 3.5 //Tipo
                }
                if (stepBase.step == "Agregando opciones 2"){
                    if(mensaje == "no agregar"){
                        step = 3 //Preguntar cantidad
                    }else{
                        subdataOpciones.nombreOpcion = mensaje
                        step = 3.5 //Tipo
                    }
                }
                if (stepBase.step == "Agregando mas opciones"){
                    if(mensaje == "no agregar"){
                        step = 3 //Preguntar cantidad
                    }else{
                        subdataOpciones.tipo = mensaje
                        Opciones.push(subdataOpciones)
                        subdataOpciones = {}
                        step = 3.2 //Tipo
                    }
                }
                if(stepBase.step == "Cantidad"){
                    if(Productos.Nombre){
                        Productos.Cantidad = mensaje
                        Productos.PrecioTotal = Productos.Cantidad * Productos.PrecioUnidad
                    }
                    if(Promociones.Nombre){
                        Promociones.Cantidad = mensaje
                        Promociones.Opciones = Opciones
                        Promociones.PrecioTotal = (Promociones.Cantidad * Promociones.PrecioUnidad).toFixed(2)
                    }
                    step = 4 //Nota
                }
                if(stepBase.step == "Nota"){
                    if(Productos.Nombre){
                        Productos.Nota = mensaje
                        await ordenCompraDB.findOneAndUpdate({Sucursal: process.env.SUCURSAL},{ $push: { Productos: Productos } })
                        Productos = {}
                    }
                    if(Promociones.Nombre){
                        Promociones.Nota = mensaje
                        await ordenCompraDB.findOneAndUpdate({Sucursal: process.env.SUCURSAL},{ $push: { Promociones: Promociones } })
                        Promociones = {}
                    }
                    step = 5 //confirmar
                }
                if(stepBase.step == "NombreCliente"){
                    await ordenCompraDB.findOneAndUpdate({Sucursal: process.env.SUCURSAL},{NombreCliente: mensaje})
                    step = 7
                }
                if(stepBase.step == "DireccionCliente"){
                    await ordenCompraDB.findOneAndUpdate({Sucursal: process.env.SUCURSAL},{DireccionCliente: mensaje})
                    step = 8
                }
                if(stepBase.step == "TelefonoCliente"){
                    await ordenCompraDB.findOneAndUpdate({Sucursal: process.env.SUCURSAL},{TelefonoCliente: mensaje})
        
                    step = 9
                }
                if(stepBase.step == "Tipo entrega"){
                    await ordenCompraDB.findOneAndUpdate({TipoEntrega: mensaje})
                    let ordenCompleta = await ordenCompraDB.findOne({Sucursal: process.env.SUCURSAL})
                    let PrecioTotal = 0
                    let CantidadTotal = 0
                    ordenCompleta.Promociones.forEach(element => {
                        PrecioTotal += element.PrecioTotal
                        CantidadTotal += element.Cantidad
                    });
                    ordenCompleta.Productos.forEach(element => {
                        PrecioTotal += element.PrecioTotal
                        CantidadTotal += element.Cantidad
                    });
                    let Numero = 1
                    let ultimaVenta = await ventasDB.findOne().sort({Numero: -1})
                    if(ultimaVenta){
                        Numero = ultimaVenta.Numero + 1
                    }
        
                    
                    let Fecha = moment().format('L');
                    Fecha = Fecha.split('/');
                    Fecha = `${Fecha[1]}/${Fecha[0]}/${Fecha[2]}`;
                    let hora = moment().format('LTS');
        
                    let nuevaVenta = new ventasDB({
                        Fecha: Fecha,
                        FechaCompleta: `${Fecha} ${hora}`,
                        Timestamp: Date.now(),
                        Numero: Numero,
                        Cliente: ordenCompleta.NombreCliente.toUpperCase(),
                        Dirección: ordenCompleta.DireccionCliente,
                        Telefono: ordenCompleta.TelefonoCliente,
                        Vendedor: process.env.VENDEDOR,
                        Sucursal: process.env.SUCURSAL,
                        TipoEntrega: ordenCompleta.TipoEntrega,
                        CantidadTotal: CantidadTotal,
                        PrecioTotal: PrecioTotal,
                        Promociones: ordenCompleta.Promociones,
                        Productos: ordenCompleta.Productos,
                    })
                    
                    await actualizarIndicadores(
                        PrecioTotal = PrecioTotal, 
                        CantidadTotal = CantidadTotal, 
                        ItemProductos = ordenCompleta.Productos || [], 
                        ItemPromociones = ordenCompleta.Promociones || [], 
                        ItemMateriales = [], 
                        Sucursal = process.env.SUCURSAL_ID, 
                        Cliente = ordenCompleta.TelefonoCliente, 
                        Fecha = Fecha, 
                        Gastos = null, 
                    )

                    ultimaVentaRealizada = Numero
                    _idUltimaVenta = nuevaVenta._id

                            //Enviar notificacion
                    let post = {
                        titulo: `Nuevo pedido pedido #${Numero}`,
                        descripcion: `El pedido #${Numero} ha sido creado`,
                        url: `${ process.env.URL }ventas/todas-ventas`,
                        sucursal: process.env.SUCURSAL
                    }
                    push.sendNotification(post)



                    await nuevaVenta.save()
                    await ordenCompraDB.deleteOne({Sucursal: process.env.SUCURSAL})
                    await stepsDB.deleteOne()
        
                    step = 10
                }
            }else{
                step = 0 //error 
            }
        }
        if(!step){
            step = "error" //error
        }
    
        if(step === 1){
            replyMessage = `Escriba el tipo de item: \n  *Promo*  \n  *Productos* `
        } else if(step === "error"){
            replyMessage = `Ups!, no entendí el comando. Si quiere un nuevo pedido escriba *Nuevo pedido*`
        } 
        else if(step === 2.1){
            //Promos
            let promociones = await promocionesDB.find().sort({Nombre:1}).select('Nombre')
            replyMessage = `Escriba el nombre de la promocion: \n `
            for (let i = 0; i < promociones.length; i++) {
                replyMessage += ` *${promociones[i].Nombre}*  \n `
            }
        
            let steps = await stepsDB.findOne()
            if(steps){
                await stepsDB.findOneAndUpdate({step:'Promo'})
            }else{
                let nuevoStep = new stepsDB({
                    step: 'Promo'
                })
                await nuevoStep.save()
            }
        
        } else if(step === 2.2){
            //Productos
            let productos = await productosDB.find().sort({Nombre:1}).select('Nombre')
            replyMessage = `Escriba el nombre del producto: \n `
            for (let i = 0; i < productos.length; i++) {
                replyMessage += ` *${productos[i].Nombre}*  \n `
            }
            let steps = await stepsDB.findOne()
            if(steps){
                await stepsDB.findOneAndUpdate({step:'Productos'})
            }else{
                let nuevoStep = new stepsDB({
                    step: 'Productos'
                })
                await nuevoStep.save()
            }
        } 
        else if  (step === 2.3){
            promoActiva = new RegExp(promoActiva, 'i')
            let promocion = await promocionesDB.findOne({Nombre:promoActiva})
            replyMessage = `Escriba el nombre de la opcion a agregar\n`
            for (let i = 0; i < promocion.Opciones.length; i++) {
                replyMessage += `${i+1} - *${promocion.Opciones[i].Nombre}* \n`
            }
            await stepsDB.findOneAndUpdate({step:'Agregando opciones'})
        
        }
        else if(step === 3){
            //Cantidad
            replyMessage = `Escriba la cantidad: \n`
            await stepsDB.findOneAndUpdate({step:'Cantidad'})
        }
        else if(step === 3.5){
            //Cantidad
            replyMessage = `Escriba el tipo: \n  *Normal*  \n  *Tempura*  \n  *Frio* ` 
            await stepsDB.findOneAndUpdate({step:'Agregando mas opciones'})
        }
        else if(step === 3.1){
            //Cantidad
            replyMessage = `Escriba el tipo: \n  *Normal*  \n  *Tempura*  \n  *Frio* ` 
            await stepsDB.findOneAndUpdate({step:'Tipo'})
        }
        else if(step === 3.2){
            //preguntar mas opciones
            promoActiva = new RegExp(promoActiva, 'i')
            let promocion = await promocionesDB.findOne({Nombre:promoActiva})
            replyMessage = `Escriba el nombre de la opcion a agregar\n`
            for (let i = 0; i < promocion.Opciones.length; i++) {
                replyMessage += `${i+1} - *${promocion.Opciones[i].Nombre}* \n`
            }
            replyMessage += `*No agregar*`
            await stepsDB.findOneAndUpdate({step:'Agregando opciones 2'})
        }
        else if(step === 4){
            replyMessage = `Nota de producto:`
            await stepsDB.findOneAndUpdate({step:'Nota'})
        }
        else if(step === 5){
            replyMessage = `Item agregado correctamente: \n  *Finalizar*  \n  *Agregar mas* `
            await stepsDB.findOneAndUpdate({step:'Nota'})
        }
        else if (step === 6){
            replyMessage = `Introduzca el nombre del cliente: `
            await stepsDB.findOneAndUpdate({step:'NombreCliente'})
        }
        else if (step === 7){
            replyMessage = `Introduzca la dirección cliente: `
            await stepsDB.findOneAndUpdate({step:'DireccionCliente'})
        } 
        else if (step === 8){
            replyMessage = `Introduzca el teléfono cliente: `
            await stepsDB.findOneAndUpdate({step:'TelefonoCliente'})
        }
        else if (step === 9){
            replyMessage = `Tipo de entrega:  \n *Pick up* \n *Delivery*`
            await stepsDB.findOneAndUpdate({step: 'Tipo entrega'})
        }
        else if (step === 10){
            replyMessage = `Pedido realizado correctamente: ✅  \n  *Ver resumen*  \n  *Nuevo pedido*  `
            await stepsDB.findOneAndRemove()
        } else if (step === 11){
            let ultimaVenta = await ventasDB.findById(_idUltimaVenta)
            replyMessage = `Resumen de pedido  \n Venta #${ultimaVenta.Numero} \n Cliente : ${ultimaVenta.Cliente} \n Direccion : ${ultimaVenta.Dirección} \n Telefono : ${ultimaVenta.Telefono} \n Tipo de entrega : ${ultimaVenta.TipoEntrega} \n Precio total : $${ultimaVenta.PrecioTotal} \n Cantidad total : ${ultimaVenta.CantidadTotal} \n Para realizar nuevo pedido escriba *Nuevo pedido*`
        }
        
        let resData = { replyMessage, media: null, trigger: null }
        
       client.sendMessage(message.from, resData.replyMessage)
       
    }catch(e){
        console.log(e)
        client.sendMessage(message.from, 'Ups! Ocurrio un error al intentar responderte. Por favor valida que el mensaje que me estas enviando sea correcto.')
    }
});
 

//cierre

client.initialize();

// cierre del whatsap bot




app.listen(app.get("port"), () => {
    console.log("Escuchando en " + app.get("port"));
});