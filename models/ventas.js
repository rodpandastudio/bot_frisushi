const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment");


const venta = new Schema({
    Fecha: {type: String, required: true },
    FechaCompleta: {type: String, required: true },
    Timestamp: { type: Number, required: true  },
    Numero : { type: Number, required: true },
    Cliente: { type: String, required: true },
    Dirección: { type: String, required: true },
    Telefono: { type: String, required: true },
    Vendedor: { type: String, required: true },
    Sucursal: { type: String, required: true },
    TipoEntrega: { type: String, required: true },
    Estado: { type: String, default: 'En proceso' },
    CantidadTotal : { type: Number },
    PrecioTotal : { type: Number },
    Promociones: [{
        _idPromocion: { type: String, required: true },
        Nombre: { type: String, required: true },
        PrecioUnidad: { type: Number, required: true },
        PrecioTotal: { type: Number, required: true },
        Descripcion: { type: String, required: true },
        Nota : { type: String},
        Cantidad : { type: Number, required: true },
        Opciones : [{
            nombreOpcion : { type: String, required: true },
            tipo : { type: String, required: true },
        }]
    }],    
    Productos: [{
        _idProducto: { type: String, required: true },
        Nombre: { type: String, required: true },
        PrecioUnidad: { type: Number, required: true },
        PrecioTotal: { type: Number, required: true },
        Descripcion: { type: String, required: true },
        Tipo: { type: String, required: true },
        Nota : { type: String},
        Cantidad : { type: Number, required: true },
    }]    
});

module.exports = mongoose.model("venta", venta);