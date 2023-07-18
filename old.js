const fs = require('node:fs');
const path = require('node:path');
const util = require("util")
const Discord = require("discord.js")
const { v4: uuidv4 } = require('uuid');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
require("dotenv").config()

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const BOT_OWNER = "347116230349422605"

client.on(Events.MessageCreate, async message => {
  if (message.content.startsWith('!exec')) {
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
              .setCustomId('delete-' + uuidv4())
              .setLabel('Delete')
              .setStyle(4),
      );

      const evalMessage = await message.channel.send({ content: `\`\`\`js\n${evaluated}\n\`\`\`` });

      const filter = i => i.customId === 'delete-' + id 

      const collector = evalMessage.createMessageComponentCollector({ componentType: Discord.ComponentType.Button, time: 15000 });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== BOT_OWNER) {
          return interaction.reply({ content: "You did not execute this command.", ephemeral: true })
        }
        
        if (interaction.customId === 'delete-' + id) {
          await evalMessage.delete()
        }
      });

      collector.on('end', async () => {
        row.components[0].setDisabled(true);
        //await evalMessage.edit({ components: [row] });
      });
    } catch (error) {
      message.channel.send(`\`\`\`js\n${error}\n\`\`\``);
      console.error(error)
    }
  } else if (message.content.startsWith('!savescript')) {
    const args = message.content.split(' ').slice(1);
    const scriptName = args.shift();
    const scriptCode = message.content.slice(`!savescript ${scriptName}`.length + 1);

    db.set(`scripts.${scriptName}`, scriptCode);
    message.channel.send(`Script \`${scriptName}\` has been saved.`);
  }

  // Run script
  if (message.content.startsWith('!script')) {
    const scriptName = message.content.split(' ')[1];

    const scriptCode = db.get(`scripts.${scriptName}`);
    if (scriptCode) {
      try {
        const scriptFunc = new Function('message', scriptCode);
        let result = await scriptFunc(message);

        if (result instanceof Promise) {
          result = await result;
        }

        if (typeof result !== "string") {
          result = util.inspect(result, { depth: 0 });
        }

        // Prevent bot token leak
        if (result.includes(client.token)) {
          result = result.replace(client.token, 'TOKEN');
        }

        message.channel.send(`\`\`\`js\n${result}\n\`\`\``);
      } catch (error) {
        message.channel.send(`\`\`\`js\n${error}\n\`\`\``);
      }
    } else {
      message.channel.send(`Script \`${scriptName}\` does not exist.`);
    }
  }
});

client.login(process.env.TOKEN)