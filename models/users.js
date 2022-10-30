const mongoose = require("mongoose");

const { Schema } = mongoose;
const bcrypt = require('bcryptjs')

const usersCollection = new Schema({
    Nombre: { type: String, require: true },
    email: { type: String, require: true },
    password: { type: String, require: true },
    Tipo: { type: String, require: true },
    Sucursal: { type: String, require: true },
    Tema: { type: String, default: "dark" },
    Activo: { type: Boolean, default: true },
    Suscripcion : {
        endpoint: { type: String },
        expirationTime: { type: String },
        keys: {
            p256dh: { type: String },
            auth: { type: String }
        }
    }
});

//encriptando contraseña
usersCollection.methods.encryptPassword = async(password) => {
    return bcrypt.hashSync(password, 10)
};
usersCollection.methods.comparePassword = function(password) {
    return bcrypt.compareSync(password, this.password);
}


module.exports = mongoose.model("usersCollection", usersCollection);