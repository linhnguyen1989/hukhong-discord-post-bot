import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { startTikTokWatcherRSS } from "./modules/tiktokWatcherRSS.js";
import { registerHukhongPost } from "./modules/hukhongPost.js";

dotenv.config();

// 🔹 Khởi tạo bot Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// 🔹 Role được phép dùng bot (bằng ID)
const ALLOWED_ROLE_ID = "1279675797346586674";

// 🔹 Khi bot sẵn sàng
client.once("ready", async () => {
  console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);

  // 🚀 Bắt đầu watcher TikTok RSS
  // Theo dõi docdoan.vanco, gửi thông báo vào kênh Discord ID
  const tiktokUsername = "docdoan.vanco";
  const discordChannelId = "1269887001587617822";
  const checkIntervalMinutes = 3; // kiểm tra mỗi 3 phút

  await startTikTokWatcherRSS(client, tiktokUsername, discordChannelId, checkIntervalMinutes);
});

// 🔹 Đăng ký hukhong_post module
registerHukhongPost(client, ALLOWED_ROLE_ID);

// 🔹 Đăng nhập bot Discord
client.login(process.env.DISCORD_TOKEN);
