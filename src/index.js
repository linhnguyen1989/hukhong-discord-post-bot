const { 
  Client, GatewayIntentBits, Events, ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, InteractionType, ButtonBuilder, ButtonStyle
} = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);
});

// Slash command
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'hukhong_post') {
    // Tạo modal nhập Tiêu đề + Nội dung
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

// Xử lý submit Modal
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'post_modal') {
    const title = interaction.fields.getTextInputValue('title_input');
    const content = interaction.fields.getTextInputValue('content_input');

    // Defer reply để Discord không timeout
    await interaction.deferReply({ ephemeral: true });

    // Tạo nút upload ảnh
    const uploadButton = new ButtonBuilder()
      .setCustomId('upload_image')
      .setLabel('Tải ảnh từ máy tính')
      .setStyle(ButtonStyle.Primary);

    await interaction.editReply({
      content: 'Nhấn nút bên dưới để tải lên ảnh (tùy chọn):',
      components: [new ActionRowBuilder().addComponents(uploadButton)]
    });

    // Collector cho nút
    const filter = i => i.customId === 'upload_image' && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000, max: 1 });

    collector.on('collect', async buttonInteraction => {
      await buttonInteraction.deferReply({ ephemeral: true });
      await buttonInteraction.editReply({ content: 'Vui lòng gửi ảnh dưới dạng file trong kênh này.', components: [] });

      // Collector cho file upload
      const fileCollector = interaction.channel.createMessageCollector({
        filter: m => m.author.id === buttonInteraction.user.id && m.attachments.size > 0,
        max: 1,
        time: 300000
      });

      fileCollector.on('collect', async msg => {
        const attachment = msg.attachments.first();
        const embed = {
          title,
          description: content,
          image: { url: attachment.url },
          color: 0x00AE86
        };
        await interaction.channel.send({ content: '✅ Bài viết đã được tạo:', embeds: [embed] });
        await buttonInteraction.followUp({ content: '✅ Bài viết đã gửi!', ephemeral: true });
      });

      fileCollector.on('end', collected => {
        if (collected.size === 0) {
          interaction.channel.send({ content: '⚠️ Không có ảnh được tải lên, bài viết chỉ có text.' });
          buttonInteraction.followUp({ content: '⚠️ Bạn đã không gửi ảnh, bài viết chỉ có text.', ephemeral: true });
        }
      });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.channel.send({ content: '⚠️ Bạn đã không nhấn nút tải ảnh, bài viết chỉ có text.' });
      }
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
