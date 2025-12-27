
import React, { useState, useRef } from 'react';
import { Upload, Smartphone, Check, AlertCircle, Archive, Apple } from 'lucide-react';
import JSZip from 'jszip';

// Android icon sizes (mipmap folders)
const ANDROID_SIZES = [
    { name: 'mipmap-mdpi', size: 48 },
    { name: 'mipmap-hdpi', size: 72 },
    { name: 'mipmap-xhdpi', size: 96 },
    { name: 'mipmap-xxhdpi', size: 144 },
    { name: 'mipmap-xxxhdpi', size: 192 },
];

const ANDROID_PLAYSTORE_SIZE = 512;

// iOS icon sizes
const IOS_SIZES = [
    { filename: 'AppIcon-60@2x.png', size: 120, idiom: 'iphone', scale: '2x', sizeLabel: '60x60' },
    { filename: 'AppIcon-60@3x.png', size: 180, idiom: 'iphone', scale: '3x', sizeLabel: '60x60' },
    { filename: 'AppIcon-76@2x.png', size: 152, idiom: 'ipad', scale: '2x', sizeLabel: '76x76' },
    { filename: 'AppIcon-83.5@2x.png', size: 167, idiom: 'ipad', scale: '2x', sizeLabel: '83.5x83.5' },
    { filename: 'AppIcon-1024.png', size: 1024, idiom: 'ios-marketing', scale: '1x', sizeLabel: '1024x1024' },
    { filename: 'AppIcon-29@2x.png', size: 58, idiom: 'universal', scale: '2x', sizeLabel: '29x29' },
    { filename: 'AppIcon-29@3x.png', size: 87, idiom: 'universal', scale: '3x', sizeLabel: '29x29' },
    { filename: 'AppIcon-40@2x.png', size: 80, idiom: 'universal', scale: '2x', sizeLabel: '40x40' },
    { filename: 'AppIcon-40@3x.png', size: 120, idiom: 'universal', scale: '3x', sizeLabel: '40x40' },
];

const AppIconGenerator: React.FC = () => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Options
    const [generateAndroid, setGenerateAndroid] = useState(true);
    const [generateIOS, setGenerateIOS] = useState(true);
    const [useTransparent, setUseTransparent] = useState(false);
    const [bgColor, setBgColor] = useState('#ffffff');

    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
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
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
                setImageSrc(result);
                setImageDims({ w: img.width, h: img.height });
                setError(null);
                setSuccess(false);
            };
            img.src = result;
        };
        reader.readAsDataURL(file);
    };

    const isValidSize = imageDims && imageDims.w === 1024 && imageDims.h === 1024;
    const isSquare = imageDims && imageDims.w === imageDims.h;

    // Resize image to specific size
    const resizeImage = (
        img: HTMLImageElement,
        size: number,
        transparent: boolean,
        backgroundColor: string
    ): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // Fill background if not transparent
            if (!transparent) {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, size, size);
            }

            // High quality scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, size, size);

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob'));
                }
            }, 'image/png');
        });
    };

    // Generate Contents.json for iOS
    const generateContentsJson = () => {
        const images = IOS_SIZES.map((icon) => ({
            filename: icon.filename,
            idiom: icon.idiom,
            scale: icon.scale,
            size: icon.sizeLabel,
        }));

        return JSON.stringify({
            images,
            info: { author: 'devtools', version: 1 }
        }, null, 2);
    };

    const handleGenerate = async () => {
        if (!imageRef.current || !isValidSize) return;
        if (!generateAndroid && !generateIOS) {
            setError('Please select at least one platform');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setSuccess(false);

        try {
            const zip = new JSZip();
            const img = imageRef.current;

            // Generate Android icons
            if (generateAndroid) {
                const androidFolder = zip.folder('android');
                if (androidFolder) {
                    // Mipmap folders
                    for (const { name, size } of ANDROID_SIZES) {
                        const folder = androidFolder.folder(name);
                        if (folder) {
                            const blob = await resizeImage(img, size, useTransparent, bgColor);
                            folder.file('ic_launcher.png', blob);
                        }
                    }

                    // Play Store icon (512x512)
                    const playstoreBlob = await resizeImage(img, ANDROID_PLAYSTORE_SIZE, useTransparent, bgColor);
                    androidFolder.file('playstore-icon.png', playstoreBlob);
                }
            }

            // Generate iOS icons (always opaque)
            if (generateIOS) {
                const iosFolder = zip.folder('ios');
                const appIconSet = iosFolder?.folder('AppIcon.appiconset');
                if (appIconSet) {
                    // Generate all icon sizes
                    for (const icon of IOS_SIZES) {
                        const blob = await resizeImage(img, icon.size, false, bgColor); // iOS never transparent
                        appIconSet.file(icon.filename, blob);
                    }

                    // Add Contents.json
                    appIconSet.file('Contents.json', generateContentsJson());
                }
            }

            // Generate and download zip
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'app-icons.zip';
            link.click();
            URL.revokeObjectURL(url);

            setSuccess(true);
        } catch (err) {
            console.error(err);
            setError('Failed to generate icons. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const reset = () => {
        setImageSrc(null);
        setImageDims(null);
        setError(null);
        setSuccess(false);
    };

    return (
        <div className="bg-slate-800/30 rounded-3xl border border-slate-700/50 p-6 md:p-8 min-h-full flex flex-col">
            <div className="flex justify-between items-start mb-8 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Smartphone className="w-6 h-6 text-emerald-400" />
                        App Icon Generator
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Generate app icons for Android & iOS from a single 1024×1024 image.
                    </p>
                </div>

                {imageSrc && (
                    <button
                        onClick={reset}
                        className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                    >
                        Reset
                    </button>
                )}
            </div>

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />

            {!imageSrc ? (
                // Upload Area
                <div
                    className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center transition-all animate-in fade-in duration-300 flex-1 ${isDragging
                        ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02] shadow-xl shadow-emerald-500/10'
                        : 'border-slate-700 hover:bg-slate-800/30'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div
                        className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner transition-colors ${isDragging ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                            }`}
                    >
                        <Upload className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {isDragging ? 'Drop Image Here' : 'Upload Your App Icon'}
                    </h3>
                    <p className="text-slate-400 max-w-sm mb-2">
                        Upload a <span className="text-emerald-400 font-medium">1024×1024 pixel</span> PNG image.
                    </p>
                    <p className="text-slate-500 text-sm mb-6">
                        This is the standard master size for both Android and iOS.
                    </p>
                    <label className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-medium cursor-pointer transition-all shadow-lg hover:scale-105 active:scale-95">
                        Select File
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileUpload} className="hidden" />
                    </label>
                </div>
            ) : (
                // Editor View
                <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 min-h-0">
                    {/* Preview */}
                    <div className="lg:col-span-7 bg-slate-900/50 rounded-2xl border border-slate-700 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                        {/* Checkerboard pattern for transparency */}
                        <div
                            className="absolute inset-0 opacity-20 pointer-events-none"
                            style={{
                                backgroundImage: `
                  linear-gradient(45deg, #374151 25%, transparent 25%),
                  linear-gradient(-45deg, #374151 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #374151 75%),
                  linear-gradient(-45deg, transparent 75%, #374151 75%)
                `,
                                backgroundSize: '20px 20px',
                                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                            }}
                        />

                        <div className="relative">
                            <img
                                ref={imageRef}
                                src={imageSrc}
                                alt="App Icon Preview"
                                className="max-w-full max-h-[400px] object-contain rounded-xl shadow-2xl"
                                style={{ backgroundColor: useTransparent ? 'transparent' : bgColor }}
                            />
                        </div>

                        {/* Dimensions Badge */}
                        <div className="mt-4 flex items-center gap-3">
                            <div
                                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 ${isValidSize
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    }`}
                            >
                                {isValidSize ? (
                                    <Check className="w-3.5 h-3.5" />
                                ) : (
                                    <AlertCircle className="w-3.5 h-3.5" />
                                )}
                                {imageDims?.w} × {imageDims?.h} px
                            </div>

                            {!isValidSize && (
                                <span className="text-amber-400 text-xs">
                                    {!isSquare ? 'Image must be square' : 'Recommended: 1024×1024'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="lg:col-span-5 space-y-6 overflow-y-auto custom-scrollbar max-h-full pr-2">
                        {/* Platform Selection */}
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Platforms</h4>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={generateAndroid}
                                    onChange={(e) => setGenerateAndroid(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800"
                                />
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                                        <Smartphone className="w-4 h-4 text-green-400" />
                                    </div>
                                    <div>
                                        <span className="text-white font-medium">Android</span>
                                        <p className="text-slate-500 text-xs">mipmap folders + Play Store icon</p>
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={generateIOS}
                                    onChange={(e) => setGenerateIOS(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800"
                                />
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-slate-500/20 flex items-center justify-center">
                                        <Apple className="w-4 h-4 text-slate-300" />
                                    </div>
                                    <div>
                                        <span className="text-white font-medium">iOS</span>
                                        <p className="text-slate-500 text-xs">AppIcon.appiconset with Contents.json</p>
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* Background Options */}
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Background</h4>

                            {generateAndroid && (
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useTransparent}
                                        onChange={(e) => setUseTransparent(e.target.checked)}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800"
                                    />
                                    <div>
                                        <span className="text-white font-medium">Keep transparent (Android only)</span>
                                        <p className="text-slate-500 text-xs">iOS requires opaque icons</p>
                                    </div>
                                </label>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs text-slate-400 block">
                                    {useTransparent ? 'iOS Background Color' : 'Background Color (both platforms)'}
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={bgColor}
                                        onChange={(e) => setBgColor(e.target.value)}
                                        className="w-12 h-10 rounded-lg border border-slate-600 bg-slate-900 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={bgColor}
                                        onChange={(e) => setBgColor(e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                                        maxLength={7}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Output Info */}
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Output Preview</h4>

                            {generateAndroid && (
                                <div className="text-xs text-slate-300 space-y-1">
                                    <p className="font-medium text-green-400">📁 android/</p>
                                    <p className="pl-4 text-slate-500">
                                        mipmap-mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi + playstore-icon.png
                                    </p>
                                </div>
                            )}

                            {generateIOS && (
                                <div className="text-xs text-slate-300 space-y-1">
                                    <p className="font-medium text-slate-300">📁 ios/AppIcon.appiconset/</p>
                                    <p className="pl-4 text-slate-500">
                                        9 icon sizes + Contents.json
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                                <Check className="w-5 h-5 shrink-0" />
                                Icons generated successfully! Check your downloads.
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={!isValidSize || isGenerating || (!generateAndroid && !generateIOS)}
                            className={`w-full py-4 px-6 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all ${isValidSize && !isGenerating && (generateAndroid || generateIOS)
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]'
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Archive className="w-5 h-5" />
                                    Generate & Download ZIP
                                </>
                            )}
                        </button>

                        {!isValidSize && imageDims && (
                            <p className="text-amber-400 text-xs text-center">
                                ⚠️ Please upload a 1024×1024 image for best results
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppIconGenerator;
