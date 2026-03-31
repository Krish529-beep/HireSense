// app.js used for server intiate , middlewares , routes handling

const express = require('express');

const app = express()

app.use(express.json())


module.exports = app