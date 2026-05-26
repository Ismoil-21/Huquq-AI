# ⚖️ Mening Huquqim — v2.0

O'zbekiston Respublikasi qonunchiligi bo'yicha AI huquqiy maslahatchi.
Login/parol bilan kirish, suhbat tarixi, admin panel.

---

## Loyiha tuzilmasi

```
mening-huquqim/
├── backend/
│   ├── models/index.js          # User, Chat, Admin, DailyStat
│   ├── middleware/auth.js        # JWT guard (user + admin)
│   ├── services/
│   │   ├── legalAI.js            # Claude AI (faqat qonun)
│   │   └── stats.js              # Kunlik statistika
│   ├── routes/
│   │   ├── auth.js               # /api/auth (register/login/me)
│   │   ├── chat.js               # /api/chat (yuborish, tarix)
│   │   └── admin.js              # /api/admin (dashboard, users)
│   ├── telegram-bot.js           # Telegram bot
│   ├── server.js                 # Express server (port 3000)
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Home.jsx           # Landing page
    │   │   ├── Login.jsx          # Foydalanuvchi kirish
    │   │   ├── Register.jsx       # Ro'yxatdan o'tish
    │   │   ├── Chat.jsx           # Suhbat (tarix sidebar bilan)
    │   │   ├── About.jsx          # Haqida
    │   │   ├── AdminLogin.jsx     # Admin kirish
    │   │   └── AdminPanel.jsx     # Admin dashboard
    │   ├── context/AuthContext.jsx
    │   ├── utils/api.js
    │   └── styles/global.css
    ├── vite.config.js             # port 5173, proxy → 3000
    └── index.html
```

---

## O'rnatish

### Talablar
- Node.js 18+
- MongoDB 6+ (lokal yoki MongoDB Atlas)
- Anthropic API key
- (Ixtiyoriy) Telegram Bot token

---

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

`.env` faylini to'ldiring:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/mening_huquqim
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=...         # Ixtiyoriy
FRONTEND_URL=http://localhost:5173
JWT_SECRET=uzun-tasodifiy-satr-bu-yerga
NODE_ENV=development
```

```bash
npm run dev      # Development
npm start        # Production
```

Server ishga tushganda avtomatik ravishda **admin** yaratiladi:
- Username: `admin`
- Parol: `admin123`

> ⚠️ Dastlabki kirishdan so'ng parolni o'zgartiring!

---

### 2. Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # Production build (dist/ papkasiga)
```

---

### 3. Docker bilan (ikkalasi birga)

```bash
# Root papkada
cp backend/.env.example backend/.env
# .env ni to'ldiring

docker-compose up --build
```

---

## URL manzillar

| Manzil              | Tavsif                     |
|---------------------|----------------------------|
| `http://localhost:5173`         | Sayt (foydalanuvchilar) |
| `http://localhost:5173/login`   | Foydalanuvchi kirish    |
| `http://localhost:5173/register`| Ro'yxatdan o'tish       |
| `http://localhost:5173/chat`    | AI suhbat (login kerak) |
| `http://localhost:5173/admin/login` | Admin kirish        |
| `http://localhost:5173/admin`   | Admin dashboard         |
| `http://localhost:3000/health`  | API holat tekshirish    |

---

## API endpointlari

### Foydalanuvchi auth
```
POST /api/auth/register   — Ro'yxatdan o'tish
POST /api/auth/login      — Kirish
GET  /api/auth/me         — Joriy foydalanuvchi (token kerak)
```

### Chat (token kerak)
```
POST /api/chat                     — Xabar yuborish
GET  /api/chat/sessions            — Barcha suhbatlar tarixi
GET  /api/chat/:sessionId          — Suhbat tafsiloti
DELETE /api/chat/:sessionId        — Suhbatni o'chirish
```

### Admin (admin token kerak)
```
POST /api/admin/login              — Admin kirish
GET  /api/admin/stats              — Dashboard statistika
GET  /api/admin/chats              — Suhbatlar ro'yxati
GET  /api/admin/chats/:sessionId   — Suhbat tafsiloti
DELETE /api/admin/chats/:sessionId — Suhbatni o'chirish
GET  /api/admin/users              — Foydalanuvchilar
PATCH /api/admin/users/:id/block   — Bloklash/ochish
DELETE /api/admin/users/:id        — O'chirish
```

---

## Xususiyatlar

### Foydalanuvchilar uchun
- ✅ Login / Parol bilan ro'yxatdan o'tish
- ✅ JWT token (7 kun amal qiladi)
- ✅ Suhbat tarixi (barcha sessiyalar saqlanadi)
- ✅ Sessiyalar ro'yxati sidebar'da
- ✅ Faqat O'zbekiston qonunchiligi bo'yicha javob

### Admin panel
- ✅ Statistika dashboard (kartalar + grafiklar)
- ✅ So'nggi 14 kun grafigi
- ✅ Kategoriyalar bo'yicha taqsimlot
- ✅ Barcha suhbatlarni ko'rish va o'chirish
- ✅ Foydalanuvchilar boshqaruvi (bloklash, o'chirish)
- ✅ Qidirish va filtrlash

### AI xususiyatlari
- ✅ Faqat huquqiy savollarga javob beradi
- ✅ Boshqa mavzularda rad javob qaytaradi
- ✅ O'zbek tilida javob
- ✅ Qonun moddalari bilan
- ✅ Suhbat kontekstini eslab qoladi

---

## Production deployment

### Nginx konfiguratsiyasi

```nginx
server {
    listen 80;
    server_name mening-huquqim.uz;

    # Frontend
    location / {
        root /var/www/mening-huquqim/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### PM2 bilan ishga tushirish

```bash
npm install -g pm2
cd backend
pm2 start server.js --name mening-huquqim-api
pm2 save
pm2 startup
```
