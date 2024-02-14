const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const Respuestas = sequelize.define("Respuestas", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        respuesta: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: false
        },
        usuario: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        pregunta: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        fecha: {
            type: Sequelize.DataTypes.DATE,
            allowNull: false
        },
        visible:{
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 1
        }
    }, { 
        timestamps: true
    });
                
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        Respuestas.sync({ force: false, alter: true })
        .then(function() { logger.info("[Respuestas] synced...."); })
        .catch(function(e) { logger.error("[Respuestas] not synced....", e); });
    }
    
    return Respuestas;
};