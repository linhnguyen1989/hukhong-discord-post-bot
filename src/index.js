import { Client, GatewayIntentBits, Events } from 'discord.js';
import 'dotenv/config';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, c => {
  console.log(`✅ Bot đã đăng nhập với tên: ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'hukhong_post') {
    try {
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
            color: 0x00AE86,
          },
        ],
      });
    } catch (error) {
      console.error('❌ Lỗi khi xử lý lệnh:', error);
      if (!interaction.replied) {
        await interaction.reply({
          content: 'Đã xảy ra lỗi khi xử lý lệnh!',
          ephemeral: true,
        });
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
