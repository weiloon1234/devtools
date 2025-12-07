
import React, { useState } from 'react';
import { Key, ExternalLink, ShieldCheck, X, Trash2, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
  onClose?: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, onClose }) => {
  const [inputKey, setInputKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      onSave(inputKey.trim());
    }
  };

  const handleClearStorage = () => {
    if (window.confirm("Are you sure you want to clear all stored connection keys?")) {
      localStorage.removeItem('gemini_api_key');
      alert("Local connection cleared.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Connect to Google Gemini
            </h2>
            <p className="text-slate-400 text-sm mt-1">Enable AI features for Devs Tools</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">

          {/* Step 1: Get Key */}
          <div className="mb-8 relative">
            <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-slate-700/50"></div>

            <div className="relative z-10 mb-4">
              <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider mb-2 inline-block">Step 1</span>
              <h3 className="text-lg font-medium text-white">Get your free Access Key</h3>
              <p className="text-slate-400 text-sm mt-1">
                You need a key from Google to use their AI. It's free and takes 30 seconds.
              </p>
            </div>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-primary/50 p-4 rounded-xl transition-all group cursor-pointer mb-2"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white p-2 rounded-lg">
                  <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white group-hover:text-primary transition-colors">Create API Key</p>
                  <p className="text-xs text-slate-500">Opens Google AI Studio</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-slate-500 group-hover:text-white" />
            </a>

            <div className="flex gap-3 mt-2">
              <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Free Tier Available
              </span>
              <span className="text-[10px] bg-slate-700 text-slate-300 border border-slate-600 px-2 py-0.5 rounded-full">
                No Credit Card Required
              </span>
            </div>
          </div>

          {/* Step 2: Paste Key */}
          <div className="relative">
            <div className="relative z-10 mb-4">
              <span className="bg-slate-600 text-white text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider mb-2 inline-block">Step 2</span>
              <h3 className="text-lg font-medium text-white">Paste Key to Connect</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Paste your key here (starts with AIzaSy...)"
                  className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono text-sm shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={!inputKey.trim()}
                className="w-full bg-primary hover:bg-indigo-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
              >
                <ShieldCheck className="w-5 h-5" />
                Connect & Start Creating
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950/50 p-4 border-t border-slate-800 shrink-0">
          {onClose && (
            <button
              onClick={onClose}
              className="w-full mb-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-1"
            >
              Skip for now (Guest Mode) <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <HelpCircle className="w-3 h-3" />
              <span>Key is stored locally on your device.</span>
            </div>

            <button
              onClick={handleClearStorage}
              className="text-xs text-slate-600 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;