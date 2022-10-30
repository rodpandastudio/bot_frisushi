const mongoose = require("mongoose");
const { Schema } = mongoose;

const indicadoresPromociones = new Schema({
    MontoTotal: {type: String, require: true},
    CantidadTotal: { type: Number, require: true },
    Promocion : {type: String, require: true},
    Meses : [{
        Mes: { type: String, equire: true  },
        Anio: { type: String, require: true },
        Monto: { type: Number, require: true },
        Cantidad: { type: Number, require: true },
    }]
   
});

module.exports = mongoose.model("indicadoresPromociones", indicadoresPromociones);