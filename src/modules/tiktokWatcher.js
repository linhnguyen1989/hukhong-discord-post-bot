import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

export async function startTikTokWatcher(client, username, channelId, intervalMinutes = 60, uid = null) {
  const cacheFile = path.join(process.cwd(), "tiktokCache.json");
  let cache = {};
  if (fs.existsSync(cacheFile)) cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));

  async function checkLatestVideo() {
    try {
      const userId = uid || username;
      console.log(`[TikTokWatcher] Kiểm tra video mới của ${userId}...`);

      // Mở browser
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
      const page = await browser.newPage();

      const tiktokUrl = `https://www.tiktok.com/@${username}`;
      await page.goto(tiktokUrl, { waitUntil: "networkidle2" });

      // Lấy video mới nhất từ __NEXT_DATA__
      const latestVideoId = await page.evaluate(() => {
        const script = document.querySelector("script[id='__NEXT_DATA__']");
        if (!script) return null;
        const data = JSON.parse(script.textContent);
        const videos = data?.props?.pageProps?.userInfo?.user?.videos;
        return videos?.[0]?.id || null;
      });

      await browser.close();

      if (!latestVideoId) {
        console.log(`[TikTokWatcher] Không tìm thấy video nào cho ${username}.`);
        return;
      }

      if (cache[username] === latestVideoId) {
        console.log(`[TikTokWatcher] Không có video mới.`);
        return;
      }

      // Cập nhật cache
      cache[username] = latestVideoId;
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

      const channel = await client.channels.fetch(channelId);
      if (channel) {
        const videoLink = `https://www.tiktok.com/@${username}/video/${latestVideoId}`;
        await channel.send({ content: `📹 Video mới từ **@${username}**:\n${videoLink}` });
        console.log(`[TikTokWatcher] Đã đăng video mới: ${videoLink}`);
      }

    } catch (err) {
      console.error(`[TikTokWatcher] Lỗi khi kiểm tra: ${err.message}`);
    }
  }

  // Gọi ngay
  await checkLatestVideo();

  // Lặp theo interval
  setInterval(checkLatestVideo, intervalMinutes * 60 * 1000);
  console.log(`[TikTokWatcher] Bắt đầu theo dõi tài khoản UID=${uid || username} (every ${intervalMinutes}m)...`);
}
