const db = require("../modelos");
const _ = require("lodash");
const logger = require('../config/logger');
var excelJS = require("exceljs");
var aws = require('aws-sdk');
const Stream = require('stream');

const S3_BUCKET = process.env.CONF_BUCKET
const CF_URL = process.env.CONF_CF_URL

// Filtros.

let filtro_grupos = (req, res)=>{
	var attr = {
		attributes: { exclude: ["createdAt", "updatedAt", "activo"] },
        where: { activo: 1 }
	}
    
	db.grupos.findAndCountAll(attr).then((result)=>{
		res.status(200).send({
			rows: result.rows,
			total: result.count
		})
	})
	.catch(err => {
		res.status(204).send({
			status:204,
			mensaje: "Error al obtener grupos."
		})	
	}) 
}

let filtro_programas = (req, res)=>{
	var attr = {
		attributes: { exclude: ["createdAt", "updatedAt", "activo"] },
        where: { activo: 1 }
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
			mensaje: "Error al obtener programas."
		})	
	}) 
}

let filtro_unidades = (req, res)=>{
	var attr = {
		attributes: { exclude: ["createdAt", "updatedAt", "activo"] },
        where: { activo: 1 }
	}
    
	db.unidades.findAndCountAll(attr).then((result)=>{
		res.status(200).send({
			rows: result.rows,
			total: result.count
		})
	})
	.catch(err => {
		res.status(204).send({
			status:204,
			mensaje: "Error al obtener unidades."
		})	
	}) 
}

let filtro_modulos = (req, res)=>{
	var attr = {
		attributes: { exclude: ["createdAt", "updatedAt", "activo"] },
        where: { activo: 1 }
	}
    
	db.modulos.findAndCountAll(attr).then((result)=>{
		res.status(200).send({
			rows: result.rows,
			total: result.count
		})
	})
	.catch(err => {
		res.status(204).send({
			status:204,
			mensaje: "Error al obtener modulos."
		})	
	}) 
}

// End: Filtros.

let consultaUsuarios = async (req, res) => {
    try {

        let where = '';
        if (req.body.generacion > 0 && req.body.programa > 0) {
            where = " WHERE grupo.id = " + req.body.generacion + " AND programa.id = " + req.body.programa
        } else if (req.body.generacion > 0) {
            where = " WHERE grupo.id = " + req.body.generacion
        } else if (req.body.programa > 0) {
            where = " WHERE programa.id = " + req.body.programa
        }

        let where_g = '';
        if (req.body.generacion > 0 && req.body.programa > 0) {
            where_g = " WHERE grupo = " + req.body.generacion + " AND programa = " + req.body.programa
        } else if (req.body.generacion > 0) {
            where_g = " WHERE grupo = " + req.body.generacion
        } else if (req.body.programa > 0) {
            where_g = " WHERE programa = " + req.body.programa
        }

        const [Total] = await db.sequelize.query("SELECT COUNT(1) total FROM ( \
            SELECT grupo.id grupo, programa.id programa, evf.* \
            FROM Grupos grupo \
            JOIN GrupoUsuarios grupoUsuario ON grupoUsuario.grupo = grupo.id \
            JOIN Usuarios usuario ON usuario.id=grupoUsuario.usuario \
            JOIN GrupoProgramas grupoPrograma ON grupoPrograma.grupo = grupo.id \
            JOIN Programas programa ON programa.id = grupoPrograma.programa AND programa.perfil = usuario.perfil \
            JOIN ProgramaUnidades programaUnidad ON programaUnidad.programa = programa.id \
            JOIN Unidades unidad ON unidad.id = programaUnidad.unidad \
            JOIN evaluacionFinals evf ON evf.usuario = usuario.id \
            WHERE evf.calificacion > 0 OR (evf.intento = 3 AND evf.intentoCerrado = 1) \
            GROUP BY usuario.id) tmp \
            "+where_g+";")

        const [Result] = await db.sequelize.query("SELECT \
        usuario.id AS 'usuario_id', \
        usuario.username AS 'ID', \
        usuario.nombre AS 'Nombre', \
        usuario.foto AS 'foto', \
        CONCAT(usuario.apellido_paterno,' ', usuario.apellido_materno) AS 'Apellidos', \
        grupo.nombre AS 'Generacion', \
        programaUnidad.orden as 'Orden', \
        unidad.nombre AS 'Unidad', \
        unidad.id AS 'Unidad_ID', \
        CONCAT(jefe.nombre,' ', jefe.apellido_paterno,' ', jefe.apellido_materno) AS 'Jefe', \
        COUNT( DISTINCT(insignia.id) ) AS 'InsigniasObtenidas', \
        COALESCE((TRUNCATE((COUNT(DISTINCT(ActCheck.id))) / COUNT(DISTINCT(actividadModulo.id)) * 100 * 0.25, 0))+(TRUNCATE(((usuarioActividades.reto+usuarioActividades.encuesta+usuarioActividades.evaluacion)/4)*100,0)),0) AS 'Avance', \
        COALESCE(usuarioActividades.promedioReto,0) AS 'CalifReto',  \
        COALESCE(IF(calificacionJefe.ev_enviada = 1, calificacionJefe.promedio, NULL), 0) AS 'EvJefe', \
        usuarioActividades.promedioEvConocimiento AS 'EvaluaciónConocimiento', \
        usuarioActividades.promedioAutovaluacion AS 'Autoevaluación', \
        IF(usuarioActividades.asistencia = 0, 'No asistió', IF(usuarioActividades.asistencia = 1, 'Asistió', 'Pendiente')) AS 'SesiónVirtual', \
        COALESCE(ef.calificacion) evaluacionFinal, \
        usuarioActividades.promedioReto, \
        usuarioActividades.archivoReto, \
        uj.promedio calificacionJefe \
        FROM Grupos grupo \
        JOIN GrupoUsuarios grupoUsuario ON grupoUsuario.grupo = grupo.id \
        JOIN Usuarios usuario ON usuario.id=grupoUsuario.usuario \
        JOIN GrupoProgramas grupoPrograma ON grupoPrograma.grupo = grupo.id \
        JOIN Programas programa ON programa.id = grupoPrograma.programa AND programa.perfil = usuario.perfil \
        JOIN ProgramaUnidades programaUnidad ON programaUnidad.programa = programa.id \
        JOIN Unidades unidad ON unidad.id = programaUnidad.unidad \
        JOIN ProgramaUnidadModulos programaUnidadModulo ON programaUnidadModulo.programaUnidad = unidad.id \
        JOIN Modulos modulo ON programaUnidadModulo.modulo = modulo.id \
        JOIN PrgUniModActividads programaUnidadModuloActividad ON programaUnidadModuloActividad.programaUnidadModulo = modulo.id \
        JOIN ActividadesModulos actividadModulo ON actividadModulo.id = programaUnidadModuloActividad.actividad \
        LEFT JOIN Usuarios jefe ON jefe.id = usuario.jefe_directo \
        LEFT JOIN PU_Usuario_Actividads usuarioActividades ON usuarioActividades.usuario = usuario.id AND usuarioActividades.programaUnidad = programaUnidad.id \
        LEFT JOIN RevisionRetos revisionReto ON revisionReto.reto = usuarioActividades.id \
        LEFT JOIN GU_Cal_Jefe_Unidads calificacionJefe ON calificacionJefe.gu_id = grupoUsuario.id AND calificacionJefe.unidad = unidad.id \
        LEFT JOIN InsigniasUsuarios insignia ON insignia.usuario = usuario.id \
        LEFT JOIN ActModChecks ActCheck ON ActCheck.actividad = actividadModulo.id AND ActCheck.usuario = usuario.id AND ActCheck.completada = 1\
        LEFT JOIN evaluacionFinals ef ON ef.usuario = grupoUsuario.usuario \
        LEFT JOIN GU_Cal_Jefe_Unidads uj ON uj.gu_id = grupoUsuario.id AND uj.unidad = unidad.id \
        " + where + " \
        GROUP BY usuario.id, programa.id, unidad.id;");

        var datos = {}
        Result.forEach(el => {
            if (typeof datos[el.usuario_id] === "undefined") {
                datos[el.usuario_id] = {
                    id_usuario: el.usuario_id,
                    ID: el.ID,
                    Foto: el.foto,
                    Nombre: el.Nombre,
                    Apellidos: el.Apellidos,
                    Generacion: el.Generacion,
                    Jefe: el.Jefe,
                    InsigniasObtenidas: el.InsigniasObtenidas,
                    CalifEvaluacionFinal: el.evaluacionFinal,
                    CalifPrograma: 0,
                    promedioReto: 0,
                    promedioJefe: 0
                }
            }
            if (typeof datos[el.usuario_id]['unidades'] === "undefined") {
                datos[el.usuario_id]['unidades'] = {}
            }
            if (typeof datos[el.usuario_id]['unidades'] === "object") {
                datos[el.usuario_id]['unidades'][(el.Orden + 1)] = {
                    unidad_id: el.Unidad_ID,
                    Avance: (el.Avance > 100 ? 100 : el.Avance),
                    CalifReto: el.CalifReto,
                    ArchivoReto: el.archivoReto,
                    EvJefe: el.EvJefe,
                    EvaluaciónConocimiento: el.EvaluaciónConocimiento,
                    Autoevaluación: el.Autoevaluación,
                    SesiónVirtual: el.SesiónVirtual
                };
                datos[el.usuario_id].promedioReto = datos[el.usuario_id].promedioReto + el.CalifReto
                datos[el.usuario_id].promedioJefe = datos[el.usuario_id].promedioJefe + el.EvJefe
            }
        })

        Object.keys(datos).forEach( el => {
            datos[el].CalifPrograma = ((datos[el].promedioReto / Object.keys(datos[el].unidades).length) * 0.60) + (datos[el].CalifEvaluacionFinal*0.40)
        })

        return res.status(200).send({
            infoUsuarios: datos,
            totalFinalizados: Total
        })

    } catch (err) {
        logger.error( err )
        return res.status(403).send({
            infoUsuarios: [],
            totalFinalizados: [ {'total':0} ]
        })
    }
}

let detalleUsuario = async (req, res) => {
    try {
        const [Result] = await db.sequelize.query("SELECT \
        usuario.id AS 'usuario_id', \
        grupo.nombre AS 'Generación', \
        unidad.nombre AS 'Unidad', \
        programaUnidad.orden+1 AS 'OrdenUnidad', \
        modulo.nombre AS 'Modulo', \
        programaUnidadModulo.orden+1 AS 'OrdenModulo', \
        actividadModulo.nombre AS 'Actividad', \
        programaUnidadModuloActividad.orden+1 AS 'OrdenActividad', \
        IF(actividadModulo.tipo = 1, 'Podcast', IF(actividadModulo.tipo = 2, 'Video', IF(actividadModulo.tipo = 3, 'Articulo', IF(actividadModulo.tipo = 4, 'Toolkit', IF(actividadModulo.tipo = 5, 'Ejercicio de Reforzamiento', 'N/D'))))) AS 'Formato',  \
        IF(actividadModulo.opcional = 1, 'Opcional', 'Obligatorio') AS 'Condicion', \
        COALESCE(IF(ActCheck.completada = 1, CONVERT_TZ(ActCheck.updatedAt,'+00:00','-05:00'), NULL),'-') AS 'FechaEntrega', \
        IF(ActCheck.completada = true, 'Completada', 'No completada') AS 'Estatus', \
        IF(usuarioActividades.asistencia = 0, 'No asistió', IF(usuarioActividades.asistencia = 1, 'Asistió', 'Pendiente')) AS 'SesionVirtual', \
        usuarioActividades.reto AS 'RetoOnTheJob', \
        usuarioActividades.encuesta AS 'EvaluacionEncuesta', \
        usuarioActividades.evaluacion AS 'Autoevaluacion', \
        ActCheck.datos_ejercicio AS 'Reforzamiento', \
        IF(COALESCE(uj.evaluacion,'') <> '' AND COALESCE(ev_enviada,0) = 1,1 ,0) AS 'Sesion1a1' \
        FROM Grupos grupo \
        JOIN GrupoUsuarios grupoUsuario ON grupoUsuario.grupo = grupo.id \
        JOIN GrupoProgramas grupoPrograma ON grupoPrograma.grupo = grupoUsuario.grupo \
        JOIN ProgramaUnidades programaUnidad ON programaUnidad.programa = grupoPrograma.programa \
        JOIN ProgramaUnidadModulos programaUnidadModulo ON programaUnidadModulo.programaUnidad = programaUnidad.unidad \
        JOIN PrgUniModActividads programaUnidadModuloActividad ON programaUnidadModuloActividad.programaUnidadModulo = programaUnidadModulo.modulo \
        JOIN Usuarios usuario ON usuario.id=grupoUsuario.usuario \
        JOIN Programas programa ON programa.id = grupoPrograma.programa AND programa.perfil = usuario.perfil \
        JOIN Unidades unidad ON unidad.id = programaUnidad.unidad \
        JOIN Modulos modulo ON programaUnidadModulo.modulo = modulo.id  \
        JOIN ActividadesModulos actividadModulo ON actividadModulo.id = programaUnidadModuloActividad.actividad \
        JOIN PU_Usuario_Actividads usuarioActividades ON usuarioActividades.usuario = usuario.id AND usuarioActividades.programaUnidad = programaUnidad.id  \
        LEFT JOIN ActModChecks ActCheck ON ActCheck.actividad = actividadModulo.id AND ActCheck.usuario = usuario.id \
        LEFT JOIN GU_Cal_Jefe_Unidads uj ON uj.gu_id = grupoUsuario.id AND uj.unidad = unidad.id \
        WHERE usuario.id = '"+ req.params.id_usuario + "' AND actividadModulo.activo = 1 \
        ORDER BY programaUnidad.orden, programaUnidadModulo.orden, programaUnidadModuloActividad.orden;");

        var datos = {}
        Result.forEach(el => {
            if (typeof datos[el.usuario_id] === "undefined") {
                datos[el.usuario_id] = {}
            }

            //Unidad
            if (typeof datos[el.usuario_id]['unidades'] === "undefined") {
                datos[el.usuario_id]['unidades'] = {}
            }
            if (typeof datos[el.usuario_id]['unidades'][(el.OrdenUnidad)] === "undefined") {
                datos[el.usuario_id]['unidades'][(el.OrdenUnidad)] = {
                    nombre: el.Unidad,
                    avance: 0,
                    reto: el.RetoOnTheJob,
                    evaluacionEncuesta: el.EvaluacionEncuesta,
                    autoEvaluacion: el.Autoevaluacion,
                    sesionVirtual: el.SesionVirtual,
                    sesion1a1: el.Sesion1a1
                };
            }

            //Modulo
            if (typeof datos[el.usuario_id]['unidades'][(el.OrdenUnidad)]['modulos'] === "undefined") {
                datos[el.usuario_id]['unidades'][(el.OrdenUnidad)]['modulos'] = {}
            }
            if (typeof datos[el.usuario_id]['unidades'][(el.OrdenUnidad)]['modulos'][(el.OrdenModulo)] === "undefined") {
                datos[el.usuario_id]['unidades'][(el.OrdenUnidad)]['modulos'][(el.OrdenModulo)] = {
                    nombre: el.Modulo,
                    avance: 0,
                    percAvance: 0
                }
            }

            //Actividades
            if (typeof datos[el.usuario_id]['unidades'][(el.OrdenUnidad)]['modulos'][(el.OrdenModulo)]['actividades'] === "undefined") {
                datos[el.usuario_id]['unidades'][(el.OrdenUnidad)]['modulos'][(el.OrdenModulo)]['actividades'] = {}
            }
            if (typeof datos[el.usuario_id]['unidades'][(el.OrdenUnidad)]['modulos'][(el.OrdenModulo)]['actividades'] === "object") {
                datos[el.usuario_id]['unidades'][(el.OrdenUnidad)]['modulos'][(el.OrdenModulo)]['actividades'][(el.OrdenActividad)] = {
                    nombre: el.Actividad,
                    formato: el.Formato,
                    condicion: el.Condicion,
                    fechaEntrega: el.FechaEntrega,
                    estatus: el.Estatus,
                    sesionVirtual: el.SesionVirtual,
                    reforzamiento: el.Reforzamiento
                };
            }

        })


        //Ajustar calculo como en otras vistas: EXTRA / demo
        Object.keys(datos).forEach(function (u_key) {
            Object.keys(datos[u_key]['unidades']).forEach(function (un_key) {
                Object.keys(datos[u_key]['unidades'][un_key]['modulos']).forEach(function (m_key) {
                    let total = 0, totalC = 0
                    Object.keys(datos[u_key]['unidades'][un_key]['modulos'][m_key]['actividades']).forEach(function (a_key) {
                        if (datos[u_key]['unidades'][un_key]['modulos'][m_key]['actividades'][a_key].estatus === 'Completada') {
                            totalC++;
                        }
                        total++;
                    })
                    datos[u_key]['unidades'][un_key]['modulos'][m_key].avance = parseInt((totalC * 100) / total)
                    datos[u_key]['unidades'][un_key].avance += (datos[u_key]['unidades'][un_key]['modulos'][m_key].avance / Object.keys(datos[u_key]['unidades'][un_key]['modulos']).length)
                })

                datos[u_key]['unidades'][un_key].avance = parseInt(datos[u_key]['unidades'][un_key].avance)
            })
        })

        //arr.filter(obj => obj.id > 1)

        return res.status(200).send({
            infoUsuario: datos
        })

    } catch (err) {
        logger.error(err)
        return res.status(403).send({
            infoUsuario: []
        })
    }
}

let insigniasUsuario = (req, res) => {
    db.usuarios.findOne({
        where: { id: req.params.id_usuario },
        attributes: ['id', 'username'],
        include: [{
            model: db.insignias,
            attributes: ['id', 'nombre', 'descripcion', 'imagen', 'unidad'],
            required: false
        }]
    })
        .then(usuarioInsignias => {
            db.insignias.findAndCountAll({ where: { jefe: false }, attributes: { exclude: ["createdAt", "updatedAt"] }, order: [[db.sequelize.literal("FIELD(categoria, 'Engagement','Achievements','Awards','Sin categoría') ASC, orden ASC")]] }).then((insignias) => {
                return res.status(200).send({
                    Insignias: {
                        rows: insignias.rows.map(u => ({
                            ...u.dataValues,
                            completada: usuarioInsignias.Insignias.some(function (el) { return el.id === u.dataValues.id })
                        })),
                        total: insignias.count
                    },
                    Insignias_Completadas: usuarioInsignias.Insignias
                })
            })
                .catch(err => {
                    logger.error(err)
                    return res.status(204).send({ status: 204, mensaje: "Error al obtener Insignias." })
                })

        })
        .catch(usuarioInsignias => {
            logger.error(usuarioInsignias)
            return res.status(200).send({ status: 200, msg: 'err' })
        })
}

let insigniasJefes = (req, res) => {
	db.usuarios.findOne({ 
        where: {id: req.params.id_usuario},
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
				const [InsigniasGanadas] = await db.sequelize.query("SELECT * FROM InsigniasJefes WHERE grupo = '"+req.params.grupo+"' AND usuario = '"+req.params.id_usuario+"';")
				// End: Aqui hacer query a InsigniasJefes para ver que insignias de ha ganado por grupo seleccionado

				return res.status(200).send({
					Insignias: {
						rows: insignias.rows.map( u => ({
							...u.dataValues,
							completada: InsigniasGanadas.some( function(el){ return parseInt(el.insignia) === u.dataValues.id}) 
						})),
						total: insignias.count
					},
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
						total: insignias.count
					},
					Insignias_Completadas: []
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

let retosOnTheJob = async (req, res) => {
    try {

        let where = '';
        if (req.body.generacion > 0) {
            if (where === '') {
                where += ' WHERE grupo.id = ' + req.body.generacion
            } else {
                where += ' AND grupo.id = ' + req.body.generacion
            }
        }

        if (req.body.programa > 0) {
            if (where === '') {
                where += ' WHERE programa.id = ' + req.body.programa
            } else {
                where += ' AND programa.id = ' + req.body.programa
            }
        }

        if (req.body.unidad > 0) {
            if (where === '') {
                where += ' WHERE unidad.id = ' + req.body.unidad
            } else {
                where += ' AND unidad.id = ' + req.body.unidad
            }
        }

        let programaReducido = 0
        if (req.body.generacion > 0) {
            const [PR] = await db.sequelize.query("SELECT * FROM GrupoProgramas WHERE grupo = '"+req.body.generacion+"';")
            if(PR.length > 0){
                if(req.body.programa > 0){
                    PR.forEach( el => {
                        if( el.programa === req.body.programa){
                            programaReducido = el.programaReducido
                        }
                    
                    })
                }else if(PR.length == 1){
                    programaReducido = PR[0].programaReducido
                }
            }
        }

        let Result = await retoOnTheJob_General( req.body.generacion, req.body.programa, req.body.unidad );

        const [Participacion_1] = await db.sequelize.query("SELECT \
        unidad.nombre, \
        pu.orden+1 orden, \
        COUNT(pua.id) totalRetos, \
        COUNT(pua.archivoReto) totalSubidos \
        FROM GrupoUsuarios gu \
        INNER JOIN Grupos grupo ON gu.grupo = grupo.id  \
        INNER JOIN GrupoProgramas gp ON gp.grupo = gu.grupo \
        INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
        INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        INNER JOIN Usuarios u ON gu.usuario = u.id \
        INNER JOIN Programas programa ON gp.programa = programa.id \
        INNER JOIN Unidades unidad ON pu.unidad = unidad.id \
        " + where + " \
        GROUP BY unidad.id;")

        const [Participacion_2] = await db.sequelize.query("SELECT nombre, COUNT(1) total, COUNT(IF(totalCalificados > 1,1,NULL)) participacion FROM ( \
            SELECT  \
            unidad.nombre,  \
            pu.orden+1 orden, \
            COUNT(pua.id) totalRetos, \
            COUNT(rr.jsonEvaluacion) totalCalificados \
            FROM GrupoUsuarios gu  \
            INNER JOIN Grupos grupo ON gu.grupo = grupo.id  \
            INNER JOIN GrupoProgramas gp ON gp.grupo = gu.grupo  \
            INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa  \
            INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id  \
            INNER JOIN Usuarios u ON gu.usuario = u.id \
            INNER JOIN Programas programa ON gp.programa = programa.id  \
            INNER JOIN Unidades unidad ON pu.unidad = unidad.id  \
            LEFT JOIN RevisionRetos rr ON rr.reto = pua.id \
            " + where + " \
            GROUP BY unidad.id, rr.usuarioRevision) tmp \
            GROUP BY nombre;");

        let detalleRevision = await retoOnTheJob_DetalleRevision( req.body.generacion, req.body.programa, req.body.unidad );

        return res.status(200).send({
            esProgramaReducido: programaReducido,
            tablaGeneral: Result,
            participacionSubir: Participacion_1,
            participacionCalificar: Participacion_2,
            detalleRevision: detalleRevision
        })

    } catch (err) {
        logger.error(err)
        return res.status(403).send({
            tablaGeneral: [],
            participacionSubir: [],
            participacionCalificar: [],
            detalleRevision: []
        })
    }
}

let general = async (req, res) => {
    try {
        let Result = await filtro_general( req.body.generacion, req.body.programa, req.body.unidad, req.body.modulo, req.body.fechaIn, req.body.fechaFin );
        return res.status(200).send({
            general: Result
        })

    } catch (err) {
        logger.error(err)
        return res.status(403).send({
            general: []
        })
    }
}

let export_general = async (req, res) => {
    // var workbook1 = new excelJS.Workbook();
    const stream = new Stream.PassThrough();
    const workbook1 = new excelJS.stream.xlsx.WorkbookWriter({
        stream: stream,
    });

    let haveSheet = false;

    workbook1.creator = 'XLSX Exporter Alvesc';
    workbook1.lastModifiedBy = 'XLSX Exporter Alvesc';
    workbook1.created = new Date();
    workbook1.modified = new Date();

    //General
    if(req.query.informacion_gral === "true"){
        let General = await filtro_general( req.query.generacion, req.query.programa, req.query.unidad, req.query.modulo, req.query.fechaIn, req.query.fechaFin );
        var sheet1 = workbook1.addWorksheet('General');
        sheet1.columns = [
            {header:'Programas', key:'Programas'},
            {header:'Unidades', key:'Unidades'},
            {header:'Modulos', key:'Modulos'},
            {header:'Objetos de aprendizaje', key:'Actividades'}
        ];
        General.forEach( el => {
            let row = {}
            sheet1.columns.forEach(header => {
                row[header.key] = el[ header.key ]
            })
            sheet1.addRow(row);
        })
        sheet1.commit();
        haveSheet = true
    }

    //Poblacion
    if(req.query.poblacion === "true"){
        let Poblacion = await filtro_poblacion_detalle( req.query.generacion, req.query.programa, req.query.unidad, req.query.modulo, req.query.fechaIn, req.query.fechaFin );
        var sheet2 = workbook1.addWorksheet('Población');
        sheet2.columns = [
            {header:'Generación', key:'Generacion'},
            {header:'Programa', key:'nombre'},
            {header:'Total de usuarios', key:'usuarios'},
            {header:'Cursando', key:'Entraron'},
            {header:'Por iniciar', key:'Sin entrar'},
            {header:'Dados de baja', key:'bajas'}
        ];
        Poblacion.forEach( el => {
            let row = {}
            sheet2.columns.forEach(header => {
                row[header.key] = el[ header.key ]
            })
            sheet2.addRow(row);
        })
        sheet2.commit();
        haveSheet = true
    }
    
    //Desempeño
    if(req.query.desempenio === "true"){
        let Desempenio = await filtro_desempenio_detalle( req.query.generacion, req.query.programa, req.query.unidad, req.query.modulo, req.query.fechaIn, req.query.fechaFin );
        var sheet3 = workbook1.addWorksheet('Desempeño de usuarios');
        sheet3.columns = [
            {header:'Generación', key:'generacion'},
            {header:'Unidad', key:'Unidad'},
            {header:'Calificación promedio de Reto on the job', key:'promedioReto'},
            {header:'Calificación promedio de Programa de Retroalimentación', key:'promedioJefe'},
            {header:'Calificación promedio de Evaluación de conocimiento', key:'promedioEvConocimiento'},
            {header:'Calificación promedio de Autoevaluación de aprendizajes clave', key:'promedioAutovaluacion'}
        ];
        Desempenio.forEach( el => {
            let row = {}
            sheet3.columns.forEach(header => {
                row[header.key] = el[ header.key ]
            })
            sheet3.addRow(row);
        })
        sheet3.commit();
        haveSheet = true
    }

    //Avance de Programa
    if(req.query.avance_programa === "true"){
        let Result = await filtro_avancePrograma( req.query.generacion, req.query.programa, req.query.unidad, req.query.modulo, req.query.fechaIn, req.query.fechaFin );
        var sheet4 = workbook1.addWorksheet('Avance en el programa');
        sheet4.columns = [
            {header:'Generación', key:'Generacion'},
            {header:'Programa', key:'Programa'},
            {header:'Unidad', key:'NombreUnidad'},
            {header:'Usuarios', key:'Usuarios'},
            {header:'Avance', key:'Avance'}
        ];
        Result.forEach( el => {
            let row = {}
            sheet4.columns.forEach(header => {
                row[header.key] = el[ header.key ]
            })
            sheet4.addRow(row);
        })
        sheet4.commit();
        haveSheet = true
    }

    //Objetos de aprendizaje
    if(req.query.objetos === "true"){
        let Result = await filtro_objetosAprendizaje( req.query.generacion, req.query.programa, req.query.unidad, req.query.modulo, req.query.fechaIn, req.query.fechaFin );
        var sheet5 = workbook1.addWorksheet('Objetos de aprendizaje');
        sheet5.columns = [
            {header:'Generación', key:'Grupo'},
            {header:'Programa', key:'Programa'},
            {header:'Unidad', key:'Unidad'},
            {header:'Nombre del objeto', key:'Actividad'},
            {header:'Formato', key:'Tipo'},
            {header:'Módulo', key:'Modulo'},
            {header:'Promedio de puntaje otorgado', key:'Ranking'},
            {header:'Comentarios', key:'Comentarios'},
            {header:'Reply', key:'Reply'},
            {header:'Likes', key:'Likes'},
            {header:'Completado', key:'Completado'},
            {header:'Criterio', key:'Criterio'}
        ];
        Result.forEach( el => {
            let row = {}
            sheet5.columns.forEach(header => {
                row[header.key] = el[ header.key ]
                if(header.key === 'Criterio'){
                    row[header.key] = el[ header.key ] === 1 ? 'Opcional' : 'Obligatorio';
                }
            })
            sheet5.addRow(row);
        })
        sheet5.commit();
        haveSheet = true
    }

    //Foro Social
    if(req.query.participacion_foro === "true"){
    }

    if(req.query.participacion_foro === "true"){
        let Result = await filtro_social( req.query.generacion, req.query.programa, req.query.unidad, req.query.modulo, req.query.fechaIn, req.query.fechaFin );
        var sheetF = workbook1.addWorksheet('Foro Social Detalle');
        sheetF.columns = [
            {header:'Unidad', key:'Unidad'},
            {header:'Modulo', key:'Modulo'},
            {header:'Comentarios', key:'Comentarios'},
            {header:'Reply', key:'Reply'},
            {header:'Likes', key:'Likes'}
        ];
        Result.detalle.forEach( el => {
            let row = {}
            sheetF.columns.forEach(header => {
                row[header.key] = el[ header.key ]
            })
            sheetF.addRow(row);
        })
        sheetF.commit();

        var sheetFG = workbook1.addWorksheet('Foro Social Generales');
        sheetFG.columns = [
            {header:'Nivel 1', key:'nivel_1'},
            {header:'Nivel 2', key:'nivel_2'},
            {header:'Nivel 3', key:'nivel_3'}
        ];
        Result.general.forEach( el => {
            let row = {}
            sheetFG.columns.forEach(header => {
                row[header.key] = el[ header.key ]
            })
            sheetFG.addRow(row);
        })
        sheetFG.commit();
        haveSheet = true
    }

    //Sesion virtual
    if(req.query.sesiones_virtuales === "true"){
        let Result = await filtro_sesion_virtual( req.query.generacion, req.query.programa, req.query.unidad, req.query.modulo, req.query.fechaIn, req.query.fechaFin );
        var sheetS = workbook1.addWorksheet('Sesiones virtuales');
        sheetS.columns = [
            {header:'Unidad', key:'Unidad'},
            {header:'Asistencia', key:'Asistencia'},
            {header:'Ausencia', key:'Ausencia'}
        ];
        Result.forEach( el => {
            let row = {}
            sheetS.columns.forEach(header => {
                row[header.key] = el[ header.key ]
            })
            sheetS.addRow(row);
        })
        sheetS.commit();
        haveSheet = true
    }

    //Encuesta de satisfaccion
    if(req.query.encuesta === "true"){
        let Result = await resultadoEncuestaSatisfaccion( req.query.generacion, req.query.programa, req.query.unidad, req.query.modulo, req.query.fechaIn, req.query.fechaFin );
        var sheet6 = workbook1.addWorksheet('Encuesta de satisfacción');
        sheet6.columns = [
            {header:'Pregunta', key:'Pregunta'},
            {header:'Respuesta',key:'Respuesta'},
            {header:'Cantidad', key:'Cantidad'}
        ];
        Object.keys(Result).forEach( key  => {
            let row = {}
            
            row['Pregunta'] = key;
            row['Respuesta'] = '';
            row['Cantidad'] = '';
            sheet6.addRow(row);

            Object.keys(Result[key]).forEach( one => {

                if(typeof Result[key][one] == "number"){
                    let row_one = {}
                    row_one['Respuesta'] = parseInt(one);
                    row_one['Cantidad'] = parseInt(Result[key][one]);
                    sheet6.addRow(row_one);
                }else if(typeof Result[key][one] == "object"){
                    let row_one = {}
                    row_one['Pregunta'] = one;
                    row_one['Respuesta'] = '';
                    row_one['Cantidad'] = '';
                    sheet6.addRow(row_one);
                    Object.keys(Result[key][one]).forEach( two => {
                        let row_two = {}
                        row_two['Pregunta'] = '';
                        row_two['Respuesta'] = parseInt(two);
                        row_two['Cantidad'] = parseInt(Result[key][one][two]);
                        sheet6.addRow(row_two);        
                    })
                }
            })
        })
        // Result.forEach( el => {
        //     let row = {}
            
        //     // sheet5.columns.forEach(header => {
        //     //     row[header.key] = el[ header.key ]
        //     // })
        //     sheet5.addRow(row);
        // })
        sheet6.commit();
        haveSheet = true
    }

    workbook1.commit();

    if(!haveSheet){
        logger.error( "No sheet" )
        return res.status(200).send({
            status: 200,
            mensajeSuccess: false,
            url: null,
            filename: null,
            mensajeError: "Ocurrio un error, intente de nuevo o contacte a soporte."
        })
    }

    // res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    // res.setHeader("Content-Disposition", "attachment; filename=" + "Reporte.xlsx");
    // var wopts = { bookType:'xlsx', bookSST:false, type:'buffer' };
    // workbook1.xlsx.write(res, wopts)
    // .then(function (data) {
    //     res.end();
    // });

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
    const filename = 'Reporte_General_'+ d.getDate() + "_" + (d.getMonth() + 1) + "_" + d.getFullYear() + "_" + d.getHours() + "_" + d.getMinutes() + ".xlsx";
    var dataObjJson = {
        Bucket: process.env.CONF_BUCKET,
        Key: 'xlsx/' + filename,
        Body: stream,
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
                filename: filename,
                mensajeError: false
            })
        }
    });
}

let export_retoOnTheJob = async (req, res) => {
    const stream = new Stream.PassThrough();
    const workbook1 = new excelJS.stream.xlsx.WorkbookWriter({
        stream: stream,
    });


    workbook1.creator = 'XLSX Exporter Alvesc';
    workbook1.lastModifiedBy = 'XLSX Exporter Alvesc';
    workbook1.created = new Date();
    workbook1.modified = new Date();

    //General
        let General = await retoOnTheJob_General( req.query.generacion, req.query.programa, req.query.unidad );
        var sheet1 = workbook1.addWorksheet('General');
        sheet1.columns = [
            {header:'ID', key:'ID'},
            {header:'Usuario', key:'Usuario'},
            {header:'Puntaje', key:'Puntaje'},
            {header:'Generación', key:'Generacion'},
            {header:'Programa', key:'Programa'},
            {header:'Unidad', key:'Unidad'}
        ];
        General.forEach( el => {
            let row = {}
            sheet1.columns.forEach(header => {
                row[header.key] = el[ header.key ]
            })
            sheet1.addRow(row);
        })
        sheet1.commit();

    //Poblacion
    let Detalle = await retoOnTheJob_DetalleRevision( req.query.generacion, req.query.programa, req.query.unidad );
    var sheet2 = workbook1.addWorksheet('Detalle');
    sheet2.columns = [
        {header:'Generación', key:'Generacion'},
        {header:'Unidad', key:'Unidad'},
        {header:'Usuario que revisa', key:'Usuario que revisa'},
        {header:'Usuario a revisar', key:'Usuario a revisar'},
        {header:'Reto a evaluar', key:'Reto a evaluar'},
        {header:'Reto Evaluado', key:'Reto Evaluado'}
    ];
    Detalle.forEach( el => {
        let row = {}
        sheet2.columns.forEach(header => {
            row[header.key] = el[ header.key ]
        })
        sheet2.addRow(row);
    })
    sheet2.commit();
    
    workbook1.commit();

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
    const filename = 'Reto_On_The_Job_'+ d.getDate() + "_" + (d.getMonth() + 1) + "_" + d.getFullYear() + "_" + d.getHours() + "_" + d.getMinutes() + ".xlsx";
    var dataObjJson = {
        Bucket: process.env.CONF_BUCKET,
        Key: 'xlsx/' + filename,
        Body: stream,
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
                filename: filename,
                mensajeError: false
            })
        }
    });
}

let poblacion = async (req, res) => {
    try {
        let Grafica = await filtro_poblacion_grafica( req.body.generacion, req.body.programa, req.body.unidad, req.body.modulo, req.body.fechaIn, req.body.fechaFin );
        let Detalle = await filtro_poblacion_detalle( req.body.generacion, req.body.programa, req.body.unidad, req.body.modulo, req.body.fechaIn, req.body.fechaFin );
        return res.status(200).send({
            general: Grafica,
            detalle: Detalle
        })

    } catch (err) {
        logger.error(err)
        return res.status(403).send({
            general: [],
            detalle: []
        })
    }
}

let desempenio = async (req, res) => {
    try {

        let where = '';
        if (req.body.generacion > 0) {
            if (where === '') {
                where += ' WHERE g.id = ' + req.body.generacion
            } else {
                where += ' AND g.id = ' + req.body.generacion
            }
        }

        if (req.body.programa > 0) {
            if (where === '') {
                where += ' WHERE p.id = ' + req.body.programa
            } else {
                where += ' AND p.id = ' + req.body.programa
            }
        }

        if (req.body.unidad > 0) {
            if (where === '') {
                where += ' WHERE u.id = ' + req.body.unidad
            } else {
                where += ' AND u.id = ' + req.body.unidad
            }
        }

        if (req.body.fechaIn && req.body.fechaFin) {
            if (where === '') {
                where += ' WHERE g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + req.body.fechaIn + '\' AND fechaFin <= \'' + req.body.fechaFin + '\' )'
            } else {
                where += ' AND g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + req.body.fechaIn + '\' AND fechaFin <= \'' + req.body.fechaFin + '\' )'
            }
        }

        let wherePromedios = '';
        if (req.body.generacion > 0) {
            if (wherePromedios === '') {
                wherePromedios += ' WHERE g.id = ' + req.body.generacion
            } else {
                wherePromedios += ' AND g.id = ' + req.body.generacion
            }
        }

        if (req.body.programa > 0) {
            if (wherePromedios === '') {
                wherePromedios += ' WHERE p.id = ' + req.body.programa
            } else {
                wherePromedios += ' AND p.id = ' + req.body.programa
            }
        }

        const [General] = await db.sequelize.query("\
        SELECT \
            COUNT(IF(PromedioFinal >= 8, 1, NULL)) Aprobados, \
            COUNT(IF(PromedioFinal < 8, 1, NULL)) Reprobados \
        FROM ( \
            SELECT \
                gu.usuario, \
                AVG(COALESCE(pua.promedioReto,0)) promedioReto, \
                AVG(COALESCE(uj.promedio,0)) promedioJefe, \
                AVG(COALESCE(ef.calificacion,0)) EvaluacionFinal, \
                ( AVG(COALESCE(pua.promedioReto,0)) * 0.60 ) +  \
                ( COALESCE(AVG(ef.calificacion),0) * 0.40 ) PromedioFinal \
            FROM Grupos g \
            JOIN GrupoUsuarios gu ON gu.grupo = g.id \
            JOIN GrupoProgramas gp ON gp.grupo = g.id \
            JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
            JOIN Programas p ON p.id = gp.programa \
            JOIN Unidades u ON u.id = pu.unidad \
            JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
            LEFT JOIN GU_Cal_Jefe_Unidads uj ON uj.gu_id = gu.id AND uj.unidad = u.id \
            LEFT JOIN evaluacionFinals ef ON ef.usuario = gu.usuario \
            "+where+" \
            GROUP BY gu.usuario \
        )tmp;");

        const [BarrasPrograma] = await db.sequelize.query("\
        SELECT \
            CONCAT('Unidad ', pu.orden+1) AS Unidad, \
            TRUNCATE(COALESCE(AVG(pua.promedioReto),0),2) promedioReto, \
            TRUNCATE(COALESCE(AVG(pua.promedioEvConocimiento),0),2) promedioEvConocimiento, \
            TRUNCATE(COALESCE(AVG(pua.promedioAutovaluacion),0),2) promedioAutovaluacion, \
            TRUNCATE(COALESCE(AVG(uj.promedio),0),2) promedioJefe \
        FROM Grupos g \
        JOIN GrupoUsuarios gu ON gu.grupo = g.id \
        JOIN GrupoProgramas gp ON gp.grupo = g.id \
        JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
        JOIN Programas p ON p.id = gp.programa \
        JOIN Unidades u ON u.id = pu.unidad \
        JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        LEFT JOIN GU_Cal_Jefe_Unidads uj ON uj.gu_id = gu.id AND uj.unidad = u.id \
        "+where+" \
        GROUP BY u.id \
        ORDER BY u.nombre ASC;");

        const [Promedios] = await db.sequelize.query("SELECT \
        TRUNCATE(AVG(PromedioFinal),1) promedioFinal, TRUNCATE(AVG(EvaluacionFinal),1) promedioEvFinal \
        FROM ( \
        SELECT \
            gu.usuario, \
            AVG(COALESCE(ef.calificacion,0)) EvaluacionFinal, \
            ( AVG(COALESCE(pua.promedioReto,0)) * 0.60 ) + \
            ( COALESCE(AVG(ef.calificacion),0) * 0.40 ) PromedioFinal \
        FROM Grupos g \
        JOIN GrupoUsuarios gu ON gu.grupo = g.id \
        JOIN GrupoProgramas gp ON gp.grupo = g.id \
        JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
        JOIN Programas p ON p.id = gp.programa \
        JOIN Unidades u ON u.id = pu.unidad \
        JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        LEFT JOIN GU_Cal_Jefe_Unidads uj ON uj.gu_id = gu.id AND uj.unidad = u.id \
        LEFT JOIN evaluacionFinals ef ON ef.usuario = gu.usuario \
        "+wherePromedios+" \
        GROUP BY gu.usuario \
        )tmp;")

        let Detalles = await filtro_desempenio_detalle( req.body.generacion, req.body.programa, req.body.unidad, req.body.modulo, req.body.fechaIn, req.body.fechaFin );

        return res.status(200).send({
            general: General,
            detalle: Detalles,
            detallePrograma: BarrasPrograma,
            promedios: Promedios
        })

    } catch (err) {
        logger.error(err)
        return res.status(403).send({
            general: [],
            detalle: [],
            detallePrograma: [],
            promedios: []
        })
    }
}

let avancePrograma = async (req, res) => {
    try {

        let Result = await filtro_avancePrograma( req.body.generacion, req.body.programa, req.body.unidad, req.body.modulo, req.body.fechaIn, req.body.fechaFin );
        return res.status(200).send({
            general: Result
        })

    } catch (err) {
        logger.error(err)
        return res.status(403).send({
            general: []
        })
    }
}


let objetosAprendizaje = async (req, res) => {
    try {
        let Result = await filtro_objetosAprendizaje( req.body.generacion, req.body.programa, req.body.unidad, req.body.modulo, req.body.fechaIn, req.body.fechaFin );
        return res.status(200).send({
            general: Result
        })

    } catch (err) {
        logger.error(err)
        return res.status(403).send({
            general: []
        })
    }
}

let participacionForoSocial = async (req, res) => {

    try {
        let Result = await filtro_social( req.body.generacion, req.body.programa, req.body.unidad, req.body.modulo, req.body.fechaIn, req.body.fechaFin );
        return res.status(200).send(Result)

    } catch (err) {
        logger.error(err)
        return res.status(403).send({
            general: [],
            detalle: []
        })
    }

    try {
        let where = '';
        if (req.body.generacion > 0) {
            if (where === '') {
                where += ' WHERE g.id = ' + req.body.generacion
            } else {
                where += ' AND g.id = ' + req.body.generacion
            }
        }

        if (req.body.programa > 0) {
            if (where === '') {
                where += ' WHERE p.id = ' + req.body.programa
            } else {
                where += ' AND p.id = ' + req.body.programa
            }
        }

        if (req.body.unidad > 0) {
            if (where === '') {
                where += ' WHERE u.id = ' + req.body.unidad
            } else {
                where += ' AND u.id = ' + req.body.unidad
            }
        }

        if (req.body.modulo > 0) {
            if (where === '') {
                where += ' WHERE m.id = ' + req.body.modulo
            } else {
                where += ' AND m.id = ' + req.body.modulo
            }
        }

        if (req.body.fechaIn && req.body.fechaFin) {
            if (where === '') {
                where += ' WHERE g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + req.body.fechaIn + '\' AND fechaFin <= \'' + req.body.fechaFin + '\' )'
            } else {
                where += ' AND g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + req.body.fechaIn + '\' AND fechaFin <= \'' + req.body.fechaFin + '\' )'
            }
        }

        let where_r = where
        if (where_r === '') {
            where_r += ' WHERE i.llave_insignia = \'influencer_bronce\''
        } else {
            where_r += ' AND i.llave_insignia = \'influencer_bronce\''
        }
    

        

        // const [Result] = await db.sequelize.query("SELECT COUNT(1) total, COUNT(IF(iu.nivel=1,1,NULL)) AS nivel_1, COUNT(IF(iu.nivel=2,1,NULL)) AS nivel_2, COUNT(IF(iu.nivel=3,1,NULL)) AS nivel_3 \
        // FROM Insignias i \
        // LEFT JOIN InsigniasUsuarios iu ON iu.insignia=i.id \
        // WHERE i.llave_insignia = 'influencer_bronce';");

        const [Result] = await db.sequelize.query("SELECT \
        COUNT(1) total, \
        COUNT(IF(nivel = 1, 1, NULL)) AS nivel_1, \
        COUNT(IF(nivel = 2, 1, NULL)) AS nivel_2, \
        COUNT(IF(nivel = 3, 1, NULL)) AS nivel_3 FROM ( \
        SELECT  \
            DISTINCT(iu.id) id_g, iu.* \
            FROM Insignias i \
                LEFT JOIN InsigniasUsuarios iu ON iu.insignia=i.id \
                JOIN GrupoUsuarios gu ON gu.usuario = iu.usuario \
                JOIN Grupos g ON g.id=gu.grupo \
                JOIN GrupoProgramas gp ON gp.grupo = gu.grupo \
                JOIN Programas p ON p.id = gp.programa \
                JOIN ProgramaUnidades pu ON pu.programa = p.id \
                JOIN Unidades u ON u.id = pu.unidad \
                JOIN ProgramaUnidadModulos pum ON pum.programaUnidad = pu.unidad \
                JOIN Modulos m ON pum.modulo = m.id \
            "+where_r+" ) tmp;");

        const [Detalle] = await db.sequelize.query("SELECT Unidad, Modulo, SUM(Comentarios) Comentarios, SUM(Reply) Reply, SUM(Likes) Likes FROM ( \
            SELECT g.nombre Grupo, \
            p.nombre Programa, \
            CONCAT('Unidad ', pu.orden+1) AS Unidad,  \
            CONCAT('Modulo ', pum.orden+1) AS Modulo,  \
            am.nombre Actividad, \
            COUNT(DISTINCT(preg.id)) Comentarios, \
            COUNT(DISTINCT(res.id)) Reply, \
            COUNT(DISTINCT(lk.id)) Likes, \
            am.opcional Criterio \
            FROM Grupos g \
            JOIN GrupoUsuarios gu ON gu.grupo = g.id \
            JOIN GrupoProgramas gp ON gp.grupo = g.id \
            JOIN Programas p ON p.id = gp.programa \
            JOIN ProgramaUnidades pu ON pu.programa = p.id \
            JOIN Unidades u ON u.id = pu.unidad \
            JOIN ProgramaUnidadModulos pum ON pum.programaUnidad = pu.unidad \
            JOIN Modulos m ON pum.modulo = m.id \
            JOIN PrgUniModActividads puma ON puma.programaUnidadModulo = pum.modulo \
            JOIN ActividadesModulos am ON am.id = puma.actividad \
            LEFT JOIN ActModChecks amc ON amc.actividad = puma.actividad AND amc.usuario = gu.usuario \
            LEFT JOIN Preguntas preg ON preg.actividad = puma.actividad AND preg.usuario = gu.usuario \
            LEFT JOIN Respuestas res ON res.pregunta = preg.id \
            LEFT JOIN Likes lk ON lk.pregunta = preg.id OR lk.respuesta = res.id \
            "+where+" \
            GROUP BY am.nombre, g.id \
            ORDER BY pu.orden, pum.orden ASC) tmp \
            GROUP BY Unidad, Modulo;")
        
        return res.status(200).send({
            general: Result,
            detalle: Detalle
        })

    } catch (err) {
        logger.error(err)
        return res.status(403).send({
            general: [],
            detalle: []
        })
    }
}

let sesionesVirtuales = async (req, res) => {

    try {
        let Result = await filtro_sesion_virtual( req.body.generacion, req.body.programa, req.body.unidad, req.body.modulo, req.body.fechaIn, req.body.fechaFin );
        return res.status(200).send({
            general: Result
        })

    } catch (err) {
        logger.error(err)
        return res.status(403).send({
            general: []
        })
    }

    try {

        let where = '';
        if (req.body.generacion > 0) {
            if (where === '') {
                where += ' WHERE g.id = ' + req.body.generacion
            } else {
                where += ' AND g.id = ' + req.body.generacion
            }
        }

        if (req.body.programa > 0) {
            if (where === '') {
                where += ' WHERE p.id = ' + req.body.programa
            } else {
                where += ' AND p.id = ' + req.body.programa
            }
        }

        if (req.body.unidad > 0) {
            if (where === '') {
                where += ' WHERE u.id = ' + req.body.unidad
            } else {
                where += ' AND u.id = ' + req.body.unidad
            }
        }

        if (req.body.fechaIn && req.body.fechaFin) {
            if (where === '') {
                where += ' WHERE g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + req.body.fechaIn + '\' AND fechaFin <= \'' + req.body.fechaFin + '\' )'
            } else {
                where += ' AND g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + req.body.fechaIn + '\' AND fechaFin <= \'' + req.body.fechaFin + '\' )'
            }
        }

        const [Result] = await db.sequelize.query("SELECT \
        u.nombre Unidad, \
        COUNT(IF(pua.asistencia = 1,1,NULL)) Asistencia, \
        COUNT(IF(pua.asistencia = 0,1,NULL)) Ausencia \
        FROM Grupos g \
        JOIN GrupoUsuarios gu ON gu.grupo = g.id \
        JOIN GrupoProgramas gp ON gp.grupo = g.id \
        JOIN Programas p ON p.id = gp.programa \
        JOIN ProgramaUnidades pu ON pu.programa = p.id \
        JOIN Unidades u ON u.id = pu.unidad \
        JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        "+where+" \
        GROUP BY u.id \
        ORDER BY u.nombre ASC;");
        
        return res.status(200).send({
            general: Result
        })

    } catch (err) {
        logger.error(err)
        return res.status(403).send({
            general: []
        })
    }
}

let resultadoEncuestaSatisfaccion = async (generacion, programa, unidad, fechaIn, fechaFin) => {
    try {

        let where = " WHERE COALESCE(pua.encuestaSatisfaccion,'') <> ''";
        if (generacion > 0) {
            if (where === '') {
                where += ' WHERE g.id = ' + generacion
            } else {
                where += ' AND g.id = ' + generacion
            }
        }

        if (programa > 0) {
            if (where === '') {
                where += ' WHERE p.id = ' + programa
            } else {
                where += ' AND p.id = ' + programa
            }
        }

        if (unidad > 0) {
            if (where === '') {
                where += ' WHERE u.id = ' + unidad
            } else {
                where += ' AND u.id = ' + unidad
            }
        }

        if (isNaN(fechaIn) && !isNaN(Date.parse(fechaIn)) && isNaN(fechaFin) && !isNaN(Date.parse(fechaFin))) {
            if (where === '') {
                where += ' WHERE g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            } else {
                where += ' AND g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            }
        }

        const [Result] = await db.sequelize.query("SELECT pua.encuestaSatisfaccion \
        FROM Grupos g \
        JOIN GrupoUsuarios gu ON gu.grupo = g.id \
        JOIN GrupoProgramas gp ON gp.grupo = g.id \
        JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
        JOIN Programas p ON p.id = gp.programa \
        JOIN Unidades u ON u.id = pu.unidad \
        JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        "+where+";");

        let respuesta = {}
        
        Result.forEach(jsonForm => {
            let form  = JSON.parse( jsonForm.encuestaSatisfaccion )
            form.Satisfaccion.forEach(element => {
                element.seccion.preguntas.forEach(pregunta => {
                    if(pregunta.pregunta.tipo === "rango"){
                        if (typeof respuesta[pregunta.pregunta.titulo] === "undefined") {
                            respuesta[pregunta.pregunta.titulo] = {1: 0,2: 0,3: 0,4: 0,5: 0,6: 0,7: 0,8: 0,9: 0,10: 0};
                        }
                        if (typeof respuesta[pregunta.pregunta.titulo][pregunta.pregunta.respuesta] !== "undefined"){
                            respuesta[pregunta.pregunta.titulo][pregunta.pregunta.respuesta]+=1;
                        }
                    }else if(pregunta.pregunta.tipo === "seleccionMultiple"){
                        let _respuestas = {}
                        if (typeof respuesta[pregunta.pregunta.titulo] === "undefined") {
                            pregunta.pregunta.respuestas.forEach( (_respuesta, idx) => {
                                _respuestas[idx+1] = 0
                            })
                            respuesta[pregunta.pregunta.titulo] = _respuestas;
                        }
                        pregunta.pregunta.respuestas.forEach( (_respuesta, idx) => {
                            if(_respuesta.respuesta === true){
                                respuesta[pregunta.pregunta.titulo][idx+1] += 1    
                            }
                        })
                    }else if(pregunta.pregunta.tipo === "ordenamiento"){
                        let _respuestas = {}
                        if (typeof respuesta[pregunta.pregunta.titulo] === "undefined") {
                            pregunta.pregunta.respuestas.forEach( (_respuesta, idx) => {
                                _respuestas[_respuesta.pregunta.titulo] = {}
                                for( let idx2 = 1 ; idx2 <= pregunta.pregunta.respuestas.length ; idx2++){
                                    _respuestas[_respuesta.pregunta.titulo][idx2] = 0
                                }
                            })
                            respuesta[pregunta.pregunta.titulo] = _respuestas;
                        }
                        pregunta.pregunta.respuestas.forEach( (_respuesta, idx) => {
                            if (typeof respuesta[pregunta.pregunta.titulo][_respuesta.pregunta.titulo] !== "undefined") {       
                                if (typeof respuesta[pregunta.pregunta.titulo][_respuesta.pregunta.titulo][_respuesta.pregunta.respuesta] === "undefined") {
                                    respuesta[pregunta.pregunta.titulo][_respuesta.pregunta.titulo][_respuesta.pregunta.respuesta] = 0
                                }   
                                respuesta[pregunta.pregunta.titulo][_respuesta.pregunta.titulo][_respuesta.pregunta.respuesta] +=1
                            }
                        })
                    }
                })
            })
        })
        
        return respuesta

    } catch (err) {
        logger.error(err)
        return []
    }
}

let resultadosEncuestaSatisfaccion = async (req, res) => {
    let respuesta = await resultadoEncuestaSatisfaccion(req.body.generacion, req.body.programa, req.body.unidad, req.body.modulo, req.body.fechaIn, req.body.fechaFin)
    return res.status(200).send({
        general: respuesta
    })
}

//Querys-Resultados
let filtro_social = async (generacion, programa, unidad, modulo, fechaIn, fechaFin) => {
    try {
        let where = '';
        if (generacion > 0) {
            if (where === '') {
                where += ' WHERE g.id = ' + generacion
            } else {
                where += ' AND g.id = ' + generacion
            }
        }

        if (programa > 0) {
            if (where === '') {
                where += ' WHERE p.id = ' + programa
            } else {
                where += ' AND p.id = ' + programa
            }
        }

        if (unidad > 0) {
            if (where === '') {
                where += ' WHERE u.id = ' + unidad
            } else {
                where += ' AND u.id = ' + unidad
            }
        }

        if (modulo > 0) {
            if (where === '') {
                where += ' WHERE m.id = ' + modulo
            } else {
                where += ' AND m.id = ' + modulo
            }
        }

        if (isNaN(fechaIn) && !isNaN(Date.parse(fechaIn)) && isNaN(fechaFin) && !isNaN(Date.parse(fechaFin))) {
            if (where === '') {
                where += ' WHERE g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            } else {
                where += ' AND g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            }
        }

        let where_r = where
        if (where_r === '') {
            where_r += ' WHERE i.llave_insignia = \'influencer_bronce\''
        } else {
            where_r += ' AND i.llave_insignia = \'influencer_bronce\''
        }
    

        

        // const [Result] = await db.sequelize.query("SELECT COUNT(1) total, COUNT(IF(iu.nivel=1,1,NULL)) AS nivel_1, COUNT(IF(iu.nivel=2,1,NULL)) AS nivel_2, COUNT(IF(iu.nivel=3,1,NULL)) AS nivel_3 \
        // FROM Insignias i \
        // LEFT JOIN InsigniasUsuarios iu ON iu.insignia=i.id \
        // WHERE i.llave_insignia = 'influencer_bronce';");

        const [Result] = await db.sequelize.query("SELECT \
        COUNT(1) total, \
        COUNT(IF(nivel = 1, 1, NULL)) AS nivel_1, \
        COUNT(IF(nivel = 2, 1, NULL)) AS nivel_2, \
        COUNT(IF(nivel = 3, 1, NULL)) AS nivel_3 FROM ( \
        SELECT  \
            DISTINCT(iu.id) id_g, iu.* \
            FROM Insignias i \
                LEFT JOIN InsigniasUsuarios iu ON iu.insignia=i.id \
                JOIN GrupoUsuarios gu ON gu.usuario = iu.usuario \
                JOIN Grupos g ON g.id=gu.grupo \
                JOIN GrupoProgramas gp ON gp.grupo = gu.grupo \
                JOIN Programas p ON p.id = gp.programa \
                JOIN ProgramaUnidades pu ON pu.programa = p.id \
                JOIN Unidades u ON u.id = pu.unidad \
                JOIN ProgramaUnidadModulos pum ON pum.programaUnidad = pu.unidad \
                JOIN Modulos m ON pum.modulo = m.id \
            "+where_r+" ) tmp;");

        const [Detalle] = await db.sequelize.query("SELECT Unidad, Modulo, SUM(Comentarios) Comentarios, SUM(Reply) Reply, SUM(Likes) Likes FROM ( \
            SELECT g.nombre Grupo, \
            p.nombre Programa, \
            CONCAT('Unidad ', pu.orden+1) AS Unidad,  \
            CONCAT('Modulo ', pum.orden+1) AS Modulo,  \
            am.nombre Actividad, \
            COUNT(DISTINCT(preg.id)) Comentarios, \
            COUNT(DISTINCT(res.id)) Reply, \
            COUNT(DISTINCT(lk.id)) Likes, \
            am.opcional Criterio \
            FROM Grupos g \
            JOIN GrupoUsuarios gu ON gu.grupo = g.id \
            JOIN GrupoProgramas gp ON gp.grupo = g.id \
            JOIN Programas p ON p.id = gp.programa \
            JOIN ProgramaUnidades pu ON pu.programa = p.id \
            JOIN Unidades u ON u.id = pu.unidad \
            JOIN ProgramaUnidadModulos pum ON pum.programaUnidad = pu.unidad \
            JOIN Modulos m ON pum.modulo = m.id \
            JOIN PrgUniModActividads puma ON puma.programaUnidadModulo = pum.modulo \
            JOIN ActividadesModulos am ON am.id = puma.actividad \
            LEFT JOIN ActModChecks amc ON amc.actividad = puma.actividad AND amc.usuario = gu.usuario \
            LEFT JOIN Preguntas preg ON preg.actividad = puma.actividad AND preg.usuario = gu.usuario \
            LEFT JOIN Respuestas res ON res.pregunta = preg.id \
            LEFT JOIN Likes lk ON lk.pregunta = preg.id /* OR lk.respuesta = res.id */ \
            "+where+" \
            GROUP BY am.nombre, g.id \
            ORDER BY pu.orden, pum.orden ASC) tmp \
            GROUP BY Unidad, Modulo;")
        
        return {
            general: Result,
            detalle: Detalle
        }

    } catch (err) {
        logger.error(err)
        return {
            general: [],
            detalle: []
        }
    }
}
let filtro_sesion_virtual = async (generacion, programa, unidad, modulo, fechaIn, fechaFin) => {
    try {

        let where = '';
        if (generacion > 0) {
            if (where === '') {
                where += ' WHERE g.id = ' + generacion
            } else {
                where += ' AND g.id = ' + generacion
            }
        }

        if (programa > 0) {
            if (where === '') {
                where += ' WHERE p.id = ' + programa
            } else {
                where += ' AND p.id = ' + programa
            }
        }

        if (unidad > 0) {
            if (where === '') {
                where += ' WHERE u.id = ' + unidad
            } else {
                where += ' AND u.id = ' + unidad
            }
        }

        if (isNaN(fechaIn) && !isNaN(Date.parse(fechaIn)) && isNaN(fechaFin) && !isNaN(Date.parse(fechaFin))) {
            if (where === '') {
                where += ' WHERE g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            } else {
                where += ' AND g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            }
        }

        const [Result] = await db.sequelize.query("SELECT \
        u.nombre Unidad, \
        COUNT(IF(pua.asistencia = 1,1,NULL)) Asistencia, \
        COUNT(IF(pua.asistencia = 0,1,NULL)) Ausencia \
        FROM Grupos g \
        JOIN GrupoUsuarios gu ON gu.grupo = g.id \
        JOIN GrupoProgramas gp ON gp.grupo = g.id \
        JOIN Programas p ON p.id = gp.programa \
        JOIN ProgramaUnidades pu ON pu.programa = p.id \
        JOIN Unidades u ON u.id = pu.unidad \
        JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        "+where+" \
        GROUP BY u.id \
        ORDER BY u.nombre ASC;");
        
        return Result

    } catch (err) {
        logger.error(err)
        return []
    }
}
let filtro_general = async (generacion, programa, unidad, modulo, fechaIn, fechaFin) => {
    try {
        let where = '';

        if (generacion > 0) {
            if (where === '') { where += ' WHERE g.id = ' + generacion } else { where += ' AND g.id = ' + generacion }
        }

        if (programa > 0) { 
            if (where === '') { where += ' WHERE pu.programa = ' + programa } else { where += ' AND pu.programa = ' + programa }
        }

        if (unidad > 0) {
            if (where === '') { where += ' WHERE pu.unidad = ' + unidad } else { where += ' AND pu.unidad = ' + unidad }
        }

        if (isNaN(fechaIn) && !isNaN(Date.parse(fechaIn)) && isNaN(fechaFin) && !isNaN(Date.parse(fechaFin))) {
            if (where === '') {
                where += ' WHERE g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            } else {
                where += ' AND g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            }
        }
                                                    
        const [Result] = await db.sequelize.query("SELECT \
        COUNT(DISTINCT(g.id)) Grupos, \
        COUNT(DISTINCT(gp.programa)) Programas, \
        COUNT(DISTINCT(pu.unidad)) Unidades, \
        COUNT(DISTINCT(pum.modulo)) Modulos, \
        COUNT(DISTINCT(puma.id)) Actividades \
        FROM Grupos g \
        INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
        INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
        INNER JOIN ProgramaUnidadModulos pum ON pum.programaUnidad = pu.unidad \
        INNER JOIN PrgUniModActividads puma ON puma.programaUnidadModulo = pum.modulo \
        LEFT JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad \
        "+where+";");

        return Result;
    } catch (err) {
        return []
    }
}

let filtro_poblacion_grafica = async (generacion, programa, unidad, modulo, fechaIn, fechaFin) => {
    try {
        let where = '';
        if (generacion > 0) {
            if (where === '') {
                where += ' WHERE g.id = ' + generacion
            } else {
                where += ' AND g.id = ' + generacion
            }
        }

        if (programa > 0) {
            if (where === '') {
                where += ' WHERE gp.programa = ' + programa
            } else {
                where += ' AND gp.programa = ' + programa
            }
        }

        if (isNaN(fechaIn) && !isNaN(Date.parse(fechaIn)) && isNaN(fechaFin) && !isNaN(Date.parse(fechaFin))) {
            if (where === '') {
                where += ' WHERE g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            } else {
                where += ' AND g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            }
        }

        const [Result] = await db.sequelize.query("SELECT \
        COUNT(DISTINCT(u.id)) usuarios, \
        COUNT(DISTINCT(g.id)) grupos, \
        COUNT(IF(u.activo = 1 AND COALESCE(u.password,'') = '',1,NULL)) AS por_ingresar, \
        COUNT(IF(u.activo = 1 AND COALESCE(u.password,'') <> '',1,NULL)) AS cursando, \
        COUNT(IF(u.activo = 0,1,NULL)) AS bajas \
        FROM Grupos g \
        JOIN GrupoUsuarios gu ON gu.grupo = g.id \
        JOIN GrupoProgramas gp ON gp.grupo = g.id \
        JOIN Usuarios u ON u.id = gu.usuario \
        "+where+";");
        
        return Result;

    } catch (err) {
        return []
    }
}

let filtro_poblacion_detalle = async (generacion, programa, unidad, modulo, fechaIn, fechaFin) => {
    try {
        let where = '';
        if (generacion > 0) {
            if (where === '') {
                where += ' WHERE g.id = ' + generacion
            } else {
                where += ' AND g.id = ' + generacion
            }
        }

        if (programa > 0) {
            if (where === '') {
                where += ' WHERE gp.programa = ' + programa
            } else {
                where += ' AND gp.programa = ' + programa
            }
        }

        if (isNaN(fechaIn) && !isNaN(Date.parse(fechaIn)) && isNaN(fechaFin) && !isNaN(Date.parse(fechaFin))) {
            if (where === '') {
                where += ' WHERE g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            } else {
                where += ' AND g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            }
        }

        const [Detalle] = await db.sequelize.query("SELECT g.nombre Generacion, \
        p.nombre, \
        COUNT(u.id) usuarios, \
        COUNT(IF(u.password IS NOT NULL,1,NULL)) Entraron, \
        COUNT(IF(u.password IS NULL,1,NULL)) 'Sin entrar', \
        COUNT(IF(u.activo = 0,1,NULL)) bajas \
        FROM Grupos g \
        JOIN GrupoUsuarios gu ON gu.grupo = g.id \
        JOIN GrupoProgramas gp ON gp.grupo = g.id \
        JOIN Programas p ON p.id = gp.programa \
        JOIN Usuarios u ON u.id = gu.usuario \
        "+where+" \
        GROUP BY g.nombre, p.nombre;");

        return Detalle;
    } catch (err) {
        return []
    }
}

let filtro_desempenio_detalle = async (generacion, programa, unidad, modulo, fechaIn, fechaFin) => {
    try {
        let where = '';
        if (generacion > 0) {
            if (where === '') {
                where += ' WHERE g.id = ' + generacion
            } else {
                where += ' AND g.id = ' + generacion
            }
        }

        if (programa > 0) {
            if (where === '') {
                where += ' WHERE p.id = ' + programa
            } else {
                where += ' AND p.id = ' + programa
            }
        }

        if (unidad > 0) {
            if (where === '') {
                where += ' WHERE u.id = ' + unidad
            } else {
                where += ' AND u.id = ' + unidad
            }
        }

        if (isNaN(fechaIn) && !isNaN(Date.parse(fechaIn)) && isNaN(fechaFin) && !isNaN(Date.parse(fechaFin))) {
            if (where === '') {
                where += ' WHERE g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            } else {
                where += ' AND g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            }
        }
        
        const [Detalles] = await db.sequelize.query("\
        SELECT \
            p.id, \
            g.nombre generacion, \
            CONCAT('Unidad ', pu.orden+1) AS Unidad, \
            TRUNCATE(COALESCE(AVG(pua.promedioReto),0),2) promedioReto, \
            TRUNCATE(COALESCE(AVG(pua.promedioEvConocimiento),0),2) promedioEvConocimiento, \
            TRUNCATE(COALESCE(AVG(pua.promedioAutovaluacion),0),2) promedioAutovaluacion, \
            TRUNCATE(COALESCE(AVG(uj.promedio),0),2) promedioJefe \
        FROM Grupos g \
        JOIN GrupoUsuarios gu ON gu.grupo = g.id \
        JOIN GrupoProgramas gp ON gp.grupo = g.id \
        JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
        JOIN Programas p ON p.id = gp.programa \
        JOIN Unidades u ON u.id = pu.unidad \
        JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        LEFT JOIN GU_Cal_Jefe_Unidads uj ON uj.gu_id = gu.id AND uj.unidad = u.id \
        "+where+" \
        GROUP BY g.id, u.id \
        ORDER BY u.nombre ASC;");

        return Detalles

    } catch (err) {
        return []
    }
}

let filtro_avancePrograma = async (generacion, programa, unidad, modulo, fechaIn, fechaFin) => {
    try {
        let where = ' WHERE actividadModulo.activo = 1';
        if (generacion > 0) {
            if (where === '') {
                where += ' WHERE grupo.id = ' + generacion
            } else {
                where += ' AND grupo.id = ' + generacion
            }
        }

        if (programa > 0) {
            if (where === '') {
                where += ' WHERE programa.id = ' + programa
            } else {
                where += ' AND programa.id = ' + programa
            }
        }

        if (unidad > 0) {
            if (where === '') {
                where += ' WHERE unidad.id = ' + unidad
            } else {
                where += ' AND unidad.id = ' + unidad
            }
        }

        if (isNaN(fechaIn) && !isNaN(Date.parse(fechaIn)) && isNaN(fechaFin) && !isNaN(Date.parse(fechaFin))) {
            if (where === '') {
                where += ' WHERE grupo.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            } else {
                where += ' AND grupo.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            }
        }

        const [Result] = await db.sequelize.query("SELECT Generacion AS 'Generacion', Programa AS 'Programa', NombreUnidad AS 'NombreUnidad', Unidad AS 'Unidad', COUNT(1) Usuarios, AVG(Avance) Avance FROM ( \
            SELECT \
                grupo.nombre AS 'Generacion', \
                programa.nombre AS 'Programa', \
                unidad.nombre AS 'NombreUnidad', \
                CONCAT('Unidad ', programaUnidad.orden+1) AS 'Unidad', \
                TRUNCATE((100*TRUNCATE( ( (COUNT(IF(ActCheck.completada = 1,1,NULL))) / COUNT(actividadModulo.id) ),0) / (COUNT(DISTINCT(modulo.id)))) + 100 * (usuarioActividades.reto+usuarioActividades.encuesta+usuarioActividades.evaluacion)/4,0) AS 'Avance' \
                FROM Grupos grupo \
                JOIN GrupoUsuarios grupoUsuario ON grupoUsuario.grupo = grupo.id \
                JOIN Usuarios usuario ON usuario.id=grupoUsuario.usuario \
                JOIN GrupoProgramas grupoPrograma ON grupoPrograma.grupo = grupo.id \
                JOIN Programas programa ON programa.id = grupoPrograma.programa AND programa.perfil = usuario.perfil \
                JOIN ProgramaUnidades programaUnidad ON programaUnidad.programa = programa.id \
                JOIN Unidades unidad ON unidad.id = programaUnidad.unidad \
                JOIN ProgramaUnidadModulos programaUnidadModulo ON programaUnidadModulo.programaUnidad = unidad.id \
                JOIN Modulos modulo ON programaUnidadModulo.modulo = modulo.id \
                JOIN PrgUniModActividads programaUnidadModuloActividad ON programaUnidadModuloActividad.programaUnidadModulo = modulo.id \
                JOIN ActividadesModulos actividadModulo ON actividadModulo.id = programaUnidadModuloActividad.actividad \
                LEFT JOIN Usuarios jefe ON jefe.id = usuario.jefe_directo \
                LEFT JOIN PU_Usuario_Actividads usuarioActividades ON usuarioActividades.usuario = usuario.id AND usuarioActividades.programaUnidad = programaUnidad.id \
                LEFT JOIN RevisionRetos revisionReto ON revisionReto.reto = usuarioActividades.id \
                LEFT JOIN GU_Cal_Jefe_Unidads calificacionJefe ON calificacionJefe.gu_id = grupoUsuario.id AND calificacionJefe.unidad = unidad.id \
                LEFT JOIN InsigniasUsuarios insignia ON insignia.usuario = usuario.id \
                LEFT JOIN ActModChecks ActCheck ON ActCheck.actividad = actividadModulo.id AND ActCheck.usuario = usuario.id \
                LEFT JOIN evaluacionFinals ef ON ef.usuario = grupoUsuario.usuario \
                "+where+" \
                GROUP BY grupo.id, usuario.id, programa.id, unidad.id) tmp \
            GROUP BY Generacion, Programa, Unidad;")

        return Result

    } catch (err) {
        return []
    }
}

let filtro_objetosAprendizaje = async (generacion, programa, unidad, modulo, fechaIn, fechaFin) => {
    try {

        let where = '';
        if (generacion > 0) {
            if (where === '') {
                where += ' WHERE g.id = ' + generacion
            } else {
                where += ' AND g.id = ' + generacion
            }
        }

        if (programa > 0) {
            if (where === '') {
                where += ' WHERE p.id = ' + programa
            } else {
                where += ' AND p.id = ' + programa
            }
        }

        if (unidad > 0) {
            if (where === '') {
                where += ' WHERE u.id = ' + unidad
            } else {
                where += ' AND u.id = ' + unidad
            }
        }

        if (modulo > 0) {
            if (where === '') {
                where += ' WHERE m.id = ' + modulo
            } else {
                where += ' AND m.id = ' + modulo
            }
        }

        if (isNaN(fechaIn) && !isNaN(Date.parse(fechaIn)) && isNaN(fechaFin) && !isNaN(Date.parse(fechaFin))) {
            if (where === '') {
                where += ' WHERE g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            } else {
                where += ' AND g.id IN ( SELECT grupo FROM (SELECT grupo, MIN(fechaApertura) fechaApertura, MAX(jefeAutoEvFinFecha) fechaFin FROM GrupoUnidadFechas GROUP BY grupo) gruposData WHERE fechaApertura >= \'' + fechaIn + '\' AND fechaFin <= \'' + fechaFin + '\' )'
            }
        }

        const [Result] = await db.sequelize.query("SELECT g.nombre Grupo, \
        p.nombre Programa, \
        u.nombre Unidad, \
        m.nombre Modulo, \
        am.nombre Actividad, \
        IF(am.tipo = 1, 'Podcast', IF(am.tipo = 2, 'Video', IF(am.tipo = 3, 'Artículo', IF(am.tipo = 4, 'Toolkit', IF(am.tipo = 5, 'Ejercicio de Reforzamiento', 'N/D'))))) Tipo, \
        COALESCE(AVG( IF(amc.calificacion > 0, amc.calificacion, NULL) ), 0) Ranking, \
        COUNT(DISTINCT(preg.id)) Comentarios, \
        COUNT(DISTINCT(res.id)) Reply, \
        COUNT(DISTINCT(lk.id)) Likes, \
        CONCAT(CAST(COUNT(DISTINCT(amc.id)) AS CHAR), '/', CAST(COUNT(DISTINCT(gu.usuario)) AS CHAR)) Completado, \
        am.opcional Criterio \
        FROM Grupos g \
        JOIN GrupoUsuarios gu ON gu.grupo = g.id \
        JOIN GrupoProgramas gp ON gp.grupo = g.id \
        JOIN Programas p ON p.id = gp.programa \
        JOIN ProgramaUnidades pu ON pu.programa = p.id \
        JOIN Unidades u ON u.id = pu.unidad \
        JOIN ProgramaUnidadModulos pum ON pum.programaUnidad = pu.unidad \
        JOIN Modulos m ON pum.modulo = m.id \
        JOIN PrgUniModActividads puma ON puma.programaUnidadModulo = pum.modulo \
        JOIN ActividadesModulos am ON am.id = puma.actividad \
        LEFT JOIN ActModChecks amc ON amc.actividad = puma.actividad AND amc.usuario = gu.usuario \
        LEFT JOIN Preguntas preg ON preg.actividad = puma.actividad AND preg.usuario = gu.usuario \
        LEFT JOIN Respuestas res ON res.pregunta = preg.id \
        LEFT JOIN Likes lk ON lk.pregunta = preg.id /* OR lk.respuesta = res.id */ \
        "+where+" \
        GROUP BY am.nombre, g.id \
        ORDER BY u.nombre ASC;");
        
        return Result

    } catch (err) {
        logger.error(err)
        return []
    }
}

let retoOnTheJob_General = async (generacion, programa, unidad) => {

    try {

        let where = '';
        if (generacion > 0) {
            if (where === '') {
                where += ' WHERE grupo.id = ' + generacion
            } else {
                where += ' AND grupo.id = ' + generacion
            }
        }

        if (programa > 0) {
            if (where === '') {
                where += ' WHERE programa.id = ' + programa
            } else {
                where += ' AND programa.id = ' + programa
            }
        }

        if (unidad > 0) {
            if (where === '') {
                where += ' WHERE unidad.id = ' + unidad
            } else {
                where += ' AND unidad.id = ' + unidad
            }
        }

        
        const [Result] = await db.sequelize.query("SELECT \
        u.username AS ID,  \
        CONCAT(u.nombre , ' ', u.apellido_paterno, ' ', u.apellido_materno)AS Usuario,  \
        AVG(rr.promedioReto) Puntaje_2, \
        IF(COALESCE(pua.archivoReto, '') = '', 'No presentó', CAST(pua.promedioReto AS CHAR)) Puntaje, \
        grupo.nombre AS 'Generacion', \
        programa.nombre AS 'Programa',  \
        unidad.nombre AS 'Unidad' \
        FROM GrupoUsuarios gu  \
        INNER JOIN Grupos grupo ON gu.grupo = grupo.id  \
        INNER JOIN GrupoProgramas gp ON gp.grupo = gu.grupo  \
        INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa  \
        INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id  \
        LEFT JOIN RevisionRetos rr ON rr.reto = pua.id  \
        INNER JOIN Usuarios u ON gu.usuario = u.id \
        INNER JOIN Programas programa ON gp.programa = programa.id \
        INNER JOIN Unidades unidad ON pu.unidad = unidad.id  \
        " + where + " \
        GROUP BY pua.usuario, unidad.id;");

        return Result

    } catch (err) {
        logger.error(err)
        return []
    }
}

let retoOnTheJob_DetalleRevision = async (generacion, programa, unidad) => {

    try {

        let where = '';
        if (generacion > 0) {
            if (where === '') {
                where += ' WHERE grupo.id = ' + generacion
            } else {
                where += ' AND grupo.id = ' + generacion
            }
        }

        if (programa > 0) {
            if (where === '') {
                where += ' WHERE programa.id = ' + programa
            } else {
                where += ' AND programa.id = ' + programa
            }
        }

        if (unidad > 0) {
            if (where === '') {
                where += ' WHERE unidad.id = ' + unidad
            } else {
                where += ' AND unidad.id = ' + unidad
            }
        }

        const [detalleRevision] = await db.sequelize.query("SELECT \
            grupo.nombre 'Generacion', \
            unidad.nombre 'Unidad', \
            CONCAT(ur.nombre,' ', ur.apellido_paterno) 'Usuario que revisa',  \
            CONCAT(u.nombre,' ', u.apellido_paterno) 'Usuario a revisar',  \
            if(pu.archivoReto is null, 'No subio reto', 'Reto cargado') 'Reto a evaluar', \
            if(rr.jsonEvaluacion is null, 'No evaluado', 'Evaluado') 'Reto Evaluado' \
        FROM Grupos grupo \
        JOIN GrupoUsuarios gu ON gu.grupo=grupo.id \
        JOIN GrupoProgramas gp ON gp.grupo = gu.grupo  \
        JOIN ProgramaUnidades pun ON pun.programa = gp.programa  \
        JOIN Usuarios u ON gu.usuario=u.id \
        JOIN PU_Usuario_Actividads pu ON pu.usuario=u.id AND pu.programaUnidad = pun.id \
        JOIN RevisionRetos rr ON pu.id=rr.reto \
        JOIN Usuarios ur ON rr.usuarioRevision=ur.id \
        JOIN Programas programa ON gp.programa = programa.id  \
        JOIN Unidades unidad ON pun.unidad = unidad.id \
        " + where + ";");

        return detalleRevision

    } catch (err) {
        logger.error(err)
        return []
    }
}

let descarga_reporte_avance = async (req, res) => {

    let grupo = req.params.grupo

    const stream = new Stream.PassThrough();
    const workbook = new excelJS.stream.xlsx.WorkbookWriter({
        stream: stream,
    });

    workbook.creator = 'XLSX Exporter Alvesc';
    workbook.lastModifiedBy = 'XLSX Exporter Alvesc';
    workbook.created = new Date();
    workbook.modified = new Date();

    var sheet1 = workbook.addWorksheet('General');
    sheet1.columns = [
        {header:'Ola', key:'Ola'},
        {header:'Num. empleado', key:'Num. empleado'},
        {header:'Nombre', key:'Nombre'},
        {header:'Estatus usuario', key:'Estatus usuario'},
        {header:'Correo usuario', key:'Correo usuario'},
        {header:'Unidad', key:'Unidad'},
        {header:'Actividades Terminadas', key:'Actividades Terminadas'},
        {header:'Total Actividades', key:'Total Actividades'},
        {header:'C. Reto', key:'C. Reto'},
        {header:'C. Jefe', key:'C. Jefe'},
        {header:'C. EvFinal', key:'C. EvFinal'}
        
    ];

    const [Info] = await db.sequelize.query(`SELECT 
        grupo.nombre AS 'Ola',
        usuario.username 'Num. empleado', 
        CONCAT(TRIM(usuario.nombre), ' ', TRIM(usuario.apellido_paterno), ' ', TRIM(usuario.apellido_materno) ) 'Nombre', 
        IF(COALESCE(usuario.password,'')='','Sin acceso registrado en plataforma','Usuario activo') 'Estatus usuario',  
        usuario.email AS 'Correo usuario',
        unidad.nombre AS 'Unidad',
        COUNT(DISTINCT(ActCheck.id)) 'Actividades Terminadas',
        COUNT(DISTINCT(actividadModulo.id)) 'Total Actividades',
        COALESCE(usuarioActividades.promedioReto,0) 'C. Reto',
        IF(calificacionJefe.ev_enviada=1, uj.promedio, 0) 'C. Jefe',
        ef.calificacion 'C. EvFinal'
    FROM Grupos grupo 
    JOIN GrupoUsuarios grupoUsuario ON grupoUsuario.grupo = grupo.id 
    JOIN Usuarios usuario ON usuario.id=grupoUsuario.usuario 
    JOIN GrupoProgramas grupoPrograma ON grupoPrograma.grupo = grupo.id
    JOIN Programas programa ON programa.id = grupoPrograma.programa AND programa.perfil = usuario.perfil 
    JOIN ProgramaUnidades programaUnidad ON programaUnidad.programa = programa.id 
    JOIN Unidades unidad ON unidad.id = programaUnidad.unidad 
    JOIN ProgramaUnidadModulos programaUnidadModulo ON programaUnidadModulo.programaUnidad = unidad.id 
    JOIN Modulos modulo ON programaUnidadModulo.modulo = modulo.id 
    JOIN PrgUniModActividads programaUnidadModuloActividad ON programaUnidadModuloActividad.programaUnidadModulo = modulo.id 
    JOIN ActividadesModulos actividadModulo ON actividadModulo.id = programaUnidadModuloActividad.actividad 
    LEFT JOIN PU_Usuario_Actividads usuarioActividades ON usuarioActividades.usuario = usuario.id AND usuarioActividades.programaUnidad = programaUnidad.id 
    LEFT JOIN RevisionRetos revisionReto ON revisionReto.reto = usuarioActividades.id 
    LEFT JOIN GU_Cal_Jefe_Unidads calificacionJefe ON calificacionJefe.gu_id = grupoUsuario.id AND calificacionJefe.unidad = unidad.id 
    LEFT JOIN InsigniasUsuarios insignia ON insignia.usuario = usuario.id 
    LEFT JOIN ActModChecks ActCheck ON ActCheck.actividad = actividadModulo.id AND ActCheck.usuario = usuario.id 
    LEFT JOIN evaluacionFinals ef ON ef.usuario = grupoUsuario.usuario 
    LEFT JOIN GU_Cal_Jefe_Unidads uj ON uj.gu_id = grupoUsuario.id AND uj.unidad = unidad.id 
    WHERE grupo.id = '${grupo}'
    GROUP BY usuario.id, programa.id, unidad.id
    ORDER BY usuario.id, programaUnidad.orden ASC;`)
    if(Info.length>0){
        Info.forEach( el => {
            let row = {}
            sheet1.columns.forEach(header => {
                row[header.key] = el[ header.key ]
            })
            sheet1.addRow(row);
        })
        sheet1.commit();
    }

    // let d = new Date();
    // const filename = 'Reporte_'+ d.getDate() + "_" + (d.getMonth() + 1) + "_" + d.getFullYear() + "_" + d.getHours() + "_" + d.getMinutes() + ".xlsx";
    // res.setHeader(
    //     "Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    // );
    // res.setHeader(
    //     "Content-Disposition", "attachment; filename=" + filename
    // );

    // return workbook.xlsx.write(res).then(function () {
    //     res.status(200).end();
    // });
    
    workbook.commit();

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
    const filename = 'Reporte_Avance_'+ d.getDate() + "_" + (d.getMonth() + 1) + "_" + d.getFullYear() + "_" + d.getHours() + "_" + d.getMinutes() + ".xlsx";
    var dataObjJson = {
        Bucket: process.env.CONF_BUCKET,
        Key: 'reportes_avance/' + filename,
        Body: stream,
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ACL: 'public-read'
    };
      
    s3.upload(dataObjJson, function (err, resp) {
        if (err) {
            logger.error( err )
            return res.status(200).send({})
        } else {
            return res.redirect(resp.Location)
        }
    });

}

module.exports = {
    filtro_grupos,
    filtro_programas,
    filtro_unidades,
    filtro_modulos,
    consultaUsuarios,
    detalleUsuario,
    insigniasUsuario,
    insigniasJefes,
    retosOnTheJob,
    general,
    poblacion,
    desempenio,
    avancePrograma,
    objetosAprendizaje,
    participacionForoSocial,
    sesionesVirtuales,
    resultadosEncuestaSatisfaccion,
    export_general,
    export_retoOnTheJob,
    descarga_reporte_avance
}