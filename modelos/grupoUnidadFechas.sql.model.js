const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const grupoUnidadFechas = sequelize.define("GrupoUnidadFechas", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        grupo: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        unidad: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        fechaApertura: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: false,
        },
        fechaFinal: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: false,
        },
        sesionArchivo: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false,
        },
        sesionFecha: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: false,
        },
        sesionHora: {
            type: Sequelize.DataTypes.TIME,
            allowNull: false,
        },
        tituloRetoOnTheJob: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        retoArchivo: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false,
        },
        retoFecha: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: false,
        },
        retoHora: {
            type: Sequelize.DataTypes.TIME,
            allowNull: false,
        },
        retoInicioEvParFecha: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: false,
        },
        retoInicioEvParHora: {
            type: Sequelize.DataTypes.TIME,
            allowNull: false,
        },
        retoFinEvParFecha: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: false,
        },
        retoFinEvParHora: {
            type: Sequelize.DataTypes.TIME,
            allowNull: false,
        },
        jefeAutoEvInicioFecha: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: false,
        },
        jefeAutoEvInicioHora: {
            type: Sequelize.DataTypes.TIME,
            allowNull: false,
        },
        jefeAutoEvFinFecha: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: false,
        },
        jefeAutoEvFinHora: {
            type: Sequelize.DataTypes.TIME,
            allowNull: false,
        },
        sesionImagenPrincipal: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        sesionImagenSecundaria: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        retoImagenPaso1: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        retoImagenPaso2: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        retoImagenPaso3: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        retoImagenPaso4: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        fechaInicioAutoEvaluacion: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: false
        },
        guiaObservacion: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        conoceCompetencia: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        }
    }, { 
        timestamps: true
    });
                        
    if( parseInt(process.env.DB_SYNC_MODULES) === 1){
        grupoUnidadFechas.sync({ force: false, alter: true })
        .then(function() { logger.info("[grupoUnidadFechas] synced...."); })
        .catch(function(e) { logger.error("[grupoUnidadFechas] not synced....", e); });
    }
    
    return grupoUnidadFechas;
};