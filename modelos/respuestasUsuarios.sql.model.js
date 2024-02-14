const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const RespuestasUsuarios = sequelize.define("RespuestasUsuarios", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        respuesta: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        usuario: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
    }, { 
        timestamps: false
    });
                        
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        RespuestasUsuarios.sync({ force: false, alter: true })
        .then(function() { logger.info("[RespuestasUsuarios] synced...."); })
        .catch(function(e) { logger.error("[RespuestasUsuarios] not synced....", e); });
    }
    
    return RespuestasUsuarios;
};