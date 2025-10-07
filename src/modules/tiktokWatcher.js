// modules/tiktokWatcher.js
const TikTokScraper = require('tiktok-scraper');

module.exports = function initTikTokWatcher(client, options) {
  const { username, channelId, interval = 60 * 1000 } = options;
  const sentCache = new Set();

  async function checkTikTok() {
    try {
      const posts = await TikTokScraper.user(username, { number: 5 });
      for (const post of posts.collector) {
        if (!sentCache.has(post.id)) {
          const channel = client.channels.cache.get(channelId);
          if (channel) {
            const embed = {
              color: 0x00FFFF,
              title: `🎬 TikTok mới từ @${username}`,
              description: post.text || "(Không có mô tả)",
              url: post.webVideoUrl,
              image: { url: post.covers.default },
            };
            channel.send({ embeds: [embed] });
          }
          sentCache.add(post.id);
        }
      }
    } catch (err) {
      console.error(`[TikTokWatcher] Lỗi: ${err.message}`);
    }
  }

  console.log(`[TikTokWatcher] Bắt đầu theo dõi @${username}`);
  checkTikTok();
  setInterval(checkTikTok, interval);
};
