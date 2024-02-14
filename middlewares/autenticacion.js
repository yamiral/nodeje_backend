const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require("path");

/*=============================================
Verificar token
=============================================*/

let verificarToken = (req, res, next)=>{
	var publicKey = fs.readFileSync(path.join(__dirname,'../config/jwt-keys/public.key'));
	var signOpts = {
		issuer: process.env.JWT_ISSUER,
		audience: process.env.JWT_AUDIENCE,
		expiresIn: process.env.JWT_EXPIRES,
		algorithm: ["RS256"]
	}
	let token = req.get('Authorization');
	jwt.verify(token, publicKey, signOpts, (err, decoded)=>{
		if(err){
			return res.json({
				status:401,
				mensaje: "El token de autorización no es válido",
				err
			})

		}
		req.auth = decoded.data;
		next();
	})
}
module.exports = {
	verificarToken
}
