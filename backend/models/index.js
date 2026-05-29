"use strict";
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

/* ── MESSAGE ── */
const MessageSchema = new mongoose.Schema(
  {
    role:          { type: String, enum: ["user","assistant"], required: true },
    content:       { type: String, required: true },
    imageData:     { type: String, default: null },   // base64 rasm (faqat user xabarlarida)
    imageMimeType: { type: String, default: null },   // "image/jpeg" va h.k.
  },
  { _id: false, timestamps: true }
);

/* ── CHAT ── */
const ChatSchema = new mongoose.Schema(
  {
    sessionId:        { type: String, required: true, unique: true, index: true },
    userId:           { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    source:           { type: String, enum: ["web","telegram","mobile"], default: "web" },
    category:         { type: String, default: "boshqa" },
    telegramUserId:   { type: String, default: null },
    telegramUsername: { type: String, default: null },
    messages:         [MessageSchema],
  },
  { timestamps: true }
);

/* ── USER LOGIN LOG ── */
const LoginLogSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ip:        { type: String, default: "" },
    userAgent: { type: String, default: "" },
    device:    { type: String, default: "" },
    os:        { type: String, default: "" },
    browser:   { type: String, default: "" },
    source:    { type: String, enum: ["web","google","telegram","mobile"], default: "web" },
  },
  { timestamps: true }
);

/* ── USAGE LOG — kunlik limit hisoblash uchun ── */
const UsageLogSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date:      { type: String, required: true },   // "2025-05-22"
    count:     { type: Number, default: 0 },
  },
  { timestamps: true }
);
UsageLogSchema.index({ userId: 1, date: 1 }, { unique: true });

/* ── USER ── */
const UserSchema = new mongoose.Schema(
  {
    username:         { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    password:         { type: String, default: "" },
    fullName:         { type: String, trim: true, default: "" },
    email:            { type: String, trim: true, lowercase: true, sparse: true },
    emailVerified:    { type: Boolean, default: false },
    googleId:         { type: String, sparse: true },
    authProvider:     { type: String, enum: ["local","google"], default: "local" },
    otpCode:          { type: String, default: null },
    otpExpires:       { type: Date,   default: null },
    lastLogin:        { type: Date,   default: null },
    isBlocked:        { type: Boolean, default: false },
    // Limit
    dailyLimit:       { type: Number, default: 20 },   // default: 20 ta savol/kun
    // Telegram
    telegramId:               { type: String, sparse: true },
    telegramVerified:         { type: Boolean, default: false },
    telegramUsername:         { type: String, default: null },
    pendingTelegramUsername:  { type: String, default: null },
    // Push Notifications (mobile)
    pushToken:          { type: String, default: null },
    pushPlatform:       { type: String, enum: ["ios", "android", "unknown", null], default: null },
    pushTokenUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
UserSchema.methods.comparePassword = function (plain) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(plain, this.password);
};

/* ── ADMIN ── */
const AdminSchema = new mongoose.Schema(
  {
    username:  { type: String, required: true, unique: true, trim: true },
    password:  { type: String, required: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);
AdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
AdminSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

/* ── DAILY STAT ── */
const DailyStatSchema = new mongoose.Schema({
  date:              { type: String, required: true, unique: true },
  totalQuestions:    { type: Number, default: 0 },
  webQuestions:      { type: Number, default: 0 },
  telegramQuestions: { type: Number, default: 0 },
  mobileQuestions:   { type: Number, default: 0 },
  categories: {
    mehnat:     { type: Number, default: 0 },
    oila:       { type: Number, default: 0 },
    meros:      { type: Number, default: 0 },
    yer:        { type: Number, default: 0 },
    istemolchi: { type: Number, default: 0 },
    jinoiy:     { type: Number, default: 0 },
    boshqa:     { type: Number, default: 0 },
  },
});

/* ── VISITOR ── */
const VisitorSchema = new mongoose.Schema({
  ip:           { type: String, required: true, index: true },
  userAgent:    { type: String, default: "" },
  path:         { type: String, default: "/" },
  referrer:     { type: String, default: "" },
  device:       { type: String, default: "" },
  os:           { type: String, default: "" },
  browser:      { type: String, default: "" },
  country:      { type: String, default: "" },
  city:         { type: String, default: "" },
  visitCount:   { type: Number, default: 1 },
  lastVisit:    { type: Date, default: Date.now },
}, { timestamps: true });
VisitorSchema.index({ ip: 1, createdAt: -1 });

/* ── SITE CONTENT ── */
const SiteContentSchema = new mongoose.Schema({
  stats: {
    experience: { type: String, default: "10+" },
    experienceLabel: { type: String, default: "Yillik tajriba" },
    cases: { type: String, default: "500+" },
    casesLabel: { type: String, default: "Muvaffaqiyatli ishlar" },
    clients: { type: String, default: "1000+" },
    clientsLabel: { type: String, default: "Mamnun mijozlar" },
  },
  hero: {
    title: { type: String, default: "Huquqingizni biling, kelajagingizni himoya qiling" },
    subtitle: { type: String, default: "Professional huquqiy yordam — mehnat, oila, meros, yer va boshqa sohalarda. AI maslahatchi va tajribali mutaxassislar yoningizda." },
    cta: { type: String, default: "Bepul konsultatsiya" },
  },
  about: {
    title: { type: String, default: "Biz haqimizda" },
    lead: { type: String, default: "Professional huquqiy yordam beruvchi jamoa" },
    text: { type: String, default: "Bizning jamoamiz O'zbekiston huquq sohasida ko'p yillik tajribaga ega bo'lgan mutaxassislardan iborat. Biz mijozlarga mehnat, oila, meros, yer, jinoyat va istemolchi huquqlari bo'yicha professional yordam beramiz." },
  },
  contact: {
    address: { type: String, default: "Toshkent shahri, Chilonzor tumani, Bunyodkor ko'chasi 12-uy" },
    phone: { type: String, default: "+998 90 123 45 67" },
    email: { type: String, default: "info@huquq.uz" },
    hoursWeek: { type: String, default: "Dushanba — Juma: 09:00 — 18:00" },
    hoursSat: { type: String, default: "Shanba: 10:00 — 15:00" },
  },
  social: {
    telegram: { type: String, default: "https://t.me/mening_huquqlarim_bot" },
    instagram: { type: String, default: "" },
    facebook: { type: String, default: "" },
    youtube: { type: String, default: "" },
  },
}, { timestamps: true });

/* ── SUPPORT MESSAGE ── */
const SupportMessageSchema = new mongoose.Schema(
  {
    name:      { type: String, trim: true, default: "" },
    email:     { type: String, trim: true, lowercase: true, default: "" },
    message:   { type: String, required: true, trim: true },
    status:    { type: String, enum: ["pending", "resolved"], default: "pending" },
    read:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = {
  Chat:            mongoose.model("Chat",            ChatSchema),
  User:            mongoose.model("User",            UserSchema),
  Admin:           mongoose.model("Admin",           AdminSchema),
  DailyStat:       mongoose.model("DailyStat",       DailyStatSchema),
  LoginLog:        mongoose.model("LoginLog",        LoginLogSchema),
  UsageLog:        mongoose.model("UsageLog",        UsageLogSchema),
  Visitor:         mongoose.model("Visitor",         VisitorSchema),
  SiteContent:     mongoose.model("SiteContent",     SiteContentSchema),
  SupportMessage:  mongoose.model("SupportMessage", SupportMessageSchema),
};