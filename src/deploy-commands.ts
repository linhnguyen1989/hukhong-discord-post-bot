import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName("post")
    .setDescription("Tạo một bài viết mới")
    .addStringOption(option =>
      option.setName("title")
        .setDescription("Tiêu đề bài viết")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("content")
        .setDescription("Nội dung bài viết")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("image")
        .setDescription("Link hình ảnh (tuỳ chọn)")
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName("footer")
        .setDescription("Chú thích (tuỳ chọn)")
        .setRequired(false)
    )
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log("🔄 Đang đăng ký slash command...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID!,
        process.env.GUILD_ID!
      ),
      { body: commands }
    );
    console.log("✅ Slash command đã sẵn sàng!");
  } catch (error) {
    console.error(error);
  }
})();