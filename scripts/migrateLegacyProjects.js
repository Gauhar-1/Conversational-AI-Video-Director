const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const DEV_DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";
  
  const result = await mongoose.connection.db.collection('projects').updateMany(
    {
      $or: [
        { userId: { $exists: false } },
        { userId: null },
        { userId: '' }
      ]
    },
    { $set: { userId: DEV_DEFAULT_USER_ID } }
  );
  
  console.log('Successfully updated legacy projects count:', result.modifiedCount);
  
  const allProjects = await mongoose.connection.db.collection('projects').find({}).toArray();
  allProjects.forEach(p => console.log('Project in DB:', p._id.toString(), '| Title:', p.title, '| userId:', p.userId));
  
  await mongoose.disconnect();
}

migrate().catch(console.error);
