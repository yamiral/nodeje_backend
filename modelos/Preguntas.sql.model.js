const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const Preguntas = sequelize.define("Preguntas", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        pregunta: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: false
        },
        grupo: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        usuario: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        actividad: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        fecha: {
            type: Sequelize.DataTypes.DATE,
            allowNull: false
        },
        visible:{
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 1
        }
    }, { 
        timestamps: true
    });
                
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        Preguntas.sync({ force: false, alter: true })
        .then(function() { logger.info("[Preguntas] synced...."); })
        .catch(function(e) { logger.error("[Preguntas] not synced....", e); });
    }
    
    return Preguntas;
};