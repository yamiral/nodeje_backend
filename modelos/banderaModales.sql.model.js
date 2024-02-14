const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const BanderaModales = sequelize.define("BanderaModales", {
        id: {
            type: Sequelize.DataTypes.BIGINT,
            primaryKey:true,
            autoIncrement: true
        },
        usuario: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        unidades: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        unidades: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        landing: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        podcast: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        video: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        toolkit: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        articulo: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        ejercicioReforzamiento: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, { 
        timestamps: true 
    });
    if( parseInt(process.env.DB_SYNC_MODULES) === 1){
        BanderaModales.sync({ force: false, alter: true })
        .then(function() { logger.info("[BanderaModales] synced...."); })
        .catch(function(e) { logger.error("[BanderaModales] not synced....", e); });
    }
    return BanderaModales;
};