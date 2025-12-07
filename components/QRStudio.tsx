
import React, { useState } from 'react';
import { QrCode, Scan, Box } from 'lucide-react';
import QRGenerator from './QRGenerator';
import QRScanner from './QRScanner';
import { GeneratedImage } from '../types';

interface QRStudioProps {
  history: GeneratedImage[];
}

const QRStudio: React.FC<QRStudioProps> = ({ history }) => {
  const [mode, setMode] = useState<'generate' | 'scan'>('generate');

  return (
    <div className="bg-slate-800/30 rounded-3xl border border-slate-700/50 p-6 md:p-8 min-h-full flex flex-col">
      <div className="mb-8 shrink-0">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
          <QrCode className="w-6 h-6 text-accent" />
          QR Studio
        </h2>
        
        {/* Prominent Tab Selection */}
        <div className="flex p-1 bg-slate-900/80 rounded-xl border border-slate-700 w-full md:w-fit">
          <button
            onClick={() => setMode('generate')}
            className={`flex-1 md:flex-none px-6 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              mode === 'generate' 
                ? 'bg-slate-700 text-white shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Box className="w-4 h-4" />
            QR Generator
          </button>
          <button
            onClick={() => setMode('scan')}
            className={`flex-1 md:flex-none px-6 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              mode === 'scan' 
                ? 'bg-accent text-slate-900 shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Scan className="w-4 h-4" />
            QR Scanner
          </button>
        </div>
      </div>

      <div className="animate-in fade-in duration-300 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {mode === 'generate' ? (
          <div>
            <p className="text-slate-400 text-sm mb-6">Create styled QR codes. You can embed your AI-generated logos or upload custom ones.</p>
            <QRGenerator availableLogos={history} />
          </div>
        ) : (
          <div>
            <p className="text-slate-400 text-sm mb-6">Scan QR codes using your camera or upload an image file to decode.</p>
            <QRScanner />
          </div>
        )}
      </div>
    </div>
  );
};

export default QRStudio;
