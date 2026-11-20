import { useEffect, useState } from "react";
import { Plus, Trash2, Upload, Save } from "lucide-react";
import {
  Card,
  Btn,
  Field,
  Toggle,
  Logo,
  LogoButton,
  SectionHeading,
  Chip,
  ChipPicker,
  Head,
  NoteTypeSelect,
  AlertModal,
} from "./shared";
import {
  STORE_PROFILE_DAYS,
  STORE_PROFILE_NOTE_TYPES,
  EMPTY_CATEGORIES,
  logoSource,
} from "./utils";
import { saveStoreProfile } from "../lib/appData";

export function StoreProfile({ logo, setLogo, profile, data, storeProfile }) {
  const days = data.days?.length ? data.days : STORE_PROFILE_DAYS;
  const categories = data.categories || EMPTY_CATEGORIES;
  const paymentOptions = data.paymentOptions || [];
  const initialPayments = data.initialPayments || [];
  const initialFacilities = data.initialFacilities || [];
  const initialNotes = data.initialNotes || [];
  const noteTypes =
    data.noteTypes && Object.keys(data.noteTypes).length
      ? data.noteTypes
      : STORE_PROFILE_NOTE_TYPES;
  // operating hours
  const [openDays, setOpenDays] = useState(days.slice(0, 6));
  const [from, setFrom] = useState(data.openFrom || "");
  const [to, setTo] = useState(data.openTo || "");
  const [custom, setCustom] = useState(false);
  const [perDay, setPerDay] = useState({});
  // additional info
  const [category, setCategory] = useState(Object.keys(categories)[0] || "");
  const [payOptions, setPayOptions] = useState(paymentOptions);
  const [pay, setPay] = useState(initialPayments);
  const [facOptions, setFacOptions] = useState(
    categories[Object.keys(categories)[0]] || [],
  );
  const [fac, setFac] = useState(initialFacilities);
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState("warn");
  const [noteTypeOpen, setNoteTypeOpen] = useState(false);
  const [amenityTypes, setAmenityTypes] = useState({});
  const [storeName, setStoreName] = useState(
    profile?.store_name || profile?.tenant_name || profile?.name || "",
  );
  const [description, setDescription] = useState(
    profile?.store_description || "",
  );
  const [hasCr, setHasCr] = useState(Boolean(profile?.store_has_cr));
  const [floor, setFloor] = useState(data.floor || "");
  const [unit, setUnit] = useState(data.unit || "");
  const [logoPath, setLogoPath] = useState(profile?.logo || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // The parent's logo state can't be set during render, so sync it here.
  useEffect(() => {
    if (!storeProfile) return;
    const loadedLogo = logoSource(storeProfile.brand, profile.logo || "");
    setLogo(loadedLogo);
  }, [profile?.logo, storeProfile, setLogo]);

  // Fill the form from the loaded store record whenever a new record arrives.
  // Done during render rather than in an effect, as React recommends:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [appliedProfile, setAppliedProfile] = useState(null);
  if (storeProfile && storeProfile !== appliedProfile) {
    setAppliedProfile(storeProfile);
    const result = storeProfile;
    const brand = result.brand || {};
    const store = result.store || {};
    const hours = result.operating_hours || [];
    const methods = result.payment_methods || [];
    const amenities = result.amenities || [];
    const nextHours = hours.find((h) => !h.opthrs_is_closed) || {};
    const nextOpenDays = days.filter((day) => {
      const row = hours.find((h) => h.opthrs_day_of_week === day);
      return row ? !row.opthrs_is_closed : false;
    });
    setStoreName(store.store_name || "");
    setDescription(store.store_description || brand.brand_description || "");
    setHasCr(Boolean(store.store_has_cr));
    setCategory(brand.brand_category || Object.keys(categories)[0] || "");
    setLogoPath(logoSource(brand, profile.logo || ""));
    setFloor(
      result.floor?.floor_label ||
        result.floor?.floor_num?.toString() ||
        result.unit?.floor_id?.toString() ||
        "",
    );
    setUnit(result.unit?.unit_label || "");
    setOpenDays(nextOpenDays.length ? nextOpenDays : days.slice(0, 6));
    setFrom(nextHours.opthrs_open_time?.slice(0, 5) || "");
    setTo(nextHours.opthrs_close_time?.slice(0, 5) || "");
    setPerDay(
      Object.fromEntries(
        hours.map((hour) => [
          hour.opthrs_day_of_week,
          {
            from: hour.opthrs_open_time?.slice(0, 5) || "",
            to: hour.opthrs_close_time?.slice(0, 5) || "",
          },
        ]),
      ),
    );
    setCustom(
      hours.some((hour) => {
        const open = hour.opthrs_open_time?.slice(0, 5) || "";
        const close = hour.opthrs_close_time?.slice(0, 5) || "";
        return (
          !hour.opthrs_is_closed &&
          (open !== nextHours.opthrs_open_time?.slice(0, 5) ||
            close !== nextHours.opthrs_close_time?.slice(0, 5))
        );
      }),
    );
    setPayOptions([
      ...new Set(methods.map((method) => method.store_pm_name).filter(Boolean)),
    ]);
    setPay(methods.map((method) => method.store_pm_name).filter(Boolean));
    const amenityRows = amenities.filter(
      (item) => item.store_amenity_type !== "note",
    );
    const amenityNames = [
      ...new Set(
        amenityRows.map((item) => item.store_amenity_name).filter(Boolean),
      ),
    ];
    setAmenityTypes(
      Object.fromEntries(
        amenityRows.map((item) => [
          item.store_amenity_name,
          item.store_amenity_type,
        ]),
      ),
    );
    setFacOptions(amenityNames);
    setFac(amenityNames);
    setNotes(
      amenities
        .filter((item) => item.store_amenity_type === "note")
        .map((item) => [
          item.store_amenity_note_type || "warn",
          item.store_amenity_name,
        ]),
    );
  }

  const flip = (list, set, v) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const chosen = days.filter((d) => openDays.includes(d));
  const closed = days.filter((d) => !openDays.includes(d));
  const setOverride = (d, k, v) =>
    setPerDay({ ...perDay, [d]: { from, to, ...perDay[d], [k]: v } });
  const addNote = () => {
    if (draft.trim()) {
      setNotes([...notes, [kind, draft.trim()]]);
      setDraft("");
    }
  };
  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const operatingHours = days.map((day) => {
        const customHours = { from, to, ...perDay[day] };
        return {
          day,
          open_time: openDays.includes(day) ? customHours.from : "",
          close_time: openDays.includes(day) ? customHours.to : "",
          is_closed: !openDays.includes(day),
        };
      });
      await saveStoreProfile(profile.store_id, {
        store_name: storeName,
        store_description: description,
        store_has_cr: hasCr,
        unit_label: unit,
        brand_category: category,
        brand_logo_path: logoPath.startsWith("data:") ? "" : logoPath,
        brand_logo_data_url: logoPath.startsWith("data:image/") ? logoPath : "",
        operating_hours: operatingHours,
        payment_methods: pay.map((name) => ({ name })),
        amenities: [
          ...fac
            .filter((name) => name.trim())
            .map((name) => ({ type: amenityTypes[name] || "facility", name })),
          ...notes
            .filter(([, text]) => text.trim())
            .map(([noteType, name]) => ({
              type: "note",
              name,
              note_type: noteType,
            })),
        ],
      });
      setMessage("Store profile changes saved.");
    } catch (saveError) {
      setError(saveError.message || "Unable to save store profile.");
    } finally {
      setSaving(false);
    }
  };
  const timeBox = "rounded-md border border-gray-200 bg-white px-3 py-2";

  return (
    <div>
      <Head
        title="Store Profile"
        sub="Manage your store information and settings"
      />
      <AlertModal
        message={error || message}
        variant={error ? "error" : "success"}
        onClose={() => {
          setError("");
          setMessage("");
        }}
      />
      <Card className="p-6">
        <p className="mb-3 font-medium">Store Logo</p>
        <div className="flex items-center gap-6">
          <Logo src={logo} />
          <LogoButton
            setLogo={setLogo}
            onFile={(file) => {
              const reader = new FileReader();
              reader.onload = () => setLogoPath(String(reader.result || ""));
              reader.readAsDataURL(file);
            }}
          >
            <Upload size={16} />
            Upload New Logo
          </LogoButton>
        </div>

        <SectionHeading>Basic Information</SectionHeading>
        <Field
          label="Store Name"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          className="mb-4"
        />
        <label className="mb-4 block">
          <span className="mb-2 block font-medium">Description</span>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-blue-400"
          />
        </label>
        <label className="block">
          <span className="mb-2 block font-medium">Category</span>
          <input
            value={category}
            readOnly
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-600"
          />
        </label>

        <SectionHeading>Location</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Floor" value={floor} readOnly />
          <Field label="Unit Number" value={unit} readOnly />
        </div>

        <SectionHeading>Contact Information</SectionHeading>
        <Field
          label="Phone"
          defaultValue={
            profile?.store_contact_num || profile?.tenant_contact_num
          }
          className="mb-4"
        />
        <Field
          label="Email"
          defaultValue={
            profile?.store_email || profile?.tenant_email || profile?.userEmail
          }
          className="mb-4"
        />
        <SectionHeading>Operating Hours</SectionHeading>
        <p className="mb-2 text-sm font-medium">1. Which days are you open?</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {days.map((d) => (
            <Chip
              key={d}
              on={openDays.includes(d)}
              onClick={() => flip(openDays, setOpenDays, d)}
            >
              {d.slice(0, 3)}
            </Chip>
          ))}
        </div>
        <p className="mb-2 text-sm font-medium">
          2. What time do you open and close?
        </p>
        {chosen.length === 0 ? (
          <p className="text-sm text-gray-400">
            Pick at least one open day first.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-gray-500">Default opens</span>
              <input
                type="time"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={timeBox}
              />
              <span className="text-gray-500">closes</span>
              <input
                type="time"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={timeBox}
              />
              <span className="text-gray-400">(used for all open days)</span>
            </div>
            <label className="mt-4 flex items-center gap-3 text-sm">
              <Toggle on={custom} onChange={setCustom} />
              Set different hours for specific days
            </label>
            {custom && (
              <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-4">
                {chosen.map((d) => {
                  const h = { from, to, ...perDay[d] };
                  return (
                    <div key={d} className="flex items-center gap-3 text-sm">
                      <span className="w-24">{d}</span>
                      <input
                        type="time"
                        value={h.from}
                        onChange={(e) => setOverride(d, "from", e.target.value)}
                        className={timeBox}
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={h.to}
                        onChange={(e) => setOverride(d, "to", e.target.value)}
                        className={timeBox}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {!custom &&
              chosen.map((d) => (
                <div key={d} className="mt-3 flex items-center gap-3 text-sm">
                  <span className="w-24">{d}</span>
                  <input
                    type="time"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setPerDay((current) => ({
                        ...current,
                        [d]: { ...current[d], from: e.target.value },
                      }));
                    }}
                    className={timeBox}
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="time"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setPerDay((current) => ({
                        ...current,
                        [d]: { ...current[d], to: e.target.value },
                      }));
                    }}
                    className={timeBox}
                  />
                </div>
              ))}
          </>
        )}
        <p className="mt-3 text-sm text-gray-500">
          {closed.length ? `Closed on ${closed.join(", ")}` : "Open every day"}
        </p>

        <SectionHeading>Payment Methods</SectionHeading>
        <p className="mb-3 text-sm text-gray-500">
          Tap all the payment options your store accepts. Use Edit list to add
          or remove options.
        </p>
        <ChipPicker
          options={payOptions}
          setOptions={setPayOptions}
          selected={pay}
          setSelected={setPay}
          placeholder="Add a payment option, like Apple Pay"
        />

        <SectionHeading>Services and Facilities</SectionHeading>
        <p className="mb-3 text-sm text-gray-500">
          These suggestions match your store category. Use Edit list to add your
          own or remove ones that don't apply.
        </p>
        <ChipPicker
          options={facOptions}
          setOptions={setFacOptions}
          selected={fac}
          setSelected={setFac}
          placeholder="Add a service, like Free alterations"
        />

        <SectionHeading>Store Facilities</SectionHeading>
        <label className="mb-5 flex items-center gap-3 text-sm">
          <Toggle on={hasCr} onChange={setHasCr} />
          <span>
            <strong className="font-medium">Comfort room available</strong>
            <span className="block text-gray-500">
              Let visitors know whether this store has a comfort room.
            </span>
          </span>
        </label>

        <SectionHeading>Other Notes for Visitors</SectionHeading>
        <p className="mb-3 text-sm text-gray-500">
          Short updates visitors can see. Example: Fitting room closed today.
        </p>
        <div className="mb-3 flex gap-3">
          <NoteTypeSelect
            value={kind}
            options={noteTypes}
            open={noteTypeOpen}
            setOpen={setNoteTypeOpen}
            onChange={setKind}
          />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNote()}
            placeholder="Type a note and press Enter or click Add..."
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-400"
          />
          <Btn type="button" onClick={addNote} className="!py-2 text-sm">
            <Plus size={14} />
            Add Note
          </Btn>
        </div>
        <div className="space-y-3">
          {notes.map(([k, text], i) => {
            const { Icon, color } = noteTypes[k] || noteTypes.warn;
            return (
              <div
                key={i}
                className="group flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-4 text-sm"
              >
                <Icon size={16} className={color} />
                <span className="flex-1">{text}</span>
                <button
                  onClick={() => setNotes(notes.filter((_, j) => j !== i))}
                  className="text-gray-400 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
          {notes.length === 0 && (
            <p className="text-sm text-gray-400">No notes yet.</p>
          )}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Btn ghost onClick={() => window.location.reload()}>
            Cancel
          </Btn>
          <Btn onClick={save} className={saving ? "opacity-60" : ""}>
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
