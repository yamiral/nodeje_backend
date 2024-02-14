const express = require('express');
const app = express();

/* === Controlador ===== */
const Modulos = require('../controladores/modulos.controlador');

/* === Middleware ====== */
const { verificarToken } = require('../middlewares/autenticacion');

/* === Rutas =========== */
app.get(    '/struct_modulos',                      verificarToken, Modulos.preCreate);
app.post(   '/modulos',                             verificarToken, Modulos.crear);
app.get(    '/modulos',                             verificarToken, Modulos.leer);
app.get(    '/modulos/:id',                         verificarToken, Modulos.leer_id);
app.put(    '/modulos/:id',                         verificarToken, Modulos.actualizar);
app.delete( '/modulos/:id',                         verificarToken, Modulos.eliminar);
app.get(    '/modulos_de_unidad/:id',               verificarToken, Modulos.unidadesModulos);
app.post(   '/asigna_unidad_modulo',                verificarToken, Modulos.asignaUnidad);
app.delete( '/asigna_unidad_modulo',                verificarToken, Modulos.desasignaUnidad);
app.get(    '/modulos/not_unidad/:id',              verificarToken, Modulos.modulos_no_pertenecen_unidad);
app.get(    '/get_modulos/unidad/:id',              verificarToken, Modulos.getModulosUnidad);
app.put(    '/orden_modulos/unidad/:unidad',        verificarToken, Modulos.actualizaOrden);
app.get(    '/get_modulos/perfil',                  verificarToken, Modulos.infoModulosPerfil);
app.post(   '/get_info_top',                        verificarToken, Modulos.informacionTop);
app.get(    '/get_detalle/:id_usuario',             verificarToken, Modulos.getDetalleUsuario);

/* === Exportamos ====== */
module.exports = app;