const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const RecordatoriosVistos = sequelize.define("RecordatoriosVistos", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        usuario: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        recordatorio: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        visto: {
            type: Sequelize.DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, { 
        timestamps: true 
    });
    
    if( parseInt(process.env.DB_SYNC_MODULES) === 1){
        RecordatoriosVistos.sync({ force: false, alter: true })
        .then(function() { logger.info("[RecordatoriosVistos] synced...."); })
        .catch(function(e) { logger.error("[RecordatoriosVistos] not synced....", e); });
    }

    return RecordatoriosVistos;
};