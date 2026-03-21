const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    studentId: { type: String },
    grade: { type: String },
    manifesto: { type: String },
    photo: { type: String },
}, { _id: true });

const PositionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    maxVotes: { type: Number, default: 1 },
    candidates: [CandidateSchema],
}, { _id: true });

const ElectionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    positions: [PositionSchema],
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Election', ElectionSchema);
