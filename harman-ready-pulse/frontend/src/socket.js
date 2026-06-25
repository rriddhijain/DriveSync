import { io } from "socket.io-client";

// Use VITE_SOCKET_URL from environment variables in production, fallback to localhost for development
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

export const socket = io(SOCKET_URL, {
  autoConnect: true,
});