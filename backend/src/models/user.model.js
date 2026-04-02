const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        unique:[true,"Username Already Taken"],
        required:true
    },
    email:{
        type:String,
        unique:[true,"Account already exsists with this email"],
        required:true,
    },
    password:{
        type:String,
        required:true,
    }
})

const usermodel = mongoose.model("users",userSchema)

module.exports = usermodel