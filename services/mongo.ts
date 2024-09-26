// Mongoose controller
import mongoose from "mongoose";
import { Channel, IChannel, IMessage } from "../models/channel";

// MONGODB MONGOOS DAL CLASS
const MongooseDal = {
    connect: async () => {
        return await mongoose.connect("mongodb://127.0.0.1:27017/benderirc");
    },
    createChannel: async (channel: IChannel) => {
        // Create only if the channel doesn't have the same name
        const existingChannel = await Channel.findOne({ name: channel.name });
        if (existingChannel) {
            throw new Error("Channel already exists");
        }
        await MongooseDal.connect();
        return await Channel.create(channel);
    },
    getChannels: async () => {
        await MongooseDal.connect();
        return await Channel.find();
    },
    getChannelByName: async (name: string) => {
        return await Channel.findOne({ name });
    },
    addMessage: async (channelName: string, message: IMessage) => {
        await MongooseDal.connect();
        return Channel.updateOne( { name: channelName }, { $push: { messages: message }, updated_at: new Date() });
    }
};

export default MongooseDal;