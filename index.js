const fs = require('node:fs');
const path = require('node:path');
const util = require("util")
const Discord = require("discord.js")
const { v4: uuidv4 } = require('uuid');
const { QuickDB } = require("quick.db")
const db = new QuickDB()
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
require("dotenv").config()

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const WHITELISTED = "826175329110196244 347116230349422605"

client.on(Events.MessageCreate, async message => {
  if (message.content.startsWith('!exec')) {
    if (!WHITELISTED.includes(message.author.id)) return message.channel.send("no")
    

    const code = message.content.slice('!exec'.length);    

    try {
      let evaluated = await eval(code);
      
      if (typeof evaluated !== "string") {
        evaluated = util.inspect(evaluated, { depth: 0 }); 
      }

      // Prevent bot token leak
      if (evaluated.includes(client.token)) {
        evaluated = evaluated.replace(client.token, 'TOKEN');
      }
      const id = uuidv4();
      const row = new Discord.ActionRowBuilder()
      .addComponents(
          new Discord.ButtonBuilder()
              .setCustomId('delete-' + id)
              .setLabel('Delete')
              .setStyle(4),
      );

      const evalMessage = await message.channel.send({ content: `\`\`\`js\n${evaluated}\n\`\`\``, components: [row] });

      const filter = i => i.customId === 'delete-' + id 

      const collector = evalMessage.createMessageComponentCollector({ componentType: Discord.ComponentType.Button, time: 15000 });

      collector.on('collect', async (interaction) => {
        await evalMessage.delete();
        await message.delete();
      });

      collector.on('end', async () => {
        try {
          row.components[0].setDisabled(true);
          await evalMessage.edit({ components: [row] });
        } catch {}
      });
    } catch (error) {
      const id = uuidv4();
      const row = new Discord.ActionRowBuilder()
      .addComponents(
        new Discord.ButtonBuilder()
              .setCustomId('log-' + id)
              .setLabel('Log to Console')
              .setStyle(2),
          new Discord.ButtonBuilder()
              .setCustomId('delete-' + id)
              .setLabel('Delete')
              .setStyle(4),
      );

      const errorMessage = await message.channel.send({ content: `\`\`\`js\n${error}\n\`\`\``, components: [row] });

      const filter = i => i.customId === 'delete-' + id || 'log'- + id

      const collector = errorMessage.createMessageComponentCollector({ componentType: Discord.ComponentType.Button, time: 15000 });

      collector.on('collect', async (interaction) => {
        switch (interaction.customId) {
          case `delete-${id}`:
            await errorMessage.delete();
            await message.delete();
            break;
          case `log-${id}`:
            console.error(error);
            await interaction.reply({ content: "Logged!", ephemeral: true });
            break;   
        }
      });

      collector.on('end', async () => {
        try {
          row.components[0].setDisabled(true);
          await errorMessage.edit({ components: [row] });
        } catch {}
      });
    }
    
    
  } 
});


client.login(process.env.TOKEN)