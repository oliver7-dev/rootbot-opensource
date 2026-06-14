const express = require('express');
const noblox = require('noblox.js');
const UserLink = require('./database/UserLink');

const app = express();
app.use(express.json()); // Allows us to read JSON from Roblox

// Endpoint for your Roblox game to send data to
app.post('/api/verify', async (req, res) => {
    const { discordId, robloxUsername } = req.body;

    if (!discordId || !robloxUsername) {
        return res.status(400).json({ error: "Missing data" });
    }

    try {
        // Get the Roblox User ID using noblox.js
        const robloxId = await noblox.getIdFromUsername(robloxUsername);
        
        // Save to Database
        const newLink = new UserLink({
            discordId: discordId,
            robloxId: robloxId.toString(),
            robloxUsername: robloxUsername
        });

        await newLink.save();
        res.status(200).json({ success: true, message: "Account linked successfully!" });
        console.log(`Linked Discord ${discordId} to Roblox ${robloxUsername}`);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to link account" });
    }
});

module.exports = app;