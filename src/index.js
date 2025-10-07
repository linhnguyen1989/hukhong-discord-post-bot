import {
  Client,
  GatewayIntentBits,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  InteractionType,
  EmbedBuilder
} from "discord.js";
import { startTikTokWatcher } from "./modules/tiktokWatcher.js";
import dotenv from "dotenv";
dotenv.config();

// Khởi tạo bot Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// Role được phép dùng bot (bằng ID)
const ALLOWED_ROLE_ID = "1279675797346586674";

// Khi bot sẵn sàng
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);

  // Bắt đầu watcher TikTok
  await startTikTokWatcher(client, "docdoan.vanco", "1269887001587617822");
});

// Xử lý tương tác slash command và modal
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === "hukhong_post") {
      // Kiểm tra role bằng ID
      if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
        await interaction.reply({
          content: "❌ Bạn không có quyền sử dụng bot này.",
          ephemeral: true
        });
        return;
      }

      // Tạo modal
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

    // Xử lý dữ liệu khi modal được gửi
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "post_modal") {
      const title = interaction.fields.getTextInputValue("title_input");
      const content = interaction.fields.getTextInputValue("content_input");
      const mainImage = interaction.fields.getTextInputValue("main_image_input");
      const header = interaction.fields.getTextInputValue("header_input");
      const footer = interaction.fields.getTextInputValue("footer_input");

      // Tạo Embed duy nhất
      const embed = new EmbedBuilder().setColor(0x00ae86);

      // Ghép Header + Title + Nội dung
      let desc = "";
      if (header) desc += `${header}\n\n`;
      desc += `**${title}**\n`;
      desc += content;
      embed.setDescription(desc);

      // Thêm Main Image nếu có
      if (mainImage && mainImage.startsWith("http")) {
        embed.setImage(mainImage);
      }

      // Thêm Footer text nếu có
      if (footer) {
        embed.setFooter({ text: footer });
      }

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

// Đăng nhập bot
client.login(process.env.DISCORD_TOKEN);
