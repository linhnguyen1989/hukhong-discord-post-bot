const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, c => {
  console.log(`✅ Bot đã đăng nhập với tên: ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'hukhong_post') {
    const title = interaction.options.getString('title');
    const content = interaction.options.getString('content');
    const caption = interaction.options.getString('caption') || '';
    const image = interaction.options.getString('image') || '';

    await interaction.reply({
      embeds: [
        {
          title: title,
          description: content,
          image: image ? { url: image } : undefined,
          footer: { text: caption },
          color: 0x00AE86
        }
      ]
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
