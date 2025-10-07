import { Client, GatewayIntentBits, Events } from "discord.js";
import dotenv from "dotenv";
import { startTikTokWatcher } from "./modules/tiktokWatcher.js";
import { registerHukhongPost } from "./modules/hukhongPost.js";

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

  // 🚀 Thông số watcher TikTok
  const tiktokUsername = "docdoan.vanco";
  const tiktokUID = "7552041210135757842"; // UID đã lấy được
  const discordChannelId = "1269887001587617822";
  const checkIntervalMinutes = 3;

  // 🔹 Bắt đầu watcher TikTok
  await startTikTokWatcher(client, tiktokUsername, discordChannelId, checkIntervalMinutes, tiktokUID);

  // 🔹 (Tùy chọn) gửi video gần nhất ngay lập tức
  // await startTikTokWatcher.testSendLatestVideo?.();
});

// 🔹 Đăng ký hukhong_post module
registerHukhongPost(client, ALLOWED_ROLE_ID);

// 🔹 Đăng nhập bot Discord
client.login(process.env.DISCORD_TOKEN);
