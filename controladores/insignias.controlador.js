const db = require("../modelos");
const _ = require("lodash");
const logger = require('../config/logger');
const Op = db.Sequelize.Op;

let preCreate = (req, res) =>{
	const keys = Object.keys(db.insignias.rawAttributes);
	const empty = {};
	keys.forEach(v => empty[v]="")
	res.status(200).send({
		status: 200,
		message: "Insignias.",
		insignias: _.omit(empty,["createdAt", "updatedAt"]),
		struct: _.omit(empty,["createdAt", "updatedAt"])
	});
}

let crear = (req, res)=>{
	let body = req.body;

    if (!req.body.nombre||
		!req.body.descripcion||
        !req.body.imagen) {
		res.status(204).send({
			status: 204,
			message: "Error al crear insignia."
		});
		return;
	}
	
	const data2Create = {
		nombre: 				body.nombre,
		nombreNivel2: 			body.nombreNivel2 || "",
		nombreNivel3: 			body.nombreNivel3 || "",
		nombreNivel4: 			body.nombreNivel4 || "",
		descripcion: 			body.descripcion,
		descripcionModalN1: 	body.descripcionModalN1 || "",
		descripcionModalN2: 	body.descripcionModalN2 || "",
		descripcionModalN3: 	body.descripcionModalN3 || "",
		descripcionModalN4: 	body.descripcionModalN4 || "",
		llave_insignia: 		body.llave_insignia,
		imagen: 				body.imagen || "",
		imagenNivel2: 			body.imagenNivel2 || "",
		imagenNivel3: 			body.imagenNivel3 || "",
		imagenNivel4: 			body.imagenNivel4 || "",
		lottie: 				body.lottie || "",
		lottieNivel2: 			body.lottieNivel2 || "",
		lottieNivel3: 			body.lottieNivel3 || "",
		lottieNivel4: 			body.lottieNivel4 || "",
		categoria: 				body.categoria || "",
		orden: 					parseInt(body.orden) || 0,
		tipo: 					parseInt(body.tipo) || 1,
		jefe: 					parseInt(body.jefe) || 0,
		unidad: 				parseInt(body.unidad) || 0,
		programa: 				parseInt(body.progarma) || 0,
		
	};

	db.insignias.create(data2Create)
	.then(data => {
		return res.status(200).send({status:200,mensaje:"El insignia ha sido creado con éxito."})
	})
	.catch(err => {
		logger.error(err)
		return res.status(204).send({status:204,mensaje: "Error al crear insignia."})	
	});
}

let leer_id = (req, res) =>{
	db.insignias.findOne({ attributes: { exclude: ["createdAt", "updatedAt"] }, where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({status: 204,mensaje:"Error al obtener grupo."})	
		}
		return res.status(200).send({status:200,mensaje: "Insignia obtenido correctamente", data})
	})
	.catch(err => {
		logger.error(err)
		return res.status(204).send({status:204,mensaje:"Error al obtener insignia."})
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
					descripcion: { [Op.like] : '%'+req.query.search+'%' }
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
	db.insignias.findAndCountAll(attr).then((result)=>{
		return res.status(200).send({rows: result.rows,total: result.count})
	})
	.catch(err => {
		logger.error(err)
		return res.status(204).send({status:204,mensaje: "Error al obtener Insignias."})	
	}) 
}

let actualizar = (req, res)=>{

    const data2Update = { ...req.body }

    if(data2Update.unidad === ''){
        data2Update.unidad = null;
    }
	data2Update.orden = parseInt(data2Update.orden)
	data2Update.tipo = parseInt(data2Update.tipo)
	data2Update.jefe = parseInt(data2Update.jefe)

	db.insignias.findOne({ where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({status: 204,mensaje:"Error al actualizar insignia."})	
		}
		db.insignias.update(data2Update, { where: { id: req.params.id } })
		.then(function(response){ 
			if(response == 1){
				return res.status(200).send({status:200,mensaje: "Insignia actualizado correctamente."})
			}else{
				return res.status(204).send({status:204,mensaje: "Error al actualizar insignia."})
			}
		})
	})
	.catch(err => {
		logger.error(err)
		return res.status(204).send({status:204,mensaje:"Error al actualizar insignia"})
	})
}

let eliminar = (req, res)=>{
	db.insignias.findOne({ where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({status: 204,mensaje:"No se pudo eliminar insignia."})	
		}
		db.insignias.destroy({ where: { id: req.params.id } })
		.then(function(response){ 
			if(response == 1){
				return res.status(200).send({status:200,mensaje:"Insignia eliminada correctamente."})
			}else{
				return res.status(204).send({status:204,mensaje:"Error al eliminar insignia."})
			}
		})
	})
	.catch(err => {
		logger.error(err);
		return res.status(204).send({status:204,mensaje:"Error al eliminar insignia"})
	})
}

module.exports = {
	preCreate,
    crear,
	leer,
	leer_id,
	actualizar,
	eliminar
}