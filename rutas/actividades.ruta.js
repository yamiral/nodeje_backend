const express = require('express');
const app = express();

/* === Controlador ===== */
const Actividades = require('../controladores/actividades.controlador');

/* === Middleware ====== */
const { verificarToken } = require('../middlewares/autenticacion');

/* === Rutas =========== */
app.get(    '/struct_actividades',                              verificarToken, Actividades.preCreate);
app.post(   '/actividades',                                     verificarToken, Actividades.crear);
app.get(    '/actividades',                                     verificarToken, Actividades.leer);
app.get(    '/actividades/:id',                                 verificarToken, Actividades.leer_id);
app.put(    '/actividades/:id',                                 verificarToken, Actividades.actualizar);
app.delete( '/actividades/:id',                                 verificarToken, Actividades.eliminar);

//Arbol
app.get(    '/actividades_de_modulo/:id',                       verificarToken, Actividades.actividadesModulo);
app.post(   '/asigna_modulo_actividad',                         verificarToken, Actividades.asignaModulo);
app.delete( '/asigna_modulo_actividad',                         verificarToken, Actividades.desasignaModulo);
app.get(    '/actividades/not_modulo/:id',                      verificarToken, Actividades.actividades_no_pertenecen_modulo);

//Front
app.get(    '/get_actividades/unidad/:unidad/modulo/:modulo',   verificarToken, Actividades.getActividadesUnidad);
app.get(    '/get_actividades/modulos/unidad/:unidad',          verificarToken, Actividades.getModulosActividadesUnidad);

app.put(    '/orden_actividades/modulo/:modulo',                verificarToken, Actividades.actualizaOrden);
app.put(    '/termina_actividad/:actividad',                    verificarToken, Actividades.termina_actividad);
app.put(    '/toolkit_descargado/:actividad',                   verificarToken, Actividades.toolkit_descargado);
app.put(    '/rankea_actividad/:actividad',                     verificarToken, Actividades.rank_actividad);

app.put(    '/guarda_actividad/:unidad',                        verificarToken, Actividades.guarda_usuario_actividad);
app.put(    '/guarda_reto/:unidad',                             verificarToken, Actividades.guarda_reto_usuario);
app.put(    '/guarda/autoevaluacion/:unidad',                   verificarToken, Actividades.guarda_autoevaluacion);
app.put(    '/guarda/encuestasatisfaccion/:unidad',             verificarToken, Actividades.guarda_encuesta_satisfaccion);
app.put(    '/guarda/evaluacionunidad/:unidad',                 verificarToken, Actividades.guarda_evaluacion_unidad);

app.put(    '/reto_descargado/:unidad',                         verificarToken, Actividades.reto_descargado);
app.put(    '/caso_descargado/:unidad',                         verificarToken, Actividades.caso_descargado);

//Social
app.get(    '/Preguntas/Actividad/:id_actividad',               verificarToken, Actividades.getPreguntas);
app.put(    '/Preguntas/Agregar/:id_actividad',                 verificarToken, Actividades.agregaPregunta);
app.put(    '/Preguntas/Actualizar/:id',                        verificarToken, Actividades.actualizaPregunta);
app.post(   '/Preguntas/Eliminar/:id',                          verificarToken, Actividades.eliminarPregunta);
app.put(    '/Respuestas/Actualizar/:id',                       verificarToken, Actividades.actualizaRespuesta);
app.post(   '/Respuestas/Eliminar/:id',                         verificarToken, Actividades.eliminarRespuesta);
app.put(    '/Respuestas/Agregar/:id_pregunta',                 verificarToken, Actividades.agregaRespuesta);
app.put(    '/Like/Pregunta/:id_pregunta',                      verificarToken, Actividades.likePregunta);
app.put(    '/Like/Respuesta/:id_respuesta',                    verificarToken, Actividades.likeRespuesta);

app.put(    '/guarda_evaluacion/:id',                           verificarToken, Actividades.guarda_evaluacion_par);
app.put(    '/reto_descargado_par/:id',                         verificarToken, Actividades.reto_descargado_par);

/* === Exportamos ====== */
module.exports = app;