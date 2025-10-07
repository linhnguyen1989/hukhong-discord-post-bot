import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

/**
 * Theo dõi TikTok và gửi video mới lên Discord
 * @param {Client} client - Discord client
 * @param {string} username - Tên tài khoản TikTok
 * @param {string} channelId - ID kênh Discord
 * @param {number} intervalMinutes - Khoảng thời gian kiểm tra (phút)
 * @param {string} [uid] - UID TikTok nếu đã biết, bỏ qua bước lấy UID
 */
export async function startTikTokWatcher(client, username, channelId, intervalMinutes = 60, uid = null) {
  const cacheFile = path.join(process.cwd(), "tiktokCache.json");

  // Đọc cache
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }

  async function checkLatestVideo() {
    try {
      console.log(`[TikTokWatcher] Kiểm tra video mới của ${uid || username}...`);

      // Nếu chưa có UID, lấy từ trang TikTok
      let userUID = uid;
      if (!userUID) {
        const page = await launchBrowser();
        const tiktokUrl = `https://www.tiktok.com/@${username}`;
        await page.goto(tiktokUrl, { waitUntil: "networkidle2" });

        // Lấy __NEXT_DATA__ từ HTML
        const html = await page.content();
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
        if (!nextDataMatch) {
          console.error(`[TikTokWatcher] ❌ Không tìm thấy __NEXT_DATA__ trên trang của ${username}.`);
          await page.close();
          return;
        }

        const nextData = JSON.parse(nextDataMatch[1]);
        userUID = nextData?.props?.pageProps?.userInfo?.user?.id;
        if (!userUID) {
          console.error(`[TikTokWatcher] 🚫 Không thể lấy UID TikTok cho ${username}.`);
          await page.close();
          return;
        }
        await page.close();
      }

      // Lấy video mới nhất bằng Puppeteer
      const page = await launchBrowser();
      const videoUrl = `https://www.tiktok.com/@${username}`;
      await page.goto(videoUrl, { waitUntil: "networkidle2" });

      const latestVideoId = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll("script[id='__NEXT_DATA__']"));
        if (!scripts.length) return null;
        const data = JSON.parse(scripts[0].textContent);
        const videos = data?.props?.pageProps?.userInfo?.user?.videos;
        return videos?.[0]?.id || null;
      });

      await page.close();

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

      // Gửi vào Discord
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

  // Launch browser helper với flags cho container
  async function launchBrowser() {
    return await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  }

  // Gọi ngay 1 lần
  await checkLatestVideo();

  // Lặp theo interval
  setInterval(checkLatestVideo, intervalMinutes * 60 * 1000);

  console.log(`[TikTokWatcher] Bắt đầu theo dõi tài khoản UID=${uid || username} (every ${intervalMinutes}m)...`);
}
