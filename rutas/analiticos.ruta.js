const express = require('express');
const app = express();

/* === Controlador ===== */
const Analiticos = require('../controladores/analiticos.controlador');

/* === Middleware ====== */
const { verificarToken } = require('../middlewares/autenticacion');

/* === Rutas =========== */
app.get(    '/analiticos/grupos',                               Analiticos.filtro_grupos);
app.get(    '/analiticos/programas',                            Analiticos.filtro_programas);
app.get(    '/analiticos/unidades',                             Analiticos.filtro_unidades);
app.get(    '/analiticos/modulos',                              Analiticos.filtro_modulos);

app.post(    '/analiticos/consulta_usuarios',                   Analiticos.consultaUsuarios);
app.get(     '/analiticos/detalle_usuario/:id_usuario',         Analiticos.detalleUsuario);
app.get(     '/analiticos/insignias_usuario/:id_usuario',       Analiticos.insigniasUsuario);
app.get(     '/analiticos/insignias_jefe/:grupo/:id_usuario',   Analiticos.insigniasJefes);

app.post(    '/analiticos/reto_on_the_job',                     Analiticos.retosOnTheJob);

app.post(    '/analiticos/general',                             Analiticos.general);
app.post(    '/analiticos/poblacion',                           Analiticos.poblacion);
app.post(    '/analiticos/desempenio',                          Analiticos.desempenio);
app.post(    '/analiticos/avance_programa',                     Analiticos.avancePrograma);
app.post(    '/analiticos/objetos_aprendizaje',                 Analiticos.objetosAprendizaje);
app.post(    '/analiticos/participacion_social',                Analiticos.participacionForoSocial);
app.post(    '/analiticos/sesiones_virtuales',                  Analiticos.sesionesVirtuales);
app.post(    '/analiticos/resultados_encuesta',                 Analiticos.resultadosEncuestaSatisfaccion);

app.get(    '/analiticos/general',                              Analiticos.general);
app.get(    '/analiticos/poblacion',                            Analiticos.poblacion);
app.get(    '/analiticos/desempenio',                           Analiticos.desempenio);
app.get(    '/analiticos/avance_programa',                      Analiticos.avancePrograma);
app.get(    '/analiticos/objetos_aprendizaje',                  Analiticos.objetosAprendizaje);
app.get(    '/analiticos/participacion_social',                 Analiticos.participacionForoSocial);
app.get(    '/analiticos/sesiones_virtuales',                   Analiticos.sesionesVirtuales);
app.get(    '/analiticos/resultados_encuesta',                  Analiticos.resultadosEncuestaSatisfaccion);

app.get(    '/analiticos/export_general',                       Analiticos.export_general);
app.get(    '/analiticos/export_reto',                          Analiticos.export_retoOnTheJob);

app.get(    '/descarga_reporte_avance/:grupo',                  Analiticos.descarga_reporte_avance);

/* === Exportamos ====== */
module.exports = app;