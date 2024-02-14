const db = require("../modelos");
const _ = require("lodash");
const logger = require("../config/logger");
const Model = db.recordatorios;
const Op = db.Sequelize.Op;

let preCreate = (req, res) =>{
	const keys = Object.keys(Model.rawAttributes);
	const empty = {};
	keys.forEach(v => empty[v]="")
	res.status(200).send({
		status: 200,
		message: "Recordatorios.",
		modulos: _.omit(empty,["createdAt", "updatedAt", "activo"]),
		struct: _.omit(empty,["createdAt", "updatedAt", "activo"])
	});
}

let crear = (req, res)=>{
	let body = req.body;

	if (!req.body.grupo||
		!req.body.programa||
        !req.body.titulo||
        !req.body.mensaje||
        !req.body.fechaInicio||
        !req.body.horaInicio||
        !req.body.fechaTermino||
        !req.body.horaTermino) {
		res.status(204).send({
			status: 204,
			message: "Error al crear recordatorio."
		});
		return;
	}
	
	const data2Create = {
		grupo: 		    body.grupo,
		programa: 		body.programa,
		titulo: 		body.titulo,
		mensaje: 		body.mensaje,
        fecha: 	        body.fecha || null,
		hora: 	        body.hora || null,
		fechaInicio: 	body.fechaInicio,
		horaInicio: 	body.horaInicio,
		fechaTermino: 	body.fechaTermino,
        horaTermino:    body.horaTermino,
	};
	
	Model.create(data2Create)
    .then(data => {
        res.status(200).send({
            status:200,
            data,
            mensaje:"El recordatorio ha sido creado con éxito"
        })
    })
    .catch(err => {
        logger.error("Error: " + err)
        res.status(204).send({
            status:204,
            mensaje: "Error al crear la recordatorio.",
            err
        })	
    });
}

let leer_id = (req, res) =>{
	Model.findOne({ attributes: { exclude: ["createdAt", "updatedAt"] }, where: { id: req.params.id } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al obtener recordatorio."
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
			mensaje:"Error al obtener recordatorio.",
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
					nombre: { [Op.like] : '%'+req.query.search+'%' },
					descripcion: { [Op.like] : '%'+req.query.search+'%' },

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
				mensaje:"Error al actualizar recordatorio."
			})	
		}

		const data2Update = { ...req.body }

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
					mensaje: "Error al actualizar recordatorio."
				})
			}
		})
	})
	.catch(err => {
		logger.error("Error: " + err)
		return res.status(204).send({
			status: 204,
			mensaje:"Error al actualizar recordatorio",
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
				mensaje:"No se pudo desactivar el recordatorio."
			})	
		}

		const data2Update = { 'activo': !data.activo }

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
					mensaje: "Error al desactivar la modulo"
				})
			}
		})
	})
	.catch(err => {
		logger.error("Error: " + err)
		return res.status(204).send({
			status: 204,
			mensaje:"Error al desactivar modulo",
			err	
		})
	})
}

let recordatorio_visto = (req, res)=>{
	
    const data2Update = {visto: true}

    db.recordatoriosVistos.findOne({ where: { recordatorio: req.params.id, usuario: req.auth.id } })
	.then(function (data) {
		
		if (!data) {
			db.recordatoriosVistos.create({usuario: req.auth.id, recordatorio: req.params.id})
            .then(data => {
                res.status(200).send({
                    status:200,
                    data,
                    mensaje:"El recordatorio se ha marcado como visto"
                })
            })
            .catch(err => {
                logger.error("Error: " + err)
                res.status(204).send({
                    status:204,
                    mensaje: "Error al marcar recordatorio como visto.",
                    err
                })	
            });
		}

	})
	.catch(err => {
		logger.error("Error: " + err)
		return res.status(200).send({
			status: 200,
			mensaje:"OK",
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
	preCreate,
    recordatorio_visto
}