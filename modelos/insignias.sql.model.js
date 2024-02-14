const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const Insignias = sequelize.define("Insignias", {
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
        descripcionModal: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        descripcionModalN1: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        llave_insignia: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        imagen: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        lottie: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        programa: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
        },
        unidad: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
        },
        categoria: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        orden: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        tipo: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        jefe: {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        nombreNivel2: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },  
        descripcionModalN2: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },
        imagenNivel2: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        lottieNivel2: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        nombreNivel3: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        descripcionModalN3: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },          
        imagenNivel3: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        lottieNivel3: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        nombreNivel4: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        descripcionModalN4: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true
        },  
        imagenNivel4: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        lottieNivel4: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
    }, { 
        timestamps: true 
    });
    
    if( parseInt(process.env.DB_SYNC_MODULES) === 1){
        Insignias.sync({ force: false, alter: true })
        .then(function() { logger.info("[Insignias] synced...."); })
        .catch(function(e) { logger.error("[Insignias] not synced....", e); });
    }

    return Insignias;
};