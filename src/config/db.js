import mongoose from "mongoose";

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDb Connected')

    } catch (error) {
        console.error(error.message)
        process.exit(1)
    }
}

export default connectDb;