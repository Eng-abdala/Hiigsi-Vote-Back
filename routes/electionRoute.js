const express = require('express');
const router = express.Router();
const Election = require('../models/election');
const { auth, requireAdmin } = require('../middleware/auth');

// require authentication for all election endpoints
router.use(auth);

function validateElectionPayload(body) {
    if (!body || typeof body !== 'object') return 'Invalid payload';
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) return 'Title is required';
    if (body.startDate && isNaN(Date.parse(body.startDate))) return 'Invalid startDate';
    if (body.endDate && isNaN(Date.parse(body.endDate))) return 'Invalid endDate';
    if (body.startDate && body.endDate && new Date(body.startDate) > new Date(body.endDate)) return 'startDate must be before endDate';
    if (body.positions && !Array.isArray(body.positions)) return 'positions must be an array';
    if (Array.isArray(body.positions)) {
        const candidateIds = new Set();
        for (const p of body.positions) {
            if (!p.name || typeof p.name !== 'string' || !p.name.trim()) return 'Each position must have a name';
            if (p.maxVotes !== undefined && (typeof p.maxVotes !== 'number' || p.maxVotes < 1)) return 'position.maxVotes must be a positive number';
            if (p.candidates && !Array.isArray(p.candidates)) return 'position.candidates must be an array';
            if (Array.isArray(p.candidates)) {
                for (const c of p.candidates) {
                    if (!c.name || typeof c.name !== 'string' || !c.name.trim()) return 'Each candidate must have a name';
                    if (c.studentId) {
                        if (candidateIds.has(c.studentId)) {
                            return `Duplicate candidate detected: Student ID '${c.studentId}' is added more than once.`;
                        }
                        candidateIds.add(c.studentId);
                    }
                }
            }
        }
    }
    return null;
}

// Create election (admins only)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const errMsg = validateElectionPayload(req.body);
        if (errMsg) return res.status(400).json({ error: errMsg });

        const payload = {
            title: req.body.title.trim(),
            description: req.body.description || '',
            startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
            endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
            positions: (req.body.positions || []).map(p => ({
                name: p.name.trim(),
                maxVotes: typeof p.maxVotes === 'number' ? p.maxVotes : 1,
                candidates: (p.candidates || []).map(c => ({
                    name: c.name.trim(),
                    studentId: c.studentId || '',
                    grade: c.grade || '',
                    manifesto: c.manifesto || '',
                    photo: c.photo || ''
                }))
            }))
        };

        const election = new Election(payload);
        await election.save();
        res.status(201).json(election);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// List elections
router.get('/', async (req, res) => {
    try {
        const elections = await Election.find().sort({ createdAt: -1 }).lean();

        // Get total number of students for percentage calculation
        const Student = require('../models/student');
        const totalStudents = await Student.countDocuments();

        const Vote = require('../models/vote');

        // Add stats to each election
        const electionsWithStats = await Promise.all(elections.map(async (election) => {
            // Count unique voters for this election
            const votedCount = (await Vote.distinct('studentId', { electionId: election._id })).length;

            return {
                ...election,
                totalVoters: totalStudents,
                votedCount,
                turnoutPercentage: totalStudents > 0 ? (votedCount / totalStudents) * 100 : 0
            };
        }));

        res.json(electionsWithStats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single election
router.get('/:id', async (req, res) => {
    try {
        const election = await Election.findById(req.params.id).lean();
        if (!election) return res.status(404).json({ error: 'Not found' });

        const Student = require('../models/student');
        const Vote = require('../models/vote');

        const totalStudents = await Student.countDocuments();
        const votedCount = (await Vote.distinct('studentId', { electionId: election._id })).length;

        const electionWithStats = {
            ...election,
            totalVoters: totalStudents,
            votedCount,
            turnoutPercentage: totalStudents > 0 ? (votedCount / totalStudents) * 100 : 0
        };

        res.json(electionWithStats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update election (admins only)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const errMsg = validateElectionPayload(req.body);
        if (errMsg) return res.status(400).json({ error: errMsg });

        const payload = {
            title: req.body.title.trim(),
            description: req.body.description || '',
            startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
            endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
            positions: (req.body.positions || []).map(p => ({
                name: p.name.trim(),
                maxVotes: typeof p.maxVotes === 'number' ? p.maxVotes : 1,
                candidates: (p.candidates || []).map(c => ({
                    name: c.name.trim(),
                    studentId: c.studentId || '',
                    grade: c.grade || '',
                    manifesto: c.manifesto || '',
                    photo: c.photo || ''
                }))
            }))
        };

        const election = await Election.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
        if (!election) return res.status(404).json({ error: 'Not found' });
        res.json(election);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete election (admins only)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const election = await Election.findByIdAndDelete(req.params.id);
        if (!election) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
