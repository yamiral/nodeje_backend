const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const PreguntasUsuarios = sequelize.define("PreguntasUsuarios", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        pregunta: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        usuario: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
    }, { 
        timestamps: false
    });
                        
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        PreguntasUsuarios.sync({ force: false, alter: true })
        .then(function() { logger.info("[PreguntasUsuarios] synced...."); })
        .catch(function(e) { logger.error("[PreguntasUsuarios] not synced....", e); });
    }
    
    return PreguntasUsuarios;
};