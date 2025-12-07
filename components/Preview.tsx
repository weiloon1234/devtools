
import React from 'react';
import { Download, RefreshCw, Maximize2, Briefcase, User } from 'lucide-react';
import { GeneratedImage } from '../types';

interface PreviewProps {
  image: GeneratedImage | null;
  history: GeneratedImage[];
  isGenerating: boolean;
  onSelectHistory: (image: GeneratedImage) => void;
}

const Preview: React.FC<PreviewProps> = ({ image, history, isGenerating, onSelectHistory }) => {
  const handleDownload = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.url;
    link.download = `nexus-studio-${img.type}-${img.timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Main Preview Card */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8 rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden group flex-1">
        
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5 pointer-events-none" />

        {isGenerating ? (
          <div className="flex flex-col items-center gap-6 animate-pulse z-10">
            <div className="w-64 h-64 rounded-full bg-slate-700/50 relative overflow-hidden border-4 border-slate-700/30">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-full h-full -translate-x-full animate-[shimmer_1.5s_infinite]" />
            </div>
            <div className="flex flex-col items-center gap-2">
                <p className="text-slate-300 font-medium text-lg">Generating Asset...</p>
                <p className="text-slate-500 text-sm">Designing pixels, applying styles</p>
            </div>
          </div>
        ) : image ? (
          <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
                {image.type === 'avatar' ? <User className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                <span className="text-sm font-medium uppercase tracking-wider">{image.details}</span>
            </div>

            <div className="relative group/image">
              <img
                src={image.url}
                alt="Generated Asset"
                className="w-80 h-80 md:w-96 md:h-96 rounded-2xl shadow-2xl border-4 border-slate-700/50 object-cover bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-800"
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 pointer-events-none" />
            </div>
            
            <div className="flex gap-4 w-full">
              <button
                onClick={() => handleDownload(image)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 border border-slate-600"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
              <button
                onClick={() => window.open(image.url, '_blank')}
                className="bg-slate-900 hover:bg-slate-950 text-slate-300 p-3 rounded-xl border border-slate-700 transition-colors"
                title="Open full size"
              >
                  <Maximize2 className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-2">500x500px • PNG • {image.type === 'avatar' ? 'Avatar' : 'Logo'}</p>
          </div>
        ) : (
          <div className="text-center z-10 max-w-sm">
            <div className="w-24 h-24 bg-slate-700/30 rounded-full mx-auto mb-6 flex items-center justify-center text-slate-500">
              <RefreshCw className="w-10 h-10 opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Start Generating</h3>
            <p className="text-slate-400 leading-relaxed">
              Configure your settings and click generate to create custom AI assets.
            </p>
          </div>
        )}
      </div>

      {/* History Strip */}
      {history.length > 0 && (
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 p-4 rounded-xl shrink-0">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">Session History</h3>
             <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {history.slice().reverse().map((histImg) => (
                    <button 
                        key={histImg.id}
                        onClick={() => onSelectHistory(histImg)}
                        className={`relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${image?.id === histImg.id ? 'border-primary ring-2 ring-primary/20' : 'border-slate-700 opacity-60 hover:opacity-100'}`}
                    >
                        <img src={histImg.url} className="w-full h-full object-cover bg-slate-800" alt="history" />
                        <div className="absolute bottom-0 right-0 p-1 bg-black/50 rounded-tl-md">
                            {histImg.type === 'avatar' ? <User className="w-3 h-3 text-white" /> : <Briefcase className="w-3 h-3 text-white" />}
                        </div>
                    </button>
                ))}
             </div>
        </div>
      )}
    </div>
  );
};

export default Preview;
