const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('hukhong_post')
    .setDescription('Tạo bài viết mới với Modal + upload ảnh')
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🛠 Deploying slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('✅ Slash command deployed!');
  } catch (error) {
    console.error('❌ Lỗi khi deploy lệnh:', error);
  }
})();
