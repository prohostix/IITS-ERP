import dotenv from 'dotenv';
import { connectDatabase } from '../config/database.js';
import User from '../models/User.js';

dotenv.config();

const addUserIds = async () => {
  try {
    await connectDatabase();

    console.log('🔄 Adding userId to existing users...');
    
    const users = await User.find({ userId: { $exists: false } }).sort({ createdAt: 1 });
    
    for (let i = 0; i < users.length; i++) {
      const userId = `IITSRPS${String(i + 1).padStart(4, '0')}`;
      users[i].userId = userId;
      await users[i].save({ validateBeforeSave: false });
      console.log(`✅ Added userId ${userId} to ${users[i].email}`);
    }

    console.log(`\n✅ Successfully added userId to ${users.length} users!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

addUserIds();
