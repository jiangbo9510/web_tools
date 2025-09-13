let currentLanguage = 'zh';

const translations = {
    zh: {
        mainTitle: '在线图片切分工具和跨端加密复制',
        subtitle: '免费、安全、高效的在线工具集合',
        splitPicTitle: '图片切分工具',
        splitPicDesc: '支持1x1到5x5任意网格切分，中英双语支持，ZIP批量下载功能',
        secureCopyTitle: '跨端加密复制',
        secureCopyDesc: '安全的多端文本传输工具',
        feature1: '网格切分',
        feature2: '批量下载',
        feature3: '实时预览',
        feature4: 'AES加密',
        feature5: '实时传输',
        feature6: '多端同步',
        useTool: '使用工具',
        infoTitle: '工具特色',
        freeTitle: '完全免费',
        freeDesc: '所有工具完全免费使用，无需注册',
        secureTitle: '安全可靠',
        secureDesc: '采用AES加密算法，保护您的数据安全',
        crossTitle: '跨平台',
        crossDesc: '支持所有现代浏览器，无需安装',
        fastTitle: '高效快速',
        fastDesc: '实时处理，快速响应，提升工作效率',
        footerText: '© 2024 Web Tools. 保留所有权利。'
    },
    en: {
        mainTitle: 'Online Picture Splitter & Cross-Platform Secure Copy',
        subtitle: 'Free, Secure, and Efficient Online Tools Collection',
        splitPicTitle: 'Picture Splitter',
        splitPicDesc: 'Support 1x1 to 5x5 grid splitting, bilingual support, ZIP batch download',
        secureCopyTitle: 'Cross-Platform Secure Copy',
        secureCopyDesc: 'Secure multi-device text transfer tool',
        feature1: 'Grid Split',
        feature2: 'Batch Download',
        feature3: 'Real-time Preview',
        feature4: 'AES Encryption',
        feature5: 'Real-time Transfer',
        feature6: 'Multi-device Sync',
        useTool: 'Use Tool',
        infoTitle: 'Tool Features',
        freeTitle: 'Completely Free',
        freeDesc: 'All tools are completely free to use, no registration required',
        secureTitle: 'Secure & Reliable',
        secureDesc: 'AES encryption algorithm to protect your data security',
        crossTitle: 'Cross-Platform',
        crossDesc: 'Support all modern browsers, no installation required',
        fastTitle: 'Efficient & Fast',
        fastDesc: 'Real-time processing, fast response, improve work efficiency',
        footerText: '© 2024 Web Tools. All rights reserved.'
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const langToggle = document.getElementById('langToggle');
    
    // 初始化语言
    updateLanguage();
    
    // 语言切换事件
    langToggle.addEventListener('click', function() {
        currentLanguage = currentLanguage === 'zh' ? 'en' : 'zh';
        updateLanguage();
    });
    
    function updateLanguage() {
        const t = translations[currentLanguage];
        
        // 更新所有带有data-key属性的元素
        document.querySelectorAll('[data-key]').forEach(element => {
            const key = element.getAttribute('data-key');
            if (t[key]) {
                element.textContent = t[key];
            }
        });
        
        // 更新页面标题
        document.title = t.mainTitle;
        
        // 更新语言切换按钮
        langToggle.textContent = currentLanguage === 'zh' ? 'EN' : '中文';
        
        // 更新HTML lang属性
        document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
        
        // 更新meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = currentLanguage === 'zh' 
                ? '免费在线图片切分工具，支持1x1到5x5任意网格切分。跨端加密复制工具，支持WebSocket实时传输和AES加密。'
                : 'Free online picture splitter, support 1x1 to 5x5 grid splitting. Cross-platform secure copy tool with WebSocket real-time transfer and AES encryption.';
        }
        
        // 更新Open Graph标题
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
            ogTitle.content = t.mainTitle;
        }
        
        // 更新Open Graph描述
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) {
            ogDesc.content = currentLanguage === 'zh' 
                ? '免费在线图片切分工具，支持1x1到5x5任意网格切分。跨端加密复制工具，支持WebSocket实时传输和AES加密。'
                : 'Free online picture splitter, support 1x1 to 5x5 grid splitting. Cross-platform secure copy tool with WebSocket real-time transfer and AES encryption.';
        }
        
        // 更新Twitter卡片标题
        const twitterTitle = document.querySelector('meta[property="twitter:title"]');
        if (twitterTitle) {
            twitterTitle.content = t.mainTitle;
        }
        
        // 更新Twitter卡片描述
        const twitterDesc = document.querySelector('meta[property="twitter:description"]');
        if (twitterDesc) {
            twitterDesc.content = currentLanguage === 'zh' 
                ? '免费在线图片切分工具，支持1x1到5x5任意网格切分。跨端加密复制工具，支持WebSocket实时传输和AES加密。'
                : 'Free online picture splitter, support 1x1 to 5x5 grid splitting. Cross-platform secure copy tool with WebSocket real-time transfer and AES encryption.';
        }
    }
    
    // 添加工具卡片悬停效果
    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // 添加平滑滚动效果
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // 添加点击动画
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
});
