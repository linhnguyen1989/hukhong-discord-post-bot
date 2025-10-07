import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  InteractionType,
  EmbedBuilder
} from "discord.js";

/**
 * Đăng ký slash command /hukhong_post
 * @param {Client} client - Discord client
 * @param {string} allowedRoleId - Role ID được phép dùng bot
 */
export function registerHukhongPost(client, allowedRoleId) {
  client.on("interactionCreate", async (interaction) => {
    try {
      // --- Slash command /hukhong_post ---
      if (interaction.isChatInputCommand() && interaction.commandName === "hukhong_post") {
        if (!interaction.member.roles.cache.has(allowedRoleId)) {
          await interaction.reply({
            content: "❌ Bạn không có quyền sử dụng bot này.",
            ephemeral: true
          });
          return;
        }

        // Tạo modal nhập dữ liệu bài viết
        const modal = new ModalBuilder()
          .setCustomId("post_modal")
          .setTitle("Tạo bài viết mới");

        const titleInput = new TextInputBuilder()
          .setCustomId("title_input")
          .setLabel("Tiêu đề")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const contentInput = new TextInputBuilder()
          .setCustomId("content_input")
          .setLabel("Nội dung")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const mainImageInput = new TextInputBuilder()
          .setCustomId("main_image_input")
          .setLabel("Link ảnh bài viết (tùy chọn)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        const headerInput = new TextInputBuilder()
          .setCustomId("header_input")
          .setLabel("Header (tùy chọn)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        const footerInput = new TextInputBuilder()
          .setCustomId("footer_input")
          .setLabel("Footer (tùy chọn)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(contentInput),
          new ActionRowBuilder().addComponents(mainImageInput),
          new ActionRowBuilder().addComponents(headerInput),
          new ActionRowBuilder().addComponents(footerInput)
        );

        await interaction.showModal(modal);
      }

      // --- Khi modal được gửi ---
      if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "post_modal") {
        const title = interaction.fields.getTextInputValue("title_input");
        const content = interaction.fields.getTextInputValue("content_input");
        const mainImage = interaction.fields.getTextInputValue("main_image_input");
        const header = interaction.fields.getTextInputValue("header_input");
        const footer = interaction.fields.getTextInputValue("footer_input");

        const embed = new EmbedBuilder().setColor(0x00ae86);

        // Gộp header, title, content
        let desc = "";
        if (header) desc += `${header}\n\n`;
        desc += `**${title}**\n${content}`;
        embed.setDescription(desc);

        if (mainImage && mainImage.startsWith("http")) embed.setImage(mainImage);
        if (footer) embed.setFooter({ text: footer });

        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply({ content: "✅ Bài viết đã được gửi!", ephemeral: true });
        await interaction.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error("❌ Lỗi khi xử lý interaction:", err);
      if (interaction && !interaction.replied) {
        await interaction.reply({
          content: "❌ Có lỗi xảy ra khi tạo bài viết.",
          ephemeral: true
        });
      }
    }
  });
}
