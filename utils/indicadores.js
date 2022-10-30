let indicadores = {}
const productosDB = require('../models/productos');
const promocionesDB = require('../models/promociones');
const indicadoresClientesDB = require('../models/indicadoresVentas/clientes')
const indicadoresSucursalesDB = require('../models/indicadoresVentas/sucursales')
const indicadoresProductosDB = require('../models/indicadoresVentas/productos')
const indicadoresPromocionesDB = require('../models/indicadoresVentas/promociones')
const indicadoresGastosDB = require('../models/indicadoresVentas/gastos')
const indicadoresVentasDB = require('../models/indicadoresVentas/ventas')
const indicadoresUtilidadesDB = require('../models/indicadoresVentas/utilidades')

const calculoMes = (mes) =>{
    switch(mes){
        case '01':
            return 'Enero'
        case '02':
            return 'Febrero'
        case '03':
            return 'Marzo'
        case '04':
            return 'Abril'
        case '05':
            return 'Mayo'
        case '06':
            return 'Junio'
        case '07':
            return 'Julio'
        case '08':
            return 'Agosto'
        case '09':
            return 'Septiembre'
        case '10':
            return 'Octubre'
        case '11':
            return 'Noviembre'
        case '12':
            return 'Diciembre'
    }
}

const calculoCosto = async (TipoItem, Item) =>{
    let costo = 0
    if(TipoItem == 'Producto'){
        for(i=0; i< Item.length; i++){

            let producto = await productosDB.findById(Item[i]._idProducto).select('Costo')
            costo += producto.Costo * +Item[i].Cantidad
        }
    }else if(TipoItem == 'Promociones'){
        for(i=0; i< Item.length; i++){
            let promocion = await promocionesDB.findById(Item[i]._idPromocion)
            costo += +promocion.Costo * +Item[i].Cantidad
        }
    }else{
        for(i=0; i< Item.length; i++){
            let materia = await materiaDB.findOne({Nombre: Item[i].Nombre})
            costo += +materia.Precio * +Item[i].Cantidad
        }
    }
    costo = costo.toFixed(2)
    return costo
}

const ventas = async (PrecioTotal, Fecha, CantidadTotal) =>{
    let mes = Fecha.split('/')[1]
    let Mes = calculoMes(mes)
    let Anio = Fecha.split('/')[2]
    let indicadorVentas = await indicadoresVentasDB.findOne()
    if(indicadorVentas){
        let MontoTotal = (+indicadorVentas.MontoTotal + +PrecioTotal).toFixed(2)
        let validacionMeses = indicadorVentas.Meses.find( mes => mes.Mes == Mes && mes.Anio == Anio)
        if(validacionMeses){
            let Monto = (+validacionMeses.Monto + +PrecioTotal).toFixed(2)
            let Meses = indicadorVentas.Meses.map( mes => {
                if(mes.Mes == Mes && mes.Anio == Anio){
                    return {
                        Mes: mes.Mes,
                        Anio: mes.Anio,
                        Monto: Monto
                    }
                }else{
                    return mes
                }
            })
            await indicadoresVentasDB.findByIdAndUpdate(indicadorVentas._id, {
                MontoTotal: MontoTotal,
                Meses: Meses
            })
        }else{
            await indicadoresVentasDB.findByIdAndUpdate(indicadorVentas._id, {
                MontoTotal:MontoTotal,  
                $push: {Meses: {Mes: Mes, Anio: Anio, Monto: PrecioTotal}}
            })
        }
    }else{
        let indicadoresVentas = new indicadoresVentasDB({
            MontoTotal: PrecioTotal,
            Meses: [{Mes: Mes, Anio: Anio, Monto: PrecioTotal}]
        })

        await indicadoresVentas.save()
      
    }

    return true
    
}

const utilidades = async  (PrecioTotal, TipoItem, Item, Fecha, CantidadTotal) =>{
    let costo = await calculoCosto(TipoItem, Item)
    let mes = Fecha.split('/')[1]
    let Mes = calculoMes(mes)
    let Anio = Fecha.split('/')[2]
    let utilidad = (+PrecioTotal - +costo).toFixed(2)
    PrecioTotal = utilidad
    let indicadoresUtilidades = await indicadoresUtilidadesDB.findOne()
    if(indicadoresUtilidades){
        let MontoTotal = (+indicadoresUtilidades.MontoTotal + +PrecioTotal).toFixed(2)
        let CantidadTotalBase = indicadoresUtilidades.CantidadTota
        let validacionMeses = indicadoresUtilidades.Meses.find( mes => mes.Mes == Mes && mes.Anio == Anio)
        if(validacionMeses){
            let Monto = (+validacionMeses.Monto + +PrecioTotal).toFixed(2)
            let Cantidad = +validacionMeses.Cantidad + +CantidadTotal
            let Meses = indicadoresUtilidades.Meses.map( mes => {
                if(mes.Mes == Mes && mes.Anio == Anio){
                    return {
                        Mes: mes.Mes,
                        Anio: mes.Anio,
                        Cantidad: Cantidad,
                        Monto: Monto
                    }
                }else{
                    return mes
                }
            })
            await indicadoresUtilidadesDB.findByIdAndUpdate(indicadoresUtilidades._id, {
                MontoTotal: MontoTotal,
                CantidadTotal: CantidadTotalBase,
                Meses: Meses
            })
        }else{
            await indicadoresUtilidadesDB.findByIdAndUpdate(indicadoresUtilidades._id, {
                MontoTotal:MontoTotal,
                CantidadTotal: CantidadTotalBase,
                $push: {Meses: {Mes: Mes, Anio: Anio, Monto: PrecioTotal, Cantidad: CantidadTotal}}
            })
        }
    }else{
        await indicadoresUtilidadesDB.create({
            MontoTotal: PrecioTotal,
            CantidadTotal: CantidadTotal,
            Meses: [{Mes: Mes, Anio: Anio, Monto: PrecioTotal, Cantidad: CantidadTotal}]
        })
    }

    return true
}


const sucursales = async (Sucursal, PrecioTotal, Fecha, CantidadTotal) =>{
    let mes = Fecha.split('/')[1]
    let Mes = calculoMes(mes)
    let Anio = Fecha.split('/')[2]
    let indicadoresSucursales = await indicadoresSucursalesDB.findOne({Sucursal: Sucursal})
    if(indicadoresSucursales){
        let MontoTotal = (+indicadoresSucursales.MontoTotal + +PrecioTotal).toFixed(2)
        let CantidadTotalBase = +indicadoresSucursales.CantidadTotal + +CantidadTotal
        let validacionMeses = indicadoresSucursales.Meses.find( mes => mes.Mes == Mes && mes.Anio == Anio)
        if(validacionMeses){
            let Monto = (+validacionMeses.Monto + +PrecioTotal).toFixed(2)
            let Cantidad = +validacionMeses.Cantidad + +CantidadTotal
            let Meses = indicadoresSucursales.Meses.map( mes => {
                if(mes.Mes == Mes && mes.Anio == Anio){
                    return {
                        Mes: mes.Mes,
                        Anio: mes.Anio,
                        Cantidad: Cantidad,
                        Monto: Monto
                    }
                }else{
                    return mes
                }
            })
            await indicadoresSucursalesDB.findByIdAndUpdate(indicadoresSucursales._id, {
                MontoTotal: MontoTotal,
                CantidadTotal: CantidadTotalBase,
                Meses: Meses
            })
        }else{
            await indicadoresSucursalesDB.findByIdAndUpdate(indicadoresSucursales._id, {
                MontoTotal:MontoTotal,
                CantidadTotal:CantidadTotalBase,
                $push: {Meses: {Mes: Mes, Anio: Anio, Monto: PrecioTotal, Cantidad: CantidadTotal}}
            })
        }
    }else{
        await indicadoresSucursalesDB.create({
            Sucursal: Sucursal,
            MontoTotal: PrecioTotal,
            CantidadTotal: CantidadTotal,
            Meses: [{Mes: Mes, Anio: Anio, Monto: PrecioTotal, Cantidad: CantidadTotal}]
        })
    }
    return true

}


const productos = async (Item, PrecioTotal, CantidadTotal, Fecha) =>{
    let mes = Fecha.split('/')[1]
    let Mes = calculoMes(mes)
    let Anio = Fecha.split('/')[2]
    for(i=0; i< Item.length; i++){
        // Actualizar indicadores de productos vendidos        
        let indicadoresProductos = await indicadoresProductosDB.findOne({Producto: Item[i].Nombre})
        PrecioTotal = Item[i].PrecioTotal
        CantidadTotal = Item[i].Cantidad
        if(indicadoresProductos){
            let MontoTotal = (+indicadoresProductos.MontoTotal + +PrecioTotal).toFixed(2)
            let CantidadTotalBase = +indicadoresProductos.CantidadTotal + +CantidadTotal
            let validacionMeses = indicadoresProductos.Meses.find( mes => mes.Mes == Mes && mes.Anio == Anio)
            if(validacionMeses){
                let Monto = (+validacionMeses.Monto + +PrecioTotal).toFixed(2)
                let Cantidad = +validacionMeses.Cantidad + +CantidadTotal
                let Meses = indicadoresProductos.Meses.map( mes => {
                    if(mes.Mes == Mes && mes.Anio == Anio){
                        return {
                            Mes: mes.Mes,
                            Anio: mes.Anio,
                            Cantidad: Cantidad,
                            Monto: Monto
                        }
                    }else{
                        return mes
                    }
                })

                await indicadoresProductosDB.findByIdAndUpdate(indicadoresProductos._id, {
                    MontoTotal: MontoTotal,
                    CantidadTotal: CantidadTotalBase,
                    Meses: Meses
                })
            }else{
                await indicadoresProductosDB.findByIdAndUpdate(indicadoresProductos._id, {
                    MontoTotal:MontoTotal,
                    CantidadTotal:CantidadTotalBase,
                    $push: {Meses: {Mes: Mes, Anio: Anio, Monto: PrecioTotal, Cantidad: CantidadTotal}}
                })
            }
        }else{
            await indicadoresProductosDB.create({
                Producto: Item[i].Nombre,
                MontoTotal: PrecioTotal,
                CantidadTotal: CantidadTotal,
                Meses: [{Mes: Mes, Anio: Anio, Monto: PrecioTotal, Cantidad: CantidadTotal}]
            })
        }
    }
    return true


}


const promociones = async (Item, PrecioTotal, CantidadTotal, Fecha) =>{
    let mes = Fecha.split('/')[1]
    let Mes = calculoMes(mes)
    let Anio = Fecha.split('/')[2]
    
    for(i=0; i< Item.length; i++){
        let indicadoresPromociones = await indicadoresPromocionesDB.findOne({Promocion: Item[i].Nombre})
        PrecioTotal = Item[i].PrecioTotal
        CantidadTotal = Item[i].Cantidad
        if(indicadoresPromociones){
            let MontoTotal = (+indicadoresPromociones.MontoTotal + +PrecioTotal).toFixed(2)
            let CantidadTotalBase = +indicadoresPromociones.CantidadTotal + +CantidadTotal
            let validacionMeses = indicadoresPromociones.Meses.find( mes => mes.Mes == Mes && mes.Anio == Anio)
            if(validacionMeses){
                let Monto = (+validacionMeses.Monto + +PrecioTotal).toFixed(2)
                let Cantidad = +validacionMeses.Cantidad + +CantidadTotal
                let Meses = indicadoresPromociones.Meses.map( mes => {
                    if(mes.Mes == Mes && mes.Anio == Anio){
                        return {
                            Mes: mes.Mes,
                            Anio: mes.Anio,
                            Cantidad: Cantidad,
                            Monto: Monto
                        }
                    }else{
                        return mes
                    }
                })

                await indicadoresPromocionesDB.findByIdAndUpdate(indicadoresPromociones._id, {
                    MontoTotal: MontoTotal,
                    CantidadTotal: CantidadTotalBase,
                    Meses: Meses
                })

            }else{
                await indicadoresPromocionesDB.findByIdAndUpdate(indicadoresPromociones._id, {
                    MontoTotal:MontoTotal,
                    CantidadTotal:CantidadTotalBase,
                    $push: {Meses: {Mes: Mes, Anio: Anio, Monto: PrecioTotal, Cantidad: CantidadTotal}}
                })
            }
        }else{
            await indicadoresPromocionesDB.create({
                Promocion: Item[i].Nombre,
                MontoTotal: PrecioTotal,
                CantidadTotal: CantidadTotal,
                Meses: [{Mes: Mes, Anio: Anio, Monto: PrecioTotal, Cantidad: CantidadTotal}]
            })
        }
    }
    return true
}


const clientes = async (Cliente, PrecioTotal, CantidadTotal) =>{
    let indicadoresClientes = await indicadoresClientesDB.findOne({Cliente: Cliente})
    if(indicadoresClientes){
        let MontoTotal = (+indicadoresClientes.MontoTotal + +PrecioTotal).toFixed(2)
        let CantidadTotalBase = +indicadoresClientes.CantidadTotal + +CantidadTotal
        await indicadoresClientesDB.findByIdAndUpdate(indicadoresClientes._id, {
            MontoTotal:MontoTotal,
            CantidadTotal:CantidadTotalBase
        })
    }else{
        await indicadoresClientesDB.create({
            Cliente: Cliente,
            MontoTotal: PrecioTotal,
            CantidadTotal: CantidadTotal,
        })
    }
    return true

}


const gastos = async (Gastos, Fecha) =>{
    let mes = Fecha.split('/')[1]
    let Mes = calculoMes(mes)
    let Anio = Fecha.split('/')[2]
    let indicadoresGastos = await indicadoresGastosDB.findOne({Gasto: Gastos})
    
    if(indicadoresGastos){
        let MontoTotal = (+indicadoresGastos.MontoTotal + +Gastos).toFixed(2)
        let validacionMeses = indicadoresGastos.Meses.find( mes => mes.Mes == Mes && mes.Anio == Anio)
        if(validacionMeses){
            let Monto = (+validacionMeses.Monto + +Gastos).toFixed(2)
            let Meses = indicadoresGastos.Meses.map( mes => {
                if(mes.Mes == Mes && mes.Anio == Anio){
                    return {
                        Mes: mes.Mes,
                        Anio: mes.Anio,
                        Monto: Monto
                    }
                }else{
                    return mes
                }
            })
            await indicadoresGastosDB.findByIdAndUpdate(indicadoresGastos._id, {
                MontoTotal: MontoTotal,
                Meses:Meses
            })
        }else{
            await indicadoresGastosDB.findByIdAndUpdate(indicadoresGastos._id, {
                MontoTotal:MontoTotal,
                $push: {Meses: {Mes: Mes, Anio: Anio, Monto: Gastos}}
            })
        }
    }else{
        await indicadoresGastosDB.create({
            Gasto: Gastos,
            MontoTotal: Gastos,
            Meses: [{Mes: Mes, Anio: Anio, Monto: Gastos}]
        })
    }
    return true

}

indicadores.actualizarIndicadores = async (PrecioTotal, CantidadTotal, ItemProductos, ItemPromociones, ItemMateriales, Sucursal, Cliente, Fecha, Gastos ) =>{
    console.log({
        PrecioTotal: PrecioTotal,
        CantidadTotal: CantidadTotal,
        ItemProductos: ItemProductos,
        ItemPromociones: ItemPromociones,
        ItemMateriales: ItemMateriales,
        Sucursal: Sucursal,
        Cliente: Cliente,
        Fecha: Fecha,
        Gastos: Gastos
    })
    if(PrecioTotal == null){
        await gastos(Gastos, Fecha)
    }else{
        await ventas(PrecioTotal, Fecha)
        let utilidadesValidacion = false
        if(ItemProductos.length > 0){
            TipoItem = 'Producto'
            Item = ItemProductos
            await utilidades(PrecioTotal, TipoItem, Item, Fecha, CantidadTotal)
            utilidadesValidacion = true
            await productos(Item, PrecioTotal, CantidadTotal, Fecha)
        }
        if(ItemPromociones.length > 0){
            TipoItem = 'Promociones'
            Item = ItemPromociones 
            if(utilidades == false){
                await utilidades(PrecioTotal, TipoItem, Item, Fecha, CantidadTotal)
                utilidadesValidacion = true
            }
            await promociones(Item, PrecioTotal, CantidadTotal, Fecha)
        }if(ItemMateriales.length > 0) {
            TipoItem = 'Materias'
            Item = ItemMateriales
            if(utilidades == false){
                await utilidades(PrecioTotal, TipoItem, Item, Fecha, CantidadTotal)
                utilidadesValidacion = true
            }
        }
        await sucursales(Sucursal, PrecioTotal, Fecha, CantidadTotal)
        await clientes(Cliente, PrecioTotal, CantidadTotal)
    }
    return true
}

module.exports = indicadores