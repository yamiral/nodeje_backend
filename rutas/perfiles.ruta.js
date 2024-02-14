const express = require('express');
const app = express();

/* === Controlador ===== */
const Perfiles = require('../controladores/perfiles.controlador');

/* === Middleware ====== */
const { verificarToken } = require('../middlewares/autenticacion');

/* === Rutas =========== */
app.get(    '/struct_perfiles', verificarToken, Perfiles.preCreate);
app.post(   '/perfiles',        verificarToken, Perfiles.crear);
app.get(    '/perfiles',        verificarToken, Perfiles.leer);
app.get(    '/perfiles/:id',    verificarToken, Perfiles.leer_id);
app.put(    '/perfiles/:id',    verificarToken, Perfiles.actualizar);
app.delete( '/perfiles/:id',    verificarToken, Perfiles.eliminar);

/* === Exportamos ====== */
module.exports = app;