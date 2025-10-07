// modules/tiktokWatcher.js
import axios from "axios";
import fs from "fs";
import path from "path";

/**
 * Theo dõi video mới từ TikTok và gửi vào Discord.
 * @param {Client} client - Discord client
 * @param {string} username - TikTok username (vd: 'docdoan.vanco')
 * @param {string} channelId - Discord channel ID để đăng video
 * @param {number} intervalMinutes - Khoảng thời gian check (phút)
 * @param {string} [uid] - TikTok UID nếu có sẵn
 */
export async function startTikTokWatcher(client, username, channelId, intervalMinutes = 5, uid = null) {
  const cacheFile = path.join(process.cwd(), "tiktokCache.json");

  // Đọc cache
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }

  async function checkLatestVideo() {
    try {
      console.log(`[TikTokWatcher] Kiểm tra video mới của ${username}...`);

      // --- TikAPI endpoint ---
      // Bạn cần tạo API key trên https://rapidapi.com/tikapi-tikapi-default/api/tikapi1
      const TIKAPI_KEY = process.env.TIKAPI_KEY;
      if (!TIKAPI_KEY) {
        console.error("[TikTokWatcher] ❌ Chưa có TikAPI_KEY trong .env");
        return;
      }

      // Nếu có UID thì ưu tiên dùng, không thì dùng username
      const params = uid ? { user_id: uid } : { username };
      const res = await axios.get("https://api.tikapi.io/v1/user/videos", {
        headers: {
          "x-rapidapi-key": TIKAPI_KEY,
          "x-rapidapi-host": "tikapi.io"
        },
        params: {
          ...params,
          count: 1 // chỉ lấy video mới nhất
        }
      });

      const videos = res.data?.data;
      if (!videos || videos.length === 0) {
        console.log(`[TikTokWatcher] Không tìm thấy video nào cho ${username}.`);
        return;
      }

      const latest = videos[0];
      const latestId = latest.id;

      if (cache[username] === latestId) {
        console.log(`[TikTokWatcher] Không có video mới.`);
        return;
      }

      // Cập nhật cache
      cache[username] = latestId;
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

      // Gửi vào Discord
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        const videoUrl = latest.webVideoUrl || `https://www.tiktok.com/@${username}/video/${latestId}`;
        await channel.send({
          content: `📹 Video mới từ **@${username}**:\n${videoUrl}`
        });
        console.log(`[TikTokWatcher] Đã đăng video mới: ${videoUrl}`);
      }
    } catch (err) {
      console.error(`[TikTokWatcher] Lỗi khi kiểm tra: ${err.message}`);
    }
  }

  // Check ngay khi bot khởi động
  await checkLatestVideo();

  // Lặp theo interval
  setInterval(checkLatestVideo, intervalMinutes * 60 * 1000);

  console.log(`[TikTokWatcher] Bắt đầu theo dõi tài khoản ${username} (every ${intervalMinutes}m)...`);
}
