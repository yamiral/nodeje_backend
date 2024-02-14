const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const GrupoProgramas = sequelize.define("GrupoProgramas", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        grupo: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
            unique: true
        },
        programa: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        programaReducido: {
            type: Sequelize.DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, { 
        timestamps: true
    });
        
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        GrupoProgramas.sync({ force: false, alter: true })
        .then(function() { logger.info("[GrupoProgramas] synced...."); })
        .catch(function(e) { logger.error("[GrupoProgramas] not synced....", e); });
    }

    return GrupoProgramas;
};