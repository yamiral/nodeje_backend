const db = require("../modelos");
const _ = require("lodash");
const logger = require("../config/logger");
const Model = db.programas;
const ProgramaUnidades = db.programaUnidades;
const GrupoProgramas = db.grupoProgramas;
const Op = db.Sequelize.Op;

let preCreate = (req, res) =>{
	const keys = Object.keys(Model.rawAttributes);
	const empty = {};
	keys.forEach(v => empty[v]="")
	res.status(200).send({
		status: 200,
		message: "Programas.",
		programa: _.omit(empty,["createdAt", "updatedAt", "activo"]),
		struct: _.omit(empty,["createdAt", "updatedAt", "activo"])
	});
}

let crear = (req, res)=>{
	let body = req.body;

	if (!req.body.nombre||
		!req.body.descripcionPrograma) {
		res.status(204).send({
			status: 204,
			message: "Error al crear programa."
		});
		return;
	}
	
	const data2Create = {
		nombre: 		        body.nombre,
		descripcionPrograma: 	body.descripcionPrograma,
		perfil:					body.perfil || 0
	};
	
	Model.create(data2Create)
		.then(data => {
			res.status(200).send({
				status:200,
				data,
				mensaje:"El progama ha sido creado con éxito"
			})
		})
		.catch(err => {
			res.status(204).send({
				status:204,
				mensaje: "Error al crear programa."
			})	
		});
}

let leer_id = (req, res) =>{
	Model.findOne({ attributes: { exclude: ["createdAt", "updatedAt", "activo"] }, where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al obtener programa."
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
			mensaje:"Error al obtener programa.",
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
					descripcionPrograma: { [Op.like] : '%'+req.query.search+'%' },
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
		let dict_perfiles = [];
		db.perfiles.findAll().then((perfiles)=>{
			perfiles.forEach( (p) => {
				dict_perfiles[p.id]=p.perfil
			})
			let rows = result.rows.map( u => ({
				...u.dataValues,
				perfil: dict_perfiles[u.perfil]
			}))
			res.status(200).send({
				rows: rows,
				total: result.count
			})
		})
	})
	.catch(err => {
		res.status(204).send({
			status:204,
			mensaje: "Error al obtener programa."
		})	
	}) 
}

let actualizar = (req, res)=>{
	Model.findOne({ where: { id: req.params.id } })
	.then(function (data) {
		
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al actualizar programa."
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
					mensaje: "Error al actualizar programa."
				})
			}
		})
	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje:"Error al actualizar programa",
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
				mensaje:"No se pudo eliminar el programa."
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
					mensaje: "Error al eliminar programa"
				})
			}
		})
	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje:"Error al eliminar programa",
			err	
		})
	})
}

let asignaUnidad = (req, res)=>{
	let body = req.body;
	Model.findOne({ where: { id: body.programa } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({status: 204,mensaje:"Programa no existe."})	
		}
		ProgramaUnidades.findOne({ where: { unidad: body.unidad, programa: body.programa } })
		.then(function (existe) {
			if (!existe) {
				ProgramaUnidades.create({unidad: body.unidad, programa: body.programa, fechaApertura: body.fechaApertura, orden: 999})
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

let desasignaUnidad = (req, res)=>{
	let body = req.body;
	ProgramaUnidades.findOne({ where: { unidad: body.unidad, programa: body.programa } })
	.then(function (existe) {
		if (!existe) {
			return res.status(204).send({status:204,mensaje:"No existe la relación."})
		}
		ProgramaUnidades.destroy({ where: { unidad: body.unidad, programa: body.programa } })
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

let programaGrupo = (req, res)=>{
	const limit = parseInt(req.query.limit) || 10;
	const offset = parseInt(req.query.offset) || 0;
	var attr = {
		offset, 
		limit, 
		attributes: { exclude: ["createdAt", "updatedAt", "activo"] }
	}
	if(req.query.search && req.query.search != ''){
		attr = {
			...attr,
			include: {model: db.grupos, where: {id: parseInt(req.params.id)}, required: true},
		}
	}else{
		attr = {
			...attr,
			include: {model: db.grupos, where: {id: parseInt(req.params.id)}, required: true},
		}
	}
	db.programas.findAndCountAll(attr).then((result)=>{
		res.status(200).send({
			rows: result.rows,
			total: result.count
		})
	})
	.catch(err => {
		res.status(204).send({
			status:204,
			mensaje: "Error al obtener programas del grupo.",
			err
		})	
	}) 
}

let programaUnidades = (req, res)=>{
	const limit = parseInt(req.query.limit) || 10;
	const offset = parseInt(req.query.offset) || 0;
	var attr = {
		offset, 
		limit, 
		// order: [[db.Sequelize.literal('`Programas.ProgramaUnidades.orden`'), 'ASC']],
		order: [[db.programas, db.programaUnidades, 'orden', 'ASC' ]],
		attributes: { exclude: ["createdAt", "updatedAt", "activo"] }
	}
	if(req.query.search && req.query.search != ''){
		attr = {
			...attr,
			include: {model: db.programas, where: {id: parseInt(req.params.id)}, required: true},
			where: {
				programa: parseInt(req.params.id)
			}
		}
	}else{
		attr = {
			...attr,
			include: {model: db.programas, where: {id: parseInt(req.params.id)}, required: true},
		}
	}
	db.unidades.findAndCountAll(attr).then((result)=>{
		res.status(200).send({
			rows: result.rows,
			total: result.count
		})
	})
	.catch(err => {
		logger.error( err )
		return res.status(204).send({
			status:204,
			mensaje: "Error al obtener unidades del programa.",
			err
		})	
	}) 
}

//Programas que no estan en un grupo
let programas_no_pertenecen_grupo = (req, res)=>{
	db.programas.findAll({raw: true, nest: true, attributes: ['id', 'nombre', 'descripcionPrograma'], where: {'$Grupos.id$': {[db.Sequelize.Op.is]: null}},
		include: [{model: db.grupos, as: 'Grupos', attributes: [], through: {attributes: []}, required: false, where: {id: req.params.id}}]
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

let asigna_programa_reducido = (req, res)=>{
	let body = req.body;
	if (!req.body.grupo||
		!req.body.programa||
		req.body.valor === undefined) {
			res.status(200).send({
				status: 204,
				message: "Error en datos."
			})
			return;
	}

	db.grupoProgramas.findOne({ where: { grupo: body.grupo, programa: body.programa } })
	.then(async function (existe) {
		if (!existe) {
			return res.status(200).send({status:200,mensaje: "No existe"})	
		}else{
			// Validaciones X
			const [Total] = await db.sequelize.query("SELECT COUNT(1) total FROM Grupos g \
			LEFT JOIN GrupoUsuarios gu ON gu.grupo = g.id \
			JOIN ActModChecks a ON a.usuario = gu.usuario \
			WHERE g.id = '"+body.grupo+"';")

			if(Total.length > 0){
				if(Total[0].total > 0){
					return res.status(200).send({status:204,mensaje: "Error usuarios ya iniciaron!!!!!!"})		
				}else{

					db.grupoProgramas.update({programaReducido: body.valor}, { where: { id: existe.id } })
					.then(function(response){ 
						if(response == 1){
							res.status(200).send({
								status:200,
								mensaje: "OK"
							})
						}else{
							res.status(200).send({
								status:204,
								mensaje: "Error al actualizar."
							})
						}
					})
					.catch(err => {
						return res.status(200).send({
							status: 204,
							mensaje:"Error al actualizar",
							err	
						})
					})
				}
			}else{
				return res.status(200).send({status:204,mensaje: "Error!!!!!!"})	
			}

			
		}
	})
	.catch(err => {
		console.log(err);
		return res.status(204).send({status: 204,mensaje:"Error al actualizar."})
	})
	

}


module.exports = {
	crear,
	leer,
	leer_id,
	actualizar,
	eliminar,
	asignaUnidad,
	desasignaUnidad,
	preCreate,
	programaGrupo,
	programaUnidades,
	programas_no_pertenecen_grupo,
	asigna_programa_reducido
}