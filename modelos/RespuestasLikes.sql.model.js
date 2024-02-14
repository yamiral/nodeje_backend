const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const RespuestasLikes = sequelize.define("RespuestasLikes", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        respuesta: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        like: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
    }, { 
        timestamps: false
    });
                        
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        RespuestasLikes.sync({ force: false, alter: true })
        .then(function() { logger.info("[RespuestasLikes] synced...."); })
        .catch(function(e) { logger.error("[RespuestasLikes] not synced....", e); });
    }
    
    return RespuestasLikes;
};