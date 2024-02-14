const express = require('express');
const app = express();

/* === Controlador ===== */
const Usuarios = require('../controladores/usuarios.controlador');

/* === Middleware ====== */
const { verificarToken } = require('../middlewares/autenticacion');

/* === Rutas =========== */
app.get(    '/struct_usuarios',                     verificarToken, Usuarios.preCreate);
app.post(   '/usuarios',                            verificarToken, Usuarios.crear);
app.get(    '/usuarios',                            verificarToken, Usuarios.leer);
app.get(    '/usuarios/:id',                        verificarToken, Usuarios.leer_id);
app.put(    '/usuarios/:id',                        verificarToken, Usuarios.actualizar);
app.delete( '/usuarios/:id',                        verificarToken, Usuarios.eliminar);
app.get(    '/notificaciones',                      verificarToken, Usuarios.getNotificaciones);
app.get(    '/notificacion_vista/:id',              verificarToken, Usuarios.marcaNotificacionVista);
app.put(    '/desactiva_bienvenida',                verificarToken, Usuarios.desactivar_bienvenida);
app.put(    '/desactiva_landing_learner',           verificarToken, Usuarios.desactivar_landing_learner);
app.get(    '/alive',                               verificarToken, Usuarios.alive);
app.get(    '/usuario/insignias',                   verificarToken, Usuarios.insigniasUsuario);
app.get(    '/usuario/perfil',                      verificarToken, Usuarios.perfil);
app.get(    '/jefe/perfil',                         verificarToken, Usuarios.perfil_jefe);

app.post(   '/pic_update',                          verificarToken, Usuarios.pic_update);
app.post(   '/password_update',                     verificarToken, Usuarios.pass_update);
app.get(    '/data_usuario/:id',                    verificarToken, Usuarios.data_usuario);
app.get(    '/evaluacion_final',                    verificarToken, Usuarios.ef_get);
app.post(   '/evaluacion_final/guarda_borrador',    verificarToken, Usuarios.ef_guarda_borrador);
app.post(   '/evaluacion_final/cierra_evaluacion',  verificarToken, Usuarios.ef_cerrar_evaluacion);
app.post(   '/evaluacion_final/nuevo_intento',      verificarToken, Usuarios.ef_nuevo_intento);

app.post(    '/carga_usuarios',                     Usuarios.carga_usuarios);
app.post(    '/asigna_jefes',                       Usuarios.asigna_jefes);

app.post(   '/verifica_usuario',                    Usuarios.valida_usuario);
app.post(   '/registra_usuario',                    Usuarios.registra_usuario);
app.post(   '/usuarios/login',                      Usuarios.inicia_sesion);
app.post(   '/reset',                               Usuarios.reset);

app.get(    '/jefes',                               verificarToken, Usuarios.jefe);
app.get(    '/jefes/:id',                           verificarToken, Usuarios.jefe_id);
app.get(    '/tutores',                             verificarToken, Usuarios.tutor);
app.get(    '/getTutores',                          verificarToken, Usuarios.tutores);
app.get(    '/tutores/:id',                         verificarToken, Usuarios.tutor_id);
app.get(    '/get_formato_asignacion',              verificarToken, Usuarios.export_formatoAsignacion);
app.get(    '/get_formato_asistencia',              verificarToken, Usuarios.export_formatoAsistencia);
app.get(    '/get_formato_carga_usuarios',          verificarToken, Usuarios.get_formato_carga_usuarios);
app.post(   '/carga_asistencia',                    verificarToken, Usuarios.carga_asistencia);

app.get(    '/insignia/marcar_visto/:id',           verificarToken, Usuarios.marcar_insignia_vista);

app.post(   '/banderas',                            verificarToken, Usuarios.u_banderas);

/* === Exportamos ====== */
module.exports = app;