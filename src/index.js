import { Client, GatewayIntentBits, Events } from 'discord.js';
import 'dotenv/config';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, c => {
  console.log(`Bot đã đăng nhập: ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'hukhong_post') {
    const content = interaction.options.getString('content');
    await interaction.reply({ content: `Bạn vừa gửi nội dung:\n\n${content}` });
  }
});

client.login(process.env.DISCORD_TOKEN);
