import puppeteer from "puppeteer";

/**
 * Theo dõi TikTok bằng UID và gửi video mới lên Discord.
 * @param {import('discord.js').Client} client - Discord client
 * @param {string} username - Tên người dùng TikTok (dùng để log)
 * @param {string} channelId - ID kênh Discord
 * @param {number} intervalMinutes - khoảng thời gian kiểm tra (phút)
 * @param {string} uid - UID TikTok người dùng
 */
export async function startTikTokWatcher(client, username, channelId, intervalMinutes = 3, uid) {
  if (!uid) {
    console.error("[TikTokWatcher] 🚫 Chưa cung cấp UID, không thể theo dõi.");
    return;
  }

  console.log(`[TikTokWatcher] Bắt đầu theo dõi tài khoản UID=${uid} (every ${intervalMinutes}m)...`);

  const cache = { latestVideoId: null };

  async function checkLatestVideo() {
    try {
      console.log(`[TikTokWatcher] Kiểm tra video mới của UID=${uid}...`);

      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(`https://www.tiktok.com/@${username}`, { waitUntil: "networkidle2" });

      // Lấy dữ liệu __NEXT_DATA__ từ script trên trang
      const nextData = await page.$eval("script[id='__NEXT_DATA__']", el => JSON.parse(el.innerText));
      await browser.close();

      const videos = nextData?.props?.pageProps?.userInfo?.user?.videos;
      if (!videos || videos.length === 0) {
        console.log(`[TikTokWatcher] ❌ Không tìm thấy video nào cho UID=${uid}.`);
        return;
      }

      const latest = videos[0];
      const latestId = latest.id;

      if (cache.latestVideoId === latestId) {
        console.log(`[TikTokWatcher] Không có video mới.`);
        return;
      }

      cache.latestVideoId = latestId;

      const channel = await client.channels.fetch(channelId);
      if (channel) {
        const videoUrl = `https://www.tiktok.com/@${username}/video/${latestId}`;
        await channel.send({
          content: `📹 Video mới từ **@${username}**:\n${videoUrl}`
        });
        console.log(`[TikTokWatcher] ✅ Đã gửi video mới: ${videoUrl}`);
      }
    } catch (err) {
      console.error(`[TikTokWatcher] Lỗi khi kiểm tra: ${err.message}`);
    }
  }

  // Chạy ngay lần đầu
  await checkLatestVideo();

  // Lặp lại theo interval
  setInterval(checkLatestVideo, intervalMinutes * 60 * 1000);
}
