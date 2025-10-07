// src/modules/tiktokWatcher.js
import axios from "axios";
import fs from "fs";
import path from "path";

/**
 * TikTok watcher that:
 * - Parses __NEXT_DATA__ from the user's TikTok page HTML
 * - Extracts latest video info (id, caption, thumbnail, createTime)
 * - Sends an Embed to a Discord channel with link + caption + thumbnail + timestamp
 *
 * Export:
 *   startTikTokWatcher(username, intervalMinutes, client, channelId)
 *
 * Usage (from your index.js):
 *   await startTikTokWatcher("docdoan.vanco", 3, client, "1269887001587617822");
 */

// ----- config -----
const DATA_DIR = path.resolve(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const CACHE_FILE = path.join(DATA_DIR, "tiktok_cache.json");

// default user agents (rotate)
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0"
];

function pickUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function loadCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8") || "{}");
  } catch (e) {
    console.warn("[TikTokWatcher] loadCache error:", e.message);
    return {};
  }
}
function saveCache(cache) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch (e) {
    console.warn("[TikTokWatcher] saveCache error:", e.message);
  }
}

/** Helper: fetch HTML of a TikTok user page with randomized UA and minimal headers */
async function fetchUserPageHtml(username, axiosInstance = null) {
  const url = `https://www.tiktok.com/@${username}`;
  const inst = axiosInstance || axios.create({
    headers: {
      "User-Agent": pickUA(),
      Referer: "https://www.tiktok.com/",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    timeout: 15000
  });
  const res = await inst.get(url);
  return res.data;
}

/** Parse __NEXT_DATA__ JSON from HTML (robust: tries multiple script patterns) */
function extractNextDataJson(html) {
  if (!html || typeof html !== "string") return null;
  // pattern 1: <script id="__NEXT_DATA__" type="application/json"> ... </script>
  let m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (m && m[1]) {
    try { return JSON.parse(m[1]); } catch (e) { /* fallthrough */ }
  }
  // pattern 2: window.__NEXT_DATA__ = {...};
  m = html.match(/window\.__NEXT_DATA__\s*=\s*({[\s\S]*?});/i);
  if (m && m[1]) {
    try { return JSON.parse(m[1]); } catch (e) { /* fallthrough */ }
  }
  // pattern 3: <script>window.__INITIAL_PROPS__ = {...}</script>
  m = html.match(/window\.__INITIAL_PROPS__\s*=\s*({[\s\S]*?});/i);
  if (m && m[1]) {
    try { return JSON.parse(m[1]); } catch (e) { /* fallthrough */ }
  }
  return null;
}

/** Extract latest video object from parsed nextData (tries multiple paths) */
function findLatestVideoFromNextData(nextData, username) {
  if (!nextData) return null;

  // Common locations in different TikTok versions:
  // 1) nextData.props.pageProps.userData / user posts in props.pageProps.userData.awemeList or props.pageProps.userData.itemList
  // 2) nextData.props.pageProps.initialState or nextData.props.pageProps.userModule
  // 3) nextData.props.pageProps.profileInfo / props.pageProps.userPosts

  // Try candidate paths in order:
  const candidates = [
    // new-ish structure
    () => nextData.props?.pageProps?.itemList || null,
    () => nextData.props?.pageProps?.awemeList || null,
    () => nextData?.props?.pageProps?.userData?.awemeList || null,
    () => nextData?.props?.pageProps?.userData?.itemList || null,
    () => {
      // some versions store under UserModule
      const users = nextData.props?.pageProps?.UserModule?.users;
      const userKey = username in (users || {}) ? username : Object.keys(users || {})[0];
      return nextData.props?.pageProps?.UserModule?.users && nextData.props?.pageProps?.UserModule?.users[userKey]?.awemeList;
    },
    () => {
      // try global store itemList
      return nextData.props?.initialState?.itemListData || nextData.props?.initialState?.awemeList || null;
    }
  ];

  for (const fn of candidates) {
    try {
      const list = fn();
      if (!list) continue;
      // list may be an object with keys; normalize to array
      const arr = Array.isArray(list) ? list : (list.list || list.awemeList || Object.values(list));
      if (arr && arr.length > 0) {
        // pick first valid item that contains id
        for (const it of arr) {
          const id = it?.id || it?.awemeId || it?.video?.id || it?.aweme_id || it?.aweme_id_str || it?.awemeId;
          if (id) {
            // construct normalized info
            const video = {};
            video.id = id.toString();
            video.desc = it?.desc || it?.description || it?.video?.title || "";
            // try thumbnail/cover
            video.thumbnail = it?.video?.cover?.url_list?.[0] || it?.video?.cover || it?.cover?.url_list?.[0] || it?.cover || it?.image?.url || null;
            // try author unique id
            video.author = it?.author?.uniqueId || it?.author?.id || username;
            // try create time
            video.createTime = it?.createTime || it?.create_time || it?.ctime || null;
            // assemble url
            video.url = `https://www.tiktok.com/@${video.author}/video/${video.id}`;
            return video;
          }
        }
      }
    } catch (e) {
      // ignore and try next
    }
  }

  // fallback: sometimes nextData contains a JSON tree under props.pageProps.posts
  try {
    const posts = nextData?.props?.pageProps?.posts || nextData?.props?.pageProps?.videos;
    if (Array.isArray(posts) && posts.length > 0) {
      const it = posts[0];
      const id = it?.id || it?.video?.id;
      if (id) {
        return {
          id: id.toString(),
          desc: it?.desc || it?.title || "",
          thumbnail: it?.video?.cover || null,
          author: username,
          createTime: it?.createTime || null,
          url: `https://www.tiktok.com/@${username}/video/${id}`
        };
      }
    }
  } catch (e) {}

  return null;
}

/** Convert unix seconds -> ISO timestamp for embed */
function unixSecToIso(unixSec) {
  if (!unixSec) return null;
  try {
    const ms = Number(unixSec) * 1000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

/** Main exported watcher function */
export async function startTikTokWatcher(username, intervalMinutes = 3, client = null, channelId = null) {
  if (typeof username !== "string") {
    console.error("[TikTokWatcher] username phải là chuỗi (string).");
    return;
  }
  intervalMinutes = Number(intervalMinutes) || 3;

  console.log(`[TikTokWatcher] Bắt đầu theo dõi tài khoản ${username} (every ${intervalMinutes}m)`);

  const cache = loadCache();
  if (!cache[username]) cache[username] = { lastVideoId: null };

  // internal check function
  const checkOnce = async () => {
    console.log(`[TikTokWatcher] Kiểm tra video mới của ${username}...`);
    try {
      // fetch html (rotate UA)
      const html = await fetchUserPageHtml(username);
      const nextData = extractNextDataJson(html);

      if (!nextData) {
        console.warn(`[TikTokWatcher] Không tìm thấy __NEXT_DATA__ trên trang của ${username}.`);
        return;
      }

      const latest = findLatestVideoFromNextData(nextData, username);
      if (!latest || !latest.id) {
        console.warn(`[TikTokWatcher] Không thể tìm video mới từ __NEXT_DATA__ cho ${username}.`);
        return;
      }

      // normalize thumbnail
      const thumbnail = Array.isArray(latest.thumbnail) ? latest.thumbnail[0] : latest.thumbnail;

      // check cache
      const lastId = cache[username].lastVideoId;
      if (!lastId) {
        // first time: store but don't spam channel with many old posts
        cache[username].lastVideoId = latest.id;
        saveCache(cache);
        console.log(`[TikTokWatcher] Ghi nhận video hiện tại của ${username}: ${latest.id}`);
        return;
      }

      if (latest.id === lastId) {
        console.log(`[TikTokWatcher] Không có video mới cho ${username}.`);
        return;
      }

      // new video detected
      console.log(`[TikTokWatcher] Phát hiện video mới của ${username}: ${latest.url}`);

      // update cache before sending (avoid double-send on errors)
      cache[username].lastVideoId = latest.id;
      saveCache(cache);

      // prepare embed
      if (client && channelId) {
        try {
          const channel = await client.channels.fetch(channelId);
          if (!channel) {
            console.warn(`[TikTokWatcher] Không tìm thấy channel ID ${channelId}`);
            return;
          }

          // Build embed (discord.js v14 EmbedBuilder expected by index.js)
          const embed = {
            title: `🎬 Video mới từ @${username}`,
            url: latest.url,
            description: latest.desc ? (latest.desc.length > 4096 ? latest.desc.slice(0, 4093) + "..." : latest.desc) : "(Không có chú thích)",
            timestamp: unixSecToIso(latest.createTime) || new Date().toISOString(),
            image: thumbnail ? { url: thumbnail } : undefined,
            footer: { text: `ID: ${latest.id}` }
          };

          await channel.send({ embeds: [embed] });
          console.log(`[TikTokWatcher] Đã gửi thông báo video mới vào channel ${channelId}`);
        } catch (err) {
          console.error("[TikTokWatcher] Lỗi khi gửi embed lên Discord:", err.message);
        }
      } else {
        // no discord client provided — just log
        console.log(`[TikTokWatcher] (No client) Video mới: ${latest.url}`);
      }
    } catch (err) {
      console.error("[TikTokWatcher] Lỗi khi kiểm tra:", err.message);
    }
  };

  // initial run + schedule
  await checkOnce();
  setInterval(checkOnce, intervalMinutes * 60 * 1000);
}
