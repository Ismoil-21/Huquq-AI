import React from "react";
import s from "./Shared.module.css";

export function StatCard({ icon, label, value, sub, color = "accent" }) {
  return (
    <div className={`${s.statCard} ${s[`color_${color}`]}`}>
      <div className={s.statIcon}>{icon}</div>
      <div className={s.statVal}>{value}</div>
      <div className={s.statLabel}>{label}</div>
      {sub && <div className={s.statSub}>{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, children }) {
  return (
    <div className={s.pageHeader}>
      <h1 className={s.pageTitle}>{title}</h1>
      <div className={s.pageActions}>{children}</div>
    </div>
  );
}

export function Card({ children, title, className = "" }) {
  return (
    <div className={`${s.card} ${className}`}>
      {title && <div className={s.cardTitle}>{title}</div>}
      {children}
    </div>
  );
}

export function Badge({ type = "default", children }) {
  return <span className={`${s.badge} ${s[`badge_${type}`]}`}>{children}</span>;
}

export function Loader() {
  return (
    <div className={s.loader}>
      <div className={s.loaderSpinner} />
      <span>Yuklanmoqda...</span>
    </div>
  );
}

export function EmptyState({ icon, text = "Ma'lumot topilmadi" }) {
  return (
    <div className={s.empty}>
      <div className={s.emptyIcon}>{icon}</div>
      <p className={s.emptyText}>{text}</p>
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className={s.pagination}>
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>← Oldingi</button>
      <span>{page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)}>Keyingi →</button>
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = "Qidirish..." }) {
  return (
    <div className={s.searchWrap}>
      <span className={s.searchIcon}>🔍</span>
      <input
        className={s.searchInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && <button className={s.searchClear} onClick={() => onChange("")}>✕</button>}
    </div>
  );
}

export function Select({ value, onChange, options, placeholder }) {
  return (
    <select className={s.select} value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Btn({ children, variant = "ghost", small = false, disabled = false, onClick, title, type = "button" }) {
  return (
    <button
      type={type}
      className={`${s.btn} ${s[`btn_${variant}`]} ${small ? s.btnSm : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
