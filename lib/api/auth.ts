import { apiRequest } from "./client";
import type { CurrentUser } from "@/types/api";

export const getCurrentUser = () => apiRequest<CurrentUser>("/api/auth/me");

export const logout = () => apiRequest<null>("/api/auth/logout", { method: "POST" });
