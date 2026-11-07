import { io } from 'socket.io-client';
import API_URL from '../config';

let socket = null;

export function getSocket() {
  if (socket) return socket;

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  socket = io(API_URL, {
    withCredentials: true,
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function updateSocketAuth(token) {
  if (socket) {
    socket.auth = token ? { token } : {};
    if (socket.connected) {
      socket.disconnect().connect();
    }
  }
}
