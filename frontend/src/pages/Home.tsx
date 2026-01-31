import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import { Scissors, Clipboard } from 'lucide-react';

export const Home = () => {
  const { t } = useTranslation();

  const tools = [
    {
      title: t('home.tools.imageSplitter.title'),
      description: t('home.tools.imageSplitter.description'),
      icon: Scissors,
      iconBg: 'bg-[#007AFF]',
      link: 'https://pic.web-tools.work',
    },
    {
      title: t('home.tools.clipboard.title'),
      description: t('home.tools.clipboard.description'),
      icon: Clipboard,
      iconBg: 'bg-[#34C759]',
      link: 'https://copy.web-tools.work',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <SEO
        title={t('home.title')}
        description={t('home.description')}
      />

      {/* Header */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-16">
        {/* Title */}
        <div className="w-full max-w-2xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#111111] mb-4">
            {t('home.title')}
          </h1>

          <p className="text-lg text-[#666666] leading-relaxed">
            {t('home.description')}
          </p>
        </div>

        {/* Tools Grid - Two Large Cards Side by Side */}
        <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
          {tools.map((tool, index) => (
            <a
              key={index}
              href={tool.link}
              className="group relative flex flex-col items-center p-12 bg-white rounded-3xl border border-[#E5E5E5] shadow-sm hover:shadow-lg hover:border-[#111111] transition-all duration-300"
            >
              {/* Large Icon */}
              <div
                className={`${tool.iconBg} w-24 h-24 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110`}
              >
                <tool.icon className="w-12 h-12 text-white" strokeWidth={1.5} />
              </div>

              {/* Title */}
              <h2 className="text-xl font-semibold text-[#111111] mb-3 text-center">
                {tool.title}
              </h2>

              {/* Description */}
              <p className="text-sm text-[#666666] text-center leading-relaxed max-w-xs">
                {tool.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
