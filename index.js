const path = require('path'); 
require('dotenv').config({ path: path.join(__dirname, '.env') });
const serverless = require('serverless-http');
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const logger = require("./config/logger");
const app = express();

app.use(express.urlencoded({extended: true }));

app.use(express.json());

/*=============================================
MIDDLEWARE PARA FILEUPLOAD
=============================================*/

app.use(fileUpload());

/*=============================================
EJECUTANDO CORS
=============================================*/

app.use(cors());

/*=============================================
IMPORTAMOS LAS RUTAS
=============================================*/

app.use( '/api', require('./rutas/usuarios.ruta'));
app.use( '/api', require('./rutas/unidades.ruta'));
app.use( '/api', require('./rutas/programas.ruta'));
app.use( '/api', require('./rutas/grupos.ruta'));
app.use( '/api', require('./rutas/perfiles.ruta'));
app.use( '/api', require('./rutas/modulos.ruta'));
app.use( '/api', require('./rutas/actividades.ruta'));
app.use( '/api', require('./rutas/aws.ruta'));
app.use( '/api', require('./rutas/insignias.ruta'));
app.use( '/api', require('./rutas/jefe.ruta'));
app.use( '/api', require('./rutas/analiticos.ruta'));
app.use( '/api', require('./rutas/tutor.ruta'));
app.use( '/api', require('./rutas/recordatorios.ruta'));

const db = require("./modelos/index");

process.on("uncaughtException", function (err) {
	logger.error("Caught exception: " + err)
	throw err
});
process.on("unhandledRejection", function (err) {
	logger.error("Rejection: " + err)
	throw err
});
process.on("SequelizeDatabaseError", function (err) {
	logger.error("DB Error: " + err)
	throw err
});

logger.info("DB HOST: " + process.env.DB_HOST)

let truncateDbOnRestart = false;
if( parseInt(process.env.DB_RESTORE_DATA)  === 1){
	truncateDbOnRestart = true;
}

let alterTables = false;
if( parseInt(process.env.DB_ALTER_TABLES)  === 1){
	logger.info("Alter tables is active")
	alterTables = true;
}

db.sequelize.sync({ force: truncateDbOnRestart, alter: alterTables }).then(function () {
	
	logger.info('Database Connected...' + process.env.DB_HOST);
	
	if( truncateDbOnRestart ){
		
		db.perfiles.bulkCreate([
			{perfil: 'Administrador'}
		])
		.then(()=>{ logger.info( 'perfiles creados' ) })
		.catch((e)=>{ logger.error( 'error: ' , e) })

		db.usuarios.bulkCreate([
			{username: 'admin', password: bcrypt.hashSync('admin', 10), perfil: 1, email: 'admin@nom.com'}
		], {validate: true})
		.then(()=>{ logger.info( 'usuarios creados' ) })
		.catch((e)=>{ logger.error( 'error: ' , e) })

		logger.info("DB Synced and data imported");

		if(parseInt(process.env.IS_AWS) !== 1){
			app.listen(process.env.PORT, ()=>{
				logger.info(`Habilitado el puerto HTTP [${process.env.PORT}]`)
			})
		}

	}else{

		if(parseInt(process.env.IS_AWS) !== 1){
			app.listen(process.env.PORT, ()=>{
				logger.info(`Habilitado el puerto HTTP [${process.env.PORT}]`)
			})
		}
		
	}

})	
.catch(err => { 
	logger.error('No se pudo conectar a la BD', err) 
});

const handler = serverless(app);
module.exports.handler = async (event, context) => {
	// logger.info( "Event: " + JSON.stringify(event))
	// logger.info( "Context: " + JSON.stringify(context))
	const result = await handler(event, context);
	return result;
}
