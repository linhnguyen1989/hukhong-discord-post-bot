import { 
  Client, GatewayIntentBits, Events, ModalBuilder, TextInputBuilder, TextInputStyle, 
  ActionRowBuilder, InteractionType, ButtonBuilder, ButtonStyle
} from 'discord.js';
import 'dotenv/config';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Bot online
client.once(Events.ClientReady, c => {
  console.log(`✅ Bot đã đăng nhập với tên: ${c.user.tag}`);
});

// Debug helper
function logDebug(stage, data) {
  console.log(`🛠 [DEBUG] ${stage}:`, data);
}

// Slash command mở Modal
client.on(Events.InteractionCreate, async interaction => {
  logDebug('Interaction received', { type: interaction.type, user: interaction.user?.tag, command: interaction.commandName });

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'hukhong_post') {
    try {
      logDebug('Opening Modal', interaction.user?.tag);

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
      logDebug('Modal shown', interaction.user?.tag);

    } catch (err) {
      console.error('❌ Lỗi khi mở Modal:', err);
    }
  }
});

// Xử lý Modal submit
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'post_modal') {
    try {
      logDebug('Modal submitted', interaction.user?.tag);

      const title = interaction.fields.getTextInputValue('title_input');
      const content = interaction.fields.getTextInputValue('content_input');
      logDebug('Modal values', { title, content });

      // Defer reply ngay khi nhận Modal
      await interaction.deferReply({ ephemeral: true });
      logDebug('deferReply called', interaction.user?.tag);

      // Tạo nút upload ảnh
      const uploadButton = new ButtonBuilder()
        .setCustomId('upload_image')
        .setLabel('Tải ảnh từ máy tính')
        .setStyle(ButtonStyle.Primary);

      await interaction.editReply({ 
        content: 'Nhấn nút để tải lên ảnh nếu muốn thêm vào bài viết:',
        components: [new ActionRowBuilder().addComponents(uploadButton)]
      });
      logDebug('Button sent', interaction.user?.tag);

      // Collector cho Button
      const filter = i => i.customId === 'upload_image' && i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000, max: 1 });

      collector.on('collect', async buttonInteraction => {
        logDebug('Button clicked', buttonInteraction.user?.tag);

        // Defer reply riêng cho interaction button
        await buttonInteraction.deferReply({ ephemeral: true });
        await buttonInteraction.editReply({ content: 'Vui lòng gửi ảnh dưới dạng file trong kênh này.', components: [] });

        // Collector cho file upload
        const fileFilter = m => m.author.id === buttonInteraction.user.id && m.attachments.size > 0;
        const fileCollector = interaction.channel.createMessageCollector({ filter: fileFilter, max: 1, time: 300000 });

        fileCollector.on('collect', async msg => {
          const attachment = msg.attachments.first();
          logDebug('File collected', attachment.url);

          const embed = {
            title: title,
            description: content,
            image: { url: attachment.url },
            color: 0x00AE86
          };

          await interaction.channel.send({ content: '✅ Bài viết đã được tạo:', embeds: [embed] });
          await buttonInteraction.followUp({ content: '✅ Bài viết đã gửi!', ephemeral: true });
          logDebug('Embed sent', interaction.user?.tag);
        });

        fileCollector.on('end', collected => {
          if (collected.size === 0) {
            interaction.channel.send({ content: '⚠️ Không có ảnh được tải lên, bài viết chỉ có text.' });
            buttonInteraction.followUp({ content: '⚠️ Bạn đã không gửi ảnh, bài viết chỉ có text.', ephemeral: true });
            logDebug('No file collected', interaction.user?.tag);
          }
        });
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          interaction.channel.send({ content: '⚠️ Bạn đã không nhấn nút tải ảnh, bài viết chỉ có text.' });
          logDebug('Button not clicked', interaction.user?.tag);
        }
      });

    } catch (err) {
      console.error('❌ Lỗi khi xử lý Modal:', err);
      if (!interaction.replied) {
        await interaction.reply({ content: '❌ Đã xảy ra lỗi khi tạo bài viết.', ephemeral: true });
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
