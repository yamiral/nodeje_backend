const db = require("../modelos");
const _ = require("lodash");
const { QueryTypes } = require('sequelize');
const { unidades } = require('../modelos');
const logger = require("../config/logger");
const Model = db.unidades;
const GrupoUsuarios = db.grupoUsuarios;
const GrupoProgramas = db.grupoProgramas;
const ProgramaUnidades = db.programaUnidades;
const Programas = db.programas;
const Op = db.Sequelize.Op;

let preCreate = (req, res) =>{
	const keys = Object.keys(Model.rawAttributes);
	const empty = {};
	keys.forEach(v => empty[v]="")
	res.status(200).send({
		status: 200,
		message: "Unidades.",
		unidades: _.omit(empty,["createdAt", "updatedAt", "activo", "visible"]),
		struct: _.omit(empty,["createdAt", "updatedAt", "activo", "visible"])
	});
}

let crear = (req, res)=>{
	let body = req.body;

	if (!req.body.nombre||
		!req.body.descripcion) {
		res.status(204).send({
			status: 204,
			message: "Error al crear unidad."
		});
		return;
	}
	
	const data2Create = {
		nombre: 		body.nombre,
		descripcion: 	body.descripcion,
		foto: 			body.foto || "",
		visible: 		body.visible || 1
	};
	
	Model.create(data2Create)
		.then(data => {
			res.status(200).send({
				status:200,
				data,
				mensaje:"La unidad ha sido creado con éxito"
			})
		})
		.catch(err => {
			res.status(204).send({
				status:204,
				mensaje: "Error al crear la unidad."
			})	
		});
}

let leer_id = (req, res) =>{
	Model.findOne({ attributes: { exclude: ["createdAt", "updatedAt", "activo"] }, where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al obtener unidad."
			})	
		}
		res.status(200).send({
			status:200,
			mensaje: "ok",
			data
		})
	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje:"Error al obtener unidad.",
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
		res.status(204).send({
			status:204,
			mensaje: "Error al obtener unidad."
		})	
	}) 
}

let actualizar = (req, res)=>{
	Model.findOne({ where: { id: req.params.id } })
	.then(function (data) {
		
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al actualizar unidad."
			})	
		}

		const data2Update = { ...req.body }

		Model.update(data2Update, { where: { id: req.params.id } })
		.then(function(response){ 
			if(response == 1){
				return res.status(200).send({
					status:200,
					mensaje: "ok",
					data2Update
				})
			}else{
				return res.status(204).send({
					status:204,
					mensaje: "Error al actualizar unidad."
				})
			}
		})
		.catch(err => {
			logger.info( "1. " + err )
			return res.status(204).send({
				status: 204,
				mensaje:"Error al actualizar unidad",
				err	
			})	
		})
	})
	.catch(err => {
		logger.info( "2. " + err )
		return res.status(204).send({
			status: 204,
			mensaje:"Error al actualizar unidad",
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
				mensaje:"No se pudo eliminar la unidad."
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
					mensaje: "Error al eliminar la unidad"
				})
			}
		})
	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje:"Error al eliminar unidad",
			err	
		})
	})
}

let  getUnidadesHome = async (req, res)=>{
	db.unidades.findAll({raw: true, nest: true,
		attributes: ['id', 'nombre', 'descripcion', 'foto'], where: {activo: true}, order: [[db.programas, db.programaUnidades, 'orden', 'ASC' ]],
		include: [{model: db.programas,required: true, attributes: ['nombre','descripcionPrograma','tituloUnidades'], where: {perfil: req.auth.perfil},
			include: [{model: db.grupos,required: true,attributes: ['nombre'],
				include: [{model: db.usuarios, where: { id: req.auth.id }, required: true,attributes: []}]
			}]
		}]
	})
	.then(async function (response) {

		let programa = response.map(u => ({
				nombre: u.Programas.nombre,
				descripcion: u.Programas.descripcionPrograma,
				tituloUnidades: u.Programas.tituloUnidades,
				programaReducido: u.Programas.Grupos.GrupoProgramas.programaReducido
			}
		))
		
		programa = [...new Map(programa.map(item => [item['nombre'], item])).values()]
 
		let unidades = response.map(u => ({
				id: u.id,
				nombre: u.nombre, 
				descripcion: u.descripcion,
				foto: u.foto,
				fechaApertura: '0000-00-00',
				grupo: u.Programas.Grupos.id,
				prgUnidad: u.Programas.ProgramaUnidades.id
			}
		))

		var promises = unidades.map( (a) => {
			return db.grupoUnidadFechas.findOne({ where: { unidad: a.id, grupo: a.grupo } })
			.then(function (data) {
				if (data) {
					a.fechaApertura = data.fechaApertura;
				}else{
					a.fechaApertura = '0000-00-00';
				}
			})
			.catch(err => {
				logger.error( err )
				return res.status(204).send({
					status: 204,
					mensaje:"Error"
				})
			})
		})

		Promise.all( promises )
		.then(( response_promises ) => {

			var promises_un = unidades.map( (un) => {
				return db.pu_usuario_actividad.findOne({ where: { programaUnidad: un.prgUnidad, usuario: req.auth.id } })
				.then(function (data) {
					var informacion = {
						evAprClave: false,
						evDeUnidad: false
					}
					if (data) {
						informacion.evDeUnidad = data.encuesta
						informacion.evAprClave = data.evaluacion
					}
					un['informacion'] = informacion;
				})
				.catch(err => {
					logger.error( err )
					return res.status(200).send({
						status: 200,
						mensaje:"OK",
						unidades,
						programa
					})	
				})

			})

			Promise.all( promises_un )
			.then(( resPromisesUn ) => {
				const keys = Object.keys(db.banderaModales.rawAttributes);
				const empty = {};
				keys.forEach(v => empty[v]=false)
				_.omit(empty,["id","usuario","createdAt","updatedAt"]);
				
				db.banderaModales.findOne( { attributes: { exclude: ["id", "usuario", "createdAt", "updatedAt"] }, where: { usuario: req.auth.id } } )
				.then(function (data_b) {
					let banderas = _.omit(empty,["id","usuario","createdAt","updatedAt"]);
					if (!data_b) {
						logger.info("ToDo..... crear registro para usuario")
						const data2Create = {
							usuario: req.auth.id
						};	
						db.banderaModales.create(data2Create).then(_cData => {})
					}else{
						banderas = data_b
					}

					db.evaluacionFinal.findOne({ where: { usuario: req.auth.id } })
					.then( async function (data) {
	
						const [Promedios] = await db.sequelize.query("SELECT \
						IF(COUNT(IF(guc.ev_enviada = 1, 1,NULL)) = COUNT(DISTINCT(pu.unidad)), AVG(IF(guc.ev_enviada = 1, guc.promedio, NULL)), NULL) promedioJefe, \
						AVG(IF(COALESCE(pua.archivoReto,'') <> '', pua.promedioReto, NULL)) promedioReto, MAX(guf.jefeAutoEvFinFecha) jefeAutoEvFin \
						FROM GrupoUsuarios gu \
						INNER JOIN Grupos grupo ON gu.grupo = grupo.id \
						INNER JOIN GrupoProgramas gp ON gp.grupo = gu.grupo \
						INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
						INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
						LEFT JOIN GU_Cal_Jefe_Unidads guc ON guc.gu_id = gu.id AND guc.unidad = pu.unidad \
						LEFT JOIN GrupoUnidadFechas guf ON guf.grupo=grupo.id AND guf.unidad=pu.unidad \
						WHERE gu.usuario = '"+req.auth.id+"';");
					
						let id_programa = response[0].Programas.ProgramaUnidades.programa;
						let id_grupo = response[0].Programas.Grupos.id;

						const [Recordatorios] = await db.sequelize.query(`
						SELECT r.id, r.titulo, r.mensaje, r.fecha, r.hora
						FROM Recordatorios r
						LEFT JOIN RecordatoriosVistos rv ON r.id=rv.recordatorio AND rv.usuario='${req.auth.id}'
						WHERE r.activo='1' AND r.grupo = '${id_grupo}' AND r.programa = '${id_programa}' AND NOW() BETWEEN CONCAT(r.fechaInicio,' ',r.horaInicio) AND CONCAT(r.fechaTermino,' ',r.horaTermino) AND rv.id IS NULL;`);
						
						// Agregar index CREATE INDEX idx_rec_usr ON RecordatoriosVistos(recordatorio,usuario);
						
						if (!data) {
							return res.status(200).send({
								status: 200,
								mensaje:"OK",
								unidades,
								evaluacionFinal: {evaluacion: '', calificacion: 0.00, intento: 1, intentoCerrado: false, promedios: Promedios},
								programa,
								banderas,
								recordatorios: Recordatorios
							})
						}else{
							return res.status(200).send({
								status: 200,
								mensaje:"OK",
								unidades,
								evaluacionFinal: {evaluacion: data.evaluacion, calificacion: data.calificacion, intento: data.intento, intentoCerrado: data.intentoCerrado, promedios: Promedios},
								programa,
								banderas,
								recordatorios: Recordatorios
							})
						}
					}).catch(err => {
						logger.error( err )
						return res.status(200).send({
							status: 200,
							mensaje:"OK",
							unidades,
							evaluacionFinal: {evaluacion: '', calificacion: 0.00, intento: 0, intentoCerrado: false, promedios: []},
							programa,
							banderas
						})
					})
				})
				.catch(err => {
					logger.error( err )
					return res.status(200).send({
						status: 200,
						mensaje:"OK",
						unidades,
						evaluacionFinal: {evaluacion: '', calificacion: 0.00, intento: 0, intentoCerrado: false, promedios: []},
						programa,
						banderas: _.omit(empty,["id","usuario","createdAt","updatedAt"])
					})
				});
			})
			
		})
	})
	.catch(err => {
		return res.status(200).send({
			status: 204,
			mensaje:"Error al obtener unidades.",
			err	
		})
	})
}

//Unidades que no estan en un programa
let unidades_no_pertenecen_programa = (req, res)=>{
	db.unidades.findAll({raw: true, nest: true, attributes: ['id', 'nombre', 'descripcion'], where: {'$Programas.id$': {[db.Sequelize.Op.is]: null}},
		include: [{model: db.programas, as: 'Programas', attributes: [], through: {attributes: []}, required: false, where: {id: req.params.id}}]
	})
	.then(function (response) {
		res.status(200).send({
			response
		})
	})
	.catch( (e) => {
		res.status(204).send({
			status:204,
			mensaje: "Error al obtener unidades.",
			e
		})
	})
}

let actualizaOrden = (req, res)=>{
	
	var programa = req.params.programa
	let body = req.body;

	body.forEach(element => {
		db.programaUnidades.update({ orden: parseInt(element.orden) }, { where: { programa: programa, unidad: parseInt(element.unidad) } })
		.then(function(response){ })
		.catch( (e) => { logger.error( e )})
	});
	return res.status(200).send({})
}

// let conf_unidad = (req, res)=>{
// 	const id = parseInt(req.params.id)

// 	db.grupoUsuarios.findOne({ where: { usuario: req.auth.id } })
// 	.then(function (data) {
// 		if (data) {
			
// 			db.grupoUnidadFechas.findOne({where: {grupo: parseInt(data.grupo), unidad: id}})
// 			.then(function(response){ 
// 				if(response === null){
// 					return res.status(200).send({
// 						status: 200,
// 						mensaje: "no existe configuración",
// 						data:{
// 							fechaApertura:'',
// 							fechaFinal:'',
// 							sesionArchivo:'',
// 							sesionFecha:'',
// 							sesionHora:'',
// 							retoArchivo:'',
// 							retoFecha:'',
// 							retoHora:''
// 						}
// 					})	
// 				}else{
// 					return res.status(200).send({
// 						status: 200,
// 						mensaje: "ok",
// 						data:{
// 							fechaApertura:response.fechaApertura,
// 							fechaFinal:response.fechaFinal,
// 							sesionArchivo:response.sesionArchivo,
// 							sesionFecha:response.sesionFecha,
// 							sesionHora:response.sesionHora,
// 							retoArchivo:response.retoArchivo,
// 							retoFecha:response.retoFecha,
// 							retoHora:response.retoHora
// 						}
// 					})
// 				}
// 			})
// 			.catch( (e) => { 
// 				logger.error( e )
// 				return res.status(200).send({
// 					status: 204,
// 					mensaje: "no existe configuración"
// 				})	
// 			})	
// 		}else{
// 			return res.status(204).send({
// 				status: 204,
// 				mensaje:"No existe grupo"
// 			})
// 		}
// 	})
// 	.catch(err => {
// 		logger.error( err )
// 		return res.status(204).send({
// 			status: 204,
// 			mensaje:"Error"
// 		})
// 	})
// }

let conf_unidad_grupo = (req, res)=>{
	var id = parseInt(req.params.id)
	var grupo = parseInt(req.params.grupo)

	db.grupoUnidadFechas.findOne({where: {grupo: grupo, unidad: id}})
	.then( async function(response){ 
		if(response === null){
			return res.status(200).send({
				status: 200,
				mensaje: "ok",
				data:{
					unidad: id,
					grupo: grupo,
					fechaApertura:'',
					fechaFinal:'',
					sesionArchivo:'',
					sesionFecha:'',
					sesionHora:'',
					tituloRetoOnTheJob: '',
					retoArchivo:'',
					retoFecha:'',
					retoHora:'',
					fechaInicioAutoEvaluacion: '',
					retoInicioEvParFecha: '',
					retoInicioEvParHora: '',
        			retoFinEvParFecha: '',
					retoFinEvParHora: '',
					jefeAutoEvInicioFecha:'',
					jefeAutoEvInicioHora:'',
					jefeAutoEvFinFecha:'',
					jefeAutoEvFinHora:'',
					sesionImagenPrincipal:'',
					sesionImagenSecundaria:'',
					retoImagenPaso1:'',
					retoImagenPaso2:'',
					retoImagenPaso3:'',
					retoImagenPaso4:'',
					guiaObservacion:'',
					conoceCompetencia:'',
					guiaRetroalimentacion:''
				}
			})	
		}else{
			
			let returnRes = {
				body: req.body, 
				params: req.params,
				status: 200,
				mensaje: "ok",
				data:{
					unidad: id,
					grupo: grupo,
					fechaApertura:response.fechaApertura,
					fechaFinal:response.fechaFinal,
					sesionArchivo:response.sesionArchivo,
					sesionFecha:response.sesionFecha,
					sesionHora:response.sesionHora,
					tituloRetoOnTheJob:response.tituloRetoOnTheJob,
					retoArchivo:response.retoArchivo,
					retoFecha:response.retoFecha,
					retoHora:response.retoHora,
					fechaInicioAutoEvaluacion:response.fechaInicioAutoEvaluacion,
					retoInicioEvParFecha:response.retoInicioEvParFecha,
					retoInicioEvParHora:response.retoInicioEvParHora,
					retoFinEvParFecha:response.retoFinEvParFecha,
					retoFinEvParHora:response.retoFinEvParHora,
					jefeAutoEvInicioFecha:response.jefeAutoEvInicioFecha,
					jefeAutoEvInicioHora:response.jefeAutoEvInicioHora,
					jefeAutoEvFinFecha:response.jefeAutoEvFinFecha,
					jefeAutoEvFinHora:response.jefeAutoEvFinHora,
					sesionImagenPrincipal:response.sesionImagenPrincipal,
					sesionImagenSecundaria:response.sesionImagenSecundaria,
					retoImagenPaso1:response.retoImagenPaso1,
					retoImagenPaso2:response.retoImagenPaso2,
					retoImagenPaso3:response.retoImagenPaso3,
					retoImagenPaso4:response.retoImagenPaso4,
					guiaObservacion:response.guiaObservacion,
					conoceCompetencia:response.conoceCompetencia
				}
			};
			try {
				const [InfoGrupo] = await db.sequelize.query("SELECT id, COALESCE(guiaRetroalimentacion, '') guiaRetroalimentacion FROM Grupos WHERE id = " + grupo);
				if(InfoGrupo.length > 0){
					returnRes.data['guiaRetroalimentacion'] = InfoGrupo[0].guiaRetroalimentacion
				}
				return res.status(200).send(returnRes)
			} catch (err) {
				return res.status(200).send(returnRes)
			}
		}
	})
	.catch( (e) => { 
		logger.error( e )
		return res.status(200).send({
			body: req.body, 
			params: req.params
		})
	})
}

let conf_unidad_grupo_create_update = (req, res)=>{
	const id = req.params.id
	const grupo = req.params.grupo

	db.grupoUnidadFechas.findOne({where: {grupo: grupo, unidad: id}})
	.then(function(response){ 
		//No existe, creamos el registro
		if(response === null){
			let body = req.body;

			if (!req.body.fechaApertura||
				!req.body.sesionFecha||
				!req.body.retoFecha||
				!req.body.retoHora||
				!req.body.unidad				
				) {
				res.status(204).send({
					status: 204,
					message: "Error al configurar unidad."
				});
				return;
			}
			
			const data2Create = {
				grupo: 						grupo,
				unidad: 					body.unidad,
				fechaApertura: 				body.fechaApertura || "",
				fechaFinal: 				body.fechaFinal || "",
				sesionFecha: 				body.sesionFecha || "",
				sesionHora: 				body.sesionHora || "",
				tituloRetoOnTheJob:			body.tituloRetoOnTheJob || "",
				retoFecha: 					body.retoFecha || "",
				retoHora: 					body.retoHora || "",
				retoArchivo: 				body.retoArchivo || "",
				sesionArchivo: 				body.sesionArchivo || "",
				sesionImagenPrincipal: 		body.sesionImagenPrincipal || "",
				sesionImagenSecundaria: 	body.sesionImagenSecundaria || "",
				retoImagenPaso1: 			body.retoImagenPaso1 || "",
				retoImagenPaso2: 			body.retoImagenPaso2 || "",
				retoImagenPaso3: 			body.retoImagenPaso3 || "",
				retoImagenPaso4: 			body.retoImagenPaso4 || "",
				retoInicioEvParFecha:		body.retoInicioEvParFecha || "",
				retoInicioEvParHora:		body.retoInicioEvParHora || "",
				retoFinEvParFecha:			body.retoFinEvParFecha || "",
				retoFinEvParHora:			body.retoFinEvParHora || "",
				jefeAutoEvInicioFecha:		body.jefeAutoEvInicioFecha || "",
				jefeAutoEvInicioHora:		body.jefeAutoEvInicioHora || "",
				jefeAutoEvFinFecha:			body.jefeAutoEvFinFecha || "",
				jefeAutoEvFinHora:			body.jefeAutoEvFinHora || "",
				fechaInicioAutoEvaluacion:	body.fechaInicioAutoEvaluacion || "",
				guiaObservacion:			body.guiaObservacion || "",
				conoceCompetencia:			body.conoceCompetencia || ""
			};
			
			db.grupoUnidadFechas.create(data2Create)
			.then(data => {
				if( typeof req.body.guiaRetroalimentacion === "string"){
					db.grupos.update({guiaRetroalimentacion: req.body.guiaRetroalimentacion}, { where: { id: grupo } })
					.then(function(updateGrupo){ 
						return res.status(200).send({
							status:200,
							mensaje: "La configuración de la unidad ha sido creado con éxito",
							grupoActualizado: "ok",
							data2Update
						})
					})
					.catch(errUpdateGrupo => {
					
					})
				}else{
					return res.status(200).send({
						status:200,
						mensaje: "La configuración de la unidad ha sido creado con éxito",
						data2Update
					})
				}
			})
			.catch(err => {
				res.status(204).send({
					status:200,
					mensaje: "Error al crear la configuración unidad.",
					err
				})	
			});
		}else{
			//Ya existe, actualizamos regsistro
			const data2Update = { ...req.body }
			db.grupoUnidadFechas.update(data2Update, { where: { id: response.id } })
			.then(function(response2){ 

				if(response2 == 1){
					if( typeof req.body.guiaRetroalimentacion === "string"){
						db.grupos.update({guiaRetroalimentacion: req.body.guiaRetroalimentacion}, { where: { id: grupo } })
						.then(function(updateGrupo){ 
							return res.status(200).send({
								status:200,
								mensaje: "ok",
								grupoActualizado: "ok",
								data2Update
							})
						})
						.catch(errUpdateGrupo => {
						
						})
					}else{
						return res.status(200).send({
							status:200,
							mensaje: "ok",
							data2Update
						})
					}
					
				}else{
					return res.status(204).send({
						status:204,
						mensaje: "Error al actualizar datos."
					})
				}
			})
			.catch(err => {
				logger.info( "1. " + err )
				return res.status(204).send({
					status: 204,
					mensaje:"Error al actualizar datos",
					err	
				})	
			})
		}
	})
	.catch( (e) => { 
		logger.error( e )
		return res.status(200).send({
			body: req.body, 
			params: req.params
		})
	})
}

module.exports = {
	crear,
	leer,
	leer_id,
	actualizar,
	eliminar,
	preCreate,
	getUnidadesHome,
	unidades_no_pertenecen_programa,
	actualizaOrden,
	// conf_unidad,
	conf_unidad_grupo,
	conf_unidad_grupo_create_update
}