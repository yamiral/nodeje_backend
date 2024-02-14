const express = require('express');
const app = express();

/* === Controlador ===== */
const Jefe = require('../controladores/jefe.controlador');

/* === Middleware ====== */
const { verificarToken } = require('../middlewares/autenticacion');

/* === Rutas =========== */
app.get(    '/consulta_grupo/:grupo',                           verificarToken, Jefe.consulta_grupo);
app.get(    '/consulta_usuario_unidad/:id_usuario/:id_unidad',  verificarToken, Jefe.consulta_usuario_unidad);

app.post(    '/guarda_evaluacion_jefe',                         verificarToken, Jefe.guarda_evaluacion);
app.post(    '/guarda_acuerdos_jefe',                           verificarToken, Jefe.guarda_acuerdos);

app.get(    '/consulta_uno_a_uno',                              verificarToken, Jefe.consulta_uno_a_uno);
app.get(    '/grupos_jefe',                                     verificarToken, Jefe.grupos_jefe);

app.get(    '/guias_jefe/:id_grupo',                            verificarToken, Jefe.guias_jefe);

app.get(    '/insignias_jefe/:id_grupo',                        verificarToken, Jefe.insignias_jefe);

app.get(    '/analiticos_jefe/:grupo?',                         verificarToken, Jefe.analiticos_jefe);
app.get(    '/export_analiticos_jefe/:grupo?',                  verificarToken, Jefe.export_analiticos_jefe);
/* === Exportamos ====== */
module.exports = app;