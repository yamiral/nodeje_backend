const db = require("../modelos");
const _ = require("lodash");
const logger = require('../config/logger');
const serviceInsignias = require("../services/insignias");
var aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
var excelJS = require("exceljs");
const Stream = require('stream');

const S3_BUCKET = process.env.CONF_BUCKET
const CF_URL = process.env.CONF_CF_URL

const { ActualizacionPromedios } = require("../services/services");

let grupos_jefe = async (req, res) => {
    
    try {
        const [InfoGrupo] = await db.sequelize.query("SELECT g.* \
        FROM GrupoUsuarios gu \
        LEFT JOIN Grupos g ON gu.grupo = g.id \
        LEFT JOIN Usuarios u ON gu.usuario = u.id \
        WHERE u.jefe_directo = "+req.auth.id+" \
        GROUP BY g.id;");
        
        var datos = {}
    
        return res.status(200).send({
            rows: InfoGrupo,
            total: InfoGrupo.length
        })

    } catch (err) {
        return res.status(403).send({
            info_grupo: [],
            nombre_grupo: '',
            fecha_inicio: ''
        })
    }
}

let consulta_grupo = async (req, res) => {
    try {
        const [InfoGrupo] = await db.sequelize.query("SELECT \
        g.id grupo_id, g.nombre grupo_nombre, u.id usuario_id, u.perfil, u.nombre, u.apellido_paterno, u.apellido_materno, u.foto, u.activo, p.id programa_id, \
        p.nombre nombre_programa, un.id unidad_id, un.nombre nombre_unidad, pu.orden, pua.caso, pua.reto, pua.archivoReto, pua.encuesta, pua.evaluacion, \
        COALESCE(IF(COALESCE(guc.ev_enviada,0) = 1, guc.promedio, NULL),0) calificacion_jefe, IF(COALESCE(guc.evaluacion,'') = '', 0, 1) evaluacion_jefe, IF(COALESCE(guc.acuerdos,'') = '', 0, 1) acuerdos_jefe, COALESCE(guc.ev_enviada,0) evaluacion_enviada, guf.retoFecha reto_fecha_limite \
        FROM GrupoUsuarios gu \
        LEFT JOIN Grupos g ON gu.grupo = g.id \
        LEFT JOIN Usuarios u ON gu.usuario = u.id \
        LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo \
        LEFT JOIN Programas p ON gp.programa = p.id \
        LEFT JOIN ProgramaUnidades pu ON pu.programa = p.id \
        LEFT JOIN Unidades un ON pu.unidad = un.id \
        LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        LEFT JOIN GU_Cal_Jefe_Unidads guc ON guc.gu_id=gu.id AND guc.unidad=un.id \
        LEFT JOIN GrupoUnidadFechas guf ON guf.grupo=g.id AND guf.unidad=un.id \
        WHERE gu.grupo = "+req.params.grupo+" \ AND u.jefe_directo = "+req.auth.id+" \
        ORDER BY pu.orden ASC;");
        
        var datos = {}
        var calificaciones = {};
        InfoGrupo.forEach( el => {
            if(typeof datos[el.usuario_id] === "undefined"){
                datos[el.usuario_id] = {
                    usuario_id: el.usuario_id,
                    perfil_id: el.perfil,
                    nombre: el.nombre,
                    ap_paterno: el.apellido_paterno,
                    ap_materno: el.apellido_materno,
                    foto: el.foto,
                    activo: el.activo
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
                    casoTerminado: el.caso,
                    retoTerminado: el.reto,
                    retoSubido: el.archivoReto||'',
                    calificacionJefe: el.calificacion_jefe,
                    evaluacionJefe: el.evaluacion_jefe,
                    acuerdosJefe: el.acuerdos_jefe,
                    evalEnviada: el.evaluacion_enviada,
                    retoFechaLimite: el.reto_fecha_limite
                };
            }
        })

        Object.keys(datos).forEach(us => {
            var suma = 0, total = 0;
            // logger.info( JSON.stringify(datos[us]) )
            // logger.info( JSON.stringify(us) )
            Object.keys(datos[us]['unidades']).forEach( k => {    
                if(datos[us]['unidades'][k].calificacionJefe > 0){
                    suma += datos[us]['unidades'][k].calificacionJefe;
                    total++;
                }
            })
            datos[us]['promedioGral'] = suma / total 
        })
        
        const [InfoGrupoTabla] = await db.sequelize.query("SELECT g.id grupo_id, g.nombre grupo_nombre, MIN(guf.fechaApertura) fechaApertura \
                                                    FROM GrupoUsuarios gu \
                                                        LEFT JOIN Grupos g ON gu.grupo = g.id \
                                                        LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo \
                                                        LEFT JOIN Programas p ON gp.programa = p.id \
                                                        LEFT JOIN ProgramaUnidades pu ON pu.programa = p.id \
                                                        LEFT JOIN Unidades un ON pu.unidad = un.id \
                                                        LEFT JOIN GrupoUnidadFechas guf ON guf.grupo=g.id AND guf.unidad=un.id \
                                                    WHERE gu.grupo = "+req.params.grupo+";");

        
        return res.status(200).send({
            info_grupo: datos,
            nombre_grupo: InfoGrupoTabla[0].grupo_nombre,
            fecha_inicio: InfoGrupoTabla[0].fechaApertura
        })

    } catch (err) {
        return res.status(403).send({
            info_grupo: [],
            nombre_grupo: '',
            fecha_inicio: ''
        })
    }
}

let export_analiticos_jefe = async (req, res) => {
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
    

        try {
            let where = '';
            let where_i = '';
            if(req.params.grupo > 0){
                where += ' AND g.id = \'' + req.params.grupo + '\'';
                where_i += ' WHERE grupo = \'' + req.params.grupo + '\'';
            }
    
            const [InfoGral] = await db.sequelize.query(`SELECT 
                COUNT(1) total, 
                COUNT(IF(COALESCE(password,'')='',NULL,1)) activos, 
                COUNT(IF(COALESCE(password,'')<>'',NULL,1)) inactivos  
            FROM Usuarios 
            WHERE es_jefe = 1 AND id IN (SELECT 
                    uj.id jefe_id
                FROM GrupoUsuarios gu 
                LEFT JOIN Grupos g ON gu.grupo = g.id 
                LEFT JOIN Usuarios u ON gu.usuario = u.id 
                LEFT JOIN Usuarios uj ON uj.id=u.jefe_directo
                LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo 
                LEFT JOIN Programas p ON gp.programa = p.id 
                LEFT JOIN ProgramaUnidades pu ON pu.programa = p.id 
                LEFT JOIN Unidades un ON pu.unidad = un.id 
                LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id 
                LEFT JOIN GU_Cal_Jefe_Unidads guc ON guc.gu_id=gu.id AND guc.unidad=un.id 
                LEFT JOIN GrupoUnidadFechas guf ON guf.grupo=g.id AND guf.unidad=un.id 
                WHERE u.jefe_directo > 0 ${where}
                ORDER BY pu.orden ASC);`);
    
            const [InfoGrupo] = await db.sequelize.query(`SELECT 
                uj.id jefe_id,
                uj.foto foto_jefe,
                uj.nombre nombre_jefe,
                uj.username username_jefe,
                CONCAT( uj.apellido_paterno, ' ', uj.apellido_materno) apellidos_jefe, 
                IF(COALESCE(uj.password,'')='','inactivo', 'activo') activo_jefe,
                u.id usuario_id,
                u.nombre, 
                u.apellido_paterno, 
                u.apellido_materno, 
                u.foto, 
                u.activo, 
                p.id programa_id, 
                p.nombre nombre_programa, 
                un.id unidad_id, 
                un.nombre nombre_unidad, 
                pu.orden, 
                pua.caso, 
                pua.reto, 
                pua.archivoReto, 
                pua.encuesta, 
                pua.evaluacion, 
                COALESCE(IF(COALESCE(guc.ev_enviada,0) = 1, guc.promedio, NULL),0) calificacion_jefe, IF(COALESCE(guc.evaluacion,'') = '', 0, 1) evaluacion_jefe, IF(COALESCE(guc.acuerdos,'') = '', 0, 1) acuerdos_jefe, COALESCE(guc.ev_enviada,0) evaluacion_enviada, 
                guf.retoFecha reto_fecha_limite
            FROM GrupoUsuarios gu 
            LEFT JOIN Grupos g ON gu.grupo = g.id 
            LEFT JOIN Usuarios u ON gu.usuario = u.id 
            LEFT JOIN Usuarios uj ON uj.id=u.jefe_directo
            LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo 
            LEFT JOIN Programas p ON gp.programa = p.id 
            LEFT JOIN ProgramaUnidades pu ON pu.programa = p.id 
            LEFT JOIN Unidades un ON pu.unidad = un.id 
            LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id 
            LEFT JOIN GU_Cal_Jefe_Unidads guc ON guc.gu_id=gu.id AND guc.unidad=un.id 
            LEFT JOIN GrupoUnidadFechas guf ON guf.grupo=g.id AND guf.unidad=un.id 
            WHERE u.jefe_directo > 0 ${where}
            ORDER BY pu.orden ASC;`);
            
            const [InsJefes] = await db.sequelize.query(`SELECT ij.usuario, COUNT(1) total FROM InsigniasJefes ij ${where_i} GROUP BY ij.usuario;`);
    
            var datos = {}
            var datos_j = {}
            var jefe_arr = []
            var headers_t = []
            InfoGrupo.forEach( el => {
                if(typeof datos_j[el.jefe_id] === "undefined"){
                    let insignias_obtenidas = 0;
                    if(InsJefes.length > 0){
                        let insJefe = InsJefes.filter( ins => parseInt(ins.usuario) === parseInt(el.jefe_id) );
                        if(insJefe.length > 0){
                            insignias_obtenidas = insJefe[0].total
                        }
                    }
                    datos_j[el.jefe_id] = {
                        id_jefe: el.jefe_id,
                        username: el.username_jefe,
                        nombre: el.nombre_jefe,
                        apellidos: el.apellidos_jefe,
                        foto: el.foto_jefe,
                        pendientes_calificar: 0,
                        insignias: insignias_obtenidas
                    }
                }
                // --
                if(typeof datos[el.usuario_id] === "undefined"){
                    datos[el.usuario_id] = {
                        usuario_id: el.usuario_id,
                        perfil_id: el.perfil,
                        nombre: el.nombre,
                        ap_paterno: el.apellido_paterno,
                        ap_materno: el.apellido_materno,
                        foto: el.foto,
                        activo: el.activo,
                        nombre_jefe: el.nombre_jefe,
                        apellidos_jefe: el.apellidos_jefe,
                        foto_jefe: el.foto_jefe,
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
                        casoTerminado: el.caso,
                        retoTerminado: el.reto,
                        retoSubido: el.archivoReto||'',
                        calificacionJefe: el.calificacion_jefe,
                        evaluacionJefe: el.evaluacion_jefe,
                        acuerdosJefe: el.acuerdos_jefe,
                        evalEnviada: el.evaluacion_enviada,
                        retoFechaLimite: el.reto_fecha_limite
                    };
                    if(datos[el.usuario_id]['unidades'][ (el.orden + 1) ].retoSubido !== '' && datos[el.usuario_id]['unidades'][ (el.orden + 1) ].evaluacionJefe === 0){
                        datos_j[el.jefe_id].pendientes_calificar += 1;
                    }else if(datos[el.usuario_id]['unidades'][ (el.orden + 1) ].retoSubido !== '' && datos[el.usuario_id]['unidades'][ (el.orden + 1) ].evaluacionJefe === 1 && datos[el.usuario_id]['unidades'][ (el.orden + 1) ].evalEnviada === 0) {
                        datos_j[el.jefe_id].pendientes_calificar += 1;
                    }
                }
            })
    
            Object.keys(datos).forEach(us => {
                var suma = 0, total = 0;
                Object.keys(datos[us]['unidades']).forEach( k => {    
                    if(datos[us]['unidades'][k].calificacionJefe > 0){
                        suma += datos[us]['unidades'][k].calificacionJefe;
                        total++;
                    }
                })
                datos[us]['promedioGral'] = suma / total 
            })
    
            let info = [];
            Object.values(datos).forEach((usuario, index) => {
                let infoUsuario = {};
                let estatusAvance = 0;
                infoUsuario['nombre_jefe'] = usuario.nombre_jefe;
                infoUsuario['apellidos_jefe'] = usuario.apellidos_jefe;
                infoUsuario['foto_jefe'] = usuario.foto_jefe;
                infoUsuario['id'] = usuario.usuario_id;
                infoUsuario['activo'] = usuario.activo;
                infoUsuario['foto'] = usuario.foto;
                infoUsuario['nombre'] = usuario.nombre;
                infoUsuario['apellidos'] = usuario.ap_paterno + ' ' + usuario.ap_materno;
                Object.values(usuario.unidades).forEach((unidad, index) => {
                     let fechaHoy = new Date();
                     var uFecha2 = unidad.retoFechaLimite + ' ' + '00:00:00'
                     var arr2 = uFecha2.split(/[- :]/);
                     let fechaLimite = new Date(arr2[0], arr2[1]-1, arr2[2], arr2[3], arr2[4], arr2[5]); //DateFix();
                     if(unidad.retoSubido === '' && fechaHoy > fechaLimite){
                          estatusAvance = 1;
                     }
                     let celda = ''; 
                     if(unidad.retoSubido !== '' && unidad.evaluacionJefe === 0){
                          celda = 'Prepara evaluación';
                     }else if(unidad.retoSubido !== '' && unidad.evaluacionJefe === 1 && unidad.evalEnviada === 0) {
                          celda = 'Enviar calificación';
                     }else if(unidad.retoSubido !== '' && unidad.evaluacionJefe === 1 && unidad.evalEnviada === 1){
                          celda = unidad.calificacionJefe.toFixed(1);
                     }else {
                          celda = 'Aún no disponible';
                     }
                     infoUsuario['unidad'+unidad.no_unidad] = celda;
                     infoUsuario['reto'+unidad.no_unidad] = unidad.retoSubido;
                     infoUsuario['evaluacionJefe'+unidad.no_unidad] = unidad.evaluacionJefe;
                     infoUsuario['evalEnviada'+unidad.no_unidad] = unidad.evalEnviada;
                     infoUsuario['calificacionJefe'+unidad.no_unidad] = unidad.calificacionJefe;
                });
                infoUsuario['avance'] = estatusAvance;
                infoUsuario['promedio'] = (usuario.promedioGral ? usuario.promedioGral.toFixed(1) : '0');
                info.push(infoUsuario);
           });

           Object.keys(datos_j).forEach(idx => { jefe_arr.push(datos_j[idx]) });
            
           var sheet1 = workbook1.addWorksheet('General');
            sheet1.columns = [
                {header:'Total', key:'total'},
                {header:'Activos', key:'activos'},
                {header:'Inactivos', key:'inactivos'}
            ];
            InfoGral.forEach( el => {
                let row = {}
                sheet1.columns.forEach(header => {
                    row[header.key] = el[ header.key ]
                })
                sheet1.addRow(row);
            })
            sheet1.commit();

            var sheet2 = workbook1.addWorksheet('Desempeño');
            sheet2.columns = [
                {header:'Username', key:'username'},
                {header:'Nombre', key:'nombre'},
                {header:'Apellidos', key:'apellidos'},
                {header:'Usuarios pendientes de calificar', key:'pendientes_calificar'},
                {header:'Insignias conseguidas', key:'insignias'}
            ];
            jefe_arr.forEach( el => {
                let row = {}
                sheet2.columns.forEach(header => {
                    row[header.key] = el[ header.key ]
                })
                sheet2.addRow(row);
            })
            sheet2.commit();

            var sheet3 = workbook1.addWorksheet('Tabla General');
            sheet3.columns = [
                {header:'Nombre Jefe', key:'nombre_jefe'},
                {header:'Nombre Learner', key:'nombre'},
                {header:'Apellidos', key:'apellidos'},
                {header:'Calif. Unidad 1', key:'calificacionJefe1'},
                {header:'Calif. Unidad 2', key:'calificacionJefe2'},
                {header:'Calif. Unidad 3', key:'calificacionJefe3'}
            ];
            info.forEach( el => {
                let row = {}
                sheet3.columns.forEach(header => {
                    row[header.key] = el[ header.key ]
                })
                sheet3.addRow(row);
            })
            sheet3.commit();
        
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
            const filename = 'Reporte_Jefe_'+ d.getDate() + "_" + (d.getMonth() + 1) + "_" + d.getFullYear() + "_" + d.getHours() + "_" + d.getMinutes() + ".xlsx";
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
    
        } catch (err) {
            logger.error( err );
            return res.status(403).send({
                general: [],
                desempenio: [],
                tabla: []
            })
        }

    
}

let analiticos_jefe = async (req, res) => {
    try {
        let where = '';
        let where_i = '';
        if(req.params.grupo > 0){
            where += ' AND g.id = \'' + req.params.grupo + '\'';
            where_i += ' WHERE grupo = \'' + req.params.grupo + '\'';
        }

        const [InfoGral] = await db.sequelize.query(`SELECT 
            COUNT(1) total, 
            COUNT(IF(COALESCE(password,'')='',NULL,1)) activos, 
            COUNT(IF(COALESCE(password,'')<>'',NULL,1)) inactivos  
        FROM Usuarios 
        WHERE es_jefe = 1 AND id IN (SELECT 
                uj.id jefe_id
            FROM GrupoUsuarios gu 
            LEFT JOIN Grupos g ON gu.grupo = g.id 
            LEFT JOIN Usuarios u ON gu.usuario = u.id 
            LEFT JOIN Usuarios uj ON uj.id=u.jefe_directo
            LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo 
            LEFT JOIN Programas p ON gp.programa = p.id 
            LEFT JOIN ProgramaUnidades pu ON pu.programa = p.id 
            LEFT JOIN Unidades un ON pu.unidad = un.id 
            LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id 
            LEFT JOIN GU_Cal_Jefe_Unidads guc ON guc.gu_id=gu.id AND guc.unidad=un.id 
            LEFT JOIN GrupoUnidadFechas guf ON guf.grupo=g.id AND guf.unidad=un.id 
            WHERE u.jefe_directo > 0 ${where}
            ORDER BY pu.orden ASC);`);

        const [InfoGrupo] = await db.sequelize.query(`SELECT 
            uj.id jefe_id,
            uj.foto foto_jefe,
            uj.nombre nombre_jefe,
            uj.username username_jefe,
            CONCAT( uj.apellido_paterno, ' ', uj.apellido_materno) apellidos_jefe, 
            IF(COALESCE(uj.password,'')='','inactivo', 'activo') activo_jefe,
            u.id usuario_id,
            u.nombre, 
            u.apellido_paterno, 
            u.apellido_materno, 
            u.foto, 
            u.activo, 
            p.id programa_id, 
            p.nombre nombre_programa, 
            un.id unidad_id, 
            un.nombre nombre_unidad, 
            pu.orden, 
            pua.caso, 
            pua.reto, 
            pua.archivoReto, 
            pua.encuesta, 
            pua.evaluacion, 
            COALESCE(IF(COALESCE(guc.ev_enviada,0) = 1, guc.promedio, NULL),0) calificacion_jefe, IF(COALESCE(guc.evaluacion,'') = '', 0, 1) evaluacion_jefe, IF(COALESCE(guc.acuerdos,'') = '', 0, 1) acuerdos_jefe, COALESCE(guc.ev_enviada,0) evaluacion_enviada, 
            guf.retoFecha reto_fecha_limite
        FROM GrupoUsuarios gu 
        LEFT JOIN Grupos g ON gu.grupo = g.id 
        LEFT JOIN Usuarios u ON gu.usuario = u.id 
        LEFT JOIN Usuarios uj ON uj.id=u.jefe_directo
        LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo 
        LEFT JOIN Programas p ON gp.programa = p.id 
        LEFT JOIN ProgramaUnidades pu ON pu.programa = p.id 
        LEFT JOIN Unidades un ON pu.unidad = un.id 
        LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id 
        LEFT JOIN GU_Cal_Jefe_Unidads guc ON guc.gu_id=gu.id AND guc.unidad=un.id 
        LEFT JOIN GrupoUnidadFechas guf ON guf.grupo=g.id AND guf.unidad=un.id 
        WHERE u.jefe_directo > 0 ${where}
        ORDER BY pu.orden ASC;`);
        
        const [InsJefes] = await db.sequelize.query(`SELECT ij.usuario, COUNT(1) total FROM InsigniasJefes ij ${where_i} GROUP BY ij.usuario;`);

        var datos = {}
        var datos_j = {}
        var jefe_arr = []
        InfoGrupo.forEach( el => {
            if(typeof datos_j[el.jefe_id] === "undefined"){
                let insignias_obtenidas = 0;
                if(InsJefes.length > 0){
                    let insJefe = InsJefes.filter( ins => parseInt(ins.usuario) === parseInt(el.jefe_id) );
                    if(insJefe.length > 0){
                        insignias_obtenidas = insJefe[0].total
                    }
                }
                datos_j[el.jefe_id] = {
                    id_jefe: el.jefe_id,
                    username: el.username_jefe,
                    nombre: el.nombre_jefe,
                    apellidos: el.apellidos_jefe,
                    foto: el.foto_jefe,
                    pendientes_calificar: 0,
                    insignias: insignias_obtenidas
                }
            }
            // --
            if(typeof datos[el.usuario_id] === "undefined"){
                datos[el.usuario_id] = {
                    usuario_id: el.usuario_id,
                    perfil_id: el.perfil,
                    nombre: el.nombre,
                    ap_paterno: el.apellido_paterno,
                    ap_materno: el.apellido_materno,
                    foto: el.foto,
                    activo: el.activo,
                    nombre_jefe: el.nombre_jefe,
                    apellidos_jefe: el.apellidos_jefe,
                    foto_jefe: el.foto_jefe,
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
                    casoTerminado: el.caso,
                    retoTerminado: el.reto,
                    retoSubido: el.archivoReto||'',
                    calificacionJefe: el.calificacion_jefe,
                    evaluacionJefe: el.evaluacion_jefe,
                    acuerdosJefe: el.acuerdos_jefe,
                    evalEnviada: el.evaluacion_enviada,
                    retoFechaLimite: el.reto_fecha_limite
                };
                if(datos[el.usuario_id]['unidades'][ (el.orden + 1) ].retoSubido !== '' && datos[el.usuario_id]['unidades'][ (el.orden + 1) ].evaluacionJefe === 0){
                    datos_j[el.jefe_id].pendientes_calificar += 1;
                }else if(datos[el.usuario_id]['unidades'][ (el.orden + 1) ].retoSubido !== '' && datos[el.usuario_id]['unidades'][ (el.orden + 1) ].evaluacionJefe === 1 && datos[el.usuario_id]['unidades'][ (el.orden + 1) ].evalEnviada === 0) {
                    datos_j[el.jefe_id].pendientes_calificar += 1;
                }
            }
        })

        Object.keys(datos).forEach(us => {
            var suma = 0, total = 0;
            Object.keys(datos[us]['unidades']).forEach( k => {    
                if(datos[us]['unidades'][k].calificacionJefe > 0){
                    suma += datos[us]['unidades'][k].calificacionJefe;
                    total++;
                }
            })
            datos[us]['promedioGral'] = suma / total 
        })

        let info = [];
        Object.values(datos).forEach((usuario, index) => {
            let infoUsuario = {};
            let estatusAvance = 0;
            infoUsuario['nombre_jefe'] = usuario.nombre_jefe;
            infoUsuario['apellidos_jefe'] = usuario.apellidos_jefe;
            infoUsuario['foto_jefe'] = usuario.foto_jefe;
            infoUsuario['id'] = usuario.usuario_id;
            infoUsuario['activo'] = usuario.activo;
            infoUsuario['foto'] = usuario.foto;
            infoUsuario['nombre'] = usuario.nombre;
            infoUsuario['apellidos'] = usuario.ap_paterno + ' ' + usuario.ap_materno;
            Object.values(usuario.unidades).forEach((unidad, index) => {
                 let fechaHoy = new Date();
                 var uFecha2 = unidad.retoFechaLimite + ' ' + '00:00:00'
                 var arr2 = uFecha2.split(/[- :]/);
                 let fechaLimite = new Date(arr2[0], arr2[1]-1, arr2[2], arr2[3], arr2[4], arr2[5]); //DateFix();
                 if(unidad.retoSubido === '' && fechaHoy > fechaLimite){
                      estatusAvance = 1;
                 }
                 let celda = ''; 
                 if(unidad.retoSubido !== '' && unidad.evaluacionJefe === 0){
                      celda = 'Prepara evaluación';
                 }else if(unidad.retoSubido !== '' && unidad.evaluacionJefe === 1 && unidad.evalEnviada === 0) {
                      celda = 'Enviar calificación';
                 }else if(unidad.retoSubido !== '' && unidad.evaluacionJefe === 1 && unidad.evalEnviada === 1){
                      celda = unidad.calificacionJefe.toFixed(1);
                 }else {
                      celda = 'Aún no disponible';
                 }
                 infoUsuario['unidad'+unidad.no_unidad] = celda;
                 infoUsuario['reto'+unidad.no_unidad] = unidad.retoSubido;
                 infoUsuario['evaluacionJefe'+unidad.no_unidad] = unidad.evaluacionJefe;
                 infoUsuario['evalEnviada'+unidad.no_unidad] = unidad.evalEnviada;
                 infoUsuario['calificacionJefe'+unidad.no_unidad] = unidad.calificacionJefe;
            });
            infoUsuario['avance'] = estatusAvance;
            infoUsuario['promedio'] = (usuario.promedioGral ? usuario.promedioGral.toFixed(1) : '0');
            info.push(infoUsuario);
        });

        Object.keys(datos_j).forEach(idx => { jefe_arr.push(datos_j[idx]) });
        
        return res.status(200).send({
            general: InfoGral,
            desempenio: jefe_arr,
            tabla: info
        })

    } catch (err) {
        logger.error( err );
        return res.status(403).send({
            general: [],
            desempenio: [],
            tabla: []
        })
    }
}

let consulta_usuario_unidad = async (req, res) => {

    try {
        const [Info] = await db.sequelize.query("SELECT \
        u.id usuario_id, u.nombre usuario_nombre, u.apellido_paterno apellido_p, u.apellido_materno apellido_m, u.foto usuario_foto, un.id unidad_id, un.nombre unidad_nombre, pu.orden unidad_orden, guc.promedio promedio_calificacion, guc.ev_enviada evaluacion_jefe_enviada, guc.evaluacion evaluacion_jefe, guc.acuerdos acuerdos_jefe, pua.encuesta evDeUnidad, pua.evaluacion evAprClave, guf.jefeAutoEvInicioFecha  \
        FROM Usuarios u \
        LEFT JOIN GrupoUsuarios gu ON gu.usuario=u.id \
        LEFT JOIN GrupoProgramas gp ON gp.grupo=gu.grupo \
        LEFT JOIN Programas p ON p.id=gp.programa \
        LEFT JOIN ProgramaUnidades pu ON pu.programa=p.id \
        LEFT JOIN Unidades un ON un.id=pu.unidad \
        LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        LEFT JOIN GU_Cal_Jefe_Unidads guc ON guc.gu_id=gu.id AND guc.unidad=un.id \
        LEFT JOIN GrupoUnidadFechas guf ON guf.grupo=gu.grupo AND guf.unidad=un.id \
        WHERE u.id = "+req.params.id_usuario+" AND un.id = "+req.params.id_unidad+";");

        var datos = {}
        datos['dataUnidad'] = {
            id: Info[0].unidad_id,
            nombre: Info[0].unidad_nombre,
            orden: Info[0].unidad_orden
        }
        datos['dataUsuario'] = {
            id: Info[0].usuario_id,
            nombre: Info[0].usuario_nombre,
            apellido_paterno: Info[0].apellido_p,
            apellido_materno: Info[0].apellido_m,
            foto: Info[0].usuario_foto,
            promedio_calificacion: Info[0].promedio_calificacion,  
            evaluacion_jefe_enviada: Info[0].evaluacion_jefe_enviada,  
            evaluacion_jefe: Info[0].evaluacion_jefe, 
            acuerdos_jefe: Info[0].acuerdos_jefe,
            evDeUnidad: Info[0].evDeUnidad,
            evAprClave: Info[0].evAprClave,
            inicio1a1: Info[0].jefeAutoEvInicioFecha
        }

        return res.status(200).send({
            info: datos
        })

    } catch (err) {

        return res.status(200).send({
            info: {
                dataUsuario: [],
                dataUnidad: []
            }
        })

    }
}

let guarda_evaluacion = async (req, res) => {
    let body = req.body

    try {
        const [Info] = await db.sequelize.query("SELECT * FROM GrupoUsuarios WHERE usuario = "+body.id_usuario+" AND grupo = "+body.id_grupo+";");
        if( Info.length === 0 ){
            return res.status(403).send({success: false})
        }

        // check if already exists
        const [Exists] = await db.sequelize.query("SELECT * FROM GU_Cal_Jefe_Unidads WHERE gu_id = "+Info[0].id+" AND unidad = "+body.id_unidad+";");
        if( Exists.length === 0 ){
            const data2Create = {
                gu_id: Info[0].id,
                unidad: body.id_unidad,
                promedio: body.promedio,
                evaluacion: body.evaluacion,
                acuerdos: body.acuerdos || null,
                ev_enviada: body.terminar_ev || false,
                fecha_ev: db.sequelize.literal('CURRENT_TIMESTAMP')
            };
            db.gu_cal_jefe_unidad.create(data2Create)
            .then(data => {
                ActualizacionPromedios(body.id_usuario);
                return res.status(200).send({success: true})
            })
            .catch(err => {
                logger.info("Error: " + err)
                return res.status(403).send({success: false})
            });
        }else{
            const data2Update = {
                promedio: body.promedio,
                evaluacion: body.evaluacion,
                ev_enviada: body.ev_enviada,
                fecha_ev: db.sequelize.literal('CURRENT_TIMESTAMP')
            };
            db.gu_cal_jefe_unidad.update(data2Update, { where: { id:  Exists[0].id} })
            .then(async data => {

                ActualizacionPromedios(body.id_usuario);
                const [Info] = await db.sequelize.query("SELECT * FROM GrupoUsuarios WHERE usuario = "+body.id_usuario+" AND grupo = "+body.id_grupo+";");
                if( Info.length === 0 ){
                    return res.status(403).send({success: false})
                }
                let arrelgoCorreos = [] 
                //--
                const [CorreoUsuario] = await db.sequelize.query( `SELECT u.nombre, u.email, COUNT(DISTINCT(pu.id)) TotalEvs, SUM(ev_enviada) EvsEnviadas
                FROM GrupoUsuarios gu  
                LEFT JOIN Usuarios u ON gu.usuario = u.id
                LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo 
                LEFT JOIN ProgramaUnidades pu ON pu.programa = gp.programa 
                LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id 
                LEFT JOIN GU_Cal_Jefe_Unidads guc ON guc.gu_id = gu.id AND guc.unidad = pu.unidad
                WHERE gu.usuario = '${body.id_usuario}'
                ORDER BY pu.orden ASC;`);
                if(CorreoUsuario.length > 0 && data2Update.ev_enviada == 1){ 
                    // --
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
                                                                <h7 style="font-style: normal; font-weight: 400; font-size: 18px; line-height: 28px;">Tu Jefe te ha evaluado. Consulta los resultados en tu perfil.</h7>
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
                                    Data: "Tu Jefe te ha evaluado. Consulta los resultados en tu perfil."
                                }
                            },
                            Subject: {
                                Charset: "UTF-8",
                                Data: "Jefe envió evaluación." + " - LIFT"
                            }
                        },
                        Source: "'Soporte Programa LIFT' <" + fromMail + ">'",
                    };
                    arrelgoCorreos.push( params );
                    if(CorreoUsuario[0].TotalEvs == CorreoUsuario[0].EvsEnviadas){
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
                                                                    <h7 style="font-style: normal; font-weight: 400; font-size: 18px; line-height: 28px;">Tus calificaciones están completas. Consulta tu promedio final en plataforma.</h7>
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
                                        Data: "Tus calificaciones están completas. Consulta tu promedio final en plataforma."
                                    }
                                },
                                Subject: {
                                    Charset: "UTF-8",
                                    Data: "Resultados de evaluación disponible" + " - LIFT"
                                }
                            },
                            Source: "'Soporte Programa LIFT' <" + fromMail + ">'",
                        };
                        arrelgoCorreos.push( params )
                    }
                }
                //--
                var promises = arrelgoCorreos.map( mail => {
                    return enviarCorreo( mail )
                })
                Promise.all( promises )
                .then(( responsePromises ) => {
                    return serviceInsignias.obtieneInsignia(req, res, 'jefe', 200, {success: true})
                })
            })
            .catch(err => {
                logger.info("Error: " + err)
                return res.status(403).send({success: false})
            });
        }
    } catch (err) {
        logger.error( err )
        return res.status(403).send({success: false})
    }
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
            // logger.info( "Procesado -> " + JSON.stringify(params.Destination.ToAddresses) + " " + JSON.stringify(params.Message.Subject.Data) )
            if (err) {
                reject(new Error('Oops!..' + err))
            } 
            resolve("Procesado -> " + JSON.stringify(params.Destination.ToAddresses) + " " + JSON.stringify(params.Message.Subject.Data))
        });
    })
    return miPromesa
}

let guarda_acuerdos = async (req, res) => {
    let body = req.body

    try {
        const [Info] = await db.sequelize.query("SELECT * FROM GrupoUsuarios WHERE usuario = "+body.id_usuario+" AND grupo = "+body.id_grupo+";");
        if( isNaN(parseInt(Info[0].id)) ){
            return res.status(403).send({success: false})
        }

        // check if already exists
        const [Exists] = await db.sequelize.query("SELECT * FROM GU_Cal_Jefe_Unidads WHERE gu_id = "+Info[0].id+" AND unidad = "+body.id_unidad+";");
        if( isNaN(parseInt(Exists[0].id)) ){
            // No puede guardar acuerdos si no ha realizado borrador?
            return res.status(403).send({success: false})
        }else{
            const data2Update = {
                acuerdos: body.acuerdos
            };
            db.gu_cal_jefe_unidad.update(data2Update, { where: { id:  Exists[0].id} })
            .then(data => {
                return res.status(200).send({success: true})
            })
            .catch(err => {
                logger.info("Error: " + err)
                return res.status(403).send({success: false})
            });
        }

    } catch (err) {
        logger.error( err )
        return res.status(403).send({success: false})
    }
}

let consulta_uno_a_uno = async (req, res) => {

    try {
        const [Info] = await db.sequelize.query("SELECT p.nombre nombre_programa, un.id unidad_id, un.nombre nombre_unidad, pu.orden, \
        COALESCE(guc.promedio,0) calificacion_jefe, COALESCE(guc.evaluacion,'') evaluacion_jefe, COALESCE(guc.acuerdos,'') acuerdos_jefe, COALESCE(guc.ev_enviada,0) evaluacion_enviada \
        FROM GrupoUsuarios gu \
        LEFT JOIN Grupos g ON gu.grupo = g.id \
        LEFT JOIN Usuarios u ON gu.usuario = u.id \
        LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo \
        LEFT JOIN Programas p ON gp.programa = p.id \
        LEFT JOIN ProgramaUnidades pu ON pu.programa = p.id \
        LEFT JOIN Unidades un ON pu.unidad = un.id \
        LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        LEFT JOIN GU_Cal_Jefe_Unidads guc ON guc.gu_id=gu.id AND guc.unidad=un.id \
        LEFT JOIN GrupoUnidadFechas guf ON guf.grupo=g.id AND guf.unidad=un.id \
        WHERE u.id = "+req.auth.id+" \
        ORDER BY pu.orden ASC;");

        return res.status(200).send({
            data: Info
        })

    } catch (err) {
        logger.error( err )
        return res.status(403).send({success: false})
    }
    
}

let guias_jefe = async (req, res) => {

    try {
        const [Info] = await db.sequelize.query("SELECT g.id grupo_id, g.nombre grupo_nombre, un.nombre unidad_nombre, pu.orden, guf.guiaObservacion, guf.conoceCompetencia, g.guiaRetroalimentacion FROM Grupos g \
        LEFT JOIN GrupoProgramas gp ON gp.grupo = g.id \
        LEFT JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
        LEFT JOIN GrupoUnidadFechas guf ON guf.grupo = g.id AND guf.unidad = pu.unidad \
        LEFT JOIN Unidades un ON pu.unidad = un.id \
        WHERE g.id = "+req.params.id_grupo+" \
        ORDER BY pu.orden ASC;");

        return res.status(200).send({...Info})

    } catch (err) {
        logger.error( err )
        return res.status(403).send({success: false})
    }
    
}

let insignias_jefe = (req, res) => {
	db.usuarios.findOne({ 
        where: {id: req.auth.id},
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
				const [InsigniasGanadas] = await db.sequelize.query("SELECT * FROM InsigniasJefes WHERE grupo = '"+req.params.id_grupo+"' AND usuario = '"+req.auth.id+"';")
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

module.exports = {
    grupos_jefe,
	consulta_grupo,
    consulta_usuario_unidad,
    guarda_evaluacion,
    guarda_acuerdos,
    consulta_uno_a_uno,
    guias_jefe,
    insignias_jefe,
    analiticos_jefe,
    export_analiticos_jefe
}