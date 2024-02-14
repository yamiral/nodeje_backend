const db = require("../modelos");
const _ = require("lodash");
const Model = db.perfiles;
const Op = db.Sequelize.Op;

let preCreate = (req, res) =>{
	const keys = Object.keys(Model.rawAttributes);
	const empty = {};
	keys.forEach(v => empty[v]="")
	res.status(200).send({
		status: 200,
		message: "Perfiles.",
		perfil: _.omit(empty,["createdAt", "updatedAt", "activo"]),
		struct: _.omit(empty,["createdAt", "updatedAt", "activo"])
	});
}

let crear = (req, res)=>{
	let body = req.body;

	if (!req.body.perfil) {
		res.status(204).send({
			status: 204,
			message: "Error al crear perfil."
		});
		return;
	}
	
	const data2Create = {
		perfil: body.perfil
	};
	
	Model.create(data2Create)
		.then(data => {
			res.status(200).send({
				status:200,
				data,
				mensaje:"El perfil ha sido creado con éxito"
			})
		})
		.catch(err => {
			res.status(204).send({
				status:204,
				mensaje: "Error al crear perfil."
			})	
		});
}

let leer_id = (req, res) =>{
	Model.findOne({ attributes: { exclude: ["createdAt", "updatedAt", "activo"] }, where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al obtener perfil."
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
			mensaje:"Error al obtener perfil.",
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
					perfil: { [Op.like] : '%'+req.query.search+'%' }
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
			mensaje: "Error al obtener perfil."
		})	
	}) 
}

let actualizar = (req, res)=>{
	Model.findOne({ where: { id: req.params.id } })
	.then(function (data) {
		
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al actualizar perfil."
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
					mensaje: "Error al actualizar perfil."
				})
			}
		})
	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje:"Error al actualizar perfil.",
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
				mensaje:"No se pudo eliminar el perfil."
			})	
		}

		const data2Update = { 'activo': 0 }

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
					mensaje: "Error al eliminar perfil."
				})
			}
		})
	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje:"Error al eliminar perfil.",
			err	
		})
	})
}

module.exports = {
	crear,
	leer,
	leer_id,
	actualizar,
	eliminar,
	preCreate
}