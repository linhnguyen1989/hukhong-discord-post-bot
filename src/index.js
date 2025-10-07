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

  // 🚀 Bắt đầu watcher TikTok
  const tiktokUsername = "docdoan.vanco";
  const tiktokUID = "7552041210135757842"; // UID đã lấy được
  const discordChannelId = "1269887001587617822";
  const checkIntervalMinutes = 3;

  await startTikTokWatcher(client, tiktokUsername, discordChannelId, checkIntervalMinutes, tiktokUID);
});

// 🔹 Đăng ký module hukhong_post
registerHukhongPost(client, ALLOWED_ROLE_ID);

// 🔹 Đăng nhập bot Discord
client.login(process.env.DISCORD_TOKEN);
