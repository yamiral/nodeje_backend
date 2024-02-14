const logger = require("../config/logger");

module.exports = (sequelize, Sequelize) => {
    const Usuarios = sequelize.define("Usuarios", {
        id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        username: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false,
            unique: 'username'
        },
        nombre: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        apellido_paterno: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        apellido_materno: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        division_personal: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        jefe_directo: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        puesto: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        password: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        email: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false,
            unique: 'email'
        },
        foto:{
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        bienvenida:{
            type: Sequelize.DataTypes.BOOLEAN,
            defaultValue: false
        },
        perfil: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false
        },
        activo:{
            type: Sequelize.DataTypes.BOOLEAN,
            defaultValue: 1
        },
        tutor:{
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
        },
        es_jefe: {
            type: Sequelize.DataTypes.BOOLEAN,
            defaultValue: false
        },
        es_admin: {
            type: Sequelize.DataTypes.BOOLEAN,
            defaultValue: false
        },
        es_tutor: {
            type: Sequelize.DataTypes.BOOLEAN,
            defaultValue: false
        },
        reset_key:{
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        mostrarLandingLearner:{
            type: Sequelize.DataTypes.BOOLEAN,
            defaultValue: true
        },
        mostrarLandingJefe:{
            type: Sequelize.DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, { 
        timestamps: true
    });
                        
    if( parseInt(process.env.DB_SYNC_MODULES) === 1){
        Usuarios.sync({ force: false, alter: true })
        .then(function() { logger.info("[Usuarios] synced...."); })
        .catch(function(e) { logger.error("[Usuarios] not synced....", e); });
    }
    
    return Usuarios;
};