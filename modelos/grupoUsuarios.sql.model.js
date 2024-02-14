const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const GrupoUsuarios = sequelize.define("GrupoUsuarios", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        grupo: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        usuario: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
            unique: true
        }
    }, { 
        timestamps: true
    });
        
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        GrupoUsuarios.sync({ force: false, alter: true })
        .then(function() { logger.info("[GrupoUsuarios] synced...."); })
        .catch(function(e) { logger.error("[GrupoUsuarios] not synced....", e); });
    }
    
    return GrupoUsuarios;
};