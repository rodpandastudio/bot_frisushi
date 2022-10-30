const mongoose = require("mongoose");
const { Schema } = mongoose;

const promociones = new Schema({
    Nombre: { type: String, require: true },
    Descripcion: { type: String, require: true },
    Precio: { type: String, require: true },
    Activo: { type: Boolean, default: true },
    Costo: { type: String, require: true },
    Opciones: [{
        Nombre: { type: String, require: true },
    }],
});

module.exports = mongoose.model("promociones", promociones);
