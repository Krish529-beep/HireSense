const jwt = require('jsonwebtoken')
const tokenBlackListModel = require('../models/balcklist.model.js')


async function authUser(req, res, next) {
    const token = req.cookies.token
    if (!token) {
        return res.status(401).json({
            message: "token not provided"
        })
    }

    const isTokenBlacklisted = await tokenBlackListModel.findOne({token})

    if(isTokenBlacklisted){
        return res.status(401).json({
            message:"Token is Invalid"
        })
    }

    // if token is wrong or expired then verify throws an exception so handle it with try-catch
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (err) {
        console.log(err);
        return res.status(401).json({
            "message": "Invalid Token"
        })
    }
}

module.exports = { authUser }

