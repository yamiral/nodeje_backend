const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const ProgramaUnidadModuloActividad = sequelize.define("PrgUniModActividad", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        programaUnidadModulo: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        actividad: {
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
        ProgramaUnidadModuloActividad.sync({ force: false, alter: true })
        .then(function() { logger.info("[ProgramaUnidadModuloActividad] synced...."); })
        .catch(function(e) { logger.error("[ProgramaUnidadModuloActividad] not synced....", e); });
    }
    
    return ProgramaUnidadModuloActividad;
};