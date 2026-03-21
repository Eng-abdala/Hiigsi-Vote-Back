const mongoose = require('mongoose');
const Admin = require('../models/admin');
const Election = require('../models/election');
const Student = require('../models/student');
const Vote = require('../models/vote');

const DB_URI = 'mongodb://localhost:27017/voting_system';

async function diagnose() {
    try {
        console.log(`Connecting to ${DB_URI}...`);
        await mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected.');

        const collections = ['Admin', 'Election', 'Student', 'Vote'];
        const models = { Admin, Election, Student, Vote };

        for (const name of collections) {
            const count = await models[name].countDocuments();
            console.log(`${name} count: ${count}`);
            if (count > 0) {
                const sample = await models[name].findOne().lean();
                console.log(`Sample ${name}:`, JSON.stringify(sample, null, 2));
            }
        }

        const dbs = await mongoose.connection.db.admin().listDatabases();
        console.log('Available Databases:');
        dbs.databases.forEach(db => console.log(` - ${db.name}`));

    } catch (err) {
        console.error('DIAGNOSTIC ERROR:', err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

diagnose();
