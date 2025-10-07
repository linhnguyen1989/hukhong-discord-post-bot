import axios from "axios";

/**
 * Theo dõi video mới từ UID TikTok và gửi lên Discord
 * @param {Client} client - Discord client
 * @param {string} uid - UID TikTok của tài khoản
 * @param {string} channelId - ID kênh Discord để đăng video
 * @param {number} intervalMinutes - Khoảng thời gian kiểm tra (phút)
 */
export async function startTikTokWatcherByUID(client, uid, channelId, intervalMinutes = 3) {
  if (typeof uid !== "string") {
    console.error("[TikTokWatcher] username phải là chuỗi (string).");
    return;
  }

  console.log(`[TikTokWatcher] Bắt đầu theo dõi tài khoản UID=${uid} (every ${intervalMinutes}m)...`);

  // Cache video ID đã gửi để tránh lặp lại
  let lastVideoId = null;

  async function checkLatestVideo() {
    try {
      console.log(`[TikTokWatcher] Kiểm tra video mới của UID=${uid}...`);

      // Dùng API tiktok (hoặc TikWM)
      const url = `https://www.tikwm.com/api/post/item_list/?user_id=${uid}&count=1`;
      const res = await axios.get(url);
      const data = res.data?.data?.data;

      if (!data || data.length === 0) {
        console.log(`[TikTokWatcher] Không tìm thấy video nào cho UID=${uid}.`);
        return;
      }

      const latest = data[0];
      const latestId = latest.item_id;

      if (lastVideoId === latestId) {
        console.log(`[TikTokWatcher] Không có video mới.`);
        return;
      }

      lastVideoId = latestId;

      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        console.error(`[TikTokWatcher] Không tìm thấy kênh Discord ID=${channelId}`);
        return;
      }

      const videoUrl = `https://www.tiktok.com/@${latest.author.unique_id}/video/${latestId}`;
      await channel.send({ content: `📹 Video mới từ UID=${uid}:\n${videoUrl}` });

      console.log(`[TikTokWatcher] Đã đăng video mới: ${videoUrl}`);
    } catch (err) {
      console.error(`[TikTokWatcher] Lỗi khi kiểm tra: ${err.message}`);
    }
  }

  // Kiểm tra ngay khi khởi động
  await checkLatestVideo();

  // Lặp lại theo interval
  setInterval(checkLatestVideo, intervalMinutes * 60 * 1000);
}
