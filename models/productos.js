const mongoose = require("mongoose");
const { Schema } = mongoose;

const productos = new Schema({
    Nombre: { type: String, require: true },
    Descripcion: { type: String, require: true },
    Cantidad: { type: String, require: true },
    Precio: { type: String, require: true },
    Activo: { type: Boolean, default: true },
    Costo: { type: String, require: true },
});

module.exports = mongoose.model("productos", productos);
