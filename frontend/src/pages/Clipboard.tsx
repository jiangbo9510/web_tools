import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import { Navbar } from '../components/Navbar';
import CryptoJS from 'crypto-js';
import { Send, Copy, Check, Eye, EyeOff, Lock, Wifi, RefreshCw, AlertCircle } from 'lucide-react';

interface Message {
  content: string;
  type: 'sent' | 'received' | 'error' | 'success';
  timestamp: Date;
}

export const Clipboard = () => {
  const { t } = useTranslation();
  const [key, setKey] = useState('');
  const [keyHash, setKeyHash] = useState('');
  const [isKeySet, setIsKeySet] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const keyRef = useRef('');

  const maxMessageLength = 5000;

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.DEV ? 'localhost:8080' : window.location.host;
    return `${protocol}//${host}/api/ws`;
  }, []);

  const addMessage = useCallback((content: string, type: 'sent' | 'received' | 'error' | 'success') => {
    setMessages(prev => [...prev, {
      content,
      type,
      timestamp: new Date(),
    }]);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connectWebSocket = useCallback((hash: string, isRetry = false) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus(isRetry ? 'connecting' : 'connecting');
    const wsUrl = getWebSocketUrl();

    console.log(`[Clipboard] ${isRetry ? 'Reconnecting' : 'Connecting'} to WebSocket:`, wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log('[Clipboard] WebSocket connection timeout');
          ws.close();
          setConnectionStatus('error');
          addMessage(t('clipboard.connectionError'), 'error');
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('[Clipboard] WebSocket connected');
        setConnectionStatus('connected');
        setReconnectCount(0);
        const registerData = {
          type: 'register',
          keyHash: hash,
        };
        ws.send(JSON.stringify(registerData));
        addMessage(t('clipboard.connected'), 'success');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[Clipboard] Received:', data);

          if (data.type === 'message' && data.encryptedMessage) {
            try {
              const decryptedBytes = CryptoJS.AES.decrypt(data.encryptedMessage, keyRef.current);
              const decryptedMessage = decryptedBytes.toString(CryptoJS.enc.Utf8);

              if (decryptedMessage) {
                addMessage(decryptedMessage, 'received');
              } else {
                addMessage(t('clipboard.copyError'), 'error');
              }
            } catch (decryptError) {
              console.error('[Clipboard] Decryption failed:', decryptError);
              addMessage(t('clipboard.copyError'), 'error');
            }
          }
        } catch (error) {
          console.error('[Clipboard] Failed to parse message:', error);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        console.log('[Clipboard] WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('error');
        addMessage(t('clipboard.connectionError'), 'error');
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('[Clipboard] WebSocket error:', error);
        setConnectionStatus('error');
        addMessage(t('clipboard.connectionError'), 'error');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[Clipboard] Failed to create WebSocket:', error);
      setConnectionStatus('error');
      addMessage(t('clipboard.connectionError'), 'error');
    }
  }, [getWebSocketUrl, addMessage, isKeySet, keyHash, reconnectCount, t]);

  const handleSetKey = useCallback(() => {
    const trimmedKey = key.trim();
    if (!trimmedKey || !/^[a-zA-Z0-9_]+$/.test(trimmedKey)) {
      addMessage(t('clipboard.invalidKey'), 'error');
      return;
    }

    keyRef.current = trimmedKey;
    const hash = CryptoJS.MD5(trimmedKey).toString();
    setKeyHash(hash);
    setIsKeySet(true);
    setReconnectCount(0);
    connectWebSocket(hash);
  }, [key, addMessage, t, connectWebSocket]);

  const handleClearKey = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setKey('');
    keyRef.current = '';
    setKeyHash('');
    setIsKeySet(false);
    setConnectionStatus('disconnected');
    setMessages([]);
    setReconnectCount(0);
  }, []);

  const handleSendMessage = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addMessage(t('clipboard.notConnected'), 'error');
      setConnectionStatus('disconnected');
      return;
    }

    try {
      const encryptedMessage = CryptoJS.AES.encrypt(trimmedMessage, keyRef.current).toString();
      const messageData = {
        type: 'message',
        keyHash: keyHash,
        encryptedMessage: encryptedMessage,
      };

      wsRef.current.send(JSON.stringify(messageData));
      addMessage(trimmedMessage, 'sent');
      setMessage('');
    } catch (error) {
      console.error('[Clipboard] Failed to send message:', error);
      addMessage(t('clipboard.sendFailed'), 'error');
    }
  }, [message, keyHash, addMessage, t]);

  const handleCopyMessage = useCallback(async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  const handleReconnect = useCallback(() => {
    if (keyHash) {
      setReconnectCount(0);
      connectWebSocket(keyHash, true);
    }
  }, [keyHash, connectWebSocket]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const getConnectionDot = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const receivedMessages = messages.filter(m => m.type === 'received' || m.type === 'success');
  const messageCountText = t('clipboard.messageCount', { count: receivedMessages.length });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SEO
        title={t('clipboard.title')}
        description={t('clipboard.description')}
      />
      <Navbar />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-6">
        {/* Password Input Section */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-gray-500">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium whitespace-nowrap">{t('clipboard.password')}</span>
          </div>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={isKeySet ? keyRef.current : key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isKeySet && key.trim()) {
                  handleSetKey();
                }
              }}
              disabled={isKeySet}
              placeholder={t('clipboard.passwordPlaceholder')}
              className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:border-purple-400 focus:bg-white disabled:text-gray-500 transition-colors"
              maxLength={50}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {!isKeySet ? (
            <button
              onClick={handleSetKey}
              disabled={!key.trim()}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
            >
              {t('clipboard.enterChannel')}
            </button>
          ) : (
            <button
              onClick={handleClearKey}
              className="px-5 py-2.5 text-sm font-medium text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              {t('clipboard.clearKey')}
            </button>
          )}
        </div>

        {isKeySet && (
          <>
            {/* Channel Header */}
            <div className="flex items-center justify-between py-3 px-4 border-t border-b border-gray-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {t('clipboard.channelLabel')} <span className="font-mono font-bold text-gray-900">{keyRef.current.toUpperCase()}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${getConnectionDot()}`} />
                  {connectionStatus === 'error' && (
                    <button
                      onClick={handleReconnect}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 hover:text-purple-600 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-400">
                {messageCountText}
              </span>
            </div>

            {/* Connection Error */}
            {connectionStatus === 'error' && (
              <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-700">
                  <p className="font-medium">Connection failed</p>
                  <p className="mt-1 opacity-75">Make sure the backend server is running at port 8080</p>
                </div>
              </div>
            )}

            {/* Receive Area */}
            <div className="flex-1 min-h-[300px] mb-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 h-full">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('clipboard.receiveArea')}</h3>
                <div className="max-h-[350px] overflow-y-auto space-y-2.5 pr-1">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-sm text-gray-400">{t('clipboard.noMessages')}</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`relative p-3 rounded-xl border transition-all ${msg.type === 'sent'
                            ? 'bg-purple-50 border-purple-200'
                            : msg.type === 'received'
                              ? 'bg-green-50 border-green-200'
                              : msg.type === 'success'
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                          }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${msg.type === 'sent'
                                  ? 'bg-purple-600 text-white'
                                  : msg.type === 'received'
                                    ? 'bg-green-600 text-white'
                                    : msg.type === 'success'
                                      ? 'bg-green-600 text-white'
                                      : 'bg-red-500 text-white'
                                }`}>
                                {msg.type === 'sent' ? 'Sent' : msg.type === 'received' ? 'Received' : msg.type === 'success' ? 'Info' : 'Error'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {msg.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                              {msg.content}
                            </div>
                          </div>
                          {(msg.type === 'sent' || msg.type === 'received') && (
                            <button
                              onClick={() => handleCopyMessage(msg.content, index)}
                              className="flex-shrink-0 p-1.5 hover:bg-gray-200/50 rounded-lg transition-colors"
                            >
                              {copiedIndex === index ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 mb-4" />

            {/* Send Area */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('clipboard.sendArea')}</h3>
              <textarea
                ref={messageInputRef}
                value={message}
                onChange={(e) => {
                  if (e.target.value.length <= maxMessageLength) {
                    setMessage(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
                placeholder={t('clipboard.inputPlaceholder')}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:border-purple-400 focus:bg-white resize-none transition-colors"
                rows={3}
              />

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">
                  {t('clipboard.charCount', { current: message.length, max: maxMessageLength })}
                </span>
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || connectionStatus !== 'connected'}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
                >
                  <Send className="w-4 h-4" />
                  {t('clipboard.send')}
                </button>
              </div>
            </div>

            {/* Encryption Note */}
            <div className="text-center mt-4 flex items-center justify-center gap-2">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-400">{t('clipboard.encryptionNote')}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
