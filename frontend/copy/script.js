class SecureTextTransmitter {
    constructor() {
        this.key = null;
        this.keyHash = null;
        this.ws = null;
        this.isConnected = false;
        this.currentLanguage = 'zh';
        this.config = null;
        this.initializeElements();
        this.bindEvents();
        this.loadConfig();
    }

    async loadConfig() {
        try {
            const response = await fetch('/config.json');
            this.config = await response.json();
        } catch (error) {
            console.warn('无法加载配置文件，使用默认配置:', error);
            this.config = {
                websocket: {
                    url: 'ws://localhost:8080/ws',
                    fallbackUrl: 'ws://localhost:8080/ws',
                    reconnectInterval: 3000,
                    maxReconnectAttempts: 5
                }
            };
        }
    }

    initializeElements() {
        this.keyInput = document.getElementById('keyInput');
        this.setKeyBtn = document.getElementById('setKeyBtn');
        this.clearKeyBtn = document.getElementById('clearKeyBtn');
        this.keyStatus = document.getElementById('keyStatus');
        this.connectionSection = document.getElementById('connectionSection');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.messageSection = document.getElementById('messageSection');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.receivedSection = document.getElementById('receivedSection');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.langToggle = document.getElementById('langToggle');
    }

    bindEvents() {
        this.keyInput.addEventListener('input', this.validateKey.bind(this));
        this.keyInput.addEventListener('keydown', this.handleKeyInput.bind(this));
        this.setKeyBtn.addEventListener('click', this.setKey.bind(this));
        this.clearKeyBtn.addEventListener('click', this.clearKey.bind(this));
        this.sendBtn.addEventListener('click', this.sendMessage.bind(this));
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.sendMessage();
            }
        });
        this.langToggle.addEventListener('click', this.toggleLanguage.bind(this));
    }

    initializeLanguage() {
        this.translations = {
            zh: {
                title: '跨端加密复制工具',
                toolDesc: '基于WebSocket的实时通信，支持密钥加密传输，多客户端消息转发。安全可靠的多端文本传输解决方案。',
                step1: '1. 设置密钥',
                step2: '2. 连接状态',
                step3: '3. 发送消息',
                step4: '4. 接收到的消息',
                keyPlaceholder: '请输入密钥（仅限大小写字母和数字）',
                setKey: '设置密钥',
                clearKey: '清除密钥',
                noKey: '未设置密钥',
                notConnected: '未连接',
                messagePlaceholder: '请输入要传输的文本内容',
                sendMessage: '发送消息',
                noMessages: '暂无消息',
                keySet: '密钥已设置',
                connected: '已连接',
                disconnected: '未连接',
                messageSent: '消息已发送',
                messageReceived: '消息已接收',
                connectionError: '连接错误，请检查服务器状态',
                sendError: '请先连接到服务器',
                inputError: '请输入要发送的消息',
                decryptError: '解密失败',
                sendFailed: '发送消息失败',
                decryptFailed: '解密消息失败',
                serverError: '服务器错误'
            },
            en: {
                title: 'Cross-Platform Secure Copy',
                toolDesc: 'WebSocket-based real-time communication, key encryption, multi-client forwarding. Secure and reliable multi-device text transfer solution.',
                step1: '1. Set Key',
                step2: '2. Connection Status',
                step3: '3. Send Message',
                step4: '4. Received Messages',
                keyPlaceholder: 'Enter key (letters and numbers only)',
                setKey: 'Set Key',
                clearKey: 'Clear Key',
                noKey: 'No key set',
                notConnected: 'Not connected',
                messagePlaceholder: 'Enter text content to transmit',
                sendMessage: 'Send Message',
                noMessages: 'No messages',
                keySet: 'Key set',
                connected: 'Connected',
                disconnected: 'Disconnected',
                messageSent: 'Message sent',
                messageReceived: 'Message received',
                connectionError: 'Connection error, please check server status',
                sendError: 'Please connect to server first',
                inputError: 'Please enter message to send',
                decryptError: 'Decryption failed',
                sendFailed: 'Failed to send message',
                decryptFailed: 'Failed to decrypt message',
                serverError: 'Server error'
            }
        };
        this.updateLanguage();
    }

    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
        this.updateLanguage();
    }

    updateLanguage() {
        const t = this.translations[this.currentLanguage];
        
        // 更新所有带有data-key属性的元素
        document.querySelectorAll('[data-key]').forEach(element => {
            const key = element.getAttribute('data-key');
            if (t[key]) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = t[key];
                } else {
                    element.textContent = t[key];
                }
            }
        });
        
        // 更新页面标题
        document.title = t.title;
        
        // 更新语言切换按钮
        this.langToggle.textContent = this.currentLanguage === 'zh' ? 'EN' : '中文';
        
        // 更新HTML lang属性
        document.documentElement.lang = this.currentLanguage === 'zh' ? 'zh-CN' : 'en';
    }

    validateKey() {
        const value = this.keyInput.value;
        const isValid = /^[a-zA-Z0-9]*$/.test(value);
        
        this.setKeyBtn.disabled = !isValid || value.length === 0;
        
        if (!isValid) {
            this.keyInput.style.borderColor = '#dc3545';
        } else {
            this.keyInput.style.borderColor = '#e0e0e0';
        }
    }

    handleKeyInput(e) {
        // 如果已经有密钥，只允许删除操作
        if (this.key && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') {
            e.preventDefault();
            return;
        }
    }

    setKey() {
        const keyValue = this.keyInput.value.trim();
        if (!keyValue) return;

        this.key = keyValue;
        this.keyHash = CryptoJS.MD5(keyValue).toString();
        
        // 禁用输入框
        this.keyInput.disabled = true;
        this.keyInput.value = '密钥已设置';
        this.setKeyBtn.style.display = 'none';
        this.clearKeyBtn.style.display = 'inline-block';
        
        // 更新状态
        this.keyStatus.classList.add('connected');
        this.keyStatus.querySelector('.status-text').textContent = this.translations[this.currentLanguage].keySet;
        
        // 显示连接部分
        this.connectionSection.style.display = 'block';
        this.messageSection.style.display = 'block';
        this.receivedSection.style.display = 'block';
        
        // 尝试连接WebSocket
        this.connectWebSocket();
    }

    clearKey() {
        this.key = null;
        this.keyHash = null;
        
        // 重置输入框
        this.keyInput.disabled = false;
        this.keyInput.value = '';
        this.keyInput.style.borderColor = '#e0e0e0';
        this.setKeyBtn.style.display = 'inline-block';
        this.clearKeyBtn.style.display = 'none';
        
        // 更新状态
        this.keyStatus.classList.remove('connected');
        this.keyStatus.querySelector('.status-text').textContent = this.translations[this.currentLanguage].noKey;
        
        // 断开WebSocket连接
        this.disconnectWebSocket();
        
        // 隐藏相关部分
        this.connectionSection.style.display = 'none';
        this.messageSection.style.display = 'none';
        this.receivedSection.style.display = 'none';
    }

    connectWebSocket() {
        if (this.ws) {
            this.ws.close();
        }

        // 使用配置文件中的WebSocket地址
        const wsUrl = this.config?.websocket?.url || 'ws://localhost:8080/ws';
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            this.isConnected = true;
            this.updateConnectionStatus(true);
            
            // 发送注册消息
            this.ws.send(JSON.stringify({
                type: 'register',
                keyHash: this.keyHash
            }));
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('解析消息失败:', error);
            }
        };
        
        this.ws.onclose = () => {
            this.isConnected = false;
            this.updateConnectionStatus(false);
            
            // 尝试重连
            if (this.key) {
                setTimeout(() => {
                    this.connectWebSocket();
                }, this.config?.websocket?.reconnectInterval || 3000);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket错误:', error);
            this.addMessage(this.translations[this.currentLanguage].connectionError, 'error');
        };
    }

    disconnectWebSocket() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.updateConnectionStatus(false);
    }

    updateConnectionStatus(connected) {
        const indicator = this.connectionStatus.querySelector('.status-indicator');
        const statusText = this.connectionStatus.querySelector('.status-text');
        
        if (connected) {
            indicator.classList.remove('disconnected');
            indicator.classList.add('connected');
            statusText.textContent = this.translations[this.currentLanguage].connected;
            this.connectionStatus.classList.add('connected');
        } else {
            indicator.classList.remove('connected');
            indicator.classList.add('disconnected');
            statusText.textContent = this.translations[this.currentLanguage].disconnected;
            this.connectionStatus.classList.remove('connected');
        }
    }

    sendMessage() {
        if (!this.isConnected) {
            this.addMessage(this.translations[this.currentLanguage].sendError, 'error');
            return;
        }

        const message = this.messageInput.value.trim();
        if (!message) {
            this.addMessage(this.translations[this.currentLanguage].inputError, 'error');
            return;
        }

        try {
            // 使用密钥加密消息
            const encryptedMessage = CryptoJS.AES.encrypt(message, this.key).toString();
            
            // 发送加密消息
            this.ws.send(JSON.stringify({
                type: 'message',
                keyHash: this.keyHash,
                encryptedMessage: encryptedMessage
            }));
            
            this.messageInput.value = '';
            this.addMessage(this.translations[this.currentLanguage].messageSent, 'success');
        } catch (error) {
            console.error('发送消息失败:', error);
            this.addMessage(this.translations[this.currentLanguage].sendFailed, 'error');
        }
    }

    handleMessage(data) {
        if (data.type === 'message' && data.encryptedMessage) {
            try {
                // 解密消息
                const decryptedBytes = CryptoJS.AES.decrypt(data.encryptedMessage, this.key);
                const decryptedMessage = decryptedBytes.toString(CryptoJS.enc.Utf8);
                
                if (decryptedMessage) {
                    this.addMessage(decryptedMessage, 'received');
                } else {
                    this.addMessage(this.translations[this.currentLanguage].decryptError, 'error');
                }
            } catch (error) {
                console.error('解密消息失败:', error);
                this.addMessage(this.translations[this.currentLanguage].decryptFailed, 'error');
            }
        } else if (data.type === 'error') {
            this.addMessage(data.message || this.translations[this.currentLanguage].serverError, 'error');
        }
    }

    addMessage(content, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-item ${type}-message`;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleString();
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(timeDiv);
        messageDiv.appendChild(contentDiv);
        
        // 移除"暂无消息"提示
        const noMessages = this.messagesContainer.querySelector('.no-messages');
        if (noMessages) {
            noMessages.remove();
        }
        
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new SecureTextTransmitter();
});