const mongoose = require("mongoose");
const { Schema } = mongoose;

const sucursal = new Schema({
    Nombre: { type: String, require: true },
    Estado: { type: String, require: true },
    Ciudad: { type: String, require: true },
    Activo: { type: Boolean, default: true },
});

module.exports = mongoose.model("sucursal", sucursal);
