const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const ProgramaUnidades = sequelize.define("ProgramaUnidades", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        programa: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        unidad: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        orden: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        fechaApertura: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: false,
        }
    }, { 
        timestamps: true
    });
                        
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        ProgramaUnidades.sync({ force: false, alter: true })
        .then(function() { logger.info("[ProgramaUnidades] synced...."); })
        .catch(function(e) { logger.error("[ProgramaUnidades] not synced....", e); });
    }
    
    return ProgramaUnidades;
};