import { REST, Routes } from 'discord.js';
import 'dotenv/config';

// Load biến môi trường
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ Thiếu DISCORD_TOKEN, CLIENT_ID hoặc GUILD_ID trong file .env');
  process.exit(1);
}

// Danh sách lệnh
const commands = [
  {
    name: 'hukhong-post',
    description: 'Tạo một bài viết với tiêu đề, hình ảnh, nội dung và chú thích',
    options: [
      {
        name: 'tieude',
        description: 'Tiêu đề của bài viết',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'hinhanh',
        description: 'Link hình ảnh',
        type: 3,
        required: false,
      },
      {
        name: 'noidung',
        description: 'Nội dung chính',
        type: 3,
        required: true,
      },
      {
        name: 'chuthich',
        description: 'Chú thích nhỏ',
        type: 3,
        required: false,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log('🚀 Bắt đầu deploy slash command...');
    console.log(`🔑 CLIENT_ID: ${CLIENT_ID}`);
    console.log(`🏠 GUILD_ID: ${GUILD_ID}`);

    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });

    console.log(`✅ Đăng ký thành công ${commands.length} lệnh cho server ${GUILD_ID}`);
  } catch (error) {
    console.error('❌ Lỗi khi deploy lệnh:', error);
  }
})();