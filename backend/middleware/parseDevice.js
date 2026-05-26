"use strict";

/**
 * User-Agent dan qurilma, OS va brauzer ma'lumotlarini aniqlash
 */
function parseDevice(userAgent = "") {
  const ua = userAgent.toLowerCase();

  // Device type
  let device = "Desktop";
  if (/mobile|android.*mobile|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    device = "Mobile";
  } else if (/ipad|android(?!.*mobile)|tablet/i.test(ua)) {
    device = "Tablet";
  }

  // OS
  let os = "Noma'lum";
  if (/windows nt 10/i.test(ua))       os = "Windows 10/11";
  else if (/windows nt 6/i.test(ua))   os = "Windows 7/8";
  else if (/windows/i.test(ua))        os = "Windows";
  else if (/android/i.test(ua)) {
    const m = ua.match(/android ([\d.]+)/);
    os = m ? `Android ${m[1]}` : "Android";
  } else if (/iphone os ([\d_]+)/i.test(ua)) {
    const m = ua.match(/iphone os ([\d_]+)/i);
    os = m ? `iOS ${m[1].replace(/_/g, ".")}` : "iOS";
  } else if (/ipad/i.test(ua))         os = "iPadOS";
  else if (/mac os x/i.test(ua))       os = "macOS";
  else if (/linux/i.test(ua))          os = "Linux";

  // Browser
  let browser = "Noma'lum";
  if (/edg\//i.test(ua))               browser = "Edge";
  else if (/opr\/|opera/i.test(ua))    browser = "Opera";
  else if (/firefox\//i.test(ua))      browser = "Firefox";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Browser";
  else if (/chrome\//i.test(ua))       browser = "Chrome";
  else if (/safari\//i.test(ua))       browser = "Safari";

  return { device, os, browser };
}

module.exports = parseDevice;
