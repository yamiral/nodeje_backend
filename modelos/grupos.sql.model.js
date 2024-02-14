const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const Grupos = sequelize.define("Grupos", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        nombre: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        activo:{
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 1
        },
        guiaRetroalimentacion: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        }
    }, { 
        timestamps: true
    });
    
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        Grupos.sync({ force: false, alter: true })
        .then(function() { logger.info("[Grupos] synced...."); })
        .catch(function(e) { logger.error("[Grupos] not synced....", e); });
    }

    return Grupos;
};