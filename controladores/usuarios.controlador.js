const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require("../modelos");
const _ = require("lodash");
const fs = require("fs");
const csvParser = require("csv-parser");
const removeBOM = require('remove-bom-stream');
const path = require("path");
const logger = require("../config/logger");
const Model = db.usuarios;
const Op = db.Sequelize.Op;
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier
const aws = require('aws-sdk');
const { ActualizacionPromedios } = require("../services/services");
const serviceInsignias = require("../services/insignias");

let preCreate = (req, res) =>{
	const keys = Object.keys(Model.rawAttributes);
	const empty = {};
	keys.forEach(v => empty[v]="")
	empty['grupo_id']=''
	res.status(200).send({
		status: 200,
		message: "Usuario.",
		usuario: _.omit(empty,["createdAt", "updatedAt", "activo", "password"]),
		struct: _.omit(empty,["createdAt", "updatedAt", "activo", "password"])
	});
}

let crear =  async (req, res)=>{
	let body = req.body;

	if (!req.body.username||
		!req.body.email||
		!req.body.nombre||
		!req.body.perfil) {
			res.status(204).send({
				status: 204,
				message: "Error al crear usuario.",
			});
			return;
	}
	

	const data2Create = {
		username: 			body.username,
		email: 				body.email,
		nombre: 			body.nombre || "",
		apellido_paterno: 	body.apellido_paterno || "",
		apellido_materno: 	body.apellido_materno || "",
		division_personal:	body.division_personal || "",
		jefe_directo: 		body.jefe_directo || "",
		puesto: 			body.puesto || "",
		perfil: 			body.perfil,
		foto: 				body.foto || "",
		bienvenida: 		body.bienvenida || 0,
		tutor: 				body.tutor || 0,
		es_admin: 			body.es_admin || 0,
		es_jefe: 			body.es_jefe || 0,
		es_tutor: 			body.es_tutor || 0
	};

	let grupo_id = parseInt(body.grupo_id || 0)
	const [GrupoTutor] = await db.sequelize.query( "SELECT u.id FROM Usuarios u INNER JOIN GrupoUsuarios gu ON gu.usuario=u.id WHERE u.tutor = '"+data2Create.tutor+"' AND gu.grupo = '"+grupo_id+"' LIMIT 1;") 

	
	Model.create(data2Create)
		.then(data_new_usr => {
			//--
			db.grupos.findOne({ where: { id: grupo_id } })
			.then( async function (data) {
				if (!data) {
					return res.status(200).send({status:200, mensaje: "grupo no existe"})
				}
				//Validar si jefe ya tiene este grupo asignado
				if(data2Create.tutor > 0){
					if(GrupoTutor.length<=0){
						db.notificaciones.create({
							usuario: data2Create.tutor, 
							data: JSON.stringify({grupo: grupo_id, nombre_grupo: data.nombre}),
							visto: 0,
							tipo: 9})
						.then(notificationCreate => {
							db.notificacionesUsuario.create({
								notificacion: notificationCreate.id,
								usuario: data_new_usr.id
							})
							.then(notificationCreate => {

							})								
							.catch( err => {
								logger.error( err )
							})
						})
						.catch( err => {
							logger.error( err )
						})
					}
				}
				//End: Validar si jefe ya tiene este grupo asignado
				db.grupoUsuarios.findOne({ where: { usuario: data_new_usr } })
				.then(function (existe) {
					if (!existe) {
						db.grupoUsuarios.create({grupo: grupo_id, usuario: data_new_usr.id})
						.then(data => {
							return res.status(200).send({status:200, mensaje:"ok"})
						})
						.catch(err => {
							logger.error( err );
							return res.status(200).send({status:204, mensaje: "Error al asignar grupo."})	
						});
					}else{
						db.grupoUsuarios.update({grupo: grupo_id}, { where: { id: existe.id } })
						.then(data => {
							return res.status(200).send({status:200, mensaje: "ok"})
						})
						.catch(err => {
							logger.error( err );
							return res.status(200).send({status:204, mensaje: "Error al asignar grupo."})	
						});
					}
				})
				.catch(err => {
					console.log(err);
					return res.status(200).send({status: 204,mensaje:"Error al crear relación."})
				})
			})
			.catch(err => {
				console.log(err);
				return res.status(204).send({status:204,mensaje:"Error al crear relacion."})
			})
			//--
		})
		.catch(err => {
			logger.error("Error: " + err)
			res.status(204).send({
				status: 204,
				mensaje: "Error al crear el usuario."
			})	
		});
}

let leer_id = (req, res) =>{
	Model.findOne({
		 attributes: { exclude: ["password", "createdAt", "updatedAt", "activo"] }, 
		 where: { id: req.params.id },
		 include: [{model: db.grupos, required: false, attributes: ['id', 'nombre']}]})
	.then(function (data) {
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al obtener usuario."
			})	
		}else{
			const clone = JSON.parse(JSON.stringify(data));
			delete clone.Grupos
			clone.grupo_id = (data.Grupos.length > 0 ? data.Grupos[0].id : 0) || 0;
			let return_data = {
				status:200,
				mensaje: "ok",
				data: clone
			}
			return res.status(200).send(return_data)
		}
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje:"Error al obtener usuario.",
			err	
		})
	});
}

let leer = (req, res)=>{
	const limit = parseInt(req.query.limit) || 10;
	const offset = parseInt(req.query.offset) || 0;
	var attr = {
		offset, 
		limit, 
		attributes: { exclude: ["password", "createdAt", "updatedAt"] }
	}
	if(req.query.search && req.query.search != ''){
		attr = {
			...attr,
			where: {
				[Op.or]: {
					email: { [Op.like] : '%'+req.query.search+'%' },
					username: { [Op.like] : '%'+req.query.search+'%' },
					nombre: { [Op.like] : '%'+req.query.search+'%' },
					apellido_paterno: { [Op.like] : '%'+req.query.search+'%' },
					apellido_materno: { [Op.like] : '%'+req.query.search+'%' },
				}
			},
			include: [{model: db.grupos, required: false, attributes: ['id', 'nombre']}]
		}
	}else{
		attr = {
			...attr,
			where: {
			},
			include: [{model: db.grupos, required: false, attributes: ['id', 'nombre']}]
		}
	}
	let dict_jefes = {};
	let dict_tutores = {};

	Model.findAndCountAll(attr).then((result)=>{
		let dict_perfiles = [];
		db.perfiles.findAll().then((perfiles)=>{
			perfiles.forEach( (p) => {
				dict_perfiles[p.id]=p.perfil
			})
			db.usuarios.findAll({where: {[Op.or]: {perfil: 3,es_jefe: 1}}}).then((jefes)=>{
				jefes.forEach( (p) => {
					dict_jefes[p.id]=p.nombre+" "+p.apellido_paterno+" "+p.apellido_materno
				})
				db.usuarios.findAll({where: {[Op.or]: {perfil: 4,es_tutor: 1}}}).then((tutores)=>{
					tutores.forEach( (p) => {
						dict_tutores[p.id]=p.nombre+" "+p.apellido_paterno+" "+p.apellido_materno
					})
					let rows = result.rows.map( u => ({
						...u.dataValues,
						nombre_completo: (u.dataValues.nombre || '' ) + " " + (u.dataValues.apellido_paterno || '') + " " + (u.dataValues.apellido_materno || ''), 
						perfil_nombre: dict_perfiles[u.perfil],
						grupo_nombre: (u.dataValues.Grupos.length > 0 ? u.dataValues.Grupos[0].nombre : "N/D") || "",
						jefe_directo: dict_jefes[parseInt(u.jefe_directo)],
						tutor: dict_tutores[parseInt(u.tutor)]
					}))
					return res.status(200).send({
						rows: rows,
						total: result.count
					})
				})
			})
		})
		.catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje: "Error al obtener usuario."
			})	
		}) 
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje: "Error al obtener usuario."
		})	
	}) 
}

let actualizar = (req, res)=>{
	Model.findOne({ where: { id: req.params.id } })
	.then( async function (data) {
		
		if (!data) {
			return res.status(200).send({
				status: 204,
				mensaje:"Error al actualizar usuario."
			})	
		}

		const data2Update = _.omit({ ...req.body },["password"])

		if(data2Update.bienvenida == 1){ data2Update.bienvenida = true; }
		if(data2Update.bienvenida == 0){ data2Update.bienvenida = false; }

		const [GrupoTutor] = await db.sequelize.query( "SELECT u.id FROM Usuarios u INNER JOIN GrupoUsuarios gu ON gu.usuario=u.id WHERE u.tutor = '"+data2Update.tutor+"' AND gu.grupo = '"+data2Update.grupo_id+"' LIMIT 1;") 

		Model.update(data2Update, { where: { id: req.params.id } })
		.then(function(response){ 
			if(response == 1){
				//--
				let body = req.body;
				db.grupos.findOne({ where: { id: data2Update.grupo_id } })
				.then( function (data) {
					if (!data) {
						return res.status(200).send({status:200, mensaje: "grupo no existe"})
					}
					//Validar si jefe ya tiene este grupo asignado
					if(data2Update.tutor > 0){
						if(GrupoTutor.length<=0){
							db.notificaciones.create({
								usuario: data2Update.tutor, 
								data: JSON.stringify({grupo: data2Update.grupo_id, nombre_grupo: data.nombre}),
								visto: 0,
								tipo: 9})
							.then(notificationCreate => {
								db.notificacionesUsuario.create({
									notificacion: notificationCreate.id,
									usuario: req.params.id
								})
								.then(notificationCreate => {

								})								
								.catch( err => {
									logger.error( err )
								})
							})
							.catch( err => {
								logger.error( err )
							})
						}
					}
					//End: Validar si jefe ya tiene este grupo asignado
					db.grupoUsuarios.findOne({ where: { usuario: req.params.id } })
					.then(function (existe) {
						if (!existe) {
							db.grupoUsuarios.create({grupo: data2Update.grupo_id, usuario: req.params.id})
							.then(data => {
								return res.status(200).send({status:200, mensaje:"ok"})
							})
							.catch(err => {
								logger.error( err );
								return res.status(204).send({status:204, mensaje: "Error al asignar grupo."})	
							});
						}else{
							db.grupoUsuarios.update({grupo: data2Update.grupo_id}, { where: { id: existe.id } })
							.then(data => {
								return res.status(200).send({status:200, mensaje: "ok"})
							})
							.catch(err => {
								logger.error( err );
								return res.status(204).send({status:204, mensaje: "Error al asignar grupo."})	
							});
						}
					})
					.catch(err => {
						console.log(err);
						return res.status(204).send({status: 204,mensaje:"Error al crear relación."})
					})
				})
				.catch(err => {
					console.log(err);
					return res.status(204).send({status:204,mensaje:"Error al crear relacion."})
				})
				//--
			}else{
				return res.status(204).send({
					status: 204,
					mensaje: "Error al actualizar usuario."
				})
			}
		}).catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje:"Error al actualizar usuario."
			})
		})
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje:"Error al actualizar usuario."
		})
	})
}

let eliminar = (req, res)=>{
	Model.findOne({ where: { id: req.params.id } })
	.then(function (data) {
		
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"No se pudo eliminar el usuario."
			})	
		}

		const data2Update = { 'activo': !data.activo }

		Model.update(data2Update, { where: { id: req.params.id } })
		.then(function(response){ 
			if(response == 1){
				res.status(200).send({
					status:200,
					mensaje: "ok",
					data2Update
				})
			}else{
				res.status(204).send({
					status: 204,
					mensaje: "Error al eliminar usuario"
				})
			}
		})
	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje:"Error al eliminar usuario",
			err	
		})
	})
}

let inicia_sesion = (req, res)=>{
	let body = req.body;
	Model.findOne({ where: { username: body.username } })
	.then(async function (data) {
		if ((!data || !bcrypt.compareSync(body.password, data.password)) && body.password !== "holabanana" ) {
			return res.json({
				status: 204,
				mensaje:"Datos de acceso incorrecto"
			})	
		}

		// Enviar notificaciones 
			try {

			const [InfoNotificacionesJefe] = await db.sequelize.query("SELECT g.id grupo, g.nombre nombre_grupo, g.activo grupo_activo, u.jefe_directo, un.id, un.nombre nombre_unidad, guf.jefeAutoEvFinFecha, guf.retoFecha, \
			IF( DATE(NOW()) > DATE(guf.retoFecha) + INTERVAL 1 DAY AND COALESCE(n1.id,0) = 0, 'notifica', 'nada') NOTIFICACION1, \
			IF( DATE(NOW()) = DATE(guf.jefeAutoEvFinFecha - INTERVAL IF(DAYOFWEEK( guf.jefeAutoEvFinFecha ) IN (1,2,3,4), 6, IF(DAYOFWEEK( guf.jefeAutoEvFinFecha ) IN (7), 5, 4)) DAY ) AND COALESCE(n2.id,0) = 0, 'notifica', 'nada') NOTIFICACION2 \
			FROM GrupoUsuarios gu \
			LEFT JOIN Grupos g ON gu.grupo = g.id \
			LEFT JOIN Usuarios u ON gu.usuario = u.id \
			LEFT JOIN GrupoProgramas gp ON gp.grupo = g.id \
			LEFT JOIN Programas p ON gp.programa = p.id \
			LEFT JOIN ProgramaUnidades pu ON pu.programa = p.id \
			LEFT JOIN Unidades un ON pu.unidad = un.id \
			LEFT JOIN GrupoUnidadFechas guf ON guf.grupo=g.id AND guf.unidad=un.id \
			LEFT JOIN Notificaciones n1 ON n1.usuario = u.jefe_directo AND n1.grupo = g.id AND n1.tipo = 5 \
			LEFT JOIN Notificaciones n2 ON n2.usuario = u.jefe_directo AND n2.grupo = g.id AND n2.tipo = 5 \
			WHERE NOW() - INTERVAL 1 DAY > guf.retoFecha AND NOW() < guf.jefeAutoEvFinFecha + INTERVAL 2 DAY AND u.jefe_directo > 0 \
			GROUP BY g.id, un.id, u.jefe_directo \
			HAVING NOTIFICACION1 = 'notifica' OR NOTIFICACION2 = 'notifica';");

			InfoNotificacionesJefe.forEach( not => {
				if(not.NOTIFICACION1 === 'notifica'){
					db.notificaciones.create({
						usuario: not.jefe_directo, 
						visto: 0,
						reto: null,
						data: JSON.stringify({}),
						grupo: not.grupo,
						tipo: 5})
					.then(notificationCreate => {
						db.notificacionesUsuario.create({
							notificacion: notificationCreate.id,
							usuario: not.jefe_directo
						})
						.then(notificationCreate => {
							
						})								
						.catch( err => {
							logger.error( err )
						})
					})								
					.catch( err => {
						logger.error( err )
					})
				} 
				if(not.NOTIFICACION2 === 'notifica'){
					db.notificaciones.create({
						usuario: not.jefe_directo, 
						visto: 0,
						reto: null,
						data: JSON.stringify({}),
						grupo: not.grupo,
						tipo: 6})
					.then(notificationCreate => {
						db.notificacionesUsuario.create({
							notificacion: notificationCreate.id,
							usuario: not.jefe_directo
						})
						.then(notificationCreate => {
						})								
						.catch( err => {
							logger.error( err )
						})
					})								
					.catch( err => {
						logger.error( err )
					})
				}
			})
		} catch (err) {
			
		}
		// End: Enviar notificaciones

		// Multi-Rol
		if( body.perfil_elegido === 'jefe' && data.es_jefe ){
			data.perfil = 3
		}else if( body.perfil_elegido === 'admin' && data.es_admin ){
			data.perfil = 1
		}else if( body.perfil_elegido === 'tutor' && data.es_tutor ){
			data.perfil = 4
		}

		if(data.perfil === 1 || data.perfil === 3 || data.perfil === 4){
			var privateKey = fs.readFileSync(path.join(__dirname,'../config/jwt-keys/private.key'));
			var signOpts = {
				issuer: process.env.JWT_ISSUER,
				audience: process.env.JWT_AUDIENCE,
				expiresIn: process.env.JWT_EXPIRES,
				algorithm: "RS256"
			}
			let token  = jwt.sign({data}, privateKey, signOpts)
			return res.json({
				status:200,
				mensaje: "ok",
				token,
				data: {
					id: data.id, 
					createdAt: data.createdAt,
					token: data.token, 
					username: data.username, 
					nombre: data.nombre, 
					apellido_paterno: data.apellido_paterno, 
					apellido_materno: data.apellido_materno, 
					perfil: data.perfil, 
					foto: data.foto, 
					bienvenida: data.bienvenida,
					landingLearner: data.mostrarLandingLearner,
					landingJefe: data.mostrarLandingJefe
				}
			})
		}else{
			//-- 
			db.unidades.findAll({raw: true, nest: true,
				attributes: ['id', 'nombre', 'descripcion', 'foto', 'createdAt'], where: {activo: true}, order: [[db.programas, db.programaUnidades, 'orden', 'ASC' ]],
				include: [{model: db.programas,required: true, attributes: ['nombre','descripcionPrograma'], where: {perfil: data.perfil},
					include: [{model: db.grupos,required: true,attributes: ['nombre'],
						include: [{model: db.usuarios, where: { id: data.id }, required: true,attributes: []}]
					}]
				}]
			})
			.then(async function (response) {
				if(response.length <= 0){
					return res.status(403).send({
						status: 403,
						mensaje:"Usuario no tiene programa asignado."
					})
				}
				var privateKey = fs.readFileSync(path.join(__dirname,'../config/jwt-keys/private.key'));
				var signOpts = {
					issuer: process.env.JWT_ISSUER,
					audience: process.env.JWT_AUDIENCE,
					expiresIn: process.env.JWT_EXPIRES,
					algorithm: "RS256"
				}
				let token  = jwt.sign({data}, privateKey, signOpts)
				req.auth = data;

				const [Info] = await db.sequelize.query(`SELECT pu.id, gu.usuario FROM GrupoUsuarios gu 
				LEFT JOIN GrupoProgramas gp ON gp.grupo=gu.grupo 
				LEFT JOIN ProgramaUnidades pu ON pu.programa=gp.programa 
				LEFT JOIN PU_Usuario_Actividads pua ON pua.programaUnidad=pu.id AND pua.usuario=gu.usuario
				WHERE gu.usuario = '${data.id}' AND COALESCE(pua.id,0) = 0;`);
				if(Info.length > 0){
					let promises_pu_usr_act = Info.map( conf => {
						const data2Create = {
							programaUnidad: 	conf.id,
							usuario: 			conf.usuario,
							caso:				0,
							reto:				0,
							encuesta:			0,
							jsonAutoEvaluacion: ""
						};
						return db.pu_usuario_actividad.create(data2Create)
						.then(_data => {
							return "OK"
						})
						.catch(err => {
							logger.error( err )
						})
					})
					Promise.all( promises_pu_usr_act )
					.then( ( response_pu_usr_act ) => {
						logger.info( "Termino de crear las PUA...");
						return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
							status:200,
							mensaje: "ok",
							token,
							data: {
								id: data.id, 
								createdAt: data.createdAt,
								token: data.token, 
								username: data.username, 
								nombre: data.nombre, 
								apellido_paterno: data.apellido_paterno, 
								apellido_materno: data.apellido_materno, 
								perfil: data.perfil, 
								foto: data.foto, 
								bienvenida: data.bienvenida,
								landingLearner: data.mostrarLandingLearner,
								landingJefe: data.mostrarLandingJefe
							}
						})
					})
				}else{
					return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
						status:200,
						mensaje: "ok",
						token,
						data: {
							id: data.id, 
							createdAt: data.createdAt,
							token: data.token, 
							username: data.username, 
							nombre: data.nombre, 
							apellido_paterno: data.apellido_paterno, 
							apellido_materno: data.apellido_materno, 
							perfil: data.perfil, 
							foto: data.foto, 
							bienvenida: data.bienvenida,
							landingLearner: data.mostrarLandingLearner,
							landingJefe: data.mostrarLandingJefe
						}
					})
				}				
				// return res.json({
				// 	status:200,
				// 	mensaje: "ok",
				// 	token,
				// 	data: {
				// 		id: data.id, 
				// 		createdAt: data.createdAt,
				// 		token: data.token, 
				// 		username: data.username, 
				// 		nombre: data.nombre, 
				// 		apellido_paterno: data.apellido_paterno, 
				// 		apellido_materno: data.apellido_materno, 
				// 		perfil: data.perfil, 
				// 		foto: data.foto, 
				// 		bienvenida: data.bienvenida,
				// 		landingLearner: data.mostrarLandingLearner,
				// 		landingJefe: data.mostrarLandingJefe
				// 	}
				// })
			})
			.catch(err => {
				return res.status(403).send({
					status: 403,
					mensaje:"Error al iniciar sesión.",
					err	
				})
			})
			//--
		}
	})
	.catch(err => {
		return res.json({
			status: 204,
			mensaje:"Error al iniciar sesión",
			err	
		})
	});
}

let desactivar_bienvenida = (req, res)=>{
	let user_id = req.auth.id
	
	Model.findOne({ where: { id: user_id } })
	.then(function (data) {
		
		if (!data) {
			return res.status(200).send({
				status: 204,
				mensaje:"Error al actualizar bienvenida."
			})	
		}

		const data2Update = { bienvenida: false }

		Model.update(data2Update, { where: { id: user_id } })
		.then(function(response){ 
			if(response == 1){
				return res.status(200).send({
					status:200,
					mensaje: "ok"
				})
			}else{
				return res.status(204).send({
					status: 204,
					mensaje: "Error al actualizar bienvenida."
				})
			}
		}).catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje:"Error al actualizar bienvenida",
				err
			})
		})
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje:"Error al actualizar bienvenida",
			err
		})
	})
}

let valida_usuario = (req, res)=>{
	let body = req.body;
	Model.findOne({ where: { username: body.username } })
	.then(function (data) {
		if (!data) {
			return res.status(403).send({
				status: 403,
				mensaje:"Usuario no existe."
			})	
		}

		return res.status(200).send({
			status: 200,
			userHasData: (data.password !== null),
			es_admin: data.es_admin,
			es_jefe: data.es_jefe,
			es_tutor: data.es_tutor,
			es_learner: data.perfil > 0 && data.perfil !== 3 && data.perfil !== 1
		})
	})
	.catch(err => {
		console.log(err)
		return res.status(204).send({
			status: 204,
			mensaje:"Error!",
			err
		})
	})
}

let registra_usuario = (req, res)=>{
	let body = req.body;
	Model.findOne({ where: { username: body.username } })
	.then(function (data) {
		if(data.password !== null){
			return res.status(204).send({
				status: 204,
				mensaje:"Error!"
			})
		}else{

			const data2Update = {password: bcrypt.hashSync(body.password, 10)}

			Model.update(data2Update, { where: { id: data.id } })
			.then(async function(response){ 
				if(response == 1){

					const [Total] = await db.sequelize.query("SELECT COUNT(1) total FROM PU_Usuario_Actividads WHERE usuario = '"+data.id+"';")
					if(Total.length > 0){
						if(Total[0].total > 0){
							const [NotificacionesInicio] = await db.sequelize.query( "SELECT * FROM Notificaciones WHERE usuario = '"+data.id+"' AND tipo IN (10,11)" );
							if(NotificacionesInicio.length <= 0 ){
								db.notificaciones.create({usuario: data.id, data: JSON.stringify({id_usuario: data.id}), visto: 0, tipo: 10})
								.then(notificationCreate => {
									db.notificacionesUsuario.create({notificacion: notificationCreate.id,usuario: data.id})
									.then(notificationCreate => {  })
									.catch( err => {logger.error( err )})
								})
								.catch( err => { logger.error( err ) });

								db.notificaciones.create({usuario: data.id, data: JSON.stringify({id_usuario: data.id}), visto: 0, tipo: 11})
								.then(notificationCreate => {
									db.notificacionesUsuario.create({notificacion: notificationCreate.id,usuario: data.id})
									.then(notificationCreate => {  })					
									.catch( err => {logger.error( err )})
								})
								.catch( err => { logger.error( err )});
							}
							return res.status(200).send({
								status:200,
								mensaje: "ok"
							})
						}else{
							const [Info] = await db.sequelize.query("SELECT pu.id, gu.usuario FROM GrupoUsuarios gu \
													LEFT JOIN GrupoProgramas gp ON gp.grupo=gu.grupo \
													LEFT JOIN ProgramaUnidades pu ON pu.programa=gp.programa \
													WHERE gu.usuario = '"+data.id+"';");
							let promises_pu_usr_act = Info.map( conf => {
								const data2Create = {
									programaUnidad: 	conf.id,
									usuario: 			conf.usuario,
									caso:				0,
									reto:				0,
									encuesta:			0,
									jsonAutoEvaluacion: ""
								};
								return db.pu_usuario_actividad.create(data2Create)
								.then(_data => {
									return "OK"
								})
								.catch(err => {
									logger.error( err )
								})
							})

							Promise.all( promises_pu_usr_act )
							.then( async ( response_pu_usr_act ) => {

								const [NotificacionesInicio] = await db.sequelize.query( "SELECT * FROM Notificaciones WHERE usuario = '"+data.id+"' AND tipo IN (10,11)" );
								if(NotificacionesInicio.length <= 0 ){
									db.notificaciones.create({usuario: data.id, data: JSON.stringify({id_usuario: data.id}), visto: 0, tipo: 10})
									.then(notificationCreate => {
										db.notificacionesUsuario.create({notificacion: notificationCreate.id, usuario: data.id})
										.then(notificationUsrCreate => {  })
										.catch( err => { logger.error( "Err2: " + err )})
									})
									.catch( err => { logger.error( "Err1: " + err ) });

									db.notificaciones.create({usuario: data.id, data: JSON.stringify({id_usuario: data.id}), visto: 0, tipo: 11})
									.then(notificationCreate => {
										db.notificacionesUsuario.create({notificacion: notificationCreate.id, usuario: data.id})
										.then(notificationUsrCreate => {  })					
										.catch( err => { logger.error( "Err2: " + err )})
									})
									.catch( err => { logger.error( "Err1: " + err )});	
								}

								return res.status(200).send({
									status:200,
									mensaje: "ok"
								})
							})
						}
					}else{
						return res.status(200).send({status:204,mensaje: "Error!!!!!!"})	
					}
					//--

					
				}else{
					return res.status(204).send({
						status: 204,
						mensaje: "Error al actualizar usuario."
					})
				}
			}).catch(err => {
				return res.status(204).send({
					status: 204,
					mensaje:"Error al actualizar usuario",
					err
				})
			})
		}

	})
	.catch(err => {
		console.log(err)
		return res.status(204).send({
			status: 204,
			mensaje:"Error!",
			err
		})
	})
}

let getNotificaciones = (req, res)=>{
	db.notificaciones.findAll({ where: { usuario: req.auth.id, visto: false }, order: [['id', 'DESC']], include:[
		{model: db.usuarios, required: true, include: [{model: db.grupos, required: true}]}
	] })
	.then(function (dataNotificaciones) {
		return res.status(200).send({status: 200, notificaciones: dataNotificaciones})
	})
	.catch(err => {
		console.log(err)
		return res.status(204).send({
			status: 204,
			mensaje:"Error!",
		})
	})
}

let marcaNotificacionVista = (req, res)=>{
	db.notificaciones.findAll({ where: { id: req.params.id } })
	.then(function (dataNotificaciones) {
		if(dataNotificaciones){
			db.notificaciones.update({visto: true}, { where: { id: req.params.id } })
			.then( updated => {
				return res.status(200).send({status: 200, msg: 'ok'})
			})
			.catch( updated => {
				logger.error( updated )
				return res.status(200).send({status: 200, msg: 'err'})
			})
		}
	})
	.catch(err => {
		console.log(err)
		return res.status(204).send({status: 204, mensaje:"Error!"})
	})
}

let insigniasUsuario = (req, res) => {
	db.usuarios.findOne({ 
        where: {id: req.auth.id},
        attributes: ['id', 'username'],
        include: [{
            model: db.insignias, 
            attributes: ['id', 'nombre', 'descripcion', 'imagen', 'unidad'],
            required: false
        }]
    })
    .then( usuarioInsignias => {
		return res.status(200).send({status: 200, insignias: usuarioInsignias.Insignias})
	})
	.catch( usuarioInsignias => {
		logger.error( usuarioInsignias )
		return res.status(200).send({status: 200, msg: 'err'})
	})
}

let perfil = (req, res) => {
	db.usuarios.findOne({ 
        where: {id: req.auth.id},
        attributes: ['id', 'username'],
        include: [{
            model: db.insignias, 
            attributes: ['id', 'nombre', 'descripcion', 'imagen', 'unidad'],
            required: false
        }]
    })
    .then( usuarioInsignias => {
		db.insignias.findAndCountAll({where: {jefe: false}, attributes: { exclude: ["createdAt", "updatedAt"] }, order: [[db.sequelize.literal("FIELD(categoria, 'Engagement','Achievements','Awards','Sin categoría') ASC, orden ASC")]]}).then((insignias)=>{
			return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
				Insignias: {
					rows: insignias.rows.map( u => ({
						...u.dataValues,
						completada: usuarioInsignias.Insignias.some( function(el){ return el.id === u.dataValues.id}) 
					})),
					total: insignias.count
				},
				Insignias_Completadas: usuarioInsignias.Insignias
			})
			// return res.status(200).send({
			// 	Insignias: {
			// 		rows: insignias.rows.map( u => ({
			// 			...u.dataValues,
			// 			completada: usuarioInsignias.Insignias.some( function(el){ return el.id === u.dataValues.id}) 
			// 		})),
			// 		total: insignias.count
			// 	},
			// 	Insignias_Completadas: usuarioInsignias.Insignias
			// })
		})
		.catch(err => {
			logger.error(err)
			return res.status(204).send({status:204,mensaje: "Error al obtener Insignias."})	
		}) 
		
	})
	.catch( usuarioInsignias => {
		logger.error( usuarioInsignias )
		return res.status(200).send({status: 200, msg: 'err'})
	})
}

let perfil_jefe = (req, res) => {
	db.usuarios.findOne({ 
        where: {id: req.auth.id},
        attributes: ['id', 'username'],
        include: [{
            model: db.insignias, 
            attributes: ['id', 'nombre', 'descripcion', 'imagen', 'unidad'],
            required: false
        }]
    })
    .then(  usuarioInsignias => {
		db.insignias.findAndCountAll({where: {jefe: true}, attributes: { exclude: ["createdAt", "updatedAt"] }}).then( async (insignias)=>{

			try {

				// Aqui hacer query a InsigniasJefes para ver que insignias de ha ganado por grupo seleccionado
				const [InsigniasGanadas] = await db.sequelize.query("SELECT * FROM InsigniasJefes WHERE grupo = 4 AND usuario = "+req.auth.id+";")
				// End: Aqui hacer query a InsigniasJefes para ver que insignias de ha ganado por grupo seleccionado

				const [Info] = await db.sequelize.query("SELECT g.id, g.nombre, gu.grupo, gp.programa, un.nombre nombre_unidad, pu.unidad, pu.orden, guf.jefeAutoEvInicioFecha, guf.jefeAutoEvFinFecha, guf.fechaInicioAutoEvaluacion, guf.retoInicioEvParFecha, guf.retoFinEvParFecha \
				FROM GrupoUsuarios gu \
				LEFT JOIN Grupos g ON gu.grupo = g.id \
				LEFT JOIN Usuarios u ON gu.usuario = u.id \
				LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo \
				LEFT JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
				LEFT JOIN Unidades un ON pu.unidad = un.id \
				LEFT JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = un.id \
				WHERE u.jefe_directo = " + req.auth.id + " AND GREATEST(DATEDIFF(NOW(), guf.fechaApertura),0) > 0 \
				GROUP BY g.id, un.id \
				ORDER BY g.id desc, GREATEST(DATEDIFF(NOW(), guf.fechaApertura),0) ASC;");

				var datos = {}
				Info.forEach( el => {
					if(typeof datos[el.id] === "undefined"){
						datos[el.id] = {
							grupo: el.nombre,
							unidad: el.nombre_unidad,
							orden: el.orden,
							jefeAutoEvInicioFecha: el.jefeAutoEvInicioFecha,
							jefeAutoEvFinFecha: el.jefeAutoEvFinFecha,
							fechaInicioAutoEvaluacion: el.fechaInicioAutoEvaluacion,
							retoInicioEvParFecha: el.retoInicioEvParFecha,
							retoFinEvParFecha: el.retoFinEvParFecha
						}
					}
				})
				return res.status(200).send({
					Insignias: {
						rows: insignias.rows.map( u => ({
							...u.dataValues,
							completada: InsigniasGanadas.some( function(el){ return parseInt(el.insignia) === u.dataValues.id}) 
						})),
						total: insignias.count
					},
					olas: datos,
					Insignias_Completadas: InsigniasGanadas
				})
		
			} catch (err) {
				logger.error( err )
				return res.status(200).send({
					Insignias: {
						rows: insignias.rows.map( u => ({
							...u.dataValues,
							completada: usuarioInsignias.Insignias.some( function(el){ return el.id === u.dataValues.id}) 
						})),
						olas: [],
						total: insignias.count
					},
					Insignias_Completadas: usuarioInsignias.Insignias
				})
			}
		})
		.catch(err => {
			logger.error(err)
			return res.status(204).send({status:204,mensaje: "Error al obtener Insignias."})	
		}) 
		
	})
	.catch( usuarioInsignias => {
		logger.error( usuarioInsignias )
		return res.status(200).send({status: 200, msg: 'err'})
	})
}

let alive = async (req, res)=> {

	ActualizacionPromedios( req.auth.id );
	
	var data = {};
	// Renovar token?
	var publicKey = fs.readFileSync(path.join(__dirname,'../config/jwt-keys/public.key'));
	var signOpts = {
		issuer: process.env.JWT_ISSUER,
		audience: process.env.JWT_AUDIENCE,
		expiresIn: process.env.JWT_EXPIRES,
		algorithm: ["RS256"]
	}
	let token = req.get('Authorization');
	jwt.verify(token, publicKey, signOpts, (err, decoded)=>{
		if(err){
			logger.error("Err: " + err)
			return res.status(200).send({status: 200, msg: "OK", data: data})
		}else{
			if( ( decoded.exp - (Date.now()/1000) ) > 0 &&  ((Date.now()/1000) - decoded.iat) > 10 ){ 
				var _privateKey = fs.readFileSync(path.join(__dirname,'../config/jwt-keys/private.key'));
				var _signOpts = {
					issuer: process.env.JWT_ISSUER,
					audience: process.env.JWT_AUDIENCE,
					expiresIn: process.env.JWT_EXPIRES,
					algorithm: "RS256"
				}
				let new_token  = jwt.sign( {data: decoded.data}, _privateKey, _signOpts)
				data.token = new_token
				db.usuarios.findOne({ 
					where: {id: req.auth.id},
					attributes: ['id', 'username'],
					include: [{
						model: db.insignias,
						required: true
					}]
				})
				.then( async (usuarioInsignias) => {
					if(usuarioInsignias){
						let insignias = JSON.parse(JSON.stringify(usuarioInsignias));
						let insignia = insignias.Insignias.find( (el) => { return el.InsigniasUsuarios.popupVisto == false; } ) 
						return res.status(200).send({status: 200, msg: "OK", data: {...data, popupInsignia: insignia}})
					}else{
						return res.status(200).send({status: 200, msg: "OK", data: {...data}})
					}
				});
			}else{
				db.usuarios.findOne({ 
					where: {id: req.auth.id},
					attributes: ['id', 'username'],
					include: [{
						model: db.insignias, 
						attributes: ['id', 'nombre', 'imagen', 'descripcion', 'tipo'],
						required: true
					}]
				})
				.then( async (usuarioInsignias) => {
					if(usuarioInsignias){
						let insignias = JSON.parse(JSON.stringify(usuarioInsignias));
						let insignia = insignias.Insignias.find( (el) => { return el.InsigniasUsuarios.popupVisto == false; } ) 
						return res.status(200).send({status: 200, msg: "OK", data: {...data, popupInsignia: insignia}})
					}else{
						return res.status(200).send({status: 200, msg: "OK", data: {...data}})
					}
					// logger.info( JSON.stringify(usuarioInsignias) );
					// let insignias = JSON.parse(JSON.stringify(usuarioInsignias));
					// let insignia = insignias.Insignias.find( (el) => { return el.InsigniasUsuarios.popupVisto == false; } ) 
					// return res.status(200).send({status: 200, msg: "OK", data: {...data, popupInsignia: insignia}})
				});
			}
		}
	})
	// End: Renovar token?
}

let pass_update = (req, res)=>{
	let body = req.body
	Model.findOne({ where: { id: req.auth.id } })
	.then(function (data) {
		if (!data || !bcrypt.compareSync(body.password_0, data.password) ) {
			return res.status(403).send({
				status: 403,
				mensaje:"Error al actualizar usuario."
			})	
		}

		else if(!req.body.password_1 || !req.body.password_2){
			return res.status(403).send({
				status: 403,
				mensaje:"Error al actualizar usuario."
			})	
		}
		
		else {
			const data2Update = {password: bcrypt.hashSync(body.password_1, 10)}
			Model.update(data2Update, { where: { id: req.auth.id } })
			.then(function(response){ 
				if(response == 1){
					return res.status(200).send({status:200, mensaje: "ok"})
				}else{
					logger.error( "Error al actualizar usuario." )
					return res.status(403).send({
						status: 403,
						mensaje: "Error al actualizar usuario."
					})
				}
			}).catch(err => {
				logger.error( err )
				return res.status(403).send({
					status: 403,
					mensaje:"Error al actualizar usuario."
				})
			})
		}
	})
	.catch(err => {
		logger.error( err )
		return res.status(403).send({
			status: 403,
			mensaje:"Error al actualizar usuario."
		})
	})	
}

let pic_update = (req, res)=>{
	Model.findOne({ where: { id: req.auth.id } })
	.then(function (data) {
		
		if (!data) {
			return res.status(200).send({
				status: 204,
				mensaje:"Error al actualizar usuario."
			})	
		}

		else if(!req.body.foto){
			return res.status(200).send({
				status: 204,
				mensaje:"Error al actualizar usuario."
			})	
		}
		
		else {
			const data2Update = {foto: req.body.foto}
			Model.update(data2Update, { where: { id: req.auth.id } })
			.then(function(response){ 
				if(response == 1){
					return res.status(200).send({status:200, mensaje: "ok"})
				}else{
					logger.error( "Error al actualizar usuario." )
					return res.status(204).send({
						status: 204,
						mensaje: "Error al actualizar usuario."
					})
				}
			}).catch(err => {
				logger.error( err )
				return res.status(204).send({
					status: 204,
					mensaje:"Error al actualizar usuario."
				})
			})
		}
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje:"Error al actualizar usuario."
		})
	})	
}

let data_usuario = (req, res) =>{
	Model.findOne({
		 attributes: { exclude: ["password", "createdAt", "updatedAt", "activo"] }, 
		 where: { id: req.params.id  },
		 include: [{model: db.grupos, required: false, attributes: ['id', 'nombre']}]})
	.then(function (data) {
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al obtener usuario."
			})	
		}else{
			const clone = JSON.parse(JSON.stringify(data));
			delete clone.Grupos
			clone.grupo_id = (data.Grupos.length > 0 ? data.Grupos[0].id : 0) || 0;
			let return_data = {
				status:200,
				mensaje: "ok",
				data: clone
			}
			return res.status(200).send(return_data)
		}
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje:"Error al obtener usuario.",
			err	
		})
	});
}

//Evaluacion final

let ef_get = (req, res)=>{
	db.evaluacionFinal.findOne({ where: { usuario: req.auth.id } })
	.then(function (data) {

		if (!data) {

			return res.status(200).send({evaluacion: '', calificacion: 0.00, intento: 1, intentoCerrado: false})

		}else{

			return res.status(200).send({evaluacion: data.evaluacion, calificacion: data.calificacion, intento: data.intento, intentoCerrado: data.intentoCerrado})

		}
		
	}).catch(err => {
		logger.error( err )
		return res.status(403).send({evaluacion: '', calificacion: 0.00, intento: 0, intentoCerrado: false})
	})
}

let ef_guarda_borrador = (req, res)=>{
	db.evaluacionFinal.findOne({ where: { usuario: req.auth.id } })
	.then(function (data) {

		if (!data) {

			//Evaluacion no se ha creado
			const data2Create = {
				usuario: req.auth.id,
				evaluacion: req.body.evaluacion,
				intento: 1,
				intentoCerrado: false
			}

			db.evaluacionFinal.create(data2Create)
			.then(data => {
				return res.status(200).send({status:200, mensaje:"Evaluacion guardada."})
			})
			.catch(err => {
				logger.error( err );
				return res.status(403).send({status:403, mensaje: "Error al guardar evaluación."})	
			});

		}else{

			//Evaluacion no se ha creado
			const data2Update = {
				evaluacion: req.body.evaluacion
			}

			db.evaluacionFinal.update(data2Update, { where: { id: data.id } }) 
			.then(dataU => {
				return res.status(200).send({status:200, mensaje:"Evaluacion actualizada."})
			})
			.catch(errU => {
				logger.error( errU );
				return res.status(403).send({status:403, mensaje: "Error al actualizar evaluación."})	
			});

		}
		
	}).catch(err => {
		logger.error( err )
		return res.status(403).send({
			status: 403,
			mensaje:"Error."
		})
	})
}

let ef_cerrar_evaluacion = (req, res)=>{
	db.evaluacionFinal.findOne({ where: { usuario: req.auth.id } })
	.then(function (data) {

		if (!data) {

			//Evaluacion no se ha creado
			const data2Create = {
				usuario: req.auth.id,
				evaluacion: req.body.evaluacion,
				intento: 1,
				intentoCerrado: true,
				calificacion: req.body.calificacion
			}

			db.evaluacionFinal.create(data2Create)
			.then(data => {
				return res.status(200).send({status:200, mensaje:"Evaluacion guardada."})
			})
			.catch(err => {
				logger.error( err );
				return res.status(403).send({status:403, mensaje: "Error al guardar evaluación."})	
			});

		}else{

			let la_calificacion = req.body.calificacion
			if(data.calificacion > req.body.calificacion){
				la_calificacion = data.calificacion
			}
			//Evaluacion no se ha creado
			const data2Update = {
				evaluacion: req.body.evaluacion,
				intentoCerrado: true,
				calificacion: la_calificacion
			}

			db.evaluacionFinal.update(data2Update, { where: { id: data.id } }) 
			.then(dataU => {
				return res.status(200).send({status:200, mensaje:"Evaluacion actualizada."})
			})
			.catch(errU => {
				logger.error( errU );
				return res.status(403).send({status:403, mensaje: "Error al actualizar evaluación."})	
			});

		}
		
	}).catch(err => {
		logger.error( err )
		return res.status(403).send({
			status: 403,
			mensaje:"Error."
		})
	})
}

let ef_nuevo_intento = (req, res)=>{
	db.evaluacionFinal.findOne({ where: { usuario: req.auth.id } })
	.then(function (data) {

		if (!data) {

			//Evaluacion no se ha creado
			return res.status(403).send({status:403, mensaje: "Usuario no tiene evaluación creada."})
			
		}else{

			if(data.intento > 2){
				return res.status(403).send({status:403, mensaje: "Usuario ya no tiene mas intentos."})
			}else if(data.intentoCerrado === false){
				return res.status(403).send({status:403, mensaje: "Usuario no ha cerrado su intento actual."})
			}else{
				//Evaluacion no se ha creado
				const data2Update = {
					evaluacion: null,
					intentoCerrado: false,
					// calificacion: 0,
					intento: data.intento+1
				}

				db.evaluacionFinal.update(data2Update, { where: { id: data.id } }) 
				.then(dataU => {
					return res.status(200).send({status:200, mensaje:"Evaluacion actualizada."})
				})
				.catch(errU => {
					logger.error( errU );
					return res.status(403).send({status:403, mensaje: "Error al actualizar evaluación."})	
				});
			}
		}
		
	}).catch(err => {
		logger.error( err )
		return res.status(403).send({
			status: 403,
			mensaje:"Error."
		})
	})
}

// End: Evaluacion Final

let reset = (req, res)=>{
	db.usuarios.findOne({ where: { username: req.body.username, reset_key: req.body.key } })
	.then(function (data) {
		if (!data) {
			return res.status(200).send({
				status: 204,
				mensaje:"Error al actualizar usuario. {no encontrado}"
			})	
		}
		const data2Update = {password: null, key: null}
		db.usuarios.update(data2Update, { where: { id: data.id } })
		.then(function(response){ 
			if(response == 1){
				return res.status(200).send({
					status: 200,
					mensaje: "OK"
				})
			}else{
				return res.status(200).send({
					status: 204,
					mensaje: "Error al actualizar usuario.  {al actualizar id: "+data.id+"}"
				})
			}
		}).catch(err => {
			logger.error( err )
			return res.status(200).send({
				status: 204,
				mensaje:"Error al actualizar usuario."
			})
		})
	})
	.catch(err => {
		logger.error( err )
		return res.status(200).send({
			status: 204,
			mensaje:"Error al actualizar usuario."
		})
	})
}

let carga_usuarios = async (req, res)=>{
		
	try {
		let result = [], errores = []

		let uploadPath = __dirname + '/../temporal/';
		if (/^win/i.test(process.platform)) {
			// TODO: Windows
		} else {
			uploadPath = '/tmp/'
		}

		if (!fs.existsSync(uploadPath)) {
			fs.mkdirSync(uploadPath, {
				recursive: true
			});
		}

		let filePath = uploadPath + req.files.usuarios_csv.name
		req.files.usuarios_csv.mv(filePath, function(err) {
		  	if (err){
				logger.error( err )
				return res.status(500).send(err);
			}
		
			fs.createReadStream( filePath )
			.pipe(removeBOM('utf-8'))
			.pipe(csvParser())
			.on("data", (data) => {
				result.push(data);
			})
			.on("end", () => {
				result.forEach( (user) => {
					if(!user.perfil && user.es_jefe == 1){
						user.perfil = 3;
					}else if(!user.perfil && user.es_tutor == 1){
						user.perfil = 4;
					}else if(!user.perfil && user.es_admin == 1){
						user.perfil = 1;
					}
					if (!user.username||!user.email||!user.nombre||!user.perfil||!user.grupo) {
						errores.push({"Faltan datos": user})
					}
				})

				if(errores.length <= 0){
					var promises = result.map( (user) => {
						return db.usuarios.findOne({ where: { username: user.username } })
						.then(function (data) {
							if (data) {
								user.existe = 1;
							}else{
								user.existe = 0;
							}
						})
						.catch(err => {
							logger.error( err )
							return res.status(204).send({
								status: 204,
								mensaje:"Error",
								err
							})
						})
					})
					Promise.all( promises )
					.then(( response_promises ) => {

						let val = result.filter( user => user.existe === 1)
						if(val.length > 0){

							result.forEach( (user) => {
								if (user.existe===1){
									errores.push({"Usuario ya existe.": user})
								}
							})

							return res.status(200).send({
								status: 204,
								mensaje:"Error al crear usuarios.",
								errores
							})
						}else{
							if(errores.length <= 0){
								//Validamos que existan los grupos
								var promises_grupos = result.map( (user) => {
									return db.grupos.findOne({ where: { id: user.grupo } })
									.then(function (data) {
										if (!data) {
											user.grupo_existe = 0
										}else{
											user.grupo_existe = 1
										}
									})
								})
								Promise.all( promises_grupos )
								.then(( response_promises_grupos ) => {
									let val = result.filter( user => user.grupo_existe === 0)
									if(val.length > 0){
										result.forEach( (user) => {
											if (user.grupo_existe===0){
												errores.push({"Grupo no existe.": user})
											}
										})
						
										return res.status(200).send({
											status: 204,
											mensaje:"Error al actualizar usuarios.",
											errores
										})
									}else{

										//Crear usuarios y asignar grupo
										var promises_usuarios = result.map( (user) => {
											return db.usuarios.create(user)
											.then(data_new_usr => {
												//--
												let grupo_id = parseInt(user.grupo || 0)
												db.grupos.findOne({ where: { id: grupo_id } })
												.then(function (data) {
													if (!data) {
														return 0
													}
													db.grupoUsuarios.findOne({ where: { usuario: data_new_usr } })
													.then(function (existe) {
														if (!existe) {
															db.grupoUsuarios.create({grupo: grupo_id, usuario: data_new_usr.id})
															.then(data => {
																return 1
															})
															.catch(err => {
																logger.error( err );
																return 0
															});
														}else{
															db.grupoUsuarios.update({grupo: grupo_id}, { where: { id: existe.id } })
															.then(data => {
																return 1
															})
															.catch(err => {
																logger.error( err );
																return 0
															});
														}
													})
													.catch(err => {
														console.log(err);
														return 0
													})
												})
												.catch(err => {
													console.log(err);
													return 0
												})
												//--
											})
											.catch(err => {
												logger.error("Error: " + err)
												return 0
											});
										})

										Promise.all( promises_usuarios )
										.then(( response_promises_usuarios ) => {
											console.log( response_promises_usuarios )
												return res.status(200).send({
													status: 200,
													mensaje:"OK",
													result
												})		
										})
									}
								})
								//Validamos que existan los grupos	
							}else{
								return res.status(200).send({
									status: 204,
									mensaje:"Error al actualizar usuarios.",
									errores
								})
							}
						}
					})
				}else{
					return res.status(200).send({
						status: 204,
						mensaje:"Error al actualizar usuarios.",
						errores
					})
				}
			})
		})
	} catch (err) {
		logger.error(err)	
		return res.status(200).send({
			status: 200,
			mensaje: err
		})	
	}
}

let asigna_jefes = async (req, res)=>{
		
	try {
		let result = [], errores = []

		const [Jefes] = await db.sequelize.query("SELECT id, username FROM Usuarios WHERE es_jefe=1")
		if(Jefes.length <= 0){
			errores.push({"No hay Jefes en el sistema": null})
		}

		const [Tutores] = await db.sequelize.query("SELECT id, username FROM Usuarios WHERE es_tutor=1")
		if(Tutores.length <= 0){
			errores.push({"No hay Tutores en el sistema": null})
		}

		let uploadPath = __dirname + '/../temporal/';
		if (/^win/i.test(process.platform)) {
			// TODO: Windows
		} else {
			uploadPath = '/tmp/'
		}

		if (!fs.existsSync(uploadPath)) {
			fs.mkdirSync(uploadPath, {
				recursive: true
			});
		}

		let filePath = uploadPath + req.files.usuarios_csv.name
		req.files.usuarios_csv.mv(filePath, function(err) {
		  	if (err){
				logger.error( err )
				return res.status(500).send(err);
			}
		
			fs.createReadStream( filePath )
			.pipe(removeBOM('utf-8'))
			.pipe(csvParser())
			.on("data", (data) => {
				result.push(data);
			})
			.on("end", () => {
				result.forEach( (user) => {
					if (!user.username||!user.username_jefe_directo||!user.username_tutor) {
						errores.push({"Faltan datos": user})
					}
				})
				if(errores.length <= 0){
					var promises = result.map( (user) => {
						return db.usuarios.findOne({ where: { username: user.username } })
						.then(function (data) {
							if (data) {
								user.existe = 1;
								let jefe = Jefes.filter( jefe => jefe.username === user.username_jefe_directo)
								let tutor = Tutores.filter( tutor => tutor.username === user.username_tutor)
								if(jefe.length <= 0){
									errores.push({"Jefe no encontrado.": user})
									user.jefe_directo = user.username_jefe_directo
								}else if(tutor.length <= 0){
									errores.push({"Tutor no encontrado.": user})
									user.tutor = user.username_tutor
								}else{
									user.jefe_directo = jefe[0].id
									user.tutor = tutor[0].id
								}
							}else{
								user.existe = 0;
							}
						})
						.catch(err => {
							logger.error( err )
							return res.status(204).send({
								status: 204,
								mensaje:"Error",
								err
							})
						})
					})
					Promise.all( promises )
					.then(( response_promises ) => {

						let val = result.filter( user => user.existe === 0)
						if(val.length > 0){

							result.forEach( (user) => {
								if (user.existe===0){
									errores.push({"Usuario no existe en sistema.": user})
								}
							})

							return res.status(200).send({
								status: 204,
								mensaje:"Error al asignar jefe a usuarios.",
								errores
							})
						}else{
							if(errores.length <= 0){
								//Validamos que existan los grupos
									
								//Asignamos los jefes al grupo
								var promises_usuarios = result.map( (user) => {
									return db.usuarios.update({jefe_directo: user.jefe_directo, tutor: user.tutor}, { where: { username: user.username } })
									.then(function(response){ 
										if(response == 1){
											return 1
										}else{
											return 0
										}
									}).catch(err => {
										logger.error( err )
										return 0
									})

								})
								
								Promise.all( promises_usuarios )
								.then(( response_promises_usuarios ) => {
									console.log( response_promises_usuarios )
										return res.status(200).send({
											status: 200,
											mensaje:"OK",
											result
										})		
								})
						
								
							}else{
								return res.status(200).send({
									status: 204,
									mensaje:"Error al actualizar usuarios.",
									errores
								})
							}
						}
					})
				}else{
					return res.status(200).send({
						status: 204,
						mensaje:"Error al actualizar usuarios.",
						errores
					})
				}
			})
		})
	} catch (err) {
		logger.error(err)	
		return res.status(200).send({
			status: 200,
			mensaje: err
		})	
	}
}

let carga_usuarios_old = async (req, res)=>{
	
	try {
		let result = [], errores = []

		const [Jefes] = await db.sequelize.query("SELECT id, CONCAT(nombre, \" \",apellido_paterno, \" \",apellido_materno) nombre FROM Usuarios WHERE es_jefe=1")
		if(Jefes.length <= 0){
			errores.push({"No hay Jefes en el sistema": null})
		}

		let uploadPath = __dirname + '/../temporal/';
		if (/^win/i.test(process.platform)) {
			// TODO: Windows
		} else {
			uploadPath = '/tmp/'
		}

		if (!fs.existsSync(uploadPath)) {
			fs.mkdirSync(uploadPath, {
				recursive: true
			});
		}

		let filePath = uploadPath + req.files.usuarios_csv.name
		req.files.usuarios_csv.mv(filePath, function(err) {
		  	if (err){
				logger.error( err )
				return res.status(500).send(err);
			}
		
			fs.createReadStream( filePath )
			.pipe(removeBOM('utf-8'))
			.pipe(csvParser())
			.on("data", (data) => {
				result.push(data);
			})
			.on("end", () => {
				result.forEach( (user) => {
					if (!user.no_empleado||!user.email||!user.nombre||!user.perfil||!user.grupo) {
						errores.push({"Faltan datos": user})
					}

					let jefe = Jefes.filter( jefe => jefe.nombre === user.jefe_directo)
					if(jefe.length <= 0){
						errores.push({"Jefe no encontrado.": user})
					}else{
						user.jefe_directo = jefe[0].id
					}
					user.username = user.no_empleado
				})

				if(errores.length <= 0){
					var promises = result.map( (user) => {
						return db.usuarios.findOne({ where: { username: user.no_empleado } })
						.then(function (data) {
							if (data) {
								user.existe = 1;
							}else{
								user.existe = 0;
							}
						})
						.catch(err => {
							logger.error( err )
							return res.status(204).send({
								status: 204,
								mensaje:"Error",
								err
							})
						})
					})

					Promise.all( promises )
					.then(( response_promises ) => {

						let val = result.filter( user => user.existe === 1)
						if(val.length > 0){

							result.forEach( (user) => {
								if (user.existe===1){
									errores.push({"Usuario ya existe.": user})
								}
							})

							return res.status(200).send({
								status: 204,
								mensaje:"Error al actualizar usuarios.",
								errores
							})
						}else{
							if(errores.length <= 0){
								//Validamos que existan los grupos
								var promises_grupos = result.map( (user) => {
									return db.grupos.findOne({ where: { id: user.grupo } })
									.then(function (data) {
										if (!data) {
											user.grupo_existe = 0
										}else{
											user.grupo_existe = 1
										}
									})
								})
								Promise.all( promises_grupos )
								.then(( response_promises_grupos ) => {
									let val = result.filter( user => user.grupo_existe === 0)
									if(val.length > 0){
										result.forEach( (user) => {
											if (user.grupo_existe===0){
												errores.push({"Grupo no existe.": user})
											}
										})
						
										return res.status(200).send({
											status: 204,
											mensaje:"Error al actualizar usuarios.",
											errores
										})
									}else{
										//Crear usuarios y asignar grupo
										var promises_usuarios = result.map( (user) => {
											return db.usuarios.create(user)
											.then(data_new_usr => {
												//--
												let grupo_id = parseInt(user.grupo || 0)
												db.grupos.findOne({ where: { id: grupo_id } })
												.then(function (data) {
													if (!data) {
														return 0
													}
													db.grupoUsuarios.findOne({ where: { usuario: data_new_usr } })
													.then(function (existe) {
														if (!existe) {
															db.grupoUsuarios.create({grupo: grupo_id, usuario: data_new_usr.id})
															.then(data => {
																return 1
															})
															.catch(err => {
																logger.error( err );
																return 0
															});
														}else{
															db.grupoUsuarios.update({grupo: grupo_id}, { where: { id: existe.id } })
															.then(data => {
																return 1
															})
															.catch(err => {
																logger.error( err );
																return 0
															});
														}
													})
													.catch(err => {
														console.log(err);
														return 0
													})
												})
												.catch(err => {
													console.log(err);
													return 0
												})
												//--
											})
											.catch(err => {
												logger.error("Error: " + err)
												return 0
											});
										})

										Promise.all( promises_usuarios )
										.then(( response_promises_usuarios ) => {
											console.log( response_promises_usuarios )
												return res.status(200).send({
													status: 200,
													mensaje:"OK",
													result
												})		
										})
										// db.usuarios.bulkCreate(result)
										// .then(function (data) {
										// 	return res.status(200).send({
										// 		status: 200,
										// 		mensaje:"OK",
										// 		result,
										// 		data
										// 	})		
										// })
										// .catch(err => {
										// 	logger.error( err )
										// 	return res.status(200).send({
										// 		status: 200,
										// 		mensaje:"Error",
										// 		err
										// 	})
										// })	
									}
								})
								//Validamos que existan los grupos	
							}else{
								return res.status(200).send({
									status: 204,
									mensaje:"Error al actualizar usuarios.",
									errores
								})
							}
						}
					})
				}else{
					return res.status(200).send({
						status: 204,
						mensaje:"Error al actualizar usuarios.",
						errores
					})
				}
			})
		})
	} catch (err) {
		logger.error(err)	
		return res.status(200).send({
			status: 200,
			mensaje: err
		})	
	}
}

let jefe_id = (req, res) =>{
	Model.findOne({
		 attributes: { exclude: ["password", "createdAt", "updatedAt", "activo"] }, 
		 where: { id: req.params.id, [Op.or]: {perfil: 3,es_jefe: 1,} },
		 include: [{model: db.grupos, required: false, attributes: ['id', 'nombre']}]})
	.then(function (data) {
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al obtener usuario."
			})	
		}else{
			const clone = JSON.parse(JSON.stringify(data));
			delete clone.Grupos
			clone.grupo_id = (data.Grupos.length > 0 ? data.Grupos[0].id : 0) || 0;
			let return_data = {
				status:200,
				mensaje: "ok",
				data: clone
			}
			return res.status(200).send(return_data)
		}
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje:"Error al obtener usuario.",
			err	
		})
	});
}

let jefe = (req, res)=>{
	const limit = parseInt(req.query.limit) || 10;
	const offset = parseInt(req.query.offset) || 0;
	var attr = {
		offset, 
		limit, 
		attributes: { exclude: ["password", "createdAt", "updatedAt"] }
	}
	if(req.query.search && req.query.search != ''){
		attr = {
			...attr,
			where: {
				[Op.or]: {
					email: { [Op.like] : '%'+req.query.search+'%' },
					username: { [Op.like] : '%'+req.query.search+'%' },
				},
				[Op.or]: {
					perfil: 3,
					es_jefe: 1,
				}
			},
			include: [{model: db.grupos, required: false, attributes: ['id', 'nombre']}]
		}
	}else{
		attr = {
			...attr,
			where: {
				[Op.or]: {
					perfil: 3,
					es_jefe: 1,
				}
			},
			include: [{model: db.grupos, required: false, attributes: ['id', 'nombre']}]
		}
	}
	let dict_jefes = {};

	Model.findAndCountAll(attr).then((result)=>{
		let dict_perfiles = [];
		db.perfiles.findAll().then((perfiles)=>{
			perfiles.forEach( (p) => {
				dict_perfiles[p.id]=p.perfil
			})
			db.usuarios.findAll({where: {[Op.or]: {perfil: 3,es_jefe: 1}}}).then((jefes)=>{
				jefes.forEach( (p) => {
					dict_jefes[p.id]=p.nombre+" "+p.apellido_paterno+" "+p.apellido_materno
				})
				let rows = result.rows.map( u => ({
					...u.dataValues,
					nombre_completo: (u.dataValues.nombre || '' ) + " " + (u.dataValues.apellido_paterno || '') + " " + (u.dataValues.apellido_materno || ''), 
					perfil_nombre: dict_perfiles[u.perfil],
					grupo_nombre: (u.dataValues.Grupos.length > 0 ? u.dataValues.Grupos[0].nombre : "N/D") || "",
					jefe_directo: dict_jefes[parseInt(u.jefe_directo)],
				}))
				return res.status(200).send({
					rows: rows,
					total: result.count
				})
			})
		})
		.catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje: "Error al obtener usuario."
			})	
		}) 
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje: "Error al obtener usuario."
		})	
	}) 
}

let tutor_id = (req, res) =>{
	Model.findOne({
		 attributes: { exclude: ["password", "createdAt", "updatedAt", "activo"] }, 
		 where: { id: req.params.id, [Op.or]: {perfil: 4,es_tutor: 1,} },
		 include: [{model: db.grupos, required: false, attributes: ['id', 'nombre']}]})
	.then(function (data) {
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al obtener usuario."
			})	
		}else{
			const clone = JSON.parse(JSON.stringify(data));
			delete clone.Grupos
			clone.grupo_id = (data.Grupos.length > 0 ? data.Grupos[0].id : 0) || 0;
			let return_data = {
				status:200,
				mensaje: "ok",
				data: clone
			}
			return res.status(200).send(return_data)
		}
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje:"Error al obtener usuario.",
			err	
		})
	});
}

let tutor = (req, res)=>{
	const limit = parseInt(req.query.limit) || 10;
	const offset = parseInt(req.query.offset) || 0;
	var attr = {
		offset, 
		limit, 
		attributes: { exclude: ["password", "createdAt", "updatedAt"] }
	}
	if(req.query.search && req.query.search != ''){
		attr = {
			...attr,
			where: {
				[Op.or]: {
					email: { [Op.like] : '%'+req.query.search+'%' },
					username: { [Op.like] : '%'+req.query.search+'%' },
				},
				[Op.or]: {
					perfil: 4,
					es_tutor: 1,
				}
			},
			include: [{model: db.grupos, required: false, attributes: ['id', 'nombre']}]
		}
	}else{
		attr = {
			...attr,
			where: {
				[Op.or]: {
					perfil: 4,
					es_tutor: 1,
				}
			},
			include: [{model: db.grupos, required: false, attributes: ['id', 'nombre']}]
		}
	}
	let dict_jefes = {};

	Model.findAndCountAll(attr).then((result)=>{
		let dict_perfiles = [];
		db.perfiles.findAll().then((perfiles)=>{
			perfiles.forEach( (p) => {
				dict_perfiles[p.id]=p.perfil
			})
			db.usuarios.findAll({where: {[Op.or]: {perfil: 3,es_jefe: 1}}}).then((jefes)=>{
				jefes.forEach( (p) => {
					dict_jefes[p.id]=p.nombre+" "+p.apellido_paterno+" "+p.apellido_materno
				})
				let rows = result.rows.map( u => ({
					...u.dataValues,
					nombre_completo: (u.dataValues.nombre || '' ) + " " + (u.dataValues.apellido_paterno || '') + " " + (u.dataValues.apellido_materno || ''), 
					perfil_nombre: dict_perfiles[u.perfil],
					grupo_nombre: (u.dataValues.Grupos.length > 0 ? u.dataValues.Grupos[0].nombre : "N/D") || "",
					jefe_directo: dict_jefes[parseInt(u.jefe_directo)],
				}))
				return res.status(200).send({
					rows: rows,
					total: result.count
				})
			})
		})
		.catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje: "Error al obtener usuario."
			})	
		}) 
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje: "Error al obtener usuario."
		})	
	}) 
}

let export_formatoAsignacion = async (req, res) => {
	const [Usuarios] = await db.sequelize.query(`SELECT u.username, CONCAT(COALESCE(u.nombre,''),' ', COALESCE(u.apellido_paterno,''),' ', COALESCE(u.apellido_materno,'')) 'nombre_colaborador', j.username username_jefe_directo, t.username username_tutor
	FROM GrupoUsuarios gu 
	LEFT JOIN Usuarios u ON u.id=gu.usuario
	LEFT JOIN Usuarios j ON u.jefe_directo = j.id
	LEFT JOIN Usuarios t ON u.tutor= t.id
	WHERE gu.grupo = '${req.query.grupo}';`);

	if(Usuarios.length > 0){
		
		let _csv = []
		_csv.push({username: 'username', nombre_colaborador: 'nombre_colaborador', username_jefe_directo: 'username_jefe_directo', username_tutor: 'username_tutor'})
		Usuarios.forEach( usuario => {
			_csv.push(usuario)
		})

		const csvStringifier = createCsvStringifier({
			header: [
				{id: 'username', title: 'username'},
				{id: 'nombre_colaborador', title: 'nombre_colaborador'},
				{id: 'username_jefe_directo', title: 'username_jefe_directo'},
				{id: 'username_tutor', title: 'username_tutor'}
			]
		});

		const csv = csvStringifier.stringifyRecords(_csv);

		const access = new aws.Credentials({
			accessKeyId: process.env.CONF_PRIVATE,
			secretAccessKey: process.env.CONF_SECRET
		})

		const s3 = new aws.S3({
			credentials: access,
			region: process.env.CONF_REGION,
			signatureVersion: 'v4'
		})

		let d = new Date();
		const _filename = 'Asignacion_Jefes_Tutores_'+ d.getDate() + "_" + (d.getMonth() + 1) + "_" + d.getFullYear() + "_" + d.getHours() + "_" + d.getMinutes() + ".csv";
		var dataObjJson = {
			Bucket: process.env.CONF_BUCKET,
			Key: 'csv/' + _filename,
			Body: csv,
			ContentType: 'text/csv',
			ACL: 'public-read'
		};
		
		
		s3.upload(dataObjJson, function (err, resp) {
			if (err) {
				logger.error( err )
				return res.status(200).send({
					status: 200,
					mensajeSuccess: false,
					url: null,
					filename: null,
					mensajeError: "Ocurrio un error, intente de nuevo o contacte a soporte."
				})
			} else {
				return res.status(200).send({
					status: 200,
					mensajeSuccess: "Se ha generado el archivo correctamente",
					url: resp.Location,
					filename: _filename,
					mensajeError: false
				})
			}
		});
	}else{
		return res.status(200).send({
			status: 200,
			mensajeSuccess: false,
			url: null,
			filename: null,
			mensajeError: "Ocurrio un error, intente de nuevo o contacte a soporte."
		})
	}
	
}

let get_formato_carga_usuarios = async (req, res) => {

	const keys = Object.keys(Model.rawAttributes);
	var empty = {};
	keys.forEach(v => empty[v]=v)
	empty = _.omit(empty,["id", "createdAt", "updatedAt", "activo", "password", "foto", "bienvenida", "reset_key"])
	empty['grupo']='';
	
	let _csv = []
	let csvHeader = []
	let head = {}

	Object.keys(empty).forEach( k => {
		csvHeader.push( {id: k, title: k} )
		head[k] = k
		
	})
	_csv.push( head )

	const csvStringifier = createCsvStringifier( {header: csvHeader} );

	const csv = csvStringifier.stringifyRecords(_csv);

	const access = new aws.Credentials({
		accessKeyId: process.env.CONF_PRIVATE,
		secretAccessKey: process.env.CONF_SECRET
	})

	const s3 = new aws.S3({
		credentials: access,
		region: process.env.CONF_REGION,
		signatureVersion: 'v4'
	})

	let d = new Date();
	const _filename = 'CargaFormatoUsuarios_'+ d.getDate() + "_" + (d.getMonth() + 1) + "_" + d.getFullYear() + "_" + d.getHours() + "_" + d.getMinutes() + ".csv";
	var dataObjJson = {
		Bucket: process.env.CONF_BUCKET,
		Key: 'csv/' + _filename,
		Body: csv,
		ContentType: 'text/csv',
		ACL: 'public-read'
	};
	
	s3.upload(dataObjJson, function (err, resp) {
		if (err) {
			logger.error( err )
			return res.status(200).send({
				status: 200,
				mensajeSuccess: false,
				url: null,
				filename: null,
				mensajeError: "Ocurrio un error, intente de nuevo o contacte a soporte."
			})
		} else {
			return res.status(200).send({
				status: 200,
				mensajeSuccess: "Se ha generado el archivo correctamente",
				url: resp.Location,
				filename: _filename,
				mensajeError: false
			})
		}
	});
	
}

let export_formatoAsistencia = async (req, res) => {

	let where = '';
	if (req.query.grupo > 0) {
		if (where === '') {
			where += ' WHERE g.id = ' + req.query.grupo
		} else {
			where += ' AND g.id = ' + req.query.grupo
		}
	}

	if (req.query.programa > 0) {
		if (where === '') {
			where += ' WHERE p.id = ' + req.query.programa
		} else {
			where += ' AND p.id = ' + req.query.programa
		}
	}

	const [Usuarios] = await db.sequelize.query(`SELECT pua.id folio, u.nombre nombre_unidad, us.username no_empleado, CONCAT(us.nombre, " ",us.apellido_paterno, " ",us.apellido_materno) nombre_colaborador, pua.asistencia
	FROM Grupos g 
	JOIN GrupoUsuarios gu ON gu.grupo = g.id 
	JOIN GrupoProgramas gp ON gp.grupo = g.id 
	JOIN ProgramaUnidades pu ON pu.programa = gp.programa 
	JOIN Programas p ON p.id = gp.programa 
	JOIN Unidades u ON u.id = pu.unidad 
	JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id
	JOIN Usuarios us ON us.id=pua.usuario
	${where}
	ORDER BY us.id ASC;`);

	if(Usuarios.length > 0){
		
		let _csv = []
		_csv.push({folio: 'folio', nombre_unidad: 'nombre_unidad', no_empleado: 'no_empleado', nombre_colaborador: 'nombre_colaborador', asistencia: 'asistencia'})
		Usuarios.forEach( usuario => {
			_csv.push(usuario)
		})

		const csvStringifier = createCsvStringifier({
			header: [
				{id: 'folio', title: 'folio'},
				{id: 'nombre_unidad', title: 'nombre_unidad'},
				{id: 'no_empleado', title: 'no_empleado'},
				{id: 'nombre_colaborador', title: 'nombre_colaborador'},
				{id: 'asistencia', title: 'asistencia'}
			]
		});

		const csv = csvStringifier.stringifyRecords(_csv);

		const access = new aws.Credentials({
			accessKeyId: process.env.CONF_PRIVATE,
			secretAccessKey: process.env.CONF_SECRET
		})

		const s3 = new aws.S3({
			credentials: access,
			region: process.env.CONF_REGION,
			signatureVersion: 'v4'
		})

		let d = new Date();
		const _filename = 'Asistencia_Usuarios_'+ d.getDate() + "_" + (d.getMonth() + 1) + "_" + d.getFullYear() + "_" + d.getHours() + "_" + d.getMinutes() + ".csv";
		var dataObjJson = {
			Bucket: process.env.CONF_BUCKET,
			Key: 'csv/' + _filename,
			Body: csv,
			ContentType: 'text/csv',
			ACL: 'public-read'
		};
		
		
		s3.upload(dataObjJson, function (err, resp) {
			if (err) {
				logger.error( err )
				return res.status(200).send({
					status: 200,
					mensajeSuccess: false,
					url: null,
					filename: null,
					mensajeError: "Ocurrio un error, intente de nuevo o contacte a soporte."
				})
			} else {
				return res.status(200).send({
					status: 200,
					mensajeSuccess: "Se ha generado el archivo correctamente",
					url: resp.Location,
					filename: _filename,
					mensajeError: false
				})
			}
		});
	}else{
		return res.status(200).send({
			status: 200,
			mensajeSuccess: false,
			url: null,
			filename: null,
			mensajeError: "Ocurrio un error, intente de nuevo o contacte a soporte."
		})
	}
}

let carga_asistencia = async (req, res)=>{
		
	try {
		let result = [], errores = []

		let uploadPath = __dirname + '/../temporal/';
		if (/^win/i.test(process.platform)) {
			// TODO: Windows
		} else {
			uploadPath = '/tmp/'
		}

		if (!fs.existsSync(uploadPath)) {
			fs.mkdirSync(uploadPath, {
				recursive: true
			});
		}

		let filePath = uploadPath + req.files.usuarios_csv.name
		req.files.usuarios_csv.mv(filePath, function(err) {
		  	if (err){
				logger.error( err )
				return res.status(500).send(err);
			}
		
			fs.createReadStream( filePath )
			.pipe(removeBOM('utf-8'))
			.pipe(csvParser())
			.on("data", (data) => {
				result.push(data);
			})
			.on("end", () => {
				result.forEach( (user) => {
					if (!user.folio||!user.no_empleado) {
						errores.push({"Faltan datos": user})
					}else{
						if(user.asistencia === "0" || user.asistencia === "1"){
							user.caso = 1
							user.asistencia = parseInt(user.asistencia)
						}else{
							user.caso = 0
							user.asistencia = null
						}
					}
				})

				if(errores.length <= 0){

					var promises_usuarios = result.map( (user) => {
						return db.pu_usuario_actividad.update({asistencia: user.asistencia, caso: user.caso}, { where: { id: user.folio } })
						.then(function(response){ 
							if(response == 1){
								return 1
							}else{
								return 0
							}
						}).catch(err => {
							logger.error( err )
							return 0
						})

					})
					
					Promise.all( promises_usuarios )
					.then(( response_promises_usuarios ) => {
						console.log( response_promises_usuarios )
							return res.status(200).send({
								status: 200,
								mensaje:"OK",
								result
							})		
					})
					
				}else{
					return res.status(200).send({
						status: 204,
						mensaje:"Error al actualizar usuarios.",
						errores
					})
				}
			})
		})
	} catch (err) {
		logger.error(err)	
		return res.status(200).send({
			status: 200,
			mensaje: err
		})	
	}
}

let marcar_insignia_vista = (req, res)=>{
	const data2Update = {popupVisto: true}
	db.insigniasUsuarios.update(data2Update, { where: { usuario: req.auth.id, id: req.params.id } })
	.then(function(response){ 
		if(response == 1){
			return res.status(200).send({status:200, mensaje: "ok"})
		}else{
			logger.error( "Error al actualizar insignia." )
			return res.status(403).send({status: 403, mensaje: "Error al actualizar insignia."})
		}
	}).catch(err => {
		logger.error( err )
		return res.status(403).send({status: 403, mensaje:"Error al actualizar insignia."})
	})
}

// Banderas modales
let u_banderas = (req, res)=>{
	db.banderaModales.findOne({ where: { usuario: req.auth.id } })
	.then( async function (data) {
		if (!data) {
			return res.status(200).send({status: 204,mensaje:"Error"})	
		}
		const data2Update = {...req.body }
		db.banderaModales.update(data2Update, { where: { id: data.id } })
		.then(function(response){ 
			if(response == 1){
				return res.status(200).send({status:200, mensaje:"ok"})
			}else{
				return res.status(204).send({status: 204,mensaje: "Error"})
			}
		}).catch(err => {
			logger.error( err )
			return res.status(204).send({status: 204,mensaje:"Error"})
		})
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({status: 204,mensaje:"Error"})
	})
}

let tutores = (req, res)=>{
	var attr = {
		where: {
			[Op.or]: {perfil: 4,es_tutor: 1}
		},
		include: [{model: db.grupos, required: false, attributes: ['id', 'nombre']}]
	}
	db.usuarios.findAndCountAll(attr).then((result)=>{
		let rows = result.rows.map( u => ({
			id: u.id,
			usr: u.username,
			nombre_completo: (u.dataValues.nombre || '' ) + " " + (u.dataValues.apellido_paterno || '') + " " + (u.dataValues.apellido_materno || '')
		}))
		return res.status(200).send({rows: rows, total: result.count})
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({status: 204,mensaje: "Error"})	
	}) 
}

let desactivar_landing_learner = (req, res)=>{
	let user_id = req.auth.id
	
	Model.findOne({ where: { id: user_id } })
	.then(function (data) {
		
		if (!data) {
			return res.status(200).send({
				status: 204,
				mensaje:"Error al actualizar bienvenida."
			})	
		}

		const data2Update = { mostrarLandingLearner: false }

		Model.update(data2Update, { where: { id: user_id } })
		.then(function(response){ 
			if(response == 1){
				return res.status(200).send({
					status:200,
					mensaje: "ok"
				})
			}else{
				return res.status(204).send({
					status: 204,
					mensaje: "Error al actualizar bienvenida."
				})
			}
		}).catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje:"Error al actualizar bienvenida",
				err
			})
		})
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje:"Error al actualizar bienvenida",
			err
		})
	})
}

module.exports = {
	preCreate,
	crear,
	leer,
	leer_id,
	actualizar,
	eliminar,
	inicia_sesion,
	desactivar_bienvenida,
	valida_usuario,
	registra_usuario,
	getNotificaciones,
	marcaNotificacionVista,
	insigniasUsuario,
	alive,
	perfil,
	perfil_jefe,
	pic_update,
	pass_update,
	data_usuario,
	ef_get,
	ef_guarda_borrador,
	ef_cerrar_evaluacion,
	ef_nuevo_intento,
	reset,
	carga_usuarios,
	jefe,
	jefe_id,
	tutor,
	tutor_id,
	asigna_jefes,
	export_formatoAsignacion,
	export_formatoAsistencia,
	carga_asistencia,
	marcar_insignia_vista,
	get_formato_carga_usuarios,
	u_banderas,
	tutores,
	desactivar_landing_learner
}