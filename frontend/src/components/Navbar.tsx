import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Menu, X } from 'lucide-react';

export const Navbar = () => {
    const { t, i18n } = useTranslation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <div className="w-full px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between">
                {/* Logo */}
                <a href="https://web-tools.work" className="flex items-center gap-2 group">
                    <span className="text-xl sm:text-2xl">🔧</span>
                    <span className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {t('nav.brand')}
                    </span>
                </a>

                {/* Desktop Navigation Links */}
                <div className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <a
                            key={link.key}
                            href={link.href}
                            className={`
                px-3 lg:px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
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

                {/* Mobile: Language + Hamburger */}
                <div className="flex md:hidden items-center gap-2">
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-500 rounded-lg"
                    >
                        <Globe className="w-4 h-4" />
                        <span className="font-medium">{i18n.language === 'zh-CN' ? '中' : 'En'}</span>
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 text-gray-600 hover:text-purple-600 rounded-lg hover:bg-purple-50/50 transition-colors"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
                    {navLinks.map((link) => (
                        <a
                            key={link.key}
                            href={link.href}
                            className={`
                block px-4 py-2.5 text-sm font-medium rounded-lg transition-all
                ${isActive(link.key)
                                    ? 'text-purple-600 bg-purple-50'
                                    : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50/50'
                                }
              `}
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
            )}
        </nav>
    );
};
