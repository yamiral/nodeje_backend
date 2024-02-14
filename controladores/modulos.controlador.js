const db = require("../modelos");
const _ = require("lodash");
const logger = require("../config/logger");
const Model = db.modulos;
const Op = db.Sequelize.Op;
const { ModulosUnidades, DetalleUsuario } = require("../services/services")

let preCreate = (req, res) =>{
	const keys = Object.keys(Model.rawAttributes);
	const empty = {};
	keys.forEach(v => empty[v]="")
	res.status(200).send({
		status: 200,
		message: "Modulos.",
		modulos: _.omit(empty,["createdAt", "updatedAt", "visible", "unidad", "fecha", "activo"]),
		struct: _.omit(empty,["createdAt", "updatedAt", "visible", "unidad", "fecha", "activo"])
	});
}

let crear = (req, res)=>{
	let body = req.body;

	if (!req.body.nombre||
		!req.body.descripcion) {
		res.status(204).send({
			status: 204,
			message: "Error al crear modulo."
		});
		return;
	}
	
	const data2Create = {
		nombre: 		body.nombre,
		descripcion: 	body.descripcion,
        unidad:         0,
	};
	
	Model.create(data2Create)
		.then(data => {
			res.status(200).send({
				status:200,
				data,
				mensaje:"El modulo ha sido creado con éxito"
			})
		})
		.catch(err => {
			logger.error("Error: " + err)
			res.status(204).send({
				status:204,
				mensaje: "Error al crear la modulo.",
                err
			})	
		});
}

let leer_id = (req, res) =>{
	Model.findOne({ attributes: { exclude: ["createdAt", "updatedAt", "visible", "unidad", "fecha", "activo"] }, where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al obtener modulo."
			})	
		}
		res.status(200).send({
			status:200,
			mensaje: "ok",
			data
		})
	})
	.catch(err => {
		logger.error("Error: " + err)
		return res.status(204).send({
			status: 204,
			mensaje:"Error al obtener modulo.",
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
		attributes: { exclude: ["createdAt", "updatedAt"] }
	}
	if(req.query.search && req.query.search != ''){
		attr = {
			...attr,
			where: {
				[Op.or]: {
					nombre: { [Op.like] : '%'+req.query.search+'%' },
					descripcion: { [Op.like] : '%'+req.query.search+'%' },

				}
			}
		}
	}else{
		attr = {
			...attr,
			where: {
			}
		}
	}
	Model.findAndCountAll(attr).then((result)=>{
		res.status(200).send({
			rows: result.rows,
			total: result.count
		})
	})
	.catch(err => {
		logger.error("Error: " + err)
		res.status(204).send({
			status:204,
			mensaje: "Error al obtener modulo."
		})	
	}) 
}

let actualizar = (req, res)=>{
	Model.findOne({ where: { id: req.params.id } })
	.then(function (data) {
		
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al actualizar modulo."
			})	
		}

		const data2Update = { ...req.body }

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
					status:204,
					mensaje: "Error al actualizar modulo."
				})
			}
		})
	})
	.catch(err => {
		logger.error("Error: " + err)
		return res.status(204).send({
			status: 204,
			mensaje:"Error al actualizar modulo",
			err	
		})
	})
}

let eliminar = (req, res)=>{
	Model.findOne({ where: { id: req.params.id } })
	.then(function (data) {
		
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"No se pudo eliminar el modulo."
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
					status:204,
					mensaje: "Error al eliminar la modulo"
				})
			}
		})
	})
	.catch(err => {
		logger.error("Error: " + err)
		return res.status(204).send({
			status: 204,
			mensaje:"Error al eliminar modulo",
			err	
		})
	})
}

let unidadesModulos = (req, res)=>{
	const limit = parseInt(req.query.limit) || 100;
	const offset = parseInt(req.query.offset) || 0;
	var attr = {
		offset, 
		limit, 
		order: [[db.unidades, db.programaUnidadModulo, 'orden', 'ASC' ]],
		attributes: { exclude: ["createdAt", "updatedAt", "activo"] }
	}
	if(req.query.search && req.query.search != ''){
		attr = {
			...attr,
			include: {model: db.unidades, where: {id: parseInt(req.params.id)}, required: true},
			where: {
				programa: parseInt(req.params.id),
				activo: 1
			}
		}
	}else{
		attr = {
			...attr,
			include: {model: db.unidades, where: {id: parseInt(req.params.id), }, required: true},
			where: {
				activo: 1
			}
		}
	}
	db.modulos.findAndCountAll(attr).then((result)=>{
		return res.status(200).send({
			rows: result.rows,
			total: result.count
		})
	})
	.catch(err => {
		logger.error("Error: " + err)
		return res.status(204).send({
			status:204,
			mensaje: "Error al obtener unidades del programa.",
			err
		})	
	}) 
}

let asignaUnidad = (req, res)=>{
	let body = req.body;
	db.modulos.findOne({ where: { id: body.modulo } })
	.then(function (data) {
		if (!data) {
			return res.status(200).send({status: 200,mensaje:"Modulo no existe."})	
		}
		db.programaUnidadModulo.findOne({ where: { modulo: body.modulo, programaUnidad: body.unidad } })
		.then(function (existe) {
			if (!existe) {
				db.programaUnidadModulo.create({modulo: body.modulo, programaUnidad: body.unidad, orden: 999})
				.then(data => {
					return res.status(200).send({status:200,mensaje:"Asignación realizada correctamente"})
				})
				.catch(err => {
					logger.error("Error: " + err)
					return res.status(204).send({status:204,mensaje: "Error al crear relación.", err})	
				});
			}else{
				return res.status(200).send({status:200,mensaje: "La relación ya existe."})	
			}
		})
		.catch(err => {
			logger.error("Error: " + err)
			return res.status(204).send({status: 204,mensaje:"Error al crear relación.", err})
		})
	})
	.catch(err => {
		logger.error("Error: " + err)
		return res.status(204).send({status:204,mensaje:"Error al crear relacion."})
	})
}

let desasignaUnidad = (req, res)=>{
	let body = req.body;
	db.programaUnidadModulo.findOne({ where: { programaUnidad: body.unidad, modulo: body.modulo } })
	.then(function (existe) {
		if (!existe) {
			return res.status(200).send({status:204,mensaje:"No existe la relación."})
		}
		db.programaUnidadModulo.destroy({ where: { programaUnidad: body.unidad, modulo: body.modulo } })
		.then(deleted => { return res.status(200).send({status:200, mensaje: "Relación eliminada correctamente."}) })
		.catch(err => { return res.status(204).send({status:204, mensaje: "Error al eliminar la relacion."}) })
	})
	.catch(err => {
		logger.error("Error: " + err)
		return res.status(204).send({status:204,mensaje: "Error al eliminar relación."})	
	})
	.catch(err => {
		logger.error("Error: " + err)
		return res.status(204).send({status: 204,mensaje:"Error al eliminar relación."})
	})
}

let modulos_no_pertenecen_unidad = (req, res)=>{
	db.modulos.findAll({raw: true, nest: true, attributes: ['id', 'nombre', 'descripcion'], where: {'$Unidades.id$': {[db.Sequelize.Op.is]: null}, activo: 1},
		include: [{model: db.unidades, as: 'Unidades', attributes: [], through: {attributes: []}, required: false, where: {id: req.params.id}}]
	})
	.then(function (response) {
		res.status(200).send({
			response
		})
	})
	.catch( (err) => {
		logger.error("Error: " + err)
		res.status(204).send({
			status:204,
			mensaje: "Error al obtener modulos."
		})
	})
}

let  getModulosUnidad = async (req, res)=>{
	db.modulos.findAll({raw: true, nest: true,
		attributes: ['id', 'nombre', 'descripcion','icono'], where: {activo: true}, order: [[db.unidades, db.programaUnidadModulo, 'orden', 'ASC' ]],
		include: [{model: db.unidades, required: true, attributes: ['id', 'nombre', 'descripcion'], where: {id: req.params.id},
			include: [{model: db.programas,required: true, attributes: [], where: {perfil: req.auth.perfil},
				include: [{model: db.grupos,required: true,attributes: ['nombre'],
					include: [{model: db.usuarios, where: { id: req.auth.id }, required: true,attributes: []}]
				}]
			}]
		}]
	})
	.then(async function (response) {

		let unidad = response.map(u => ({
			id: u.Unidades.id,
			nombre: u.Unidades.nombre,
			descripcion: u.Unidades.descripcion,
			orden: u.Unidades.Programas.ProgramaUnidades.orden+1,
			grupo: u.Unidades.Programas.Grupos.nombre,
			grupoUsuario: u.Unidades.Programas.Grupos.Usuarios.GrupoUsuarios.id
		}))
		var grupo = 0;
		var programaUnidad = 0;
		unidad = [...new Map(unidad.map(item => [item['id'], item])).values()]

		const [ResultsEvF] = await db.sequelize.query(`SELECT * FROM GU_Cal_Jefe_Unidads WHERE gu_id = '${unidad[0].grupoUsuario}' AND unidad = '${unidad[0].id}';`);
		
		var modulos = response.map( (m) =>{
			return {
				id: m.id,
				nombre: m.nombre, 
				descripcion: m.descripcion,
				actFinalizadas: [],
				idsActividades: [],
				actsObligatorias: [], //T, ER, P
				actsObligatoriasPerc: [], //P, A, V
				actsFinalizadasObl: [], 
				actsFinalizadasPerc: [],
				moduloTerminado: false,
				progreso: 0,
				progresoObl: 0,
				progresoOblPerc: 0,
				icono: m.icono,
				orden: m.Unidades.ProgramaUnidadModulo.orden+1
			}
		})

		var promises = modulos.map( (m) => {
			return db.actividadesModulo.findAll({raw: true, nest: true,
				attributes: ['id', 'nombre', 'descripcion','tipo','icono','foto','imagen_panel','opcional'], where: {activo: true}, order: [[db.modulos, db.programaUnidadModuloActividad, 'orden', 'ASC' ]],
				include: [{model: db.modulos, required: true, attributes: ['id', 'nombre', 'descripcion'], where: {id: m.id}, order: [[db.unidades, db.programaUnidadModulo, 'orden', 'ASC' ]],
					include: [{model: db.unidades, required: true, attributes: ['id', 'nombre', 'descripcion'], where: {id: unidad[0].id},
						include: [{model: db.programas,required: true, attributes: [], where: {perfil: req.auth.perfil},
							include: [{model: db.grupos,required: true,attributes: [],
								include: [{model: db.usuarios, where: { id: req.auth.id }, required: true,attributes: []}]
							}]
						}]
					}]
				}]
			})
			.then(function (response) {
				let actividades = response.map(m => ({
					id: m.id,
					grupo: m.Modulos.Unidades.Programas.Grupos.Usuarios.GrupoUsuarios.grupo,
					prgUnidad: m.Modulos.Unidades.Programas.ProgramaUnidades.id,
					opcional: m.opcional,
					tipo: m.tipo
				}))
		
				// (m.tipo===1 ? 'Podcast' : (m.tipo===2 ? 'Video' : (m.tipo===3 ? 'Artículo' : (m.tipo===4 ? 'Toolkit': (m.tipo===5 ? 'Ejercicio de Reforzamiento' : 'N/D')))))
				// 1 - Podcast
				// 2 - Video
				// 3 - Articulo
				// 4 - Toolkit
				// 5 - ER
				actividades.forEach( (a) => { 

					m.idsActividades.push(a.id); 

					if([1,4,5].indexOf(a.tipo) !== -1){
						m.actsObligatorias.push(a.id);
					}
					if([1,2,3].indexOf(a.tipo) !== -1){
						m.actsObligatoriasPerc.push(a.id);
					}
					grupo = a.grupo; 
					programaUnidad = a.prgUnidad;
				})
			})
			.catch(err => {
				logger.error( "err2: " + err )
			})
		})

		let usuario = req.auth.id
		Promise.all( promises )
		.then(( respone_promises ) => {

			var innerPromises = modulos.map( (m) => {
				return db.actModCheck.findAll({raw: true, nest: true, where: { actividad: {[Op.in]: m.idsActividades}, usuario: usuario, completada: true } })
				.then(function (actividadesFinalizadas) {

					let acts = actividadesFinalizadas.map(a => ({
						id: a.actividad
					}))

					//Finalizadas obligatorias
					acts.forEach( (a) => { 
						if(m.actsObligatorias.filter( actO => actO === a.id).length > 0){
							m.actsFinalizadasObl.push(a.id)
						}
						if(m.actsObligatoriasPerc.filter( actO => actO === a.id).length > 0){
							m.actsFinalizadasPerc.push(a.id)
						}
					})

					acts.forEach( (a) => { m.actFinalizadas.push(a.id) } )
				})
			})
		
			Promise.all( innerPromises )
			.then(( respone_innerPromises ) => {

				modulos.forEach( (m) => { 
					//Progreso general
					m.progreso = ( ( m.actFinalizadas.length * 100) / m.idsActividades.length ) 
					//Progreso Obligatorias P, T, ER
					m.progresoObl = ( ( m.actsFinalizadasObl.length * 100) / m.actsObligatorias.length ) 
					//Progreso Obligatorias Porcentage P, A, V
					m.progresoOblPerc = ( ( m.actsFinalizadasPerc.length * 100) / m.actsObligatoriasPerc.length )

					//>= 75% de Actividades P, A y V && >= 100% de Actividades P, T, ER se marca como terminado modulo 
					if( m.progresoObl >= 100 && m.progresoOblPerc >= 75 ){
						m.moduloTerminado = true
					}

				} )				

				var informacion = {
					caso: false,
					reto: false,
					casoDescargado: false,
					retoDescargado: false,
					archivoReto: null,
					jsonAutoEvaluacion: null,
					fechaRevision: null,
					fechaRetoDescargado: null,
					fechaCasoDescargado: null,
					modulosFinalizados: false,
					autoEvaluacion: null,
					encuestaSatisfaccion: null,
					evaluacionUnidad: null,
					evaluacion: false,
					encuesta: false,
					evDeUnidad: false,
					asistenciaCaso: null,
					jsonEncuesta: null,
					pares: [],
					promedioReto: 0.00
				};

				// logger.info( "consulta " + programaUnidad + " " + req.auth.id )

				db.pu_usuario_actividad.findOne({ where: { programaUnidad: programaUnidad, usuario: req.auth.id } })
				.then(function (data) {
					if (data) {
						let modulosFinalizados = true;
						modulos.forEach( (m) => { 
							if(m.moduloTerminado === false){
								modulosFinalizados = false;
							}
						})

						informacion.caso = data.caso
						informacion.reto = data.reto
						informacion.casoDescargado = data.casoDescargado
						informacion.retoDescargado = data.retoDescargado
						informacion.archivoReto = data.archivoReto
						informacion.jsonAutoEvaluacion = data.jsonAutoEvaluacion
						informacion.fechaRevision = data.updatedAt
						informacion.fechaRetoDescargado = data.fechaRetoDescargado
						informacion.fechaCasoDescargado = data.fechaCasoDescargado
						informacion.modulosFinalizados = modulosFinalizados
						informacion.autoEvaluacion = data.autoEvaluacion
						informacion.encuestaSatisfaccion = data.encuestaSatisfaccion
						informacion.evaluacionUnidad = data.evaluacionUnidad
						informacion.promedioEncuesta = data.promedioEncuesta
						informacion.evaluacion = data.evaluacion
						informacion.encuesta = data.encuesta
						informacion.evDeUnidad = data.evDeUnidad
						informacion.asistenciaCaso = data.asistencia
						informacion.evaluacionTutor = data.evaluacionTutor
						informacion.fechaTutorEvaluacion = data.fechaTutorEvaluacion
						informacion.promedioReto = data.promedioReto
					}
					db.grupoUnidadFechas.findOne({where: {grupo: parseInt(grupo), unidad: req.params.id}})
					.then( async function(response){ 
						let ret;
						if(response === null){
							ret = {
								status: 200,
								mensaje:"OK",
								unidad,
								modulos,
								informacion: informacion,
								configuracion: {
									fechaApertura:'',
									fechaFinal:'',
									sesionArchivo:'',
									sesionFecha:'',
									sesionHora:'',
									tituloRetoOnTheJob: '',
									retoArchivo:'',
									retoFecha:'',
									retoHora:'',
									sesionImagenPrincipal:'',
									sesionImagenSecundaria:'',
									retoImagenPaso1:'',
									retoImagenPaso2:'',
									retoImagenPaso3:'',
									retoImagenPaso4:''
								}
							}
						}else{
							ret = {
								status: 200,
								mensaje:"OK",
								unidad,
								modulos,
								informacion: informacion,
								configuracion: {
									fechaApertura:				response.fechaApertura,
									fechaFinal:					response.fechaFinal,
									sesionArchivo:				response.sesionArchivo,
									sesionFecha:				response.sesionFecha,
									sesionHora:					response.sesionHora,
									retoArchivo:				response.retoArchivo,
									tituloRetoOnTheJob:			response.tituloRetoOnTheJob,
									retoFecha:					response.retoFecha,
									retoHora:					response.retoHora,
									retoInicioEvParFecha:		response.retoInicioEvParFecha,
									retoInicioEvParHora:		response.retoInicioEvParHora,
									retoFinEvParFecha:			response.retoFinEvParFecha,
									retoFinEvParHora:			response.retoFinEvParHora,
									jefeAutoEvInicioFecha:		response.jefeAutoEvInicioFecha,
									jefeAutoEvInicioHora:		response.jefeAutoEvInicioHora,
									jefeAutoEvFinFecha:			response.jefeAutoEvFinFecha,
									jefeAutoEvFinHora:			response.jefeAutoEvFinHora,
									sesionImagenPrincipal: 		response.sesionImagenPrincipal,
									sesionImagenSecundaria: 	response.sesionImagenSecundaria,
									retoImagenPaso1: 			response.retoImagenPaso1,
									retoImagenPaso2: 			response.retoImagenPaso2,
									retoImagenPaso3: 			response.retoImagenPaso3,
									retoImagenPaso4: 			response.retoImagenPaso4,
									fechaInicioAutoEvaluacion: 	response.fechaInicioAutoEvaluacion
								}
							}
							
						}
						if( data !== null){
							
							let cantRetosEvaluar =  0;
							const [InfoPares] = await db.sequelize.query("SELECT rr.id r_id, pu.id rp_id, pu.usuario rp_usuario, pu.archivoReto rp_archivoReto, rr.jsonEvaluacion r_jsonEvaluacion, rr.updatedAt r_updatedAt, rr.extra r_extra, pu.fechaRetoGuardado fechaPublicacionReto, rr.retoDescargado retoDescargadoPar FROM RevisionRetos rr LEFT JOIN PU_Usuario_Actividads pu ON pu.id=rr.reto WHERE pu.programaUnidad = " + programaUnidad + " AND rr.usuarioRevision = " + req.auth.id + " ORDER BY rr.extra ASC, rr.id ASC;");
							InfoPares.forEach( info => {
								ret.informacion.pares.push({
									id_rr: info.r_id,
									id_usr_act: info.rp_id,
									usuario: info.rp_usuario,
									archivoReto: info.rp_archivoReto,
									jsonEvaluacion: info.r_jsonEvaluacion,
									fechaRevision: info.r_updatedAt,
									extra: info.r_extra,
									fechaPublicacionReto: info.fechaPublicacionReto,
									retoDescargadoPar: info.retoDescargadoPar
								})

								if( info.rp_archivoReto !== null && info.rp_archivoReto !== '' && info.r_jsonEvaluacion !== null && info.r_jsonEvaluacion !== ''){
									cantRetosEvaluar = cantRetosEvaluar + 1
								}

							})
							const [Results] = await db.sequelize.query("SELECT id, reto, usuarioRevision, jsonEvaluacion, extra, updatedAt FROM RevisionRetos WHERE reto = " + data.id + ";");
							ret.informacion.resultadosPares = Results
							ret.informacion.evaluacionJefe = ResultsEvF
							
							// const [ResultTop] = await db.sequelize.query("SELECT * FROM (SELECT gu.grupo, pu.programaUnidad, u.id id_usuario, u.username, CONCAT(u.nombre, \" \", u.apellido_paterno, \" \", u.apellido_materno) nombre, u.foto, AVG(rr.promedioReto) Calificacion FROM GrupoUsuarios gu LEFT JOIN PU_Usuario_Actividads pu ON pu.usuario = gu.usuario LEFT JOIN RevisionRetos rr ON rr.reto = pu.id LEFT JOIN Usuarios u ON gu.usuario = u.id WHERE gu.grupo = (SELECT grupo FROM GrupoUsuarios WHERE usuario = " + req.auth.id + ") AND pu.programaUnidad = " + programaUnidad + " AND rr.promedioReto > 0  GROUP BY pu.programaUnidad, u.id) tmp  ORDER BY Calificacion DESC, FIELD(id_usuario, " + req.auth.id + ") DESC LIMIT 3;")

							const [ResultTop] = await db.sequelize.query("SELECT * FROM (SELECT gu.grupo, pu.programaUnidad, u.id id_usuario, u.username, CONCAT(u.nombre, \" \", u.apellido_paterno, \" \", u.apellido_materno) nombre, u.foto, pu.promedioReto Calificacion \
							FROM GrupoUsuarios gu \
							LEFT JOIN PU_Usuario_Actividads pu ON pu.usuario = gu.usuario \
							LEFT JOIN Usuarios u ON gu.usuario = u.id \
							WHERE gu.grupo = (SELECT grupo FROM GrupoUsuarios WHERE usuario = " + req.auth.id + ") \
							AND pu.programaUnidad = " + programaUnidad + " AND pu.promedioReto > 0 \
							GROUP BY pu.programaUnidad, u.id) tmp \
							ORDER BY Calificacion DESC, FIELD(id_usuario, " + req.auth.id + ") DESC LIMIT 3;")
							ret.informacion.resultadosTop = ResultTop

							if(typeof(ret.informacion.archivoReto) == "string"){
								// reto ya esta terminado?
								if(ret.informacion.reto === false){
									// logger.info("Reto esta marcado como no terminado....")
									let evParesInicio = new Date( ret.configuracion.retoInicioEvParFecha + " " + ret.configuracion.retoInicioEvParHora )
									let evParesFin = new Date( ret.configuracion.retoFinEvParFecha + " " + ret.configuracion.retoFinEvParHora )
									let evParesCheck = new Date()
									if( evParesCheck > evParesInicio ){
										// logger.info( "ya inicio la evaluacion de pares, tiene retos para evaluar?" )
										if( cantRetosEvaluar > 0 ){
											// logger.info( "Marcar reto como terminado, no hay retos para evaluar...." )
											db.pu_usuario_actividad.update( {reto: 1}, {where: { programaUnidad: programaUnidad, usuario: req.auth.id } })
											.then( function(r){ })
											.catch( e => { logger.error( e ) })
											ret.informacion.reto = true;
										}
									}
									if( evParesCheck > evParesFin){
										// logger.info( "Marcar reto como terminado, ya se termino el tiempo para evaluar pares...." )
										db.pu_usuario_actividad.update( {reto: 1}, {where: { programaUnidad: programaUnidad, usuario: req.auth.id } })
										.then( function(r){ })
										.catch( e => { logger.error( e ) })
										ret.informacion.reto = true;
									}
									// logger.info( "Fecha actual: " + evParesCheck + " " + evParesInicio + " " + (evParesCheck > evParesInicio) + " " + (evParesCheck > evParesFin) + " " + ret.informacion.archivoReto )
								}
							}
							// reto ya esta terminado?

							return res.status(200).send(ret)
							
						}else{
							logger.error( "Err asdasdasd" + JSON.stringify(data) )
							return res.status(200).send({
								status: 200,
								mensaje:"OK",
								unidad,
								modulos,
								informacion: {},
								configuracion: ret.configuracion
							})	
						}
					})
					.catch( (e) => { 
						logger.error( "Err i4fuin39" + JSON.stringify(e) )
						return res.status(200).send({
							status: 204,
							mensaje:"OK",
							unidad,
							modulos,
							informacion: {},
							configuracion: ret.configuracion
						})	
					})	
				})
				.catch(err => {
					logger.error( "Err oisjf934" + JSON.stringify(err) )
					return res.status(200).send({
						status: 204,
						mensaje:"OK",
						unidad,
						modulos,
						informacion: {},
						configuracion: {}
					})	
				})
			})
		})
	})
	.catch(err => {
		logger.error( "Err i9j2de9n34g " + JSON.stringify(err) )
		return res.status(204).send({
			status: 204,
			mensaje:"Error al obtener unidades.",
			err	
		})
	})
}

let informacionTop = async (req, res) => { 
	if(req.body.usuario > 0){
		const [MiInfo] = await db.sequelize.query("SELECT CONCAT(u.nombre, \" \", u.apellido_paterno, \" \", u.apellido_materno) nombre, u.foto, pu.archivoReto, pu.jsonAutoEvaluacion, COALESCE(pu.promedioReto,0 ) Calificacion FROM PU_Usuario_Actividads pu LEFT JOIN Usuarios u ON pu.usuario = u.id WHERE pu.programaUnidad = "+req.body.pu+" AND pu.usuario = "+req.body.usuario+";");
		const [MisEvaluaciones] = await db.sequelize.query("SELECT rr.id, rr.jsonEvaluacion FROM PU_Usuario_Actividads pu LEFT JOIN RevisionRetos rr ON rr.reto=pu.id WHERE pu.programaUnidad = "+req.body.pu+" AND pu.usuario = "+req.body.usuario+" AND COALESCE(jsonEvaluacion,'') <> '';")
		return res.status(200).send({
			MiInfo: MiInfo,
			MisEvaluaciones: MisEvaluaciones
		})
	}else{
		return res.status(200).send({
			MiInfo: [],
			MisEvaluaciones: []
		})
	}
	
}

let infoModulosPerfil = (req, res) => {
	ModulosUnidades(req, res)
}

let getDetalleUsuario = async (req, res) => {
	const [Usuario] = await db.sequelize.query("SELECT * \
    FROM Usuarios u \
    WHERE u.id = "+req.params.id_usuario);

	DetalleUsuario(req, res, req.params.id_usuario, Usuario[0].perfil)
}

let actualizaOrden = (req, res)=>{
	
	var unidad = req.params.unidad
	let body = req.body;

	body.forEach(element => {
		db.programaUnidadModulo.update({ orden: parseInt(element.orden) }, { where: { programaUnidad: unidad, modulo: parseInt(element.modulo) } })
		.then(function(response){ })
		.catch( (e) => { logger.error( e )})
	});
	return res.status(200).send({})
}

module.exports = {
	crear,
	leer,
	leer_id,
	actualizar,
	eliminar,
	preCreate,
	unidadesModulos,
	asignaUnidad,
	desasignaUnidad,
	modulos_no_pertenecen_unidad,
	getModulosUnidad,
	actualizaOrden,
	infoModulosPerfil,
	informacionTop,
	getDetalleUsuario
}