import axios from "axios";
import fs from "fs";

const WATCH_INTERVAL = 60 * 1000; // 1 phút

const USERS = ["docdoan.vanco"]; // danh sách user theo dõi
const DATA_FILE = "./lastVideos.json";

const loadLastVideos = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return {};
  }
};

const saveLastVideos = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// 🔍 Hàm lấy UID và thông tin user TikTok
async function getUserInfo(username) {
  const url = `https://www.tiktok.com/api/user/detail/?uniqueId=${username}`;
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://www.tiktok.com/",
    Accept: "application/json, text/plain, */*",
  };

  const res = await axios.get(url, { headers });
  if (!res.data?.userInfo?.user?.id) throw new Error("Không tìm thấy user info!");

  const user = res.data.userInfo.user;
  return {
    secUid: user.secUid,
    id: user.id,
    nickname: user.nickname,
    uniqueId: user.uniqueId,
  };
}

// 🧩 Lấy danh sách video mới nhất
async function getLatestVideo(secUid) {
  const url = `https://www.tiktok.com/api/post/item_list/?aid=1988&count=5&secUid=${encodeURIComponent(
    secUid
  )}`;
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://www.tiktok.com/",
  };

  const res = await axios.get(url, { headers });
  const items = res.data?.itemList || [];
  if (!items.length) return null;

  const latest = items[0];
  return {
    id: latest.id,
    desc: latest.desc,
    createTime: latest.createTime,
    url: `https://www.tiktok.com/@${latest.author?.uniqueId}/video/${latest.id}`,
  };
}

async function checkUsers() {
  console.log(`[TikTok] Đang kiểm tra video mới...`);
  const lastData = loadLastVideos();

  for (const username of USERS) {
    try {
      console.log(`[TikTok] Kiểm tra ${username}...`);
      const info = await getUserInfo(username);

      const latestVideo = await getLatestVideo(info.secUid);
      if (!latestVideo) {
        console.log(`[TikTok] Không tìm thấy video nào của ${username}`);
        continue;
      }

      if (lastData[username]?.lastVideoId !== latestVideo.id) {
        console.log(
          `[TikTok] ✨ Phát hiện video mới của ${username}: ${latestVideo.url}`
        );
        lastData[username] = { lastVideoId: latestVideo.id };
        saveLastVideos(lastData);
      } else {
        console.log(`[TikTok] Không có video mới của ${username}`);
      }
    } catch (err) {
      console.log(
        `[TikTok] Lỗi khi kiểm tra ${username}:`,
        err.response?.status
          ? `Request failed with status ${err.response.status}`
          : err.message
      );
    }
  }
}

setInterval(checkUsers, WATCH_INTERVAL);
checkUsers();
