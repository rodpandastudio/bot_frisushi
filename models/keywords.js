const mongoose = require("mongoose");
const { Schema } = mongoose;

const keywords = new Schema({
    keyword :[{
        tipo: { type: String, required: true },
        keywords :[{type: String, required: true}],
        key :{type: String, required: true},
    }]
});

module.exports = mongoose.model("keywords", keywords);
