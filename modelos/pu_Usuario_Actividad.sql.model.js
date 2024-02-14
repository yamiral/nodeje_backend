const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const PrgUnUsuarioActividad = sequelize.define("PU_Usuario_Actividad", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        programaUnidad: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        usuario: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        caso: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        reto: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        encuesta: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        evDeUnidad: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        archivoReto: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        jsonEncuesta: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        jsonAutoEvaluacion: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        casoDescargado: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        retoDescargado: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        fechaAutoEvaluacion: {
            type: Sequelize.DataTypes.DATE,
            allowNull: true,
        },
        fechaCasoDescargado: {
            type: Sequelize.DataTypes.DATE,
            allowNull: true,
        },
        fechaRetoGuardado: {
            type: Sequelize.DataTypes.DATE,
            allowNull: true,
        },
        fechaRetoDescargado: {
            type: Sequelize.DataTypes.DATE,
            allowNull: true,
        },
        autoEvaluacion: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true,
        },
        encuestaSatisfaccion: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true,
        },
        evaluacionUnidad: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true,
        },
        evaluacion: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        fechaEvaluacion: {
            type: Sequelize.DataTypes.DATE,
            allowNull: true,
        },
        fechaEncuesta: {
            type: Sequelize.DataTypes.DATE,
            allowNull: true,
        },
        asistencia: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: true
        },
        promedioEncuesta: { // promedio Evaluacion de conocimientos de Unidad
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        promedioReto: { // Calificacion Reto On The Job de Unidad
            type: Sequelize.DataTypes.DOUBLE(11, 2),
            allowNull: false,
            defaultValue: 0
        },
        promedioEvConocimiento: { // Calificacion Evaluacion de conocimientos de Unidad
            type: Sequelize.DataTypes.DOUBLE(11, 2),
            allowNull: false,
            defaultValue: 0
        },
        promedioAutovaluacion: { // Calificacion de Autoevaluacion de Unidad
            type: Sequelize.DataTypes.DOUBLE(11, 2),
            allowNull: false,
            defaultValue: 0
        },
        calificacionTutor: { // Calificacion de Tutor
            type: Sequelize.DataTypes.DOUBLE(11, 2),
            allowNull: false,
            defaultValue: 0
        },
        evaluacionTutor: { // JSON evaluacion de Tutor
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        fechaTutorEvaluacion: {
            type: Sequelize.DataTypes.DATE,
            allowNull: true,
        }
    }, { 
        timestamps: true
    });
                        
    if( parseInt(process.env.DB_SYNC_MODULES) === 1){
        PrgUnUsuarioActividad.sync({ force: false, alter: true })
        .then(function() { logger.info("[PrgUnUsuarioActividad] synced...."); })
        .catch(function(e) { logger.error("[PrgUnUsuarioActividad] not synced....", e); });
    }
    
    return PrgUnUsuarioActividad;
};