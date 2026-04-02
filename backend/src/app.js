// app.js used for server intiate , middlewares , routes handling

const cors = require('cors')
const express = require('express');
const app = express()
const cookieParser = require('cookie-parser')

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}))
// Require all the routes here 
const authRouter = require('./routes/auth.route.js')

// Using all the routes here
// Learing: Give path correctly
app.use("/api/auth",authRouter)

module.exports = app