# Discord Post Bot

Bot Discord đơn giản để đăng "bài viết" (embed) gồm: **tiêu đề + nội dung + hình ảnh + chú thích**.

## 🚀 Cách chạy local
1. Clone repo & cài đặt:
   ```bash
   npm install
   ```
2. Tạo file `.env` dựa trên `.env.example` và điền token bot.
3. Deploy slash commands:
   ```bash
   npm run deploy-commands
   ```
4. Chạy bot:
   ```bash
   npm run dev
   ```

## ☁️ Deploy lên Railway
1. Push code lên GitHub.
2. Vào [Railway](https://railway.app/) → New Project → Deploy from GitHub Repo.
3. Trong Railway, vào **Variables**, thêm:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
4. Railway sẽ tự build & chạy bot.
