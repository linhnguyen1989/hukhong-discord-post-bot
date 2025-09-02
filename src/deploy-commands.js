const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

// Slash command
const commands = [
  new SlashCommandBuilder()
    .setName('hukhong_post')
    .setDescription('Tạo bài viết mới với Modal + upload ảnh')
    .toJSON()
];

// REST client
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Debug helper
function logDebug(stage, data) {
  console.log(`🛠 [DEBUG] ${stage}:`, data);
}

(async () => {
  try {
    logDebug('Starting deploy', { CLIENT_ID: process.env.CLIENT_ID, GUILD_ID: process.env.GUILD_ID });

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    logDebug('Slash command deployed', commands.map(c => c.name));

    console.log('✅ Đăng ký slash command thành công!');
  } catch (error) {
    console.error('❌ Lỗi khi deploy lệnh:', error);
  }
})();
