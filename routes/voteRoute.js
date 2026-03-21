const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Vote = require('../models/vote');
const Election = require('../models/election');
const { auth } = require('../middleware/auth');

// Submit vote (students only)
router.post('/', auth, async (req, res) => {
    try {
        // Only students can vote
        if (req.user.type !== 'student') {
            return res.status(403).json({ error: 'Only students can vote' });
        }

        const { electionId, positionId, candidateId } = req.body;

        if (!electionId || !positionId || !candidateId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if election exists and is active
        const election = await Election.findById(electionId);
        if (!election) {
            return res.status(404).json({ error: 'Election not found' });
        }

        const now = new Date();
        let startDate = new Date(election.startDate);
        let endDate = new Date(election.endDate);

        // Ensure dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: 'Invalid election dates' });
        }

        // Set endDate to end of day (23:59:59.999) to allow voting throughout the entire end date
        endDate.setHours(23, 59, 59, 999);

        // Set startDate to beginning of day (00:00:00.000)
        startDate.setHours(0, 0, 0, 0);

        // Check if election is active (allow voting if current time is between start and end dates)
        if (now < startDate) {
            return res.status(400).json({ error: 'Election has not started yet' });
        }
        if (now > endDate) {
            return res.status(400).json({ error: 'Election has ended' });
        }

        // Check if position exists
        const position = election.positions.find(p => (p._id || p.id).toString() === positionId);
        if (!position) {
            return res.status(400).json({ error: 'Position not found' });
        }

        // Check if candidate exists
        const candidate = position.candidates.find(c => (c._id || c.id).toString() === candidateId);
        if (!candidate) {
            return res.status(400).json({ error: 'Candidate not found' });
        }

        // Check if user already voted for this position
        const existingVote = await Vote.findOne({
            electionId,
            studentId: req.user.id,
            positionId
        });

        if (existingVote) {
            return res.status(400).json({ error: 'You have already voted for this position' });
        }

        // Create vote
        const vote = new Vote({
            electionId,
            studentId: req.user.id,
            positionId,
            candidateId
        });

        await vote.save();
        res.status(201).json(vote);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'You have already voted for this position' });
        }
        res.status(400).json({ error: err.message });
    }
});

// Get user's votes for an election
router.get('/election/:electionId/user', auth, async (req, res) => {
    try {
        const targetElectionId = req.params.electionId;
        const votes = await Vote.find({
            electionId: targetElectionId,
            studentId: req.user.id
        });
        res.json(votes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Check if user has voted in an election
router.get('/election/:electionId/check', auth, async (req, res) => {
    try {
        const targetElectionId = req.params.electionId;
        const vote = await Vote.findOne({
            electionId: targetElectionId,
            studentId: req.user.id
        });
        res.json({ hasVoted: !!vote });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get class-level voting statistics (admin only)
router.get('/stats/classes', auth, async (req, res) => {
    try {
        if (req.user.type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const Student = require('../models/student');
        const students = await Student.find().lean();
        
        const uniqueVoters = await Vote.distinct('studentId');
        const voterIds = new Set(uniqueVoters.map(id => String(id)));

        const classStats = {};
        
        students.forEach(student => {
            const className = student.class || student.grade || 'Unassigned';
            if (!classStats[className]) {
                classStats[className] = {
                    className,
                    totalStudents: 0,
                    votedCount: 0,
                    unvotedCount: 0
                };
            }
            classStats[className].totalStudents += 1;
            
            if (voterIds.has(String(student._id))) {
                classStats[className].votedCount += 1;
            } else {
                classStats[className].unvotedCount += 1;
            }
        });

        const result = Object.values(classStats).sort((a, b) => a.className.localeCompare(b.className));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all votes for an election (admin only)
// Get election results (admin only)
router.get('/election/:electionId/results', auth, async (req, res) => {
    try {
        const currentElectionId = req.params.electionId;

        if (!mongoose.Types.ObjectId.isValid(currentElectionId)) {
            return res.status(400).json({ error: 'Invalid Election ID' });
        }

        // Fetch election details
        const election = await Election.findById(currentElectionId).lean();
        if (!election) {
            return res.status(404).json({ error: 'Election not found' });
        }

        // All users can view results regardless of election date

        // Fetch all votes for this election
        // We try both ObjectId and String just in case of inconsistent data
        let votes = await Vote.find({ electionId: new mongoose.Types.ObjectId(currentElectionId) }).lean();
        if (votes.length === 0) {
            votes = await Vote.find({ electionId: currentElectionId.toString() }).lean();
        }

        // Count total eligible voters (all students)
        const Student = require('../models/student');
        const totalVoters = await Student.countDocuments();

        // Aggregate results
        const results = {
            id: election._id,
            electionTitle: election.title,
            totalVoters,
            totalVotes: votes.length,
            turnoutPercentage: totalVoters > 0 ? (new Set(votes.map(v => String(v.studentId))).size / totalVoters) * 100 : 0,
            positions: (election.positions || []).map(position => {
                const posId = String(position._id || position.id).trim();
                const positionVotes = votes.filter(v => String(v.positionId).trim() === posId);
                const totalPositionVotes = positionVotes.length;

                const candidateResults = (position.candidates || []).map(candidate => {
                    const candId = String(candidate._id || candidate.id).trim();
                    const candidateVotes = positionVotes.filter(v => String(v.candidateId).trim() === candId).length;
                    return {
                        candidateId: candId,
                        candidateName: candidate.name,
                        votes: candidateVotes,
                        percentage: totalPositionVotes > 0 ? (candidateVotes / totalPositionVotes) * 100 : 0
                    };
                });

                return {
                    positionId: posId,
                    positionName: position.name,
                    totalVotes: totalPositionVotes,
                    results: candidateResults
                };
            })
        };

        res.json(results);
    } catch (err) {
        console.error('CRITICAL ERROR in /results endpoint:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

module.exports = router;

