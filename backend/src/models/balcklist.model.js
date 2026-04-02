const mongoose  = require('mongoose')


const blacklistTokenSchema = new mongoose.Schema({
    token:{
        type:String,
        required:[true,"Token is required to be added in blacklist"]
    }
},{
    timestamps:true
})
 

const tokenBlackListModel = mongoose.model('blacklisttoken',blacklistTokenSchema)


module.exports = tokenBlackListModel