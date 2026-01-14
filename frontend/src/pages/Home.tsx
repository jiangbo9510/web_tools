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
      link: 'https://pic.your-domain.com',
      color: 'bg-blue-500',
    },
    {
      title: t('home.tools.clipboard.title'),
      description: t('home.tools.clipboard.description'),
      icon: Clipboard,
      link: 'https://copy.your-domain.com',
      color: 'bg-green-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <SEO
        title={t('home.title')}
        description={t('home.description')}
      />

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            {t('home.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {t('home.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {tools.map((tool, index) => (
            <a
              key={index}
              href={tool.link}
              className="group block p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1"
            >
              <div className={`${tool.color} w-16 h-16 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <tool.icon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {tool.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {tool.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
