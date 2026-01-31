import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import { Scissors, Clipboard, ArrowUpRight } from 'lucide-react';

export const Home = () => {
  const { t } = useTranslation();

  const tools = [
    {
      title: t('home.tools.imageSplitter.title'),
      description: t('home.tools.imageSplitter.description'),
      icon: Scissors,
      link: 'https://pic.web-tools.work',
      gradient: 'from-[#007AFF] to-[#5856D6]',
      hoverGradient: 'hover:from-[#0063D1] hover:to-[#4644B8]',
    },
    {
      title: t('home.tools.clipboard.title'),
      description: t('home.tools.clipboard.description'),
      icon: Clipboard,
      link: 'https://copy.web-tools.work',
      gradient: 'from-[#34C759] to-[#30B050]',
      hoverGradient: 'hover:from-[#2DB84C] hover:to-[#289E46]',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A]">
      <SEO
        title={t('home.title')}
        description={t('home.description')}
      />

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-0 bg-radial-gradient from-black/5 via-transparent to-transparent" />
      </div>

      {/* Main Content */}
      <div className="relative flex flex-col items-center justify-center min-h-screen px-6">
        {/* Hero Section */}
        <div className="w-full max-w-2xl mx-auto text-center mb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2E2E2E] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            <span className="text-xs font-medium text-[#666666] dark:text-[#A1A1A1]">
              Online Tools Collection
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#111111] dark:text-[#EDEDED] mb-4">
            {t('home.title')}
          </h1>

          {/* Description */}
          <p className="text-lg text-[#666666] dark:text-[#888888] leading-relaxed">
            {t('home.description')}
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
          {tools.map((tool, index) => (
            <a
              key={index}
              href={tool.link}
              className="group relative flex flex-col p-6 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2E2E2E] transition-all duration-300 hover:border-[#111111] dark:hover:border-[#EDEDED]/50 hover:shadow-lg hover:shadow-[#00000008] dark:hover:shadow-[#000000]/20"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${tool.gradient})`,
                  }}
                >
                  <tool.icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#999999] group-hover:text-[#111111] dark:group-hover:text-[#EDEDED] transition-colors" strokeWidth={2} />
              </div>

              {/* Card Content */}
              <div className="space-y-2">
                <h2 className="text-[17px] font-semibold text-[#111111] dark:text-[#EDEDED]">
                  {tool.title}
                </h2>
                <p className="text-sm text-[#666666] dark:text-[#888888] leading-relaxed">
                  {tool.description}
                </p>
              </div>

              {/* Hover Accent Line */}
              <div
                className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#111111] dark:via-[#EDEDED] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(90deg, transparent, ${tool.gradient}, transparent)`,
                }}
              />
            </a>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-12 text-xs text-[#999999] dark:text-[#666666]">
          All tools run locally in your browser
        </p>
      </div>
    </div>
  );
};
