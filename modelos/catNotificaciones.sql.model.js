const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const CatNotificaciones = sequelize.define("CatNotificaciones", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        descripcion: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        }
    }, { 
        timestamps: true
    });
            
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        CatNotificaciones.sync({ force: false, alter: true })
        .then(function() { logger.info("[CatNotificaciones] synced...."); })
        .catch(function(e) { logger.error("[CatNotificaciones] not synced....", e); });
    }
    
    return CatNotificaciones;
};