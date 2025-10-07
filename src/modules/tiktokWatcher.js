import axios from "axios";

/**
 * Thử lấy UID TikTok qua API công khai chính thức.
 */
async function getUIDFromAPI(username) {
  try {
    const res = await axios.get(
      `https://www.tiktok.com/api/user/detail/?uniqueId=${username}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
          Referer: "https://www.tiktok.com/",
        },
      }
    );

    const uid = res.data?.userInfo?.user?.id;
    if (uid) {
      console.log(`[TikTok] ✅ UID API của ${username} là ${uid}`);
      return uid;
    }

    console.warn(`[TikTok] API không trả về UID cho ${username}.`);
    return null;
  } catch (err) {
    console.warn(`[TikTok] API TikTok thất bại (${err.message}).`);
    return null;
  }
}

/**
 * Nếu API thất bại, fallback sang HTML scraping.
 */
async function getUIDFromHTML(username) {
  try {
    const html = await axios.get(`https://www.tiktok.com/@${username}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      },
    });

    const match = html.data.match(/"uid":"(\d+)"/);
    if (match && match[1]) {
      const uid = match[1];
      console.log(`[TikTok] ✅ UID HTML của ${username} là ${uid}`);
      return uid;
    }

    console.error(`[TikTok] ❌ Không tìm thấy UID trong HTML cho ${username}.`);
    return null;
  } catch (err) {
    console.error(`[TikTok] ❌ Lỗi khi lấy UID qua HTML: ${err.message}`);
    return null;
  }
}

/**
 * Lấy UID TikTok với chế độ hybrid (API + fallback HTML)
 */
async function getTikTokUID(username) {
  if (typeof username !== "string") {
    console.error(`[TikTok] Sai kiểu dữ liệu username: ${username}`);
    return null;
  }

  let uid = await getUIDFromAPI(username);
  if (!uid) uid = await getUIDFromHTML(username);

  if (!uid) {
    console.error(`[TikTok] 🚫 Không thể lấy UID TikTok cho ${username}.`);
  }
  return uid;
}

/**
 * Lấy video mới nhất của TikTok user qua TikWM API
 */
async function getLatestVideoByUID(uid) {
  try {
    const apiUrl = `https://www.tikwm.com/api/user/posts/${uid}`;
    const res = await axios.get(apiUrl);
    const data = res.data?.data;

    if (!data || !data.videos || data.videos.length === 0) {
      console.log(`[TikTok] Không có video nào cho UID ${uid}.`);
      return null;
    }

    const latest = data.videos[0];
    return {
      id: latest.video_id,
      url: `https://www.tiktok.com/@${data.user.unique_id}/video/${latest.video_id}`,
    };
  } catch (err) {
    console.error(`[TikTok] Lỗi khi lấy video mới: ${err.message}`);
    return null;
  }
}

let lastVideoId = null;

/**
 * Theo dõi tài khoản TikTok
 * @param {string} username - tên tài khoản TikTok (ví dụ: "docdoan.vanco")
 * @param {number} intervalMinutes - số phút giữa mỗi lần kiểm tra
 */
export async function startTikTokWatcher(username, intervalMinutes = 10) {
  console.log(`[TikTok] Bắt đầu theo dõi tài khoản ${username}...`);

  if (typeof username !== "string") {
    console.error("[TikTok] username phải là chuỗi (string).");
    return;
  }

  const uid = await getTikTokUID(username);
  if (!uid) return;

  console.log(`[TikTok] Đang theo dõi video mới từ @${username} (UID: ${uid})`);

  const checkNewVideo = async () => {
    console.log(`[TikTok] 🔎 Kiểm tra video mới của ${username}...`);
    const latestVideo = await getLatestVideoByUID(uid);

    if (latestVideo) {
      if (lastVideoId && latestVideo.id !== lastVideoId) {
        console.log(`[TikTok] 🚨 Video mới: ${latestVideo.url}`);
      } else if (!lastVideoId) {
        console.log(`[TikTok] 📌 Ghi nhận video đầu tiên: ${latestVideo.id}`);
      }
      lastVideoId = latestVideo.id;
    } else {
      console.warn(`[TikTok] Không thể lấy video mới cho ${username}.`);
    }
  };

  await checkNewVideo();
  setInterval(checkNewVideo, intervalMinutes * 60 * 1000);
}
