const mongoose = require('mongoose')

async function connectToDB(params) {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not configured")
    }

    try{
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to database')}
    catch(err){
        console.log(err)
        process.exit(1)
    }
}

module.exports = connectToDB
