import { apiRequest } from "./client";
import type { CurrentUser } from "@/types/api";

export const getCurrentUser = () => apiRequest<CurrentUser>("/api/auth/me");

export const logout = () => apiRequest<null>("/api/auth/logout", { method: "POST" });

// name and/or avatar — at least one must be set, enforced server-side.
// A FormData body always goes multipart (see client.ts), which is fine even
// when there's no file: the backend's avatarUpload middleware only engages
// once it actually sees a file field, and a plain text field on a
// multipart request parses the same as it would in JSON.
export const updateProfile = (input: { name?: string; avatarFile?: File | null }) => {
  const form = new FormData();
  if (input.name !== undefined) form.set("name", input.name);
  if (input.avatarFile) form.set("avatar", input.avatarFile);
  return apiRequest<CurrentUser>("/api/auth/me", { method: "PATCH", body: form });
};

export const changePassword = (input: { currentPassword: string; newPassword: string }) =>
  apiRequest<null>("/api/auth/change-password", { method: "POST", body: input });
