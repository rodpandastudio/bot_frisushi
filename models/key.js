const mongoose = require("mongoose");
const { Schema } = mongoose;

const key = new Schema({
    key :[{
        key :{type: String, required: true},
        valor: { type: String, required: true },
    }]
});

module.exports = mongoose.model("key", key);
