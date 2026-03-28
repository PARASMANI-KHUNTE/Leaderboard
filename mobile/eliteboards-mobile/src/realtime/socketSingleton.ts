import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config/env';

let socket: Socket | null = null;
let authToken: string | null = null;

export function setSocketAuthToken(token: string | null) {
  authToken = token;
  if (socket) {
    socket.auth = authToken ? { token: authToken } : {};
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
