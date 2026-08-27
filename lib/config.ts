const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

export const appConfig = {
  apiUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL ?? "https://algoarena-back-end.vercel.app"),
  socketUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_SOCKET_URL ?? "https://algoarena-back-end.vercel.app"),
  appUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_APP_URL ?? "https://algoarena-front-end.vercel.app"),
};
