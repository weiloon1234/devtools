
import React from 'react';
import {
  Wand2, QrCode, Image, Languages, Package, FileCode,
  Cpu, CheckCircle2, LogOut, Key, X, Smartphone
} from 'lucide-react';
import { WorkspaceView } from '../types';

interface SidebarProps {
  view: WorkspaceView;
  setView: (view: WorkspaceView) => void;
  isOpen: boolean;
  onClose: () => void;
  apiKey: string | null;
  keySource: 'env' | 'storage' | null;
  onClearKey: () => void;
  onAddKey: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  view,
  setView,
  isOpen,
  onClose,
  apiKey,
  keySource,
  onClearKey,
  onAddKey
}) => {

  const navItems: { id: WorkspaceView; label: string; icon: React.ReactNode }[] = [
    { id: 'identity', label: 'Identity Generator', icon: <Wand2 className="w-5 h-5" /> },
    { id: 'qr', label: 'QR Tools', icon: <QrCode className="w-5 h-5" /> },
    { id: 'image-tools', label: 'Image Tools', icon: <Image className="w-5 h-5" /> },
    { id: 'app-icon-generator', label: 'App Icon Generator', icon: <Smartphone className="w-5 h-5" /> },
    { id: 'json-translator', label: 'JSON Translator', icon: <Languages className="w-5 h-5" /> },
    { id: 'dependency-updater', label: 'Dependency Updater', icon: <Package className="w-5 h-5" /> },
    { id: 'viewer', label: 'Data Viewer', icon: <FileCode className="w-5 h-5" /> },
  ];

  const handleNavClick = (id: WorkspaceView) => {
    setView(id);
    if (window.innerWidth < 1024) { // Close on mobile selection
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col h-full ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        {/* Header / Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
              <img src="/logo.png" alt="Devs Tools" className="w-6 h-6 object-contain" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Devs Tools
            </h1>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Apps</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${view === item.id
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <div className={`${view === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'}`}>
                {item.icon}
              </div>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer / Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 shrink-0 space-y-4">

          {/* Model Info */}
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>Gemini 3 Pro</span>
          </div>

          {/* Key Status */}
          {apiKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-green-400 bg-green-950/30 px-3 py-2 rounded-lg border border-green-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="truncate flex-1">{keySource === 'env' ? 'AI Studio Key' : 'Custom Key'}</span>
              </div>
              <button
                onClick={() => { onClearKey(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all border border-red-500/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                Clear Key
              </button>
            </div>
          ) : (
            <button
              onClick={() => { onAddKey(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20 hover:border-primary/50"
            >
              <Key className="w-4 h-4" />
              Connect Gemini API
            </button>
          )}

          <div className="text-[10px] text-slate-600 text-center pt-2">
            v1.2.0 • Serverless
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
