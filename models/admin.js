const mongoose = require('mongoose');
//schema for admin
const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true    

    },
    adminId: {
    type: String,   
    required: true
    },
    avatar: {
    type: String,
    default: ''
    }
});
module.exports = mongoose.model('Admin', adminSchema);