const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const ProgramaUnidadModulo = sequelize.define("ProgramaUnidadModulo", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        programaUnidad: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        modulo: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        orden: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    }, { 
        timestamps: true
    });
                        
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        ProgramaUnidadModulo.sync({ force: false, alter: true })
        .then(function() { logger.info("[ProgramaUnidadModulo] synced...."); })
        .catch(function(e) { logger.error("[ProgramaUnidadModulo] not synced....", e); });
    }
    
    return ProgramaUnidadModulo;
};