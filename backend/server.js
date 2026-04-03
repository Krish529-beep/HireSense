require('dotenv').config()
const app = require('./src/app.js')
const connectToDB = require('./src/config/database.js')

const dns = require('dns');
dns.setServers(["1.1.1.1","8.8.8.8"])

connectToDB()

const PORT = Number(process.env.PORT) || 3000

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`)  
})

