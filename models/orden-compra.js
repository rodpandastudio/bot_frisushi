const mongoose = require("mongoose");
const { Schema } = mongoose;

let Fecha = new Date();
let dia;
let mes;
let año = Fecha.getFullYear();
if (Fecha.getDate() < 10) {
    dia = `0${Fecha.getDate()}`;
} else {
    dia = Fecha.getDate();
}
if (Fecha.getMonth() + 1 < 10) {
    mes = `0${Fecha.getMonth() + 1}`;
} else {
    mes = Fecha.getMonth() + 1;
}
Fecha = `${dia}/${mes}/${año}`;

const ordenCompra = new Schema({
    Fecha: {type: String, default: Fecha},
    Timestamp: { type: Number, default: Date.now() },
    PrecioTotal : { type: Number },
    CantidadTotal : { type: Number },
    NombreCliente : { type: String },
    DireccionCliente : { type: String },
    TelefonoCliente : { type: String },
    Sucursal : { type: String },
    TipoEntrega : { type: String },
    Promociones: [{
        _idPromocion: { type: String },
        Nombre: { type: String },
        Descripcion: { type: String },
        PrecioUnidad: { type: Number },
        PrecioTotal: { type: Number },
        Nota : { type: String},
        Cantidad : { type: Number },
        Opciones : [{
            nombreOpcion : { type: String },
            tipo : { type: String },
        }]
    }],    
    Productos: [{
        _idProducto: { type: String },
        Nombre: { type: String },
        PrecioUnidad: { type: Number },
        PrecioTotal: { type: Number },
        Descripcion: { type: String },
        Tipo: { type: String },
        Nota : { type: String},
        Cantidad : { type: Number },
    }]    
});

module.exports = mongoose.model("ordenCompra", ordenCompra);