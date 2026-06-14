require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, 
    PermissionFlagsBits, ChannelType, StringSelectMenuBuilder 
} = require('discord.js');
const mongoose = require('mongoose');

// schemat
const StaffSchema = new mongoose.Schema({
    discordId: String,
    permissionLevel: String,
    power: Number 
});
const Staff = mongoose.model('Staff', StaffSchema);

// configuracja i logs
const CLIENT_ID = "1491503322107084921";
const THEME_COLOR = 0x2f3136; 

const LOGS = {
    KICK: "1495774028881985556",
    VERIFY: "1495773957620760768",
    TICKETS: "1497866329309577246"
};

const FORMATS = {
    bug: "**In-Game/Discord Bug:**\n**Description:**\n**Steps to Reproduce:**",
    exploit: "**Exploit Type:**\n**User:**\n**Proof:**",
    dev_app: "**Role:**\n**Portfolio:**\n**Experience:**",
    alliance: "**Group Name:**\n**Member Count:**\n**Representative:**",
    report: "**User Reporting:**\n**Reason:**\n**Evidence:**",
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ DATABASE CONNECTED'))
    .catch(err => console.error('❌ DATABASE ERROR', err));

// rejestracja komend
const commands = [
    new SlashCommandBuilder().setName('about').setDescription('Bot Information'),
    new SlashCommandBuilder().setName('setup-tickets').setDescription('Deploy ticket panels'),
    new SlashCommandBuilder().setName('setup-discords').setDescription('Deploy discord selection'),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user')
        .addUserOption(o => o.setName('target').setDescription('User to kick').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for kick')),
    new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Link Roblox account')
        .addStringOption(o => o.setName('username').setDescription('Roblox Name').setRequired(true)),
    new SlashCommandBuilder()
        .setName('permission')
        .setDescription('Manage staff permissions')
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
        .addStringOption(o => o.setName('add').setDescription('Role to assign').setRequired(false)
            .addChoices(
                { name: 'Support', value: 'Support' },
                { name: 'Moderator', value: 'Moderator' },
                { name: 'Head Moderator', value: 'Head Moderator' },
                { name: 'Administrator', value: 'Administrator' },
                { name: 'Head Administrator', value: 'Head Administrator' }
            ))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => { 
    try { 
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands }); 
        console.log('✅ Commands Registered!');
    } catch (e) { 
        console.error(e); 
    } 
})();

// pomocnicy
async function sendLog(channelId, title, description, color = THEME_COLOR) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;
    const embed = new EmbedBuilder()
        .setAuthor({ name: "Royal Guard Logging" })
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
    await channel.send({ embeds: [embed] });
}

async function checkPerms(interaction, requiredPower) {
    if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    try {
        const staff = await Staff.findOne({ discordId: interaction.user.id });
        return staff && staff.power >= requiredPower;
    } catch { return false; }
}

async function createTicketChannel(interaction, typeName) {
    const channel = await interaction.guild.channels.create({
        name: `${typeName}-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
    });

    const controlRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('t_claim').setLabel('Claim').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('t_close').setLabel('Close').setStyle(ButtonStyle.Danger)
    );

    const ticketEmbed = new EmbedBuilder()
        .setAuthor({ name: "Royal Guard" })
        .setTitle(`${typeName.toUpperCase()} TICKET`)
        .setDescription(`Hello <@${interaction.user.id}>, staff will be with you shortly.`)
        .setColor(THEME_COLOR);

    await channel.send({ embeds: [ticketEmbed], components: [controlRow] });
    await channel.send(`**TICKET FORMAT:**\n>>> ${FORMATS[typeName] || "**Reason:**"}`);
    
    await sendLog(LOGS.TICKETS, "Ticket Created", `**User:** <@${interaction.user.id}>\n**Type:** ${typeName}\n**Channel:** ${channel.name}`);
    return channel;
}

// interakcje
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        
  
        if (interaction.commandName === 'about') {
            const aboutEmbed = new EmbedBuilder()
                .setTitle("💂 Royal Guard Bot - V5")
                .setThumbnail(client.user.displayAvatarURL())
                .setDescription("A military simulation management bot designed all purpose made by __theflame.")
                .addFields(
                    { name: "Creators", value: "__theflame", inline: true },
                    { name: "Framework", value: "Discord.js v14", inline: true },
                    { name: "Database", value: "MongoDB Atlas", inline: true }
                )
                .setColor(THEME_COLOR)
                .setFooter({ text: "British Army • Royal Guard Development" });
            await interaction.reply({ embeds: [aboutEmbed], flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.commandName === 'kick') {
            if (!(await checkPerms(interaction, 2))) return interaction.reply({ content: "❌ No permission.", flags: [MessageFlags.Ephemeral] });
            const target = interaction.options.getMember('target');
            const reason = interaction.options.getString('reason') || "No reason provided";
            await target.kick(reason);
            await interaction.reply({ content: `✅ Kicked ${target.user.tag}.`, flags: [MessageFlags.Ephemeral] });
            await sendLog(LOGS.KICK, "User Kicked", `**Staff:** <@${interaction.user.id}>\n**Target:** ${target.user.tag}\n**Reason:** ${reason}`, 0xff0000);
        }

        if (interaction.commandName === 'verify') {
            const username = interaction.options.getString('username');
            await interaction.reply({ content: `✅ Verification started for **${username}**.`, flags: [MessageFlags.Ephemeral] });
            await sendLog(LOGS.VERIFY, "Verification Log", `**Discord:** <@${interaction.user.id}>\n**Roblox:** ${username}`);
        }

        if (interaction.commandName === 'setup-tickets') {
            const rEmbed = new EmbedBuilder().setAuthor({ name: "Royal Guard" }).setTitle("REPORT TICKETS").setDescription("Press below to report an incident.").setColor(THEME_COLOR);
            const oEmbed = new EmbedBuilder().setAuthor({ name: "Royal Guard" }).setTitle("OTHER TICKETS").setDescription("Press below for support/apps.").setColor(THEME_COLOR);
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_report').setLabel('Create Ticket').setStyle(ButtonStyle.Danger));
            const btn2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_other').setLabel('Create Ticket').setStyle(ButtonStyle.Danger));
            await interaction.channel.send({ embeds: [rEmbed], components: [btn] });
            await interaction.channel.send({ embeds: [oEmbed], components: [btn2] });
            await interaction.reply({ content: "Deployed.", flags: [MessageFlags.Ephemeral] });
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'ticket_report') {
            const ch = await createTicketChannel(interaction, 'report');
            await interaction.reply({ content: `Ticket created: ${ch}`, flags: [MessageFlags.Ephemeral] });
        }
        
        if (interaction.customId === 'ticket_other') {
            const menu = new StringSelectMenuBuilder().setCustomId('t_select').setPlaceholder('Select Type').addOptions({ label: 'Report Bug', value: 'bug' }, { label: 'Report Exploit', value: 'exploit' }, { label: 'Developer App', value: 'dev_app' }, { label: 'Alliance App', value: 'alliance' });
            await interaction.reply({ content: "Select type:", components: [new ActionRowBuilder().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.customId === 't_claim' || interaction.customId === 't_close') {
            if (!(await checkPerms(interaction, 1))) return interaction.reply({ content: "❌ No permission.", flags: [MessageFlags.Ephemeral] });
            if (interaction.customId === 't_claim') {
                await interaction.channel.send(`🛡️ Ticket claimed by <@${interaction.user.id}>`);
                await sendLog(LOGS.TICKETS, "Ticket Claimed", `**Staff:** <@${interaction.user.id}>\n**Channel:** ${interaction.channel.name}`);
                await interaction.deferUpdate();
            } else {
                const msgs = await interaction.channel.messages.fetch({ limit: 100 });
                const transcript = msgs.reverse().map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}`).join('\n');
                await sendLog(LOGS.TICKETS, "Ticket Closed", `**Closed By:** <@${interaction.user.id}>\n**Channel:** ${interaction.channel.name}\n\n**Transcript:**\n\`\`\`${transcript.slice(0, 1500)}\`\`\``);
                await interaction.reply("🔒 Closing...");
                setTimeout(() => interaction.channel.delete(), 5000);
            }
        }
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 't_select') {
            const ch = await createTicketChannel(interaction, interaction.values[0]);
            await interaction.update({ content: `Ticket created: ${ch}`, components: [], flags: [MessageFlags.Ephemeral] });
        }
    }
});

client.once('ready', () => console.log(`✅ ${client.user.tag} Online!`));
client.login(process.env.DISCORD_TOKEN);