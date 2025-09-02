import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import 'dotenv/config';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', () => {
  console.log(`✅ Bot đã đăng nhập thành công với tên ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'hukhong-post') {
    const title = interaction.options.getString('title');
    const content = interaction.options.getString('content');
    const image = interaction.options.getString('image');
    const footer = interaction.options.getString('footer');

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(content)
      .setColor(0x0099ff);

    if (image) embed.setImage(image);
    if (footer) embed.setFooter({ text: footer });

    await interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
