import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Store,
  Tag,
  BarChart3,
  Settings,
  ChevronDown,
  Eye,
  EyeOff,
  Plus,
  Check,
  X,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";
import { smooth, useMounted } from "./utils";

const BLUE = "bg-[#5094fb]";



/* small shared bits */
export const Card = ({ className = "", children }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white ${className}`}>
    {children}
  </div>
);

export function AlertModal({ message, variant = "error", onClose }) {
  if (!message) return null;
  return (
    <AlertModalContent message={message} variant={variant} onClose={onClose} />
  );
}

function AlertModalContent({ message, variant, onClose }) {
  const on = useMounted();
  const success = variant === "success";
  const Icon = success ? CheckCircle2 : CircleAlert;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-opacity duration-200 ${on ? "opacity-100" : "opacity-0"}`}
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className={`w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl transition-all duration-200 ${on ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        aria-describedby="alert-modal-message"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${success ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
        >
          <Icon size={30} aria-hidden="true" />
        </div>
        <h2
          id="alert-modal-title"
          className="mt-5 text-xl font-bold text-slate-900"
        >
          {success ? "Success" : "Something went wrong"}
        </h2>
        <p
          id="alert-modal-message"
          className="mt-2 wrap-break-word text-sm text-slate-600"
        >
          {message}
        </p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className={`mt-6 w-full rounded-lg px-5 py-2.5 font-medium text-white transition-colors ${success ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export const Btn = ({
  children,
  onClick,
  ghost,
  className = "",
  type = "button",
  disabled = false,
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 font-medium ${ghost ? "border border-gray-300 bg-white text-gray-900" : `${BLUE} text-white`} ${className}`}
  >
    {children}
  </button>
);

export function Field({ label, className = "", type = "text", ...rest }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block font-medium">{label}</span>
      <input
        type={type}
        {...rest}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 outline-none focus:border-blue-400"
      />
    </label>
  );
}

export function PasswordField({ label, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  const fieldName = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="relative mb-5 block">
      <span className="mb-2 block font-medium">{label}</span>
      <input
        id={fieldName}
        name={fieldName}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 pr-11 outline-none focus:border-blue-400"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute bottom-3 right-4 text-gray-400"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </label>
  );
}

export function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-[#5094fb]" : "bg-gray-300"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-4.5" : "left-0.5"}`}
      />
    </button>
  );
}

export const Logo = ({ src = "/store-logo.png", size = "h-24 w-24" }) => (
  <img
    src={src}
    alt="Store logo"
    className={`${size} shrink-0 rounded-[22%] object-cover`}
  />
);


export function LogoButton({ setLogo, onFile, children }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium">
      {children}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setLogo(URL.createObjectURL(f));
          onFile?.(f);
        }}
      />
    </label>
  );
}

const TITLE_ICONS = {
  Dashboard: LayoutDashboard,
  "Store Profile": Store,
  Promotions: Tag,
  Analytics: BarChart3,
  "Profile Settings": Settings,
};

export const Head = ({ title, sub, right }) => {
  const I = TITLE_ICONS[title];
  return (
    <div className="mb-6 flex items-start justify-between">
      <div className="flex items-start gap-4">
        {I && <I size={34} className="mt-0.5 text-[#5094fb]" />}
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {sub && <p className="mt-2 text-gray-500">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
};

export function StyledSelect({
  value,
  options = [],
  onChange,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex min-h-10.5 w-full items-center justify-between gap-3 rounded-lg border bg-white px-4 py-2 text-left text-sm text-slate-700 ${open ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"}`}
      >
        <span>{value}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-300 bg-white py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`block w-full px-4 py-2 text-left text-sm ${option === value ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50"}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const SectionHeading = ({ children }) => (
  <h3 className="mb-4 mt-8 text-xl">{children}</h3>
);

/* charts */

export function Frame({ ticks, max, labels, h = "h-64", children, legend }) {
  const safeMax = max > 0 ? max : 1;
  return (
    <div>
      <div className={`flex ${h}`}>
        <div className="relative w-12 shrink-0 text-sm text-gray-500">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-2 -translate-y-1/2"
              style={{ top: `${100 - (t / safeMax) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="relative flex-1 border-b border-l border-gray-400">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-dashed border-gray-100"
              style={{ top: `${100 - (t / safeMax) * 100}%` }}
            />
          ))}
          {children}
        </div>
      </div>
      <div className="ml-12 flex pt-2 text-sm text-gray-500">
        {labels.map((l) => (
          <span key={l} className="flex-1 text-center">
            {l}
          </span>
        ))}
      </div>
      {legend}
    </div>
  );
}


export const Tip = ({ children }) => (
  <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-3 py-1.5 text-xs text-white shadow-lg group-hover:block">
    {children}
  </span>
);

export const Bar = ({
  value,
  max,
  on,
  delay = 0,
  color = "bg-[#5094fb]",
  width = "w-4/5",
  tip,
}) => (
  <div
    className={`group relative ${width} rounded-t-md ${color} transition-[height] duration-700 ease-out`}
    style={{
      height: on && max > 0 ? `${(value / max) * 100}%` : "0%",
      transitionDelay: `${delay}ms`,
    }}
  >
    <Tip>{tip}</Tip>
  </div>
);

export function LineDots({ data, max, ticks, labels, unit = "visits" }) {
  const on = useMounted();
  if (!data?.length)
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        No data available.
      </p>
    );
  const n = data.length;
  // Each point sits at the centre of its slot, directly above its x-axis label
  // (the labels below are evenly spaced, centred flex items).
  const safeMax = max > 0 ? max : 1;
  const pts = data.map((v, i) => [((i + 0.5) / n) * 100, 100 - (v / safeMax) * 100]);
  return (
    <Frame ticks={ticks} max={max} labels={labels}>
      <div
        className="absolute inset-0 transition-[clip-path] duration-1200 ease-out"
        style={{
          clipPath: on
            ? "inset(-10% -5% -10% -5%)"
            : "inset(-10% 105% -10% -5%)",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
        >
          <path
            d={smooth(pts)}
            fill="none"
            stroke="#5094fb"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      {pts.map(([x, y], i) => (
        <span
          key={i}
          className={`group absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-opacity duration-500 ${on ? "opacity-100" : "opacity-0"}`}
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transitionDelay: `${(i / n) * 1000}ms`,
          }}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-[#5094fb] transition-transform group-hover:scale-150" />
          <Tip>
            {labels[i]}: {data[i].toLocaleString()} {unit}
          </Tip>
        </span>
      ))}
    </Frame>
  );
}

export function Pie({ slices }) {
  const on = useMounted();
  const [hover, setHover] = useState(null);
  const total = slices.reduce((s, x) => s + x[1], 0);
  if (!total)
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        No data available.
      </p>
    );
  const stops = slices
    .reduce(
      (result, [, value, color]) => {
        const start = result.total;
        const end = start + value;
        result.stops.push(
          `${color} ${(start / total) * 100}% ${(end / total) * 100}%`,
        );
        return { total: end, stops: result.stops };
      },
      { total: 0, stops: [] },
    )
    .stops.join(",");

  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2),
      dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) > r.width / 2) return setHover(null);
    const deg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    let sum = 0,
      idx = slices.length - 1;
    for (let i = 0; i < slices.length; i++) {
      sum += (slices[i][1] / total) * 360;
      if (deg < sum) {
        idx = i;
        break;
      }
    }
    setHover({ i: idx, x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="relative h-44 w-44">
        <div
          onMouseMove={move}
          onMouseLeave={() => setHover(null)}
          className="h-full w-full rounded-full transition duration-700 ease-out"
          style={{
            background: `conic-gradient(${stops})`,
            opacity: on ? 1 : 0,
            transform: on
              ? "rotate(0deg) scale(1)"
              : "rotate(-90deg) scale(0.6)",
          }}
        />
        {hover && (
          <span
            className="pointer-events-none absolute z-20 whitespace-nowrap rounded-md bg-slate-800 px-3 py-1.5 text-xs text-white shadow-lg"
            style={{ left: hover.x + 12, top: hover.y - 12 }}
          >
            {slices[hover.i][0]}: {slices[hover.i][1]}%
            {slices[hover.i][3] != null &&
              ` (${slices[hover.i][3]} ${slices[hover.i][3] === 1 ? "visitor" : "visitors"})`}
          </span>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
        {slices.map(([l, v, c, count], i) => (
          <span
            key={l}
            className={`flex items-center gap-2 ${hover?.i === i ? "font-semibold" : ""}`}
          >
            <i className="h-3 w-3 rounded-sm" style={{ background: c }} />
            {l}: {v}%
            {count != null && (
              <span className="text-gray-500">
                ({count} {count === 1 ? "visitor" : "visitors"})
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export const PromoImg = ({ src, size = "h-14 w-14" }) =>
  src ? (
    <span
      className={`block ${size} aspect-square shrink-0 overflow-hidden rounded-lg`}
    >
      <img src={src} alt="" className="block h-full w-full object-cover" />
    </span>
  ) : (
    <div
      className={`flex ${size} aspect-square shrink-0 items-center justify-center overflow-hidden rounded-lg bg-linear-to-br from-blue-100 to-sky-200 text-blue-400`}
    >
      <Tag size={20} />
    </div>
  );

/* data */
export function Chip({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${on ? "border-[#5094fb] bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:bg-slate-50"}`}
    >
      {on && <Check size={14} />}
      {children}
    </button>
  );
}

export function ChipPicker({
  options,
  setOptions,
  selected,
  setSelected,
  placeholder,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const toggle = (o) =>
    setSelected(
      selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o],
    );
  const remove = (o) => {
    setOptions(options.filter((x) => x !== o));
    setSelected(selected.filter((x) => x !== o));
  };
  const add = () => {
    const v = draft.trim();
    if (v && !options.some((o) => o.toLowerCase() === v.toLowerCase())) {
      setOptions([...options, v]);
      setSelected([...selected, v]);
    }
    setDraft("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) =>
          editing ? (
            <span
              key={o}
              className="flex items-center gap-2 rounded-full border border-dashed border-gray-300 bg-white py-2 pl-4 pr-2 text-sm text-gray-600"
            >
              {o}
              <button
                type="button"
                onClick={() => remove(o)}
                className="rounded-full p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </span>
          ) : (
            <Chip key={o} on={selected.includes(o)} onClick={() => toggle(o)}>
              {o}
            </Chip>
          ),
        )}
        {options.length === 0 && (
          <p className="text-sm text-gray-400">
            Nothing here yet. Click Edit list to add options.
          </p>
        )}
      </div>
      {editing && (
        <div className="mt-3 flex gap-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-400"
          />
          <Btn onClick={add} className="py-2! text-sm">
            <Plus size={14} />
            Add
          </Btn>
        </div>
      )}
      <button
        type="button"
        onClick={() => setEditing(!editing)}
        className="mt-3 text-sm font-medium text-blue-600"
      >
        {editing ? "Done" : "Edit list"}
      </button>
    </div>
  );
}
