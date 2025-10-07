import axios from "axios";
import fs from "fs";
import path from "path";

/**
 * Theo dõi video mới TikTok và gửi lên Discord.
 * @param {Client} client - Discord client
 * @param {string} username - Tên tài khoản TikTok
 * @param {string} channelId - ID kênh Discord để gửi video
 * @param {number} intervalMinutes - Khoảng thời gian kiểm tra (phút)
 * @param {string} [uid] - UID cố định (nếu có)
 */
export async function startTikTokWatcher(client, username, channelId, intervalMinutes = 60, uid = null) {
  const cacheFile = path.join(process.cwd(), "tiktokCache.json");

  // Load cache
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }

  async function checkLatestVideo() {
    try {
      console.log(`[TikTokWatcher] Kiểm tra video mới của ${username}...`);

      // Nếu UID có sẵn, ưu tiên dùng UID
      let url;
      if (uid) {
        url = `https://www.tikwm.com/api/user/posts?uid=${uid}`;
      } else {
        url = `https://www.tikwm.com/api/user/posts/${username}`;
      }

      const res = await axios.get(url);
      const data = res.data?.data;

      if (!data || !data.videos || data.videos.length === 0) {
        console.log(`[TikTokWatcher] Không tìm thấy video nào cho ${username}.`);
        return;
      }

      const latest = data.videos[0];
      const latestId = latest.video_id;

      if (cache[username] === latestId) {
        console.log(`[TikTokWatcher] Không có video mới.`);
        return;
      }

      // Cập nhật cache
      cache[username] = latestId;
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

      // Gửi lên Discord
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        const videoUrl = `https://www.tiktok.com/@${username}/video/${latestId}`;
        await channel.send({ content: `📹 Video mới từ **@${username}**:\n${videoUrl}` });
        console.log(`[TikTokWatcher] Đã gửi video mới: ${videoUrl}`);
      }
    } catch (err) {
      console.error(`[TikTokWatcher] Lỗi khi kiểm tra: ${err.message}`);
    }
  }

  // Chạy ngay khi start
  await checkLatestVideo();

  // Lặp lại theo interval
  setInterval(checkLatestVideo, intervalMinutes * 60 * 1000);
}
