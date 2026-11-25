import { supabase } from "./supabase";
import { readData } from "./api";

// Map promotion row to app shape
function promotionFromRow(promotion) {
  return {
    id: promotion.promotion_id,
    title: promotion.promotion_title,
    desc: promotion.promotion_description,
    start: promotion.promotion_start_date,
    end: promotion.promotion_end_date,
    image: promotion.promotion_image_base64
      ? `data:image/png;base64,${promotion.promotion_image_base64}`
      : null,
    emailed: Number(promotion.promotion_emailed) || 0,
    opened: Number(promotion.promotion_opened) || 0,
    emailVisits: Number(promotion.promotion_email_visits) || 0,
    active: promotion.promotion_status === "active",
  };
}

// Load store promotions
export async function loadPromotions(storeId) {
  if (!supabase || !storeId) throw new Error("Promotions are not available.");
  const { data, error } = await supabase.rpc("get_my_promotions", {
    p_store: storeId,
  });
  if (error) throw error;
  return (data || []).map(promotionFromRow);
}

// Load store analytics
export async function loadStoreAnalytics(storeId, days = 7) {
  if (!supabase || !storeId) throw new Error("Analytics are not available.");
  const { data, error } = await supabase.rpc("get_my_store_insights", {
    p_store: storeId,
    p_days: days,
  });
  if (error) throw error;
  return data;
}

// Create promotion
export async function createPromotion(storeId, promotion) {
  const { data, error } = await supabase.rpc("create_my_promotion", {
    p_store: storeId,
    p_promotion: promotion,
  });
  if (error) throw error;
  return data;
}

// Update promotion
export async function updatePromotion(storeId, promotionId, promotion) {
  const { error } = await supabase.rpc("update_my_promotion", {
    p_store: storeId,
    p_promotion_id: promotionId,
    p_promotion: promotion,
  });
  if (error) throw error;
}

// Promotion image storage path
const IMAGE_BUCKET = "navar-images";
export const promotionImagePath = (promotionId) =>
  `promotions/${promotionId}/image`;

// Upload promotion image
export async function uploadPromotionImage(promotionId, file) {
  const path = promotionImagePath(promotionId);
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || "image/png",
      cacheControl: "3600",
    });
  if (error)
    throw new Error(`Unable to upload the promotion image: ${error.message}`);
  return path;
}

// Email promotion to mall visitors
export async function notifyPromotionVisitors(promotionId) {
  const { data, error } = await supabase.functions.invoke("notify-promotion", {
    body: { promotion_id: promotionId },
  });
  if (error) {
    const body = await error.context?.json?.().catch(() => null);
    throw new Error(body?.error || "Unable to send the promotion email.");
  }
  return data;
}

// Delete promotion and image
export async function deletePromotion(storeId, promotionId) {
  // Delete image before row
  await supabase.storage
    .from(IMAGE_BUCKET)
    .remove([promotionImagePath(promotionId)])
    .catch(() => {});
  const { error } = await supabase.rpc("delete_my_promotion", {
    p_store: storeId,
    p_promotion_id: promotionId,
  });
  if (error) throw error;
}

// Load signed-in workspace data
export async function loadAppData() {
  const [identities, tenants, stores] = await Promise.all([
    readData("app_user"),
    readData("tenant"),
    readData("store"),
  ]);
  const identity = identities[0];
  const tenant = tenants[0];
  if (!identity || !tenant)
    throw new Error("No active tenant assignment is available.");
  const store = stores.find(
    (row) => String(row.store_id) === String(tenant.store_id),
  );
  const [storeProfile, promotions] = await Promise.all([
    loadStoreProfile(tenant.store_id),
    loadPromotions(tenant.store_id),
  ]);
  const brand = storeProfile.brand || {};
  const logo = brand.brand_logo_base64
    ? `data:image/png;base64,${brand.brand_logo_base64}`
    : brand.brand_logo_path || store?.store_logo || "/store-logo.png";
  return {
    profiles: {
      tenant: {
        ...tenant,
        ...store,
        role: "tenant",
        name: store?.store_name || tenant.tenant_name,
        subtitle: "Tenant Account",
        mallName: storeProfile.mall?.mall_name || "",
        userId: identity.user_auth_user_id,
        userName: tenant.tenant_name,
        userEmail: identity.user_email,
        logo,
      },
    },
    promotions,
    storeProfile,
  };
}

// Fetch promotions
export async function fetchPromotions(storeId) {
  if (!supabase || !storeId) return null;
  const data = await readData("promotion", { storeId });
  return data.map(promotionFromRow);
}

// Load store profile
export async function loadStoreProfile(storeId) {
  if (!supabase || !storeId) throw new Error("Store profile is not available.");
  const { data, error } = await supabase.rpc("get_my_store_profile", {
    p_store: storeId,
  });
  if (error) throw error;
  return data;
}

// Save store profile
export async function saveStoreProfile(storeId, profile) {
  if (!supabase || !storeId) throw new Error("Store profile is not available.");
  const { error } = await supabase.rpc("update_my_store_profile", {
    p_store: storeId,
    p_profile: profile,
  });
  if (error) throw error;
}

// Sign in
export async function signIn(email, password) {
  if (!supabase) throw new Error("Authentication is not configured.");
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  try {
    return await getCurrentSession();
  } catch (error) {
    await supabase.auth.signOut();
    throw error;
  }
}

// Send password reset email
export async function requestPasswordReset(email) {
  if (!supabase) throw new Error("Authentication is not configured.");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password?flow=supabase&mode=recovery`,
  });
  if (error) throw error;
}

// Get current session
export async function getCurrentSession() {
  localStorage.removeItem("navar_demo_role");
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) return null;
  // Server verifies token and tenant membership
  const identities = await readData("app_user");
  if (!identities[0])
    throw new Error("No active tenant assignment is available.");
  return { role: "tenant", email: identities[0].user_email };
}

// Sign out
export async function signOut() {
  localStorage.removeItem("navar_demo_role");
  if (supabase) await supabase.auth.signOut();
}

// Update tenant profile
export async function updateTenantProfile(profile, values) {
  if (!supabase) throw new Error("Authentication is not configured.");
  const { error } = await supabase.rpc("update_my_tenant_contact", {
    p_tenant: profile.tenant_id,
    p_name: values.contactName,
    p_phone: values.contactPhone,
    p_email: values.contactEmail,
    p_account_name: values.accountName,
    p_type: values.contactPosition,
  });
  if (error)
    throw new Error(
      "Unable to save tenant contact details. Check your access and required database migrations.",
    );
  if (values.accountEmail !== profile.userEmail) {
    const { error: authError } = await supabase.auth.updateUser({
      email: values.accountEmail,
    });
    if (authError) throw authError;
  }
}

// Change password
export async function changePassword(
  email,
  currentPassword,
  newPassword,
  demo = false,
) {
  if (!supabase || demo) throw new Error("Sign in to change your password.");

  const { error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (loginError) throw new Error("The current password is incorrect.");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}