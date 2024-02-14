const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const actModCheck = sequelize.define("ActModCheck", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        usuario: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        actividad: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        completada: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: 1
        },
        calificacion: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
        },
        datos_ejercicio: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        descargado: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: 0
        }
    }, { 
        timestamps: true 
    });
    
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        actModCheck.sync({ force: false, alter: true })
        .then(function() { logger.info("[actModCheck] synced...."); })
        .catch(function(e) { logger.error("[actModCheck] not synced....", e); });
    }

    return actModCheck;
};