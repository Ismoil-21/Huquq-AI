import React, { useEffect, useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Briefcase, Users, Home, FileText, ShoppingCart, Gavel, MessageSquare, User, Globe, Smartphone, LayoutDashboard } from "lucide-react";
import api from "../utils/api";
import { StatCard, Card, Loader, PageHeader } from "../components/Shared";
import s from "./Dashboard.module.css";

const CAT_LABELS = {
  mehnat: "Mehnat", oila: "Oila", meros: "Meros",
  yer: "Yer", istemolchi: "Iste'molchi", jinoiy: "Jinoyat", boshqa: "Boshqa",
};
const CAT_COLORS = ["#4f80ff","#a855f7","#f59e0b","#22c55e","#ef4444","#f97316","#8b92a5"];

const CAT_ICONS = {
  mehnat: <Briefcase size={12} />, oila: <Users size={12} />, meros: <Home size={12} />,
  yer: <FileText size={12} />, istemolchi: <ShoppingCart size={12} />,
  jinoiy: <Gavel size={12} />, boshqa: <FileText size={12} />,
};

function fmtNum(n) { return Number(n || 0).toLocaleString(); }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:8, padding:"8px 12px", fontSize:12 }}>
      <p style={{ color:"var(--text2)", marginBottom:4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState("");

  useEffect(() => {
    api.get("/admin/stats")
      .then(({ data }) => setData(data))
      .catch(() => setErr("Ma'lumot yuklanmadi"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (err)     return <div style={{ color:"var(--red)", padding:"2rem" }}>{err}</div>;

  const { overview, weekStats, categories } = data;

  const catData = Object.entries(categories)
    .filter(([k]) => k !== "_id")
    .map(([k, v]) => ({ name: CAT_LABELS[k] || k, value: Number(v) || 0 }))
    .sort((a, b) => b.value - a.value);

  const totalCat = catData.reduce((s, c) => s + c.value, 0) || 1;

  return (
    <div className={s.page}>
      <PageHeader title={<><LayoutDashboard size={20} /> Dashboard</>} />

      {/* Stat cards */}
      <div className={s.statsGrid}>
        <StatCard icon={<MessageSquare size={20} />} label="Jami suhbatlar" value={fmtNum(overview.totalChats)} color="accent" />
        <StatCard icon={<User size={20} />} label="Foydalanuvchilar" value={fmtNum(overview.totalUsers)} color="purple" />
        <StatCard icon={<MessageSquare size={20} />} label="Jami xabarlar" value={fmtNum(overview.totalMessages)} color="green" />
        <StatCard
          icon={<MessageSquare size={20} />}
          label="Bugungi savollar"
          value={fmtNum(overview.todayQuestions)}
          sub={
            <span style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
              <Globe size={12} /> {overview.todayWeb || 0} web
              <span style={{ margin:'0 4px' }}>·</span>
              <Smartphone size={12} /> {overview.todayTelegram || 0} tg
              <span style={{ margin:'0 4px' }}>·</span>
              <Smartphone size={12} /> {overview.todayMobile || 0} mobile
            </span>
          }
          color="yellow"
        />
      </div>

      {/* Source breakdown */}
      <div className={s.statsGrid} style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        <StatCard icon={<Globe size={20} />} label="Web suhbatlar" value={fmtNum(overview.webChats)} color="accent" />
        <StatCard icon={<Smartphone size={20} />} label="Telegram suhbatlar" value={fmtNum(overview.telegramChats)} color="purple" />
        <StatCard icon={<Smartphone size={20} />} label="Mobile suhbatlar" value={fmtNum(overview.mobileChats || 0)} color="green" />
      </div>

      {/* Chart */}
      <Card title="So'nggi 14 kun">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={weekStats} margin={{ top:5, right:10, left:-20, bottom:0 }}>
            <defs>
              <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gWeb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gMobile" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize:11, fill:"var(--text2)" }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize:11, fill:"var(--text2)" }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="total" name="Jami" stroke="var(--accent)" fill="url(#gTotal)" strokeWidth={2} />
            <Area type="monotone" dataKey="web"   name="Web"  stroke="#a855f7"       fill="url(#gWeb)"   strokeWidth={1.5} strokeDasharray="4 2" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className={s.twoCol}>
        {/* Category chart */}
        <Card title="Kategoriyalar">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catData} margin={{ top:5, right:5, left:-20, bottom:0 }}>
              <XAxis dataKey="name" tick={{ fontSize:10, fill:"var(--text2)" }} />
              <YAxis tick={{ fontSize:11, fill:"var(--text2)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Miqdor" radius={[4,4,0,0]}>
                {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie chart */}
        <Card title="Ulush">
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <PieChart width={160} height={160}>
              <Pie data={catData} cx={75} cy={75} innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
            <div style={{ flex:1 }}>
              {catData.slice(0,5).map((c, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, fontSize:12 }}>
                  <span style={{ width:10, height:10, borderRadius:3, background:CAT_COLORS[i], flexShrink:0 }} />
                  <span style={{ color:"var(--text2)", display:'flex', alignItems:'center', gap:4 }}>
                    {CAT_ICONS[Object.keys(CAT_LABELS)[i]]} {c.name}
                  </span>
                  <span style={{ marginLeft:"auto", color:"var(--text)", fontWeight:600 }}>
                    {((c.value / totalCat) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
