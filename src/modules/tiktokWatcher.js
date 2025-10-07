import axios from "axios";
import fs from "fs";
import path from "path";

/**
 * Theo dõi TikTok user và gửi video mới nhất lên Discord
 * @param {Client} client Discord bot instance
 * @param {string} username Tên tài khoản TikTok (VD: 'docdoan.vanco')
 * @param {string} channelId ID kênh Discord để gửi
 */
export async function startTikTokWatcher(client, username, channelId) {
  const cacheFile = path.join(process.cwd(), "tiktokCache.json");
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }

  async function getUserUID(username) {
    try {
      const res = await axios.get(`https://www.tikwm.com/api/user/info/${username}`);
      const uid = res.data?.data?.user?.uid;
      return uid || null;
    } catch {
      return null;
    }
  }

  async function checkLatestVideo() {
    try {
      console.log(`[TikTok] Đang kiểm tra video mới của ${username}...`);

      let uid = cache[`${username}_uid`] || (await getUserUID(username));
      if (!uid) {
        console.warn(`[TikTok] Không thể lấy UID TikTok cho ${username}.`);
        return;
      }
      cache[`${username}_uid`] = uid;

      const res = await axios.get(`https://www.tikwm.com/api/user/posts/${uid}`);
      const videos = res.data?.data?.videos || [];

      if (videos.length === 0) {
        console.log(`[TikTok] Không có video nào.`);
        return;
      }

      const latest = videos[0];
      const latestId = latest.video_id;
      if (cache[username] === latestId) {
        console.log(`[TikTok] Không có video mới.`);
        return;
      }

      cache[username] = latestId;
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

      const videoUrl = `https://www.tiktok.com/@${username}/video/${latestId}`;
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        await channel.send(`📹 Video mới từ **@${username}**:\n${videoUrl}`);
        console.log(`[TikTok] Đã đăng video mới: ${videoUrl}`);
      }
    } catch (err) {
      console.error(`[TikTok] Lỗi khi kiểm tra: ${err.message}`);
    }
  }

  // Kiểm tra ngay khi khởi động
  await checkLatestVideo();
  // Lặp lại mỗi 6 giờ
  setInterval(checkLatestVideo, 6 * 60 * 60 * 1000);
}
