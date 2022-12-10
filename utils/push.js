const vapid = require('../vapid.json');
const urlsafeBase64 = require('urlsafe-base64');
const webpush = require('web-push');
const usuariosDB = require('../models/users');


webpush.setVapidDetails(
    'mailto: rodpandastudio@gmail.com',
    vapid.publicKey,
    vapid.privateKey
);


module.exports.getKey = () => {
    return urlsafeBase64.decode(vapid.publicKey);
}

module.exports.sendNotification = async (post) => {

    const suscripciones = await usuariosDB.find({$and: [{Suscripcion: {$ne: null}}, {Sucursal: post.sucursal}]});

    const payload = JSON.stringify({
        titulo: post.titulo,
        descripcion: post.descripcion,
        url: post.url,
    });

    console.log(payload);

    suscripciones.forEach( suscripcion => {
        webpush.sendNotification(suscripcion.Suscripcion, payload)
            .catch( err => {
                console.log(err);
            })
    })

}

