// Mongoose controller
import mongoose from "mongoose";
import { Channel, DirectMessages, IChannel, IMessage } from "../models/channel";
import { MessageQueue, IMessageQueue } from "../models/messageQueue";

// MONGODB MONGOOS DAL CLASS
const MongooseDal = {
    connect: async () => {
        return await mongoose.connect("mongodb://127.0.0.1:27017/benderirc");
    },
    createChannel: async (channel: IChannel) => {
        // Create only if the channel doesn't have the same name
        const existingChannel = await Channel.findOne({ name: channel.name, owner: channel.owner });
        if (existingChannel) {
            console.log("Channel already exists");
            return;
        }
        return await Channel.create(channel);
    },
    getChannels: async () => {
        return await Channel.find();
    },
    getChannelByName: async (name: string) => {
        return await Channel.findOne({ name });
    },
    addMessage: async (channelName: string, message: IMessage) => {
        // If the channel selected is not active ignore
        const channel = await Channel.findOne({ name: channelName });
        if (!channel || !channel.active) 
            return;

        return Channel.updateOne( { name: channelName }, { $push: { messages: message }, updated_at: new Date() });
    },
    getChannelsForUser: async (username: string) => {
       return await Channel.find({ owner: username, active: true }, { name: 1, updated_at: 1 });
    },
    getMessagesForChannel: async (channelName: string) => {
        var messages =  await Channel.findOne({ name: channelName }, { messages: 1 });
        return messages;
    },
    getDirectMessagesForUser: async (owner: string, external_user: string) => {
        return await DirectMessages.findOne({ owner, external_user }, { messages: 1 });
    },
    addDirectMessage: async (owner:string, external_user:string, message:IMessage) => {
        const directMessage = await DirectMessages.findOne({ owner, external_user });
        if (!directMessage) {
            return await DirectMessages.create({ owner, external_user, messages: [message] });
        } else {
            return await DirectMessages.updateOne({ owner, external_user }, { $push: { messages: message } });
        }
    },
    addMessageToQueue: async (message: IMessageQueue) => {
        return await MessageQueue.create(message);
    }
};

export default MongooseDal;