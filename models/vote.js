const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
    electionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Election',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    positionId: {
        type: String,
        required: true
    },
    candidateId: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure one vote per student per position per election
VoteSchema.index({ electionId: 1, studentId: 1, positionId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', VoteSchema);

