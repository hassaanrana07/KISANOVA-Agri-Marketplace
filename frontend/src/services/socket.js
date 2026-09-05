import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : 'http://localhost:8000'
);

let socket = null;

/**
 * Initialize and get singleton Socket.IO client instance
 */
export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      // Re-register user room if user is saved in localStorage
      try {
        const storedUser = localStorage.getItem('kisanova_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user?.id) {
            socket.emit('join_user', user.id);
          }
        }
      } catch (e) {
        // Ignore JSON parse error
      }
    });
  }

  return socket;
};

/**
 * Join specific user room for direct notifications
 */
export const joinUserRoom = (userId) => {
  const s = getSocket();
  if (s && userId) {
    s.emit('join_user', userId);
  }
};

/**
 * Join conversation thread room
 */
export const joinConversationRoom = (conversationId) => {
  const s = getSocket();
  if (s && conversationId) {
    s.emit('join_conversation', conversationId);
  }
};

/**
 * Leave conversation thread room
 */
export const leaveConversationRoom = (conversationId) => {
  const s = getSocket();
  if (s && conversationId) {
    s.emit('leave_conversation', conversationId);
  }
};

export default getSocket;
