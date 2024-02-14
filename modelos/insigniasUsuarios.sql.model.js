const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const InsigniasUsuarios = sequelize.define("InsigniasUsuarios", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        usuario: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        insignia: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: false
        },
        nivel: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        popupVisto: {
            type: Sequelize.DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, { 
        timestamps: true 
    });
    
    if( parseInt(process.env.DB_SYNC_MODULES) === 1){
        InsigniasUsuarios.sync({ force: false, alter: true })
        .then(function() { logger.info("[InsigniasUsuarios] synced...."); })
        .catch(function(e) { logger.error("[InsigniasUsuarios] not synced....", e); });
    }

    return InsigniasUsuarios;
};