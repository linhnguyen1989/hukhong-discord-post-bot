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
import dotenv from "dotenv";
import { startTikTokWatcher } from "./modules/tiktokWatcher.js";

dotenv.config();

// 🔹 Khởi tạo bot Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// 🔹 Role được phép dùng bot (bằng ID)
const ALLOWED_ROLE_ID = "1279675797346586674";

// 🔹 Khi bot sẵn sàng
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);

  // 🚀 Bắt đầu watcher TikTok
  // Kiểm tra tài khoản docdoan.vanco, gửi video mới vào kênh ID dưới đây
  await startTikTokWatcher(client, "docdoan.vanco", "1269887001587617822");
});

// 🔹 Xử lý slash command và modal
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // --- Slash command /hukhong_post ---
    if (interaction.isChatInputCommand() && interaction.commandName === "hukhong_post") {
      if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
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

// 🔹 Đăng nhập bot Discord
client.login(process.env.DISCORD_TOKEN);
