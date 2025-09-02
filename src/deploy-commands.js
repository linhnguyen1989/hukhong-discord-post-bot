const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('hukhong_post')
    .setDescription('Gửi nội dung và nhận lại')
    .addStringOption(option => 
      option.setName('content')
            .setDescription('Nội dung muốn gửi')
            .setRequired(true)
    )
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('✅ Slash command deployed!');
  } catch (error) {
    console.error('❌ Lỗi khi deploy lệnh:', error);
  }
})();
