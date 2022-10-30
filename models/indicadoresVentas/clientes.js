const mongoose = require("mongoose");
const { Schema } = mongoose;

const indicadoresClientes = new Schema({
    MontoTotal: {type: String, require: true},
    CantidadTotal: { type: Number, require: true },
    Cliente : {type: String, require: true},
});

module.exports = mongoose.model("indicadoresClientes", indicadoresClientes);