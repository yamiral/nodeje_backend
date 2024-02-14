const express = require('express');
const app = express();

/* === Controlador ===== */
const Aws = require('../controladores/aws.controlador');

/* === Middleware ====== */
const { verificarToken } = require('../middlewares/autenticacion');

/* === Rutas =========== */
app.post(    '/s3_sign',                verificarToken, Aws.sign_s3);

app.post(    '/recuperar',              Aws.recuperar_contrasenia);

app.post(   '/contacto_tutor',          verificarToken, Aws.contactoTutor)

app.post(    '/enviar_correo/?',       Aws.correo_automatico);

/* === Exportamos ====== */
module.exports = app;