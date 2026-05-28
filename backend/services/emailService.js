"use strict";
const nodemailer = require("nodemailer");

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,

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

  await transporter.verify();
  console.log("SMTP READY");

  const name = fullName || "Foydalanuvchi";

  console.log("SMTP Configuration:", {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    user: process.env.SMTP_USER ? "SET" : "NOT SET",
    pass: process.env.SMTP_PASS ? "SET" : "NOT SET",
  });

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

  try {
    const info = await transporter.sendMail({
      from: `"Mening Huquqim" <toxirovi82@gmail.com>`,
      to: toEmail,
      subject: `Tasdiqlash kodi: ${otp} — Mening Huquqim`,
      html,
      text: `Tasdiqlash kodingiz: ${otp}\n\nKod 10 daqiqa ichida amal qiladi.`,
    });
    console.log("Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("Email send error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      message: error.message,
    });
    throw error;
  }
}

async function sendPasswordResetEmail(
  toEmail,
  newPassword,
  fullName = "",
  adminUsername = "Admin",
) {
  const transporter = createTransport();
  const name = fullName || "Foydalanuvchi";

  console.log(
    "Sending password reset email to:",
    toEmail,
    "| SMTP user:",
    process.env.SMTP_USER ? "SET" : "NOT SET",
    "| SMTP pass:",
    process.env.SMTP_PASS ? "SET" : "NOT SET",
  );

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family:Arial,sans-serif;background:#f5f3ef;padding:20px;">
  <div style="max-width:500px;margin:auto;background:#fff;border-radius:12px;padding:30px;">
    <h2>⚖ Mening Huquqim</h2>

    <p>Assalomu alaykum, <strong>${name}</strong>!</p>

    <p>
      Administrator <strong>@${adminUsername}</strong>
      tomonidan hisobingiz paroli yangilandi.
    </p>

    <div style="padding:20px;background:#f5f3ef;border-radius:10px;text-align:center;">
      <div style="font-size:14px;color:#666;">Yangi parolingiz:</div>

      <div style="
        font-size:28px;
        font-weight:bold;
        margin-top:10px;
        letter-spacing:3px;
      ">
        ${newPassword}
      </div>
    </div>

    <p style="margin-top:20px;">
      Tizimga kirganingizdan so'ng parolni o'zgartiring.
    </p>
  </div>
</body>
</html>`;

  try {
    const info = await Promise.race([
      transporter.sendMail({
        from: '"Mening Huquqim" <toxirovi82@gmail.com>',
        to: toEmail,
        subject: "Parolingiz o'zgartirildi — Mening Huquqim",
        html,
        text: `Yangi parol: ${newPassword}`,
      }),

      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("EMAIL_TIMEOUT")), 15000),
      ),
    ]);

    console.log("Password reset email sent:", info.messageId);

    return true;
  } catch (error) {
    console.error("Password reset email error:", {
      code: error.code,
      command: error.command,
      response: error.response,
      message: error.message,
    });

    throw error;
  }
}

module.exports = { generateOTP, sendOTPEmail, sendPasswordResetEmail };
