const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const Perfiles = sequelize.define("Perfiles", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        perfil: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        activo:{
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 1
        }
    }, { 
        timestamps: true
    });
                
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        Perfiles.sync({ force: false, alter: true })
        .then(function() { logger.info("[Perfiles] synced...."); })
        .catch(function(e) { logger.error("[Perfiles] not synced....", e); });
    }
    
    return Perfiles;
};