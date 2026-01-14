import { HelmetProvider } from 'react-helmet-async';
import { LanguageToggle } from './components/LanguageToggle';
import { Home } from './pages/Home';
import { ImageSplitter } from './pages/ImageSplitter';
import { Clipboard } from './pages/Clipboard';

function App() {
  // 根据域名分发路由
  const getPageComponent = () => {
    const hostname = window.location.hostname;

    // 图片切分工具 - pic.domain
    if (hostname.startsWith('pic.')) {
      return <ImageSplitter />;
    }

    // 云剪贴板 - copy.domain
    if (hostname.startsWith('copy.')) {
      return <Clipboard />;
    }

    // 主页 - domain
    return <Home />;
  };

  return (
    <HelmetProvider>
      <div className="App">
        <LanguageToggle />
        {getPageComponent()}
      </div>
    </HelmetProvider>
  );
}

export default App;
