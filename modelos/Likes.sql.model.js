const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const Likes = sequelize.define("Likes", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        usuario: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        pregunta: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
        },
        respuesta: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
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
        Likes.sync({ force: false, alter: true })
        .then(function() { logger.info("[Likes] synced...."); })
        .catch(function(e) { logger.error("[Likes] not synced....", e); });
    }
    
    return Likes;
};