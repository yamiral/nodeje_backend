const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const evaluacionFinal = sequelize.define("evaluacionFinal", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        usuario: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        evaluacion: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        intento: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 1
        },
        calificacion: {
            type: Sequelize.DataTypes.DOUBLE(11, 2),
            allowNull: false,
            defaultValue: 0
        },
        intentoCerrado: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, { 
        timestamps: true 
    });
    
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        evaluacionFinal.sync({ force: false, alter: true })
        .then(function() { logger.info("[evaluacionFinal] synced...."); })
        .catch(function(e) { logger.error("[evaluacionFinal] not synced....", e); });
    }

    return evaluacionFinal;
};