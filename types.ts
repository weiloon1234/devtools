
export type AssetType = 'avatar' | 'logo';
export type WorkspaceView = 'identity' | 'qr' | 'viewer' | 'image-tools' | 'json-translator' | 'dependency-updater';

export type AvatarStyle = 
  | 'minimalist-flat' 
  | 'geometric-abstract' 
  | 'cute-robot' 
  | '3d-clay' 
  | 'pixel-art'
  | 'sketch-outline';

export type LogoStyle = 
  | 'modern-minimalist' 
  | 'badge-emblem' 
  | 'tech-futuristic' 
  | 'organic-natural' 
  | 'monogram-lettermark'
  | 'abstract-icon';

export type ColorTheme = 
  | 'neutral-grayscale' 
  | 'vibrant-blue' 
  | 'warm-orange' 
  | 'pastel-mix' 
  | 'neon-cyberpunk'
  | 'forest-green'
  | 'elegant-gold';

export interface GeneratedImage {
  id: string;
  url: string;
  type: AssetType;
  details: string; // Style for avatar, Brand Name for logo
  timestamp: number;
}

export interface LogoConfig {
  brandName: string;
  context: string;
}

export interface GenerateAssetOptions {
  apiKey: string;
  type: AssetType;
  style: string;
  colorTheme: ColorTheme;
  isTransparent: boolean;
  bgColor: string;
  brandName?: string;
  context?: string;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}