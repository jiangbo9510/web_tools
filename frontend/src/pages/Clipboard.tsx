import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import CryptoJS from 'crypto-js';
import { Send, Copy, Check } from 'lucide-react';

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
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({
        type: 'register',
        keyHash: hash,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto reconnect after 3 seconds if key is still set
      if (isKeySet) {
        setTimeout(() => {
          if (keyHash) {
            connectWebSocket(keyHash);
          }
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      addMessage(t('clipboard.toolDesc'), 'error');
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
    if (!isConnected) {
      addMessage('Please connect first', 'error');
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    try {
      const encryptedMessage = CryptoJS.AES.encrypt(trimmedMessage, key).toString();

      wsRef.current?.send(JSON.stringify({
        type: 'message',
        keyHash: keyHash,
        encryptedMessage: encryptedMessage,
      }));

      addMessage(trimmedMessage, 'sent');
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      addMessage('Failed to send message', 'error');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <SEO
        title={t('clipboard.title')}
        description={t('clipboard.description')}
      />

      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-2">
          {t('clipboard.title').split(' - ')[0]}
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
          {t('clipboard.description')}
        </p>

        {/* 步骤 1: 设置密钥 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('clipboard.step1')}
          </h2>
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={isKeySet ? '密钥已设置' : key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isKeySet) {
                  handleSetKey();
                }
              }}
              disabled={isKeySet}
              placeholder={t('clipboard.keyPlaceholder')}
              className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
              maxLength={50}
            />
            {!isKeySet ? (
              <button
                onClick={handleSetKey}
                disabled={!key.trim()}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
              >
                {t('clipboard.setKey')}
              </button>
            ) : (
              <button
                onClick={handleClearKey}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
              >
                {t('clipboard.clearKey')}
              </button>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isKeySet ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {isKeySet ? t('clipboard.keySet') : t('clipboard.noKey')}
            </span>
          </div>
        </div>

        {isKeySet && (
          <>
            {/* 步骤 2: 连接状态 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {t('clipboard.step2')}
              </h2>
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-lg font-medium ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isConnected ? t('clipboard.connected') : t('clipboard.notConnected')}
                </span>
              </div>
            </div>

            {/* 步骤 3: 发送消息 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {t('clipboard.step3')}
              </h2>
              <div className="flex gap-3">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  placeholder={t('clipboard.messagePlaceholder')}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                  rows={3}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!isConnected || !message.trim()}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {t('clipboard.sendMessage')}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Ctrl + Enter to send
              </p>
            </div>

            {/* 步骤 4: 接收到的消息 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {t('clipboard.step4')}
              </h2>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    {t('clipboard.noMessages')}
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg ${
                        msg.type === 'sent'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                          : msg.type === 'received'
                          ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500'
                          : 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {msg.timestamp.toLocaleString()}
                          </div>
                          <div className="text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                            {msg.content}
                          </div>
                        </div>
                        {(msg.type === 'sent' || msg.type === 'received') && (
                          <button
                            onClick={() => handleCopyMessage(msg.content, index)}
                            className="flex-shrink-0 p-2 hover:bg-white dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            {copiedIndex === index ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : (
                              <Copy className="w-5 h-5 text-gray-500" />
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
