import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config/env';

let socket: Socket | null = null;
let authToken: string | null = null;

export function setSocketAuthToken(token: string | null) {
  if (authToken === token) return;
  authToken = token;
  if (socket) {
    socket.auth = authToken ? { token: authToken } : {};
    if (socket.connected) {
      socket.disconnect();
      socket.connect();
    }
  }
}

export function getSocket() {
  if (socket) return socket;

  socket = io(API_URL, {
    autoConnect: false,
    transports: ['websocket'],
    auth: authToken ? { token: authToken } : {},
  });

  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}
