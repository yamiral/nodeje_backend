const express = require('express');
const app = express();

/* === Controlador ===== */
const Grupos = require('../controladores/grupos.controlador');

/* === Middleware ====== */
const { verificarToken } = require('../middlewares/autenticacion');

/* === Rutas =========== */
app.get(    '/struct_grupos',           verificarToken, Grupos.preCreate);
app.post(   '/grupos',                  verificarToken, Grupos.crear);
app.get(    '/grupos',                  verificarToken, Grupos.leer);
app.get(    '/grupos/:id',              verificarToken, Grupos.leer_id);
app.put(    '/grupos/:id',              verificarToken, Grupos.actualizar);
app.delete( '/grupos/:id',              verificarToken, Grupos.eliminar);

app.post(   '/asigna_grupo_usuario',    verificarToken, Grupos.asignaUsuario);
app.delete( '/asigna_grupo_usuario',    verificarToken, Grupos.desasignaUsuario);

app.post(   '/asigna_grupo_programa',   verificarToken, Grupos.asignaPrograma);
app.delete( '/asigna_grupo_programa',   verificarToken, Grupos.desasignaPrograma);

app.post(   '/asigna_pares',            verificarToken, Grupos.asignaParesRevision);

/* === Exportamos ====== */
module.exports = app;