const db = require("../modelos");
const logger = require('../config/logger');
const Op = db.Sequelize.Op;
var aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { ActualizacionPromedios } = require("../services/services");

let home_tutor = async (req, res) => {
    try {
        const [InfoGeneral] = await db.sequelize.query("SELECT SUM(gruposAsignados) gruposAsignados, SUM(gruposActivos) gruposActivos, SUM(colaboradoresAsignados) colaboradoresAsignados FROM ( \
            SELECT COUNT(DISTINCT(g.id)) gruposAsignados, 0 gruposActivos, COUNT(DISTINCT(gu.usuario)) colaboradoresAsignados \
            FROM Usuarios u \
            INNER JOIN GrupoUsuarios gu ON gu.usuario=u.id \
            INNER JOIN Grupos g ON gu.grupo=g.id \
            INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
            INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
            INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
            WHERE u.tutor = '"+req.auth.id+"' \
            UNION  \
            SELECT 0 gruposAsignados, COUNT(1) gruposActivos, 0 colaboradoresAsignados FROM ( \
            SELECT MAX(guf.jefeAutoEvFinFecha) jefeAutoEvFinFecha \
            FROM Usuarios u \
            LEFT JOIN GrupoUsuarios gu ON gu.usuario=u.id \
            LEFT JOIN Grupos g ON gu.grupo=g.id \
            INNER JOIN GrupoProgramas gp ON gp.grupo = g.id  \
            INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa  \
            INNER JOIN ProgramaUnidadModulos pum ON pum.programaUnidad = pu.unidad  \
            INNER JOIN PrgUniModActividads puma ON puma.programaUnidadModulo = pum.modulo  \
            INNER JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad \
            WHERE u.tutor = '"+req.auth.id+"' \
            GROUP BY guf.grupo) temp  \
            WHERE jefeAutoEvFinFecha <= NOW()) gral;");

        const [InfoGrupos] = await db.sequelize.query("SELECT id_Generacion generacion_id, Generacion, COUNT(1) colaboradoresTotales, colaboradoresAsignados, fechaApertura, estado, retos_totales, retos_disponibles_para_evaluar, retos_sin_evaluar, retos_evaluados FROM ( \
            SELECT \
            g.id id_Generacion, \
            g.nombre Generacion, \
            0 colaboradoresTotales, \
            COUNT(DISTINCT(gu.usuario)) colaboradoresAsignados, \
            MIN(guf.fechaApertura) fechaApertura, \
            IF(COUNT(IF(COALESCE(pua.archivoReto,'')<>'',1,NULL)) <= 0, 'Aún no disponible', \
            IF(COUNT(IF(COALESCE(pua.archivoReto,'')<>'' AND COALESCE(pua.evaluacionTutor,'')<>'',1,NULL)) > 0 AND COUNT(IF(COALESCE(pua.archivoReto,'')<>'' AND COALESCE(pua.evaluacionTutor,'')<>'',1,NULL)) >= COUNT(pua.id)  , 'Evaluaciones concluidas', \
            IF(COUNT(IF(COALESCE(pua.archivoReto,'')<>'' AND COALESCE(pua.evaluacionTutor,'')='',1,NULL)) = 0, 'Estás al día', \
            'Evaluaciones pendientes') ) ) estado, \
            COUNT(pua.id) retos_totales, \
            COUNT(IF(COALESCE(pua.archivoReto,'')<>'',1,NULL)) retos_disponibles_para_evaluar, \
            COUNT(IF(COALESCE(pua.archivoReto,'')<>'' AND COALESCE(pua.evaluacionTutor,'')='',1,NULL)) retos_sin_evaluar, \
            COUNT(IF(COALESCE(pua.archivoReto,'')<>'' AND COALESCE(pua.evaluacionTutor,'')<>'',1,NULL)) retos_evaluados \
            FROM Usuarios u \
            INNER JOIN GrupoUsuarios gu ON gu.usuario=u.id \
            INNER JOIN Grupos g ON gu.grupo=g.id \
            INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
            INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa  \
            INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
            LEFT JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad \
            WHERE u.tutor = '"+req.auth.id+"' \
            GROUP BY g.id) resumen \
            LEFT JOIN GrupoUsuarios gu ON gu.grupo = resumen.id_Generacion \
            GROUP BY gu.grupo;");

        const [InfoHeadTabla] = await db.sequelize.query("SELECT SUM(colaboradoresTotales) colaboradoresTotales, SUM(colaboradoresPendientes) colaboradoresPendientes FROM ( \
            SELECT  \
                0 colaboradoresTotales, COUNT(DISTINCT (gu.usuario)) colaboradoresPendientes \
            FROM \
                Usuarios u \
            INNER JOIN GrupoUsuarios gu ON gu.usuario = u.id \
            INNER JOIN Grupos g ON gu.grupo = g.id \
            INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
            INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
            INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
            WHERE \
                u.tutor = '"+req.auth.id+"' AND COALESCE(pua.archivoReto, '') <> '' AND COALESCE(pua.evaluacionTutor,'') = '' \
            UNION \
            SELECT  \
                COUNT(DISTINCT (gu.usuario)) colaboradoresTotales, 0 colaboradoresPendientes \
            FROM \
                Usuarios u \
            INNER JOIN GrupoUsuarios gu ON gu.usuario = u.id \
            INNER JOIN Grupos g ON gu.grupo = g.id \
            INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
            INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
            INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
            ) temp;")

    
        return res.status(200).send({
            General: InfoGeneral,
            Grupos: InfoGrupos,
            HeadTabla: InfoHeadTabla
        })

    } catch (err) {
        return res.status(200).send({
            General: [],
            Grupos: [],
            HeadTabla: []
        })
    }
}

let usuarios_grupo = async (req, res) => {
    // req['auth']={}
    // req.auth.id = 88
    try {
        const [InfoGrupo] = await db.sequelize.query("SELECT \
        u.id usuario_id, \
        u.perfil perfil, \
        g.id GrupoID, \
        g.nombre Generacion, \
        u.nombre 'nombre', \
        u.apellido_paterno, \
        u.apellido_materno, \
        u.email, \
        CONCAT(u.apellido_paterno,' ', u.apellido_materno) Apellido, \
        u.foto foto, \
        u.activo activo, \
        pua.id PuaID, \
        pu.orden, \
        un.id unidad_id, \
        un.nombre nombre_unidad, \
        COALESCE(pua.archivoReto, '') archivoReto, \
        pua.fechaRetoGuardado fechaPublicacionReto, \
        COALESCE(pua.calificacionTutor, '') promedioOtorgado, \
        COALESCE(pua.evaluacionTutor, '') evaluacionTutor, \
        guf.retoFecha fechaLimiteReto, \
        IF(COALESCE(pua.archivoReto, '') <> '' AND NOW() > guf.retoFecha, 1, 0) evaluarUrgente \
        FROM Usuarios u \
        INNER JOIN GrupoUsuarios gu ON gu.usuario=u.id \
        INNER JOIN Grupos g ON gu.grupo=g.id \
        INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
        INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
        INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        INNER JOIN Unidades un ON un.id=pu.unidad \
        LEFT JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad \
        WHERE u.tutor = '"+req.auth.id+"' AND g.id = '"+req.params.id_grupo+"';");

        const [FechaInicio] = await db.sequelize.query("SELECT MIN(fechaApertura) fechaInicio FROM GrupoUnidadFechas WHERE grupo = '"+req.params.id_grupo+"';")

        var nombre_gen = ""
        var fechaInicio = ""
        var datos = {}
        InfoGrupo.forEach( el => {
            if(nombre_gen !== el.Generacion){
                nombre_gen = el.Generacion
            }
            if(typeof datos[el.usuario_id] === "undefined"){
                datos[el.usuario_id] = {
                    usuario_id: el.usuario_id,
                    perfil_id: el.perfil,
                    nombre: el.nombre,
                    ap_paterno: el.apellido_paterno,
                    ap_materno: el.apellido_materno,
                    foto: el.foto,
                    activo: el.activo,
                    email: el.email
                }
            }
            if(typeof datos[el.usuario_id]['unidades'] === "undefined"){
                datos[el.usuario_id]['unidades'] = {}
            }
            if(typeof datos[el.usuario_id]['unidades'] === "object"){
                datos[el.usuario_id]['unidades'][ (el.orden + 1) ] = {
                    unidad_id: el.unidad_id,
                    no_unidad: (el.orden + 1),
                    unidad_nombre: el.nombre_unidad,
                    puaid: el.PuaID,
                    retoSubido: el.archivoReto||'',
                    fechaReto: el.fechaPublicacionReto,
                    promedioTutor: el.promedioOtorgado,
                    evaluacionTutor: el.evaluacionTutor,
                    evaluarUrgente: el.evaluarUrgente,
                    retoFechaLimite: el.fechaLimiteReto
                };
            }
        })

        if(FechaInicio.length > 0){
            fechaInicio = FechaInicio[0].fechaInicio
        }

        return res.status(200).send({
            info_tabla: datos,
            Generacion: nombre_gen,
            fechaInicio: fechaInicio
        })

    } catch (err) {
        return res.status(200).send({
            info_tabla: {},
            Generacion: "",
            fechaInicio: ""
        })
    }
}

let guarda_evaluacion = async (req, res) => {
    const data2Save = {
        evaluacionTutor:        req.body.evaluacion,
        calificacionTutor:      req.body.calificacion,
        fechaTutorEvaluacion:   db.sequelize.literal('CURRENT_TIMESTAMP')
    };
    db.pu_usuario_actividad.update( data2Save, { where: { id: req.params.id } })
    .then( async function(response){ 
        if(response == 1){

            const [CorreoUsuario] = await db.sequelize.query( "SELECT u.id, u.email FROM PU_Usuario_Actividads pu LEFT JOIN Usuarios u ON u.id=pu.usuario WHERE pu.id = '" + req.params.id + "'");
            if(CorreoUsuario.length > 0 ){ 

                ActualizacionPromedios(CorreoUsuario[0].id);
                
                // --
                const access = new aws.Credentials({
                    accessKeyId: process.env.CONF_PRIVATE,
                    secretAccessKey: process.env.CONF_SECRET
                })

                const s3 = new aws.S3({
                    credentials: access,
                    region: process.env.CONF_REGION,
                    signatureVersion: 'v4'
                })

                let uuid = uuidv4()
                let fromMail = "support@dev.programaliftcedis.mx"
                if (process.env.CONF_BUCKET === "static.programaliftcedis.mx") {
                    fromMail = "support@programaliftcedis.mx"
                }

                let emailHtml = `<!doctype html>
                            <html lang="en">
                            <head>
                                <meta charset="utf-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
                                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css" integrity="sha384-xOolHFLEh07PJGoPkLv1IbcEPTNtaed2xpHsD9ESMhqIYd0nLMwNLD69Npy4HI+N" crossorigin="anonymous">
                                <title>LIFT</title>
                            </head>
                            <body>
                                <div class="row" style="margin-top: 50px;">
                                    <div class="offset-1 col-10" style="border: 1px solid #C4C4C4;">
                                        <div class="row">
                                                <div class="col d-flex align-items-center justify-content-start" style="background-color: #D5D7D4; padding: 40px 40px 40px 40px;">
                                                    <img src="https://dev.programalift.mx/assets/images/logoLearner.png" alt="" style="width: 91px; height: 39.93px;">
                                                </div>
                                        </div>
                                        <div class="row">
                                                <div class="col" style="padding: 40px 40px 40px 40px;">
                                                    <div class="row">
                                                        <div class="col d-flex align-items-center justify-content-start">
                                                            <h1 style="font-style: normal; font-weight: 700; font-size: 42px; line-height: 52px;">¡Hola!</h1>
                                                        </div>
                                                    </div>
                                                    <div class="row mt-4">
                                                        <div class="col d-flex align-items-center justify-content-start">
                                                            <h7 style="font-style: normal; font-weight: 400; font-size: 18px; line-height: 28px;">Tu Reto on the Job ha sido evaluado por tu Tutor, ¡ya puedes consultar tu calificación!</h7>
                                                        </div>
                                                    </div>
                                                    <div class="row mt-4">
                                                        <div class="col d-flex align-items-center justify-content-start">
                                                            <h7 style="font-style: normal; font-weight: 400; font-size: 18px; line-height: 28px;"><br/>Saludos, Plataforma LIFT</h7>
                                                        </div>
                                                    </div>
                                                    <div class="row mt-4">
                                                        <div class="col d-flex align-items-center justify-content-start">
                                                        <h7 style="font-style: normal; font-weight: 200; font-size: 14px; line-height: 28px;"><br/><i>Por favor no respondas este correo enviado por sistema. Si tienes dudas o comentarios, contactános en: </i><b>adminlift@intelego.com.mx</b></h7>
                                                        </div>
                                                    </div>
                                                </div>
                                        </div>
                                        <div class="row">
                                                <div class="col d-flex align-items-center justify-content-start"  style="background-color: #222323; padding: 20px 40px 20px 40px;">
                                                    <span style="font-style: normal; font-weight: 700; font-size: 18px; line-height: 28px; color: #DF0024;">#</span><span style="font-style: normal; font-weight: 700; font-size: 18px; line-height: 28px; color: #F6D300;">Caminando</span><span style="font-style: normal; font-weight: 700; font-size: 18px; line-height: 28px; color: #FFFFFF;">Juntos</span>
                                                </div>
                                        </div>
                                    </div>
                                </div>
                            
                                <script src="https://cdn.jsdelivr.net/npm/jquery@3.5.1/dist/jquery.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>
                                <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-Fy6S3B9q64WdZWQUiU+q4/2Lc9npb8tCaSX9FK7E8HnRr0Jz8D6OP9dO5Vg3Q9ct" crossorigin="anonymous"></script>
                            </body>
                            </html>`
                var params = {
                    Destination: { ToAddresses: [CorreoUsuario[0].email] },
                    Message: {
                        Body: {
                            Html: {
                                Charset: "UTF-8",
                                Data: emailHtml
                            },
                            Text: {
                                Charset: "UTF-8",
                                Data: "Tu Reto on the Job ha sido evaluado por tu Tutor, ¡ya puedes consultar tu calificación!"
                            }
                        },
                        Subject: {
                            Charset: "UTF-8",
                            Data: "Evaluación del tutor lista en plataforma" + " - LIFT"
                        }
                    },
                    Source: "'Soporte Programa LIFT' <" + fromMail + ">'",
                };
                var buf = Buffer.from(JSON.stringify(params));

                var dataObjJson = {
                    Bucket: process.env.CONF_BUCKET,
                    Key: 'emails/email_' + uuid + '.json',
                    Body: buf,
                    ContentEncoding: 'base64',
                    ContentType: 'application/json',
                    ACL: 'public-read'
                };

                s3.putObject(dataObjJson, function (err, resp) {
                    if (err) {
                        return res.status(200).send({
                            status:200,
                            mensaje: "Guardado con éxito."
                        })
                    } else {
                        return res.status(200).send({
                            status:200,
                            mensaje: "Guardado con éxito."
                        })
                    }
                });

                // --
            }else{
                return res.status(200).send({
                    status:200,
                    mensaje: "Guardado con éxito."
                })
            }
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

// foro social

let listado_objetos = async (req, res) => {
    // req['auth']={}
    // req.auth.id = 88
    try {
        const [InfoTabla] = await db.sequelize.query("\
        SELECT tmp.ID_Grupo,tmp.ID_Actividad,tmp.Grupo,tmp.Programa,tmp.Unidad,tmp.Modulo,tmp.Actividad,COUNT(DISTINCT(preg.id)) AS Comentarios,COUNT(DISTINCT(res.id)) AS Reply \
        FROM (SELECT g.id ID_Grupo,am.id ID_Actividad,g.nombre Grupo,p.nombre Programa,u.nombre Unidad,m.nombre Modulo,am.nombre Actividad,pu.orden ordenU, pum.orden ordenM, puma.orden ordenA \
            FROM Grupos g \
            LEFT JOIN GrupoUsuarios gu ON gu.grupo = g.id \
            LEFT JOIN GrupoProgramas gp ON gp.grupo = g.id \
            LEFT JOIN Programas p ON p.id = gp.programa \
            LEFT JOIN ProgramaUnidades pu ON pu.programa = p.id \
            LEFT JOIN Unidades u ON u.id = pu.unidad \
            LEFT JOIN ProgramaUnidadModulos pum ON pum.programaUnidad = pu.unidad \
            LEFT JOIN Modulos m ON pum.modulo = m.id \
            LEFT JOIN PrgUniModActividads puma ON puma.programaUnidadModulo = pum.modulo \
            LEFT JOIN ActividadesModulos am ON am.id = puma.actividad \
            WHERE g.id = '"+req.params.id_grupo+"' AND am.activo = 1 \
            GROUP BY am.nombre, g.id \
        ) tmp \
        LEFT JOIN Preguntas preg ON preg.actividad = tmp.ID_Actividad AND preg.grupo = tmp.ID_Grupo \
        LEFT JOIN Respuestas res ON res.pregunta = preg.id \
        GROUP BY tmp.Actividad \
        ORDER BY ordenU ASC, ordenM ASC, ordenA ASC;")

        return res.status(200).send({
            InfoTabla: InfoTabla
        })

    } catch (err) {
        return res.status(200).send({
            InfoTabla: {}
        })
    }
}

let objeto = (req, res) => {
    db.actividadesModulo.findOne({ attributes: ['id','tipo','nombre','descripcion', 'icono', 'foto','imagen_panel','archivo','texto','etiquetas','preguntaLearning','opcional'], where: { id: req.params.id, activo: 1  } })
	.then(function (data) {
		if (!data) {
			return res.status(204).send({
				status: 204,
				mensaje:"Error al obtener actividad."
			})	
		}
        var r_data = data.toJSON()
        return res.status(200).send({
            status:200,
            mensaje: "ok",
            data: r_data
        })
	})
	.catch(err => {
		return res.status(204).send({
			status: 204,
			mensaje:"Error al obtener actividad.",
			err	
		})
	});
}

let getPreguntas = (req, res)=> {
	
	let id_actividad = req.params.id_actividad;
    let id_grupo = req.params.id_grupo;

    db.preguntas.findAll({nest: true, attributes: ['id', 'pregunta', 'fecha', 'usuario'], where: { [Op.and]:[{visible: true}, {actividad: parseInt(id_actividad)}, {grupo:parseInt(id_grupo)}]}, order: [['id', 'DESC'], [db.respuestas, 'id', 'DESC']],
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
}

let agregaPregunta = (req, res)=> {

	let id_actividad = req.params.id_actividad
    let id_grupo = req.params.id_grupo;

	let body = req.body

	if (!req.body.pregunta ||
		!id_actividad) {
		return res.status(204).send({
			status: 204,
			message: "Error al agregar pregunta."
		})
	}

    const data2Create = {
        pregunta: 		body.pregunta,
        grupo: 			id_grupo,
        usuario: 		req.auth.id,
        actividad: 		id_actividad,
        fecha: 			db.sequelize.literal('CURRENT_TIMESTAMP')
    };
    db.preguntas.create(data2Create)
    .then(dataC => {
        db.preguntasUsuarios.create({pregunta: dataC.id, usuario: req.auth.id})
        .then(data => {
            return res.status(200).send({
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

let agregaRespuesta = (req, res)=> {
	let id_pregunta = req.params.id_pregunta
	let body = req.body

	if (!body.respuesta ||
		!id_pregunta) {
		return res.status(200).send({
			status: 204,
			message: "Error al agregar pregunta."
		})
	}

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
                return res.status(200).send({
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

let admin_home_tutor = async (req, res) => {
    try {
        const [InfoGeneral] = await db.sequelize.query("SELECT SUM(gruposAsignados) gruposAsignados, SUM(gruposActivos) gruposActivos, SUM(colaboradoresAsignados) colaboradoresAsignados FROM ( \
            SELECT COUNT(DISTINCT(g.id)) gruposAsignados, 0 gruposActivos, COUNT(DISTINCT(gu.usuario)) colaboradoresAsignados \
            FROM Usuarios u \
            INNER JOIN GrupoUsuarios gu ON gu.usuario=u.id \
            INNER JOIN Grupos g ON gu.grupo=g.id \
            INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
            INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
            INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
            WHERE u.tutor = '"+req.params.id_tutor+"' \
            UNION  \
            SELECT 0 gruposAsignados, COUNT(1) gruposActivos, 0 colaboradoresAsignados FROM ( \
            SELECT MAX(guf.jefeAutoEvFinFecha) jefeAutoEvFinFecha \
            FROM Usuarios u \
            LEFT JOIN GrupoUsuarios gu ON gu.usuario=u.id \
            LEFT JOIN Grupos g ON gu.grupo=g.id \
            INNER JOIN GrupoProgramas gp ON gp.grupo = g.id  \
            INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa  \
            INNER JOIN ProgramaUnidadModulos pum ON pum.programaUnidad = pu.unidad  \
            INNER JOIN PrgUniModActividads puma ON puma.programaUnidadModulo = pum.modulo  \
            INNER JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad \
            WHERE u.tutor = '"+req.params.id_tutor+"' \
            GROUP BY guf.grupo) temp  \
            WHERE jefeAutoEvFinFecha <= NOW()) gral;");

        const [InfoGrupos] = await db.sequelize.query("SELECT id_Generacion generacion_id, Generacion, COUNT(1) colaboradoresTotales, colaboradoresAsignados, fechaApertura, estado, retos_totales, retos_disponibles_para_evaluar, retos_sin_evaluar, retos_evaluados FROM ( \
            SELECT \
            g.id id_Generacion, \
            g.nombre Generacion, \
            0 colaboradoresTotales, \
            COUNT(DISTINCT(gu.usuario)) colaboradoresAsignados, \
            MIN(guf.fechaApertura) fechaApertura, \
            IF(COUNT(IF(COALESCE(pua.archivoReto,'')<>'',1,NULL)) <= 0, 'Aún no disponible', \
            IF(COUNT(IF(COALESCE(pua.archivoReto,'')<>'' AND COALESCE(pua.evaluacionTutor,'')<>'',1,NULL)) > 0 AND COUNT(IF(COALESCE(pua.archivoReto,'')<>'' AND COALESCE(pua.evaluacionTutor,'')<>'',1,NULL)) >= COUNT(pua.id)  , 'Evaluaciones concluidas', \
            IF(COUNT(IF(COALESCE(pua.archivoReto,'')<>'' AND COALESCE(pua.evaluacionTutor,'')='',1,NULL)) = 0, 'Estás al día', \
            'Evaluaciones pendientes') ) ) estado, \
            COUNT(pua.id) retos_totales, \
            COUNT(IF(COALESCE(pua.archivoReto,'')<>'',1,NULL)) retos_disponibles_para_evaluar, \
            COUNT(IF(COALESCE(pua.archivoReto,'')<>'' AND COALESCE(pua.evaluacionTutor,'')='',1,NULL)) retos_sin_evaluar, \
            COUNT(IF(COALESCE(pua.archivoReto,'')<>'' AND COALESCE(pua.evaluacionTutor,'')<>'',1,NULL)) retos_evaluados \
            FROM Usuarios u \
            INNER JOIN GrupoUsuarios gu ON gu.usuario=u.id \
            INNER JOIN Grupos g ON gu.grupo=g.id \
            INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
            INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa  \
            INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
            LEFT JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad \
            WHERE u.tutor = '"+req.params.id_tutor+"' \
            GROUP BY g.id) resumen \
            LEFT JOIN GrupoUsuarios gu ON gu.grupo = resumen.id_Generacion \
            GROUP BY gu.grupo;");

        const [InfoHeadTabla] = await db.sequelize.query("SELECT SUM(colaboradoresTotales) colaboradoresTotales, SUM(colaboradoresPendientes) colaboradoresPendientes FROM ( \
            SELECT  \
                0 colaboradoresTotales, COUNT(DISTINCT (gu.usuario)) colaboradoresPendientes \
            FROM \
                Usuarios u \
            INNER JOIN GrupoUsuarios gu ON gu.usuario = u.id \
            INNER JOIN Grupos g ON gu.grupo = g.id \
            INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
            INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
            INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
            WHERE \
                u.tutor = '"+req.params.id_tutor+"' AND COALESCE(pua.archivoReto, '') <> '' AND COALESCE(pua.evaluacionTutor,'') = '' \
            UNION \
            SELECT  \
                COUNT(DISTINCT (gu.usuario)) colaboradoresTotales, 0 colaboradoresPendientes \
            FROM \
                Usuarios u \
            INNER JOIN GrupoUsuarios gu ON gu.usuario = u.id \
            INNER JOIN Grupos g ON gu.grupo = g.id \
            INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
            INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
            INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
            ) temp;")

    
        return res.status(200).send({
            General: InfoGeneral,
            Grupos: InfoGrupos,
            HeadTabla: InfoHeadTabla
        })

    } catch (err) {
        return res.status(200).send({
            General: [],
            Grupos: [],
            HeadTabla: []
        })
    }
}

let admin_usuarios_grupo = async (req, res) => {
    try {
        const [InfoGrupo] = await db.sequelize.query("SELECT \
        u.id usuario_id, \
        u.perfil perfil, \
        g.id GrupoID, \
        g.nombre Generacion, \
        u.nombre 'nombre', \
        u.apellido_paterno, \
        u.apellido_materno, \
        u.email, \
        CONCAT(u.apellido_paterno,' ', u.apellido_materno) Apellido, \
        u.foto foto, \
        u.activo activo, \
        pua.id PuaID, \
        pu.orden, \
        un.id unidad_id, \
        un.nombre nombre_unidad, \
        COALESCE(pua.archivoReto, '') archivoReto, \
        pua.fechaRetoGuardado fechaPublicacionReto, \
        COALESCE(pua.calificacionTutor, '') promedioOtorgado, \
        COALESCE(pua.evaluacionTutor, '') evaluacionTutor, \
        guf.retoFecha fechaLimiteReto, \
        IF(COALESCE(pua.archivoReto, '') <> '' AND NOW() > guf.retoFecha, 1, 0) evaluarUrgente \
        FROM Usuarios u \
        INNER JOIN GrupoUsuarios gu ON gu.usuario=u.id \
        INNER JOIN Grupos g ON gu.grupo=g.id \
        INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
        INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
        INNER JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        INNER JOIN Unidades un ON un.id=pu.unidad \
        LEFT JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad \
        WHERE u.tutor = '"+req.params.id_tutor+"' AND g.id = '"+req.params.id_grupo+"';");

        const [FechaInicio] = await db.sequelize.query("SELECT MIN(fechaApertura) fechaInicio FROM GrupoUnidadFechas WHERE grupo = '"+req.params.id_grupo+"';")

        var nombre_gen = ""
        var fechaInicio = ""
        var datos = {}
        InfoGrupo.forEach( el => {
            if(nombre_gen !== el.Generacion){
                nombre_gen = el.Generacion
            }
            if(typeof datos[el.usuario_id] === "undefined"){
                datos[el.usuario_id] = {
                    usuario_id: el.usuario_id,
                    perfil_id: el.perfil,
                    nombre: el.nombre,
                    ap_paterno: el.apellido_paterno,
                    ap_materno: el.apellido_materno,
                    foto: el.foto,
                    activo: el.activo,
                    email: el.email
                }
            }
            if(typeof datos[el.usuario_id]['unidades'] === "undefined"){
                datos[el.usuario_id]['unidades'] = {}
            }
            if(typeof datos[el.usuario_id]['unidades'] === "object"){
                datos[el.usuario_id]['unidades'][ (el.orden + 1) ] = {
                    unidad_id: el.unidad_id,
                    no_unidad: (el.orden + 1),
                    unidad_nombre: el.nombre_unidad,
                    puaid: el.PuaID,
                    retoSubido: el.archivoReto||'',
                    fechaReto: el.fechaPublicacionReto,
                    promedioTutor: el.promedioOtorgado,
                    evaluacionTutor: el.evaluacionTutor,
                    evaluarUrgente: el.evaluarUrgente,
                    retoFechaLimite: el.fechaLimiteReto
                };
            }
        })

        if(FechaInicio.length > 0){
            fechaInicio = FechaInicio[0].fechaInicio
        }

        return res.status(200).send({
            info_tabla: datos,
            Generacion: nombre_gen,
            fechaInicio: fechaInicio
        })

    } catch (err) {
        return res.status(200).send({
            info_tabla: {},
            Generacion: "",
            fechaInicio: ""
        })
    }
}

module.exports = {
    home_tutor,
    usuarios_grupo,
    guarda_evaluacion,
    listado_objetos,
    objeto,
    getPreguntas,
    agregaPregunta,
    agregaRespuesta,
    admin_home_tutor,
    admin_usuarios_grupo
}