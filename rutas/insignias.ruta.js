const express = require('express');
const app = express();

/* === Controlador ===== */
const Insignias = require('../controladores/insignias.controlador');

/* === Middleware ====== */
const { verificarToken } = require('../middlewares/autenticacion');

/* === Rutas =========== */
app.get(    '/struct_insignias',           verificarToken, Insignias.preCreate);
app.post(   '/insignias',                  verificarToken, Insignias.crear);
app.get(    '/insignias',                  verificarToken, Insignias.leer);
app.get(    '/insignias/:id',              verificarToken, Insignias.leer_id);
app.put(    '/insignias/:id',              verificarToken, Insignias.actualizar);
app.delete( '/insignias/:id',              verificarToken, Insignias.eliminar);

/* === Exportamos ====== */
module.exports = app;