import axios from "axios";
import fs from "fs";
import path from "path";

export async function startTikTokWatcher(client, username, channelId) {
  const cacheFile = path.join(process.cwd(), "tiktokCache.json");
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }

  async function getUID_TikWM(username) {
    const url = `https://www.tikwm.com/api/user/info/${username}`;
    const res = await axios.get(url);
    return res.data?.data?.user?.id || null;
  }

  async function parseUID_fromVideo(videoUrl) {
    // videoUrl có dạng https://www.tiktok.com/@username/video/VID_ID
    const parts = videoUrl.split("/video/");
    if (parts.length >= 2) {
      const vidId = parts[1].split("?")[0];
      return vidId; // coi như dùng vidId tạm như UID
    }
    return null;
  }

  async function fetchUserVideoListByUid(uid) {
    const url = `https://www.tikwm.com/api/user/posts/${uid}`;
    const res = await axios.get(url);
    return res.data?.data?.videos || [];
  }

  async function fallbackGetVideosByUsername(username) {
    // lấy video đầu tiên từ endpoint public video list hoặc scraping
    const urlPublic = `https://www.tiktok.com/@${username}/video/0`; // thử
    const res = await axios.get(urlPublic, {
      headers: {
        "User-Agent": "Mozilla/5.0 ...",
      },
    });
    // parse HTML để lấy video ID — đây là scraper -> phức tạp
    return null;
  }

  async function checkLatestVideo() {
    try {
      console.log(`[TikTok] Đang kiểm tra video mới của ${username}...`);

      let uid;
      try {
        uid = await getUID_TikWM(username);
      } catch {
        uid = null;
      }

      let videos = [];
      if (uid) {
        videos = await fetchUserVideoListByUid(uid);
      }

      if ((!videos || videos.length === 0) && username) {
        // fallback: thử một số phương pháp khác
        console.log(`[TikTok] UID không tìm được, thử fallback`);
        const fallbackVideos = await fallbackGetVideosByUsername(username);
        if (fallbackVideos) videos = fallbackVideos;
      }

      if (!videos || videos.length === 0) {
        console.log(`[TikTok] Không tìm thấy video nào cho ${username}.`);
        return;
      }

      const latest = videos[0];
      const latestId = latest.video_id || latest.id || latest.vid; // tùy dữ liệu

      if (cache[username] === latestId) {
        console.log(`[TikTok] Không có video mới.`);
        return;
      }

      cache[username] = latestId;
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

      const channel = await client.channels.fetch(channelId);
      if (channel) {
        const videoUrl = `https://www.tiktok.com/@${username}/video/${latestId}`;
        await channel.send({ content: `📹 Video mới từ **@${username}**:\n${videoUrl}` });
        console.log(`[TikTok] Đã đăng video mới: ${videoUrl}`);
      }
    } catch (err) {
      console.error(`[TikTok] Lỗi khi kiểm tra: ${err.message}`);
    }
  }

  await checkLatestVideo();
  setInterval(checkLatestVideo, 24 * 60 * 60 * 1000);
}
