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

  /**
   * Lấy UID thật từ username TikTok
   */
  async function getUserId(username) {
    try {
      const searchUrl = `https://www.tikwm.com/api/user/info/${username}`;
      const res = await axios.get(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
          Referer: "https://www.tikwm.com/",
        },
      });

      const uid =
        res.data?.data?.user?.id || res.data?.data?.user?.unique_id || null;
      if (!uid) throw new Error("Không tìm thấy UID TikTok");
      return uid;
    } catch (err) {
      throw new Error("Không thể lấy UID TikTok: " + err.message);
    }
  }

  /**
   * Kiểm tra video mới nhất
   */
  async function checkLatestVideo() {
    try {
      console.log(`[TikTok] Đang kiểm tra video mới của ${username}...`);

      const uid = await getUserId(username);
      const url = `https://www.tikwm.com/api/user/posts/${uid}`;
      const res = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
          Referer: "https://www.tikwm.com/",
        },
      });

      const data = res.data?.data;
      if (!data || !data.videos || data.videos.length === 0) {
        console.log(`[TikTok] Không tìm thấy video nào cho ${username}.`);
        return;
      }

      const latest = data.videos[0];
      const latestId = latest.video_id;

      // Nếu video mới trùng với cache thì bỏ qua
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

  // Lặp lại mỗi 24 giờ (đổi số giờ nếu cần test)
  const intervalHours = 24; // chỉnh thành 0.1 để test mỗi 6 phút
  setInterval(checkLatestVideo, intervalHours * 60 * 60 * 1000);
}
