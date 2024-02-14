const express = require('express');
const app = express();

/* === Controlador ===== */
const Recordatorios = require('../controladores/recordatorios.controlador');

/* === Middleware ====== */
const { verificarToken } = require('../middlewares/autenticacion');

/* === Rutas =========== */
app.get(    '/struct_recordatorio',                       verificarToken, Recordatorios.preCreate);
app.post(   '/recordatorios',                             verificarToken, Recordatorios.crear);
app.get(    '/recordatorios',                             verificarToken, Recordatorios.leer);
app.get(    '/recordatorios/:id',                         verificarToken, Recordatorios.leer_id);
app.put(    '/recordatorios/:id',                         verificarToken, Recordatorios.actualizar);
app.delete( '/recordatorios/:id',                         verificarToken, Recordatorios.eliminar);
app.put(    '/recordatorioVisto/:id',                     verificarToken, Recordatorios.recordatorio_visto);

/* === Exportamos ====== */
module.exports = app;