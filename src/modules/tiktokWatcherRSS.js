// modules/tiktokWatcherRSS.js
import fs from "fs";
import Parser from "rss-parser";

/**
 * startTikTokWatcherRSS - Theo dõi TikTok qua RSSHub
 * @param {Client} client - instance của Discord.js Client
 * @param {string} username - username TikTok cần theo dõi
 * @param {string} channelId - ID kênh Discord để gửi thông báo
 * @param {number} intervalMinutes - thời gian kiểm tra video mới (mặc định 3 phút)
 */
export async function startTikTokWatcherRSS(client, username, channelId, intervalMinutes = 3) {
  console.log(`[TikTokRSS] Đang theo dõi ${username} (every ${intervalMinutes}m) via RSSHub...`);

  const parser = new Parser();
  const cacheFile = "./tiktokRSSCache.json";

  // Hàm kiểm tra RSS
  async function checkRSS() {
    try {
      const feedUrl = `https://rsshub.app/tiktok/user/${username}`;
      const feed = await parser.parseURL(feedUrl);

      if (!feed.items || feed.items.length === 0) {
        console.log(`[TikTokRSS] Không tìm thấy video nào cho ${username}.`);
        return;
      }

      const latest = feed.items[0];
      const latestId = latest.link;

      // Load cache
      let cache = {};
      if (fs.existsSync(cacheFile)) {
        cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      }

      // Nếu video đã gửi rồi thì bỏ qua
      if (cache[username] === latestId) return;

      // Cập nhật cache
      cache[username] = latestId;
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

      // Gửi thông báo Discord
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        await channel.send({
          content: `📹 Video mới từ **@${username}**:\n${latest.link}`
        });
        console.log(`[TikTokRSS] Đã đăng video mới: ${latest.link}`);
      }
    } catch (err) {
      console.error(`[TikTokRSS] Lỗi khi kiểm tra: ${err.message}`);
    }
  }

  // Kiểm tra ngay lần đầu
  await checkRSS();

  // Lặp định kỳ
  setInterval(checkRSS, intervalMinutes * 60 * 1000);
}
