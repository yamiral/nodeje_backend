const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const Notificaciones = sequelize.define("Notificaciones", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        usuario: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
        },
        grupo: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
        },
        pregunta: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
        },
        reto: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
        },
        visto: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        data: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: false
        },
        tipo :{
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
        }
    }, { 
        timestamps: true
    });
            
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        Notificaciones.sync({ force: false, alter: true })
        .then(function() { logger.info("[Notificaciones] synced...."); })
        .catch(function(e) { logger.error("[Notificaciones] not synced....", e); });
    }
    
    return Notificaciones;
};