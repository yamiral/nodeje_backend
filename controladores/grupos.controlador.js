const { grupoProgramas } = require('../modelos');
const db = require("../modelos");
const _ = require("lodash");
const logger = require('../config/logger');
const Model = db.grupos;
const GrupoUsuarios = db.grupoUsuarios;
const GrupoProgramas = db.grupoProgramas;
const Op = db.Sequelize.Op;

let preCreate = (req, res) =>{
	const keys = Object.keys(Model.rawAttributes);
	const empty = {};
	keys.forEach(v => empty[v]="")
	res.status(200).send({
		status: 200,
		message: "Grupos.",
		grupo: _.omit(empty,["createdAt", "updatedAt","activo"]),
		struct: _.omit(empty,["createdAt", "updatedAt","activo"])
	});
}

let crear = (req, res)=>{
	let body = req.body;

	if (!req.body.nombre) {
		return res.status(204).send({status: 204,message: "Error al crear grupo."});
	}
	
	Model.create({nombre: body.nombre})
	.then(data => {
		return res.status(200).send({status:200,mensaje:"El grupo ha sido creado con éxito."})
	})
	.catch(err => {
		console.log(err)
		return res.status(204).send({status:204,mensaje: "Error al crear grupo."})	
	});
}

let leer_id = (req, res) =>{
	Model.findOne({ attributes: { exclude: ["createdAt", "updatedAt","activo"] }, where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({status: 204,mensaje:"Error al obtener grupo."})	
		}
		return res.status(200).send({status:200,mensaje: "Grupo obtenido correctamente", data})
	})
	.catch(err => {
		console.log(err)
		return res.status(204).send({status:204,mensaje:"Error al obtener grupo."})
	});
}

let leer = (req, res)=>{
	const limit = parseInt(req.query.limit) || 10;
	const offset = parseInt(req.query.offset) || 0;
	var attr = {
		offset, 
		limit, 
		attributes: { exclude: ["updatedAt"] }
	}
	if(req.query.search && req.query.search != ''){
		attr = {
			...attr,
			where: {
				[Op.or]: {
					nombre: { [Op.like] : '%'+req.query.search+'%' }
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
		return res.status(200).send({rows: result.rows,total: result.count})
	})
	.catch(err => {
		console.log(err)
		return res.status(204).send({status:204,mensaje: "Error al obtener Grupo."})	
	}) 
}

let actualizar = (req, res)=>{
	Model.findOne({ where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({status: 204,mensaje:"Error al actualizar grupo."})	
		}
		Model.update({ ...req.body }, { where: { id: req.params.id } })
		.then(function(response){ 
			if(response == 1){
				return res.status(200).send({status:200,mensaje: "Grupo actualizado correctamente."})
			}else{
				return res.status(204).send({status:204,mensaje: "Error al actualizar grupo."})
			}
		})
	})
	.catch(err => {
		console.log(err)
		return res.status(204).send({status:204,mensaje:"Error al actualizar grupo"})
	})
}

let eliminar = (req, res)=>{
	Model.findOne({ where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({status: 204,mensaje:"No se pudo eliminar el grupo."})	
		}
		Model.update({ 'activo': !data.activo }, { where: { id: req.params.id } })
		.then(function(response){ 
			if(response == 1){
				return res.status(200).send({status:200,mensaje:"Grupo eliminado correctamente."})
			}else{
				return res.status(204).send({status:204,mensaje:"Error al eliminar grupo."})
			}
		})
	})
	.catch(err => {
		console.log(err);
		return res.status(204).send({status:204,mensaje:"Error al eliminar grupo"})
	})
}

let asignaUsuario = (req, res)=>{
	let body = req.body;
	Model.findOne({ where: { id: body.grupo } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({status: 204,mensaje:"Grupo no existe."})	
		}
		GrupoUsuarios.findOne({ where: { grupo: body.grupo, usuario: body.usuario } })
		.then(function (existe) {
			if (!existe) {
				GrupoUsuarios.create({grupo: body.grupo, usuario: body.usuario})
				.then(data => {
					return res.status(200).send({status:200,mensaje:"Asignación realizada correctamente"})
				})
				.catch(err => {
					console.log(err);
					return res.status(204).send({status:204,mensaje: "Error al crear relación."})	
				});
			}else{
				return res.status(204).send({status:204,mensaje: "La relación ya existe."})	
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
}

let desasignaUsuario = (req, res)=>{
	let body = req.body;
	GrupoUsuarios.findOne({ where: { grupo: body.grupo, usuario: body.usuario } })
	.then(function (existe) {
		if (!existe) {
			return res.status(200).send({status:200,mensaje:"No existe la relación"})
		}
		GrupoUsuarios.destroy({ where: { grupo: body.grupo, usuario: body.usuario } })
		.then(deleted => { return res.status(200).send({status:200, mensaje: "Relación eliminada correctamente."}) })
		.catch(err => { return res.status(204).send({status:204, mensaje: "Error al eliminar la relacion."}) })
	})
	.catch(err => {
		console.log(err);
		return res.status(204).send({status:204,mensaje: "Error al eliminar relación."})	
	})
	.catch(err => {
		console.log(err);
		return res.status(204).send({status: 204,mensaje:"Error al eliminar relación"})
	})
}

let asignaPrograma = (req, res)=>{
	let body = req.body;
	Model.findOne({ where: { id: body.grupo } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({status: 204,mensaje:"Grupo no existe."})	
		}
		grupoProgramas.findOne({ where: { grupo: body.grupo, programa: body.programa } })
		.then(function (existe) {
			if (!existe) {
				grupoProgramas.create({grupo: body.grupo, programa: body.programa})
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

let desasignaPrograma = (req, res)=>{
	let body = req.body;
	GrupoProgramas.findOne({ where: { grupo: body.grupo, programa: body.programa } })
	.then(function (existe) {
		if (!existe) {
			return res.status(204).send({status:204,mensaje:"No existe la relación."})
		}
		GrupoProgramas.destroy({ where: { grupo: body.grupo, programa: body.programa } })
		.then(deleted => { return res.status(200).send({status:200, mensaje: "Relación eliminada correctamente."}) })
		.catch(err => { return res.status(204).send({status:204, mensaje: "Error al eliminar la relacion."}) })
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

let asignaParesRevision = (req, res)=>{

	let body = req.body
	let id_grupo = body.grupo

	db.grupos.findAll({raw: true, nest: true, where: {activo: true, id: id_grupo}, attributes: ['id','nombre'],
		include: [
			{
				model: db.programas, required: true, attributes: ['id','nombre','perfil'],
				include: [
					{
						model: db.unidades, required: true
					}
				]
			},
			{
				model: db.usuarios, required: true, attributes: ['id','nombre','perfil'], where: {activo: true}
			}
		]
	})
	.then(function (response) {
			if(response.length <= 0){
				return res.status(204).send({status: 204,mensaje:"NOK"})
			}else{
				let usuarios_programa = {}
				let configuracion = response.map(configuracion => ({
					grupo: configuracion.id,
					usuario: configuracion.Usuarios.id,
					perfilPrograma: configuracion.Programas.perfil,
					perfilUsuario: configuracion.Usuarios.perfil,
					pu: configuracion.Programas.Unidades.ProgramaUnidades.id
				}))
				configuracion.forEach( c => {
					if(usuarios_programa[c.pu] === undefined){
						usuarios_programa[c.pu] = {}
						usuarios_programa[c.pu]['usuarios'] = []
						usuarios_programa[c.pu]['pares1'] = []
						usuarios_programa[c.pu]['pares2'] = []
						usuarios_programa[c.pu]['extra'] = []
					}
					if(c.perfilPrograma === c.perfilUsuario){
						usuarios_programa[c.pu]['usuarios'].push(c.usuario)
						usuarios_programa[c.pu]['pares1'].push( usuarios_programa[c.pu]['usuarios'].length )
						usuarios_programa[c.pu]['usuarios'].sort( () => .5 - Math.random() )
					}
				})
				Object.keys(usuarios_programa).forEach(function (key){
					usuarios_programa[key]['pares1'].push( usuarios_programa[key]['pares1'].shift() )
					usuarios_programa[key]['pares2'] = [...usuarios_programa[key]['pares1']]
					usuarios_programa[key]['pares2'].push( usuarios_programa[key]['pares2'].shift() )
					usuarios_programa[key]['extra'] = [...usuarios_programa[key]['pares2']]
					usuarios_programa[key]['extra'].push( usuarios_programa[key]['extra'].shift() )
				});
				let configuracion_final = [];
				Object.keys(usuarios_programa).forEach(function (key){
					usuarios_programa[key]['usuarios'].forEach( (el, idx, arr) => {
						configuracion_final.push({
							pu: key, 
							usuario: usuarios_programa[key]['usuarios'][idx], 
							par1: usuarios_programa[key]['usuarios'][usuarios_programa[key]['pares1'][idx]-1],
							par2: usuarios_programa[key]['usuarios'][usuarios_programa[key]['pares2'][idx]-1],
							extra: usuarios_programa[key]['usuarios'][usuarios_programa[key]['extra'][idx]-1]
						})
					})
				});
				let promises = configuracion_final.map( conf => {
					return db.pu_usuario_actividad.findOne({ where: { programaUnidad: conf.pu, usuario: conf.usuario } })
					.then(function (usuarioActividad) {
							if (!usuarioActividad) {
									conf.pu_usr_act = 0
									return "No existe! Crear!";
							}else{
									conf.pu_usr_act = usuarioActividad.id
									return "Ya existe"
							}
					})
					.catch(err => {
							logger.error( err )
					})
				})
				Promise.all( promises )
				.then(( response_promises ) => {
					let promises_pu_usr_act = configuracion_final.map( conf => {
						if(conf.pu_usr_act !== 0) return "OK"
						const data2Create = {
							programaUnidad: 	conf.pu,
							usuario: 			conf.usuario,
							caso:				0,
							reto:				0,
							encuesta:			0,
							jsonAutoEvaluacion: ""
						};
						return db.pu_usuario_actividad.create(data2Create)
						.then(data => {
							conf.pu_usr_act = data.id
							return "OK"
						})
						.catch(err => {
							logger.error( err )
						})
					})
	
					Promise.all( promises_pu_usr_act )
					.then(( response_pu_usr_act ) => {
						let promises_rev_reto = configuracion_final.map( conf => {
							return db.revisionReto.findOne({ where: { reto: conf.pu_usr_act } })
							.then(function (revReto) {
									if (!revReto) {
										conf.revReto = 0
										return "OK";
									}else{
										if(revReto.jsonAutoEvaluacion !== undefined && revReto.jsonAutoEvaluacion !== ""){
											conf.revReto = 1
										}else{
											conf.revReto = 0
										}
										
										return "NOK"
									}
							})
							.catch(err => {
								logger.error( err )
							})
						})

						Promise.all( promises_rev_reto )
						.then(( response_rev_reto) => {
							let puede_seguir = true
							configuracion_final.map( conf => {
								if(conf.revReto == 1){
									puede_seguir = false
								}
							})
							if(!puede_seguir){
								return res.status(204).send({status: 204,mensaje:"NOK"})
							}else{
								let promises_del_rev_reto = configuracion_final.map( conf => {
									return db.revisionReto.destroy({ where: { reto: conf.pu_usr_act } })
									.then(function (revReto) {
											return "OK"
									})
									.catch(err => {
										logger.error( err )
									})
								})
								Promise.all( promises_del_rev_reto )
								.then(( response_del_rev_reto) => {
									let promises_add_rev_reto = configuracion_final.map( conf => {
										return db.revisionReto.bulkCreate([
											{reto: conf.pu_usr_act, usuarioRevision: conf.par1, extra: 0},
											{reto: conf.pu_usr_act, usuarioRevision: conf.par2, extra: 0},
											{reto: conf.pu_usr_act, usuarioRevision: conf.extra, extra: 1}
										])
										.then(function (addRevReto) {
												return "OK"
										})
										.catch(err => {
											logger.error( err )
										})
									})
									Promise.all( promises_add_rev_reto )
									.then(( response_add_rev_reto) => {
										return res.status(200).send({status: 200,mensaje:"OK"})
									})
								})
							}
						})
					})
				})
			}
	})
	.catch(err => {
			logger.error( err )
	})
	

}

module.exports = {
	crear,
	leer,
	leer_id,
	actualizar,
	eliminar,
	asignaUsuario,
	desasignaUsuario,
	asignaPrograma,
	desasignaPrograma,
	preCreate,
	asignaParesRevision
}