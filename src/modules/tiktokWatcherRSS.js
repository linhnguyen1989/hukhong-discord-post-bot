// modules/tiktokWatcherRSS.js
import axios from "axios";
import { parseStringPromise } from "xml2js";
import fs from "fs";
import path from "path";

/**
 * startTikTokWatcherRSS(client, username, channelId, intervalMinutes = 1440)
 * - username: tiktok username (ví dụ 'docdoan.vanco')
 * - intervalMinutes: mặc định 1440 (24h)
 */
export async function startTikTokWatcherRSS(client, username, channelId, intervalMinutes = 1440) {
  const cacheFile = path.join(process.cwd(), "tiktok_rss_cache.json");
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    try { cache = JSON.parse(fs.readFileSync(cacheFile, "utf8")); } catch { cache = {}; }
  }
  if (!cache[username]) cache[username] = { lastGuid: null };

  // RSSHub public instance route (có thể thay bằng self-host URL)
  const rssUrl = `https://rsshub.app/tiktok/user/${encodeURIComponent(username)}`;

  async function checkOnce() {
    try {
      console.log(`[TikTokRSS] Kiểm tra RSS của ${username}...`);
      const res = await axios.get(rssUrl, { timeout: 15000, headers: { "User-Agent": "rss-checker/1.0" } });
      const xml = res.data;
      const obj = await parseStringPromise(xml, { explicitArray: false, trim: true });
      const items = obj.rss?.channel?.item;
      if (!items) {
        console.log(`[TikTokRSS] Không tìm thấy item trong feed của ${username}.`);
        return;
      }
      // items có thể là mảng hoặc 1 object
      const first = Array.isArray(items) ? items[0] : items;
      const guid = first.guid?._ || first.guid;
      const link = first.link;
      const title = first.title;
      const pubDate = first.pubDate;

      if (!guid) {
        console.log(`[TikTokRSS] Feed không có GUID, bỏ qua.`);
        return;
      }

      if (cache[username].lastGuid === guid) {
        console.log(`[TikTokRSS] Không có video mới cho ${username}.`);
        return;
      }

      // update cache
      cache[username].lastGuid = guid;
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), "utf8");

      // send to discord
      const ch = await client.channels.fetch(channelId);
      if (!ch) {
        console.warn(`[TikTokRSS] Không tìm thấy channel ${channelId}`);
        return;
      }
      // build message
      const content = `📹 Video mới từ **@${username}**\n${title}\n${link}\n${pubDate ? `\nĐăng: ${pubDate}` : ""}`;
      await ch.send({ content });
      console.log(`[TikTokRSS] Đã gửi video mới: ${link}`);
    } catch (err) {
      console.error(`[TikTokRSS] Lỗi khi kiểm tra: ${err.message}`);
    }
  }

  // run first time immediately
  await checkOnce();
  // then interval
  setInterval(checkOnce, intervalMinutes * 60 * 1000);
  console.log(`[TikTokRSS] Đang theo dõi ${username} (every ${intervalMinutes}m) via RSSHub`);
}
