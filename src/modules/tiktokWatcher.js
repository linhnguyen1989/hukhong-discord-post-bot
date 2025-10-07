import axios from "axios";
import fs from "fs";
import path from "path";

/**
 * Theo dõi tài khoản TikTok và gửi video mới nhất lên kênh Discord.
 * Kiểm tra mỗi 24h.
 * @param {Client} client - Discord client
 * @param {string} username - Tên tài khoản TikTok (ví dụ: 'tiktokvn')
 * @param {string} channelId - ID kênh Discord để đăng
 */
export async function startTikTokWatcher(client, username, channelId) {
  const cacheFile = path.join(process.cwd(), "tiktokCache.json");

  // Đọc cache (nếu có)
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }

  async function checkLatestVideo() {
    try {
      console.log(`[TikTok] Đang kiểm tra video mới của ${username}...`);
      const url = `https://www.tikwm.com/api/user/posts/${username}`;
      const res = await axios.get(url);
      const data = res.data?.data;

      if (!data || !data.videos || data.videos.length === 0) {
        console.log(`[TikTok] Không tìm thấy video nào cho ${username}.`);
        return;
      }

      const latest = data.videos[0];
      const latestId = latest.video_id;

      if (cache[username] === latestId) {
        console.log(`[TikTok] Không có video mới.`);
        return;
      }

      // Cập nhật cache
      cache[username] = latestId;
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

      // Gửi vào Discord
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        const videoUrl = `https://www.tiktok.com/@${username}/video/${latestId}`;
        await channel.send({
          content: `📹 Video mới từ **@${username}**:\n${videoUrl}`,
        });
        console.log(`[TikTok] Đã đăng video mới: ${videoUrl}`);
      }
    } catch (err) {
      console.error(`[TikTok] Lỗi khi kiểm tra: ${err.message}`);
    }
  }

  // Gọi ngay 1 lần khi bot khởi động
  await checkLatestVideo();

  // Lặp lại mỗi 24 giờ
  setInterval(checkLatestVideo, 24 * 60 * 60 * 1000);
}
