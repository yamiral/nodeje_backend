const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const bitacora_errores = sequelize.define("Bitacora_Errores", {
        id: {
            type: Sequelize.DataTypes.BIGINT,
            primaryKey:true,
            autoIncrement: true
        },
        arguments: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        error: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        }
    }, { 
        timestamps: true 
    });
    
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        bitacora_errores.sync({ force: false, alter: true })
        .then(function() { logger.info("[bitacora_errores] synced...."); })
        .catch(function(e) { logger.error("[bitacora_errores] not synced....", e); });
    }

    return bitacora_errores;
};