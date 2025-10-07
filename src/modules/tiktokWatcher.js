// modules/tiktokWatcher.js
const TikTokScraper = require('tiktok-scraper');
const fs = require('fs');
const path = require('path');

module.exports = function initTikTokWatcher(client, options) {
  const { username, channelId } = options;
  // 24 giờ = 24 * 60 * 60 * 1000 = 86,400,000 ms
  const interval = 24 * 60 * 60 * 1000;
  const savePath = path.join(__dirname, `last_${username}.json`);

  // Đọc ID video cuối cùng đã gửi (nếu có)
  let lastVideoId = null;
  if (fs.existsSync(savePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(savePath, 'utf8'));
      lastVideoId = data.lastVideoId || null;
    } catch {
      lastVideoId = null;
    }
  }

  async function checkTikTok() {
    try {
      console.log(`[TikTokWatcher] Đang kiểm tra kênh @${username}...`);
      const posts = await TikTokScraper.user(username, { number: 1 });
      const latest = posts.collector[0];
      if (!latest) return console.warn(`[TikTokWatcher] Không tìm thấy video nào.`);

      if (latest.id !== lastVideoId) {
        const channel = client.channels.cache.get(channelId);
        if (channel) {
          const embed = {
            color: 0x00ffff,
            title: `🎬 Video mới từ @${username}`,
            description: latest.text || '(Không có mô tả)',
            url: latest.webVideoUrl,
            image: { url: latest.covers.default },
          };

          await channel.send({ embeds: [embed] });
          console.log(`[TikTokWatcher] Gửi video mới: ${latest.webVideoUrl}`);
        }

        // Lưu lại ID video mới nhất
        lastVideoId = latest.id;
        fs.writeFileSync(savePath, JSON.stringify({ lastVideoId }));
      } else {
        console.log(`[TikTokWatcher] Không có video mới từ @${username}.`);
      }
    } catch (err) {
      console.error(`[TikTokWatcher] Lỗi khi kiểm tra @${username}:`, err.message);
    }
  }

  console.log(`[TikTokWatcher] Theo dõi @${username} — kiểm tra mỗi 24 giờ.`);
  checkTikTok();
  setInterval(checkTikTok, interval);
};
