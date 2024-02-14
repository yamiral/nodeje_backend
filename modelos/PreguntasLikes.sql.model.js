const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const PreguntasLikes = sequelize.define("PreguntasLikes", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        pregunta: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        like: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
    }, { 
        timestamps: false
    });
                        
    if( parseInt(process.env.DB_SYNC_MODULES)  === 1){
        PreguntasLikes.sync({ force: false, alter: true })
        .then(function() { logger.info("[PreguntasLikes] synced...."); })
        .catch(function(e) { logger.error("[PreguntasLikes] not synced....", e); });
    }
    
    return PreguntasLikes;
};