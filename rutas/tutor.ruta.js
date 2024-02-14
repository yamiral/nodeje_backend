const express = require('express');
const app = express();

/* === Controlador ===== */
const Tutor = require('../controladores/tutor.controlador');

/* === Middleware ====== */
const { verificarToken } = require('../middlewares/autenticacion');

/* === Rutas =========== */

app.get(    '/tutor/inicio',                                    verificarToken, Tutor.home_tutor);
app.get(    '/tutor/grupo/:id_grupo',                           verificarToken, Tutor.usuarios_grupo);
app.post(   '/tutor/guarda_evaluacion/:id',                     verificarToken, Tutor.guarda_evaluacion);

app.get(    '/tutor/lista_objetos/:id_grupo',                   verificarToken, Tutor.listado_objetos);
app.get(    '/tutor/objetos/:id',                               verificarToken, Tutor.objeto);
app.get(    '/tutor/preguntas/:id_grupo/:id_actividad',         verificarToken, Tutor.getPreguntas);
app.put(    '/tutor/Preguntas/Agregar/:id_grupo/:id_actividad', verificarToken, Tutor.agregaPregunta);
app.put(    '/tutor/Respuestas/Agregar/:id_pregunta',           verificarToken, Tutor.agregaRespuesta);

app.get(    '/tutor/:id_tutor/inicio',                          verificarToken, Tutor.admin_home_tutor);
app.get(    '/tutor/:id_tutor/grupo/:id_grupo',                 verificarToken, Tutor.admin_usuarios_grupo);


/* === Exportamos ====== */
module.exports = app;