import axios from "axios";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

/**
 * Theo dõi tài khoản TikTok và gửi video mới nhất lên kênh Discord.
 * @param {import('discord.js').Client} client - Discord client
 * @param {string} username - Tên tài khoản TikTok (ví dụ: 'tiktokvn')
 * @param {string} channelId - ID kênh Discord để đăng
 * @param {number} intervalMinutes - Kiểm tra định kỳ (phút), mặc định 1440 phút = 24h
 */
export async function startTikTokWatcher(client, username, channelId, intervalMinutes = 1440) {
  const cacheFile = path.join(process.cwd(), "tiktokCache.json");

  // Đọc cache (nếu có)
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }

  console.log(`[TikTokWatcher] Bắt đầu theo dõi tài khoản ${username} (every ${intervalMinutes}m)...`);

  async function fetchUID() {
    try {
      // 🟢 Cách 1: API JSON TikTok
      const res = await axios.get(`https://www.tiktok.com/api/user/detail/?uniqueId=${username}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Referer": `https://www.tiktok.com/@${username}`
        }
      });
      const uid = res.data?.user?.id;
      if (uid) return uid;
    } catch (err) {
      // bỏ qua, thử fallback
    }

    try {
      // 🟡 Cách 2: lấy __NEXT_DATA__ từ HTML
      const res = await axios.get(`https://www.tiktok.com/@${username}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });
      const html = res.data;
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
      if (match && match[1]) {
        const json = JSON.parse(match[1]);
        const uid = json?.props?.pageProps?.userInfo?.user?.id;
        if (uid) return uid;
      }
    } catch (err) {
      // bỏ qua, thử Puppeteer
    }

    try {
      // 🔵 Cách 3: Puppeteer headless
      const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      await page.goto(`https://www.tiktok.com/@${username}`, { waitUntil: "networkidle2" });
      const html = await page.content();
      await browser.close();
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
      if (match && match[1]) {
        const json = JSON.parse(match[1]);
        const uid = json?.props?.pageProps?.userInfo?.user?.id;
        if (uid) return uid;
      }
    } catch (err) {
      // cuối cùng vẫn lỗi
    }

    return null;
  }

  async function fetchLatestVideo(uid) {
    try {
      const res = await axios.get(`https://www.tiktok.com/api/post/item_list/?aid=1988&user_id=${uid}&count=30`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Referer": `https://www.tiktok.com/@${username}`
        }
      });
      const items = res.data?.itemList;
      if (items && items.length > 0) return items[0];
    } catch (err) {
      return null;
    }
    return null;
  }

  async function checkLatestVideo() {
    try {
      console.log(`[TikTokWatcher] Kiểm tra video mới của ${username}...`);
      const uid = await fetchUID();
      if (!uid) {
        console.log(`[TikTokWatcher] ❌ Không thể lấy UID TikTok cho ${username}.`);
        return;
      }

      const latest = await fetchLatestVideo(uid);
      if (!latest) {
        console.log(`[TikTokWatcher] Không tìm thấy video nào cho ${username}.`);
        return;
      }

      const latestId = latest?.id || latest?.video?.id || latest?.video?.idStr || latest?.video_id;
      if (!latestId) {
        console.log(`[TikTokWatcher] Không xác định được ID video mới.`);
        return;
      }

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
        console.log(`[TikTokWatcher] Đã đăng video mới: ${videoUrl}`);
      }
    } catch (err) {
      console.error(`[TikTokWatcher] Lỗi khi kiểm tra: ${err.message}`);
    }
  }

  // Gọi ngay khi bot khởi động
  await checkLatestVideo();

  // Lặp lại theo intervalMinutes
  setInterval(checkLatestVideo, intervalMinutes * 60 * 1000);
}
