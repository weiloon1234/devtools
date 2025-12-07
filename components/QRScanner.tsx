
import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, Upload, Link as LinkIcon, AlertCircle, Copy, Check, Loader2 } from 'lucide-react';

const QRScanner: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'camera' | 'file'>('camera');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Camera Logic
  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab]);

  const startCamera = async () => {
    setError(null);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to access camera. Please check permissions or try uploading an image.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    cancelAnimationFrame(animationRef.current);
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (canvas) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            setScanResult(code.data);
            // Optional: Draw box around QR
            // drawQuad(code.location, ctx);
          }
        }
      }
    }
    animationRef.current = requestAnimationFrame(tick);
  };

  // File Upload Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setScanResult(null);
    setIsScanning(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resize large images to improve performance
        const MAX_SIZE = 1000;
        if (width > MAX_SIZE || height > MAX_SIZE) {
            const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            setScanResult(code.data);
          } else {
            setError("No QR code found in this image.");
          }
        }
        setIsScanning(false);
      };
      img.onerror = () => {
          setError("Failed to load image.");
          setIsScanning(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCopy = () => {
    if (scanResult) {
      navigator.clipboard.writeText(scanResult);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-900 p-1 rounded-lg w-fit mx-auto border border-slate-700">
        <button
          onClick={() => setActiveTab('camera')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
            activeTab === 'camera' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          Camera Scan
        </button>
        <button
          onClick={() => setActiveTab('file')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
            activeTab === 'file' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload Image
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-xl min-h-[400px] flex flex-col items-center justify-center">
        {activeTab === 'camera' ? (
          <div className="relative w-full max-w-lg aspect-video bg-black rounded-xl overflow-hidden mb-6 group ring-4 ring-slate-900 shadow-2xl">
            <video ref={videoRef} className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Overlay Grid */}
            <div className="absolute inset-0 border-2 border-primary/30 rounded-xl pointer-events-none">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary -translate-x-1 -translate-y-1"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary translate-x-1 -translate-y-1"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary -translate-x-1 translate-y-1"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary translate-x-1 translate-y-1"></div>
               </div>
               
               {/* Scanning Line Animation */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 overflow-hidden">
                 <div className="w-full h-1 bg-primary/50 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-[scan_2s_linear_infinite]"></div>
               </div>
            </div>
            
            {!videoRef.current?.srcObject && !error && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-lg mb-6">
            <label 
              htmlFor="qr-file-upload" 
              className={`border-2 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                 isScanning 
                   ? 'border-primary/50 bg-primary/5' 
                   : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
                id="qr-file-upload" 
                disabled={isScanning}
              />
              
              {isScanning ? (
                <>
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-lg font-medium text-primary">Processing Image...</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-500 mb-4" />
                  <p className="text-lg font-medium text-slate-300">Click to upload QR image</p>
                  <p className="text-sm text-slate-500 mt-2">Supports PNG, JPG, WEBP</p>
                </>
              )}
            </label>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-6 py-4 rounded-xl mb-6 w-full max-w-lg animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {scanResult && (
          <div className="w-full max-w-lg bg-slate-900 border border-green-500/30 rounded-xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-4">
               <div className="bg-green-500/20 p-2 rounded-full">
                 <Check className="w-5 h-5 text-green-400" />
               </div>
               <div>
                  <p className="text-sm font-bold text-green-400 uppercase tracking-wider">Scan Successful</p>
                  <p className="text-xs text-slate-500">Decoded content found</p>
               </div>
            </div>
            
            <div className="flex items-stretch gap-2 mb-2">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg text-slate-300 break-all flex-1 font-mono text-sm max-h-40 overflow-y-auto custom-scrollbar">
                {scanResult}
              </div>
              <div className="flex flex-col gap-2">
                 <button 
                  onClick={handleCopy}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-700"
                  title="Copy to clipboard"
                >
                  {isCopied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
                {scanResult.startsWith('http') && (
                  <a 
                    href={scanResult} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-700"
                    title="Open URL"
                  >
                    <LinkIcon className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => setScanResult(null)}
              className="w-full py-2 mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Scan Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
