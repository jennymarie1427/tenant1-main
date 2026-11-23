import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  ArrowLeft,
  ArrowRight,
  Eye,
  Power,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { Card, Btn, Field, Toggle, PromoImg, Head, AlertModal } from "./shared";
import { formatLongDate } from "./utils";
import {
  createPromotion,
  deletePromotion,
  loadPromotions,
  updatePromotion,
  uploadPromotionImage,
  notifyPromotionVisitors,
} from "../lib/appData";

const pad = (n) => String(n).padStart(2, "0");
const toIso = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthStart = (iso) => {
  const d = iso ? new Date(`${iso}T00:00:00`) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};
const showDate = (iso) =>
  iso ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}` : "";
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function PromotionDateRangePicker({
  start: startProp,
  end: endProp,
  onChange,
}) {
  const start = (startProp || "").slice(0, 10);
  const end = (endProp || "").slice(0, 10);
  const [open, setOpen] = useState(false);
  const [activeField, setActiveField] = useState("start");
  const [month, setMonth] = useState(() => monthStart(start));
  const ref = useRef(null);
  const todayIso = toIso(new Date());

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openFor = (field) => {
    if (open && activeField === field) return setOpen(false); 
    setActiveField(field);
    setMonth(monthStart((field === "end" ? end : start) || start || end));
    setOpen(true);
  };

  const pick = (iso) => {
    if (activeField === "start") {
      if (end && iso > end) {
        onChange(iso, "");
        return setActiveField("end");
      }
      onChange(iso, end);
      if (end) return setOpen(false);
      return setActiveField("end");
    }

    // picking the end date
    if (!start) {
      onChange(iso, "");
      return;
    }
    // picking an end before the start swaps them
    onChange(iso < start ? iso : start, iso < start ? start : iso);
    setOpen(false);
  };

  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(month.getFullYear(), month.getMonth(), i - first + 1);
    return {
      iso: toIso(d),
      day: d.getDate(),
      inMonth: d.getMonth() === month.getMonth(),
    };
  });
  const hasRange = Boolean(start && end && start !== end);

  const box = (field) =>
    `flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-left text-sm shadow-sm ${
      open && activeField === field
        ? "border-blue-500 ring-1 ring-blue-500"
        : "border-gray-200"
    }`;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => openFor("start")}
          className={box("start")}
        >
          <Calendar size={16} className="shrink-0 text-gray-500" />
          <span className={start ? "" : "text-gray-400"}>
            {showDate(start) || "MM/DD/YYYY"}
          </span>
        </button>
        <span className="shrink-0 text-gray-400">to</span>
        <button
          type="button"
          onClick={() => openFor("end")}
          className={box("end")}
        >
          <Calendar size={16} className="shrink-0 text-gray-500" />
          <span className={end ? "" : "text-gray-400"}>
            {showDate(end) || "MM/DD/YYYY"}
          </span>
        </button>
      </div>

      {open && (
        <div className="absolute bottom-full left-0 z-40 mb-2 w-max max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="relative flex h-9 items-center justify-center">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
              className="absolute left-0 p-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-sm font-medium text-gray-900">
              {month.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
              className="absolute right-0 p-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-[repeat(7,2.75rem)]">
            {WEEKDAYS.map((d) => (
              <span
                key={d}
                className="flex h-10 items-center justify-center text-sm font-medium text-gray-600"
              >
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-[repeat(7,2.75rem)]">
            {cells.map(({ iso, day, inMonth }) => {
              const isStart = iso === start;
              const isEnd = iso === end;
              const marked = isStart || isEnd;
              const band = hasRange && iso > start && iso < end;
              const wrap = band
                ? "bg-gray-100"
                : hasRange && isStart
                  ? "rounded-l-lg bg-gray-100"
                  : hasRange && isEnd
                    ? "rounded-r-lg bg-gray-100"
                    : "";
              const btn = marked
                ? "rounded-lg bg-blue-600 text-white"
                : `${band ? "rounded-none hover:bg-gray-200" : "rounded-lg hover:bg-gray-100"} ${inMonth ? "text-gray-700" : "text-gray-400"}`;
              return (
                <div key={iso} className={`h-10 w-11 ${wrap}`}>
                  <button
                    type="button"
                    onClick={() => pick(iso)}
                    className={`h-10 w-11 text-sm ${btn} ${iso === todayIso ? "font-semibold" : ""}`}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PromoModal({ initial, onClose, onSave, saving = false }) {
  const [f, setF] = useState(
    initial || {
      title: "",
      desc: "",
      image: null,
      start: "",
      end: "",
      notify: false,
    },
  );
  const [zoomImage, setZoomImage] = useState(null);
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));
  const ok = f.title.trim() && f.start && f.end;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 p-4 backdrop-blur-sm">
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-2xl font-bold">
          {initial ? "Edit Promotion" : "Create New Promotion"}
        </h2>
        <Field
          label="Promotion Title *"
          placeholder="Enter promotion title"
          value={f.title}
          onChange={(e) => set("title", e.target.value)}
          className="mb-4"
        />
        <label className="mb-4 block">
          <span className="mb-2 block font-medium">Description</span>
          <textarea
            rows={3}
            placeholder="Enter promotion description"
            value={f.desc}
            onChange={(e) => set("desc", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-blue-400"
          />
        </label>
        <div className="mb-4">
          <span className="mb-2 block font-medium">Promotion Image</span>
          <div className="flex flex-col gap-3">
            {f.imageDataUrl || f.image ? (
              <>
                <button
                  type="button"
                  onClick={() => setZoomImage(f.imageDataUrl || f.image)}
                  className="w-full cursor-zoom-in rounded-lg border border-gray-200 p-1"
                >
                  <img
                    src={f.imageDataUrl || f.image}
                    alt="Promotion preview. Click to zoom."
                    className="max-h-64 w-full rounded-md object-contain"
                  />
                </button>
              </>
            ) : (
              <PromoImg src={null} size="h-16 w-16" />
            )}
            <label className="cursor-pointer self-start rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
              {f.imageDataUrl || f.image ? "Replace Image" : "Upload Image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  set("imageFile", file);
                  const reader = new FileReader();
                  reader.onload = () =>
                    set("imageDataUrl", String(reader.result || ""));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
        </div>
        <div className="mb-5">
          <span className="mb-2 block font-medium">Promotion Dates *</span>
          <PromotionDateRangePicker
            start={f.start}
            end={f.end}
            onChange={(start, end) => setF((c) => ({ ...c, start, end }))}
          />
        </div>
        {!initial && (
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div>
              <p className="font-medium">Notify Registered Users</p>
              <p className="text-sm text-gray-500">
                Email this promotion to NavAR app users who have visited your
                mall.
              </p>
            </div>
            <Toggle on={f.notify} onChange={(v) => set("notify", v)} />
          </div>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <Btn ghost onClick={onClose} className="py-2.5!">
            Cancel
          </Btn>
          <Btn
            onClick={() => ok && onSave(f)}
            className={`py-2.5! ${ok ? "" : "opacity-50"}`}
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : initial
                ? "Save Promotion"
                : "Create Promotion"}
          </Btn>
        </div>
      </div>
      {zoomImage && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 p-8"
          onClick={() => setZoomImage(null)}
        >
          <img
            src={zoomImage}
            alt="Zoomed promotion preview"
            className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

export function Promotions({ promos, setPromos, storeId }) {
  const [modal, setModal] = useState(null); // null | "new" | promo
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const stat = [
    ["Total Promotions", promos.length],
    ["Active", promos.filter((p) => p.active).length],
    ["Emails Opened", promos.reduce((s, p) => s + (p.opened || 0), 0).toLocaleString()],
    ["Visits from Email", promos.reduce((s, p) => s + (p.emailVisits || 0), 0).toLocaleString()],
  ];
  const save = async (f) => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: f.title,
        description: f.desc,
        start: f.start,
        end: f.end,
        status: f.active === false ? "inactive" : "active",
        image_data_url: f.imageDataUrl || "",
      };
      let promotionId = modal.id;
      if (modal === "new") {
        const created = await createPromotion(storeId, payload);
        promotionId = created?.promotion_id;
      } else {
        await updatePromotion(storeId, promotionId, payload);
      }
      // The Storage path uses the promotion id, so upload after the row exists,
      // then record the path. Omitting image_data_url keeps the saved bytes.
      if (f.imageFile && promotionId) {
        const imagePath = await uploadPromotionImage(promotionId, f.imageFile);
        const details = { ...payload, image_path: imagePath };
        delete details.image_data_url;
        await updatePromotion(storeId, promotionId, details);
      }
      const refreshed = await loadPromotions(storeId);
      setPromos(refreshed);
      setModal(null);

      if (modal === "new" && f.notify && promotionId) {
        try {
          const result = await notifyPromotionVisitors(promotionId);
          const mall = result?.mall_name || "your mall";
          setNotice(
            result?.queued
              ? `Promotion created. Emailing ${result.queued} ${result.queued === 1 ? "visitor" : "visitors"} of ${mall}.`
              : `Promotion created. No registered visitors of ${mall} can receive promotion emails yet, so no email was sent.`,
          );
        } catch (notifyError) {
          setError(`Promotion created, but the email wasn't sent: ${notifyError.message}`);
        }
      }
    } catch (saveError) {
      setError(saveError.message || "Unable to save promotion.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Head
        title="Promotions"
        sub="Create and manage your store promotions"
        right={
          <Btn onClick={() => setModal("new")}>
            <Plus size={18} />
            Create Promotion
          </Btn>
        }
      />
      <AlertModal
        message={error || notice}
        variant={error ? "error" : "success"}
        onClose={() => {
          setError("");
          setNotice("");
        }}
      />
      <div className="mb-6 grid grid-cols-4 gap-6">
        {stat.map(([l, v]) => (
          <Card key={l} className="p-6">
            <p className="text-gray-500">{l}</p>
            <p className="mt-1 text-4xl">{v}</p>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-sm">
            <tr>
              {[
                "Promotion",
                "Duration",
                "Emailed",
                "Opened",
                "Visits",
                "Status",
                "Actions",
              ].map((h, i) => (
                <th
                  key={h}
                  title={
                    {
                      Emailed: "Inboxes this promotion's email reached",
                      Opened: "People who opened the email (an estimate)",
                      Visits: "Recipients who navigated to your store within 7 days of the email",
                    }[h]
                  }
                  className={`px-6 py-4 font-semibold ${i === 6 ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {promos.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="max-w-sm px-6 py-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => p.image && setPreview(p.image)}
                      className={p.image ? "cursor-zoom-in" : "cursor-default"}
                    >
                      <PromoImg src={p.image} />
                    </button>
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-sm text-gray-500">{p.desc}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {formatLongDate(p.start)} -
                  <br />
                  {formatLongDate(p.end)}
                </td>
                <td className="px-6 py-4">{(p.emailed || 0).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-2">
                    <Eye size={15} className="text-gray-400" />
                    {(p.opened || 0).toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4">{(p.emailVisits || 0).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {p.active ? "active" : "inactive"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-4">
                    <button
                      title="Toggle"
                      onClick={async () => {
                        try {
                          await updatePromotion(storeId, p.id, {
                            title: p.title,
                            description: p.desc,
                            start: p.start,
                            end: p.end,
                            status: p.active ? "inactive" : "active",
                          });
                          setPromos(
                            promos.map((x) =>
                              x.id === p.id ? { ...x, active: !x.active } : x,
                            ),
                          );
                        } catch (toggleError) {
                          setError(
                            toggleError.message ||
                              "Unable to update promotion status.",
                          );
                        }
                      }}
                    >
                      <Power size={16} />
                    </button>
                    <button title="Edit" onClick={() => setModal(p)}>
                      <Pencil size={16} />
                    </button>
                    <button
                      title="Delete"
                      onClick={async () => {
                        try {
                          await deletePromotion(storeId, p.id);
                          setPromos(promos.filter((x) => x.id !== p.id));
                        } catch (deleteError) {
                          setError(
                            deleteError.message ||
                              "Unable to delete promotion.",
                          );
                        }
                      }}
                      className="text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {promos.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-gray-400"
                >
                  No promotions yet. Click Create Promotion to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      {modal && (
        <PromoModal
          initial={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={save}
          saving={saving}
        />
      )}
      {preview && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-8"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt="Promotion preview"
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
