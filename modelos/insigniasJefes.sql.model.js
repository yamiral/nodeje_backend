const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const InsigniasJefes = sequelize.define("InsigniasJefes", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        usuario: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        grupo: {
            type: Sequelize.DataTypes.INTEGER,
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
        }
    }, { 
        timestamps: true 
    });
    
    if( parseInt(process.env.DB_SYNC_MODULES) === 1){
        InsigniasJefes.sync({ force: false, alter: true })
        .then(function() { logger.info("[InsigniasJefes] synced...."); })
        .catch(function(e) { logger.error("[InsigniasJefes] not synced....", e); });
    }

    return InsigniasJefes;
};