const db = require("../modelos");
const logger = require("../config/logger");
const Op = db.Sequelize.Op;
let InfoModulosUnidades = [];
let TmpInfoModulosUnidades = [];

let getInfoModulos = (req, res, id_unidad) => {
    db.modulos.findAll({raw: true, nest: true,
        attributes: ['id', 'nombre', 'descripcion','icono'], where: {activo: true}, order: [[db.unidades, db.programaUnidadModulo, 'orden', 'ASC' ]],
        include: [{model: db.unidades, required: true, attributes: ['id', 'nombre', 'descripcion'], where: {id: id_unidad},
            include: [{model: db.programas,required: true, attributes: [], where: {perfil: req.auth.perfil},
                include: [{model: db.grupos,required: true,attributes: [],
                    include: [{model: db.usuarios, where: { id: req.auth.id }, required: true,attributes: []}]
                }]
            }]
        }]
    })
    .then(function (response) {

        let unidad = response.map(u => ({
            id: u.Unidades.id,
            nombre: u.Unidades.nombre,
            descripcion: u.Unidades.descripcion,
            orden: u.Unidades.Programas.ProgramaUnidades.orden+1
        }))

        var grupo = 0;
        var programaUnidad = 0;
        unidad = [...new Map(unidad.map(item => [item['id'], item])).values()]

        var modulos = response.map( (m) =>{
            return {
                id: m.id,
                nombre: m.nombre, 
                descripcion: m.descripcion,
                actFinalizadas: [],
                idsActividades: [],
                actsObligatorias: [], //T, ER, P
                actsObligatoriasPerc: [], //P, A, V
                actsFinalizadasObl: [], 
                actsFinalizadasPerc: [],
                moduloTerminado: false,
                progreso: 0,
                progresoObl: 0,
                progresoOblPerc: 0,
                icono: m.icono,
                orden: m.Unidades.ProgramaUnidadModulo.orden+1
            }
        })

        var promises = modulos.map( (m) => {
            return db.actividadesModulo.findAll({raw: true, nest: true,
                attributes: ['id', 'nombre', 'descripcion','tipo','icono','foto','imagen_panel','opcional'], where: {activo: true}, order: [[db.modulos, db.programaUnidadModuloActividad, 'orden', 'ASC' ]],
                include: [{model: db.modulos, required: true, attributes: ['id', 'nombre', 'descripcion'], where: {id: m.id}, order: [[db.unidades, db.programaUnidadModulo, 'orden', 'ASC' ]],
                    include: [{model: db.unidades, required: true, attributes: ['id', 'nombre', 'descripcion'], where: {id: unidad[0].id},
                        include: [{model: db.programas,required: true, attributes: [], where: {perfil: req.auth.perfil},
                            include: [{model: db.grupos,required: true,attributes: [],
                                include: [{model: db.usuarios, where: { id: req.auth.id }, required: true,attributes: []}]
                            }]
                        }]
                    }]
                }]
            })
            .then(function (response) {

                let actividades = response.map(m => ({
                    id: m.id,
                    grupo: m.Modulos.Unidades.Programas.Grupos.Usuarios.GrupoUsuarios.grupo,
                    prgUnidad: m.Modulos.Unidades.Programas.ProgramaUnidades.id,
                    opcional: m.opcional,
                    tipo: m.tipo
                }))
        
                actividades.forEach( (a) => { 
                    m.idsActividades.push(a.id); 

                    if([1,4,5].indexOf(a.tipo) !== -1){
                        m.actsObligatorias.push(a.id);
                    }
                    if([1,2,3].indexOf(a.tipo) !== -1){
                        m.actsObligatoriasPerc.push(a.id);
                    }
                    grupo = a.grupo; 
                    programaUnidad = a.prgUnidad;
                })
            })
            .catch(err => {
                logger.error( "err2: " + err )
            })
        })

        let usuario = req.auth.id
        Promise.all( promises )
        .then(( respone_promises ) => {

            var innerPromises = modulos.map( (m) => {
                return db.actModCheck.findAll({raw: true, nest: true, where: { actividad: {[Op.in]: m.idsActividades}, usuario: usuario, completada: true } })
                .then(function (actividadesFinalizadas) {

                    let acts = actividadesFinalizadas.map(a => ({
                        id: a.actividad
                    }))

                    //Finalizadas obligatorias
                    acts.forEach( (a) => { 
                        if(m.actsObligatorias.filter( actO => actO === a.id).length > 0){
                            m.actsFinalizadasObl.push(a.id)
                        }
                        
                        if(m.actsObligatoriasPerc.filter( actO => actO === a.id).length > 0){
                            m.actsFinalizadasPerc.push(a.id)
                        }
                        
                    })

                    acts.forEach( (a) => { m.actFinalizadas.push(a.id) } )
                })
            })
        
            Promise.all( innerPromises )
            .then(( respone_innerPromises ) => {

                modulos.forEach( (m) => { 
                    //Progreso general
                    m.progreso = ( ( m.actFinalizadas.length * 100) / m.idsActividades.length ) 
                    //Progreso Obligatorias P, T, ER
                    m.progresoObl = ( ( m.actsFinalizadasObl.length * 100) / m.actsObligatorias.length ) 
                    //Progreso Obligatorias Porcentage P, A, V
                    m.progresoOblPerc = ( ( m.actsFinalizadasPerc.length * 100) / m.actsObligatoriasPerc.length )

                    //>= 75% de Actividades P, A y V && >= 100% de Actividades P, T, ER se marca como terminado modulo 
                    if( m.progresoObl >= 100 && m.progresoOblPerc >= 75 ){
                        m.moduloTerminado = true
                    }

                } )				

                var informacion = {
                    caso: false,
					reto: false,
					encuesta: false,
					evaluacion: false,
					archivoReto: null,
					jsonEncuesta: null,
					jsonAutoEvaluacion: null,
					autoEvaluacion: null,
					encuestaSatisfaccion: null,
					evaluacion: false,
					pares: []
                };

                db.pu_usuario_actividad.findOne({ where: { programaUnidad: programaUnidad, usuario: req.auth.id } })
                .then(function (data) {
                    if (data) {
                        let modulosFinalizados = true;
                        modulos.forEach( (m) => { 
                            if(m.moduloTerminado === false){
                                modulosFinalizados = false;
                            }
                        })

                        informacion.reto = data.reto
                        informacion.casoDescargado = data.casoDescargado
                        informacion.retoDescargado = data.retoDescargado
                        informacion.archivoReto = data.archivoReto
                        informacion.jsonAutoEvaluacion = data.jsonAutoEvaluacion
                        informacion.fechaRevision = data.updatedAt
                        informacion.fechaRetoDescargado = data.fechaRetoDescargado
                        informacion.fechaCasoDescargado = data.fechaCasoDescargado
                        informacion.modulosFinalizados = modulosFinalizados
                        informacion.autoEvaluacion = data.autoEvaluacion
                        informacion.encuestaSatisfaccion = data.encuestaSatisfaccion
						informacion.evaluacion = data.evaluacion
						informacion.encuesta = data.encuesta
                    }
                    db.grupoUnidadFechas.findOne({where: {grupo: parseInt(grupo), unidad: id_unidad}})
                    .then(function(response){ 
                        let ret;
                        if(response === null){
                            ret = {
                                status: 200,
                                mensaje:"OK",
                                unidad,
                                modulos,
                                informacion: informacion,
                                configuracion: {
                                    fechaApertura:'',
                                    fechaFinal:'',
                                    sesionArchivo:'',
                                    sesionFecha:'',
                                    sesionHora:'',
                                    tituloRetoOnTheJob:'',
                                    retoArchivo:'',
                                    retoFecha:'',
                                    retoHora:'',
                                    sesionImagenPrincipal:'',
                                    sesionImagenSecundaria:'',
                                    retoImagenPaso1:'',
                                    retoImagenPaso2:'',
                                    retoImagenPaso3:'',
                                    retoImagenPaso4:''
                                }
                            }
                        }else{
                            ret = {
                                status: 200,
                                mensaje:"OK",
                                unidad,
                                modulos,
                                informacion: informacion,
                                configuracion: {
                                    fechaApertura:			    response.fechaApertura,
                                    fechaFinal:				    response.fechaFinal,
                                    sesionArchivo:			    response.sesionArchivo,
                                    sesionFecha:			    response.sesionFecha,
                                    sesionHora:				    response.sesionHora,
                                    tituloRetoOnTheJob:			response.tituloRetoOnTheJob,
                                    retoArchivo:			    response.retoArchivo,
                                    retoFecha:				    response.retoFecha,
                                    retoHora:				    response.retoHora,
                                    fechaInicioAutoEvaluacion:  response.fechaInicioAutoEvaluacion,
                                    sesionImagenPrincipal: 	    response.sesionImagenPrincipal,
                                    sesionImagenSecundaria:     response.sesionImagenSecundaria,
                                    retoImagenPaso1: 		    response.retoImagenPaso1,
                                    retoImagenPaso2: 		    response.retoImagenPaso2,
                                    retoImagenPaso3: 		    response.retoImagenPaso3,
                                    retoImagenPaso4: 		    response.retoImagenPaso4
                                }
                            }
                            
                        }
                        if( data !== null){
                            db.revisionReto.findAll({where: {reto: data.id}})
                            .then(function(revReto){
                                let usuarios = []
                                revReto.forEach(element => {
                                    usuarios.push( element.usuarioRevision)	
                                }) 
                                db.pu_usuario_actividad.findAll({ where: { programaUnidad: programaUnidad, usuario: usuarios }, attributes: ['id', 'usuario', 'archivoReto','fechaRetoGuardado'] })
                                .then(function (revRetosPares) {
                                    revReto.forEach( r => {
                                        revRetosPares.forEach( rp => {
                                            if(r.usuarioRevision === rp.usuario){
                                                
                                                ret.informacion.pares.push({
                                                    id_rr: r.id,
                                                    id_usr_act: rp.id,
                                                    usuario: rp.usuario,
                                                    archivoReto: rp.archivoReto,
                                                    jsonEvaluacion: r.jsonEvaluacion,
                                                    fechaRevision: r.updatedAt,
                                                    extra: r.extra,
                                                    fechaPublicacionReto: rp.fechaRetoGuardado
                                                })
                                            }
                                        })
                                    })
                                    InfoModulosUnidades.forEach( element => {
                                        if(element.id === id_unidad){
                                            element.infoModulos=ret
                                        }
                                    })
                                    let id = TmpInfoModulosUnidades.pop();
                                    if(id !== undefined){
                                        getInfoModulos(req, res, id)
                                    }else{
                                        return res.status(200).send(InfoModulosUnidades)
                                    }
                                })
                                .catch( (e) => { 
                                    InfoModulosUnidades.forEach( element => {
                                        if(element.id === id_unidad){
                                            element.infoModulos={
                                                status: 204,
                                                mensaje:"OK",
                                                unidad,
                                                modulos,
                                                informacion: {},
                                                configuracion: ret.configuracion
                                            }
                                        }
                                    })
                                    let id = TmpInfoModulosUnidades.pop();
                                    if(id !== undefined){
                                        getInfoModulos(req, res, id)
                                    }else{
                                        return res.status(200).send(InfoModulosUnidades)
                                    }
                                })
                                
                            })
                            .catch( (e) => { 
                                logger.error( "Err sofosdfn" + JSON.stringify(e) )
                                InfoModulosUnidades.forEach( element => {
                                    if(element.id === id_unidad){
                                        element.infoModulos={
                                            status: 204,
                                            mensaje:"OK",
                                            unidad,
                                            modulos,
                                            informacion: {},
                                            configuracion: ret.configuracion
                                        }
                                    }
                                })
                                let id = TmpInfoModulosUnidades.pop();
                                if(id !== undefined){
                                    getInfoModulos(req, res, id)
                                }else{
                                    return res.status(200).send(InfoModulosUnidades)
                                }
                            })
                        }else{
                            logger.error( "Err1 asdasdasd -> " + JSON.stringify(data) )
                            let id = TmpInfoModulosUnidades.pop();
                            if(id !== undefined){
                                getInfoModulos(req, res, id)
                            }else{
                                return res.status(200).send(InfoModulosUnidades)
                            }
                        }
                    })
                    .catch( (e) => { 
                        logger.error( "Err i4fuin39" + JSON.stringify(e) )
                        return res.status(200).send({
                            status: 204,
                            mensaje:"Error al obtener unidades.",
                            err
                        })
                    })	
                })
                .catch(err => {
                    logger.error( "Err oisjf934" + JSON.stringify(err) )
                    return res.status(200).send({
                        status: 204,
                        mensaje:"Error al obtener unidades.",
                        err
                    })
                })
            })
        })
    })
    .catch(err => {
        logger.error( "Err i9j2de9n34g " + JSON.stringify(err) )
        return res.status(200).send({
			status: 204,
			mensaje:"Error al obtener unidades.",
            err
		})
    })
}

let ModulosUnidades = async ( req, res ) => {
    //--
    db.unidades.findAll({raw: true, nest: true, attributes: ['id', 'nombre', 'descripcion'], order: [[db.sequelize.literal('`Programas.ProgramaUnidades.orden`'), 'ASC']],
        include: [{model: db.programas,required: true, attributes: [], where: {perfil: req.auth.perfil},
            include: [{model: db.grupos,required: true,attributes: [],
                include: [{model: db.usuarios, where: { id: req.auth.id }, required: true,attributes: []}]
            }]
        }]
    })
    .then(async function (unidades_usuario) {

        let q = "SELECT gu.usuario, gu.grupo, gp.programa, pu.id, pu.unidad, pu.orden, pua.promedioReto \
        FROM GrupoUsuarios gu  \
        LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo \
        LEFT JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
        LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        LEFT JOIN RevisionRetos rr ON rr.reto = pua.id \
        WHERE gu.usuario = " + req.auth.id + " \
        GROUP BY pu.unidad \
        ORDER BY pu.orden ASC;"
        const [PromedioUnidades] = await db.sequelize.query( q );

        let q2 = "SELECT gu.usuario, gu.grupo, gp.programa, pu.id, pu.unidad, pu.orden, pua.promedioReto, COALESCE(guc.promedio, '') promedioJefe  \
        FROM GrupoUsuarios gu  \
        LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo \
        LEFT JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
        LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        LEFT JOIN RevisionRetos rr ON rr.reto = pua.id \
        LEFT JOIN GU_Cal_Jefe_Unidads guc ON guc.gu_id = gu.id AND guc.unidad = pu.unidad \
        WHERE gu.usuario = " + req.auth.id + " \
        GROUP BY pu.unidad \
        ORDER BY pu.orden ASC;"
        const [PromedioJefe] = await db.sequelize.query( q2 );
        
        let social_rank = "SELECT usuario, SUM(Puntos) AS Puntos FROM ( \
            SELECT usuario, (count(1))*5 AS Puntos FROM Preguntas WHERE usuario = " + req.auth.id + " \
            UNION \
            SELECT usuario, count(1) Puntos FROM Likes WHERE usuario = " + req.auth.id + " \
            UNION \
            SELECT usuario, count(1)*3 Puntos FROM Respuestas WHERE usuario = " + req.auth.id + ") tmp;"
        const [SocialRank] = await db.sequelize.query( social_rank );

        InfoModulosUnidades = unidades_usuario.map(u => ({
            id: u.id,
            nombre: u.nombre,
            descripcion: u.descripcion,
            orden: u.Programas.ProgramaUnidades.orden+1,
            PromedioUnidades: PromedioUnidades,
            PromedioJefe: PromedioJefe,
            SocialRank: SocialRank,
            infoModulos: {}
        }))

        InfoModulosUnidades.forEach( unidad => {
            TmpInfoModulosUnidades.push(unidad.id)
        })
    
        let id = TmpInfoModulosUnidades.pop()
        if(id !== undefined){
            getInfoModulos(req, res, id)
        }

    })
    .catch(err => {
        logger.error( "Err geravv4egc5hv " + JSON.stringify(err) )
        logger.error( err )
    })
    //--

}

//-- Detalle para consulta de jefe
let DetalleUsuario = async ( req, res, id_usuario, id_perfil) => {
    //--
    db.unidades.findAll({raw: true, nest: true, attributes: ['id', 'nombre', 'descripcion'], order: [[db.sequelize.literal('`Programas.ProgramaUnidades.orden`'), 'ASC']],
        include: [{model: db.programas,required: true, attributes: [], where: {perfil: id_perfil},
            include: [{model: db.grupos,required: true,attributes: [],
                include: [{model: db.usuarios, where: { id: id_usuario }, required: true,attributes: []}]
            }]
        }]
    })
    .then(async function (unidades_usuario) {

        let q = "SELECT gu.usuario, gu.grupo, gp.programa, pu.id, pu.unidad, pu.orden, pua.promedioReto \
        FROM GrupoUsuarios gu  \
        LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo \
        LEFT JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
        LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id \
        LEFT JOIN RevisionRetos rr ON rr.reto = pua.id \
        WHERE gu.usuario = " + id_usuario + " \
        GROUP BY pu.unidad \
        ORDER BY pu.orden ASC;"
        const [PromedioUnidades] = await db.sequelize.query( q );
        // InfoModulosUnidades.PromedioUnidades = PromedioUnidades
        
        let social_rank = "SELECT usuario, SUM(Puntos) AS Puntos FROM ( \
            SELECT usuario, (count(1))*5 AS Puntos FROM Preguntas WHERE usuario = " + id_usuario + " \
            UNION \
            SELECT usuario, count(1) Puntos FROM Likes WHERE usuario = " + id_usuario + " \
            UNION \
            SELECT usuario, count(1)*3 Puntos FROM Respuestas WHERE usuario = " + id_usuario + ") tmp;"
        const [SocialRank] = await db.sequelize.query( social_rank );

        InfoModulosUnidades = unidades_usuario.map(u => ({
            id: u.id,
            nombre: u.nombre,
            descripcion: u.descripcion,
            orden: u.Programas.ProgramaUnidades.orden+1,
            PromedioUnidades: PromedioUnidades,
            SocialRank: SocialRank,
            infoModulos: {}
        }))

        InfoModulosUnidades.forEach( unidad => {
            TmpInfoModulosUnidades.push(unidad.id)
        })
    
        let id = TmpInfoModulosUnidades.pop()
        if(id !== undefined){
            DetalleUsuarioUnidad(req, res, id, id_usuario, id_perfil)
        }

    })
    .catch(err => {
        logger.error( "Err geravv4egc5hv " + JSON.stringify(err) )
        logger.error( err )
    })
    //--

}

let DetalleUsuarioUnidad = (req, res, id_unidad, id_usuario, id_perfil) => {
    db.modulos.findAll({raw: true, nest: true,
        attributes: ['id', 'nombre', 'descripcion','icono'], where: {activo: true}, order: [[db.unidades, db.programaUnidadModulo, 'orden', 'ASC' ]],
        include: [{model: db.unidades, required: true, attributes: ['id', 'nombre', 'descripcion'], where: {id: id_unidad},
            include: [{model: db.programas,required: true, attributes: [], where: {perfil: id_perfil},
                include: [{model: db.grupos,required: true,attributes: [],
                    include: [{model: db.usuarios, where: { id: id_usuario }, required: true,attributes: []}]
                }]
            }]
        }]
    })
    .then(function (response) {

        let unidad = response.map(u => ({
            id: u.Unidades.id,
            nombre: u.Unidades.nombre,
            descripcion: u.Unidades.descripcion,
            orden: u.Unidades.Programas.ProgramaUnidades.orden+1
        }))

        var grupo = 0;
        var programaUnidad = 0;
        unidad = [...new Map(unidad.map(item => [item['id'], item])).values()]

        var modulos = response.map( (m) =>{
            return {
                id: m.id,
                nombre: m.nombre, 
                descripcion: m.descripcion,
                actFinalizadas: [],
                idsActividades: [],
                actsObligatorias: [], //T, ER, P
                actsObligatoriasPerc: [], //P, A, V
                actsFinalizadasObl: [], 
                actsFinalizadasPerc: [],
                moduloTerminado: false,
                progreso: 0,
                progresoObl: 0,
                progresoOblPerc: 0,
                icono: m.icono,
                orden: m.Unidades.ProgramaUnidadModulo.orden+1
            }
        })

        var promises = modulos.map( (m) => {
            return db.actividadesModulo.findAll({raw: true, nest: true,
                attributes: ['id', 'nombre', 'descripcion','tipo','icono','foto','imagen_panel','opcional'], order: [[db.modulos, db.programaUnidadModuloActividad, 'orden', 'ASC' ]],
                include: [{model: db.modulos, required: true, attributes: ['id', 'nombre', 'descripcion'], where: {id: m.id}, order: [[db.unidades, db.programaUnidadModulo, 'orden', 'ASC' ]],
                    include: [{model: db.unidades, required: true, attributes: ['id', 'nombre', 'descripcion'], where: {id: unidad[0].id},
                        include: [{model: db.programas,required: true, attributes: [], where: {perfil: id_perfil},
                            include: [{model: db.grupos,required: true,attributes: [],
                                include: [{model: db.usuarios, where: { id: id_usuario }, required: true,attributes: []}]
                            }]
                        }]
                    }]
                }]
            })
            .then(function (response) {

                let actividades = response.map(m => ({
                    id: m.id,
                    grupo: m.Modulos.Unidades.Programas.Grupos.Usuarios.GrupoUsuarios.grupo,
                    prgUnidad: m.Modulos.Unidades.Programas.ProgramaUnidades.id,
                    opcional: m.opcional,
                    tipo: m.tipo
                }))
        
                actividades.forEach( (a) => { 
                    m.idsActividades.push(a.id); 

                    if([1,4,5].indexOf(a.tipo) !== -1){
                        m.actsObligatorias.push(a.id);
                    }
                    if([1,2,3].indexOf(a.tipo) !== -1){
                        m.actsObligatoriasPerc.push(a.id);
                    }
                    grupo = a.grupo; 
                    programaUnidad = a.prgUnidad;
                })
            })
            .catch(err => {
                logger.error( "err2: " + err )
            })
        })

        let usuario = id_usuario
        Promise.all( promises )
        .then(( respone_promises ) => {

            var innerPromises = modulos.map( (m) => {
                return db.actModCheck.findAll({raw: true, nest: true, where: { actividad: {[Op.in]: m.idsActividades}, usuario: usuario, completada: true } })
                .then(function (actividadesFinalizadas) {

                    let acts = actividadesFinalizadas.map(a => ({
                        id: a.actividad
                    }))

                    //Finalizadas obligatorias
                    acts.forEach( (a) => { 
                        if(m.actsObligatorias.filter( actO => actO === a.id).length > 0){
                            m.actsFinalizadasObl.push(a.id)
                        }
                        
                        if(m.actsObligatoriasPerc.filter( actO => actO === a.id).length > 0){
                            m.actsFinalizadasPerc.push(a.id)
                        }
                        
                    })

                    acts.forEach( (a) => { m.actFinalizadas.push(a.id) } )
                })
            })
        
            Promise.all( innerPromises )
            .then(( respone_innerPromises ) => {

                modulos.forEach( (m) => { 
                    //Progreso general
                    m.progreso = ( ( m.actFinalizadas.length * 100) / m.idsActividades.length ) 
                    //Progreso Obligatorias P, T, ER
                    m.progresoObl = ( ( m.actsFinalizadasObl.length * 100) / m.actsObligatorias.length ) 
                    //Progreso Obligatorias Porcentage P, A, V
                    m.progresoOblPerc = ( ( m.actsFinalizadasPerc.length * 100) / m.actsObligatoriasPerc.length )

                    //>= 75% de Actividades P, A y V && >= 100% de Actividades P, T, ER se marca como terminado modulo 
                    if( m.progresoObl >= 100 && m.progresoOblPerc >= 75 ){
                        m.moduloTerminado = true
                    }

                } )				

                var informacion = {
                    caso: false,
					reto: false,
					encuesta: false,
					evaluacion: false,
					archivoReto: null,
					jsonEncuesta: null,
					jsonAutoEvaluacion: null,
					autoEvaluacion: null,
					encuestaSatisfaccion: null,
					evaluacion: false,
					pares: []
                };

                db.pu_usuario_actividad.findOne({ where: { programaUnidad: programaUnidad, usuario: id_usuario } })
                .then(function (data) {
                    if (data) {
                        let modulosFinalizados = true;
                        modulos.forEach( (m) => { 
                            if(m.moduloTerminado === false){
                                modulosFinalizados = false;
                            }
                        })

                        informacion.reto = data.reto
                        informacion.casoDescargado = data.casoDescargado
                        informacion.retoDescargado = data.retoDescargado
                        informacion.archivoReto = data.archivoReto
                        informacion.jsonAutoEvaluacion = data.jsonAutoEvaluacion
                        informacion.fechaRevision = data.updatedAt
                        informacion.fechaRetoDescargado = data.fechaRetoDescargado
                        informacion.fechaCasoDescargado = data.fechaCasoDescargado
                        informacion.modulosFinalizados = modulosFinalizados
                        informacion.autoEvaluacion = data.autoEvaluacion
                        informacion.encuestaSatisfaccion = data.encuestaSatisfaccion
						informacion.evaluacion = data.evaluacion
						informacion.encuesta = data.encuesta
                        informacion.fechaRetoGuardado = data.fechaRetoGuardado
                    }
                    db.grupoUnidadFechas.findOne({where: {grupo: parseInt(grupo), unidad: id_unidad}})
                    .then( async function(response){ 
                        let ret;
                        if(response === null){
                            ret = {
                                status: 200,
                                mensaje:"OK",
                                unidad,
                                modulos,
                                informacion: informacion,
                                configuracion: {
                                    fechaApertura:'',
                                    fechaFinal:'',
                                    sesionArchivo:'',
                                    sesionFecha:'',
                                    sesionHora:'',
                                    retoArchivo:'',
                                    retoFecha:'',
                                    retoHora:'',
                                    sesionImagenPrincipal:'',
                                    sesionImagenSecundaria:'',
                                    retoImagenPaso1:'',
                                    retoImagenPaso2:'',
                                    retoImagenPaso3:'',
                                    retoImagenPaso4:'',
                                    guiaObservacion:'',
                                    conoceCompetencia:''
                                }
                            }
                        }else{
                            ret = {
                                status: 200,
                                mensaje:"OK",
                                unidad,
                                modulos,
                                informacion: informacion,
                                configuracion: {
                                    fechaApertura:			    response.fechaApertura,
                                    fechaFinal:				    response.fechaFinal,
                                    sesionArchivo:			    response.sesionArchivo,
                                    sesionFecha:			    response.sesionFecha,
                                    sesionHora:				    response.sesionHora,
                                    retoArchivo:			    response.retoArchivo,
                                    retoFecha:				    response.retoFecha,
                                    retoHora:				    response.retoHora,
                                    fechaInicioAutoEvaluacion:  response.fechaInicioAutoEvaluacion,
                                    sesionImagenPrincipal: 	    response.sesionImagenPrincipal,
                                    sesionImagenSecundaria:     response.sesionImagenSecundaria,
                                    retoImagenPaso1: 		    response.retoImagenPaso1,
                                    retoImagenPaso2: 		    response.retoImagenPaso2,
                                    retoImagenPaso3: 		    response.retoImagenPaso3,
                                    retoImagenPaso4: 		    response.retoImagenPaso4,
                                    guiaObservacion:            response.guiaObservacion,
                                    conoceCompetencia:          response.conoceCompetencia
                                }
                            }
                            
                        }
                        if( data !== null){

                            const [Results] = await db.sequelize.query("SELECT id, reto, usuarioRevision, jsonEvaluacion, extra, updatedAt FROM RevisionRetos WHERE reto = " + data.id + ";");
							ret.informacion.resultadosPares = Results

                            const [InfoEvComp] = await db.sequelize.query("SELECT \
                            COALESCE(guc.promedio,0) calificacion_jefe, IF(COALESCE(guc.evaluacion,'') = '', '', guc.evaluacion) evaluacion_jefe, IF(COALESCE(guc.acuerdos,'') = '', '', guc.acuerdos) acuerdos_jefe, COALESCE(guc.ev_enviada,0) evaluacion_enviada \
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
                            WHERE gu.grupo = "+grupo+" AND u.id = "+id_usuario+" AND un.id = "+id_unidad+"  \
                            ORDER BY pu.orden ASC;");
                            ret.informacion.evaluacion_compromisos = InfoEvComp

                            db.revisionReto.findAll({where: {reto: data.id}})
                            .then(function(revReto){
                                let usuarios = []
                                revReto.forEach(element => {
                                    usuarios.push( element.usuarioRevision)	
                                }) 
                                db.pu_usuario_actividad.findAll({ where: { programaUnidad: programaUnidad, usuario: usuarios }, attributes: ['id', 'usuario', 'archivoReto','fechaRetoGuardado'] })
                                .then(function (revRetosPares) {
                                    revReto.forEach( r => {
                                        revRetosPares.forEach( rp => {
                                            if(r.usuarioRevision === rp.usuario){
                                                
                                                ret.informacion.pares.push({
                                                    id_rr: r.id,
                                                    id_usr_act: rp.id,
                                                    usuario: rp.usuario,
                                                    archivoReto: rp.archivoReto,
                                                    jsonEvaluacion: r.jsonEvaluacion,
                                                    fechaRevision: r.updatedAt,
                                                    extra: r.extra,
                                                    fechaPublicacionReto: rp.fechaRetoGuardado
                                                })
                                            }
                                        })
                                    })
                                    InfoModulosUnidades.forEach( element => {
                                        if(element.id === id_unidad){
                                            element.infoModulos=ret
                                        }
                                    })
                                    let id = TmpInfoModulosUnidades.pop();
                                    if(id !== undefined){
                                        DetalleUsuarioUnidad(req, res, id, id_usuario, id_perfil)
                                    }else{
                                        return res.status(200).send(InfoModulosUnidades)
                                    }
                                })
                                .catch( (e) => { 
                                    InfoModulosUnidades.forEach( element => {
                                        if(element.id === id_unidad){
                                            element.infoModulos={
                                                status: 204,
                                                mensaje:"OK",
                                                unidad,
                                                modulos,
                                                informacion: {},
                                                configuracion: ret.configuracion
                                            }
                                        }
                                    })
                                    let id = TmpInfoModulosUnidades.pop();
                                    if(id !== undefined){
                                        DetalleUsuarioUnidad(req, res, id, id_usuario, id_perfil)
                                    }else{
                                        return res.status(200).send(InfoModulosUnidades)
                                    }
                                })
                                
                            })
                            .catch( (e) => { 
                                logger.error( "Err sofosdfn" + JSON.stringify(e) )
                                InfoModulosUnidades.forEach( element => {
                                    if(element.id === id_unidad){
                                        element.infoModulos={
                                            status: 204,
                                            mensaje:"OK",
                                            unidad,
                                            modulos,
                                            informacion: {},
                                            configuracion: ret.configuracion
                                        }
                                    }
                                })
                                let id = TmpInfoModulosUnidades.pop();
                                if(id !== undefined){
                                    DetalleUsuarioUnidad(req, res, id, id_usuario, id_perfil)
                                }else{
                                    return res.status(200).send(InfoModulosUnidades)
                                }
                            })
                        }else{
                            logger.error( "Err2 asdasdasd -> " + JSON.stringify(data) )
                            let id = TmpInfoModulosUnidades.pop();
                            if(id !== undefined){
                                DetalleUsuarioUnidad(req, res, id, id_usuario, id_perfil)
                            }else{
                                return res.status(200).send(InfoModulosUnidades)
                            }
                        }
                    })
                    .catch( (e) => { 
                        logger.error( "Err i4fuin39" + JSON.stringify(e) )
                        return res.status(200).send({
                            status: 204,
                            mensaje:"Error al obtener unidades.",
                            err
                        })
                    })	
                })
                .catch(err => {
                    logger.error( "Err oisjf934" + JSON.stringify(err) )
                    return res.status(200).send({
                        status: 204,
                        mensaje:"Error al obtener unidades.",
                        err
                    })
                })
            })
        })
    })
    .catch(err => {
        logger.error( "Err i9j2de9n34g " + JSON.stringify(err) )
        return res.status(200).send({
			status: 204,
			mensaje:"Error al obtener unidades.",
            err
		})
    })
}
//--

let ActualizacionPromedios = async ( id_usuario ) => {
    // Calculo de promedios
    try {

        const [dataCalificaciones] = await db.sequelize.query("\
            SELECT \
            pua.id, \
            pua.promedioReto, \
            pua.promedioEvConocimiento, \
            pua.promedioAutovaluacion, \
            COALESCE(pua.jsonAutoEvaluacion,'') jsonAutoEvaluacion, \
            COALESCE(pua.encuestaSatisfaccion,'') encuestaSatisfaccion, \
            COALESCE(pua.autoEvaluacion,'') autoEvaluacion, \
            SUM(IF(COALESCE(rr.promedioReto,0) > 0, rr.promedioReto, NULL)) / COUNT(IF(COALESCE(rr.promedioReto,0) > 0, rr.promedioReto, NULL)) promedioRetoPares, \
            COUNT(IF(COALESCE(rr.jsonEvaluacion,'') <> '', 1, NULL)) paresQueEvaluaron, \
            IF(COALESCE(pua.evaluacionTutor,'') <> '', 1, 0) tutorEvaluo, \
            pua.calificacionTutor califTutor \
        FROM PU_Usuario_Actividads pua \
        LEFT JOIN RevisionRetos rr ON rr.reto = pua.id \
        WHERE pua.usuario = '"+id_usuario+"' \
        GROUP BY pua.id;");

        if(dataCalificaciones.length > 0){
            dataCalificaciones.forEach( dataReto => {
                /* Reto */
                if(dataReto.tutorEvaluo == 1){
                    if(dataReto.promedioReto !== dataReto.califTutor){
                        db.pu_usuario_actividad.update({promedioReto: dataReto.califTutor}, { where: { id: dataReto.id } })
                        .then(response => { 
                            logger.info( '1. Promedio Reto Actualizado...' ) 
                        })
                        .catch(err => { 
                            logger.error( err ) 
                        })
                    }
                }else if(dataReto.jsonAutoEvaluacion !== ''){ // No tiene calificacion y tiene autoevaluacion
                    if(parseInt(dataReto.paresQueEvaluaron) > 0 && dataReto.promedioRetoPares >= 0){ // Ya lo evaluaron 1 o mas pares
                        if(dataReto.promedioReto !== dataReto.promedioRetoPares){
                            db.pu_usuario_actividad.update({promedioReto: dataReto.promedioRetoPares}, { where: { id: dataReto.id } })
                            .then(response => { 
                                logger.info( '2. Promedio Reto Actualizado...' ) 
                            })
                            .catch(err => { 
                                logger.error( err ) 
                            })
                        }
                    }else{
                        let promedioReto = 0;
                        let evaluacion = JSON.parse( dataReto.jsonAutoEvaluacion )
                        evaluacion.forEach(seccion => {
                            seccion.seccion.preguntas.forEach(ejercicio => {
                                switch ( ejercicio.pregunta.tipo ) {
                                case "rango":
                                    promedioReto = promedioReto + parseInt(ejercicio.pregunta.respuesta)
                                    break;
                                default:
                                    break;
                                }
                            });
                        });
                        if(promedioReto > 0){
                            if(dataReto.promedioReto !== (promedioReto / 4)){
                                db.pu_usuario_actividad.update({promedioReto: promedioReto / 4}, { where: { id: dataReto.id } })
                                .then(response => { 
                                    logger.info( '3. Promedio Reto Actualizado...' ) 
                                })
                                .catch(err => { 
                                    logger.error( err ) 
                                })
                            }
                        }
                    }
                }
                /* End: Reto */

                /* Autoevaluacion */
                if(parseInt(dataReto.promedioAutovaluacion) <= 0 && dataReto.autoEvaluacion !== ''){ // No tiene calificacion y tiene autoevaluacion
                    let promedio = 0;
                    let preguntas = 0;
                    let form  = JSON.parse( dataReto.autoEvaluacion )
                    form.forEach(seccion => {
                        seccion.seccion.preguntas.forEach(pregunta => {
                            if(pregunta.pregunta.tipo === "rango"){
                                promedio += parseInt(pregunta.pregunta.respuesta);
                                preguntas++
                            }
                        });
                    });
                    let promedioAutoEvaluacion = Math.round( (promedio/preguntas) * 10 ) / 10
                    if(promedioAutoEvaluacion > 0){
                        db.pu_usuario_actividad.update({promedioAutovaluacion: promedioAutoEvaluacion}, { where: { id: dataReto.id } })
                        .then(response => { 
                            logger.info( 'Promedio Autoevaluacion Actualizado...' ) 
                        })
                        .catch(err => { 
                            logger.error( err ) 
                        })
                    }
                }
                /* End: Autoevaluacion */

                /* Evaluacion de conocimientos */
                if(parseInt(dataReto.promedioEvConocimiento) <= 0 && dataReto.encuestaSatisfaccion !== ''){ // No tiene calificacion y tiene autoevaluacion
                    let promedioEvConocimiento = 0;
                    let form  = JSON.parse( dataReto.encuestaSatisfaccion )

                    form.Conocimiento.forEach(element => {
                        element.seccion.preguntas.forEach(pregunta => {
                            if(pregunta.pregunta.tipo === "opcionMultiple"){
                                if(pregunta.pregunta.respuesta === pregunta.pregunta.respuestaCorrecta){
                                    promedioEvConocimiento+=1
                                }
                            }
                        })
                    })

                    if(promedioEvConocimiento > 0){
                        db.pu_usuario_actividad.update({promedioEvConocimiento: promedioEvConocimiento}, { where: { id: dataReto.id } })
                        .then(response => { 
                            logger.info( 'Promedio Evaluacion Conocimiento Actualizado...' ) 
                        })
                        .catch(err => { 
                            logger.error( err ) 
                        })
                    }

                }
                /* Evaluacion de conocimientos */
            })
        }

    } catch (err) {
        logger.error( "Error al caclular promedios... " )
        logger.error( err )
    }
    // End: Calculo de promedios
}
module.exports = {
    ModulosUnidades,
    DetalleUsuario,
    ActualizacionPromedios
}

/*

*/