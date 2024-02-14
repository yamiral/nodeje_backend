const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const GU_Cal_Jefe_Unidad = sequelize.define("GU_Cal_Jefe_Unidad", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        gu_id: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        unidad: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        promedio: {
            type: Sequelize.DataTypes.DOUBLE(11, 2),
            allowNull: false
        },
        evaluacion: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        acuerdos: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        ev_enviada: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        fecha_ev: {
            type: Sequelize.DataTypes.DATE,
            allowNull: true,
        }
    }, { 
        timestamps: true 
    });
    
    if( parseInt(process.env.DB_SYNC_MODULES) === 1){
        GU_Cal_Jefe_Unidad.sync({ force: false, alter: true })
        .then(function() { logger.info("[GU_Cal_Jefe_Unidad] synced...."); })
        .catch(function(e) { logger.error("[GU_Cal_Jefe_Unidad] not synced....", e); });
    }

    return GU_Cal_Jefe_Unidad;
};