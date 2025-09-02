import { 
  Client, GatewayIntentBits, Events, ModalBuilder, TextInputBuilder, TextInputStyle, 
  ActionRowBuilder, InteractionType, ButtonBuilder, ButtonStyle 
} from 'discord.js';
import 'dotenv/config';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once(Events.ClientReady, c => {
  console.log(`✅ Bot đã đăng nhập với tên: ${c.user.tag}`);
});

// Slash command mở Modal
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'hukhong_post') {
    const modal = new ModalBuilder()
      .setCustomId('post_modal')
      .setTitle('Tạo bài viết mới');

    const titleInput = new TextInputBuilder()
      .setCustomId('title_input')
      .setLabel('Tiêu đề')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const contentInput = new TextInputBuilder()
      .setCustomId('content_input')
      .setLabel('Nội dung')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(contentInput)
    );

    await interaction.showModal(modal);
  }
});

// Modal submit
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'post_modal') {
    const title = interaction.fields.getTextInputValue('title_input');
    const content = interaction.fields.getTextInputValue('content_input');

    // Tạo nút upload ảnh
    const uploadButton = new ButtonBuilder()
      .setCustomId('upload_image')
      .setLabel('Tải ảnh từ máy tính')
      .setStyle(ButtonStyle.Primary);

    await interaction.reply({ 
      content: 'Nhấn nút để tải lên ảnh nếu muốn thêm vào bài viết:',
      components: [new ActionRowBuilder().addComponents(uploadButton)],
      ephemeral: true
    });

    // Lắng nghe button click trong 5 phút
    const filter = i => i.customId === 'upload_image' && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000, max: 1 });

    collector.on('collect', async i => {
      await i.reply({ content: 'Vui lòng gửi ảnh dưới dạng file trong kênh này.', ephemeral: true });

      // Lắng nghe file upload
      const fileFilter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
      const fileCollector = interaction.channel.createMessageCollector({ filter: fileFilter, max: 1, time: 300000 });

      fileCollector.on('collect', async msg => {
        const attachment = msg.attachments.first();
        const embed = {
          title: title,
          description: content,
          image: { url: attachment.url },
          color: 0x00AE86
        };

        await interaction.followUp({ content: '✅ Bài viết đã được tạo:', embeds: [embed] });
      });

      fileCollector.on('end', collected => {
        if (collected.size === 0) {
          interaction.followUp({ content: '⚠️ Không có ảnh được tải lên, bài viết chỉ có text.' });
        }
      });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.followUp({ content: '⚠️ Bạn đã không nhấn nút tải ảnh, bài viết chỉ có text.' });
      }
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
