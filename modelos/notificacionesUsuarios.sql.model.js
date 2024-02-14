const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const NotificacionesUsuarios = sequelize.define("NotificacionesUsuarios", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        notificacion: {
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
        NotificacionesUsuarios.sync({ force: false, alter: true })
        .then(function() { logger.info("[NotificacionesUsuarios] synced...."); })
        .catch(function(e) { logger.error("[NotificacionesUsuarios] not synced....", e); });
    }
    
    return NotificacionesUsuarios;
};