const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const Programas = sequelize.define("Programas", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        nombre: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        descripcionPrograma: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: false
        },
        activo:{
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 1
        },
        perfil: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        tituloUnidades: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        }
    }, { 
        timestamps: true
    });
                    
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        Programas.sync({ force: false, alter: true })
        .then(function() { logger.info("[Programas] synced...."); })
        .catch(function(e) { logger.error("[Programas] not synced....", e); });
    }
    
    return Programas;
};