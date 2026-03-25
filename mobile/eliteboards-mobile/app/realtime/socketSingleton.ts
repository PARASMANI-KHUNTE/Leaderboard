import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket() {
  if (socket) return socket;

  // Backend listens on a single origin; for now we reuse API_URL for sockets too.
  socket = io(API_URL, {
    autoConnect: false,
    transports: ['websocket'],
  });

  return socket;
}

