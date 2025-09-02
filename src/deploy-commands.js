const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('hukhong_post')
    .setDescription('Tạo một bài viết mới với Modal và upload ảnh')
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🚀 Bắt đầu deploy slash command...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('✅ Đăng ký slash command thành công!');
  } catch (error) {
    console.error('❌ Lỗi khi deploy lệnh:', error);
  }
})();
