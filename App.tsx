
import React, { useState, useCallback, useEffect } from 'react';
import { AlertCircle, Key, Lock, Menu, Box } from 'lucide-react';
import Controls from './components/Controls';
import Preview from './components/Preview';
import QRStudio from './components/QRStudio';
import DataViewer from './components/DataViewer';
import ImageTools from './components/ImageTools';
import JsonTranslator from './components/JsonTranslator';
import DependencyUpdater from './components/DependencyUpdater';
import ApiKeyModal from './components/ApiKeyModal';
import Sidebar from './components/Sidebar';
import { generateAsset } from './services/geminiService';
import { AssetType, AvatarStyle, LogoStyle, ColorTheme, GeneratedImage, WorkspaceView } from './types';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keySource, setKeySource] = useState<'env' | 'storage' | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Navigation State
  const [view, setView] = useState<WorkspaceView>('identity');

  // Generation Config State
  const [assetType, setAssetType] = useState<AssetType>('avatar');

  // Style State
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('minimalist-flat');
  const [logoStyle, setLogoStyle] = useState<LogoStyle>('modern-minimalist');
  const [color, setColor] = useState<ColorTheme>('vibrant-blue');
  const [isTransparent, setIsTransparent] = useState<boolean>(true);
  const [bgColor, setBgColor] = useState<string>('#ffffff');

  // Logo Specific State
  const [brandName, setBrandName] = useState<string>('');
  const [logoContext, setLogoContext] = useState<string>('');

  // Output State
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      let foundKey: string | null = null;
      let source: 'env' | 'storage' | null = null;

      // 1. Check for injected key (AI Studio environment)
      if (import.meta.env.VITE_API_KEY) {
        foundKey = import.meta.env.VITE_API_KEY;
        source = 'env';
      }

      // 2. Check for AI Studio helper (Preview environment)
      if (!foundKey && window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey && import.meta.env.VITE_API_KEY) {
          foundKey = import.meta.env.VITE_API_KEY;
          source = 'env';
        }
      }

      // 3. Check LocalStorage (Hosted elsewhere)
      if (!foundKey) {
        foundKey = localStorage.getItem('gemini_api_key');
        if (foundKey) source = 'storage';
      }

      if (foundKey) {
        setApiKey(foundKey);
        setKeySource(source);
        setShowAuthModal(false);
      }
    };
    initAuth();
  }, []);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setKeySource('storage');
    setShowAuthModal(false);
  };

  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey(null);
    setKeySource(null);
    setShowAuthModal(false); // Stay as guest
  };

  const handleGenerate = useCallback(async () => {
    if (!apiKey) {
      setShowAuthModal(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const activeStyle = assetType === 'avatar' ? avatarStyle : logoStyle;

      const imageUrl = await generateAsset({
        apiKey,
        type: assetType,
        style: activeStyle,
        colorTheme: color,
        isTransparent,
        bgColor,
        brandName: assetType === 'logo' ? brandName : undefined,
        context: assetType === 'logo' ? logoContext : undefined
      });

      const newImage: GeneratedImage = {
        id: crypto.randomUUID(),
        url: imageUrl,
        type: assetType,
        details: assetType === 'logo' ? brandName : activeStyle.replace('-', ' '),
        timestamp: Date.now(),
      };

      setCurrentImage(newImage);
      setHistory(prev => [...prev, newImage]);

    } catch (err: any) {
      console.error(err);
      let message = "Failed to generate image. Please try again.";
      if (err.message && (err.message.includes("API Key") || err.message.includes("403"))) {
        message = "Invalid or expired API Key. Please check your configuration.";
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, assetType, avatarStyle, logoStyle, color, isTransparent, bgColor, brandName, logoContext]);

  // Helper to update style based on current asset type
  const handleStyleChange = (style: string) => {
    if (assetType === 'avatar') {
      setAvatarStyle(style as AvatarStyle);
    } else {
      setLogoStyle(style as LogoStyle);
    }
  };

  const currentStyleValue = assetType === 'avatar' ? avatarStyle : logoStyle;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">

      {showAuthModal && (
        <ApiKeyModal
          onSave={handleSaveApiKey}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        view={view}
        setView={setView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        apiKey={apiKey}
        keySource={keySource}
        onClearKey={handleClearKey}
        onAddKey={() => setShowAuthModal(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile Header */}
        <header className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-400 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <Box className="w-5 h-5 text-primary" />
              <span className="font-bold text-white">Nexus Studio</span>
            </div>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative custom-scrollbar">

          <div className="max-w-[1600px] mx-auto h-full flex flex-col">

            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 shrink-0">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {view === 'identity' ? (
              <div className="animate-in fade-in duration-300 pb-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-white">AI Identity Generator</h2>
                    <p className="text-slate-400 text-sm">Create avatars and logos with Gemini 3 Pro.</p>
                  </div>
                </div>

                {apiKey ? (
                  <div className="grid xl:grid-cols-12 gap-6 items-start">
                    {/* Controls */}
                    <div className="xl:col-span-4 space-y-6">
                      <Controls
                        assetType={assetType}
                        selectedStyle={currentStyleValue}
                        selectedColor={color}
                        isTransparent={isTransparent}
                        bgColor={bgColor}
                        brandName={brandName}
                        logoContext={logoContext}

                        onAssetTypeChange={setAssetType}
                        onStyleChange={handleStyleChange}
                        onColorChange={setColor}
                        onTransparentChange={setIsTransparent}
                        onBgColorChange={setBgColor}
                        onBrandNameChange={setBrandName}
                        onLogoContextChange={setLogoContext}

                        onGenerate={handleGenerate}
                        isGenerating={isGenerating}
                      />
                    </div>

                    {/* Preview */}
                    <div className="xl:col-span-8 h-full">
                      <Preview
                        image={currentImage}
                        history={history}
                        isGenerating={isGenerating}
                        onSelectHistory={setCurrentImage}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 sm:py-20">
                    <div className="bg-slate-900 border border-slate-700 p-8 md:p-12 rounded-3xl max-w-2xl w-full text-center shadow-2xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                      <div className="relative w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800 shadow-inner">
                        <Lock className="w-8 h-8 text-slate-500" />
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-4">Feature Locked</h3>
                      <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                        To generate custom AI assets, you must connect your Gemini API Key.
                      </p>

                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="bg-primary hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mx-auto"
                      >
                        <Key className="w-5 h-5" />
                        Connect API Key
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : view === 'qr' ? (
              <div className="animate-in fade-in duration-300 h-full">
                <QRStudio history={history} />
              </div>
            ) : view === 'image-tools' ? (
              <div className="animate-in fade-in duration-300 h-full">
                <ImageTools
                  apiKey={apiKey}
                  onAuthRequest={() => setShowAuthModal(true)}
                />
              </div>
            ) : view === 'json-translator' ? (
              <div className="animate-in fade-in duration-300 h-full">
                <JsonTranslator
                  apiKey={apiKey}
                  onAuthRequest={() => setShowAuthModal(true)}
                />
              </div>
            ) : view === 'dependency-updater' ? (
              <div className="animate-in fade-in duration-300 h-full">
                <DependencyUpdater />
              </div>
            ) : (
              <div className="animate-in fade-in duration-300 h-full">
                <DataViewer />
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
