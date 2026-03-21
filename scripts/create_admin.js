const mongoose = require('mongoose');
const Admin = require('../models/admin');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/voting_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('Connected to MongoDB');
    manageAdmin();
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  });

async function manageAdmin() {
  try {
    const username = await askQuestion('Enter Admin Username (default: admin): ') || 'admin';

    let existingAdmin = await Admin.findOne({ username });

    if (existingAdmin) {
      const update = await askQuestion(`Admin '${username}' already exists. Do you want to update it? (y/n): `);
      if (update.toLowerCase() !== 'y') {
        console.log('Operation cancelled.');
        process.exit(0);
      }
    }

    const adminId = await askQuestion('Enter Admin ID (default: admin123): ') || 'admin123';

    if (existingAdmin) {
      existingAdmin.adminId = adminId;
      await existingAdmin.save();
      console.log(`Admin '${username}' updated successfully!`);
    } else {
      const newAdmin = new Admin({
        username,
        adminId,
        avatar: 'https://cdn-icons-png.flaticon.com/512/147/147144.png'
      });
      await newAdmin.save();
      console.log(`Admin '${username}' created successfully!`);
    }

    console.log(`Username: ${username}`);
    console.log(`Admin ID: ${adminId}`);

  } catch (error) {
    console.error('Error managing admin user:', error);
  } finally {
    mongoose.connection.close();
    rl.close();
  }
}
