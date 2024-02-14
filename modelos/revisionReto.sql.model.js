const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const revisionReto = sequelize.define("RevisionReto", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        reto: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        usuarioRevision: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        jsonEvaluacion: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        extra: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false
        },
        retoDescargado: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        fechaRetoDescargado: {
            type: Sequelize.DataTypes.DATE,
            allowNull: true
        },
        promedioReto: {
            type: Sequelize.DataTypes.DOUBLE(11, 2),
            allowNull: false,
            defaultValue: 0
        }
    }, { 
        timestamps: true 
    });
    
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        revisionReto.sync({ force: false, alter: true })
        .then(function() { logger.info("[revisionReto] synced...."); })
        .catch(function(e) { logger.error("[revisionReto] not synced....", e); });
    }

    return revisionReto;
};