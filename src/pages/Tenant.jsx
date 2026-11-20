import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Store,
  Tag,
  BarChart3,
  LogOut,
} from "lucide-react";
import { Dashboard } from "../tenant-tabs/Dashboard";
import { StoreProfile } from "../tenant-tabs/StoreProfile";
import { Promotions } from "../tenant-tabs/Promotions";
import { Analytics } from "../tenant-tabs/Analytics";
import { ProfileSettings } from "../tenant-tabs/ProfileSettings";
import { Logo } from "../tenant-tabs/shared";

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
function readPage() {
  return (
    PAGE_NAMES[window.location.pathname.replace(/^\/+|\/+$/g, "")] ||
    "Dashboard"
  );
}
/* shell */
export default function Tenant({
  onLogout,
  profile,
  promotions,
  storeProfile,
  data,
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
      <Dashboard promos={promos} go={navigate} data={tenantData.dashboard} />
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
    Analytics: <Analytics profile={profile} data={tenantData.analytics} />,
    "Profile Settings": <ProfileSettings logo={logo} profile={profile} />,
  };
  return (
    <div className="tenant-portal flex min-h-screen bg-slate-50 text-gray-900">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-sky-100/70">
        <p className="border-b border-sky-200 px-6 py-5 text-xl font-semibold text-slate-800">
          Tenant Portal
        </p>
        <nav className="flex-1 space-y-1 p-4">
          {NAV.map(([n, I]) => (
            <button
              key={n}
              onClick={() => navigate(n)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                page === n
                  ? "bg-sky-200/70 font-medium text-blue-700"
                  : "text-slate-700 hover:bg-sky-200/50 hover:text-slate-900"
              }`}
            >
              <I size={20} />
              {n}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2 border-t border-sky-200 p-4">
          <div
            onClick={() => navigate("Profile Settings")}
            role="button"
            tabIndex={0}
            onKeyDown={(event) =>
              event.key === "Enter" && navigate("Profile Settings")
            }
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sky-200/50"
          >
            <Logo src={logo} size="h-10 w-10 shrink-0" />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-sm">{profile?.name}</b>
              <span className="block truncate text-xs text-slate-600">
                {profile?.subtitle}
              </span>
            </span>
          </div>
          <button
            onClick={() => onLogout?.()}
            title="Logout"
            aria-label="Logout"
            className="shrink-0 rounded-lg p-2.5 text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">{views[page]}</main>
    </div>
  );
}