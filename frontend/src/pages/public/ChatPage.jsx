import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Send,
  Image as ImageIcon,
  Video,
  Paperclip,
  X,
  MessageSquare,
  Building,
  User,
  Clock,
  Sprout,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatPKR } from '../../utils/currency';
import { getSocket, joinConversationRoom, leaveConversationRoom } from '../../services/socket';

const ChatPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(searchParams.get('conversationId') || null);
  const [messages, setMessages] = useState([]);
  const [activeConvMeta, setActiveConvMeta] = useState(null);

  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // 1. Fetch User Conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await api.get('/chat/conversations');
        if (res.data.success) {
          setConversations(res.data.data);
          // If no active conversation specified, default to first
          if (!activeConversationId && res.data.data.length > 0) {
            setActiveConversationId(res.data.data[0].conversation_id);
          }
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // 2. Fetch Messages and Join Socket Room when active conversation changes
  useEffect(() => {
    if (!activeConversationId) return;

    joinConversationRoom(activeConversationId);

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/chat/conversations/${activeConversationId}/messages`);
        if (res.data.success) {
          setMessages(res.data.data.messages);
          setActiveConvMeta(res.data.data.conversation);
        }
      } catch (err) {
        console.error('Error fetching messages thread:', err);
      }
    };

    fetchMessages();
    setSearchParams({ conversationId: activeConversationId });

    // Real-time message receiver without reload
    const socket = getSocket();
    const handleIncomingMessage = (newMsg) => {
      if (parseInt(newMsg.conversation_id, 10) === parseInt(activeConversationId, 10)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    socket.on('new_message', handleIncomingMessage);

    return () => {
      socket.off('new_message', handleIncomingMessage);
      leaveConversationRoom(activeConversationId);
    };
  }, [activeConversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: max 25MB
    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit.');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setFilePreview({ type: 'IMAGE', url: URL.createObjectURL(file) });
    } else if (file.type.startsWith('video/')) {
      setFilePreview({ type: 'VIDEO', url: URL.createObjectURL(file) });
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    setSending(true);
    try {
      const formData = new FormData();
      if (inputText.trim()) formData.append('text_content', inputText.trim());
      if (selectedFile) formData.append('file', selectedFile);

      const res = await api.post(`/chat/conversations/${activeConversationId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setMessages((prev) => [...prev, res.data.data]);
        setInputText('');
        handleRemoveFile();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-agro-600"></div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-full overflow-x-hidden ${isRTL ? 'font-urdu' : ''}`}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{t('chat.title', 'Direct Farmer Chat')}</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          {isRTL ? 'خریداروں اور کسانوں کے درمیان براہِ راست رابطہ۔ تصدیق، ترسیل اور معیار پر بات چیت کریں۔' : 'Communicate directly with crop cultivators. Share logistics notes and view live field dispatches.'}
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-900 text-base">{t('chat.no_conversations', 'No Conversations Active')}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isRTL ? 'آپ کسی بھی فصل کے صفحے سے خریدار یا کسان کے ساتھ بات چیت شروع کر سکتے ہیں۔' : 'You can initiate a direct inquiry from any product details page by clicking "Chat with Seller".'}
          </p>
          <Link
            to="/products"
            className="inline-block px-5 py-2.5 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            {isRTL ? 'زرعی منڈی دیکھیں' : 'Explore Agricultural Marketplace'}
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 h-[640px]">
          {/* Left: Conversations List */}
          <div className={`md:col-span-1 ${isRTL ? 'border-l' : 'border-r'} border-slate-200 flex flex-col bg-slate-50/70`}>
            <div className="p-4 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('chat.title', 'Conversations')}</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {conversations.map((conv) => {
                const isSelected = parseInt(activeConversationId) === conv.conversation_id;
                return (
                  <button
                    key={conv.conversation_id}
                    onClick={() => setActiveConversationId(conv.conversation_id)}
                    className={`w-full ${isRTL ? 'text-right' : 'text-left'} p-4 transition-colors flex items-start gap-3 ${
                      isSelected
                        ? isRTL
                          ? 'bg-white border-r-4 border-agro-600 shadow-sm'
                          : 'bg-white border-l-4 border-agro-600 shadow-sm'
                        : 'hover:bg-slate-100/80'
                    }`}
                  >
                    <img
                      src={conv.product_image || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=100&q=80'}
                      alt="Crop"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {conv.other_party_name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                          {conv.last_message_time ? new Date(conv.last_message_time).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-agro-700 font-semibold truncate mt-0.5">
                        {conv.product_title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-1">
                        {conv.last_message_type === 'IMAGE' && (isRTL ? '📷 تصویر' : '📷 Photo Attachment')}
                        {conv.last_message_type === 'VIDEO' && (isRTL ? '🎥 ویڈیو' : '🎥 Video Attachment')}
                        {conv.last_message_type === 'TEXT' && (conv.last_message || (isRTL ? 'پیغام شروع کیا' : 'Started inquiry'))}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Active Message Thread */}
          <div className="md:col-span-2 flex flex-col h-full bg-white">
            {/* Chat Thread Header */}
            {activeConvMeta && (
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <img
                    src={activeConvMeta.product_image || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=100&q=80'}
                    alt="Product"
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {user.role === 'SELLER' ? activeConvMeta.buyer_name : activeConvMeta.farm_name}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Product: <strong className="text-agro-700">{activeConvMeta.product_title}</strong> ({formatPKR(activeConvMeta.product_price)} / {activeConvMeta.product_unit})
                    </p>
                  </div>
                </div>

                <Link
                  to={`/products/${activeConvMeta.product_id}`}
                  className="text-xs font-semibold text-agro-600 hover:text-agro-700 underline"
                >
                  {isRTL ? 'فصل کی تفصیلات دیکھیں' : 'View Listing'}
                </Link>
              </div>
            )}

            {/* Message Bubbles Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/30">
              {messages.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10px] font-bold text-slate-400">
                        {isMine ? (isRTL ? 'آپ' : 'You') : msg.sender_name}
                      </span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`max-w-sm sm:max-w-md rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed ${
                        isMine
                          ? 'bg-agro-600 text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                      }`}
                    >
                      {/* Media Image */}
                      {msg.message_type === 'IMAGE' && msg.media_url && (
                        <div className="mb-2 rounded-xl overflow-hidden max-h-60 bg-black/10">
                          <img
                            src={msg.media_url}
                            alt="Chat Attachment"
                            className="w-full h-full object-cover cursor-pointer hover:opacity-95"
                            onClick={() => window.open(msg.media_url, '_blank')}
                          />
                        </div>
                      )}

                      {/* Media Video */}
                      {msg.message_type === 'VIDEO' && msg.media_url && (
                        <div className="mb-2 rounded-xl overflow-hidden max-h-60 bg-black">
                          <video src={msg.media_url} controls className="w-full h-full" />
                        </div>
                      )}

                      {/* Text Content */}
                      {msg.text_content && <p className="whitespace-pre-line">{msg.text_content}</p>}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input & Media Attachment Area */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-2">
              {/* File Attachment Preview */}
              {filePreview && (
                <div className="flex items-center gap-3 p-2 bg-slate-100 rounded-xl max-w-xs border border-slate-200 relative">
                  {filePreview.type === 'IMAGE' ? (
                    <img src={filePreview.url} alt="preview" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                      VID
                    </div>
                  )}
                  <div className="flex-1 truncate text-xs">
                    <p className="font-semibold text-slate-800 truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 rounded-full text-slate-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                {/* Media Attachment Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title={isRTL ? 'تصویر یا ویڈیو منسلک کریں' : 'Attach Photo or Video'}
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  placeholder={t('chat.placeholder', 'Type your message, inquiry, or delivery instructions...')}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={sending || (!inputText.trim() && !selectedFile)}
                  className="p-2.5 rounded-xl bg-agro-600 hover:bg-agro-700 disabled:bg-slate-200 text-white shadow-md transition-all flex items-center justify-center"
                  title={t('chat.send', 'Send')}
                >
                  <Send className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
