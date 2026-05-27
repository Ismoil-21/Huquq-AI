import React, { useState, useEffect } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { useLang } from "../context/LangContext";
import { useAuth } from "../context/AuthContext";
import { Globe } from "lucide-react";
import LangSwitcher from "./LangSwitcher";
import langStyles from "./LangSwitcher.module.css";
import FloatingConsultButton from "./FloatingConsultButton";
import ChatDrawer from "./ChatDrawer";
import ProfileModal from "./ProfileModal";
import s from "./SiteLayout.module.css";
import instagram from "../../public/Instagram_logo_2022.svg";
import telegram from "../../public/Telegram.png";
import adaptive from "../../assets/adaptive-icon.png"

const NAV = [
  { to: "/", end: true, key: "nav_home" },
  { to: "/about", end: false, key: "nav_about_us" },
  { to: "/services", end: false, key: "nav_services" },
  { to: "/articles", end: false, key: "nav_articles" },
  { to: "/contact", end: false, key: "nav_contact" },
];

export default function SiteLayout() {
  const { t } = useLang();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [siteContent, setSiteContent] = useState(null);

  useEffect(() => {
    const fetchSiteContent = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/site/content`);
        const data = await response.json();
        setSiteContent(data);
      } catch (error) {
        console.error("Error fetching site content:", error);
      }
    };

    fetchSiteContent();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Use backend content if available, otherwise fallback to hardcoded values
  const telegramLink = siteContent?.social?.telegram || "https://t.me/mening_huquqlarim_bot";
  const instagramLink = siteContent?.social?.instagram || "https://www.instagram.com/tox1roff_18/";
  const email = siteContent?.contact?.email || "info@huquq.uz";

  return (
    <div className={s.layout}>
      <nav className={s.nav}>
        <div className={s.navInner}>
          <Link to="/" className={s.logo} onClick={() => setMenuOpen(false)}>
            <span>
              <img width={70} style={{paddingTop: "10px", borderRadius: "50%"}} src={adaptive} alt="" />
            </span>
            <span className={s.logoText}>{t.nav_logo}</span>
          </Link>

          <div className={s.navCenter}>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? `${s.navLink} ${s.navLinkActive}` : s.navLink
                }
              >
                {t[item.key]}
              </NavLink>
            ))}
          </div>

          <div className={s.navRight}>
            <div className={s.langDesktop}>
              <LangSwitcher dark />
            </div>
            {user ? (
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.4rem 0.85rem", borderRadius: "20px",
                  background: "rgba(201,149,58,0.18)", color: "#fff",
                  fontSize: "0.85rem", fontWeight: 600,
                  border: "1.5px solid rgba(201,149,58,0.4)",
                  cursor: "pointer", transition: "all 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(201,149,58,0.3)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(201,149,58,0.18)"}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "var(--gold,#c9953a)", color: "var(--navy,#1a1a2e)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 700,
                }}>
                  {user.username?.[0]?.toUpperCase() || "?"}
                </span>
                <span className={s.profileName}>{user.username}</span>
              </button>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link
                  to="/login"
                  style={{
                    padding: "0.4rem 0.85rem", borderRadius: "20px",
                    border: "1.5px solid rgba(255,255,255,0.4)", color: "#fff",
                    fontSize: "0.85rem", fontWeight: 600, textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                >
                  {t.nav_login || "Kirish"}
                </Link>
                <Link
                  to="/register"
                  style={{
                    padding: "0.4rem 0.85rem", borderRadius: "20px",
                    background: "var(--gold,#c9953a)", color: "var(--navy,#1a1a2e)",
                    fontSize: "0.85rem", fontWeight: 700, textDecoration: "none",
                    transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {t.nav_register || "Ro'yxatdan o'tish"}
                </Link>
              </div>
            )}
            <button
              type="button"
              className={`${s.menuBtn} ${menuOpen ? s.menuBtnOpen : ""}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <>
          <div className={s.menuOverlay} onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className={s.mobileMenu}>
            <div className={s.mobileMenuHead}>
              <span>⚖ {t.nav_logo}</span>
              <button type="button" className={s.mobileClose} onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  isActive ? `${s.mobileLink} ${s.mobileLinkActive}` : s.mobileLink
                }
              >
                {t[item.key]}
              </NavLink>
            ))}
            {/* Mobile profile/auth links */}
            {user ? (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setProfileOpen(true); }}
                className={s.mobileLink}
                style={{
                  background: "none", border: "none", textAlign: "left",
                  cursor: "pointer", width: "100%", color: "var(--gold-light, #e8c97a)",
                  fontWeight: 600,
                }}
              >
                👤 {user.username}
              </button>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className={s.mobileLink}>
                  {t.nav_login || "Kirish"}
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className={`${s.mobileLink} ${s.mobileLinkActive}`}>
                  {t.nav_register || "Ro'yxatdan o'tish"}
                </Link>
              </>
            )}
            <div className={s.mobileLang}>
              <LangSwitcher dark dropUp className={langStyles.fullWidth} />
            </div>
          </div>
        </>
      )}

      <main className={s.main}>
        <Outlet />
      </main>

      <FloatingConsultButton />
      <ChatDrawer />

      {/* Profile Modal */}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <Link to="/" className={s.footerLogo}>
            <span className={s.logoShield}>⚖</span>
            <span>{t.nav_logo}</span>
          </Link>
          <span className={s.footerCopy}>{t.footer_copyright}</span>
          <div className={s.footerSocial}>
            <a href={telegramLink} target="_blank" rel="noreferrer" aria-label="Telegram">
              <img width={20} src={telegram} alt="" />
            </a>
            {instagramLink && (
              <a href={instagramLink} target="_blank" rel="noreferrer" aria-label="Instagram">
                <img width={20} src={instagram} alt="" />
              </a>
            )}
            <a href={`mailto:${email}`} aria-label="Email"><Globe size={20} /></a>
          </div>
        </div>
        <p className={s.footerWarn}>{t.footer_warn}</p>
      </footer>
    </div>
  );
}
