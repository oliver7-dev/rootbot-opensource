const mongoose = require('mongoose');

const userLinkSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    robloxId: { type: String, required: true },
    robloxUsername: { type: String, required: true },
    verifiedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserLink', userLinkSchema);