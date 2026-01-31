import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import { Scissors, Clipboard, ArrowRight } from 'lucide-react';

export const Home = () => {
  const { t } = useTranslation();

  const tools = [
    {
      title: t('home.tools.imageSplitter.title'),
      description: t('home.tools.imageSplitter.description'),
      icon: Scissors,
      link: 'https://pic.web-tools.work',
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-blue-50 dark:bg-blue-950',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: t('home.tools.clipboard.title'),
      description: t('home.tools.clipboard.description'),
      icon: Clipboard,
      link: 'https://copy.web-tools.work',
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a]">
      <SEO
        title={t('home.title')}
        description={t('home.description')}
      />

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-800 mb-8 shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              在线工具集合
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              {t('home.title')}
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
            {t('home.description')}
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mt-20">
          {tools.map((tool, index) => (
            <a
              key={index}
              href={tool.link}
              className="group relative bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 hover:-translate-y-1 overflow-hidden"
            >
              {/* Gradient Background on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

              <div className="relative">
                {/* Icon */}
                <div className={`${tool.iconBg} w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110`}>
                  <tool.icon className={`w-7 h-7 ${tool.iconColor}`} strokeWidth={2} />
                </div>

                {/* Content */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  {tool.title}
                  <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </h2>

                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {tool.description}
                </p>

                {/* Bottom Accent Line */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tool.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
              </div>
            </a>
          ))}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-16">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            所有工具均在浏览器本地运行，保护您的隐私
          </p>
        </div>
      </div>
    </div>
  );
};
