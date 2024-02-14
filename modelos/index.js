const Sequelize = require("sequelize");
const logger = require("../config/logger");

const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: false,
    pool: {
        min: 1,
        idle: 20000,
        evict: 15000,
        acquire: 30000
    },
    retry: {
        max: 0
    }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

//Modelas
db.usuarios = require("./usuarios.sql.model.js")(sequelize, Sequelize);
db.unidades = require("./unidades.sql.model.js")(sequelize, Sequelize);
db.perfiles = require("./perfiles.sql.model.js")(sequelize, Sequelize);
db.grupos = require("./grupos.sql.model.js")(sequelize, Sequelize);
db.programas = require("./programas.sql.model.js")(sequelize, Sequelize);
db.modulos = require("./modulos.sql.model.js")(sequelize, Sequelize);
db.grupoUsuarios = require("./grupoUsuarios.sql.model.js")(sequelize, Sequelize);
db.grupoProgramas = require("./grupoProgramas.sql.model.js")(sequelize, Sequelize);
db.programaUnidades = require("./programaUnidades.sql.model.js")(sequelize, Sequelize);
db.programaUnidadModulo = require("./programaUnidadModulo.sql.model.js")(sequelize, Sequelize);
db.programaUnidadModuloActividad = require("./programaUnidadModuloActividad.sql.model")(sequelize, Sequelize);
db.actividadesModulo = require("./actividadesModulo.sql.model")(sequelize, Sequelize);
db.actModCheck = require("./actividadesCheck.sql.model")(sequelize, Sequelize);
db.bitacora_errores = require("./bitacora_errores.sql.model")(sequelize, Sequelize);
db.pu_usuario_actividad = require("./pu_Usuario_Actividad.sql.model")(sequelize, Sequelize);
db.revisionReto = require("./revisionReto.sql.model")(sequelize, Sequelize);
db.grupoUnidadFechas = require("./grupoUnidadFechas.sql.model")(sequelize, Sequelize);
db.preguntas = require("./Preguntas.sql.model")(sequelize, Sequelize);
db.respuestas = require("./Respuestas.sql.model")(sequelize, Sequelize);
db.likes = require("./Likes.sql.model")(sequelize, Sequelize);
db.preguntasRespuestas = require("./PreguntasRespuestas.sql.model")(sequelize, Sequelize);
db.preguntasLikes = require("./PreguntasLikes.sql.model")(sequelize, Sequelize);
db.respuestasLikes = require("./RespuestasLikes.sql.model")(sequelize, Sequelize);
db.preguntasUsuarios = require("./preguntasUsuarios.sql.model")(sequelize, Sequelize);
db.respuestasUsuarios = require("./respuestasUsuarios.sql.model")(sequelize, Sequelize);
db.notificaciones = require("./notificaciones.sql.model")(sequelize, Sequelize);
db.catNotificaciones = require("./catNotificaciones.sql.model")(sequelize, Sequelize);
db.notificacionesUsuario = require("./notificacionesUsuarios.sql.model")(sequelize, Sequelize);
db.insignias = require("./insignias.sql.model")(sequelize, Sequelize);
db.insigniasUsuarios = require("./insigniasUsuarios.sql.model")(sequelize, Sequelize);
db.insigniasJefes = require("./insigniasJefes.sql.model")(sequelize, Sequelize);
db.gu_cal_jefe_unidad = require("./gu_cal_jefe_unidad.sql.model")(sequelize, Sequelize);
db.evaluacionFinal = require("./evaluacionFinal.sql.model")(sequelize, Sequelize);
db.banderaModales = require("./banderaModales.sql.model")(sequelize, Sequelize);
db.recordatorios = require("./recordatorios.sql.model")(sequelize, Sequelize);
db.recordatoriosVistos = require("./recordatoriosVistos.sql.model")(sequelize, Sequelize);

// //Asociaciones
db.usuarios.belongsToMany(db.grupos, { through: db.grupoUsuarios, foreignKey: 'usuario', otherKey: 'grupo' })
db.grupos.belongsToMany(db.usuarios, { through: db.grupoUsuarios, foreignKey: 'grupo', otherKey: 'usuario' })
//--
db.grupos.belongsToMany(db.programas, { through: db.grupoProgramas, foreignKey: 'grupo', otherKey: 'programa' })
db.programas.belongsToMany(db.grupos, { through: db.grupoProgramas, foreignKey: 'programa', otherKey: 'grupo' })
//--
db.programas.belongsToMany(db.unidades, { through: db.programaUnidades, foreignKey: 'programa', otherKey: 'unidad' })
db.unidades.belongsToMany(db.programas, { through: db.programaUnidades, foreignKey: 'unidad', otherKey: 'programa' })
//--
db.unidades.belongsToMany(db.modulos, { through: db.programaUnidadModulo, foreignKey: 'programaUnidad', otherKey: 'modulo' })
db.modulos.belongsToMany(db.unidades, { through: db.programaUnidadModulo, foreignKey: 'modulo', otherKey: 'programaUnidad' })
//--
db.modulos.belongsToMany(db.actividadesModulo, { through: db.programaUnidadModuloActividad, foreignKey: 'programaUnidadModulo', otherKey: 'actividad' })
db.actividadesModulo.belongsToMany(db.modulos, { through: db.programaUnidadModuloActividad, foreignKey: 'actividad', otherKey: 'programaUnidadModulo' })
//--
db.preguntas.belongsToMany(db.respuestas, { through: db.preguntasRespuestas, foreignKey: 'pregunta', otherKey: 'respuesta' })
db.respuestas.belongsToMany(db.preguntas, { through: db.preguntasRespuestas, foreignKey: 'respuesta', otherKey: 'pregunta' })
//--
db.preguntas.belongsToMany(db.likes, { through: db.preguntasLikes, foreignKey: 'pregunta', otherKey: 'like' })
db.likes.belongsToMany(db.preguntas, { through: db.preguntasLikes, foreignKey: 'like', otherKey: 'pregunta' })
//--
db.respuestas.belongsToMany(db.likes, { through: db.respuestasLikes, foreignKey: 'respuesta', otherKey: 'like' })
db.likes.belongsToMany(db.respuestas, { through: db.respuestasLikes, foreignKey: 'like', otherKey: 'respuesta' })
//--
db.preguntas.belongsToMany(db.usuarios, { through: db.preguntasUsuarios, foreignKey: 'pregunta', otherKey: 'usuario' })
db.usuarios.belongsToMany(db.preguntas, { through: db.preguntasUsuarios, foreignKey: 'usuario', otherKey: 'pregunta' })
//--
db.respuestas.belongsToMany(db.usuarios, { through: db.respuestasUsuarios, foreignKey: 'respuesta', otherKey: 'usuario' })
db.usuarios.belongsToMany(db.respuestas, { through: db.respuestasUsuarios, foreignKey: 'usuario', otherKey: 'respuesta' })
//--
db.notificaciones.belongsToMany(db.usuarios, { through: db.notificacionesUsuario, foreignKey: 'notificacion', otherKey: 'usuario' })
//--
db.usuarios.belongsToMany(db.insignias, { through: db.insigniasUsuarios, foreignKey: 'usuario', otherKey: 'insignia' })
db.insignias.belongsToMany(db.usuarios, { through: db.insigniasUsuarios, foreignKey: 'insignia', otherKey: 'usuario' })
//--
// db.usuarios.belongsToMany(db.insignias, { through: db.insigniasJefes, foreignKey: 'usuario', otherKey: 'insignia' })
// db.insignias.belongsToMany(db.usuarios, { through: db.insigniasJefes, foreignKey: 'insignia', otherKey: 'usuario' })

// db.grupos.belongsToMany(db.unidades, { through: db.gu_cal_jefe_unidad, foreignKey: 'grupo', otherKey: 'unidad' })
// db.unidades.belongsToMany(db.grupos, { through: db.gu_cal_jefe_unidad, foreignKey: 'unidad', otherKey: 'grupo' })


db.sequelize.query = async function () {
    return Sequelize.prototype.query.apply(this, arguments).catch(function (err) {
        const data2Create = {
            error: JSON.stringify(err) || '',
            arguments: JSON.stringify(arguments) || ''
        };
        db.bitacora_errores.create(data2Create)
            .then(data => {
                logger.info("Error logueado en BD " + err)
            })
            .catch(error => {
                logger.error( error )
                logger.error( "Error no logueado en BD " + err )
                logger.error( JSON.stringify(arguments) )
            });
        throw err; 
    });
};

module.exports = db;