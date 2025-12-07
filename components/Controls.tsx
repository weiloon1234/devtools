import React from 'react';
import { AssetType, AvatarStyle, LogoStyle, ColorTheme } from '../types';
import { Palette, Layers, Sparkles, Image as ImageIcon, Briefcase, User } from 'lucide-react';

interface ControlsProps {
  assetType: AssetType;
  selectedStyle: string;
  selectedColor: ColorTheme;
  isTransparent: boolean;
  bgColor: string;
  brandName: string;
  logoContext: string;
  
  onAssetTypeChange: (type: AssetType) => void;
  onStyleChange: (style: string) => void;
  onColorChange: (color: ColorTheme) => void;
  onTransparentChange: (transparent: boolean) => void;
  onBgColorChange: (color: string) => void;
  onBrandNameChange: (name: string) => void;
  onLogoContextChange: (context: string) => void;
  
  onGenerate: () => void;
  isGenerating: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  assetType,
  selectedStyle,
  selectedColor,
  isTransparent,
  bgColor,
  brandName,
  logoContext,
  onAssetTypeChange,
  onStyleChange,
  onColorChange,
  onTransparentChange,
  onBgColorChange,
  onBrandNameChange,
  onLogoContextChange,
  onGenerate,
  isGenerating,
}) => {
  
  const avatarStyles: { value: AvatarStyle; label: string }[] = [
    { value: 'minimalist-flat', label: 'Minimalist Flat' },
    { value: 'geometric-abstract', label: 'Geometric Abstract' },
    { value: 'cute-robot', label: 'Cute Robot' },
    { value: '3d-clay', label: '3D Clay' },
    { value: 'pixel-art', label: 'Pixel Art' },
    { value: 'sketch-outline', label: 'Sketch Outline' },
  ];

  const logoStyles: { value: LogoStyle; label: string }[] = [
    { value: 'modern-minimalist', label: 'Modern Minimalist' },
    { value: 'badge-emblem', label: 'Badge / Emblem' },
    { value: 'monogram-lettermark', label: 'Monogram' },
    { value: 'tech-futuristic', label: 'Tech / Futuristic' },
    { value: 'organic-natural', label: 'Organic / Natural' },
    { value: 'abstract-icon', label: 'Abstract Icon' },
  ];

  const colors: { value: ColorTheme; label: string }[] = [
    { value: 'vibrant-blue', label: 'Vibrant Blue' },
    { value: 'warm-orange', label: 'Warm Orange' },
    { value: 'neutral-grayscale', label: 'Neutral Grayscale' },
    { value: 'pastel-mix', label: 'Pastel Mix' },
    { value: 'neon-cyberpunk', label: 'Neon Cyberpunk' },
    { value: 'forest-green', label: 'Forest Green' },
    { value: 'elegant-gold', label: 'Elegant Gold' },
  ];

  const currentStyles = assetType === 'avatar' ? avatarStyles : logoStyles;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-2xl shadow-xl flex flex-col gap-6">
      
      {/* Tabs */}
      <div className="bg-slate-900/80 p-1 rounded-xl flex gap-1 border border-slate-700">
        <button
          onClick={() => onAssetTypeChange('avatar')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            assetType === 'avatar' 
              ? 'bg-slate-700 text-white shadow-md' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          Unisex Avatar
        </button>
        <button
          onClick={() => onAssetTypeChange('logo')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            assetType === 'logo' 
              ? 'bg-primary text-white shadow-md' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Company Logo
        </button>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
          <Layers className="w-5 h-5 text-primary" />
          {assetType === 'avatar' ? 'Avatar Details' : 'Brand Identity'}
        </h2>
        
        <div className="space-y-4">
          
          {/* Logo Specific Inputs */}
          {assetType === 'logo' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-400">Brand Name</label>
                 <input 
                   type="text" 
                   value={brandName}
                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => onBrandNameChange(e.target.value)}
                   placeholder="e.g. Acme Corp"
                   className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-400">Industry / Description</label>
                 <textarea 
                   value={logoContext}
                   onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onLogoContextChange(e.target.value)}
                   placeholder="e.g. A sustainable coffee shop offering organic blends."
                   className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:ring-2 focus:ring-primary focus:border-transparent outline-none h-24 resize-none"
                 />
              </div>
              <div className="h-px bg-slate-700 my-4" />
            </div>
          )}

          {/* Style Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 block">Visual Style</label>
            <div className="grid grid-cols-2 gap-2">
              {currentStyles.map((style) => (
                <button
                  key={style.value}
                  onClick={() => onStyleChange(style.value)}
                  className={`px-3 py-2 text-xs md:text-sm rounded-lg border transition-all duration-200 text-left ${
                    selectedStyle === style.value
                      ? 'bg-primary/20 border-primary text-primary font-semibold'
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-700">
             <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Color Theme
             </label>
            <select
              value={selectedColor}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onColorChange(e.target.value as ColorTheme)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              {colors.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-700">
             <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Background
             </label>
             
             <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={isTransparent}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onTransparentChange(e.target.checked)}
                      className="peer w-5 h-5 rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary focus:ring-offset-slate-900 focus:ring-offset-0 transition-all cursor-pointer"
                    />
                  </div>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Transparent Background</span>
                </label>

                {!isTransparent && (
                   <div className="flex items-center gap-3 pt-2 border-t border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-inner ring-1 ring-white/10 shrink-0">
                        <input 
                          type="color" 
                          value={bgColor}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onBgColorChange(e.target.value)}
                          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-xs text-slate-500 mb-1">Pick Color</p>
                         <div className="font-mono text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded inline-block">
                            {bgColor}
                         </div>
                      </div>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={isGenerating || (assetType === 'logo' && !brandName.trim())}
        className={`mt-auto w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
          isGenerating || (assetType === 'logo' && !brandName.trim())
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-500 hover:to-indigo-600 text-white hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {isGenerating ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate {assetType === 'avatar' ? 'Avatar' : 'Logo'}
          </>
        )}
      </button>
    </div>
  );
};

export default Controls;