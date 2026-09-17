import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./auth-storage";
import { appConfig } from "./config";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  const targetUrl = appConfig.socketUrl || "http://localhost:5000";

  if (!socket) {
    const token = getAccessToken();

    socket = io(targetUrl, {
      auth: { token },
      autoConnect: true,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("⚡ [Socket.IO] Connected to backend:", socket?.id);
    });

    socket.on("connect_error", (error) => {
      console.warn("⚠️ [Socket.IO] Connection error:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 [Socket.IO] Disconnected:", reason);
    });
  }

  if (!socket.connected && socket.disconnected) {
    const token = getAccessToken();
    if (token) {
      socket.auth = { token };
    }
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
