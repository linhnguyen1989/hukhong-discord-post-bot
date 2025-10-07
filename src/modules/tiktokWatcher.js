import axios from "axios";

/**
 * Theo dõi tài khoản TikTok và gửi video mới nhất lên kênh Discord.
 * @param {Client} client - Discord client
 * @param {string} username - TikTok username
 * @param {string} channelId - ID kênh Discord
 * @param {number} intervalMinutes - Kiểm tra mỗi X phút
 * @param {string} [uid] - UID TikTok (nếu đã biết)
 */
export async function startTikTokWatcher(client, username, channelId, intervalMinutes = 10, uid = null) {
  const cache = {};

  async function checkLatestVideo() {
    try {
      console.log(`[TikTokWatcher] Kiểm tra video mới của ${username}...`);

      let apiUrl;
      if (uid) {
        apiUrl = `https://www.tikwm.com/api/user/posts/${username}`; // Dùng username vẫn OK, UID sẽ dùng nếu API khác
      } else {
        apiUrl = `https://www.tikwm.com/api/user/posts/${username}`;
      }

      const res = await axios.get(apiUrl);
      const data = res.data?.data;

      if (!data?.videos || data.videos.length === 0) {
        console.log(`[TikTokWatcher] Không tìm thấy video nào cho ${username}.`);
        return;
      }

      const latest = data.videos[0];
      const latestId = latest.video_id;

      if (cache[username] === latestId) {
        console.log(`[TikTokWatcher] Không có video mới.`);
        return;
      }

      // Cập nhật cache
      cache[username] = latestId;

      // Gửi video lên Discord
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        const videoUrl = `https://www.tiktok.com/@${username}/video/${latestId}`;
        await channel.send({
          content: `📹 Video mới từ **@${username}**:\n${videoUrl}`,
        });
        console.log(`[TikTokWatcher] Đã gửi video: ${videoUrl}`);
      }
    } catch (err) {
      console.error(`[TikTokWatcher] Lỗi khi kiểm tra: ${err.message}`);
    }
  }

  // Hàm test gửi ngay video gần nhất, bỏ qua cache
  async function testSendLatestVideo() {
    try {
      console.log(`[TikTokWatcher][Test] Lấy video gần nhất của ${username}...`);

      const res = await axios.get(`https://www.tikwm.com/api/user/posts/${username}`);
      const data = res.data?.data;

      if (!data?.videos || data.videos.length === 0) {
        console.log(`[TikTokWatcher][Test] Không tìm thấy video nào.`);
        return;
      }

      const latest = data.videos[0];
      const videoUrl = `https://www.tiktok.com/@${username}/video/${latest.video_id}`;

      const channel = await client.channels.fetch(channelId);
      if (channel) {
        await channel.send({
          content: `📹 [Test] Video gần nhất của **@${username}**:\n${videoUrl}`,
        });
        console.log(`[TikTokWatcher][Test] Đã gửi video gần nhất: ${videoUrl}`);
      }
    } catch (err) {
      console.error(`[TikTokWatcher][Test] Lỗi khi gửi video: ${err.message}`);
    }
  }

  // Gọi ngay 1 lần
  await checkLatestVideo();

  // Lặp theo intervalMinutes
  setInterval(checkLatestVideo, intervalMinutes * 60 * 1000);

  // Nếu cần test gửi video gần nhất, gọi testSendLatestVideo()
  // await testSendLatestVideo();
}
