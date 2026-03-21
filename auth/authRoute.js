const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const Student = require('../models/student');
const { JWT_SECRET } = require('../middleware/auth');

// POST /auth/login
router.post('/login', async (req, res) => {
    const { type } = req.body;
    try {
        if (type === 'admin') {
            const { username, adminId } = req.body;
            const admin = await Admin.findOne({ username, adminId }).lean();
            if (!admin) return res.status(401).json({ error: 'Invalid admin credentials' });
            const token = jwt.sign({ id: admin._id, type: 'admin', username: admin.username }, JWT_SECRET, { expiresIn: '2h' });
            return res.json({ token, user: admin, type: 'admin' });
        }

        // default to student
        const { name, studentId } = req.body;
        const student = await Student.findOne({ name, studentId }).lean();
        if (!student) return res.status(401).json({ error: 'Invalid student credentials' });
        const token = jwt.sign({ id: student._id, type: 'student', name: student.name }, JWT_SECRET, { expiresIn: '2h' });
        return res.json({ token, user: student, type: 'student' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
