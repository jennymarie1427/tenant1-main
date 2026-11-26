import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Store,
  Tag,
  BarChart3,
  LogOut,
  MapPin,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Dashboard } from "../tenant-tabs/Dashboard";
import { StoreProfile } from "../tenant-tabs/StoreProfile";
import { Promotions } from "../tenant-tabs/Promotions";
import { Analytics } from "../tenant-tabs/Analytics";
import { ProfileSettings } from "../tenant-tabs/ProfileSettings";
import { Logo } from "../tenant-tabs/shared";
import { OfflineModeBanner } from "../components/common/ConnectionStatus";
import { readTheme, saveTheme } from "../lib/theme";

const NAV = [
  ["Dashboard", LayoutDashboard],
  ["Store Profile", Store],
  ["Promotions", Tag],
  ["Analytics", BarChart3],
];
const PAGE_SLUGS = {
  Dashboard: "dashboard",
  "Store Profile": "store-profile",
  Promotions: "promotions",
  Analytics: "analytics",
  "Profile Settings": "profile-settings",
};
const PAGE_NAMES = Object.fromEntries(
  Object.entries(PAGE_SLUGS).map(([name, slug]) => [slug, name]),
);
// Current page from URL
function readPage() {
  return (
    PAGE_NAMES[window.location.pathname.replace(/^\/+|\/+$/g, "")] ||
    "Dashboard"
  );
}

// Tenant portal layout
export default function Tenant({
  onLogout,
  profile,
  promotions,
  storeProfile,
  data,
  offlineSavedAt,
}) {
  const tenantData = data || {
    dashboard: {
      stats: [],
      visits: { data: [], max: 0, ticks: [], labels: [] },
    },
    profile: {
      days: [],
      categories: {},
      paymentOptions: [],
      initialPayments: [],
      openFrom: "",
      openTo: "",
      floor: "",
      unit: "",
    },
    analytics: {
      stats: [],
      pLabels: [],
      age: [],
      gender: [],
      perf: [],
      rangeOptions: [],
      visits: { data: [], max: 0, ticks: [], labels: [] },
      peak: { data: [], max: 0, ticks: [] },
      performance: { max: 0, ticks: [] },
    },
  };
  const [page, setPage] = useState(readPage);
  const [logo, setLogo] = useState(profile?.logo || "/uniqlo-logo.svg");
  const [promos, setPromos] = useState(promotions);
  // Sidebar collapse
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("tenant-sidebar-collapsed") === "1",
  );
  const toggleSidebar = () =>
    setCollapsed((c) => {
      localStorage.setItem("tenant-sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  // Dark mode
  const [theme, setTheme] = useState(readTheme);
  const dark = theme === "dark";
  const toggleTheme = () => {
    const next = dark ? "light" : "dark";
    saveTheme(next);
    setTheme(next);
  };
  const navigate = (nextPage) => {
    setPage(nextPage);
    window.history.pushState({}, "", `/${PAGE_SLUGS[nextPage]}`);
  };

  useEffect(() => {
    const onPopState = () => setPage(readPage());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const views = {
    Dashboard: (
      <Dashboard
        promos={promos}
        go={navigate}
        data={tenantData.dashboard}
        storeId={profile?.store_id}
      />
    ),
    "Store Profile": (
      <StoreProfile
        logo={logo}
        setLogo={setLogo}
        profile={profile}
        data={tenantData.profile}
        storeProfile={storeProfile}
      />
    ),
    Promotions: (
      <Promotions
        promos={promos}
        setPromos={setPromos}
        storeId={profile?.store_id}
      />
    ),
    Analytics: (
      <Analytics
        profile={profile}
        data={tenantData.analytics}
        storeId={profile?.store_id}
      />
    ),
    "Profile Settings": <ProfileSettings logo={logo} profile={profile} />,
  };
  return (
    <div
      className={`tenant-portal flex min-h-screen bg-slate-50 text-gray-900 ${dark ? "theme-dark" : ""}`}
    >
      {/* Sidebar */}
      <aside
        className={`tenant-sidebar sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div
          className={`flex h-[73px] items-center gap-2 border-b border-slate-200 ${
            collapsed ? "justify-center px-3" : "pl-6 pr-3"
          }`}
        >
          {!collapsed && (
            <p className="min-w-0 flex-1 truncate text-xl font-semibold text-slate-800">
              Tenant Portal
            </p>
          )}
          {/* Collapse toggle */}
          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>
        {/* Nav */}
        <nav className={`flex flex-1 flex-col gap-1 ${collapsed ? "p-3" : "p-4"}`}>
          {NAV.map(([n, I]) => (
            <button
              key={n}
              onClick={() => navigate(n)}
              title={collapsed ? n : undefined}
              aria-label={n}
              aria-current={page === n ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-lg py-3 transition-colors ${
                collapsed ? "justify-center px-0" : "px-4"
              } ${
                page === n
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <I size={20} className="shrink-0" />
              {!collapsed && n}
            </button>
          ))}
          {/* Dark mode switch */}
          <button
            type="button"
            role="switch"
            aria-checked={dark}
            aria-label="Dark mode"
            onClick={toggleTheme}
            title={collapsed ? `Dark mode: ${dark ? "on" : "off"}` : undefined}
            className={`mt-auto flex w-full items-center gap-3 rounded-lg py-3 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 ${
              collapsed ? "justify-center px-0" : "px-4"
            }`}
          >
            {dark ? (
              <Moon size={20} className="shrink-0" aria-hidden="true" />
            ) : (
              <Sun size={20} className="shrink-0" aria-hidden="true" />
            )}
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Dark mode</span>
                <span
                  aria-hidden="true"
                  className={`relative block h-5 w-9 shrink-0 rounded-full transition-colors ${
                    dark ? "bg-[#5094fb]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-[#fff] shadow-sm transition-all ${
                      dark ? "left-4.5" : "left-0.5"
                    }`}
                  />
                </span>
              </>
            )}
          </button>
        </nav>
        <div
          className={`flex items-center gap-2 border-t border-slate-200 ${
            collapsed ? "flex-col p-3" : "p-4"
          }`}
        >
          {/* Profile card */}
          <div
            onClick={() => navigate("Profile Settings")}
            role="button"
            tabIndex={0}
            title={collapsed ? [profile?.name, profile?.mallName || profile?.subtitle].filter(Boolean).join(" · ") : undefined}
            onKeyDown={(event) =>
              event.key === "Enter" && navigate("Profile Settings")
            }
            className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
              page === "Profile Settings" ? "bg-blue-50" : "hover:bg-slate-100"
            } ${collapsed ? "justify-center" : "flex-1"}`}
          >
            <Logo src={logo} size="h-10 w-10 shrink-0" />
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">{profile?.name}</b>
                <span
                  className="flex items-center gap-1 text-xs text-slate-500"
                  title={profile?.mallName || profile?.subtitle}
                >
                  {profile?.mallName && (
                    <MapPin size={12} className="shrink-0 text-blue-600" />
                  )}
                  <span className="truncate">
                    {profile?.mallName || profile?.subtitle}
                  </span>
                </span>
              </span>
            )}
          </div>
          {/* Logout */}
          <button
            onClick={() => onLogout?.()}
            title="Logout"
            aria-label="Logout"
            className="shrink-0 rounded-lg p-2.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">
        {offlineSavedAt && <OfflineModeBanner savedAt={offlineSavedAt} />}
        {views[page]}
      </main>
    </div>
  );
}