const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const Modulos = sequelize.define("Modulos", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        nombre: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        descripcion: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: false
        },
        unidad: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        icono :{
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        fecha: {
            type: Sequelize.DataTypes.DATEONLY,
            allowNull: true
        },
        visible: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: 1
        },
        activo:{
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: 1
        }
    }, { 
        timestamps: true
    });
            
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        Modulos.sync({ force: false, alter: true })
        .then(function() { logger.info("[Modulos] synced...."); })
        .catch(function(e) { logger.error("[Modulos] not synced....", e); });
    }
    
    return Modulos;
};