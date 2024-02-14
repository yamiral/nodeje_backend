const db = require("../modelos");
const _ = require("lodash");
const logger = require("../config/logger");
const Model = db.actividadesModulo;
const Op = db.Sequelize.Op;
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const AdmZip = require("adm-zip");
const mime = require('mime-types');
const path = require('path');
const serviceInsignias = require("../services/insignias");

let preCreate = (req, res) =>{
	const keys = Object.keys(Model.rawAttributes);
	const empty = {};
	keys.forEach(v => empty[v]="")
	res.status(200).send({
		status: 200,
		message: "Actividades.",
		actividades: _.omit(empty,["createdAt", "updatedAt", "visible", "fecha", "activo"]),
		struct: _.omit(empty,["createdAt", "updatedAt", "visible", "fecha", "activo"])
	});
}

let crear = (req, res)=>{
	let body = req.body;

	if (!req.body.nombre||
		!req.body.descripcion) {
		res.status(204).send({
			status: 204,
			message: "Error al crear actividad."
		});
		return;
	}
	
	const data2Create = {
		nombre: 		body.nombre,
		descripcion: 	body.descripcion,
		foto: 			body.foto || "",
		archivo: 		body.archivo || "",
		imagen_panel: 	body.imagen_panel || "",
		icono: 			body.icono || "",
		visible: 		body.visible || 1,
        tipo:           body.tipo,
        modulo:         body.modulo || 0,
		etiquetas:      body.etiquetas || "",
		preguntaLearning: body.preguntaLearning || "",
		visible: 		parseInt(body.opcional) || 0,
	};

	//--
	try {
		if( parseInt(data2Create.tipo) === 3 ){ // 3: Es articulo
			var archivo={fileName: '', fileUrl: '', fileType: ''};
			if(typeof(data2Create.archivo) == "string"){
				archivo = JSON.parse(data2Create.archivo) 
			}

			if(archivo.fileName!==''&&archivo.fileUrl!==''&&['application/zip', 'application/octet-stream', 'application/x-zip-compressed', 'multipart/x-zip'].includes(archivo.fileType) === true){
				const url_path = new URL( archivo.fileUrl ).pathname.split('/')
				const TargetFolder = url_path[1] + '/' + path.basename( url_path[2], path.extname( url_path[2] ) )
				archivo['urlArticulo'] = `https://${process.env.CONF_CF_URL}/${TargetFolder}/index.html`
				data2Create.archivo = JSON.stringify( archivo )
			}	
		}
	}catch(e) {
		logger.error("Error: " + e)
	}
	//--
	
	Model.create(data2Create)
		.then(data => {
			//--
			return res.status(200).send({
				status:200,
				data,
				mensaje:"La actividad ha sido creado con éxito"
			})
			//--
		})
		.catch(err => {
			logger.info("Error: " + err)
			return res.status(204).send({
				status:204,
				mensaje: "Error al crear la actividad."
			})	
		});
}

let leer_id = (req, res) =>{
	Model.findOne({ attributes: ['id','tipo','nombre','descripcion', 'icono', 'foto','imagen_panel','archivo','texto','etiquetas','preguntaLearning','opcional','archivoDescarga'], where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al obtener actividad."
			})	
		}

		if(req.auth.perfil > 1 ) {
			let usuario = req.auth.id
			db.actModCheck.findOne({ where: { actividad: data.id, usuario: usuario } })
			.then(function (actividadFinalizada) {
				var r_data = data.toJSON()
				r_data.finalizada=false
				r_data.descargado=false
				if (actividadFinalizada) {
					if(actividadFinalizada.completada){
						r_data.finalizada=true
					}
					r_data.descargado=actividadFinalizada.descargado
					r_data.calificacion=actividadFinalizada.calificacion
					r_data.datos_ejercicio=actividadFinalizada.datos_ejercicio
				}
				return res.status(200).send({
					status:200,
					mensaje: "ok",
					data: r_data,
					actividadFinalizada
				})
			});
		}else{
			return res.status(200).send({
				status:200,
				mensaje: "ok",
				data
			})
		}
	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje:"Error al obtener actividad.",
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
		return res.status(200).send({
			rows: result.rows,
			total: result.count
		})
	})
	.catch(err => {
		return res.status(204).send({
			status:204,
			mensaje: "Error al obtener actividad."
		})	
	}) 
}

let actualizar = (req, res)=>{
	Model.findOne({ where: { id: req.params.id } })
	.then(function (data) {
		
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al actualizar actividad."
			})	
		}

		const data2Update = { ...req.body }

		data2Update.opcional = parseInt(data2Update.opcional)

		//--
		try {
			if( parseInt(data2Update.tipo) === 3 ){ // 3: Es articulo
				var archivo={fileName: '', fileUrl: '', fileType: ''};
				if(typeof(data2Update.archivo) == "string"){
					archivo = JSON.parse(data2Update.archivo) 
				}

				if(archivo.fileName!==''&&archivo.fileUrl!==''&& ['application/zip', 'application/octet-stream', 'application/x-zip-compressed', 'multipart/x-zip'].includes(archivo.fileType) === true){
					const url_path = new URL( archivo.fileUrl ).pathname.split('/')
					const TargetFolder = url_path[1] + '/' + path.basename( url_path[2], path.extname( url_path[2] ) )
					archivo['urlArticulo'] = `https://${process.env.CONF_CF_URL}/${TargetFolder}/index.html`
					data2Update.archivo = JSON.stringify( archivo )
				}	
			}
		}catch(e) {
			logger.error("Error: " + e)
		}
		//--

		Model.update(data2Update, { where: { id: req.params.id } })
		.then(function(response){ 
			if(response == 1){
				return res.status(200).send({
					status:200,
					data,
					mensaje:"La actividad ha sido actualizada con éxito",
					data2Update
				})
			}else{
				return res.status(204).send({
					status:204,
					mensaje: "Error al actualizar actividad."
				})
			}
		})
		.catch(err => {
			return res.status(200).send({
				status: 200,
				mensaje:"Error al actualizar actividad",
				err	
			})	
		})
	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje:"Error al actualizar actividad",
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
				mensaje:"No se pudo eliminar la actividad."
			})	
		}

		const data2Update = { 'activo': !data.activo }

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
					mensaje: "Error al eliminar la actividad"
				})
			}
		})
	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje:"Error al eliminar actividad",
			err	
		})
	})
}

let actividadesModulo = (req, res) => {
	const limit = parseInt(req.query.limit) || 100;
	const offset = parseInt(req.query.offset) || 0;
	var attr = {
		offset, 
		limit, 
		order: [[db.modulos, db.programaUnidadModuloActividad, 'orden', 'ASC' ]],
		attributes: { exclude: ["createdAt", "updatedAt", "activo"] }
	}
	if(req.query.search && req.query.search != ''){
		attr = {
			...attr,
			include: {model: db.modulos, where: {id: parseInt(req.params.id)}, required: true},
			where: {
				programa: parseInt(req.params.id),
				activo: 1
			}
		}
	}else{
		attr = {
			...attr,
			include: {model: db.modulos, where: {id: parseInt(req.params.id), }, required: true},
			where: {
				activo: 1
			}
		}
	}
	db.actividadesModulo.findAndCountAll(attr).then((result)=>{
		res.status(200).send({
			rows: result.rows,
			total: result.count
		})
	})
	.catch(err => {
		res.status(204).send({
			status:204,
			mensaje: "Error al obtener actividades del modulo.",
			err
		})	
	}) 
}

let asignaModulo = (req, res)=>{
	let body = req.body;
	db.actividadesModulo.findOne({ where: { id: body.actividad } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({status: 204,mensaje:"Actividad no existe."})	
		}
		db.programaUnidadModuloActividad.findOne({ where: { programaUnidadModulo: body.modulo, actividad: body.actividad } })
		.then(function (existe) {

			if (!existe) {
				db.programaUnidadModuloActividad.create({programaUnidadModulo: body.modulo, actividad: body.actividad, orden: 999})
				.then(data => {
					return res.status(200).send({status:200,mensaje:"Asignación realizada correctamente"})
				})
				.catch(err => {
					console.log(err);
					return res.status(204).send({status:204,mensaje: "Error al crear relación.", err})	
				});
			}else{
				return res.status(204).send({status:204,mensaje: "La relación ya existe."})	
			}
		})
		.catch(err => {
			console.log(err);
			return res.status(204).send({status: 204,mensaje:"Error al crear relación.", err})
		})
	})
	.catch(err => {
		console.log(err);
		return res.status(204).send({status:204,mensaje:"Error al crear relacion."})
	})
}

let desasignaModulo = (req, res)=>{
	let body = req.body;
	db.programaUnidadModuloActividad.findOne({ where: { actividad: body.actividad, programaUnidadModulo: body.modulo } })
	.then(function (existe) {
		if (!existe) {
			return res.status(204).send({status:204,mensaje:"No existe la relación."})
		}
		db.programaUnidadModuloActividad.destroy({ where: { actividad: body.actividad, programaUnidadModulo: body.modulo } })
		.then(deleted => { return res.status(200).send({status:200, mensaje: "Relación eliminada correctamente."}) })
		.catch(err => { return res.status(204).send({status:204, mensaje: "Error al eliminar la relación."}) })
	})
	.catch(err => {
		console.log(err);
		return res.status(204).send({status:204,mensaje: "Error al eliminar relación."})	
	})
	.catch(err => {
		console.log(err);
		return res.status(204).send({status: 204,mensaje:"Error al eliminar relación."})
	})
}

let actividades_no_pertenecen_modulo = (req, res)=>{
	db.actividadesModulo.findAll({raw: true, nest: true, attributes: ['id', 'nombre', 'descripcion'], where: {'$Modulos.id$': {[db.Sequelize.Op.is]: null}, activo: 1},
		include: [{model: db.modulos, as: 'Modulos', attributes: [], through: {attributes: []}, required: false, where: {id: req.params.id}}]
	})
	.then(function (response) {
		res.status(200).send({
			response
		})
	})
	.catch( (e) => {
		res.status(204).send({
			status:204,
			mensaje: "Error al obtener actividades.",
			e
		})
	})
}

let  getActividadesUnidad = async (req, res)=>{

	db.actividadesModulo.findAll({raw: true, nest: true,
		attributes: ['id', 'nombre', 'descripcion','tipo','icono','foto','imagen_panel','icono','opcional','archivoDescarga'], where: {activo: true}, order: [[db.modulos, db.programaUnidadModuloActividad, 'orden', 'ASC' ]],
		include: [{model: db.modulos, required: true, attributes: ['id', 'nombre', 'descripcion'], where: {id: req.params.modulo}, order: [[db.unidades, db.programaUnidadModulo, 'orden', 'ASC' ]],
			include: [{model: db.unidades, required: true, attributes: ['id', 'nombre', 'descripcion'], where: {id: req.params.unidad},
				include: [{model: db.programas,required: true, attributes: [], where: {perfil: req.auth.perfil},
					include: [{model: db.grupos,required: true,attributes: [],
						include: [{model: db.usuarios, where: { id: req.auth.id }, required: true,attributes: []}]
					}]
				}]
			}]
		}]
	})
	.then(function (response) {
		let modulo = response.map(u => ({
			id: u.Modulos.id,
			nombre: u.Modulos.nombre,
			descripcion: u.Modulos.descripcion,
			orden: u.Modulos.Unidades.ProgramaUnidadModulo.orden+1
		}))
		modulo = [...new Map(modulo.map(item => [item['id'], item])).values()]
		let actividades = response.map(m => ({
			id: m.id,
			nombre: m.nombre, 
			descripcion: m.descripcion,
			foto: m.foto,
			imagen_panel: m.imagen_panel,
			icono: m.icono,
			finalizada: false,
			tipo: (m.tipo===1 ? 'Podcast' : (m.tipo===2 ? 'Video' : (m.tipo===3 ? 'Artículo' : (m.tipo===4 ? 'Toolkit': (m.tipo===5 ? 'Ejercicio de Reforzamiento' : 'N/D'))))),
			opcional: m.opcional,
			archivoDescarga: m.archivoDescarga
		}))

		let usuario = req.auth.id
		var promises = actividades.map( (a) => {
			return db.actModCheck.findOne({ where: { actividad: a.id, usuario: usuario } })
			.then(function (data) {
				if (data) {
					if(data.completada){
						a.finalizada=true
					}else{
						a.finalizada=false
					}
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

			return res.status(200).send({
				status: 200,
				mensaje:"OK",
				modulo,
				actividades
			})	
	
		})
	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje:"Error al obtener actividades.",
			err	
		})
	})
}

let  getModulosActividadesUnidad = async (req, res)=>{
	db.actividadesModulo.findAll({raw: true, nest: true,
		attributes: ['id', 'nombre', 'descripcion', 'archivo','icono', 'foto', 'imagen_panel', 'tipo','etiquetas','archivoDescarga'], where: {activo: true}, order: [[db.modulos, db.programaUnidadModuloActividad, 'orden', 'ASC' ]],
		include: [{model: db.modulos, required: true, attributes: ['id', 'nombre', 'descripcion'], order: [[db.unidades, db.programaUnidadModulo, 'orden', 'ASC' ]],
			include: [{model: db.unidades, required: true, attributes: ['id', 'nombre', 'descripcion'], where: {id: req.params.unidad},
				include: [{model: db.programas,required: true, attributes: [], where: {perfil: req.auth.perfil},
					include: [{model: db.grupos,required: true,attributes: [],
						include: [{model: db.usuarios, where: { id: req.auth.id }, required: true, attributes: []}]
					}]
				}]
			}]
		}]
	})
	.then(function (response) {

		var arr = [];
		//Agregarmos los modulos
		response.forEach( el => {

			var found = false;
			for(var i = 0; i < arr.length; i++) {
				if (arr[i].id === el.Modulos.id) {
					found = true;
					break;
				}
			}

			if(!found){
				var obj = {};
				obj['id'] = el.Modulos.id;
				obj['nombre'] = el.Modulos.nombre;
				obj['descripcion'] = el.Modulos.descripcion;
				obj['orden'] = el.Modulos.Unidades.ProgramaUnidadModulo.orden;
				obj['actividades'] = [];
				obj['idsActividades'] = [];
				obj['actFinalizadas'] = [];
				obj['progreso'] = 0;
				arr.push(obj);
			}
		})

		response.forEach( el => {

			var foundIdx = -1;
			for(var i = 0; i < arr.length; i++) {
				if (arr[i].id === el.Modulos.id) {
					foundIdx = i;
					break;
				}
			}

			if(foundIdx >= 0){
				var obj = {};
				obj['id'] = el.id;
				obj['nombre'] = el.nombre;
				obj['descripcion'] = el.descripcion;
				obj['foto'] = el.foto;
				obj['icono'] = el.icono;
				obj['imagen_panel'] = el.imagen_panel;
				obj['archivo'] = el.archivo;
				obj['finalizada'] = false;
				obj['archivoDescarga'] = el.archivoDescarga;
				obj['tipo'] = (el.tipo===1 ? 'Podcast' : (el.tipo===2 ? 'Video' : (el.tipo===3 ? 'Artículo' : (el.tipo===4 ? 'Toolkit' : (el.tipo===5 ? 'Ejercicio de Reforzamiento' : 'N/D')))));
				arr[foundIdx].actividades.push(obj);
				arr[foundIdx].idsActividades.push(el.id);
			}
		})

		let usuario = req.auth.id
		var promises = response.map( (r) => {
			return db.actModCheck.findOne({ where: { actividad: r.id, usuario: usuario, completada: true } })
			.then(function (data) {
				if (data) {
					r.finalizada = true;
					var foundIdx = -1;
					for(var i = 0; i < arr.length; i++) {
						if (arr[i].id === r.Modulos.id) {
							foundIdx = i;
							break;
						}
					}
					if(foundIdx >= 0){
						arr[foundIdx].actFinalizadas.push(r.id);
						for(var i = 0; i < arr[foundIdx].actividades.length; i++) {
							if (arr[foundIdx].actividades[i].id === r.id) {
								arr[foundIdx].actividades[i].finalizada = true;
								break;
							}
						}
					}	
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
			arr.forEach( (m) => { m.progreso = ( ( m.actFinalizadas.length * 100) / m.idsActividades.length ) } )

			arr.sort(function (a, b) {
				if (a.orden > b.orden) { return 1; }
				if (a.orden < b.orden) { return -1; }
				return 0;
			});

			return res.status(200).send({
				status: 200,
				mensaje:"OK",
				unidad: arr
			})		
		})
	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje:"Error al obtener actividades.",
			err	
		})
	})
}

let actualizaOrden = (req, res)=> {
	
	var modulo = req.params.modulo
	let body = req.body;

	body.forEach(element => {
		db.programaUnidadModuloActividad.update({ orden: parseInt(element.orden) }, { where: { programaUnidadModulo: modulo, actividad: parseInt(element.actividad) } })
		.then(function(response){ })
		.catch( (e) => { logger.error( e )})
	});
	return res.status(200).send({})
}

let termina_actividad = (req, res) => {
	let actividad = req.params.actividad
	let usuario = req.auth.id
	let body = req.body;

	db.actModCheck.findOne({ where: { actividad: actividad, usuario: usuario } })
	.then(function (data) {

		if (!data) {
			//--
			const data2Create = {
				usuario: 		usuario,
				actividad: 		actividad,
				completada: 	body.completada || 1,
				calificacion: 	body.calificacion || 0,
				datos_ejercicio: body.ejercicio || ''
			};
					
			db.actModCheck.create(data2Create)
			.then(data => {
				return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
					status:200,
					data,
					mensaje:"La actividad ha sido marcada como terminada con éxito"
				})
				// res.status(200).send({
				// 	status:200,
				// 	data,
				// 	mensaje:"La actividad ha sido marcada como terminada con éxito"
				// })
			})
			.catch(err => {
				logger.info("Error: " + err)
				return res.status(204).send({
					status:204,
					mensaje: "Error al marcar la actividad como terminada."
				})	
			});
			//--
		}else{
			//Reemplazar ejercicio
			var ejercicio = body.ejercicio || ''
			if( ejercicio !== '' && data.id > 0){
				const data2Update = {
					datos_ejercicio: ejercicio || ''
				};
				db.actModCheck.update( data2Update, { where: { id: data.id } })
				.then(function(response){ 
					if(response == 1){
						return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
							status:200,
							mensaje:"La actividad ha sido actualizada con éxito"
						})
						// return res.status(200).send({
						// 	status:200,
						// 	mensaje:"La actividad ha sido actualizada con éxito"
						// })
					}else{
						return res.status(204).send({
							status:204,
							mensaje: "Error al actualizar actividad."
						})
					}
				})
				.catch(err => {
					return res.status(200).send({
						status: 200,
						mensaje:"Error al actualizar actividad",
						err	
					})	
				})

			}else if(data.completada === true && data.id > 0){
				db.actModCheck.update( {completada: false}, { where: { id: data.id } })
				.then(function(response){ 
					if(response == 1){
						return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
							status:200,
							mensaje:"La actividad ha sido actualizada con éxito"
						})
					}else{
						return res.status(204).send({
							status:204,
							mensaje: "Error al actualizar actividad."
						})
					}
				})
				.catch(err => {
					return res.status(200).send({
						status: 200,
						mensaje:"Error al actualizar actividad",
						err	
					})	
				})
			}else if(data.completada === false && data.id > 0){
				db.actModCheck.update( {completada: true}, { where: { id: data.id } })
				.then(function(response){ 
					if(response == 1){
						return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
							status:200,
							mensaje:"La actividad ha sido actualizada con éxito"
						})
					}else{
						return res.status(204).send({
							status:204,
							mensaje: "Error al actualizar actividad."
						})
					}
				})
				.catch(err => {
					return res.status(200).send({
						status: 200,
						mensaje:"Error al actualizar actividad",
						err	
					})	
				})
			}else{
				return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
					status:200,
					mensaje: "Actividad ya está marcada como terminada."
				})
				// return res.status(200).send({
				// 	status:200,
				// 	mensaje: "Actividad ya está marcada como terminada."
				// })
			}
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
}

let rank_actividad = (req, res)=> {
	let actividad = req.params.actividad
	let usuario = req.auth.id
	let body = req.body;

	db.actModCheck.findOne({ where: { actividad: actividad, usuario: usuario } })
	.then(function (data) {

		if (!data) {
			//--
			const data2Create = {
				usuario: 		usuario,
				actividad: 		actividad,
				completada: 	body.completada || 1,
				calificacion: 	body.calificacion || 0,
				datos_ejercicio: body.ejercicio || ''
			};
					
			db.actModCheck.create(data2Create)
			.then(data => {
				return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
					status:200,
					data,
					mensaje:"La actividad ha sido marcada como terminada con éxito"
				})
				// return res.status(200).send({
				// 	status:200,
				// 	data,
				// 	mensaje:"La actividad ha sido marcada como terminada con éxito"
				// })
			})
			.catch(err => {
				logger.info("Error: " + err)
				return res.status(204).send({
					status:204,
					mensaje: "Error al marcar la actividad como terminada."
				})	
			});
			//--
		}else{
			if( body.calificacion !== '' && data.id > 0){
				const data2Update = {
					calificacion: body.calificacion || 0,
					completada: !body.completada
				};
				db.actModCheck.update( data2Update, { where: { id: data.id } })
				.then(function(response){ 
					if(response == 1){
						return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
							status:200,
							mensaje:"La actividad ha sido actualizada con éxito"
						})
						// return res.status(200).send({
						// 	status:200,
						// 	mensaje:"La actividad ha sido actualizada con éxito"
						// })
					}else{
						return res.status(204).send({
							status:204,
							mensaje: "Error al actualizar actividad."
						})
					}
				})
				.catch(err => {
					return res.status(200).send({
						status: 200,
						mensaje:"Error al actualizar actividad",
						err	
					})	
				})
			}else{
				return res.status(200).send({
					status:200,
					mensaje: "Actividad ya está marcada como terminada."
				})	
			}
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
}

let toolkit_descargado = (req, res) => {
	let actividad = req.params.actividad
	let usuario = req.auth.id
	let body = req.body;

	db.actModCheck.findOne({ where: { actividad: actividad, usuario: usuario } })
	.then(function (data) {

		if (!data) {
			//--
			const data2Create = {
				usuario: 			usuario,
				actividad: 			actividad,
				completada: 		body.completada || 0,
				calificacion: 		body.calificacion || 0,
				datos_ejercicio: 	body.ejercicio || '',
				descargado: 		body.descargado || 1,

			};
					
			db.actModCheck.create(data2Create)
			.then(data => {
				return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
					status:200,
					data,
					mensaje:"La actividad ha sido marcada como terminada con éxito"
				})
			})
			.catch(err => {
				logger.info("Error: " + err)
				return res.status(204).send({
					status:204,
					mensaje: "Error al marcar la actividad como terminada."
				})	
			});
			//--
		}else{
			if( data.id > 0){
				const data2Update = {
					descargado: 1
				};
				db.actModCheck.update( data2Update, { where: { id: data.id } })
				.then(function(response){ 
					if(response == 1){
						return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
							status:200,
							mensaje:"La actividad ha sido actualizada con éxito"
						})
					}else{
						return res.status(204).send({
							status:204,
							mensaje: "Error al actualizar actividad."
						})
					}
				})
				.catch(err => {
					return res.status(200).send({
						status: 200,
						mensaje:"Error al actualizar actividad",
						err	
					})	
				})
			}else{
				return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
					status:200,
					mensaje: "Actividad ya está marcada como descargada."
				})
			}
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

}

let guarda_reto_usuario = (req, res)=> {
	db.unidades.findAll({raw: true, nest: true, where: {id: req.params.unidad},
		attributes: ['id', 'nombre', 'descripcion', 'foto'], where: {activo: true}, order: [[db.programas, db.programaUnidades, 'orden', 'ASC' ]],
		include: [{model: db.programas,required: true, attributes: ['nombre','descripcionPrograma'], where: {perfil: req.auth.perfil},
			include: [{model: db.grupos,required: true,attributes: ['nombre'],
				include: [{model: db.usuarios, where: { id: req.auth.id }, required: true, attributes: []}]
			}]
		}]
	})
	.then(function (response) {
		
		let pu =  response.filter( ins => ins.id === parseInt(req.params.unidad) )
		let unidad = pu[0].id
		let progUnidad = pu[0].Programas.ProgramaUnidades.id

		// let unidad = response[0].id
		// let progUnidad = response[0].Programas.ProgramaUnidades.id

		db.pu_usuario_actividad.findOne({ where: { programaUnidad: progUnidad, usuario: req.auth.id } })
		.then(function (data) {	
			if (!data) {
				const data2Create = {
					programaUnidad: 	progUnidad,
					usuario: 			req.auth.id,
					caso:				0,
					reto:				0,
					encuesta:			0,
					archivoReto:		req.body.archivoReto || '',
					casoDescargado:		0,
					retoDescargado:		0,
					fechaAutoEvaluacion: null,
					fechaCasoDescargado: null,
					fechaRetoGuardado: db.sequelize.literal('CURRENT_TIMESTAMP'), 
					fechaRetoDescargado: null,
					autoEvaluacion: null,
					encuestaSatisfaccion:null,
					evaluacionUnidad:null,
					evaluacion: 0
				};
				
				db.pu_usuario_actividad.create(data2Create)
				.then(data => {
					return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
						status:200,
						data,
						mensaje:"Guardado con éxito"
					})
					// return res.status(200).send({
					// 	status:200,
					// 	data,
					// 	mensaje:"Guardado con éxito"
					// })
				})
				.catch(err => {
					logger.info("Error: " + err)
					return res.status(204).send({
						status: 204,
						mensaje: "Error al guardar."
					})	
				});
			}else{
				const data2Save = {
					archivoReto: req.body.archivoReto,
					fechaRetoGuardado: db.sequelize.literal('CURRENT_TIMESTAMP')
				};
				db.pu_usuario_actividad.update( data2Save, { where: { id: data.id } })
				.then( async function(response){ 
					if(response == 1){
						//Notificacion Tutor
						const [Tutor] = await db.sequelize.query( "SELECT u.id, COALESCE(u.tutor, 0) tutor, g.id id_grupo, g.nombre nombre_grupo FROM Usuarios u LEFT JOIN GrupoUsuarios gu ON gu.usuario = u.id LEFT JOIN Grupos g ON g.id = gu.grupo WHERE u.id = '"+req.auth.id+"';" );
						if(Tutor[0].tutor > 0 ){
							db.notificaciones.create({
								usuario: Tutor[0].tutor, 
								reto: data.id, 
								data: JSON.stringify({id_usuario: req.auth.id, unidad: unidad, grupo: Tutor[0].id_grupo, nombre_grupo: Tutor[0].nombre_grupo}),
								visto: 0,
								tipo: 8})
							.then(notificationCreate => {
								db.notificacionesUsuario.create({
									notificacion: notificationCreate.id,
									usuario: req.auth.id
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
						db.revisionReto.findAll({where: {reto: data.id}})
						.then( revReto => {
							revReto.forEach( el => {
								//--Creamos notificacion al usuario de que un usuario subio su reto
								db.notificaciones.create({
									usuario: el.usuarioRevision, 
									reto: data.id, 
									data: JSON.stringify({id_usuario: req.auth.id, unidad: unidad}),
									visto: 0,
									tipo: 2})
								.then(notificationCreate => {
									db.notificacionesUsuario.create({
										notificacion: notificationCreate.id,
										usuario: req.auth.id
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
								//--END: Creamos notificacion al usuario de que un usuario subio su reto
							})
						}) 
						return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
							status:200,
							mensaje:"Guardado con éxito."
						})
						// return res.status(200).send({
						// 	status:200,
						// 	mensaje:"Guardado con éxito."
						// })
					}else{
						return res.status(204).send({
							status:204,
							mensaje: "Error al actualizar."
						})
					}
				})
				.catch(err => {
					logger.error( err )
					return res.status(204).send({
						status: 204,
						mensaje:"Error al actualizar",
						err	
					})	
				})
			}
		})
		.catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje: "Error al guardar."
			})	
		})

	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje: "Error al guardar."
		})	
	})
	//--
}

let guarda_autoevaluacion = (req, res)=> {
	db.unidades.findAll({raw: true, nest: true, where: {id: req.params.unidad},
		attributes: ['id', 'nombre', 'descripcion', 'foto'], where: {activo: true}, order: [[db.programas, db.programaUnidades, 'orden', 'ASC' ]],
		include: [{model: db.programas,required: true, attributes: ['nombre','descripcionPrograma'], where: {perfil: req.auth.perfil},
			include: [{model: db.grupos,required: true,attributes: ['nombre'],
				include: [{model: db.usuarios, where: { id: req.auth.id }, required: true, attributes: []}]
			}]
		}]
	})
	.then(function (response) {

		let pu =  response.filter( ins => ins.id === parseInt(req.params.unidad) )
		let progUnidad = pu[0].Programas.ProgramaUnidades.id

		// let progUnidad = response[0].Programas.ProgramaUnidades.id
		db.pu_usuario_actividad.findOne({ where: { programaUnidad: progUnidad, usuario: req.auth.id } })
		.then(function (data) {
			if (!data) {
				const data2Create = {
					programaUnidad: 	progUnidad,
					usuario: 			req.auth.id,
					caso:				0,
					reto:				0,
					encuesta:			0,
					archivoReto:		'',
					casoDescargado:		0,
					retoDescargado:		0,
					fechaAutoEvaluacion: null,
					fechaCasoDescargado: null,
					fechaRetoGuardado: null, 
					fechaRetoDescargado: null,
					autoEvaluacion: req.body.autoEvaluacion,
					encuestaSatisfaccion:null,
					evaluacionUnidad:null,
					evaluacion: 1,
					fechaEvaluacion: db.sequelize.literal('CURRENT_TIMESTAMP'),
					fechaEncuesta: null

				};
				
				db.pu_usuario_actividad.create(data2Create)
				.then(data => {
					return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
						status:200,
						data,
						mensaje:"Guardado con éxito"
					})
					// return res.status(200).send({
					// 	status:200,
					// 	data,
					// 	mensaje:"Guardado con éxito"
					// })
				})
				.catch(err => {
					logger.info("Error: " + err)
					return res.status(204).send({
						status: 204,
						mensaje: "Error al guardar."
					})	
				});
			}else{
				const data2Save = {
					autoEvaluacion: req.body.autoEvaluacion,
					evaluacion: 1,
					fechaEvaluacion: db.sequelize.literal('CURRENT_TIMESTAMP')
				};
				db.pu_usuario_actividad.update( data2Save, { where: { id: data.id } })
				.then(function(response){ 
					if(response == 1){
						return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
							status:200,
							mensaje:"Guardado con éxito."
						})
						// return res.status(200).send({
						// 	status:200,
						// 	mensaje:"Guardado con éxito."
						// })
					}else{
						return res.status(204).send({
							status:204,
							mensaje: "Error al actualizar."
						})
					}
				})
				.catch(err => {
					logger.error( err )
					return res.status(204).send({
						status: 204,
						mensaje:"Error al actualizar",
						err	
					})	
				})
			}
		})
		.catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje: "Error al guardar."
			})	
		})

	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje: "Error al guardar."
		})	
	})
	//--
}

let guarda_encuesta_satisfaccion = (req, res)=> {
	db.unidades.findAll({raw: true, nest: true, where: {id: req.params.unidad},
		attributes: ['id', 'nombre', 'descripcion', 'foto'], where: {activo: true}, order: [[db.programas, db.programaUnidades, 'orden', 'ASC' ]],
		include: [{model: db.programas,required: true, attributes: ['nombre','descripcionPrograma'], where: {perfil: req.auth.perfil},
			include: [{model: db.grupos,required: true,attributes: ['nombre'],
				include: [{model: db.usuarios, where: { id: req.auth.id }, required: true, attributes: []}]
			}]
		}]
	})
	.then(function (response) {

		let pu =  response.filter( ins => ins.id === parseInt(req.params.unidad) )
		let progUnidad = pu[0].Programas.ProgramaUnidades.id

		// let progUnidad = response[0].Programas.ProgramaUnidades.id
		db.pu_usuario_actividad.findOne({ where: { programaUnidad: progUnidad, usuario: req.auth.id } })
		.then(function (data) {
			if (!data) {
				const data2Create = {
					programaUnidad: 	progUnidad,
					usuario: 			req.auth.id,
					caso:				0,
					reto:				0,
					encuesta:			1,
					archivoReto:		'',
					casoDescargado:		0,
					retoDescargado:		0,
					fechaAutoEvaluacion: null,
					fechaCasoDescargado: null,
					fechaRetoGuardado: null, 
					fechaRetoDescargado: null,
					autoEvaluacion: null,
					encuestaSatisfaccion: req.body.encuestaSatisfaccion,
					evaluacionUnidad:null,
					promedioEncuesta: null,
					evaluacion: 	0,
					fechaEvaluacion: null,
					fechaEncuesta: db.sequelize.literal('CURRENT_TIMESTAMP')
				};
				
				db.pu_usuario_actividad.create(data2Create)
				.then(data => {
					return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
						status:200,
						data,
						mensaje:"Guardado con éxito"
					})
					// return res.status(200).send({
					// 	status:200,
					// 	data,
					// 	mensaje:"Guardado con éxito"
					// })
				})
				.catch(err => {
					logger.info("Error: " + err)
					return res.status(204).send({
						status: 204,
						mensaje: "Error al guardar."
					})	
				});
			}else{
				const data2Save = {
					encuestaSatisfaccion: req.body.encuestaSatisfaccion,
					encuesta: 1,
					fechaEncuesta: db.sequelize.literal('CURRENT_TIMESTAMP')
				};
				db.pu_usuario_actividad.update( data2Save, { where: { id: data.id } })
				.then(function(response){ 
					if(response == 1){
						return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
							status:200,
							data,
							mensaje:"Guardado con éxito"
						})
						// return res.status(200).send({
						// 	status:200,
						// 	mensaje:"Guardado con éxito."
						// })
					}else{
						return res.status(204).send({
							status:204,
							mensaje: "Error al actualizar."
						})
					}
				})
				.catch(err => {
					logger.error( err )
					return res.status(204).send({
						status: 204,
						mensaje:"Error al actualizar",
						err	
					})	
				})
			}
		})
		.catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje: "Error al guardar."
			})	
		})

	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje: "Error al guardar."
		})	
	})
	//--
}

let guarda_evaluacion_unidad = (req, res)=> {
	db.unidades.findAll({raw: true, nest: true, where: {id: req.params.unidad},
		attributes: ['id', 'nombre', 'descripcion', 'foto'], where: {activo: true}, order: [[db.programas, db.programaUnidades, 'orden', 'ASC' ]],
		include: [{model: db.programas,required: true, attributes: ['nombre','descripcionPrograma'], where: {perfil: req.auth.perfil},
			include: [{model: db.grupos,required: true,attributes: ['nombre'],
				include: [{model: db.usuarios, where: { id: req.auth.id }, required: true, attributes: []}]
			}]
		}]
	})
	.then(function (response) {

		let pu =  response.filter( ins => ins.id === parseInt(req.params.unidad) )
		let progUnidad = pu[0].Programas.ProgramaUnidades.id

		// let progUnidad = response[0].Programas.ProgramaUnidades.id
		db.pu_usuario_actividad.findOne({ where: { programaUnidad: progUnidad, usuario: req.auth.id } })
		.then(function (data) {
			if (!data) {
				const data2Create = {
					programaUnidad: 	progUnidad,
					usuario: 			req.auth.id,
					caso:				0,
					reto:				0,
					encuesta:			0,
					archivoReto:		'',
					casoDescargado:		0,
					retoDescargado:		0,
					fechaAutoEvaluacion: null,
					fechaCasoDescargado: null,
					fechaRetoGuardado: null, 
					fechaRetoDescargado: null,
					autoEvaluacion: null,
					encuestaSatisfaccion: null,
					evaluacionUnidad: req.body.evaluacionUnidad,
					promedioEncuesta: req.body.promedio,
					evaluacion: 	0,
					evDeUnidad:		1,
					fechaEvaluacion: null,
					fechaEncuesta: db.sequelize.literal('CURRENT_TIMESTAMP')
				};
				
				db.pu_usuario_actividad.create(data2Create)
				.then(data => {
					return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
						status:200,
						data,
						mensaje:"Guardado con éxito"
					})
					// return res.status(200).send({
					// 	status:200,
					// 	data,
					// 	mensaje:"Guardado con éxito"
					// })
				})
				.catch(err => {
					logger.info("Error: " + err)
					return res.status(204).send({
						status: 204,
						mensaje: "Error al guardar."
					})	
				});
			}else{
				const data2Save = {
					evaluacionUnidad: 	req.body.evaluacionUnidad,
					promedioEncuesta: 	req.body.promedio,
					evDeUnidad: 		1
				};
				db.pu_usuario_actividad.update( data2Save, { where: { id: data.id } })
				.then(function(response){ 
					if(response == 1){
						return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
							status:200,
							data,
							mensaje:"Guardado con éxito"
						})
						// return res.status(200).send({
						// 	status:200,
						// 	mensaje:"Guardado con éxito."
						// })
					}else{
						return res.status(204).send({
							status:204,
							mensaje: "Error al actualizar."
						})
					}
				})
				.catch(err => {
					logger.error( err )
					return res.status(204).send({
						status: 204,
						mensaje:"Error al actualizar",
						err	
					})	
				})
			}
		})
		.catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje: "Error al guardar."
			})	
		})

	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje: "Error al guardar."
		})	
	})
	//--
}

let reto_descargado = (req, res)=> {
	db.unidades.findAll({raw: true, nest: true, where: {id: req.params.unidad},
		attributes: ['id', 'nombre', 'descripcion', 'foto'], where: {activo: true}, order: [[db.programas, db.programaUnidades, 'orden', 'ASC' ]],
		include: [{model: db.programas,required: true, attributes: ['nombre','descripcionPrograma'], where: {perfil: req.auth.perfil},
			include: [{model: db.grupos,required: true,attributes: ['nombre'],
				include: [{model: db.usuarios, where: { id: req.auth.id }, required: true, attributes: []}]
			}]
		}]
	})
	.then(function (response) {
		let pu =  response.filter( ins => ins.id === parseInt(req.params.unidad) )
		let progUnidad = pu[0].Programas.ProgramaUnidades.id
		db.pu_usuario_actividad.findOne({ where: { programaUnidad: progUnidad, usuario: req.auth.id } })
		.then(function (data) {
			if (!data) {
				const data2Create = {
					programaUnidad: 	progUnidad,
					usuario: 			req.auth.id,
					caso:				0,
					reto:				0,
					encuesta:			0,
					archivoReto:		null,
					casoDescargado:		0,
					retoDescargado:		1,
					fechaAutoEvaluacion: null,
					fechaCasoDescargado: null,
					fechaRetoGuardado: null, 
					fechaRetoDescargado: db.sequelize.literal('CURRENT_TIMESTAMP'),
					autoEvaluacion: null,
					encuestaSatisfaccion:null,
					evaluacionUnidad:null,
					evaluacion: 0,
					fechaEvaluacion: null,
					fechaEncuesta: null
				};
				
				db.pu_usuario_actividad.create(data2Create)
				.then(data => {
					return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
						status:200,
						data,
						mensaje:"Guardado con éxito"
					})
					// return res.status(200).send({
					// 	status:200,
					// 	data,
					// 	mensaje:"Guardado con éxito"
					// })
				})
				.catch(err => {
					logger.info("Error: " + err)
					return res.status(204).send({
						status: 204,
						mensaje: "Error al guardar."
					})	
				});
			}else{
				const data2Save = {
					retoDescargado: 1,
					fechaRetoDescargado: db.sequelize.literal('CURRENT_TIMESTAMP')
				};
				db.pu_usuario_actividad.update( data2Save, { where: { id: data.id } })
				.then(function(response){ 
					if(response == 1){
						return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
							status:200,
							response: response,
							mensaje:"Guardado con éxito."
						})
						// return res.status(200).send({
						// 	status:200,
						// 	response: response,
						// 	mensaje:"Guardado con éxito."
						// })
					}else{
						return res.status(204).send({
							status:204,
							mensaje: "Error al actualizar."
						})
					}
				})
				.catch(err => {
					logger.error( err )
					return res.status(204).send({
						status: 204,
						mensaje:"Error al actualizar",
						err	
					})	
				})
			}
		})
		.catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje: "Error al guardar."
			})	
		})

	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje: "Error al guardar."
		})	
	})
	//--
}

let caso_descargado = (req, res)=> {
	db.unidades.findAll({raw: true, nest: true, where: {id: req.params.unidad},
		attributes: ['id', 'nombre', 'descripcion', 'foto'], where: {activo: true}, order: [[db.programas, db.programaUnidades, 'orden', 'ASC' ]],
		include: [{model: db.programas,required: true, attributes: ['nombre','descripcionPrograma'], where: {perfil: req.auth.perfil},
			include: [{model: db.grupos,required: true,attributes: ['nombre'],
				include: [{model: db.usuarios, where: { id: req.auth.id }, required: true, attributes: []}]
			}]
		}]
	})
	.then(function (response) {
		let pu =  response.filter( ins => ins.id === parseInt(req.params.unidad) )
		let progUnidad = pu[0].Programas.ProgramaUnidades.id
		db.pu_usuario_actividad.findOne({ where: { programaUnidad: progUnidad, usuario: req.auth.id } })
		.then(function (data) {
			if (!data) {
				const data2Create = {
					programaUnidad: 	progUnidad,
					usuario: 			req.auth.id,
					caso:				0,
					reto:				0,
					encuesta:			0,
					archivoReto:		null,
					casoDescargado:		1,
					retoDescargado:		0,
					fechaAutoEvaluacion: null,
					fechaCasoDescargado: db.sequelize.literal('CURRENT_TIMESTAMP'),
					fechaRetoGuardado: null, 
					fechaRetoDescargado: null,
					autoEvaluacion: null,
					encuestaSatisfaccion:null,
					evaluacionUnidad:null,
					evaluacion: 0,
					fechaEvaluacion: null,
					fechaEncuesta: null
				};
				
				db.pu_usuario_actividad.create(data2Create)
				.then(data => {
					return res.status(200).send({
						status:200,
						data,
						mensaje:"Guardado con éxito"
					})
				})
				.catch(err => {
					logger.info("Error: " + err)
					return res.status(204).send({
						status: 204,
						mensaje: "Error al guardar."
					})	
				});
			}else{
				const data2Save = {
					casoDescargado: 1,
					fechaCasoDescargado: db.sequelize.literal('CURRENT_TIMESTAMP'),
				};

				db.pu_usuario_actividad.update( data2Save, { where: { id: data.id } })
				.then(function(response){ 
					if(response == 1){
						return res.status(200).send({
							status:200,
							response: response,
							mensaje:"Guardado con éxito."
						})
					}else{
						return res.status(204).send({
							status:204,
							mensaje: "Error al actualizar."
						})
					}
				})
				.catch(err => {
					logger.error( err )
					return res.status(204).send({
						status: 204,
						mensaje:"Error al actualizar",
						err	
					})	
				})
			}
		})
		.catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje: "Error al guardar."
			})	
		})

	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje: "Error al guardar."
		})	
	})
	//--
}

let guarda_usuario_actividad = (req, res)=> {
	db.unidades.findAll({raw: true, nest: true, where: {id: req.params.unidad},
		attributes: ['id', 'nombre', 'descripcion', 'foto'], where: {activo: true}, order: [[db.programas, db.programaUnidades, 'orden', 'ASC' ]],
		include: [{model: db.programas,required: true, attributes: ['nombre','descripcionPrograma'], where: {perfil: req.auth.perfil},
			include: [{model: db.grupos,required: true,attributes: ['nombre'],
				include: [{model: db.usuarios, where: { id: req.auth.id }, required: true, attributes: []}]
			}]
		}]
	})
	.then(function (response) {

		// ToDo... -> Al guardar la autoevaluacion verificamos si es programa simple para poner reto como terminado

		let pu =  response.filter( ins => ins.id === parseInt(req.params.unidad) )
		let progUnidad = pu[0].Programas.ProgramaUnidades.id
		let progReducido = pu[0].Programas.Grupos.GrupoProgramas.programaReducido
		
		// let progUnidad = response[0].Programas.ProgramaUnidades.id
		db.pu_usuario_actividad.findOne({ where: { programaUnidad: progUnidad, usuario: req.auth.id } })
		.then(function (data) {
			if (!data) {
				const data2Create = {
					programaUnidad: 	progUnidad,
					usuario: 			req.auth.id,
					caso:				req.body.caso || 0,
					reto:				req.body.reto || 0,
					encuesta:			req.body.encuesta || 0,
					jsonAutoEvaluacion: req.body.evaluacion || "",
					casoDescargado:		req.body.casoDescargado || 0,
					retoDescargado:		req.body.retoDescargado || 0,
					autoEvaluacion: null,
					encuestaSatisfaccion:null,
					evaluacionUnidad:null,
					evaluacion: 0,
					fechaEvaluacion: null,
					fechaEncuesta: null
				};

				if(progReducido === 1){
					data2Save['reto'] = 1
				}
				
				db.pu_usuario_actividad.create(data2Create)
				.then(data => {
					return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
						status:200,
						data,
						mensaje:"Guardado con éxito"
					})
					// return res.status(200).send({
					// 	status:200,
					// 	data,
					// 	mensaje:"Guardado con éxito"
					// })
				})
				.catch(err => {
					logger.info("Error: " + err)
					return res.status(204).send({
						status: 204,
						mensaje: "Error al guardar."
					})	
				});
			}else{
				const data2Save = {
					jsonAutoEvaluacion: req.body.evaluacion || "",
					fechaAutoEvaluacion: db.sequelize.literal('CURRENT_TIMESTAMP')
				};

				if(progReducido === 1){
					data2Save['reto'] = 1
				}

				db.pu_usuario_actividad.update( data2Save, { where: { id: data.id } })
				.then(function(response){ 
					if(response == 1){
						return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
							status:200,
							data,
							mensaje:"Guardado con éxito"
						})
						// return res.status(200).send({
						// 	status:200,
						// 	mensaje:"Guardado con éxito."
						// })
					}else{
						return res.status(204).send({
							status:204,
							mensaje: "Error al actualizar."
						})
					}
				})
				.catch(err => {
					logger.error( err )
					return res.status(204).send({
						status: 204,
						mensaje:"Error al actualizar",
						err	
					})	
				})
			}
		})
		.catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje: "Error al guardar."
			})	
		})

	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje: "Error al guardar."
		})	
	})
	//--
}

let guarda_evaluacion_par = (req, res)=> {
	db.revisionReto.findOne({ where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje: "Error al guardar."
			})	
		}else{
			const data2Save = {
				jsonEvaluacion: req.body.evaluacion || "",
				promedioReto: req.body.promedioReto || 0
			};
			db.revisionReto.update( data2Save, { where: { id: data.id } })
			.then( async function(response){ 

				if(req.params.id > 0 && req.auth.id > 0){
					let query = "SELECT COUNT( IF(COALESCE( pu.archivoReto,'') <> '' AND COALESCE( rr.jsonEvaluacion,'') = '', 1, NULL)) totalRetosSinEvaluar, COUNT(1) totalRetos \
									FROM PU_Usuario_Actividads pu \
									LEFT JOIN RevisionRetos rr ON pu.id = rr.reto \
									WHERE \
									rr.usuarioRevision = " + req.auth.id + " AND \
									pu.programaUnidad = (SELECT programaUnidad FROM PU_Usuario_Actividads WHERE id = (SELECT reto FROM RevisionRetos WHERE id IN ( " + req.params.id + " ) ));"
					const [Result] = await db.sequelize.query( query )

					if( Result[0].totalRetosSinEvaluar === 0 ){
						const [Result_pu] = await db.sequelize.query( "SELECT id FROM PU_Usuario_Actividads WHERE usuario = " + req.auth.id + " AND programaUnidad = (SELECT programaUnidad FROM PU_Usuario_Actividads WHERE id = (SELECT reto FROM RevisionRetos WHERE id IN ( " + req.params.id + " ) ));" )
						db.pu_usuario_actividad.update( {reto: 1}, { where: { id: Result_pu[0].id } })
						.then( function(r){ 
							
						})
						.catch( e => {
							logger.error( e )
						})
					}
					if( Result[0].totalRetosSinEvaluar === 0 && Result[0].totalRetos === 3){
						// Asignamos insignia extra
					}
				}

				if(response == 1){
					return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
						status:200,
						mensaje:"Guardado con éxito."
					})
				}else{
					return res.status(204).send({
						status:204,
						mensaje: "Error al actualizar."
					})
				}
			})
			.catch(err => {
				logger.error( err )
				return res.status(204).send({
					status: 204,
					mensaje:"Error al actualizar",
					err	
				})	
			})
		}
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje: "Error al guardar."
		})	
	})
}

let reto_descargado_par = (req, res)=> {
	db.revisionReto.findOne({ where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje: "Error al guardar."
			})	
		}else{
			const data2Save = {
				retoDescargado: req.body.retoDescargado || 0
			};
			db.revisionReto.update( data2Save, { where: { id: data.id } })
			.then( async function(response){ 

				if(response == 1){
					return res.status(200).send({
						status:200,
						mensaje: "Actualizado con exito."
					})
				}else{
					return res.status(204).send({
						status:204,
						mensaje: "Error al actualizar."
					})
				}
			})
			.catch(err => {
				logger.error( err )
				return res.status(204).send({
					status: 204,
					mensaje:"Error al actualizar",
					err	
				})	
			})
		}
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje: "Error al guardar."
		})	
	})
}

let getPreguntas = (req, res)=> {
	
	let id_actividad = req.params.id_actividad;

	db.grupoUsuarios.findOne({ where: { usuario: req.auth.id } })
	.then(function (dataG) {
		/*db.preguntas.findAll({nest: true, attributes: ['id', 'pregunta', 'fecha', 'usuario'], where: {visible: true,actividad: parseInt(id_actividad)}, order: [['id', 'DESC'], [db.respuestas, 'id', 'DESC']],
			include: [
				{model: db.respuestas, required: false, attributes: ['id', 'respuesta', 'fecha', 'usuario'], where: {visible: true}, order: [['id', 'DESC']], 
					include: [{model: db.likes, required: false, attributes: ['id', 'fecha', 'usuario'], where: {visible: true}},
					{model: db.usuarios, required: true, attributes: ['id', 'nombre','foto','apellido_paterno', 'apellido_materno'],
						include: [{
							model: db.grupos, required: true,attributes: [], where: {id: dataG.grupo}, include: [{
								model: db.programas,required: true, attributes: [], where: {perfil: req.auth.perfil}
							}]
						}]
					}]
			},{model: db.likes, required: false, attributes: ['id', 'fecha','usuario'], where: {visible: true}},
			{
				model: db.usuarios, required: true, attributes: ['id', 'nombre', 'apellido_paterno', 'apellido_materno', 'foto'],
					include: [{
						model: db.grupos,required: true,attributes: [], where: {id: dataG.grupo}, include: [{
							model: db.programas,required: true, attributes: [], where: {perfil: req.auth.perfil}
						}]
					}]
			}]
		})*/
		db.preguntas.findAll({nest: true, attributes: ['id', 'pregunta', 'fecha', 'usuario'], where: { [Op.and]:[{visible: true}, {actividad: parseInt(id_actividad)}, {grupo:parseInt(dataG.grupo)}]}, order: [['id', 'DESC'], [db.respuestas, 'id', 'DESC']],
			include: [{model: db.respuestas, required: false, attributes: ['id', 'respuesta', 'fecha', 'usuario'], where: {visible: true}, order: [['id', 'DESC']], 
				include: [
					{model: db.likes, required: false, attributes: ['id', 'fecha', 'usuario'], where: {visible: true}},
					{model: db.usuarios, required: true, attributes: ['id', 'nombre','foto','apellido_paterno', 'apellido_materno']}
				]
			},
			{
				model: db.likes, required: false, attributes: ['id', 'fecha','usuario'], where: {visible: true}
			},
			{
				model: db.usuarios, required: true, attributes: ['id', 'nombre', 'apellido_paterno', 'apellido_materno', 'foto'],
			}]
		})
		.then(function (response) {
			return res.status(200).send({
				status: 200,
				mensaje: "OK",
				social_data: response
			})
		})
		.catch(err => {
			logger.error( err )
			return res.status(204).send({
				status: 204,
				mensaje:"Error al obtener preguntas.",
				err	
			})
		})
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status: 204,
			mensaje:"Error al obtener preguntas.",
			err	
		})
	})


}

let agregaPregunta = (req, res)=> {

	let id_actividad = req.params.id_actividad
	let body = req.body

	if (!req.body.pregunta ||
		!id_actividad) {
		return res.status(204).send({
			status: 204,
			message: "Error al agregar pregunta."
		})
	}

	db.grupoUsuarios.findOne({ where: { usuario: req.auth.id } })
	.then(function (data) {
		if (!data) {
			logger.error( "No se encontro grupo." )
			return res.status(204).send({status: 204,mensaje:"No se encontro grupo."})	
		}else{
			const data2Create = {
				pregunta: 		body.pregunta,
				grupo: 			data.grupo,
				usuario: 		req.auth.id,
				actividad: 		id_actividad,
				fecha: 			db.sequelize.literal('CURRENT_TIMESTAMP')
			};
			db.preguntas.create(data2Create)
			.then(dataC => {
				db.preguntasUsuarios.create({pregunta: dataC.id, usuario: req.auth.id})
				.then(data => {
					return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
						status:200,
						dataC,
						mensaje:"Pregunta se ha agregado con éxito"
					})
				})
				.catch(err => {
					logger.info( err )
					return res.status(204).send({
						status:204,
						mensaje: "Error al agregar pregunta."
					})	
				});
			})
			.catch(err => {
				logger.info( err )
				return res.status(204).send({
					status:204,
					mensaje: "Error al agregar pregunta."
				})	
			});
		}
	})
	.catch(err => {
		console.log(err);
		return res.status(204).send({status:204,mensaje:"Error al agregar pregunta."})
	})
}

let actualizaPregunta = (req, res)=> {

	let id_pregunta = req.params.id
	let body = req.body

	if (!req.body.pregunta ||
		!id_pregunta) {
		return res.status(204).send({
			status: 204,
			message: "Error al agregar pregunta."
		})
	}

	db.grupoUsuarios.findOne({ where: { usuario: req.auth.id } })
	.then(function (data) {
		if (!data) {
			logger.error( "No se encontro grupo." )
			return res.status(204).send({status: 204,mensaje:"No se encontro grupo."})	
		}else{
			const data2Update = {
				pregunta: 		body.pregunta
			};
			db.preguntas.update(data2Update, {where: {id: id_pregunta, usuario: req.auth.id}})
			.then(dataC => {
				if(dataC == 1){
					return res.status(200).send({
						status:200,
						mensaje:"Pregunta actualizada"
					})
				}else{
					return res.status(403).send({
						status:403,
						mensaje: "Error al actualizar pregunta."
					})	
				}
			})
			.catch(err => {
				logger.info( err )
				return res.status(403).send({
					status:403,
					mensaje: "Error al actualizar pregunta."
				})	
			});
		}
	})
	.catch(err => {
		console.log(err);
		return res.status(403).send({status:403,mensaje:"Error al actualizar pregunta."})
	})
}

let eliminarPregunta = (req, res)=> {
	let id_pregunta = req.params.id
	db.preguntas.destroy({where: {id: id_pregunta, usuario: req.auth.id}})
	.then(dataLikeD => {
		db.preguntasUsuarios.destroy({where: {pregunta: id_pregunta, usuario: req.auth.id}})
		.then(destroyData => {
			return res.status(200).send({
				status:200,
				mensaje:"Pregunta eliminada"
			})
		})
		.catch( err => {
			logger.info( err )
			return res.status(204).send({
				status:204,
				mensaje: "Error al eliminar pregunta."
			})
		})
	})
	.catch(err => { 
		logger.info( err )
		return res.status(204).send({
			status:204,
			mensaje: "Error al eliminar pregunta."
		})
	})
}

let agregaRespuesta = (req, res)=> {
	let id_pregunta = req.params.id_pregunta
	let body = req.body

	if (!req.body.respuesta ||
		!id_pregunta) {
		return res.status(204).send({
			status: 204,
			message: "Error al agregar pregunta."
		})
	}

	db.grupoUsuarios.findOne({ where: { usuario: req.auth.id } })
	.then(function (data) {
		if (!data) {
			logger.error( "No se encontro grupo." )
			return res.status(204).send({status: 204,mensaje:"No se encontro grupo."})	
		}else{
			const data2Create = {
				respuesta: 		body.respuesta,
				usuario: 		req.auth.id,
				pregunta: 		id_pregunta,
				fecha: 			db.sequelize.literal('CURRENT_TIMESTAMP')
			};
			db.respuestas.create(data2Create)
			.then(data => {
				db.preguntasRespuestas.create({pregunta: id_pregunta, respuesta: data.id})
				.then(data => {
					db.respuestasUsuarios.create({respuesta: data.id, usuario: req.auth.id})
					.then(data => {
						//--Creamos notificacion al usuario de la pregunta
						
						db.preguntas.findOne({where: {id: id_pregunta}})
						.then(dataPregunta =>{
							db.actividadesModulo.findOne({where: {id: dataPregunta.actividad}})
							.then(dataAct => {
								extraData = {
									id_act: 	dataAct.id,
									tipo_act: 	dataAct.tipo,
									nombre_act:	dataAct.nombre,
									unidad: 	body.unidad || 0,
									modulo: 	body.modulo || 0
								}
								db.notificaciones.create({
									usuario: dataPregunta.usuario, 
									pregunta: id_pregunta, 
									data: JSON.stringify(extraData),
									visto: 0,
									tipo: 1})
								.then(notificationCreate => {
									db.notificacionesUsuario.create({
										notificacion: notificationCreate.id,
										usuario: req.auth.id
									})
									.then(notificationCreate => {

									})
								})
								.catch( err => {
									logger.error( err )
								})	
							})
						})
						//--END: Creamos notificacion al usuario de la pregunta
						return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
							status:200,
							mensaje:"Respuesta se ha agregado con éxito"
						})
					})
					.catch(err => {
						logger.info( err )
						return res.status(204).send({
							status:204,
							mensaje: "Error al agregar pregunta."
						})	
					});
				})
				.catch( err => {
					logger.info( err )
					return res.status(204).send({
						status:204,
						mensaje: "Error al agregar respuesta."
					})
				})
			})
			.catch(err => {
				logger.info( err )
				return res.status(204).send({
					status:204,
					mensaje: "Error al agregar respuesta."
				})	
			});
		}
	})
	.catch(err => {
		console.log(err);
		return res.status(204).send({status:204,mensaje:"Error al agregar respuesta."})
	})
}

let actualizaRespuesta = (req, res)=> {

	let id_respuesta = req.params.id
	let body = req.body

	if (!req.body.respuesta ||
		!id_respuesta) {
		return res.status(204).send({
			status: 204,
			message: "Error al acgualizar respuesta."
		})
	}

	db.grupoUsuarios.findOne({ where: { usuario: req.auth.id } })
	.then(function (data) {
		if (!data) {
			logger.error( "No se encontro grupo." )
			return res.status(204).send({status: 204,mensaje:"No se encontro grupo."})	
		}else{
			const data2Update = {
				respuesta: 		body.respuesta
			};
			db.respuestas.update(data2Update, {where: {id: id_respuesta, usuario: req.auth.id}})
			.then(dataC => {
				if(dataC == 1){
					return res.status(200).send({
						status:200,
						mensaje:"Respuesta actualizada"
					})
				}else{
					return res.status(403).send({
						status:403,
						mensaje: "Error al actualizar respuesta."
					})	
				}
			})
			.catch(err => {
				logger.info( err )
				return res.status(403).send({
					status:403,
					mensaje: "Error al actualizar pregunta."
				})	
			});
		}
	})
	.catch(err => {
		console.log(err);
		return res.status(403).send({status:403,mensaje:"Error al actualizar pregunta."})
	})
}

let eliminarRespuesta = (req, res)=> {
	let id_respuesta = req.params.id
	db.respuestas.destroy({where: {id: id_respuesta, usuario: req.auth.id}})
	.then(dataLikeD => {
		db.respuestasUsuarios.destroy({where: {respuesta: id_respuesta, usuario: req.auth.id}})
		.then(destroyData => {
			return res.status(200).send({
				status:200,
				mensaje:"Respuesta eliminada"
			})
		})
		.catch( err => {
			logger.info( err )
			return res.status(204).send({
				status:204,
				mensaje: "Error al eliminar respuesta."
			})
		})
	})
	.catch(err => { 
		logger.info( err )
		return res.status(204).send({
			status:204,
			mensaje: "Error al eliminar respuesta."
		})
	})
}

let likePregunta = (req, res)=> {
	logger.info( " 1. " + req.auth.id + " " );
	let id_pregunta = req.params.id_pregunta
	logger.info( " 2. " + req.auth.id + " " );
	if (!id_pregunta) {
		return res.status(204).send({
			status: 204,
			message: "Error al dar like a pregunta."
		})
	}
	logger.info( " 3. " + req.auth.id + " " );
	db.grupoUsuarios.findOne({ where: { usuario: req.auth.id } })
	.then(function (data) {
		if (!data) {
			logger.info( " 4. " + req.auth.id + " " );
			logger.error( "No se encontro grupo." )
			return res.status(204).send({status: 204,mensaje:"No se encontro grupo."})	
		}else{
			logger.info( " 5. " + req.auth.id + " " );
			db.likes.findOne({ where: { usuario: req.auth.id, pregunta: id_pregunta } })
			.then(function (dataLike) {
				logger.info( " 6. " + req.auth.id + " " );
				if(!dataLike){
					logger.info( " 7. " + req.auth.id + " " );
					const data2Create = {
						usuario: 		req.auth.id,
						pregunta: 		id_pregunta,
						fecha: 			db.sequelize.literal('CURRENT_TIMESTAMP')
					};
					db.likes.create(data2Create)
					.then(data => {
						db.preguntasLikes.create({pregunta: id_pregunta, like: data.id})
						.then(data => {
							return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
								status:200,
								mensaje:"Like se ha agregado con exito"
							})
						})
						.catch( err => {
							logger.info( err )
							return res.status(204).send({
								status:204,
								mensaje: "Error al agregar like."
							})
						})
					})
					.catch(err => {
						logger.info( err )
						return res.status(204).send({
							status:204,
							mensaje: "Error al agregar like."
						})	
					});
				}else{
					logger.info( " 8. " + req.auth.id + " " );
					db.likes.destroy({where: {id: dataLike.id}})
					.then(dataLikeD => {
						db.preguntasLikes.destroy({where: {pregunta: id_pregunta, like: dataLike.id}})
						.then(destroyData => {
							logger.info( " 9. " + req.auth.id + " " );
							return res.status(200).send({
								status:200,
								mensaje:"Like se ha eliminado con exito"
							})
						})
						.catch( err => {
							logger.info( " 10. " + req.auth.id + " " );
							logger.info( err )
							return res.status(204).send({
								status:204,
								mensaje: "Error al eliminar like."
							})
						})
					})
					.catch(err => { 
						logger.info( err )
						return res.status(204).send({
							status:204,
							mensaje: "Error al eliminar like."
						})
					})
				}
			})
			.catch(err => {
				logger.info( err )
				return res.status(204).send({
					status:204,
					mensaje: "Error al agregar like."
				})	
			});
		}
	})
	.catch(err => {
		console.log(err);
		return res.status(204).send({status:204,mensaje:"Error al agregar like."})
	})
}

let likeRespuesta = (req, res)=> {
	let id_respuesta = req.params.id_respuesta

	if (!id_respuesta) {
		return res.status(204).send({
			status: 204,
			message: "Error al dar like a la respuesta."
		})
	}

	db.grupoUsuarios.findOne({ where: { usuario: req.auth.id } })
	.then(function (data) {
		if (!data) {
			logger.error( "No se encontro grupo." )
			return res.status(204).send({status: 204,mensaje:"No se encontro grupo."})	
		}else{
			db.likes.findOne({ where: { usuario: req.auth.id, respuesta: id_respuesta } })
			.then(function (dataLike) {
				if(!dataLike){
					const data2Create = {
						usuario: 		req.auth.id,
						respuesta: 		id_respuesta,
						fecha: 			db.sequelize.literal('CURRENT_TIMESTAMP')
					};
					db.likes.create(data2Create)
					.then(data => {
						db.respuestasLikes.create({respuesta: id_respuesta, like: data.id})
						.then(data => {
							return serviceInsignias.obtieneInsignia(req, res, 'actividad', 200, {
								status:200,
								mensaje:"Like se ha agregado con exito"
							})
							// return res.status(200).send({
							// 	status:200,
							// 	mensaje:"Like se ha agregado con exito"
							// })
						})
						.catch( err => {
							logger.info( err )
							return res.status(204).send({
								status:204,
								mensaje: "Error al agregar like."
							})
						})
					})
					.catch(err => {
						logger.info( err )
						return res.status(204).send({
							status:204,
							mensaje: "Error al agregar like."
						})	
					});
				}else{
					db.likes.destroy({where: {id: dataLike.id}})
					.then(dataLikeD => {
						db.respuestasLikes.destroy({where: {respuesta: id_respuesta, like: dataLike.id}})
						.then(destroyData => {
							return res.status(200).send({
								status:200,
								mensaje:"Like se ha eliminado con exito"
							})
						})
						.catch( err => {
							logger.info( err )
							return res.status(204).send({
								status:204,
								mensaje: "Error al eliminar like."
							})
						})
					})
					.catch(err => { 
						logger.info( err )
						return res.status(204).send({
							status:204,
							mensaje: "Error al eliminar like."
						})
					})
				}
			})
			.catch(err => {
				logger.info( err )
				return res.status(204).send({
					status:204,
					mensaje: "Error al agregar like."
				})	
			});
		}
	})
	.catch(err => {
		console.log(err);
		return res.status(204).send({status:204,mensaje:"Error al agregar like."})
	})
}

module.exports = {
	crear,
	leer,
	leer_id,
	actualizar,
	eliminar,
	preCreate,
	actividadesModulo,
	asignaModulo,
	desasignaModulo,
	actividades_no_pertenecen_modulo,
	getActividadesUnidad,
	getModulosActividadesUnidad,
	actualizaOrden,
	termina_actividad,
	guarda_usuario_actividad,
	getPreguntas,
	agregaPregunta,
	actualizaPregunta,
	eliminarPregunta,
	actualizaRespuesta,
	eliminarRespuesta,
	agregaRespuesta,
	likePregunta,
	likeRespuesta,
	guarda_reto_usuario,
	guarda_autoevaluacion,
	guarda_encuesta_satisfaccion,
	guarda_evaluacion_unidad,
	reto_descargado,
	caso_descargado,
	guarda_evaluacion_par,
	rank_actividad,
	toolkit_descargado,
	reto_descargado_par
}