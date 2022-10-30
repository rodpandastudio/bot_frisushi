const mongoose = require("mongoose");
const { Schema } = mongoose;

const indicadoresGastos = new Schema({
    MontoTotal: {type: String, require: true},
    CantidadTotal: { type: Number, require: true },
    Meses : [{
        Mes: { type: String, equire: true  },
        Anio: { type: String, require: true },
        Monto: { type: Number, require: true },
        Cantidad: { type: Number, require: true },
    }]
   
});

module.exports = mongoose.model("indicadoresGastos", indicadoresGastos);