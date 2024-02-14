const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const PreguntasRespuestas = sequelize.define("PreguntasRespuestas", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        pregunta: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        respuesta: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
    }, { 
        timestamps: false
    });
                        
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        PreguntasRespuestas.sync({ force: false, alter: true })
        .then(function() { logger.info("[PreguntasRespuestas] synced...."); })
        .catch(function(e) { logger.error("[PreguntasRespuestas] not synced....", e); });
    }
    
    return PreguntasRespuestas;
};