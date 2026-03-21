const mongoose = require('mongoose');
//schema for student
const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    studentId: {
        type: String,
        required: true,
        unique: true
    },
    class: {
        type: String,
        required: true
    }
});
module.exports = mongoose.model('Student', studentSchema);