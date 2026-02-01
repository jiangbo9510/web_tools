import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import CryptoJS from 'crypto-js';
import { Send, Copy, Check, Key, Wifi, MessageSquare, Lock, RefreshCw, AlertCircle } from 'lucide-react';

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

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const keyRef = useRef(''); // 用 ref 存储 key 避免闭包问题

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.DEV ? 'localhost:8080' : window.location.host;
    return `${protocol}//${host}/ws`;
  }, []);

  const addMessage = useCallback((content: string, type: 'sent' | 'received' | 'error' | 'success') => {
    setMessages(prev => [...prev, {
      content,
      type,
      timestamp: new Date(),
    }]);
  }, []);

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
    if (!trimmedKey || !/^[a-zA-Z0-9]+$/.test(trimmedKey)) {
      addMessage(t('clipboard.invalidKey'), 'error');
      return;
    }

    keyRef.current = trimmedKey; // 存储到 ref
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

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return t('clipboard.connected');
      case 'connecting': return t('clipboard.connecting');
      case 'error': return t('clipboard.connectionError');
      default: return t('clipboard.notConnected');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={t('clipboard.title')}
        description={t('clipboard.description')}
      />

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="relative flex flex-col items-center justify-center min-h-screen px-6 py-16">
        {/* Header */}
        <div className="w-full max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E5E5E5] mb-6">
            <Lock className="w-3.5 h-3.5 text-[#34C759]" />
            <span className="text-xs font-medium text-[#666666]">
              End-to-End Encrypted
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold text-[#111111] mb-3">
            {t('clipboard.title').split(' - ')[0]}
          </h1>

          <p className="text-[#666666]">
            {t('clipboard.description')}
          </p>
        </div>

        {/* Step 1: Set Key */}
        <div className="w-full max-w-md mx-auto mb-6">
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F0F9FF] flex items-center justify-center">
                  <Key className="w-4 h-4 text-[#007AFF]" />
                </div>
                <span className="text-sm font-medium text-[#111111]">
                  {t('clipboard.step1')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isKeySet ? 'bg-[#34C759]' : 'bg-[#E5E5E5]'}`} />
                <span className={`text-xs ${isKeySet ? 'text-[#34C759]' : 'text-[#999999]'}`}>
                  {isKeySet ? t('clipboard.keySet') : t('clipboard.noKey')}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="password"
                value={isKeySet ? '●●●●●●●●' : key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isKeySet && key.trim()) {
                    handleSetKey();
                  }
                }}
                disabled={isKeySet}
                placeholder={t('clipboard.keyPlaceholder')}
                className="flex-1 px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg bg-[#FAFAFA] text-[#111111] focus:outline-none focus:border-[#007AFF] disabled:text-[#999999] transition-colors"
                maxLength={50}
              />
              {!isKeySet ? (
                <button
                  onClick={handleSetKey}
                  disabled={!key.trim()}
                  className="px-4 py-2.5 text-sm font-medium bg-[#111111] text-white rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {t('clipboard.setKey')}
                </button>
              ) : (
                <button
                  onClick={handleClearKey}
                  className="px-4 py-2.5 text-sm font-medium bg-[#FFF2F2] text-[#E11D48] rounded-lg transition-all hover:scale-105"
                >
                  {t('clipboard.clearKey')}
                </button>
              )}
            </div>
          </div>
        </div>

        {isKeySet && (
          <>
            {/* Step 2: Connection Status */}
            <div className="w-full max-w-md mx-auto mb-6">
              <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F0F9FF] flex items-center justify-center">
                      <Wifi className="w-4 h-4 text-[#007AFF]" />
                    </div>
                    <span className="text-sm font-medium text-[#111111]">
                      {t('clipboard.step2')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
                    <span className={`text-xs font-medium ${connectionStatus === 'connected' ? 'text-[#34C759]' :
                      connectionStatus === 'connecting' ? 'text-[#F59E0B]' :
                        connectionStatus === 'error' ? 'text-[#E11D48]' : 'text-[#666666]'
                      }`}>
                      {getConnectionStatusText()}
                    </span>
                    {connectionStatus !== 'connected' && (
                      <button
                        onClick={handleReconnect}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-[#666666] hover:text-[#007AFF] transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {connectionStatus === 'error' && (
                  <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-[#FFF2F2] rounded-lg border border-[#FECACA]">
                    <AlertCircle className="w-4 h-4 text-[#E11D48] flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-[#991B1B]">
                      <p className="font-medium">Connection failed</p>
                      <p className="mt-1 opacity-75">Make sure the backend server is running at port 8080</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Send Message */}
            <div className="w-full max-w-md mx-auto mb-6">
              <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#F0F9FF] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-[#007AFF]" />
                  </div>
                  <span className="text-sm font-medium text-[#111111]">
                    {t('clipboard.step3')}
                  </span>
                </div>

                <div className="space-y-3">
                  <textarea
                    ref={messageInputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                        handleSendMessage();
                      }
                    }}
                    placeholder={t('clipboard.messagePlaceholder')}
                    className="w-full px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg bg-[#FAFAFA] text-[#111111] focus:outline-none focus:border-[#007AFF] resize-none transition-colors"
                    rows={3}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#999999]">
                      Ctrl + Enter to send
                    </span>
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || connectionStatus !== 'connected'}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#111111] text-white rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <Send className="w-4 h-4" />
                      {t('clipboard.sendMessage')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Messages */}
            <div className="w-full max-w-md mx-auto">
              <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#F0F9FF] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-[#007AFF]" />
                  </div>
                  <span className="text-sm font-medium text-[#111111]">
                    {t('clipboard.step4')}
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#FAFAFA] flex items-center justify-center border border-[#E5E5E5]">
                        <MessageSquare className="w-5 h-5 text-[#999999]" />
                      </div>
                      <p className="text-sm text-[#999999]">
                        {t('clipboard.noMessages')}
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`relative p-3 rounded-lg border transition-all ${msg.type === 'sent'
                          ? 'bg-[#F0F9FF] border-[#007AFF]/30'
                          : msg.type === 'received'
                            ? 'bg-[#F0FDF4] border-[#34C759]/30'
                            : msg.type === 'success'
                              ? 'bg-[#F0FDF4] border-[#34C759]/30'
                              : 'bg-[#FFF2F2] border-[#E11D48]/30'
                          }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${msg.type === 'sent'
                                ? 'bg-[#007AFF] text-white'
                                : msg.type === 'received'
                                  ? 'bg-[#34C759] text-white'
                                  : msg.type === 'success'
                                    ? 'bg-[#34C759] text-white'
                                    : 'bg-[#E11D48] text-white'
                                }`}>
                                {msg.type === 'sent' ? 'Sent' : msg.type === 'received' ? 'Received' : msg.type === 'success' ? 'Success' : 'Error'}
                              </span>
                              <span className="text-xs text-[#999999]">
                                {msg.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-sm text-[#111111] whitespace-pre-wrap break-words">
                              {msg.content}
                            </div>
                          </div>
                          {(msg.type === 'sent' || msg.type === 'received') && (
                            <button
                              onClick={() => handleCopyMessage(msg.content, index)}
                              className="flex-shrink-0 p-1.5 hover:bg-[#E5E5E5] rounded transition-colors"
                            >
                              {copiedIndex === index ? (
                                <Check className="w-4 h-4 text-[#34C759]" />
                              ) : (
                                <Copy className="w-4 h-4 text-[#999999]" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
