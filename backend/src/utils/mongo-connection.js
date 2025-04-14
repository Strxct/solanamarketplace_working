import mongoose from "mongoose";

const connectToDb = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/solana_marketplace", {});
    console.log("Connected to MongoDB");
  } catch (error) {
    console.log("Could not connect to Mongodb", error);
  }
};

export default connectToDb;
