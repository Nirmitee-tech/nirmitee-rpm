'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import {
  Send,
  MessageCircle,
  Check,
  CheckCheck,
  Clock,
  ChevronLeft,
  Phone,
  Video,
  MoreVertical,
  Search,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@nirmitee/ui';
import {
  messagingApi,
  type Conversation as ApiConversation,
  type Message as ApiMessage,
} from '@/lib/api/messaging';
import { useAuth } from '@/lib/auth/auth-context';

interface DisplayMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'patient' | 'provider' | 'nurse' | 'staff';
  content: string;
  timestamp: Date;
  read: boolean;
  status: 'sent' | 'delivered' | 'read';
}

interface DisplayConversation {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

export default function MyMessagesPage() {
  const { t } = useTranslations('patient.messages');
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DisplayConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<DisplayConversation | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Transform API conversation to display format
  const transformConversation = (conv: ApiConversation): DisplayConversation => {
    // Get the staff participant (non-patient)
    const staffParticipant = conv.participants.find(p => p.role !== 'PATIENT');
    const participantName = staffParticipant?.user
      ? `${staffParticipant.user.firstName} ${staffParticipant.user.lastName}`
      : conv.subject || 'Care Team';

    return {
      id: conv.id,
      participantId: staffParticipant?.userId || '',
      participantName,
      participantRole: staffParticipant?.role === 'STAFF' ? 'Care Provider' : staffParticipant?.role || 'Staff',
      lastMessage: conv.lastMessage?.content || conv.subject || '',
      lastMessageTime: conv.lastMessageAt ? new Date(conv.lastMessageAt) : new Date(conv.createdAt),
      unreadCount: conv.unreadCount || 0,
    };
  };

  // Transform API message to display format
  const transformMessage = (msg: ApiMessage, currentUserId: string): DisplayMessage => {
    const isPatient = msg.senderId === currentUserId;
    return {
      id: msg.id,
      senderId: msg.senderId,
      senderName: isPatient ? 'You' : msg.senderName,
      senderType: isPatient ? 'patient' : (msg.senderRole?.toLowerCase() as 'provider' | 'nurse' | 'staff') || 'staff',
      content: msg.content,
      timestamp: new Date(msg.sentAt),
      read: msg.isRead,
      status: msg.isRead ? 'read' : 'delivered',
    };
  };

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    setError(null);
    try {
      const response = await messagingApi.getConversations();
      const transformed = response.conversations.map(transformConversation);
      setConversations(transformed);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    setIsLoadingMessages(true);
    try {
      const response = await messagingApi.getMessages(conversationId);
      const transformed = response.messages.map(msg => transformMessage(msg, user.id));
      setMessages(transformed);

      // Mark as read
      await messagingApi.markAsRead(conversationId).catch(() => {});
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.id) return;

    const messageContent = newMessage;
    setNewMessage('');
    setIsSending(true);

    // Optimistic update
    const optimisticMsg: DisplayMessage = {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      senderName: 'You',
      senderType: 'patient',
      content: messageContent,
      timestamp: new Date(),
      read: false,
      status: 'sent',
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const response = await messagingApi.sendMessage(selectedConversation.id, {
        content: messageContent,
      });

      // Replace optimistic message with real one
      setMessages(prev =>
        prev.map(m =>
          m.id === optimisticMsg.id
            ? transformMessage(response, user.id)
            : m
        )
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setNewMessage(messageContent); // Restore message
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('justNow') || 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status: DisplayMessage['status']) => {
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-[#745EE1]" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Mobile: Show either list or conversation
  const showConversationList = !selectedConversation;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col md:flex-row bg-white dark:bg-gray-900">
      {/* Conversations List - Hidden on mobile when conversation selected */}
      <div className={cn(
        'w-full md:w-80 md:min-w-[320px] border-r border-gray-200 dark:border-gray-800 flex flex-col',
        !showConversationList && 'hidden md:flex'
      )}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('title') || 'Messages'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('subtitle') || 'Chat with your care team'}
              </p>
            </div>
            <button
              onClick={fetchConversations}
              disabled={isLoadingConversations}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <RefreshCw className={cn('w-4 h-4 text-gray-500', isLoadingConversations && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchConversations') || 'Search conversations...'}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#745EE1]/50"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-[#745EE1] animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
              <button
                onClick={fetchConversations}
                className="text-sm text-[#745EE1] hover:underline"
              >
                {t('retry') || 'Try again'}
              </button>
            </div>
          ) : conversations.length > 0 ? (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={cn(
                  'w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left border-b border-gray-100 dark:border-gray-800',
                  selectedConversation?.id === conv.id && 'bg-[#745EE1]/5 dark:bg-[#745EE1]/10'
                )}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#745EE1] to-[#8B5CF6] flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {getInitials(conv.participantName)}
                    </span>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {conv.participantName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                      {formatTime(conv.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {conv.participantRole}
                  </p>
                  <p className={cn(
                    'text-sm truncate',
                    conv.unreadCount > 0
                      ? 'text-gray-900 dark:text-white font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  )}>
                    {conv.lastMessage}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                {t('noConversations') || 'No conversations yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat View */}
      <div className={cn(
        'flex-1 flex flex-col',
        showConversationList && 'hidden md:flex'
      )}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#745EE1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-medium">
                  {getInitials(selectedConversation.participantName)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                  {selectedConversation.participantName}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedConversation.participantRole}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg hidden sm:block">
                  <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg hidden sm:block">
                  <Video className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-[#745EE1] animate-spin" />
                </div>
              ) : messages.length > 0 ? (
                <>
                  {messages.map((message, index) => {
                    const isPatient = message.senderType === 'patient';
                    const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex gap-2',
                          isPatient ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {/* Avatar for non-patient */}
                        {!isPatient && (
                          <div className={cn('w-8 h-8 flex-shrink-0', !showAvatar && 'invisible')}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#745EE1] to-[#8B5CF6] flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {getInitials(message.senderName)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div className={cn(
                          'max-w-[75%] sm:max-w-[60%]',
                          isPatient && 'order-first'
                        )}>
                          {!isPatient && showAvatar && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                              {message.senderName}
                            </p>
                          )}
                          <div className={cn(
                            'rounded-2xl px-4 py-2.5',
                            isPatient
                              ? 'bg-[#745EE1] text-white rounded-br-md'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
                          )}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                          <div className={cn(
                            'flex items-center gap-1 mt-1',
                            isPatient ? 'justify-end' : 'justify-start'
                          )}>
                            <span className="text-[10px] text-gray-400">
                              {formatMessageTime(message.timestamp)}
                            </span>
                            {isPatient && getStatusIcon(message.status)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('startConversation') || 'Start the conversation'}
                  </p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-end gap-3"
              >
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('typeMessage') || 'Type a message...'}
                    rows={1}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#745EE1]/50 resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="h-12 w-12 flex items-center justify-center rounded-xl bg-[#745EE1] text-white hover:bg-[#6350c9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty State - Desktop only */
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('selectConversation') || 'Select a conversation'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('selectConversationHint') || 'Choose a conversation from the list to start messaging'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
