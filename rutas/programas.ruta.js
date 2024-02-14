const express = require('express');
const app = express();

/* === Controlador ===== */
const Programas = require('../controladores/programas.controlador');

/* === Middleware ====== */
const { verificarToken } = require('../middlewares/autenticacion');

/* === Rutas =========== */
app.get(    '/struct_programas',                verificarToken, Programas.preCreate);
app.post(   '/programas',                       verificarToken, Programas.crear);
app.get(    '/programas',                       verificarToken, Programas.leer);
app.get(    '/programas/:id',                   verificarToken, Programas.leer_id);
app.put(    '/programas/:id',                   verificarToken, Programas.actualizar);
app.delete( '/programas/:id',                   verificarToken, Programas.eliminar);

app.post(   '/asigna_programa_unidad',          verificarToken, Programas.asignaUnidad);
app.delete( '/asigna_programa_unidad',          verificarToken, Programas.desasignaUnidad);

app.get(    '/programas_de_grupo/:id',          verificarToken, Programas.programaGrupo);
app.get(    '/unidades_de_programa/:id',        verificarToken, Programas.programaUnidades);

app.get(    '/programas/not_grupo/:id',         verificarToken, Programas.programas_no_pertenecen_grupo);
app.post(   '/programas/programa_reducido',     verificarToken, Programas.asigna_programa_reducido);
/* === Exportamos ====== */
module.exports = app;