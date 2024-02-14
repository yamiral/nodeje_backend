const db = require("../modelos");
const logger = require("../config/logger");

let obtieneInsignia = (req, res, tipoInsignia, currentStatus, currentRes) => {
    logger.info( " 1. " + req.auth.id + " " + tipoInsignia + " "  + currentRes );
    db.usuarios.findOne({ 
        where: {id: req.auth.id},
        attributes: ['id', 'username'],
        include: [{
            model: db.insignias, 
            attributes: ['id', 'llave_insignia', 'programa', 'unidad', 'nombre', 'unidad', 'imagen'],
            required: false
        }]
    })
    .then( async (usuarioInsignias) => {

        var promises = []

        const [CatInsignias] = await db.sequelize.query("SELECT * FROM Insignias;");
        
        logger.info( " 2. " + req.auth.id + " " + tipoInsignia + " "  + currentRes );

        switch (tipoInsignia) {
            case 'actividad':
                
                if(usuarioInsignias.hasOwnProperty('Insignias')){
                    logger.info( " 3. " + req.auth.id + " " + tipoInsignia + " "  + currentRes );
                    var insignia = [];
                    //------------------------------------------------------------------------------------
                    // Termina su primer módulo (id: 6)
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'primer_modulo')
                    let _primer_modulo = CatInsignias.filter( ins => ins.llave_insignia === 'primer_modulo')
                    if(insignia.length <= 0 && _primer_modulo.length > 0){
                        promises.push( termino_modulo(req, _primer_modulo, _primer_modulo[0].id) )
                    }else{
                        // logger.info("Ya tiene la insignia " + "primer_modulo")
                    }
                    // //------------------------------------------------------------------------------------
                    
                    //------------------------------------------------------------------------------------
                    // Sube la evidencia de su primer reto on the job (id: 7)
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'primer_reto')
                    let _primer_reto = CatInsignias.filter( ins => ins.llave_insignia === 'primer_reto')
                    if(insignia.length <= 0 && _primer_reto.length > 0){
                        promises.push( evidencia_primer_reto(req, _primer_reto, _primer_reto[0].id) )
                    }else{
                        // logger.info("Ya tiene la insignia " + "primer_reto")
                    }
                    //------------------------------------------------------------------------------------
                   
                    //------------------------------------------------------------------------------------
                    // Concluye su primer ejercicio de reforzamiento (id: 8)
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'primer_ejercicio')
                    let _primer_ejercicio = CatInsignias.filter( ins => ins.llave_insignia === 'primer_ejercicio')
                    if(insignia.length <= 0 && _primer_ejercicio.length > 0){
                        promises.push( primer_ejercicio_reforzamiento(req, _primer_ejercicio, _primer_ejercicio[0].id) )
                    }else{
                        // logger.info("Ya tiene la insignia " + "primer_ejercicio")
                    }
                    //------------------------------------------------------------------------------------
                    
                    //------------------------------------------------------------------------------------
                    // Descarga su primer toolkit (id: 9)
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'primeras_herramientas')
                    let _primeras_herramientas = CatInsignias.filter( ins => ins.llave_insignia === 'primeras_herramientas')
                    if(insignia.length <= 0 && _primeras_herramientas.length > 0){
                        promises.push( primer_toolkit_descargado(req, _primeras_herramientas, _primeras_herramientas[0].id) )
                    }else{
                        // logger.info("Ya tiene la insignia " + "primeras_herramientas")
                    }
                    //------------------------------------------------------------------------------------
                   
                    //------------------------------------------------------------------------------------
                    // Primer rating de objeto (id: 10)
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'retro_novato')
                    let _retro_novato = CatInsignias.filter( ins => ins.llave_insignia === 'retro_novato')
                    if(insignia.length <= 0 && _retro_novato.length > 0){
                        promises.push( primer_rating(req, _retro_novato, _retro_novato[0].id) )
                    }else{
                        // logger.info("Ya tiene la insignia " + "retro_novato")
                    }
                    //------------------------------------------------------------------------------------
                    
                    //------------------------------------------------------------------------------------
                    // Responde su evaluación de confianza y reacción (unidad) (id: 11)
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'retro_avanzado')
                    let _retro_avanzado = CatInsignias.filter( ins => ins.llave_insignia === 'retro_avanzado')
                    if(insignia.length <= 0 && _retro_avanzado.length > 0){
                        promises.push( evaluacion_de_unidad(req, _retro_avanzado, _retro_avanzado[0].id) )
                    }else{
                        // logger.info("Ya tiene la insignia " + "retro_avanzado")
                    }
                    
                    //------------------------------------------------------------------------------------
                    // Realiza su primer comentario (id: 12)
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'primer_comentario')
                    let _primer_comentario = CatInsignias.filter( ins => ins.llave_insignia === 'primer_comentario')
                    if(insignia.length <= 0 && _primer_comentario.length > 0){
                        promises.push( primer_comentario(req, _primer_comentario, _primer_comentario[0].id) )
                    }else{
                        // logger.info("Ya tiene la insignia " + "primer_comentario")
                    }
                    //------------------------------------------------------------------------------------
                   
                    //------------------------------------------------------------------------------------
                    // Realiza su primer reply (id: 13)
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'primera_respuesta')
                    let _primera_respuesta = CatInsignias.filter( ins => ins.llave_insignia === 'primera_respuesta')
                    if(insignia.length <= 0 && _primera_respuesta.length > 0){
                        promises.push( primer_reply(req, _primera_respuesta, _primera_respuesta[0].id) )
                    }else{
                        // logger.info("Ya tiene la insignia " + "primera_respuesta")
                    }
                    //------------------------------------------------------------------------------------

                    
                    //------------------------------------------------------------------------------------
                    // Realiza su primer Like (id: 14)
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'primer_like')
                    let _primer_like = CatInsignias.filter( ins => ins.llave_insignia === 'primer_like')
                    if(insignia.length <= 0 && _primer_like.length > 0){
                        promises.push( primer_like(req, _primer_like, _primer_like[0].id) )
                    }else{
                        // logger.info("Ya tiene la insignia " + "primer_like")
                    }
                    //------------------------------------------------------------------------------------

                    //------------------------------------------------------------------------------------
                    // Realiza feedback adicional (reto extra) (id: 35)
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'influencer_bronce')
                    let _influencer_bronce = CatInsignias.filter( ins => ins.llave_insignia === 'influencer_bronce')
                    if(insignia.length <= 0 && _influencer_bronce.length > 0){
                        promises.push( influencer(req, _influencer_bronce, _influencer_bronce[0].id, 0) )
                    }else{
                        if(insignia.length>0){
                            promises.push( influencer(req, insignia, _influencer_bronce[0].id, insignia[0].InsigniasUsuarios.nivel) )
                        }
                    }
                    //------------------------------------------------------------------------------------
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'reto_extra')
                    let _reto_extra = CatInsignias.filter( ins => ins.llave_insignia === 'reto_extra')
                    if(insignia.length <= 0 && _reto_extra.length > 0){
                        promises.push( evaluacion_extra(req, _reto_extra, _reto_extra[0].id) )
                    }else{
                        // logger.info("Ya tiene la insignia " + "reto_extra")
                    }
                    //------------------------------------------------------------------------------------
                    // Realiza su primer Like (id: 14)
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'asistencia_perfecta')
                    let _asistencia_perfecta = CatInsignias.filter( ins => ins.llave_insignia === 'asistencia_perfecta')
                    if(insignia.length <= 0 && _asistencia_perfecta.length > 0){
                        promises.push( asistencia_perfecta(req, _asistencia_perfecta, _asistencia_perfecta[0].id) )
                    }else{
                        // logger.info("Ya tiene la insignia " + "asistencia_perfecta")
                    }
                    //------------------------------------------------------------------------------------
                    // Insignia Evolutiva - Programa 80% por unidad + Ev de unidad
                    const insignias_lift = ['estratega_lift', 'gestor_lift', 'lider_cambio']
                    insignias_lift.forEach( ins_key => {
                        insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === ins_key)
                        let _leg_lift = CatInsignias.filter( ins => ins.llave_insignia === ins_key)
                        if(insignia.length <= 0 && _leg_lift.length > 0){
                            promises.push( ins_lift(req, _leg_lift, _leg_lift[0].id) )
                        }else{
                            // logger.info("Ya tiene la insignia " + _leg_lift[0].llave_insignia)
                        }    
                    })
                    //------------------------------------------------------------------------------------
                    // Insignia Evolutiva - Programa 100% por unidad
                    const legendarias = ['leg_estratega_lift', 'leg_gestor_lift', 'leg_lider_cambio']
                    legendarias.forEach( ins_key => {
                        insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === ins_key)
                        let _leg_lift = CatInsignias.filter( ins => ins.llave_insignia === ins_key)
                        if(insignia.length <= 0 && _leg_lift.length > 0){
                            promises.push( leg_lift(req, _leg_lift, _leg_lift[0].id) )
                        }else{
                            // logger.info("Ya tiene la insignia " + _leg_lift[0].llave_insignia)
                        }    
                    })
                    //------------------------------------------------------------------------------------
                    // Insignia Evolutiva - Programa 100% por unidad
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'lider_aprendiz')
                    let _lift_lider = CatInsignias.filter( ins => ins.llave_insignia === 'lider_aprendiz')
                    if(insignia.length <= 0 && _lift_lider.length > 0){
                        promises.push( lift_lider(req, _lift_lider, _lift_lider[0].id, 0) )
                    }else{
                        if(insignia.length){
                            promises.push( lift_lider(req, insignia, _lift_lider[0].id, insignia[0].InsigniasUsuarios.nivel) )
                        }
                    }    
                    //------------------------------------------------------------------------------------
                    // Insignia Evolutiva - Flash
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'flash_bronze')
                    let _flash = CatInsignias.filter( ins => ins.llave_insignia === 'flash_bronze')
                    if(insignia.length <= 0 && _flash.length > 0){
                        promises.push( flash(req, _flash, _flash[0].id, 0) )
                    }else{
                        if(insignia.length){
                            promises.push( flash(req, insignia, _flash[0].id, insignia[0].InsigniasUsuarios.nivel) )
                        }
                    }    
                    //------------------------------------------------------------------------------------
                    // Insignia - Lider del futuro
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'lider_futuro')
                    let _lider_futuro = CatInsignias.filter( ins => ins.llave_insignia === 'lider_futuro')
                    if(insignia.length <= 0 && _lider_futuro.length > 0){
                        promises.push( lider_futuro(req, _lider_futuro, _lider_futuro[0].id) )
                    }else{
                        // logger.info("Ya tiene la insignia " + _lider_futuro[0].llave_insignia)
                    }
                    //------------------------------------------------------------------------------------
                    // Insignia - Retroalimentador master
                    insignia = usuarioInsignias.Insignias.filter( ins => ins.llave_insignia === 'retro_master')
                    let _retro_master = CatInsignias.filter( ins => ins.llave_insignia === 'retro_master')
                    if(insignia.length <= 0 && _retro_master.length > 0){
                        promises.push( retro_master(req, _retro_master, _retro_master[0].id) )
                    }else{
                        // logger.info("Ya tiene la insignia " + _retro_master[0].llave_insignia)
                    }
                    //------------------------------------------------------------------------------------
                }
                logger.info( " 4. " + req.auth.id + " " + tipoInsignia + " "  + currentRes );
                break;
            case 'jefe':
                 //-- JEFE
                // insignias 36, 37, 38, 39
                // insignia 36 - Lider formador - Retroalimenta a todos tus colaboradores sobre su desempeño en unidad 1
                try {
                    const [Insignia36] = await db.sequelize.query("SELECT * FROM InsigniasJefes ij LEFT JOIN Insignias ins ON ins.id=ij.insignia WHERE ij.usuario = "+req.auth.id+" AND ij.grupo = "+req.body.id_grupo+" AND ins.llave_insignia = 'lider_formador_u1_p1';");
                    if(Insignia36.length <= 0){ // no la tiene para el grupo X
                        let _insignia36 = CatInsignias.filter( ins => ins.llave_insignia === 'lider_formador_u1_p1')
                        const [SeGana36] = await db.sequelize.query("SELECT pu.orden, pu.unidad, COUNT(IF(COALESCE(guc.ev_enviada,0) = 1, 1, NULL)) enviadas, COUNT(1) total, ins.id id_insignia, ins.nombre nombre_insignia, ins.imagen imagen_insignia, IF(guf.jefeAutoEvInicioFecha <= DATE(CONVERT_TZ(NOW(),'+00:00','-05:00')), 1, 0) inicioEv \
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
                                                                    LEFT JOIN Insignias ins ON ins.unidad = un.id AND ins.llave_insignia = 'lider_formador_u1_p1' \
                                                                    WHERE u.activo = 1 AND COALESCE(pua.archivoReto,'') <> '' AND gu.grupo = "+req.body.id_grupo+" AND u.jefe_directo = "+req.auth.id+" AND ins.llave_insignia = 'lider_formador_u1_p1' \
                                                                    ORDER BY pu.orden ASC;");
                        if(SeGana36.length > 0){
                            if(SeGana36[0].enviadas === SeGana36[0].total && SeGana36[0].inicioEv === 1){
                                db.insigniasJefes.create({usuario: req.auth.id, insignia: _insignia36[0].id, grupo: req.body.id_grupo})
                                .then( ins_created => {
                                    // logger.info( "Insignia creada (" + _insignia36[0].id + ")" )
                                    crea_notificacion(req.auth.id, {id_insignia: _insignia36[0].id, nombre_insignia: _insignia36[0].nombre, imagen_insignia: _insignia36[0].imagen}, 7)
                                })
                                .catch( ins_created => {
                                    logger.error( "Err Insignia creada (" + _insignia36[0].id + ")" )
                                    logger.error( ins_created )
                                })
                            }
                        }
                    }
                } catch (err) {
                    logger.error( "Error Insignia 36 - " + err) 
                }
                // insignia 37 - Lider formador - Retroalimenta a todos tus colaboradores sobre su desempeño en unidad 2
                try {
                    const [Insignia37] = await db.sequelize.query("SELECT * FROM InsigniasJefes ij LEFT JOIN Insignias ins ON ins.id=ij.insignia WHERE ij.usuario = "+req.auth.id+" AND ij.grupo = "+req.body.id_grupo+" AND ins.llave_insignia = 'lider_formador_u2_p1';");
                    if(Insignia37.length <= 0){ // no la tiene para el grupo X
                        let _insignia37 = CatInsignias.filter( ins => ins.llave_insignia === 'lider_formador_u2_p1')
                        const [SeGana37] = await db.sequelize.query("SELECT pu.orden, pu.unidad, COUNT(IF(COALESCE(guc.ev_enviada,0) = 1, 1, NULL)) enviadas, COUNT(1) total, ins.id id_insignia, ins.nombre nombre_insignia, ins.imagen imagen_insignia, IF(guf.jefeAutoEvInicioFecha <= DATE(CONVERT_TZ(NOW(),'+00:00','-05:00')), 1, 0) inicioEv \
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
                                                                    LEFT JOIN Insignias ins ON ins.unidad = un.id AND ins.llave_insignia = 'lider_formador_u2_p1'\
                                                                    WHERE u.activo = 1 AND COALESCE(pua.archivoReto,'') <> '' AND gu.grupo = "+req.body.id_grupo+" AND u.jefe_directo = "+req.auth.id+" AND ins.llave_insignia = 'lider_formador_u2_p1' \
                                                                    ORDER BY pu.orden ASC;");
                        if(SeGana37.length > 0){
                            if(SeGana37[0].enviadas === SeGana37[0].total && SeGana37[0].inicioEv === 1){
                                db.insigniasJefes.create({usuario: req.auth.id, insignia: _insignia37[0].id, grupo: req.body.id_grupo})
                                .then( ins_created => {
                                    // logger.info( "Insignia creada (" + _insignia37[0].id + ")" )
                                    crea_notificacion(req.auth.id, {id_insignia: _insignia37[0].id, nombre_insignia: _insignia37[0].nombre, imagen_insignia: _insignia37[0].imagen}, 7)
                                })
                                .catch( ins_created => {
                                    logger.error( "Err Insignia creada (" + _insignia37[0].id + ")" )
                                    logger.error( ins_created )
                                })
                            }
                        }
                    }
                } catch (err) {
                    logger.error( "Error Insignia 37 - " + err) 
                }
                // insignia 38 - Lider formador - Retroalimenta a todos tus colaboradores sobre su desempeño en unidad 3
                try {
                    const [Insignia38] = await db.sequelize.query("SELECT * FROM InsigniasJefes ij LEFT JOIN Insignias ins ON ins.id=ij.insignia WHERE ij.usuario = "+req.auth.id+" AND ij.grupo = "+req.body.id_grupo+" AND ins.llave_insignia = 'lider_formador_u3_p1';");
                    if(Insignia38.length <= 0){ // no la tiene para el grupo X
                        let _insignia38 = CatInsignias.filter( ins => ins.llave_insignia === 'lider_formador_u3_p1')
                        const [SeGana38] = await db.sequelize.query("SELECT pu.orden, pu.unidad, COUNT(IF(COALESCE(guc.ev_enviada,0) = 1, 1, NULL)) enviadas, COUNT(1) total, ins.id id_insignia, ins.nombre nombre_insignia, ins.imagen imagen_insignia, IF(guf.jefeAutoEvInicioFecha <= DATE(CONVERT_TZ(NOW(),'+00:00','-05:00')), 1, 0) inicioEv \
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
                                                                    LEFT JOIN Insignias ins ON ins.unidad = un.id AND ins.llave_insignia = 'lider_formador_u3_p1'\
                                                                    WHERE u.activo = 1 AND COALESCE(pua.archivoReto,'') <> '' AND gu.grupo = "+req.body.id_grupo+" AND u.jefe_directo = "+req.auth.id+" AND ins.llave_insignia = 'lider_formador_u3_p1' \
                                                                    ORDER BY pu.orden ASC;");
                        if(SeGana38.length > 0){
                            if(SeGana38[0].enviadas === SeGana38[0].total && SeGana38[0].inicioEv === 1){
                                db.insigniasJefes.create({usuario: req.auth.id, insignia: _insignia38[0].id, grupo: req.body.id_grupo})
                                .then( ins_created => {
                                    // logger.info( "Insignia creada (" + _insignia38[0].id + ")" )
                                    crea_notificacion(req.auth.id, {id_insignia: _insignia38[0].id, nombre_insignia: _insignia38[0].nombre, imagen_insignia: _insignia38[0].imagen}, 7)
                                })
                                .catch( ins_created => {
                                    logger.error( "Err Insignia creada (" + _insignia38[0].id + ")" )
                                    logger.error( ins_created )
                                })
                            }
                        }
                    }
                } catch (err) {
                    logger.error( "Error Insignia 38 - " + err) 
                }
                // insignia 39 - FLASH - Retroalimenta a todos tus colaboradores sobre su desempeño en tiempos programados.... bronze unidad1, plata unidad2, oro unidad3
                try {
                    const [Insignia39] = await db.sequelize.query("SELECT ij.* FROM InsigniasJefes ij LEFT JOIN Insignias ins ON ins.id=ij.insignia WHERE ij.usuario = "+req.auth.id+" AND ij.grupo = "+req.body.id_grupo+" AND ins.llave_insignia = 'flash_jefe';");
                    let _insignia39 = CatInsignias.filter( ins => ins.llave_insignia === 'flash_jefe')
                    // logger.info( JSON.stringify(_insignia39) )
                    if(Insignia39.length <= 0){ // no la tiene para el grupo X
                        
                        const [SeGana39] = await db.sequelize.query("SELECT pu.orden, pu.unidad, COUNT(IF(COALESCE(guc.ev_enviada,0) = 1, 1, NULL)) enviadas, COUNT(1) total, \
                        IF(COUNT(IF(COALESCE(guc.ev_enviada,0) = 1, 1, NULL)) = COUNT(1), IF(COUNT(1) = COUNT(IF(IF(CONVERT_TZ(guc.fecha_ev,'+00:00','-05:00') >= guf.jefeAutoEvInicioFecha && CONVERT_TZ(guc.fecha_ev,'+00:00','-05:00') <= guf.jefeAutoEvFinFecha, 'OK', 'NOK') = 'OK', 1, NULL)), 'OK', 'NOK'), 'NOK') InsigniaGanada, \
                        IF(guf.jefeAutoEvInicioFecha >= DATE(NOW()), 1, 0) inicioEv \
                        FROM GrupoUsuarios gu  \
                        LEFT JOIN Grupos g ON gu.grupo = g.id  \
                        LEFT JOIN Usuarios u ON gu.usuario = u.id  \
                        LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo  \
                        LEFT JOIN Programas p ON gp.programa = p.id  \
                        LEFT JOIN ProgramaUnidades pu ON pu.programa = p.id  \
                        LEFT JOIN Unidades un ON pu.unidad = un.id  \
                        LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id  \
                        LEFT JOIN GU_Cal_Jefe_Unidads guc ON guc.gu_id=gu.id AND guc.unidad=un.id \
                        LEFT JOIN GrupoUnidadFechas guf ON guf.grupo=g.id AND guf.unidad=un.id   \
                        WHERE u.activo = 1 AND COALESCE(pua.archivoReto,'') <> '' AND gu.grupo = "+req.body.id_grupo+" AND u.jefe_directo = "+req.auth.id+" \
                        GROUP BY pu.unidad \
                        ORDER BY pu.orden ASC;");
                        if(SeGana39.length > 0){
                            let nivel = 0;
                            SeGana39.forEach( lift_ins => {
                                if( lift_ins.InsigniaGanada === 'OK'){
                                    nivel++
                                }
                            })
                            db.insigniasJefes.create({usuario: req.auth.id, insignia: _insignia39[0].id, grupo: req.body.id_grupo, nivel: nivel})
                            .then( ins_created => {
                                // logger.info( "Insignia creada (" + _insignia39[0].id + ")" )
                                crea_notificacion(req.auth.id, {id_insignia: _insignia39[0].id, nombre_insignia: _insignia39[0].nombre, imagen_insignia: _insignia39[0].imagen}, 7)
                            })
                            .catch( ins_created => {
                                logger.error( "Err Insignia creada (" + _insignia39[0].id + ")" )
                                logger.error( ins_created )
                            })
                        }
                    }else{
                        const [SeGana39] = await db.sequelize.query("SELECT pu.orden, pu.unidad, COUNT(IF(COALESCE(guc.ev_enviada,0) = 1, 1, NULL)) enviadas, COUNT(1) total, \
                        IF(COUNT(IF(COALESCE(guc.ev_enviada,0) = 1, 1, NULL)) = COUNT(1), IF(COUNT(1) = COUNT(IF(IF(CONVERT_TZ(guc.fecha_ev,'+00:00','-05:00') < guf.jefeAutoEvFinFecha, 'OK', 'NOK') = 'OK', 1, NULL)), 'OK', 'NOK'), 'NOK') InsigniaGanada, \
                        IF(guf.jefeAutoEvInicioFecha >= DATE(NOW()), 1, 0) inicioEv \
                        FROM GrupoUsuarios gu  \
                        LEFT JOIN Grupos g ON gu.grupo = g.id  \
                        LEFT JOIN Usuarios u ON gu.usuario = u.id  \
                        LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo  \
                        LEFT JOIN Programas p ON gp.programa = p.id  \
                        LEFT JOIN ProgramaUnidades pu ON pu.programa = p.id  \
                        LEFT JOIN Unidades un ON pu.unidad = un.id  \
                        LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id  \
                        LEFT JOIN GU_Cal_Jefe_Unidads guc ON guc.gu_id=gu.id AND guc.unidad=un.id \
                        LEFT JOIN GrupoUnidadFechas guf ON guf.grupo=g.id AND guf.unidad=un.id   \
                        WHERE u.activo = 1 AND COALESCE(pua.archivoReto,'') <> '' AND gu.grupo = "+req.body.id_grupo+" AND u.jefe_directo = "+req.auth.id+" \
                        GROUP BY pu.unidad \
                        ORDER BY pu.orden ASC;");
                        if(SeGana39.length > 0){
                            let nivel = 0;
                            SeGana39.forEach( lift_ins => {
                                if( lift_ins.InsigniaGanada === 'OK'){
                                    nivel++
                                }
                            })
                            if(nivel > Insignia39[0].nivel){
                                db.insigniasJefes.update({nivel: nivel}, {where: {id: Insignia39[0].id }})
                                .then( ins_created => {
                                    // logger.info( "Insignia actualizada (" + _insignia39[0].id + ")" )
                                    crea_notificacion(req.auth.id, {id_insignia: _insignia39[0].id, nombre_insignia: _insignia39[0].nombre, imagen_insignia: _insignia39[0].imagen}, 7)
                                })
                                .catch( ins_created => {
                                    logger.error( "Err Insignia creada (" + _insignia39[0].id + ")" )
                                    logger.error( ins_created )
                                })
                            }
                        }
                    }
                } catch (err) {
                    logger.error( "Error Insignia 39 - " + err) 
                }

                //-- JEFE
                break;
            default:
                break;
        }
        logger.info( " 5. " + req.auth.id + " " + tipoInsignia + " "  + currentRes );
        Promise.all( promises )
        .then( result => {
            logger.info( "Promises ended...." ) 
            logger.info( "----------------------" ) 
            logger.info( "insignias obtenidas: " ) 
            logger.info( result )
            logger.info( "----------------------" ) 
            return res.status(currentStatus).send(currentRes)
        })
    })
    .catch( (usuarioInsigniasErr) => {
        logger.info( "Error al verificar insignias que se detonan al terminar actividades...." )
        logger.error( "usuarioInsigniasErr: " + usuarioInsigniasErr )
        return res.status(currentStatus).send(currentRes)
    })
}

let crea_notificacion = (id_usuario, notification_data, notification_type) => {
    db.insignias.findOne({attributes: ['nombre', 'descripcion', 'descripcionModalN1', 'descripcionModalN2', 'descripcionModalN3', 'imagen', 'tipo'], where: {id: notification_data.id_insignia} })
    .then( datos_insignia => {
        let laData = JSON.parse(JSON.stringify(datos_insignia));
        laData.nivel = notification_data.nivel || 0;
        db.notificaciones.create({
            usuario: id_usuario, 
            reto: null, 
            data: JSON.stringify(laData),
            visto: 0,
            tipo: notification_type})
        .then(notificationCreate => {
            db.notificacionesUsuario.create({
                notificacion: notificationCreate.id,
                usuario: id_usuario
            })
            .then(notificationCreate => {
                // logger.info( "Notificación y Relación Creada");
            })								
            .catch( err => {
                logger.error( err )
            })
        })								
        .catch( err => {
            logger.error( err )
        })

    })
    .catch( datos_insignia => {
        logger.error( "datos_insignia" + datos_insignia )
    })

}

let termino_modulo = ( req, insignia, id_insignia ) => {
    return db.actividadesModulo.findAll({raw: true, nest: true,
        attributes: ['id', 'nombre', 'descripcion', 'archivo','icono', 'foto', 'imagen_panel', 'tipo','etiquetas'], where: {activo: true}, order: [[db.modulos, db.programaUnidadModuloActividad, 'orden', 'ASC' ]],
        include: [{model: db.modulos, required: true, attributes: ['id', 'nombre', 'descripcion'], order: [[db.unidades, db.programaUnidadModulo, 'orden', 'ASC' ]],
            include: [{model: db.unidades, required: true, attributes: ['id', 'nombre', 'descripcion'],
                include: [{model: db.programas,required: true, attributes: [], where: {perfil: req.auth.perfil},
                    include: [{model: db.grupos,required: true,attributes: [],
                        include: [{model: db.usuarios, where: { id: req.auth.id }, required: true, attributes: []}]
                    }]
                }]
            }]
        }]
    })
    .then(function (response) {
        var arr = [];
        //Agregarmos los modulos
        response.forEach( el => {
            var found = false;
            for(var i = 0; i < arr.length; i++) {
                if (arr[i].id === el.Modulos.id) {
                    found = true;
                    break;
                }
            }
            if(!found){
                var obj = {};
                obj['id'] = el.Modulos.id;
                obj['nombre'] = el.Modulos.nombre;
                obj['descripcion'] = el.Modulos.descripcion;
                obj['orden'] = el.Modulos.Unidades.ProgramaUnidadModulo.orden;
                obj['actividades'] = [];
                obj['actsObligatorias'] = [];
                obj['actsObligatoriasPerc'] = [];
                obj['actsFinalizadasObl'] = [];
                obj['actsFinalizadasPerc'] = [];
                obj['idsActividades'] = [];
                obj['actFinalizadas'] = [];
                obj['progreso'] = 0;
                obj['progresoObl'] = 0;
                obj['progresoOblPerc'] = 0;
                arr.push(obj);
            }
        })
        response.forEach( el => {
            var foundIdx = -1;
            for(var i = 0; i < arr.length; i++) {
                if (arr[i].id === el.Modulos.id) {
                    foundIdx = i;
                    break;
                }
            }
            if(foundIdx >= 0){
                var obj = {};
                obj['id'] = el.id;
                obj['nombre'] = el.nombre;
                obj['descripcion'] = el.descripcion;
                obj['foto'] = el.foto;
                obj['icono'] = el.icono;
                obj['imagen_panel'] = el.imagen_panel;
                obj['archivo'] = el.archivo;
                obj['finalizada'] = false;
                obj['tipo'] = (el.tipo===1 ? 'Podcast' : (el.tipo===2 ? 'Video' : (el.tipo===3 ? 'Artículo' : (el.tipo===4 ? 'Toolkit' : (el.tipo===5 ? 'Ejercicio de Reforzamiento' : 'N/D')))));
                arr[foundIdx].actividades.push(obj);
                arr[foundIdx].idsActividades.push(el.id);
                if([1,4,5].indexOf(el.tipo) !== -1){
                    arr[foundIdx].actsObligatorias.push(el.id);
                }
                if([1,2,3].indexOf(el.tipo) !== -1){
                    arr[foundIdx].actsObligatoriasPerc.push(el.id);
                }
            }
        })
        let usuario = req.auth.id
        var in_promises = response.map( (r) => {
            return db.actModCheck.findOne({ where: { actividad: r.id, usuario: usuario } })
            .then(function (data) {
                if (data) {
                    r.finalizada = true;
                    var foundIdx = -1;
                    for(var i = 0; i < arr.length; i++) {
                        if (arr[i].id === r.Modulos.id) {
                            foundIdx = i;
                            break;
                        }
                    }
                    if(foundIdx >= 0){
                        arr[foundIdx].actFinalizadas.push(r.id);
                        for(var i = 0; i < arr[foundIdx].actividades.length; i++) {
                            if (arr[foundIdx].actividades[i].id === r.id) {
                                arr[foundIdx].actividades[i].finalizada = true;

                                if(arr[foundIdx].actsObligatorias.filter( actO => actO === r.id).length > 0){
                                    arr[foundIdx].actsFinalizadasObl.push(r.id)
                                }
                                if(arr[foundIdx].actsObligatoriasPerc.filter( actO => actO === r.id).length > 0){
                                    arr[foundIdx].actsFinalizadasPerc.push(r.id)
                                }
                                break;
                            }      
                        }
                    }	
                }
            })
            .catch(err => {
                logger.error( err )
                return res.status(204).send({
                    status: 204,
                    mensaje:"Error",
                    err
                })
            })
        })

        return Promise.all( in_promises )
        .then(( response_promises ) => {
            //Progreso general
            arr.forEach( (m) => { m.progreso = ( ( m.actFinalizadas.length * 100) / m.idsActividades.length ) } )
            //Progreso Obligatorias P, T, ER
            arr.forEach( (m) => { m.progresoObl = ( ( m.actsFinalizadasObl.length * 100) / m.actsObligatorias.length ) } )
            //Progreso Obligatorias Porcentage P, A, V
            arr.forEach( (m) => { m.progresoPerc = ( ( m.actsFinalizadasPerc.length * 100) / m.actsObligatoriasPerc.length ) } )
            // let progress_check = arr.filter( m => m.progreso >= 80)
            let progress_check = arr.filter( m => m.progresoObl >= 100 )
            if(progress_check.length > 0){
                db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
                .then( ins_created => {
                    logger.info( "Insignia creada (" + id_insignia + ")" )
                    crea_notificacion(req.auth.id, {id_insignia: id_insignia, nombre_insignia: insignia.nombre, imagen_insignia: insignia.imagen}, 4)
                })
                .catch( ins_created => {
                    logger.error( "Err Insignia creada (" + id_insignia + ")" )
                    logger.error( ins_created )
                })
                return id_insignia
            }else{
                return null
            }
        })
    })
    .catch(err => {
        logger.error( err )
        return null
    })
}

let evidencia_primer_reto = (req, insignia, id_insignia) => {
    return db.pu_usuario_actividad.findAndCountAll({ where: {usuario: req.auth.id, archivoReto: {[db.Sequelize.Op.not]: null} } })
    .then( (data_acts) => {
        if(data_acts.count > 0){
            db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
            .then( ins_created => {
                // logger.info( "Insignia creada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia, nombre_insignia: insignia.nombre, imagen_insignia: insignia.imagen}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia creada (" + id_insignia + ")" )
                logger.error( ins_created )
            })
            return id_insignia
        }else{
            return null
        }
    })
    .catch( (err_acts) => {
        logger.error( err_acts )
        return null
    })
}

let primer_ejercicio_reforzamiento = (req, insignia, id_insignia) => {
    return db.actModCheck.findAndCountAll({ where: { usuario: req.auth.id, datos_ejercicio: {[db.Sequelize.Op.ne]:''} } })
    .then( (data_acts) => {
        if(data_acts.count > 0){
            db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
            .then( ins_created => {
                // logger.info( "Insignia creada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia, nombre_insignia: insignia.nombre, imagen_insignia: insignia.imagen}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia creada (" + id_insignia + ")" )
            })
            return id_insignia
        }else{
            return null
        }
    })
    .catch( (err_acts) => {
        logger.error( err_acts )
        return null
    })
}

let primer_toolkit_descargado = (req, insignia, id_insignia) => {
    return db.actModCheck.findAndCountAll({ where: { usuario: req.auth.id, descargado: true } })
    .then( (data_acts) => {
        if(data_acts.count > 0){
            db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
            .then( ins_created => {
                // logger.info( "Insignia creada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia, nombre_insignia: insignia.nombre, imagen_insignia: insignia.imagen}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia creada (" + id_insignia + ")" )
            })
            return id_insignia
        }else{
            return null
        }
    })
    .catch( (err_acts) => {
        logger.error( err_acts )
        return null
    })
}

let primer_rating = (req, insignia, id_insignia) => {
    return db.actModCheck.findAndCountAll({ where: { usuario: req.auth.id, calificacion: {[db.Sequelize.Op.gt]: 0} } })
    .then( (data_acts) => {
        if(data_acts.count > 0){
            db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
            .then( ins_created => {
                // logger.info( "Insignia creada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia, nombre_insignia: insignia.nombre, imagen_insignia: insignia.imagen}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia creada (" + id_insignia + ")" )
            })
            return id_insignia
        }else{
            return null
        }
    })
    .catch( (err_acts) => {
        logger.error( err_acts )
        return null
    })
}

let evaluacion_de_unidad = (req, insignia, id_insignia) => {
    return db.pu_usuario_actividad.findAndCountAll({ where: {usuario: req.auth.id, encuestaSatisfaccion: {[db.Sequelize.Op.not]: null} } })
    .then( (data_acts) => {
        if(data_acts.count > 0){
            db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
            .then( ins_created => {
                // logger.info( "Insignia creada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia, nombre_insignia: insignia.nombre, imagen_insignia: insignia.imagen}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia creada (" + id_insignia + ")" )
                logger.error( ins_created )
            })
            return id_insignia
        }else{
            return null
        }
    })
    .catch( (err_acts) => {
        logger.error( err_acts )
        return null
    })
}

let primer_comentario = (req, insignia, id_insignia) => {
    return db.preguntas.findAndCountAll({ where: { usuario: req.auth.id } })
    .then( (data_acts) => {
        if(data_acts.count > 0){
            db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
            .then( ins_created => {
                // logger.info( "Insignia creada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia, nombre_insignia: insignia.nombre, imagen_insignia: insignia.imagen}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia creada (" + id_insignia + ")" )
            })
            return id_insignia
        }else{
            return null
        }
    })
    .catch( (err_acts) => {
        logger.error( err_acts )
        return null
    })
}

let primer_reply = (req, insignia, id_insignia) => {
    return db.respuestas.findAndCountAll({ where: { usuario: req.auth.id } })
    .then( (data_acts) => {
        if(data_acts.count > 0){
            db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
            .then( ins_created => {
                // logger.info( "Insignia creada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia, nombre_insignia: insignia.nombre, imagen_insignia: insignia.imagen}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia creada (" + id_insignia + ")" )
            })
            return id_insignia
        }else{
            return null
        }
    })
    .catch( (err_acts) => {
        logger.error( err_acts )
        return null
    })
}

let primer_like = (req, insignia, id_insignia) => {
    return db.likes.findAndCountAll({ where: { usuario: req.auth.id } })
    .then( (data_acts) => {
        if(data_acts.count > 0){
            db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
            .then( ins_created => {
                // logger.info( "Insignia creada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia, nombre_insignia: insignia.nombre, imagen_insignia: insignia.imagen}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia creada (" + id_insignia + ")" )
            })
            return id_insignia
        }else{
            return null
        }
    })
    .catch( (err_acts) => {
        logger.error( err_acts )
        return null
    })
}

let evaluacion_extra = async (req, insignia, id_insignia) => {

    if(req.params.id > 0 && req.auth.id > 0){
        let query = "SELECT pu.programaUnidad, COUNT( IF(COALESCE( pu.archivoReto,'') <> '' AND COALESCE( rr.jsonEvaluacion,'') <> '', 1, NULL)) totalEvaluadios \
        FROM PU_Usuario_Actividads pu \
        LEFT JOIN RevisionRetos rr ON pu.id = rr.reto \
        WHERE \
        rr.usuarioRevision = '" + req.auth.id + "'";
        const [Result] = await db.sequelize.query( query )

        if(Result.length > 0){
            let seGanaInsignia = false
            Result.forEach( _ins => {
                if( _ins.totalEvaluadios === 3){
                    seGanaInsignia = true
                }
            })
            if(seGanaInsignia === true){
                return db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
                .then( ins_created => {
                    // logger.info( "Insignia creada (" + id_insignia + ")" )
                    crea_notificacion(req.auth.id, {id_insignia: id_insignia}, 4)
                })
                .catch( ins_created => {
                    logger.error( "Err Insignia creada (" + id_insignia + ")" )
                })
            }
        }
    }
}

let influencer = async (req, insignia, id_insignia, nivel_actual) => {
    let social_rank = "SELECT usuario, SUM(Puntos) AS Puntos, IF(SUM(Puntos) BETWEEN 40 AND 69, 1, IF(SUM(Puntos) BETWEEN 70 AND 99, 2, IF(SUM(Puntos) >= 100, 3, 0))) Nivel FROM ( \
        SELECT usuario, (count(1))*5 AS Puntos FROM Preguntas WHERE usuario = " + req.auth.id + " HAVING Puntos > 0 \
        UNION \
        SELECT usuario, count(1) Puntos FROM Likes WHERE usuario = " + req.auth.id + " \
        UNION \
        SELECT usuario, count(1)*3 Puntos FROM Respuestas WHERE usuario = " + req.auth.id + ") tmp;"
    const [SocialRank] = await db.sequelize.query( social_rank );
    if( nivel_actual === 0 && SocialRank[0].Nivel > 0){
        return db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia, nivel: SocialRank[0].Nivel})
        .then( ins_created => {
            // logger.info( "Insignia creada (" + id_insignia + ")" )
            crea_notificacion(req.auth.id, {id_insignia: id_insignia, nivel: SocialRank[0].Nivel}, 4)
        })
        .catch( ins_created => {
            logger.error( "Err Insignia creada (" + id_insignia + ")" )
        })
    }
    if(nivel_actual > 0 && SocialRank[0].Nivel > nivel_actual ){
        return db.insigniasUsuarios.update({nivel: SocialRank[0].Nivel}, { where: { id: insignia[0].InsigniasUsuarios.id } })
        .then( ins_created => {
            // logger.info( "Insignia actualizada (" + id_insignia + ")" )
            crea_notificacion(req.auth.id, {id_insignia: id_insignia, nivel: SocialRank[0].Nivel}, 4)
        })
        .catch( ins_created => {
            logger.error( "Err Insignia actualizada (" + id_insignia + ")" )
        })
    }
}

let asistencia_perfecta = async (req, insignia, id_insignia, nivel_actual) => {
    try {
        let social_rank = "SELECT pua.usuario, COUNT(1) as Unidades, COUNT(IF(pua.asistencia = 1, 1, NULL)) Asistencias \
        FROM GrupoUsuarios gu \
        JOIN GrupoProgramas gp ON gp.grupo = gu.grupo \
        JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
        JOIN PU_Usuario_Actividads pua ON pua.programaUnidad = pu.id AND pua.usuario = gu.usuario \
        WHERE gu.usuario = " + req.auth.id + ";"
        const [AsistenciaPerfecta] = await db.sequelize.query( social_rank );
        if( AsistenciaPerfecta.length > 0){
            if(AsistenciaPerfecta[0].Unidades === AsistenciaPerfecta[0].Asistencias){
                return db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
                .then( ins_created => {
                    // logger.info( "Insignia creada (" + id_insignia + ")" )
                    crea_notificacion(req.auth.id, {id_insignia: id_insignia}, 4)
                })
                .catch( ins_created => {
                    logger.error( "Err Insignia creada (" + id_insignia + ")" )
                })
            }
        }
    } catch (err) {
        logger.error( "Error Insignia asistencia_perfecta - " + err) 
    }
}

let ins_lift = async (req, insignia, id_insignia) => {
    let sth = "SELECT  \
                IF(  \
                (COUNT(IF(amc.completada = 1 AND (actividad.opcional = 0 OR actividad.tipo IN (1,4,5)),1,NULL))*100) / COUNT(IF(actividad.opcional = 0 OR actividad.tipo IN (1,4,5),1,NULL)) >= 100 AND \
                (COUNT(IF(amc.completada = 1 AND actividad.tipo IN (1,2,3),1,NULL))*100) / COUNT(IF(actividad.tipo IN (1,2,3),1,NULL)) >= 75 AND \
                COALESCE(puua.encuestaSatisfaccion,'') <> '', 'OK', 'NOK') ActsTerminadas \
            FROM Grupos g \
                INNER JOIN GrupoUsuarios gu ON gu.grupo = g.id \
                INNER JOIN Usuarios u ON u.id=gu.usuario \
                INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
                INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
                INNER JOIN ProgramaUnidadModulos pum ON pum.programaUnidad = pu.unidad \
                INNER JOIN PrgUniModActividads puma ON puma.programaUnidadModulo = pum.modulo \
                INNER JOIN Programas programa ON programa.id = pu.programa \
                INNER JOIN Unidades unidad ON unidad.id = pu.unidad \
                INNER JOIN Modulos modulo ON modulo.id=pum.modulo \
                INNER JOIN ActividadesModulos actividad ON actividad.id=puma.actividad \
                LEFT JOIN PU_Usuario_Actividads puua ON puua.programaUnidad = pu.id AND puua.usuario = u.id \
                LEFT JOIN ActModChecks amc ON amc.usuario = u.id AND amc.actividad = actividad.id \
                WHERE modulo.activo = 1 AND u.id = "+req.auth.id+" AND unidad.id = "+insignia[0].unidad+";"
    const [PrgUniAct] = await db.sequelize.query( sth );

    if(PrgUniAct.length > 0){
        if(PrgUniAct[0].ActsTerminadas === 'OK'){
            return db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
            .then( ins_created => {
                // logger.info( "Insignia creada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia creada (" + id_insignia + ")" )
            })
        }
    }
    
}

let leg_lift = async (req, insignia, id_insignia) => {
    let sth = "SELECT g.nombre grupo, programa.nombre programa, unidad.nombre unidad, COUNT(1) TotalActividades, COUNT(IF(amc.completada = 1, 1, NULL)) TotalCompletadas \
                FROM Grupos g \
                    INNER JOIN GrupoUsuarios gu ON gu.grupo = g.id \
                    INNER JOIN Usuarios u ON u.id=gu.usuario \
                    INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
                    INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
                    INNER JOIN ProgramaUnidadModulos pum ON pum.programaUnidad = pu.unidad \
                    INNER JOIN PrgUniModActividads puma ON puma.programaUnidadModulo = pum.modulo \
                    INNER JOIN Programas programa ON programa.id = pu.programa \
                    INNER JOIN Unidades unidad ON unidad.id = pu.unidad \
                    INNER JOIN Modulos modulo ON modulo.id=pum.modulo \
                    INNER JOIN ActividadesModulos actividad ON actividad.id=puma.actividad \
                    LEFT JOIN ActModChecks amc ON amc.usuario = u.id AND amc.actividad = actividad.id \
                WHERE modulo.activo = 1 AND u.id = "+req.auth.id+" AND unidad.id = "+insignia[0].unidad+" \
                HAVING COUNT(1) > 0;"
    const [PrgUniAct] = await db.sequelize.query( sth );

    if(PrgUniAct.length > 0){
        if(PrgUniAct[0].TotalActividades === PrgUniAct[0].TotalCompletadas){
            return db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
            .then( ins_created => {
                // logger.info( "Insignia creada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia creada (" + id_insignia + ")" )
            })
        }
    }
    
}

let lift_lider = async (req, insignia, id_insignia, nivel_actual) => {
    let sth = "SELECT \
                unidad.nombre unidad, IF(guc.ev_enviada = 1, guc.promedio, 0) promedio \
                FROM Grupos g \
                    INNER JOIN GrupoUsuarios gu ON gu.grupo = g.id \
                    INNER JOIN Usuarios u ON u.id=gu.usuario \
                    INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
                    INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
                    INNER JOIN Programas programa ON programa.id = pu.programa \
                    INNER JOIN Unidades unidad ON unidad.id = pu.unidad \
                    LEFT JOIN GU_Cal_Jefe_Unidads guc ON guc.gu_id=gu.id AND guc.unidad = unidad.id \
                WHERE u.id = "+req.auth.id+" \
                ORDER BY pu.orden ASC;"
    const [LiftLider] = await db.sequelize.query( sth );

    if(LiftLider.length > 0){
        let base = 8.0;
        let nivel = 0;
        LiftLider.forEach( lift_ins => {
            if( lift_ins !== 'NA' && lift_ins.promedio >= base){
                base = lift_ins.promedio
                nivel++
            }
        })
        // logger.info( "El usuario "+req.auth.id+" esta en nivel " + nivel )
        // logger.info( nivel_actual + " " + nivel + " " + insignia[0].InsigniasUsuarios.id)
        
        if( nivel_actual === 0 && nivel > 0){
            return db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia, nivel: nivel})
            .then( ins_created => {
                // logger.info( "Insignia creada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia creada (" + id_insignia + ")" )
            })
        }
        if(nivel_actual > 0 && nivel > nivel_actual ){
            return db.insigniasUsuarios.update({nivel: nivel}, { where: { id: insignia[0].InsigniasUsuarios.id } })
            .then( ins_created => {
                // logger.info( "Insignia actualizada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia actualizada (" + id_insignia + ")" )
            })
        }

    }
}

let flash = async (req, insignia, id_insignia, nivel_actual) => {
    let sth = "SELECT COUNT(IF(IF(DATE(CONVERT_TZ(pua.fechaEvaluacion,'+00:00','-05:00')) <= guf.jefeAutoEvFinFecha , 'OK', 'NOK') = 'OK', 1, NULL)) nivel \
    FROM GrupoUsuarios gu \
    LEFT JOIN Grupos g ON gu.grupo = g.id  \
    LEFT JOIN Usuarios u ON gu.usuario = u.id  \
    LEFT JOIN GrupoProgramas gp ON gp.grupo = gu.grupo  \
    LEFT JOIN Programas p ON gp.programa = p.id  \
    LEFT JOIN ProgramaUnidades pu ON pu.programa = p.id  \
    LEFT JOIN Unidades un ON pu.unidad = un.id  \
    LEFT JOIN PU_Usuario_Actividads pua ON pua.usuario = gu.usuario AND pua.programaUnidad = pu.id  \
    LEFT JOIN GrupoUnidadFechas guf ON guf.grupo=g.id AND guf.unidad=un.id  \
    WHERE u.activo = 1 AND COALESCE(pua.archivoReto,'') <> '' AND u.id = "+req.auth.id+" \
    ORDER BY pu.orden ASC;"

    const [Flash] = await db.sequelize.query( sth );

    if(Flash.length > 0){
        let nivel = Flash[0].nivel
        if( nivel_actual === 0 && nivel > 0){
            return db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia, nivel: nivel})
            .then( ins_created => {
                // logger.info( "Insignia creada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia creada (" + id_insignia + ")" )
            })
        }
        if(nivel_actual > 0 && nivel > nivel_actual ){
            return db.insigniasUsuarios.update({nivel: nivel}, { where: { id: insignia[0].InsigniasUsuarios.id } })
            .then( ins_created => {
                // logger.info( "Insignia actualizada (" + id_insignia + ")" )
                crea_notificacion(req.auth.id, {id_insignia: id_insignia}, 4)
            })
            .catch( ins_created => {
                logger.error( "Err Insignia actualizada (" + id_insignia + ")" )
            })
        }

    }
}

let lider_futuro = async (req, insignia, id_insignia, nivel_actual) => {
    try {
        let social_rank = "SELECT COUNT(1) tieneEvFinal FROM evaluacionFinals WHERE usuario = " + req.auth.id + ";"
        const [LiderFuturo] = await db.sequelize.query( social_rank );
        if( LiderFuturo.length > 0){
            if(LiderFuturo[0].tieneEvFinal === 1){
                return db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
                .then( ins_created => {
                    // logger.info( "Insignia creada (" + id_insignia + ")" )
                    crea_notificacion(req.auth.id, {id_insignia: id_insignia}, 4)
                })
                .catch( ins_created => {
                    logger.error( "Err Insignia creada (" + id_insignia + ")" )
                })
            }
        }
    } catch (err) {
        logger.error( "Error Insignia Lider del futuro - " + err) 
    }
}

let retro_master = async (req, insignia, id_insignia, nivel_actual) => {
    try {
        let retro_master = "SELECT \
            IF(COUNT(DISTINCT(unidad.id)) = COUNT(IF(puua.encuesta=1,1,NULL)), 'OK', 'NOK') todasEvs \
        FROM Grupos g \
            INNER JOIN GrupoUsuarios gu ON gu.grupo = g.id \
            INNER JOIN Usuarios u ON u.id=gu.usuario \
            INNER JOIN GrupoProgramas gp ON gp.grupo = g.id \
            INNER JOIN ProgramaUnidades pu ON pu.programa = gp.programa \
            INNER JOIN Programas programa ON programa.id = pu.programa \
            INNER JOIN Unidades unidad ON unidad.id = pu.unidad \
            LEFT JOIN PU_Usuario_Actividads puua ON puua.programaUnidad = pu.id AND puua.usuario = u.id \
            WHERE u.id =" + req.auth.id + ";"
        const [RetroMaster] = await db.sequelize.query( retro_master );
        if( RetroMaster.length > 0){
            if(RetroMaster[0].todasEvs === 'OK'){
                return db.insigniasUsuarios.create({usuario: req.auth.id, insignia: id_insignia})
                .then( ins_created => {
                    // logger.info( "Insignia creada (" + id_insignia + ")" )
                    crea_notificacion(req.auth.id, {id_insignia: id_insignia}, 4)
                })
                .catch( ins_created => {
                    logger.error( "Err Insignia creada (" + id_insignia + ")" )
                })
            }
        }
    } catch (err) {
        logger.error( "Error Insignia Retroalimentador master - " + err) 
    }
}

module.exports = {
    obtieneInsignia
}