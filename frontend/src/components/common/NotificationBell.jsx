import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ShoppingBag, MessageSquare, CheckCircle, Clock, ExternalLink, X } from 'lucide-react';
import api from '../../services/api';
import { getSocket, joinUserRoom } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';

const NotificationBell = ({ theme = 'light' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);
  const dropdownRef = useRef(null);

  // 1. Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch (err) {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // 2. Setup Socket.IO listener
  useEffect(() => {
    if (!user?.id) return;

    joinUserRoom(user.id);
    const socket = getSocket();

    const handleNewOrder = (data) => {
      setUnreadCount((prev) => prev + 1);
      const newNotif = {
        id: data.notificationId || Date.now(),
        type: 'NEW_ORDER',
        title: data.title || 'New Customer Order',
        message: data.message || `Order #${data.orderNumber} placed for PKR ${data.totalAmount}`,
        link: `/seller/orders/${data.sellerOrderId}`,
        is_read: false,
        created_at: new Date().toISOString()
      };
      setNotifications((prev) => [newNotif, ...prev]);
      setToastNotification(newNotif);

      // Auto dismiss toast after 6 seconds
      setTimeout(() => {
        setToastNotification((curr) => (curr?.id === newNotif.id ? null : curr));
      }, 6000);
    };

    const handleNewChat = (data) => {
      setUnreadCount((prev) => prev + 1);
      const newNotif = {
        id: Date.now(),
        type: 'CHAT_MESSAGE',
        title: `Message from ${data.senderName}`,
        message: data.textContent,
        link: `/seller/messages?conversationId=${data.conversationId}`,
        is_read: false,
        created_at: new Date().toISOString()
      };
      setNotifications((prev) => [newNotif, ...prev]);
    };

    socket.on('new_order', handleNewOrder);
    socket.on('new_chat_notification', handleNewChat);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('new_chat_notification', handleNewChat);
    };
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all read:', e);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await api.put(`/notifications/${notif.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {
        // Continue navigation
      }
    }
    setDropdownOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`relative p-2 rounded-xl transition-colors ${
          isDark
            ? 'text-slate-300 hover:text-white hover:bg-slate-800'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white font-black text-[10px] rounded-full flex items-center justify-center animate-pulse shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Toast Notification on incoming alert */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-agro-500/50 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-2 rounded-xl bg-agro-600 text-white flex-shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-white">{toastNotification.title}</h4>
              <button
                onClick={() => setToastNotification(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">{toastNotification.message}</p>
            {toastNotification.link && (
              <button
                onClick={() => {
                  setToastNotification(null);
                  navigate(toastNotification.link);
                }}
                className="mt-2 text-[11px] font-bold text-agro-400 hover:text-agro-300 underline inline-flex items-center gap-1"
              >
                <span>View Order</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-agro-100 text-agro-800">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-agro-600 hover:text-agro-700 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 space-y-2">
                <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No notifications yet.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                    !notif.is_read ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl flex-shrink-0 ${
                      notif.type === 'NEW_ORDER'
                        ? 'bg-emerald-100 text-emerald-800'
                        : notif.type === 'CHAT_MESSAGE'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {notif.type === 'NEW_ORDER' ? (
                      <ShoppingBag className="w-4 h-4" />
                    ) : notif.type === 'CHAT_MESSAGE' ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'} truncate`}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-agro-600 flex-shrink-0"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
