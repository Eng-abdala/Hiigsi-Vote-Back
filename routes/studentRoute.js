const express = require('express');
const router = express.Router();
const Student = require('../models/student');
const { auth, requireAdmin } = require('../middleware/auth');

// public: list and get
router.get('/', async (req, res) => {
    try {
        const students = await Student.find().lean();
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).lean();
        if (!student) return res.status(404).json({ error: 'Student not found' });
        res.json(student);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const handleStudentErrors = (err, res) => {
    if (err.code === 11000) {
        // Duplicate key error
        if (err.keyValue.studentId) {
            return res.status(400).json({ error: `Student with ID '${err.keyValue.studentId}' already exists.` });
        }
        return res.status(400).json({ error: 'Duplicate field value entered.' });
    }

    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({ error: messages.join('. ') });
    }

    return res.status(400).json({ error: err.message });
};

// protected: create/update/delete require admin
router.post('/', auth, requireAdmin, async (req, res) => {
    try {
        const student = new Student(req.body);
        await student.save();
        res.status(201).json(student);
    } catch (err) {
        handleStudentErrors(err, res);
    }
});

router.put('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
        if (!student) return res.status(404).json({ error: 'Student not found' });
        res.json(student);
    } catch (err) {
        handleStudentErrors(err, res);
    }
});

router.delete('/clear-all', auth, requireAdmin, async (req, res) => {
    try {
        await Student.deleteMany({});
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', auth, requireAdmin, async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
