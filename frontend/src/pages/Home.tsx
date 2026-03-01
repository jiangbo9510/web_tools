import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import { Navbar } from '../components/Navbar';
import { LayoutGrid, Type, FileUp, ArrowRight } from 'lucide-react';

export const Home = () => {
  const { t } = useTranslation();

  const tools = [
    {
      title: t('home.tools.imageSplitter.title'),
      description: t('home.tools.imageSplitter.description'),
      icon: LayoutGrid,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      link: 'https://pic.web-tools.work',
    },
    {
      title: t('home.tools.clipboard.title'),
      description: t('home.tools.clipboard.description'),
      icon: Type,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      link: 'https://copy.web-tools.work',
    },
    {
      title: t('home.tools.fileTransfer.title'),
      description: t('home.tools.fileTransfer.description'),
      icon: FileUp,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      link: 'https://file.web-tools.work',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={t('home.title')}
        description={t('home.description')}
      />
      <Navbar />

      {/* Hero Section */}
      <div className="px-6 pt-20 pb-16 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-5">
            {t('home.welcome')}
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
            {t('home.description')}
          </p>
        </div>

        {/* Tool Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <div
              key={index}
              className="group relative flex flex-col bg-white rounded-2xl border border-gray-200 p-7 hover:shadow-lg hover:border-gray-300 transition-all duration-300"
            >
              {/* Icon Badge */}
              <div
                className={`${tool.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-5`}
              >
                <tool.icon className={`w-6 h-6 ${tool.iconColor}`} strokeWidth={1.8} />
              </div>

              {/* Title */}
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {tool.title}
              </h2>

              {/* Description */}
              <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">
                {tool.description}
              </p>

              {/* CTA Button */}
              <a
                href={tool.link}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-medium text-white text-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                }}
              >
                {t('home.startUsing')}
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
