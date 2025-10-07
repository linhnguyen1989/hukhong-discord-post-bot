import axios from "axios";
import fs from "fs";
import path from "path";

/**
 * TikTok watcher with header randomization + optional proxy rotation + retries.
 *
 * Exported function:
 *   startTikTokWatcher(username, intervalMinutes, client, channelId)
 *
 * Optional env:
 *   PROXIES = "http://user:pass@1.2.3.4:8080,http://5.6.7.8:3128"  (comma separated)
 */

const DATA_DIR = path.resolve("./data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DATA_FILE = path.join(DATA_DIR, "tiktok_cache.json");

function loadCache() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8") || "{}");
  } catch {
    return {};
  }
}
function saveCache(obj) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), "utf8");
}

const USER_AGENTS = [
  // several modern desktop UA
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0"
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getProxiesFromEnv() {
  const raw = process.env.PROXIES || "";
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

const PROXIES = getProxiesFromEnv(); // array of proxy urls

function buildAxiosInstance({ proxyUrl = null, timeout = 10000 } = {}) {
  const headers = {
    "User-Agent": pickRandom(USER_AGENTS),
    "Referer": "https://www.tiktok.com/",
    "Accept-Language": "en-US,en;q=0.9",
    Accept: "application/json, text/plain, */*"
  };

  if (!proxyUrl) {
    return axios.create({ headers, timeout });
  }

  // parse proxy url basic (http://user:pass@host:port)
  try {
    const u = new URL(proxyUrl);
    const agentConfig = {
      host: u.hostname,
      port: Number(u.port),
      protocol: u.protocol.replace(":", "")
    };
    const auth = u.username ? { username: decodeURIComponent(u.username), password: decodeURIComponent(u.password) } : undefined;

    return axios.create({
      headers,
      timeout,
      proxy: {
        host: agentConfig.host,
        port: agentConfig.port,
        protocol: agentConfig.protocol,
        auth: auth
      }
    });
  } catch {
    // fallback to no-proxy axios if parse fails
    return axios.create({ headers, timeout });
  }
}

async function requestWithRetries(opts) {
  // opts: { fn: async (axiosInstance) => response, tries = 3, backoff = 1000, useProxies = true }
  const tries = opts.tries ?? 3;
  const baseBackoff = opts.backoff ?? 1000;
  const useProxies = !!opts.useProxies;
  const proxies = PROXIES.length ? PROXIES : [null];

  let attempt = 0;
  // rotate through proxies and also try without proxy first
  const proxyCandidates = useProxies ? [null, ...proxies] : [null];

  for (let pIdx = 0; pIdx < proxyCandidates.length; pIdx++) {
    const proxy = proxyCandidates[pIdx];
    for (let t = 0; t < tries; t++) {
      attempt++;
      const axiosInst = buildAxiosInstance({ proxyUrl: proxy, timeout: 10000 + t * 2000 });
      try {
        const res = await opts.fn(axiosInst);
        return res;
      } catch (err) {
        const code = err.response?.status || err.code || err.message;
        // last attempt?
        const isLast = pIdx === proxyCandidates.length - 1 && t === tries - 1;
        console.warn(`[TikTok] request attempt ${attempt} failed (proxy=${proxy || "none"}): ${code}`);
        if (isLast) throw err;
        const delay = baseBackoff * Math.pow(2, t);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw new Error("All attempts exhausted");
}

/* -------------------
   UID retrieval (hybrid)
   ------------------- */

async function getUID_via_api_json(axiosInst, username) {
  // try ?__a=1 endpoint
  const url = `https://www.tiktok.com/@${username}?__a=1&lang=en`;
  const r = await axiosInst.get(url);
  // new tiktok sometimes return JSON inside html or parsed object
  // check common paths:
  const data = r.data;
  // sometimes returned as object already
  const uid = data?.userInfo?.user?.id || data?.UserModule?.users?.[username]?.id || data?.user?.id;
  return uid || null;
}

async function getUID_via_html(axiosInst, username) {
  const url = `https://www.tiktok.com/@${username}`;
  const r = await axiosInst.get(url);
  const html = r.data || "";
  // try several regex patterns (cover multiple tiktok versions)
  // pattern 1: "id":"1234567890"
  let m = html.match(/"id":"(\d{4,})"/);
  if (m && m[1]) return m[1];
  // pattern 2: "id_str":"1234567890"
  m = html.match(/"id_str":"(\d{4,})"/);
  if (m && m[1]) return m[1];
  // pattern 3: sec_user_id or uid in window data
  m = html.match(/"secUid":"([A-Za-z0-9_\-:]+)"/);
  if (m && m[1]) return m[1];
  return null;
}

async function getTikTokUIDHybrid(username) {
  // use requestWithRetries to try multiple strategies and proxies
  // Strategy A: try API JSON without proxy first, then with proxies
  try {
    const uid = await requestWithRetries({
      fn: async (axiosInst) => await getUID_via_api_json(axiosInst, username),
      tries: 2,
      backoff: 800,
      useProxies: true
    });
    if (uid) return uid;
  } catch (e) {
    // continue to html fallback
    console.warn(`[TikTok] API JSON method failed: ${e.message}`);
  }

  // Strategy B: HTML parse (may need proxies)
  try {
    const uid = await requestWithRetries({
      fn: async (axiosInst) => await getUID_via_html(axiosInst, username),
      tries: 3,
      backoff: 800,
      useProxies: true
    });
    if (uid) return uid;
  } catch (e) {
    console.warn(`[TikTok] HTML parse method failed: ${e.message}`);
  }

  return null;
}

/* -------------------
   fetch latest videos by UID
   ------------------- */
async function fetchLatestByUID(uid, username) {
  // prefer tikwm (works with uid)
  const endpoint = `https://www.tikwm.com/api/user/posts/${uid}`;
  const res = await axios.get(endpoint, {
    headers: {
      "User-Agent": pickRandom(USER_AGENTS),
      Referer: "https://www.tikwm.com/"
    },
    timeout: 10000
  });
  const data = res.data?.data;
  if (!data || !data.videos || data.videos.length === 0) return null;
  const latest = data.videos[0];
  return {
    id: latest.video_id,
    url: `https://www.tiktok.com/@${username}/video/${latest.video_id}`,
    cover: latest.covers?.default || null,
    desc: latest.desc || ""
  };
}

/* -------------------
   main exported watcher
   ------------------- */
/**
 * startTikTokWatcher(username, intervalMinutes, client, channelId)
 */
export async function startTikTokWatcher(username, intervalMinutes = 60, client = null, channelId = null) {
  if (typeof username !== "string") {
    console.error("[TikTok] username phải là chuỗi (string).");
    return;
  }
  intervalMinutes = Number(intervalMinutes) || 60;

  console.log(`[TikTok] Bắt đầu theo dõi: ${username} (every ${intervalMinutes}m)`);

  const cache = loadCache();
  if (!cache[username]) cache[username] = { uid: null, lastVideoId: null };

  // get UID (hybrid + proxy retries)
  let uid = cache[username].uid || null;
  if (!uid) {
    console.log("[TikTok] Lấy UID (hybrid)...");
    uid = await getTikTokUIDHybrid(username);
    if (!uid) {
      console.error(`[TikTok] 🚫 Không thể lấy UID TikTok cho ${username} (after hybrid attempts).`);
      return;
    }
    cache[username].uid = uid;
    saveCache(cache);
  } else {
    console.log(`[TikTok] Sử dụng UID cache: ${uid}`);
  }

  // check function
  const checkOnce = async () => {
    try {
      console.log(`[TikTok] Kiểm tra video mới cho ${username} (uid=${uid})...`);
      // try fetchLatestByUID normally; if fails, try via proxies+retries
      let latest = null;
      try {
        latest = await fetchLatestByUID(uid, username);
      } catch (e) {
        console.warn(`[TikTok] fetchLatestByUID direct failed: ${e.message}, trying via proxies/retries`);
        // try with requestWithRetries using tikwm endpoint
        latest = await requestWithRetries({
          fn: async (axiosInst) => {
            const res = await axiosInst.get(`https://www.tikwm.com/api/user/posts/${uid}`);
            const d = res.data?.data;
            if (!d || !d.videos || d.videos.length === 0) return null;
            const v = d.videos[0];
            return { id: v.video_id, url: `https://www.tiktok.com/@${username}/video/${v.video_id}`, cover: v.covers?.default || null, desc: v.desc || "" };
          },
          tries: 3,
          backoff: 800,
          useProxies: true
        });
      }

      if (!latest) {
        console.log(`[TikTok] Không lấy được video cho ${username} (uid=${uid}).`);
        return;
      }

      const lastId = cache[username].lastVideoId;
      if (!lastId) {
        cache[username].lastVideoId = latest.id;
        saveCache(cache);
        console.log(`[TikTok] Lưu video đầu tiên cho ${username}: ${latest.id}`);
        return;
      }

      if (latest.id !== lastId) {
        console.log(`[TikTok] Phát hiện video mới cho ${username}: ${latest.url}`);
        // update cache
        cache[username].lastVideoId = latest.id;
        saveCache(cache);

        // send to discord if client+channel provided
        if (client && channelId) {
          try {
            const ch = await client.channels.fetch(channelId);
            if (ch) {
              const content = `📣 Video mới từ **@${username}**:\n${latest.url}`;
              await ch.send({ content });
            }
          } catch (e) {
            console.warn(`[TikTok] Không gửi được lên Discord: ${e.message}`);
          }
        }
      } else {
        console.log(`[TikTok] Không có video mới cho ${username}.`);
      }
    } catch (err) {
      console.error(`[TikTok] Lỗi checkOnce: ${err.message}`);
    }
  };

  // initial check and interval
  await checkOnce();
  setInterval(checkOnce, intervalMinutes * 60 * 1000);
}
