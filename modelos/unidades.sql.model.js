const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const Unidades = sequelize.define("Unidades", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        nombre: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        descripcion: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: false
        },
        foto: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        visible: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false
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
        Unidades.sync({ force: false, alter: true })
        .then(function() { logger.info("[Unidades] synced...."); })
        .catch(function(e) { logger.error("[Unidades] not synced....", e); });
    }
    
    return Unidades;
};