const { 
  Client, GatewayIntentBits, Events, ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, InteractionType
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    // Slash command
    if (interaction.isChatInputCommand() && interaction.commandName === 'hukhong_post') {
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

      const headerImageInput = new TextInputBuilder()
        .setCustomId('header_image_input')
        .setLabel('Link ảnh Header (tùy chọn)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const footerImageInput = new TextInputBuilder()
        .setCustomId('footer_image_input')
        .setLabel('Link ảnh Footer (tùy chọn)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(contentInput),
        new ActionRowBuilder().addComponents(headerImageInput),
        new ActionRowBuilder().addComponents(footerImageInput)
      );

      await interaction.showModal(modal);
    }

    // Modal submit
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'post_modal') {
      const title = interaction.fields.getTextInputValue('title_input');
      const content = interaction.fields.getTextInputValue('content_input');
      const headerImage = interaction.fields.getTextInputValue('header_image_input');
      const footerImage = interaction.fields.getTextInputValue('footer_image_input');

      const embed = { 
        title, 
        description: content, 
        color: 0x00AE86
      };

      if (headerImage && headerImage.startsWith('http')) {
        embed.image = { url: headerImage };
      }

      if (footerImage && footerImage.startsWith('http')) {
        // Footer image Discord embed không có trường riêng, dùng footer text + emoji hoặc push thành field
        // Cách khả thi: tạo 1 field riêng để hiển thị ảnh footer
        embed.fields = [
          {
            name: '\u200B', // invisible name
            value: footerImage
          }
        ];
        embed.footer = { text: '\u200B' }; // tránh lỗi footer trống
      }

      await interaction.reply({ embeds: [embed] });
    }
  } catch (err) {
    console.error('Lỗi khi xử lý interaction:', err);
    if (interaction && !interaction.replied) {
      await interaction.reply({ content: '❌ Có lỗi xảy ra khi tạo bài viết.', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
