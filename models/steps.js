const mongoose = require("mongoose");
const { Schema } = mongoose;

const steps = new Schema({
    step : {type: String, required: true},
});

module.exports = mongoose.model("pasos", steps);
