var aws = require('aws-sdk');
// const dns = require('dns')
const db = require("../modelos");
const { v4: uuidv4 } = require('uuid');


const logger = require('../config/logger');

const S3_BUCKET = process.env.CONF_BUCKET
const CF_URL = process.env.CONF_CF_URL

let sign_s3 = (req, res) => {

    const fileName = req.body.fileName
    const fileType = req.body.fileType
    const fileKey = req.body.fileKey

    const url_key = `${fileKey}/${fileName}`
    const access = new aws.Credentials({
        accessKeyId: process.env.CONF_PRIVATE,
        secretAccessKey: process.env.CONF_SECRET
    })

    const s3 = new aws.S3({
        credentials: access,
        region: process.env.CONF_REGION,
        signatureVersion: 'v4'
    })

    const s3Params = {
        Bucket: S3_BUCKET,
        Key: url_key,
        ContentType: fileType,
        ACL: 'public-read',
        Expires: 60 * 5
    }

    s3.getSignedUrl('putObject', s3Params, (err, data) => {
        if (err) {
            res.json({ success: false, error: err })
        } else {
            const returnData = {
                signedRequest: data,
                url: `https://${CF_URL}/${url_key}`
            }
            res.json({ success: true, data: { returnData } })
        }
    })
}

let recuperar_contrasenia = (req, res) => {
    let body = req.body;
    db.usuarios.findOne({ where: { username: body.username } })
        .then(function (data) {
            if (!data) {
                return res.status(204).send({
                    status: 200,
                    mensajeSuccess: false,
                    mensajeError: "Usuario no existe."
                })
            }

            const access = new aws.Credentials({
                accessKeyId: process.env.CONF_PRIVATE,
                secretAccessKey: process.env.CONF_SECRET
            })

            const s3 = new aws.S3({
                credentials: access,
                region: process.env.CONF_REGION,
                signatureVersion: 'v4'
            })

            if (data.activo === false) {
                return res.status(200).send({
                    status: 200,
                    mensajeSuccess: false,
                    mensajeError: "Usuario inactivo."
                })
            } else {
                let uuid = uuidv4()
                const data2Update = { reset_key: uuid }

                let urlRecuperar = "https://dev.programaliftcedis.mx/reset/" + data.username + "/" + uuid
                let fromMail = "support@dev.programaliftcedis.mx"
                if (process.env.CONF_BUCKET === "static.programaliftcedis.mx") {
                    urlRecuperar = "https://www.programaliftcedis.mx/reset/" + data.username + "/" + uuid
                    fromMail = "support@programaliftcedis.mx"
                }

                db.usuarios.update(data2Update, { where: { id: data.id } })
                    .then(async function (response) {
                        if (response == 1) {

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
                                            <div class="col d-flex align-items-center justify-content-start" style="background: linear-gradient(180deg, #263440 0%, #222323 100%); padding: 40px 40px 40px 40px;">
                                                <img src="https://dev.programaliftcedis.mx/assets/images/logoCorreo.png" alt="" style="width: 218px; height: 52px;">
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
                                                            <h7 style="font-style: normal; font-weight: 400; font-size: 18px; line-height: 28px;">Hemos recibido tu solicitud para recuperar la contraseña de tu cuenta, haz clic en el siguiente botón para reestablecerla.</h7>
                                                        </div>
                                                    </div>
                                                    <div class="row" style="margin-top: 30px;">
                                                        <div class="col" style="display: flex; justify-content: center; width: 100%;"> 
                                                            <a class=\"ulink btn btn-primary\" href=\"${urlRecuperar}\" target=\"_blank\" style="background: linear-gradient(180deg, #F25836 0%, #DF0024 100%); border-radius: 10px; color: #FFFFFF; font-style: normal; font-weight: 700; font-size: 18px; line-height: 28px; border-radius: 10px; border: 1px solid transparent; padding: 0.5rem 1rem; color: #fff; text-decoration: none;">RECUPERAR CONTRASEÑA</a>
                                                        </div>
                                                    </div>
                                                    <div class="row" style="margin-top: 30px;">
                                                        <div class="col">
                                                            <p style="font-style: normal; font-weight: 400; font-size: 18px; line-height: 28px;">Si tú no realizaste la solicitud te pedimos ignorar esta acción. <br> Saludos, Plataforma LIFT</p>
                                                        </div>
                                                    </div>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col d-flex align-items-center justify-content-start"  style="background-color: #222323; padding: 20px 40px 20px 40px;">
                                                    <span style="font-style: normal; font-weight: 700; font-size: 18px; line-height: 28px; color: #F6D300;">#</span><span style="font-style: normal; font-weight: 400; font-size: 18px; line-height: 28px; color: #FFFFFF;">Evolucionamos</span><span style="font-style: normal; font-weight: 700; font-size: 18px; line-height: 28px; color: #DF0024;">Juntos</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                        
                                <script src="https://cdn.jsdelivr.net/npm/jquery@3.5.1/dist/jquery.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>
                                <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-Fy6S3B9q64WdZWQUiU+q4/2Lc9npb8tCaSX9FK7E8HnRr0Jz8D6OP9dO5Vg3Q9ct" crossorigin="anonymous"></script>
                                </body>
                            </html>`
                            var params = {
                                Destination: { ToAddresses: [data.email] },
                                Message: {
                                    Body: {
                                        Html: {
                                            Charset: "UTF-8",
                                            Data: emailHtml
                                            // Data: "Dar click en la siguiente liga para reestablecer su contraseña: <a class=\"ulink\" href=\""+urlRecuperar+"\" target=\"_blank\">[Reestablecer Contraseña]</a>."
                                        },
                                        Text: {
                                            Charset: "UTF-8",
                                            Data: "This is the message body in text format."
                                        }
                                    },
                                    Subject: {
                                        Charset: "UTF-8",
                                        Data: "Recuperar contraseña - LIFT"
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
                                        status: 200,
                                        mensajeSuccess: false,
                                        mensajeError: "Ocurrio un error, intente de nuevo o contacte a soporte."
                                    })
                                } else {
                                    return res.status(200).send({
                                        status: 200,
                                        mensajeSuccess: "Se ha enviado un correo con instrucciones para reestablecer su contraseña",
                                        mensajeError: false
                                    })
                                }
                            });

                            // await s3.upload(dataObjJson).promise().then(function (s3RedData) {
                            //     logger.info(" Haqui vamos bien 3")
                            //     return res.status(200).send({
                            //         status: 200,
                            //         mensajeSuccess: "Se ha enviado un correo con instrucciones para reestablecer su contraseña",
                            //         mensajeError: false
                            //     })      
                            // }, function(err) {
                            //     logger.info(" Haqui vamos bien 3 - Error")
                            //     logger.info( JSON.stringify(err) ) 

                            // });

                        } else {
                            return res.status(204).send({
                                status: 200,
                                mensajeSuccess: false,
                                mensajeError: "Ocurrio un error, intente de nuevo o contacte a soporte."
                            })
                        }
                    }).catch(err => {
                        logger.error(err)
                        return res.status(204).send({
                            status: 200,
                            mensajeSuccess: false,
                            mensajeError: "Ocurrio un error, intente de nuevo o contacte a soporte."
                        })
                    })
            }
        })
        .catch(err => {
            console.log(err)
            return res.status(204).send({
                status: 200,
                mensajeSuccess: false,
                mensajeError: "Ocurrio un error, intente de nuevo o contacte a soporte."
            })
        })
}

let contactoTutor = (req, res) => {
    let body = req.body;
    db.usuarios.findOne({ where: { email: body.correo } })
        .then(function (data) {
            if (!data) {
                return res.status(204).send({
                    status: 200,
                    mensajeSuccess: false,
                    mensajeError: "Usuario no existe."
                })
            }

            const access = new aws.Credentials({
                accessKeyId: process.env.CONF_PRIVATE,
                secretAccessKey: process.env.CONF_SECRET
            })

            const s3 = new aws.S3({
                credentials: access,
                region: process.env.CONF_REGION,
                signatureVersion: 'v4'
            })

            if (data.activo === false) {
                return res.status(200).send({
                    status: 200,
                    mensajeSuccess: false,
                    mensajeError: "Usuario inactivo."
                })
            } else {
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
                            <div class="col d-flex align-items-center justify-content-start" style="background: linear-gradient(180deg, #263440 0%, #222323 100%); padding: 40px 40px 40px 40px;">
                                <img src="https://dev.programaliftcedis.mx/assets/images/logoCorreo.png" alt="" style="width: 218px; height: 52px;">
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
                                            <h7 style="font-style: normal; font-weight: 400; font-size: 18px; line-height: 28px;">${body.mensaje.replace(/\n/g, "<br/>")}</h7>
                                        </div>
                                    </div>
                                    <div class="row mt-4">
                                        <div class="col d-flex align-items-center justify-content-start">
                                            <h7 style="font-style: normal; font-weight: 400; font-size: 18px; line-height: 28px;"><br/>Saludos, Plataforma LIFT</h7>
                                        </div>
                                    </div>
                                    <div class="row mt-4">
                                        <div class="col d-flex align-items-center justify-content-start">
                                            <span style="font-style: normal; font-weight: 200; font-size: 14px; line-height: 28px;"><br /><i>Por favor no respondas este correo enviado por sistema. Si tienes dudas o comentarios, contactános en: </i><span style="color: #DF0024;"><b>adminlift@intelego.com.mx</b></span></h7>
                                        </div>
                                    </div>
                                </div>
                        </div>
                        <div class="row">
                            <div class="col d-flex align-items-center justify-content-start"  style="background-color: #222323; padding: 20px 40px 20px 40px;">
                            <span style="font-style: normal; font-weight: 700; font-size: 18px; line-height: 28px; color: #F6D300;">#</span><span style="font-style: normal; font-weight: 400; font-size: 18px; line-height: 28px; color: #FFFFFF;">Evolucionamos</span><span style="font-style: normal; font-weight: 700; font-size: 18px; line-height: 28px; color: #DF0024;">Juntos</span>
                            </div>
                        </div>
                    </div>
                </div>
            
                <script src="https://cdn.jsdelivr.net/npm/jquery@3.5.1/dist/jquery.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>
                <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-Fy6S3B9q64WdZWQUiU+q4/2Lc9npb8tCaSX9FK7E8HnRr0Jz8D6OP9dO5Vg3Q9ct" crossorigin="anonymous"></script>
            </body>
            </html>`
                var params = {
                    Destination: { ToAddresses: [data.email] },
                    Message: {
                        Body: {
                            Html: {
                                Charset: "UTF-8",
                                Data: emailHtml
                                // Data: "Dar click en la siguiente liga para reestablecer su contraseña: <a class=\"ulink\" href=\""+urlRecuperar+"\" target=\"_blank\">[Reestablecer Contraseña]</a>."
                            },
                            Text: {
                                Charset: "UTF-8",
                                Data: body.mensaje
                            }
                        },
                        Subject: {
                            Charset: "UTF-8",
                            Data: body.asunto + " - LIFT"
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
                            status: 200,
                            mensajeSuccess: false,
                            mensajeError: "Ocurrio un error, intente de nuevo o contacte a soporte."
                        })
                    } else {
                        return res.status(200).send({
                            status: 200,
                            mensajeSuccess: "Se ha enviado un correo con instrucciones para reestablecer su contraseña",
                            mensajeError: false
                        })
                    }
                });
            }
        })
        .catch(err => {
            console.log(err)
            return res.status(204).send({
                status: 200,
                mensajeSuccess: false,
                mensajeError: "Ocurrio un error, intente de nuevo o contacte a soporte."
            })
        })
}

let correo_automatico = (req, res) => {
    let body = req.body;

    let fromMail = "support@dev.programaliftcedis.mx"
    if (process.env.CONF_BUCKET === "static.programaliftcedis.mx") {
        fromMail = "support@programaliftcedis.mx"
    }

    let arrelgoCorreos = [] 
    let fechaSQL = new Date()
    const offset = fechaSQL.getTimezoneOffset()
    fechaSQL = new Date(fechaSQL.getTime() - (offset*60*1000))
    fechaSQL = fechaSQL.toISOString().split('T')[0]
    // fechaSQL = '2022-09-29'

    let sub_correo_1 = "Apertura del Reto on the Job."
    let msg_correo_1 = "Recuerda que a partir del [sesionFecha] el Reto on the Job estará habilitado para que comiences a desarrollarlo; tienes hasta el [retoFecha] para subirlo a la plataforma LIFT."
    let sth_correo_1 = `SELECT 
        g.nombre, u.id, u.username, u.email, un.nombre, guf.sesionFecha, guf.retoFecha, guf.jefeAutoEvInicioFecha, guf.jefeAutoEvFinFecha
    FROM
        Usuarios u
    INNER JOIN GrupoUsuarios gu ON gu.usuario = u.id
    INNER JOIN Grupos g ON gu.grupo = g.id
    INNER JOIN GrupoProgramas gp ON gp.grupo = g.id
    INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa
    INNER JOIN Unidades un ON un.id = pu.unidad
    LEFT JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad
    WHERE guf.sesionFecha = '${fechaSQL}';`

    let sub_correo_2 = "Cierre del Reto on the Job."
    let msg_correo_2 = "¡Ha llegado el último día! Recuerda que hoy, [retoFecha], es la fecha límite para subir tu Reto on the Job en la plataforma LIFT. ¡Que no se te pase!"
    let sth_correo_2 = `SELECT 
	    g.nombre, u.id, u.username, u.email, un.nombre, guf.sesionFecha, guf.retoFecha, guf.jefeAutoEvInicioFecha, guf.jefeAutoEvFinFecha
    FROM
        Usuarios u
    INNER JOIN GrupoUsuarios gu ON gu.usuario = u.id
    INNER JOIN Grupos g ON gu.grupo = g.id
    INNER JOIN GrupoProgramas gp ON gp.grupo = g.id
    INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa
    INNER JOIN Unidades un ON un.id = pu.unidad
    LEFT JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad
    WHERE guf.retoFecha = '${fechaSQL}';`

    let sub_correo_3 = "Inicio de periodo de sesiones 1 a 1 con tu Jefe."
    let msg_correo_3 = "El periodo para llevar a cabo la sesión  1 a 1 con tu jefe comienza el [jefeAutoEvInicioFecha] y concluye el [jefeAutoEvFinFecha], es muy importante tener contestada tu autoevaluación de aprendizajes clave para esta sesión. ¡Asegúrate de agendar con tu Jefe!"
    let sth_correo_3 = `SELECT 
        g.nombre, u.id, u.username, u.email, un.nombre, guf.sesionFecha, guf.retoFecha, guf.jefeAutoEvInicioFecha, guf.jefeAutoEvFinFecha
    FROM
        Usuarios u
    INNER JOIN GrupoUsuarios gu ON gu.usuario = u.id
    INNER JOIN Grupos g ON gu.grupo = g.id
    INNER JOIN GrupoProgramas gp ON gp.grupo = g.id
    INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa
    INNER JOIN Unidades un ON un.id = pu.unidad
    LEFT JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad
    WHERE guf.jefeAutoEvInicioFecha = '${fechaSQL}';`
    
    let sub_correo_4 = "Fin de periodo de sesiones 1 a 1 con tu Jefe."
    let msg_correo_4 = "Hoy concluye el periodo para llevar a cabo la sesión 1 a 1 con tu jefe, recuerda que esta sesión es clave para tu aprendizaje y representa una parte importante de tu evaluación final del programa. ¡Asegúrate de que suceda!"
    let sth_correo_4 = `SELECT 
        g.nombre, u.id, u.username, u.email, un.nombre, guf.sesionFecha, guf.retoFecha, guf.jefeAutoEvInicioFecha, guf.jefeAutoEvFinFecha
    FROM
        Usuarios u
    INNER JOIN GrupoUsuarios gu ON gu.usuario = u.id
    INNER JOIN Grupos g ON gu.grupo = g.id
    INNER JOIN GrupoProgramas gp ON gp.grupo = g.id
    INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa
    INNER JOIN Unidades un ON un.id = pu.unidad
    LEFT JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad
    WHERE guf.jefeAutoEvFinFecha = '${fechaSQL}';`

    let sub_correo_5 = "Apertura de autoevaluación de aprendizajes clave."
    let msg_correo_5 = "Ya puedes contestar tu autoevaluación de Aprendizajes Clave en la plataforma LIFT. Estará disponible a partir del [fechaInicioAutoEvaluacion] y debes responderla antes de la sesión 1 a 1 con tu jefe, es muy importante que la lleves."
    let sth_correo_5 = `SELECT 
        g.nombre, u.id, u.username, u.email, un.nombre, guf.sesionFecha, guf.retoFecha, guf.jefeAutoEvInicioFecha, guf.jefeAutoEvFinFecha, fechaInicioAutoEvaluacion
    FROM
        Usuarios u
    INNER JOIN GrupoUsuarios gu ON gu.usuario = u.id
    INNER JOIN Grupos g ON gu.grupo = g.id
    INNER JOIN GrupoProgramas gp ON gp.grupo = g.id
    INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa
    INNER JOIN Unidades un ON un.id = pu.unidad
    LEFT JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad
    WHERE guf.fechaInicioAutoEvaluacion = '${fechaSQL}';`

    let sub_correo_6 = "Apertura de la próxima Unidad."
    let msg_correo_6 = "¡Es hoy! Comienza con la Unidad [orden]: “[nombre]”. Revisa los objetos de aprendizaje de esta Unidad y sácales el mayor provecho para convertirte en un Líder del Futuro. ¡Adelante!"
    let sth_correo_6 = `SELECT 
        g.nombre, u.id, u.username, u.email, pu.orden+1 orden, un.nombre, guf.sesionFecha, guf.retoFecha, guf.jefeAutoEvInicioFecha, guf.jefeAutoEvFinFecha
    FROM
        Usuarios u
    INNER JOIN GrupoUsuarios gu ON gu.usuario = u.id
    INNER JOIN Grupos g ON gu.grupo = g.id
    INNER JOIN GrupoProgramas gp ON gp.grupo = g.id
    INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa
    INNER JOIN Unidades un ON un.id = pu.unidad
    LEFT JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad
    WHERE guf.fechaApertura= '${fechaSQL}';`

    let correos_array = [
        {msg: msg_correo_1, sth: sth_correo_1, sub: sub_correo_1}, 
        // {msg: msg_correo_2, sth: sth_correo_2, sub: sub_correo_2},
        {msg: msg_correo_3, sth: sth_correo_3, sub: sub_correo_3},
        {msg: msg_correo_4, sth: sth_correo_4, sub: sub_correo_4},
        {msg: msg_correo_5, sth: sth_correo_5, sub: sub_correo_5},
        {msg: msg_correo_6, sth: sth_correo_6, sub: sub_correo_6},
    ]

    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

    var promise = new Promise((resolve, reject) => {
        correos_array.forEach( async (el, index, array) => { 
            
            const [Correos] = await db.sequelize.query( el.sth );
            if(Correos.length > 0 ){ 

                Correos.forEach( elC => {

                    let mensajeCorreo = el.msg;

                    if(mensajeCorreo.indexOf('[sesionFecha]') > 0){
                        let fecha = new Date(elC.sesionFecha+"T00:00:00");
                        mensajeCorreo = mensajeCorreo.replace('[sesionFecha]', fecha.getDate() + " de " + meses[fecha.getMonth()]);
                    }
                    if(mensajeCorreo.indexOf('[retoFecha]') > 0){
                        let fecha = new Date(elC.retoFecha+"T00:00:00");
                        mensajeCorreo = mensajeCorreo.replace('[retoFecha]', fecha.getDate() + " de " + meses[fecha.getMonth()]);
                    }
                    if(mensajeCorreo.indexOf('[jefeAutoEvInicioFecha]') > 0){
                        let fecha = new Date(elC.jefeAutoEvInicioFecha+"T00:00:00");
                        mensajeCorreo = mensajeCorreo.replace('[jefeAutoEvInicioFecha]', fecha.getDate() + " de " + meses[fecha.getMonth()]);
                    }
                    if(mensajeCorreo.indexOf('[jefeAutoEvFinFecha]') > 0){
                        let fecha = new Date(elC.jefeAutoEvFinFecha+"T00:00:00");
                        mensajeCorreo = mensajeCorreo.replace('[jefeAutoEvFinFecha]', fecha.getDate() + " de " + meses[fecha.getMonth()]);
                    }
                    if(mensajeCorreo.indexOf('[fechaInicioAutoEvaluacion]') > 0){
                        let fecha = new Date(elC.fechaInicioAutoEvaluacion+"T00:00:00");
                        mensajeCorreo = mensajeCorreo.replace('[fechaInicioAutoEvaluacion]', fecha.getDate() + " de " + meses[fecha.getMonth()]);
                    }
                    if(mensajeCorreo.indexOf('[nombre]') > 0){
                        mensajeCorreo = mensajeCorreo.replace('[nombre]', elC.nombre);
                    }
                    if(mensajeCorreo.indexOf('[orden]') > 0){
                        mensajeCorreo = mensajeCorreo.replace('[orden]', elC.orden);
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
                                            <div class="col d-flex align-items-center justify-content-start" style="background: linear-gradient(180deg, #263440 0%, #222323 100%); padding: 40px 40px 40px 40px;">
                                                <img src="https://dev.programaliftcedis.mx/assets/images/logoCorreo.png" alt="" style="width: 218px; height: 52px;">
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
                                                            <h7 style="font-style: normal; font-weight: 400; font-size: 18px; line-height: 28px;">${mensajeCorreo}</h7>
                                                    </div>
                                                </div>
                                                <div class="row mt-4">
                                                    <div class="col d-flex align-items-center justify-content-start">
                                                            <h7 style="font-style: normal; font-weight: 400; font-size: 18px; line-height: 28px;"><br/>Saludos, Plataforma LIFT</h7>
                                                    </div>
                                                </div>
                                                <div class="row mt-4">
                                                    <div class="col d-flex align-items-center justify-content-start">
                                                            <span style="font-style: normal; font-weight: 200; font-size: 14px; line-height: 28px;"><br /><i>Por favor no respondas este correo enviado por sistema. Si tienes dudas o comentarios, contactános en: </i><span style="color: #DF0024;"><b>adminlift@intelego.com.mx</b></span></h7>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col d-flex align-items-center justify-content-start"  style="background-color: #222323; padding: 20px 40px 20px 40px;">
                                                <span style="font-style: normal; font-weight: 700; font-size: 18px; line-height: 28px; color: #F6D300;">#</span><span style="font-style: normal; font-weight: 400; font-size: 18px; line-height: 28px; color: #FFFFFF;">Evolucionamos</span><span style="font-style: normal; font-weight: 700; font-size: 18px; line-height: 28px; color: #DF0024;">Juntos</span>
                                            </div>
                                        </div>
                                </div>
                            </div>
                        
                            <script src="https://cdn.jsdelivr.net/npm/jquery@3.5.1/dist/jquery.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>
                            <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-Fy6S3B9q64WdZWQUiU+q4/2Lc9npb8tCaSX9FK7E8HnRr0Jz8D6OP9dO5Vg3Q9ct" crossorigin="anonymous"></script>
                        </body>
                    </html>`
                    var params = {
                        Destination: { ToAddresses: [elC.email]/*[elC.email]*/ },
                        Message: {
                            Body: {
                                Html: {
                                    Charset: "UTF-8",
                                    Data: emailHtml
                                },
                                Text: {
                                    Charset: "UTF-8",
                                    Data: "Mensaje"
                                }
                            },
                            Subject: {
                                Charset: "UTF-8",
                                Data: el.sub + " - LIFT"
                            }
                        },
                        Source: "'Soporte Programa LIFT' <" + fromMail + ">'",
                    };
                    arrelgoCorreos.push( params )
                })
            }
            if (index === array.length -1) resolve();
        })
    });

    promise.then(() => {
        var promises = arrelgoCorreos.map( mail => {
            return enviarCorreo( mail )
        })
        Promise.all( promises )
		.then(( response_promises ) => {
            logger.info( JSON.stringify({
                correosPorEnviar: arrelgoCorreos.length,
                correosEnviados: response_promises.length,
                respuesta: response_promises
			}) )
			return res.status(200).send({
				status: 200,
				mensaje:"OK",
                correosPorEnviar: arrelgoCorreos.length,
                correosEnviados: response_promises.length,
                respuesta: response_promises
			})	
		})
    })

}

let enviarCorreo = (params) => {
    const miPromesa = new Promise((resolve, reject) => {

        let uuid = uuidv4()

        const access = new aws.Credentials({
            accessKeyId: process.env.CONF_PRIVATE,
            secretAccessKey: process.env.CONF_SECRET
        })
    
        const s3 = new aws.S3({
            credentials: access,
            region: process.env.CONF_REGION,
            signatureVersion: 'v4'
        })
    
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
            logger.info( "Procesado -> " + JSON.stringify(params.Destination.ToAddresses) + " " + JSON.stringify(params.Message.Subject.Data) )
            if (err) {
                reject(new Error('Oops!..' + err))
            } 
            resolve("Procesado -> " + JSON.stringify(params.Destination.ToAddresses) + " " + JSON.stringify(params.Message.Subject.Data))
        });
    })
    return miPromesa
}

module.exports = {
    sign_s3,
    recuperar_contrasenia,
    contactoTutor,
    correo_automatico
}