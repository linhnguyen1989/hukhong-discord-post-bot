import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

// Lệnh /hukhong-post
const commands = [
  new SlashCommandBuilder()
    .setName('hukhong-post')
    .setDescription('Tạo một bài viết với tiêu đề, hình ảnh, nội dung, và chú thích')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Tiêu đề bài viết')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('content')
        .setDescription('Nội dung bài viết')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('URL hình ảnh (tuỳ chọn)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('footer')
        .setDescription('Chú thích (tuỳ chọn)')
        .setRequired(false))
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Đang đăng ký (refresh) slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('✅ Slash commands đã đăng ký thành công!');
  } catch (error) {
    console.error('❌ Lỗi khi đăng ký command:', error);
  }
})();
