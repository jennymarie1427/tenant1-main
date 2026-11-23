import { useEffect, useState } from "react";
import { LayoutDashboard, Store, Tag, BarChart3, LogOut } from "lucide-react";
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
const readPage = () =>
  PAGE_NAMES[window.location.pathname.replace(/^\/+|\/+$/g, "")] || "Dashboard";

const DEMO_TENANT_DATA = {
  dashboard: {
    stats: [
      ["Total Visits (7 days)", "2,616", "12.5% from last week"],
      ["Active Promotions", "3", null, "Running this month"],
      ["Total Interactions", "2,704", "8.3% from last week"],
    ],
    visits: {
      data: [245, 315, 290, 455, 380, 500, 435],
      max: 600,
      ticks: [0, 150, 300, 450, 600],
      labels: ["Apr 1", "Apr 2", "Apr 3", "Apr 4", "Apr 5", "Apr 6", "Apr 7"],
    },
  },
  profile: {
    days: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    paymentOptions: [
      "Cash",
      "GCash",
      "Maya",
      "Credit/Debit Card",
      "Bank Transfer",
    ],
    initialPayments: ["Cash", "GCash"],
    openFrom: "09:00",
    openTo: "21:00",
    floor: "2",
    unit: "201-205",
    categories: {
      "Fashion & Apparel": [
        "Fitting room",
        "Gift wrapping",
        "Alterations",
        "Returns and exchanges",
        "Wheelchair accessible",
        "Online order pickup",
      ],
      "Food & Beverage": [
        "Dine-in",
        "Take-out",
        "Delivery",
        "Reservations",
        "Kid-friendly",
        "Halal options",
        "Vegetarian options",
        "Free Wi-Fi",
      ],
      "Electronics & Gadgets": [
        "Warranty service",
        "Setup and installation help",
        "Trade-in",
        "Product demo",
        "Repair service",
        "Online order pickup",
      ],
      "Health & Beauty": [
        "Pharmacist on duty",
        "Walk-ins welcome",
        "Appointment recommended",
        "Product testers",
        "Senior/PWD discount",
        "Gift sets",
      ],
      "Groceries & Supermarket": [
        "Shopping carts",
        "Bagging service",
        "Home delivery",
        "Senior/PWD discount",
        "Bring-your-own-bag discount",
        "Online order pickup",
      ],
      "Services (salon, spa, repair)": [
        "Walk-ins welcome",
        "Appointment required",
        "Online booking",
        "Waiting area",
        "Free Wi-Fi",
        "Senior/PWD discount",
      ],
      Other: [
        "Restroom nearby",
        "Wheelchair accessible",
        "Free Wi-Fi",
        "Online order pickup",
        "Senior/PWD discount",
      ],
    },
  },
  analytics: {
    rangeOptions: ["Last 7 days", "Last 14 days", "Last 30 days"],
    pLabels: ["9 AM", "11 AM", "1 PM", "3 PM", "5 PM", "7 PM", "9 PM"],
    stats: [
      ["Total Visits", "8,469", "15.3% vs last period"],
      ["Avg. Daily Visits", "282", "8.7% vs last period"],
      ["Peak Hour", "5 PM", null, "312 avg visits"],
    ],
    visits: {
      data: [235, 290, 312, 278, 455, 395, 500],
      max: 600,
      ticks: [0, 150, 300, 450, 600],
      labels: [
        "Mar 25",
        "Mar 27",
        "Mar 29",
        "Mar 31",
        "Apr 2",
        "Apr 4",
        "Apr 6",
      ],
    },
    peak: {
      data: [45, 122, 188, 235, 312, 265, 95],
      max: 320,
      ticks: [0, 80, 160, 240, 320],
    },
    performance: { max: 6000, ticks: [0, 1500, 3000, 4500, 6000] },
    age: [
      ["18-24", 23, "#5094fb"],
      ["25-34", 35, "#4b5563"],
      ["35-44", 22, "#9ca3af"],
      ["45-54", 12, "#d1d5db"],
      ["55+", 8, "#e5e7eb"],
    ],
    gender: [
      ["Female", 58, "#5094fb"],
      ["Male", 38, "#6b7280"],
      ["Other", 4, "#d1d5db"],
    ],
    perf: [
      ["Spring Collection", 3245, 1245],
      ["Weekend Sale", 2134, 892],
      ["New Arrivals", 1567, 567],
      ["Winter Clearance", 4532, 1876],
    ],
  },
};

const DEMO_PROFILE = {
  demo: true,
  role: "tenant",
  name: "Uniqlo",
  store_name: "Uniqlo",
  subtitle: "Tenant Account",
  userId: "tenant",
  userName: "Uniqlo",
  userEmail: "uniqlo@email.com",
  tenant_name: "Uniqlo",
  tenant_type: "Owner",
  tenant_contact_person: "John Doe",
  tenant_contact_num: "09123456789",
  tenant_email: "uniqlo@email.com",
  tenant_status: "active",
  store_id: 4,
  store_unit_count: 1,
  store_contact_person: "John Doe",
  store_contact_num: "09123456789",
  store_email: "uniqlo@email.com",
  store_status: "active",
  store_type: "store",
  store_description:
    "Uniqlo clothing and lifestyle store at SM Seaside City Cebu.",
  logo: "/uniqlo-logo.svg",
};

const DEMO_PROMOTIONS = [
  {
    id: 1,
    title: "LifeWear Essentials Sale",
    desc: "Save up to 30% on selected everyday essentials.",
    start: "2026-10-01",
    end: "2026-10-31",
    image: null,
    views: 4280,
    clicks: 1680,
    active: true,
  },
  {
    id: 2,
    title: "Heattech Collection",
    desc: "Discover comfortable layers for cooler days.",
    start: "2026-10-05",
    end: "2026-11-15",
    image: null,
    views: 3150,
    clicks: 1125,
    active: true,
  },
  {
    id: 3,
    title: "Kids Weekend Picks",
    desc: "New arrivals for kids with family-friendly prices.",
    start: "2026-10-10",
    end: "2026-10-25",
    image: null,
    views: 2190,
    clicks: 780,
    active: true,
  },
  {
    id: 4,
    title: "End of Season Clearance",
    desc: "Final markdowns on selected seasonal pieces.",
    start: "2026-09-01",
    end: "2026-09-30",
    image: null,
    views: 5620,
    clicks: 2410,
    active: false,
  },
];

export default function TenantApp({ onLogout }) {
  const [page, setPage] = useState(readPage);
  const [logo, setLogo] = useState(DEMO_PROFILE.logo);
  const [promos, setPromos] = useState(DEMO_PROMOTIONS);
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
        data={DEMO_TENANT_DATA.dashboard}
      />
    ),
    "Store Profile": (
      <StoreProfile
        logo={logo}
        setLogo={setLogo}
        profile={DEMO_PROFILE}
        data={DEMO_TENANT_DATA.profile}
      />
    ),
    Promotions: (
      <Promotions
        promos={promos}
        setPromos={setPromos}
        storeId={DEMO_PROFILE.store_id}
      />
    ),
    Analytics: (
      <Analytics profile={DEMO_PROFILE} data={DEMO_TENANT_DATA.analytics} />
    ),
    "Profile Settings": <ProfileSettings logo={logo} profile={DEMO_PROFILE} />,
  };
  return (
    <div className="tenant-portal flex min-h-screen bg-slate-50 text-gray-900">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-sky-100/70">
        <p className="border-b border-sky-200 px-6 py-5 text-xl font-semibold text-slate-800">
          Tenant Portal
        </p>
        <nav className="flex-1 space-y-1 p-4">
          {NAV.map(([name, Icon]) => (
            <button
              key={name}
              onClick={() => navigate(name)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                page === name
                  ? "bg-sky-200/70 font-medium text-blue-700"
                  : "text-slate-700 hover:bg-sky-200/50 hover:text-slate-900"
              }`}
            >
              <Icon size={20} />
              {name}
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
              <b className="block truncate text-sm">{DEMO_PROFILE.name}</b>
              <span className="block truncate text-xs text-slate-600">
                {DEMO_PROFILE.subtitle}
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