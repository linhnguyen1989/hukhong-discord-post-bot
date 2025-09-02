const { 
  Client, GatewayIntentBits, Events, ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, InteractionType
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);
});

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

    const imageInput = new TextInputBuilder()
      .setCustomId('image_input')
      .setLabel('Link ảnh (tùy chọn)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(contentInput),
      new ActionRowBuilder().addComponents(imageInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'post_modal') {
    await interaction.deferReply({ ephemeral: true });

    const title = interaction.fields.getTextInputValue('title_input');
    const content = interaction.fields.getTextInputValue('content_input');
    const image = interaction.fields.getTextInputValue('image_input');

    const embed = { title, description: content, color: 0x00AE86 };

    if (image && image.startsWith('http')) {
      embed.thumbnail = { url: image };
      embed.image = { url: image };
    }

    await interaction.editReply({ content: '✅ Bài viết đã tạo:', embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
