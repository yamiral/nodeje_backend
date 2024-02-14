const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const actividadesModulo = sequelize.define("ActividadesModulo", {
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
        icono :{
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        foto :{
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        imagen_panel:{
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        archivo:{
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        archivoDescarga:{
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        modulo: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
        },
        tipo: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        etiquetas: {
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
        opcional: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: 0
        },
        texto: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        preguntaLearning: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
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
        actividadesModulo.sync({ force: false, alter: true })
        .then(function() { logger.info("[actividadesModulo] synced...."); })
        .catch(function(e) { logger.error("[actividadesModulo] not synced....", e); });
    }

    return actividadesModulo;
};