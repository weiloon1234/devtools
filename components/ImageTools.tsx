
import React, { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, Crop, Sliders, Download, RotateCcw, Lock, Unlock, X, Check, FileImage, Wand2, Sparkles, Scissors } from 'lucide-react';
import { removeBackgroundWithAI } from '../services/geminiService';

type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

interface ImageToolsProps {
  apiKey: string | null;
  onAuthRequest: () => void;
}

const ImageTools: React.FC<ImageToolsProps> = ({ apiKey, onAuthRequest }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalDims, setOriginalDims] = useState<{ w: number; h: number } | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Resize State
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);

  // Crop State
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 }); // In percentages (0-100)
  
  // Export State
  const [format, setFormat] = useState<ExportFormat>('image/png');
  const [quality, setQuality] = useState(0.9);

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; cropX: number; cropY: number; cropW: number; cropH: number; type: 'move' | 'nw' | 'ne' | 'sw' | 'se' } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        loadImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        loadImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadImage = (src: string) => {
    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setOriginalDims({ w: img.width, h: img.height });
      setWidth(img.width);
      setHeight(img.height);
      setAspectRatio(img.width / img.height);
      // Default crop: centered 80%
      setCrop({ x: 10, y: 10, w: 80, h: 80 });
      setIsCropping(false);
      setAiError(null);
    };
    img.src = src;
  };

  // --- Resize Logic ---

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockRatio) {
      setHeight(Math.round(val / aspectRatio));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockRatio) {
      setWidth(Math.round(val * aspectRatio));
    }
  };

  const toggleLock = () => {
    if (!lockRatio) {
      // Re-calculate ratio based on current values when locking
      if (height > 0) setAspectRatio(width / height);
    }
    setLockRatio(!lockRatio);
  };

  // --- Crop Logic ---

  const handleCropMouseDown = (e: React.MouseEvent, type: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault();
    e.stopPropagation();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.w,
      cropH: crop.h,
      type
    };
    document.addEventListener('mousemove', handleCropMouseMove);
    document.addEventListener('mouseup', handleCropMouseUp);
  };

  const handleCropMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current || !containerRef.current) return;
    
    const { x: startX, y: startY, cropX, cropY, cropW, cropH, type } = dragStartRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Convert px delta to percentage
    const deltaX = ((e.clientX - startX) / containerRect.width) * 100;
    const deltaY = ((e.clientY - startY) / containerRect.height) * 100;

    let newCrop = { x: cropX, y: cropY, w: cropW, h: cropH };

    if (type === 'move') {
      newCrop.x = Math.max(0, Math.min(100 - cropW, cropX + deltaX));
      newCrop.y = Math.max(0, Math.min(100 - cropH, cropY + deltaY));
    } else {
      // Resize handles
      if (type.includes('n')) {
        const maxY = cropY + cropH - 5; // Min height 5%
        const newY = Math.max(0, Math.min(maxY, cropY + deltaY));
        newCrop.y = newY;
        newCrop.h = cropH + (cropY - newY);
      }
      if (type.includes('s')) {
        const newH = Math.max(5, Math.min(100 - cropY, cropH + deltaY));
        newCrop.h = newH;
      }
      if (type.includes('w')) {
        const maxX = cropX + cropW - 5;
        const newX = Math.max(0, Math.min(maxX, cropX + deltaX));
        newCrop.x = newX;
        newCrop.w = cropW + (cropX - newX);
      }
      if (type.includes('e')) {
        const newW = Math.max(5, Math.min(100 - cropX, cropW + deltaX));
        newCrop.w = newW;
      }
    }

    setCrop(newCrop);
  }, []);

  const handleCropMouseUp = useCallback(() => {
    document.removeEventListener('mousemove', handleCropMouseMove);
    document.removeEventListener('mouseup', handleCropMouseUp);
    dragStartRef.current = null;
  }, [handleCropMouseMove]);

  const applyCrop = () => {
    if (!imageRef.current || !originalDims) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate crop coordinates in original image pixels
    const sx = (crop.x / 100) * originalDims.w;
    const sy = (crop.y / 100) * originalDims.h;
    const sw = (crop.w / 100) * originalDims.w;
    const sh = (crop.h / 100) * originalDims.h;

    canvas.width = sw;
    canvas.height = sh;

    // Draw the sliced image
    ctx.drawImage(imageRef.current, sx, sy, sw, sh, 0, 0, sw, sh);

    const croppedDataUrl = canvas.toDataURL(format);
    loadImage(croppedDataUrl); // Reload image state with new cropped version
  };

  // --- Trim Transparency Logic ---

  const handleTrimTransparency = () => {
    if (!imageRef.current || !originalDims) return;
    
    const canvas = document.createElement('canvas');
    const w = originalDims.w;
    const h = originalDims.h;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw original
    ctx.drawImage(imageRef.current, 0, 0);
    const pixels = ctx.getImageData(0, 0, w, h);
    const { data } = pixels;
    
    let top = 0, bottom = h, left = 0, right = w;

    // Scan Top
    for (let y = 0; y < h; y++) {
       let rowHasContent = false;
       for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 0) { // Alpha > 0
             rowHasContent = true;
             break;
          }
       }
       if (rowHasContent) {
          top = y;
          break;
       }
    }
    
    // Scan Bottom
    for (let y = h - 1; y >= 0; y--) {
       let rowHasContent = false;
       for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 0) {
             rowHasContent = true;
             break;
          }
       }
       if (rowHasContent) {
          bottom = y + 1; // +1 because we want width/height, not index
          break;
       }
    }

    // Handle Empty Image
    if (bottom <= top) return; // Image is empty

    // Scan Left
    for (let x = 0; x < w; x++) {
       let colHasContent = false;
       for (let y = top; y < bottom; y++) {
          if (data[(y * w + x) * 4 + 3] > 0) {
             colHasContent = true;
             break;
          }
       }
       if (colHasContent) {
          left = x;
          break;
       }
    }

    // Scan Right
    for (let x = w - 1; x >= 0; x--) {
       let colHasContent = false;
       for (let y = top; y < bottom; y++) {
          if (data[(y * w + x) * 4 + 3] > 0) {
             colHasContent = true;
             break;
          }
       }
       if (colHasContent) {
          right = x + 1;
          break;
       }
    }

    const trimW = right - left;
    const trimH = bottom - top;

    // Create trimmed canvas
    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = trimW;
    trimmedCanvas.height = trimH;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (!trimmedCtx) return;

    trimmedCtx.putImageData(ctx.getImageData(left, top, trimW, trimH), 0, 0);
    
    // Update state
    loadImage(trimmedCanvas.toDataURL(format));
  };

  // --- AI Logic ---

  const handleRemoveBackground = async () => {
    if (!apiKey) {
      onAuthRequest();
      return;
    }
    if (!imageSrc) return;

    setIsProcessingAI(true);
    setAiError(null);
    try {
      const newImage = await removeBackgroundWithAI(apiKey, imageSrc);
      loadImage(newImage);
    } catch (err: any) {
      console.error(err);
      setAiError("Failed to remove background. The image format might not be supported or the request timed out.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  // --- Export Logic ---

  const handleDownload = () => {
    if (!imageRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // High quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imageRef.current, 0, 0, width, height);

      const link = document.createElement('a');
      link.download = `processed-image.${format.split('/')[1]}`;
      link.href = canvas.toDataURL(format, quality);
      link.click();
    }
  };

  // Render Helpers
  const formatLabel = {
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'image/webp': 'WEBP',
  };

  return (
    <div className="bg-slate-800/30 rounded-3xl border border-slate-700/50 p-6 md:p-8 min-h-full flex flex-col">
      <div className="flex justify-between items-start mb-8 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-pink-400" />
            Image Tools
          </h2>
          <p className="text-slate-400 text-sm mt-1">Resize, crop, and convert images locally. No server upload.</p>
        </div>
        
        {imageSrc && (
          <button 
             onClick={() => setImageSrc(null)}
             className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors flex items-center gap-2"
          >
             <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {!imageSrc ? (
        <div 
          className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center transition-all animate-in fade-in duration-300 flex-1 ${
            isDragging 
              ? 'border-primary bg-primary/10 scale-[1.02] shadow-xl shadow-primary/10' 
              : 'border-slate-700 hover:bg-slate-800/30'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner transition-colors ${
            isDragging ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-500'
          }`}>
            <Upload className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {isDragging ? 'Drop Image Here' : 'Upload an Image'}
          </h3>
          <p className="text-slate-400 max-w-sm mb-6">Drag and drop or select an image to start resizing and converting.</p>
          <label className="bg-primary hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-medium cursor-pointer transition-all shadow-lg hover:scale-105 active:scale-95">
             Select File
             <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 min-h-0">
          
          {/* Main Editor Viewport */}
          <div className="lg:col-span-8 bg-slate-900/50 rounded-2xl border border-slate-700 flex items-center justify-center p-4 relative overflow-hidden min-h-[400px]">
             {/* Background Pattern */}
             <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
             
             <div className="relative max-w-full max-h-[600px] shadow-2xl" ref={containerRef}>
                <img 
                  ref={imageRef}
                  src={imageSrc} 
                  alt="Editing" 
                  className={`max-w-full max-h-[600px] object-contain block transition-opacity ${isProcessingAI ? 'opacity-50 blur-sm' : ''}`}
                  onDragStart={(e) => e.preventDefault()}
                />
                
                {isProcessingAI && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white">
                     <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                     <p className="font-medium bg-black/50 px-4 py-1 rounded-full backdrop-blur-sm">Removing Background...</p>
                  </div>
                )}
                
                {/* Crop Overlay */}
                {isCropping && !isProcessingAI && (
                  <>
                    <div className="absolute inset-0 bg-black/50 pointer-events-none" />
                    <div 
                      className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move group"
                      style={{
                        left: `${crop.x}%`,
                        top: `${crop.y}%`,
                        width: `${crop.w}%`,
                        height: `${crop.h}%`
                      }}
                      onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                    >
                      {/* Grid Lines */}
                      <div className="absolute inset-0 flex flex-col pointer-events-none opacity-0 group-hover:opacity-40 transition-opacity">
                         <div className="flex-1 border-b border-white/50" />
                         <div className="flex-1 border-b border-white/50" />
                         <div className="flex-1" />
                      </div>
                      <div className="absolute inset-0 flex pointer-events-none opacity-0 group-hover:opacity-40 transition-opacity">
                         <div className="flex-1 border-r border-white/50" />
                         <div className="flex-1 border-r border-white/50" />
                         <div className="flex-1" />
                      </div>

                      {/* Handles */}
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-400 cursor-nw-resize" onMouseDown={(e) => handleCropMouseDown(e, 'nw')} />
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-400 cursor-ne-resize" onMouseDown={(e) => handleCropMouseDown(e, 'ne')} />
                      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-400 cursor-sw-resize" onMouseDown={(e) => handleCropMouseDown(e, 'sw')} />
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-400 cursor-se-resize" onMouseDown={(e) => handleCropMouseDown(e, 'se')} />
                    </div>
                  </>
                )}
             </div>
          </div>

          {/* Controls Panel */}
          <div className="lg:col-span-4 space-y-6 overflow-y-auto custom-scrollbar max-h-full pr-2">
            
            {/* 1. Dimensions Info */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Original Size</p>
                <p className="text-white font-mono">{originalDims?.w} x {originalDims?.h} px</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Aspect Ratio</p>
                <p className="text-white font-mono">{originalDims ? (originalDims.w / originalDims.h).toFixed(2) : '-'}</p>
              </div>
            </div>

            {/* 2. AI Magic Tools */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4 rounded-xl border border-indigo-500/20 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> AI Magic Tools
              </h4>
              <p className="text-[10px] text-slate-400">Powered by Gemini 3 Pro Vision</p>
              
              <button 
                onClick={handleRemoveBackground}
                disabled={isProcessingAI || isCropping}
                className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all group ${
                  !apiKey 
                    ? 'bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                } ${isProcessingAI ? 'opacity-70 cursor-wait' : ''}`}
              >
                 {!apiKey ? (
                   <>
                     <Lock className="w-3.5 h-3.5" /> Unlock Background Removal
                   </>
                 ) : (
                   <>
                     <Wand2 className="w-3.5 h-3.5" /> Remove Background
                   </>
                 )}
              </button>
              {aiError && (
                 <p className="text-xs text-red-300 bg-red-500/10 p-2 rounded border border-red-500/20">{aiError}</p>
              )}
            </div>

            {/* 3. Smart Tools (Trim) */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Scissors className="w-4 h-4" /> Smart Trim
              </h4>
              <button 
                onClick={handleTrimTransparency}
                disabled={isProcessingAI || isCropping}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                title="Automatically remove empty transparent space around the subject"
              >
                 <Scissors className="w-4 h-4" /> Trim Transparency
              </button>
            </div>

            <div className="h-px bg-slate-700" />

            {/* 4. Crop Tool */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Crop className="w-4 h-4" /> Manual Crop
              </h4>
              {isCropping ? (
                <div className="flex gap-2">
                  <button 
                    onClick={applyCrop}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Apply
                  </button>
                  <button 
                    onClick={() => setIsCropping(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsCropping(true)}
                  disabled={isProcessingAI}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Enter Crop Mode
                </button>
              )}
            </div>

            <div className="h-px bg-slate-700" />

            {/* 5. Resize Controls */}
            <div className="space-y-4 opacity-100 transition-opacity" style={{ opacity: isCropping ? 0.3 : 1, pointerEvents: isCropping ? 'none' : 'auto' }}>
               <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                 <Sliders className="w-4 h-4" /> Resize
               </h4>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-xs text-slate-500">Width (px)</label>
                   <input 
                     type="number" 
                     value={width}
                     onChange={(e) => handleWidthChange(Number(e.target.value))}
                     className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:ring-2 focus:ring-primary outline-none"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs text-slate-500">Height (px)</label>
                   <input 
                     type="number" 
                     value={height}
                     onChange={(e) => handleHeightChange(Number(e.target.value))}
                     className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:ring-2 focus:ring-primary outline-none"
                   />
                 </div>
               </div>

               <div className="flex items-center gap-2">
                 <button 
                   onClick={toggleLock}
                   className={`p-2 rounded-lg border transition-colors ${lockRatio ? 'bg-primary/20 border-primary text-primary' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                   title={lockRatio ? "Unlock Ratio" : "Lock Ratio"}
                 >
                    {lockRatio ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                 </button>
                 <span className="text-xs text-slate-400">
                    {lockRatio ? "Aspect ratio locked" : "Aspect ratio unlocked"}
                 </span>
               </div>
            </div>

            <div className="h-px bg-slate-700" />

            {/* 6. Export & Download */}
            <div className="space-y-4" style={{ opacity: isCropping ? 0.3 : 1, pointerEvents: isCropping ? 'none' : 'auto' }}>
               <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                 <FileImage className="w-4 h-4" /> Output Format
               </h4>

               <div className="flex gap-2 p-1 bg-slate-900 rounded-lg border border-slate-700">
                 {(['image/png', 'image/jpeg', 'image/webp'] as const).map((fmt) => (
                   <button
                     key={fmt}
                     onClick={() => setFormat(fmt)}
                     className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                       format === fmt ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
                     }`}
                   >
                     {formatLabel[fmt]}
                   </button>
                 ))}
               </div>

               {format !== 'image/png' && (
                 <div className="space-y-2">
                   <div className="flex justify-between text-xs text-slate-400">
                     <span>Quality</span>
                     <span>{Math.round(quality * 100)}%</span>
                   </div>
                   <input 
                     type="range" 
                     min="0.1" 
                     max="1" 
                     step="0.05" 
                     value={quality}
                     onChange={(e) => setQuality(Number(e.target.value))}
                     className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                   />
                 </div>
               )}

               <button
                 onClick={handleDownload}
                 disabled={isProcessingAI}
                 className="w-full bg-primary hover:bg-indigo-500 text-white py-4 px-6 rounded-xl font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
               >
                 <Download className="w-5 h-5" />
                 Download Image
               </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ImageTools;
