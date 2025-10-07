import axios from "axios";
import Parser from "rss-parser";
import fs from "fs";
import path from "path";

/**
 * Theo dõi TikTok qua RSSHub và gửi video mới vào Discord.
 * @param {Client} client - Discord client
 * @param {string} username - TikTok username
 * @param {string} channelId - Discord channel ID
 * @param {number} intervalMinutes - Kiểm tra mỗi bao nhiêu phút
 */
export async function startTikTokRSSWatcher(client, username, channelId, intervalMinutes = 5) {
  const cacheFile = path.join(process.cwd(), "tiktokRSSCache.json");

  // Đọc cache
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }

  // Các server RSSHub free thay thế
  const rssServers = [
    "https://rsshub.app",
    "https://rsshub.fyi",
    "https://rsshub.ceshiren.com"
  ];

  const parser = new Parser();

  async function fetchRSS(retries = 3) {
    for (const server of rssServers) {
      const url = `${server}/tiktok/user/${username}`;
      for (let i = 0; i < retries; i++) {
        try {
          const res = await axios.get(url, { timeout: 10000 });
          const feed = await parser.parseString(res.data);
          return feed;
        } catch (err) {
          console.warn(`[TikTokRSS] Request attempt ${i + 1} failed for server ${server}: ${err.message}`);
          if (i === retries - 1) break; // thử server khác
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    }
    throw new Error(`Không thể lấy RSS cho ${username} từ tất cả server.`);
  }

  async function checkLatestVideo() {
    console.log(`[TikTokRSS] Kiểm tra RSS của ${username}...`);
    try {
      const feed = await fetchRSS();
      if (!feed.items || feed.items.length === 0) {
        console.log(`[TikTokRSS] Không tìm thấy video nào cho ${username}.`);
        return;
      }

      const latest = feed.items[0];
      const latestId = latest.link;

      if (cache[username] === latestId) {
        console.log(`[TikTokRSS] Không có video mới.`);
        return;
      }

      // Cập nhật cache
      cache[username] = latestId;
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

      // Gửi lên Discord
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

  // Gọi ngay 1 lần
  await checkLatestVideo();

  // Lặp lại
  setInterval(checkLatestVideo, intervalMinutes * 60 * 1000);
}
