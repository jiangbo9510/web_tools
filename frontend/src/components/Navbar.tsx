import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const Navbar = () => {
    const { t, i18n } = useTranslation();

    const hostname = window.location.hostname;

    const isActive = (prefix: string) => {
        if (prefix === 'home') return !hostname.startsWith('pic.') && !hostname.startsWith('copy.') && !hostname.startsWith('file.');
        if (prefix === 'pic') return hostname.startsWith('pic.');
        if (prefix === 'copy') return hostname.startsWith('copy.');
        if (prefix === 'file') return hostname.startsWith('file.');
        return false;
    };

    const navLinks = [
        { key: 'home', label: t('nav.home'), href: 'https://web-tools.work' },
        { key: 'pic', label: t('nav.imageSplitter'), href: 'https://pic.web-tools.work' },
        { key: 'copy', label: t('nav.clipboard'), href: 'https://copy.web-tools.work' },
        { key: 'file', label: t('nav.fileTransfer'), href: 'https://file.web-tools.work' },
    ];

    const toggleLanguage = () => {
        const newLang = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN';
        i18n.changeLanguage(newLang);
    };

    return (
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <a href="https://web-tools.work" className="flex items-center gap-2 group">
                    <span className="text-2xl">🔧</span>
                    <span className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {t('nav.brand')}
                    </span>
                </a>

                {/* Navigation Links */}
                <div className="flex items-center gap-1">
                    {navLinks.map((link) => (
                        <a
                            key={link.key}
                            href={link.href}
                            className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                ${isActive(link.key)
                                    ? 'text-purple-600 bg-purple-50'
                                    : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50/50'
                                }
              `}
                        >
                            {link.label}
                        </a>
                    ))}

                    {/* Language Toggle */}
                    <button
                        onClick={toggleLanguage}
                        className="ml-2 flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-purple-600 rounded-lg hover:bg-purple-50/50 transition-all duration-200"
                    >
                        <Globe className="w-4 h-4" />
                        <span className="font-medium">{i18n.language === 'zh-CN' ? '中' : 'En'}</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};
