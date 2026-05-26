"use strict";
const nodemailer = require("nodemailer");

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || "smtp.gmail.com",
    port:   parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOTPEmail(toEmail, otp, fullName = "") {
  const transporter = createTransport();
  const name = fullName || "Foydalanuvchi";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background:#f5f3ef; margin:0; padding:20px; }
    .container { max-width:500px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
    .header { background:#1a2744; padding:30px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:22px; }
    .header p  { color:#c9a84c; margin:5px 0 0; font-size:14px; }
    .body { padding:30px; }
    .otp-box { background:#f5f3ef; border:2px dashed #c9a84c; border-radius:10px; text-align:center; padding:20px; margin:20px 0; }
    .otp-code { font-size:42px; font-weight:bold; color:#1a2744; letter-spacing:8px; }
    .expire { font-size:12px; color:#888; margin-top:8px; }
    .footer { text-align:center; padding:20px; font-size:12px; color:#aaa; border-top:1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚖ Mening Huquqim</h1>
      <p>O'zbekiston huquqiy maslahat platformasi</p>
    </div>
    <div class="body">
      <p>Assalomu alaykum, <strong>${name}</strong>!</p>
      <p>Hisobingizni tasdiqlash uchun quyidagi bir martalik kodni kiriting:</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="expire">⏰ Kod 10 daqiqa ichida amal qiladi</div>
      </div>
      <p>Agar siz bu so'rovni yubormagan bo'lsangiz, ushbu xatni e'tiborsiz qoldiring.</p>
    </div>
    <div class="footer">© 2025 Mening Huquqim — O'zbekiston qonunchiligiga asoslangan AI maslahat</div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Mening Huquqim" <${process.env.SMTP_USER}>`,
    to:   toEmail,
    subject: `Tasdiqlash kodi: ${otp} — Mening Huquqim`,
    html,
    text: `Tasdiqlash kodingiz: ${otp}\n\nKod 10 daqiqa ichida amal qiladi.`,
  });
}

async function sendPasswordResetEmail(toEmail, newPassword, fullName = "", adminUsername = "Admin") {
  const transporter = createTransport();
  const name = fullName || "Foydalanuvchi";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background:#f5f3ef; margin:0; padding:20px; }
    .container { max-width:500px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
    .header { background:#1a2744; padding:30px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:22px; }
    .header p  { color:#c9a84c; margin:5px 0 0; font-size:14px; }
    .body { padding:30px; }
    .pass-box { background:#f5f3ef; border:2px solid #c9a84c; border-radius:10px; text-align:center; padding:20px; margin:20px 0; }
    .pass-code { font-size:26px; font-weight:bold; color:#1a2744; letter-spacing:4px; font-family:monospace; }
    .pass-label { font-size:12px; color:#888; margin-top:8px; }
    .warn { background:#fff3cd; border:1px solid #ffc107; border-radius:8px; padding:12px 16px; font-size:13px; color:#856404; margin-top:16px; }
    .footer { text-align:center; padding:20px; font-size:12px; color:#aaa; border-top:1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚖ Mening Huquqim</h1>
      <p>O'zbekiston huquqiy maslahat platformasi</p>
    </div>
    <div class="body">
      <p>Assalomu alaykum, <strong>${name}</strong>!</p>
      <p>Administrator tomonidan hisobingiz paroli yangilandi.</p>
      <div class="pass-box">
        <div class="pass-label">Yangi parolingiz:</div>
        <div class="pass-code">${newPassword}</div>
      </div>
      <p>Tizimga kirganingizdan so'ng parolni o'zingiz xohlagan parolga o'zgartirishingizni tavsiya qilamiz.</p>
      <div class="warn">
        ⚠️ Agar siz bu o'zgarishni so'ramagan bo'lsangiz, darhol administrator bilan bog'laning.
      </div>
    </div>
    <div class="footer">© 2025 Mening Huquqim — O'zbekiston qonunchiligiga asoslangan AI maslahat</div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from:    `"Mening Huquqim" <${process.env.SMTP_USER}>`,
    to:      toEmail,
    subject: "Parolingiz o'zgartirildi — Mening Huquqim",
    html,
    text:    `Assalomu alaykum, ${name}!\n\nAdministrator tomonidan parolingiz yangilandi.\n\nYangi parolingiz: ${newPassword}\n\nTizimga kirganingizdan so'ng parolni o'zgartirishingizni tavsiya qilamiz.`,
  });
}

module.exports = { generateOTP, sendOTPEmail, sendPasswordResetEmail };
