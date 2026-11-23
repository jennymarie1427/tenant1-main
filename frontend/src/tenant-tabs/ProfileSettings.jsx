import { useState } from "react";
import { Save } from "lucide-react";
import {
  Card,
  Btn,
  Field,
  PasswordField,
  Logo,
  Head,
  AlertModal,
} from "./shared";
import { changePassword, updateTenantProfile } from "../lib/appData";

export function ProfileSettings({ logo, profile }) {
  const [form, setForm] = useState(() => ({
    accountName: profile?.userName || "",
    accountEmail: profile?.userEmail || profile?.tenant_email || "",
    accountPhone: profile?.tenant_contact_num || "",
    contactName: profile?.tenant_contact_person || "",
    contactPosition: profile?.tenant_type || "",
    contactEmail: profile?.tenant_email || "",
    contactPhone: profile?.tenant_contact_num || "",
  }));
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const setField = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const setPhone = (value) =>
    setForm((current) => ({
      ...current,
      accountPhone: value,
      contactPhone: value,
    }));
  const setPassword = (field, value) =>
    setPasswords((current) => ({ ...current, [field]: value }));

  const saveProfile = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await updateTenantProfile(profile, form);
      setMessage("Profile changes saved.");
    } catch (saveError) {
      setError(saveError.message || "Unable to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!passwords.current || !passwords.next)
      return setError("Enter your current and new password.");
    if (passwords.next !== passwords.confirm)
      return setError("New password and confirmation do not match.");
    if (passwords.next.length < 6)
      return setError("New password must be at least 6 characters.");
    setSavingPassword(true);
    setMessage("");
    setError("");
    try {
      await changePassword(
        profile?.userEmail,
        passwords.current,
        passwords.next,
        profile?.demo,
      );
      setPasswords({ current: "", next: "", confirm: "" });
      setMessage("Password changed successfully.");
    } catch (passwordError) {
      setError(passwordError.message || "Unable to change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <Head title="Profile Settings" />
      <AlertModal
        message={error || message}
        variant={error ? "error" : "success"}
        onClose={() => {
          setError("");
          setMessage("");
        }}
      />
      <Card className="mb-6 flex items-center gap-6 p-6">
        <Logo src={logo} />
        <div className="flex-1">
          <p className="text-2xl">
            {profile?.store_name || profile?.tenant_name || profile?.name}
          </p>
          <p className="mt-2 text-gray-500">{profile?.subtitle}</p>
        </div>
      </Card>
      <Card className="mb-6 p-6">
        <h3 className="mb-6 text-2xl">Account Information</h3>
        <Field
          label="Account Name"
          value={form.accountName}
          onChange={(e) => setField("accountName", e.target.value)}
          className="mb-5"
        />
        <div className="mb-5 grid grid-cols-2 gap-4">
          <Field
            label="Account Email"
            value={form.accountEmail}
            onChange={(e) => setField("accountEmail", e.target.value)}
          />
          <Field
            label="Account Phone"
            value={form.accountPhone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Btn onClick={saveProfile}>
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </Btn>
        </div>
      </Card>
      <Card className="mb-6 p-6">
        <h3 className="mb-6 text-2xl">Contact Person</h3>
        <div className="mb-5 grid grid-cols-2 gap-4">
          <Field
            label="Full Name"
            value={form.contactName}
            onChange={(e) => setField("contactName", e.target.value)}
          />
          <Field
            label="Position"
            value={form.contactPosition}
            onChange={(e) => setField("contactPosition", e.target.value)}
          />
        </div>
        <div className="mb-5 grid grid-cols-2 gap-4">
          <Field
            label="Email"
            value={form.contactEmail}
            onChange={(e) => setField("contactEmail", e.target.value)}
          />
          <Field
            label="Phone"
            value={form.contactPhone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Btn onClick={saveProfile}>
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </Btn>
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="mb-6 text-2xl">Change Password</h3>
        <PasswordField
          label="Current Password"
          value={passwords.current}
          onChange={(e) => setPassword("current", e.target.value)}
          autoComplete="current-password"
        />
        <PasswordField
          label="New Password"
          value={passwords.next}
          onChange={(e) => setPassword("next", e.target.value)}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm Password"
          value={passwords.confirm}
          onChange={(e) => setPassword("confirm", e.target.value)}
          autoComplete="new-password"
        />
        <div className="flex justify-end">
          <Btn onClick={savePassword}>
            <Save size={16} />
            {savingPassword ? "Changing..." : "Change Password"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
