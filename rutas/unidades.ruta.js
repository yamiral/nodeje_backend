const express = require('express');
const app = express();

/* === Controlador ===== */
const Unidades = require('../controladores/unidades.controlador');

/* === Middleware ====== */
const { verificarToken } = require('../middlewares/autenticacion');

/* === Rutas =========== */
app.get(    '/struct_unidades',                                 verificarToken, Unidades.preCreate);
app.post(   '/unidades',                                        verificarToken, Unidades.crear);
app.get(    '/unidades',                                        verificarToken, Unidades.leer);
app.get(    '/unidades/:id',                                    verificarToken, Unidades.leer_id);
app.put(    '/unidades/:id',                                    verificarToken, Unidades.actualizar);
app.delete( '/unidades/:id',                                    verificarToken, Unidades.eliminar);
app.get(    '/get_unidades',                                    verificarToken, Unidades.getUnidadesHome);
app.get(    '/unidades/not_programa/:id',                       verificarToken, Unidades.unidades_no_pertenecen_programa);
app.put(    '/orden_unidades/programa/:programa',               verificarToken, Unidades.actualizaOrden);

// app.get(    '/conf_unidad/:id',                                 verificarToken, Unidades.conf_unidad);
app.get(    '/conf_unidad_grupo/:id/grupo/:grupo',              verificarToken, Unidades.conf_unidad_grupo);
app.post(   '/conf_unidad_grupo/:id/grupo/:grupo',              verificarToken, Unidades.conf_unidad_grupo_create_update);


/* === Exportamos ====== */
module.exports = app;