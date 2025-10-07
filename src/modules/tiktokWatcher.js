import axios from "axios";

// Hàm lấy UID TikTok từ tên người dùng
async function getTikTokUID(username) {
  try {
    const url = `https://www.tiktok.com/@${username}`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        "Referer": "https://www.tiktok.com/",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const html = response.data;

    // Tìm UID trong mã HTML của TikTok
    const uidMatch = html.match(/"uid":"(\d+)"/);
    if (uidMatch) {
      console.log(`[TikTok] UID của ${username} là ${uidMatch[1]}`);
      return uidMatch[1];
    }

    console.error("[TikTok] Không tìm thấy UID trong HTML!");
    return null;
  } catch (error) {
    console.error(`[TikTok] Lỗi khi lấy UID cho ${username}: ${error.message}`);
    return null;
  }
}

// Hàm lấy video mới nhất của người dùng
async function getLatestVideo(username) {
  try {
    const url = `https://www.tiktok.com/@${username}`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        "Referer": "https://www.tiktok.com/",
      },
    });

    const html = response.data;

    // Regex để trích xuất video ID đầu tiên
    const videoMatch = html.match(/"id":"(\d{8,})","desc":".*?"/);
    if (videoMatch) {
      return {
        id: videoMatch[1],
        url: `https://www.tiktok.com/@${username}/video/${videoMatch[1]}`,
      };
    }

    console.error("[TikTok] Không tìm thấy video mới trong HTML!");
    return null;
  } catch (error) {
    console.error(`[TikTok] Lỗi khi lấy video mới: ${error.message}`);
    return null;
  }
}

// Biến tạm lưu ID video cuối cùng đã kiểm tra
let lastVideoId = null;

// Hàm khởi động watcher
export async function startTikTokWatcher(username, intervalMinutes = 5) {
  console.log(`[TikTok] Bắt đầu theo dõi tài khoản ${username}...`);

  const uid = await getTikTokUID(username);
  if (!uid) {
    console.error(`[TikTok] Không thể lấy UID TikTok cho ${username}.`);
    return;
  }

  console.log(`[TikTok] Đang theo dõi video mới từ ${username} (UID: ${uid})`);

  // Hàm kiểm tra định kỳ
  const checkNewVideo = async () => {
    console.log(`[TikTok] Đang kiểm tra video mới của ${username}...`);
    const latestVideo = await getLatestVideo(username);

    if (latestVideo) {
      if (lastVideoId && latestVideo.id !== lastVideoId) {
        console.log(
          `[TikTok] 🔔 Phát hiện video mới: ${latestVideo.url}`
        );
      } else if (!lastVideoId) {
        console.log(`[TikTok] Video đầu tiên được lưu: ${latestVideo.id}`);
      }
      lastVideoId = latestVideo.id;
    } else {
      console.warn(`[TikTok] Không thể lấy thông tin video mới.`);
    }
  };

  // Kiểm tra lần đầu ngay lập tức
  await checkNewVideo();

  // Sau đó lặp lại mỗi X phút
  setInterval(checkNewVideo, intervalMinutes * 60 * 1000);
}
