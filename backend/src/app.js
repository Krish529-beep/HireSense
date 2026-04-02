// app.js used for server intiate , middlewares , routes handling

const express = require('express');
const app = express()
const cookieParser = require('cookie-parser')

app.use(express.json())
app.use(cookieParser())

// Require all the routes here 
const authRouter = require('./routes/auth.route.js')

// Using all the routes here
// Learing: Give path correctly
app.use("/api/auth",authRouter)

module.exports = app