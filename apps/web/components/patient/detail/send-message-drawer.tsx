'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, Send, MessageCircle, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { messagingApi, type Conversation, type Message } from '@/lib/api/messaging';
import { cn } from '@/lib/utils';

interface SendMessageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

export function SendMessageDrawer({ isOpen, onClose, patientId, patientName }: SendMessageDrawerProps) {
  const { t } = useTranslations('patientDetail');
  const { t: tCommon } = useTranslations('common');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get existing conversations for this patient
      const { conversations } = await messagingApi.getPatientConversations(patientId);

      if (conversations.length > 0) {
        // Use first active conversation
        const activeConv = conversations.find(c => c.status === 'ACTIVE') || conversations[0];
        setConversation(activeConv);

        // Load messages
        const { messages: convMessages } = await messagingApi.getMessages(activeConv.id, { limit: 50 });
        setMessages(convMessages.reverse());

        // Mark as read
        await messagingApi.markAsRead(activeConv.id);
      } else {
        // No existing conversation
        setConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError(t('messageLoadError') || 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [patientId, t]);

  useEffect(() => {
    if (isOpen) {
      loadConversation();
    }
  }, [isOpen, loadConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    setError(null);

    try {
      let convId = conversation?.id;

      // Create conversation if none exists
      if (!convId) {
        const newConv = await messagingApi.createConversation({
          patientId,
          subject: `Conversation with ${patientName}`,
          initialMessage: newMessage.trim(),
        });
        setConversation(newConv);
        convId = newConv.id;

        // Load messages after creating
        const { messages: convMessages } = await messagingApi.getMessages(convId, { limit: 50 });
        setMessages(convMessages.reverse());
      } else {
        // Send message to existing conversation
        const sentMessage = await messagingApi.sendMessage(convId, {
          content: newMessage.trim(),
          messageType: 'TEXT',
        });
        setMessages(prev => [...prev, sentMessage]);
      }

      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(t('messageSendError') || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    setNewMessage('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={handleClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-brand" />
            <div>
              <h2 className="text-base font-semibold">
                {t('messagePatient') || 'Message Patient'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{patientName}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" size="sm" onClick={loadConversation} className="mt-2">
                {tCommon('retry') || 'Retry'}
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('noMessages') || 'No messages yet. Start a conversation!'}
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col max-w-[80%]',
                    msg.senderRole === 'PATIENT' ? 'items-start' : 'items-end ml-auto'
                  )}
                >
                  <div
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm',
                      msg.senderRole === 'PATIENT'
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        : 'bg-brand text-white'
                    )}
                  >
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                    <span>{new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.senderRole !== 'PATIENT' && (
                      msg.isRead ? (
                        <CheckCheck className="w-3 h-3 text-blue-500" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {error && (
            <p className="text-xs text-red-500 mb-2">{error}</p>
          )}
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('typeMessage') || 'Type a message...'}
              className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              rows={2}
              disabled={isSending}
            />
            <Button
              onClick={handleSend}
              disabled={isSending || !newMessage.trim()}
              className="self-end bg-brand hover:bg-brand/90"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
