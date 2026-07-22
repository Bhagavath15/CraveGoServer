import mongoose from "mongoose";

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDb Connected');

        const db = mongoose.connection.db;
        const collections = await db.listCollections({ name: 'users' }).toArray();
        if (collections.length > 0) {
            const indexes = await db.collection('users').indexes();
            const phoneIndex = indexes.find(i => i.name === 'phoneNumber_1');
            if (phoneIndex) {
                await db.collection('users').dropIndex('phoneNumber_1');
                console.log('Dropped stale phoneNumber_1 index');
            }
        }
    } catch (error) {
        console.error(error.message)
        process.exit(1)
    }
}

export default connectDb;