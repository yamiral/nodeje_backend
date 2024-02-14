const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const Recordatorios = sequelize.define("Recordatorios", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        grupo: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        programa: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        titulo: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false,
        },
        mensaje: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: false,
        },
        fecha: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: true,
            defaultValue: null
        },
        hora: {
            type: Sequelize.DataTypes.TIME,
            allowNull: true,
            defaultValue: null
        },
        fechaInicio: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: false,
        },
        horaInicio: {
            type: Sequelize.DataTypes.TIME,
            allowNull: false,
        },
        fechaTermino: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: false,
        },
        horaTermino: {
            type: Sequelize.DataTypes.TIME,
            allowNull: false,
        },
        activo: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: 1
        },
    }, { 
        timestamps: true
    });
                        
    if( parseInt(process.env.DB_SYNC_MODULES) === 1){
        Recordatorios.sync({ force: false, alter: true })
        .then(function() { logger.info("[Recordatorios] synced...."); })
        .catch(function(e) { logger.error("[Recordatorios] not synced....", e); });
    }
    
    return Recordatorios;
};