
import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Briefcase, User, X, Upload, Image as ImageIcon } from 'lucide-react';
import { GeneratedImage } from '../types';

interface QRGeneratorProps {
  availableLogos: GeneratedImage[];
}

const QRGenerator: React.FC<QRGeneratorProps> = ({ availableLogos }) => {
  const [text, setText] = useState('https://example.com');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  
  // Logo Selection State
  const [selectedLogoId, setSelectedLogoId] = useState<string>('');
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);
  
  const [size] = useState(300);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateQR();
  }, [text, fgColor, bgColor, selectedLogoId, uploadedLogo, size]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedLogo(event.target?.result as string);
        setSelectedLogoId(''); // Deselect generated logo if upload is successful
      };
      reader.readAsDataURL(file);
    }
  };

  const generateQR = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // 1. Generate basic QR
      await QRCode.toCanvas(canvas, text, {
        width: size,
        margin: 1,
        color: {
          dark: fgColor,
          light: bgColor,
        },
        errorCorrectionLevel: 'H', // High error correction to allow for logo coverage
      });

      // 2. Determine which logo to use (Uploaded vs Generated)
      let logoUrl = '';
      if (uploadedLogo) {
        logoUrl = uploadedLogo;
      } else if (selectedLogoId) {
        const logo = availableLogos.find(l => l.id === selectedLogoId);
        if (logo) logoUrl = logo.url;
      }

      // 3. Draw Logo if available
      if (logoUrl) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = logoUrl;
          await new Promise((resolve) => {
            img.onload = resolve;
          });

          // Calculate logo size (approx 22% of QR size)
          const logoSize = size * 0.22;
          const logoPos = (size - logoSize) / 2;

          // Draw white background for logo to ensure readability
          // We draw a slightly larger rounded rect or square behind it
          ctx.fillStyle = bgColor;
          // Simple fill rect for background
          ctx.fillRect(logoPos - 2, logoPos - 2, logoSize + 4, logoSize + 4);

          // Draw logo
          ctx.drawImage(img, logoPos, logoPos, logoSize, logoSize);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `qrcode-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Settings */}
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Content (URL or Text)</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:ring-2 focus:ring-primary outline-none"
            placeholder="https://..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Dots Color</label>
            <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-slate-700">
               <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent"
               />
               <span className="text-xs font-mono text-slate-400">{fgColor}</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Background</label>
            <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-slate-700">
               <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent"
               />
               <span className="text-xs font-mono text-slate-400">{bgColor}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-700">
          <div className="flex justify-between items-center">
             <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
               <ImageIcon className="w-4 h-4" />
               Embed Logo
             </label>
             {(selectedLogoId || uploadedLogo) && (
               <button 
                onClick={() => { setSelectedLogoId(''); setUploadedLogo(null); }}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
               >
                 <X className="w-3 h-3" /> Remove Logo
               </button>
             )}
          </div>

          {/* Upload Section */}
          <div className="flex gap-4 items-start">
             <div className="relative">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label 
                  htmlFor="logo-upload"
                  className={`flex flex-col items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                    uploadedLogo 
                      ? 'border-primary bg-primary/10' 
                      : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  {uploadedLogo ? (
                    <img src={uploadedLogo} alt="Uploaded" className="w-full h-full object-cover rounded-md opacity-80" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-500">Upload</span>
                    </>
                  )}
                </label>
                {uploadedLogo && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border border-slate-900"></div>
                )}
             </div>

             <div className="flex-1">
                 <p className="text-xs text-slate-500 mb-2">Or select from Identity Studio:</p>
                 {availableLogos.length === 0 ? (
                    <div className="p-3 bg-slate-900/50 rounded-lg text-center text-slate-500 text-xs italic">
                      No generated assets yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                      {availableLogos.map((logo) => (
                        <button
                          key={logo.id}
                          onClick={() => { setSelectedLogoId(logo.id); setUploadedLogo(null); }}
                          className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                            selectedLogoId === logo.id 
                              ? 'border-primary ring-1 ring-primary/30' 
                              : 'border-slate-700 hover:border-slate-500 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={logo.url} alt="asset" className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 right-0 bg-black/60 p-0.5 rounded-tl">
                             {logo.type === 'avatar' ? <User className="w-2 h-2 text-white" /> : <Briefcase className="w-2 h-2 text-white" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
             </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex flex-col items-center justify-center p-8 bg-slate-800/50 rounded-2xl border border-slate-700">
        <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
           <canvas ref={canvasRef} className="max-w-full h-auto" />
        </div>
        
        <button
          onClick={handleDownload}
          className="bg-primary hover:bg-indigo-500 text-white py-2 px-6 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download QR Code
        </button>
      </div>
    </div>
  );
};

export default QRGenerator;
