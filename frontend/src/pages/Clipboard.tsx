import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import { Navbar } from '../components/Navbar';
import CryptoJS from 'crypto-js';
import { Send, Copy, Check, Key, Wifi, MessageSquare, Lock, RefreshCw, AlertCircle } from 'lucide-react';

interface Message {
  content: string;
  type: 'sent' | 'received' | 'error' | 'success';
  timestamp: Date;
}

export const Clipboard = () => {
  const { t, i18n } = useTranslation();
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

  const connectWebSocket = useCallback((hash: string, isRetry = false) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus(isRetry ? 'connecting' : 'connecting');
    const wsUrl = getWebSocketUrl();

    try {
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          setConnectionStatus('error');
          addMessage(t('clipboard.connectionError'), 'error');
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
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

          if (data.type === 'message' && data.encryptedMessage) {
            try {
              const decryptedBytes = CryptoJS.AES.decrypt(data.encryptedMessage, keyRef.current);
              const decryptedMessage = decryptedBytes.toString(CryptoJS.enc.Utf8);

              if (decryptedMessage) {
                addMessage(decryptedMessage, 'received');
              } else {
                addMessage(t('clipboard.copyError'), 'error');
              }
            } catch {
              addMessage(t('clipboard.copyError'), 'error');
            }
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        setConnectionStatus('error');
        addMessage(t('clipboard.connectionError'), 'error');
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        setConnectionStatus('error');
        addMessage(t('clipboard.connectionError'), 'error');
      };

      wsRef.current = ws;
    } catch {
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
    if (!trimmedMessage) return;

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
    } catch {
      addMessage(t('clipboard.sendFailed'), 'error');
    }
  }, [message, keyHash, addMessage, t]);

  const handleCopyMessage = useCallback(async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // ignore
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
        keywords={t('clipboard.seoKeywords')}
        canonicalUrl="https://copy.web-tools.work"
        language={i18n.language}
      />
      <Navbar />

      <div className="px-4 sm:px-6 py-6 sm:py-10 max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 mb-4 sm:mb-5">
            <Lock className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-xs font-medium text-purple-600">
              {t('clipboard.e2eeLabel')}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
            {t('clipboard.title').split(' - ')[0]}
          </h1>

          <p className="text-sm sm:text-base text-gray-500">
            {t('clipboard.description')}
          </p>
        </div>

        {/* Step 1: Set Key */}
        <div className="mb-4 sm:mb-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Key className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {t('clipboard.step1')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isKeySet ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={`text-xs ${isKeySet ? 'text-green-600' : 'text-gray-400'}`}>
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
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:border-purple-400 disabled:text-gray-400 transition-colors"
                maxLength={50}
              />
              {!isKeySet ? (
                <button
                  onClick={handleSetKey}
                  disabled={!key.trim()}
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:shadow-md disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
                >
                  <Check className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleClearKey}
                  className="px-4 py-2.5 text-sm font-medium text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
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
            <div className="mb-4 sm:mb-5">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Wifi className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {t('clipboard.step2')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
                    <span className={`text-xs font-medium ${connectionStatus === 'connected' ? 'text-green-600' :
                      connectionStatus === 'connecting' ? 'text-yellow-600' :
                        connectionStatus === 'error' ? 'text-red-500' : 'text-gray-500'
                      }`}>
                      {getConnectionStatusText()}
                    </span>
                    {connectionStatus !== 'connected' && (
                      <button
                        onClick={handleReconnect}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-purple-600 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {connectionStatus === 'error' && (
                  <div className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-red-700">
                      <p className="font-medium">{t('clipboard.connectionError')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Send Message */}
            <div className="mb-4 sm:mb-5">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {t('clipboard.step3')}
                  </span>
                </div>

                <div className="space-y-3">
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
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:border-purple-400 resize-none transition-colors"
                    rows={3}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {message.length}/{maxMessageLength}
                    </span>
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || connectionStatus !== 'connected'}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:shadow-md disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
                    >
                      <Send className="w-4 h-4" />
                      {t('clipboard.send')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Messages */}
            <div className="mb-4 sm:mb-5">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {t('clipboard.step4')}
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200">
                        <MessageSquare className="w-5 h-5 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400">
                        {t('clipboard.noMessages')}
                      </p>
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
                </div>
              </div>
            </div>

            {/* Encryption Note */}
            <div className="text-center flex items-center justify-center gap-2">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-400">{t('clipboard.encryptionNote')}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
