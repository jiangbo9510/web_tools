import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import CryptoJS from 'crypto-js';
import { Send, Copy, Check, Key, Wifi, MessageSquare, Lock } from 'lucide-react';

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
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // WebSocket URL - 开发环境使用 proxy，生产环境使用实际域名
  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.DEV ? 'localhost:8080' : window.location.host;
    return `${protocol}//${host}/api/ws`;
  };

  const handleSetKey = () => {
    const trimmedKey = key.trim();
    if (!trimmedKey || !/^[a-zA-Z0-9]+$/.test(trimmedKey)) {
      addMessage(t('clipboard.invalidKey'), 'error');
      return;
    }

    const hash = CryptoJS.MD5(trimmedKey).toString();
    setKeyHash(hash);
    setIsKeySet(true);
    connectWebSocket(hash);
  };

  const handleClearKey = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setKey('');
    setKeyHash('');
    setIsKeySet(false);
    setIsConnected(false);
    setMessages([]);
  };

  const connectWebSocket = (hash: string) => {
    const wsUrl = getWebSocketUrl();
    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      const registerData = {
        type: 'register',
        keyHash: hash,
      };
      console.log('Sending register:', registerData);
      ws.send(JSON.stringify(registerData));
      addMessage(t('clipboard.connected'), 'success');
    };

    ws.onmessage = (event) => {
      try {
        console.log('Received message:', event.data);
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      addMessage(t('clipboard.notConnected'), 'error');
      // Auto reconnect after 3 seconds if key is still set
      if (isKeySet) {
        setTimeout(() => {
          if (keyHash) {
            console.log('Attempting to reconnect...');
            connectWebSocket(keyHash);
          }
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      addMessage(t('clipboard.connectionError') || 'Connection error', 'error');
    };

    wsRef.current = ws;
  };

  const handleWebSocketMessage = (data: any) => {
    if (data.type === 'message' && data.encryptedMessage) {
      try {
        const decryptedBytes = CryptoJS.AES.decrypt(data.encryptedMessage, key);
        const decryptedMessage = decryptedBytes.toString(CryptoJS.enc.Utf8);

        if (decryptedMessage) {
          addMessage(decryptedMessage, 'received');
        } else {
          addMessage(t('clipboard.copyError'), 'error');
        }
      } catch (error) {
        console.error('Decryption failed:', error);
        addMessage(t('clipboard.copyError'), 'error');
      }
    }
  };

  const handleSendMessage = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addMessage(t('clipboard.notConnected'), 'error');
      setIsConnected(false);
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    try {
      const encryptedMessage = CryptoJS.AES.encrypt(trimmedMessage, key).toString();

      const messageData = {
        type: 'message',
        keyHash: keyHash,
        encryptedMessage: encryptedMessage,
      };

      console.log('Sending message:', messageData);
      wsRef.current.send(JSON.stringify(messageData));

      addMessage(trimmedMessage, 'sent');
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      addMessage(t('clipboard.sendFailed') || 'Failed to send message', 'error');
    }
  };

  const addMessage = (content: string, type: 'sent' | 'received' | 'error' | 'success') => {
    setMessages(prev => [...prev, {
      content,
      type,
      timestamp: new Date(),
    }]);
  };

  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a]">
      <SEO
        title={t('clipboard.title')}
        description={t('clipboard.description')}
      />

      <div className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-800 mb-6 shadow-sm">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              端到端加密
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              {t('clipboard.title').split(' - ')[0]}
            </span>
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('clipboard.description')}
          </p>
        </div>

        {/* Step 1: Set Key */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('clipboard.step1')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                设置您的加密密钥
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={isKeySet ? '●●●●●●●●' : key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isKeySet) {
                  handleSetKey();
                }
              }}
              disabled={isKeySet}
              placeholder={t('clipboard.keyPlaceholder')}
              className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500 transition-colors"
              maxLength={50}
            />
            {!isKeySet ? (
              <button
                onClick={handleSetKey}
                disabled={!key.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg transition-all font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:shadow-none"
              >
                {t('clipboard.setKey')}
              </button>
            ) : (
              <button
                onClick={handleClearKey}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-lg transition-all font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40"
              >
                {t('clipboard.clearKey')}
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors ${isKeySet ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isKeySet ? t('clipboard.keySet') : t('clipboard.noKey')}
            </span>
          </div>
        </div>

        {isKeySet && (
          <>
            {/* Step 2: Connection Status */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950 rounded-lg flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('clipboard.step2')}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    WebSocket 连接状态
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`font-medium ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isConnected ? t('clipboard.connected') : t('clipboard.notConnected')}
                </span>
              </div>
            </div>

            {/* Step 3: Send Message */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('clipboard.step3')}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    输入要发送的内容
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  placeholder={t('clipboard.messagePlaceholder')}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none transition-colors"
                  rows={4}
                />

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    按 Ctrl + Enter 快速发送
                  </p>
                  <button
                    onClick={handleSendMessage}
                    disabled={!isConnected || !message.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg transition-all font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:shadow-none"
                  >
                    <Send className="w-5 h-5" />
                    {t('clipboard.sendMessage')}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 4: Messages */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('clipboard.step4')}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    消息记录
                  </p>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-500">
                      {t('clipboard.noMessages')}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        msg.type === 'sent'
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
                          : msg.type === 'received'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
                          : msg.type === 'success'
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900'
                          : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              msg.type === 'sent'
                                ? 'bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-300'
                                : msg.type === 'received'
                                ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-300'
                                : msg.type === 'success'
                                ? 'bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-300'
                                : 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-300'
                            }`}>
                              {msg.type === 'sent' ? '已发送' : msg.type === 'received' ? '已接收' : msg.type === 'success' ? '成功' : '错误'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {msg.timestamp.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                            {msg.content}
                          </div>
                        </div>
                        {(msg.type === 'sent' || msg.type === 'received') && (
                          <button
                            onClick={() => handleCopyMessage(msg.content, index)}
                            className="flex-shrink-0 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            {copiedIndex === index ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : (
                              <Copy className="w-5 h-5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
