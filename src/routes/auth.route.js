// Auth related routes

const express = require('express')
const { models } = require('mongoose')
const authController = require('../controllers/auth.controler.js')

const authRouter = express.Router()
/**
 * @route POST /api/auth/register
 * @description Register new user
 * @access Public
 */

authRouter.post('/register',authController.registerUserController)

/**
 * @route POST /api/auth/login
 * @deprecated login user with email and password
 * @access Public
 */
authRouter.post('/login',authController.loginUserController)

/**
 * @route GET /api/auth/logout
 * @deprecated clear token from user cookie and add the token in the blacklist
 * @access Public
 */
authRouter.get('/logout',authController.logoutUserController)




module.exports = authRouter