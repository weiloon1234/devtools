
import { GoogleGenAI } from "@google/genai";
import { AssetType, AvatarStyle, LogoStyle, ColorTheme, GenerateAssetOptions } from '../types';

const getClient = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

const buildAvatarPrompt = (style: AvatarStyle, colorTheme: ColorTheme, bgInstruction: string, isTransparent: boolean): string => {
  const styleMap: Record<AvatarStyle, string> = {
    'minimalist-flat': 'flat vector art, minimalist silhouette, clean lines, solid colors, no gradients, vector style',
    'geometric-abstract': 'abstract geometric shapes forming a face, bauhaus style, modern art, clean edges',
    'cute-robot': 'cute friendly robot head, rounded corners, tech aesthetic, simple design',
    '3d-clay': '3d claymorphism, soft lighting, rounded edges, plastic texture, 3d icon',
    'pixel-art': '8-bit pixel art, retro gaming style, blocky, clean pixels',
    'sketch-outline': 'hand-drawn sketch, thick outlines, artistic, pencil texture, white paper background aesthetic'
  };

  const colorMap: Record<ColorTheme, string> = {
    'neutral-grayscale': 'shades of grey, black, and white, high contrast',
    'vibrant-blue': 'electric blues, teals, and white accents',
    'warm-orange': 'warm sunset colors, orange, yellow, and red',
    'pastel-mix': 'soft pastel colors, mint, lavender, and peach',
    'neon-cyberpunk': 'neon pink, purple, and cyan highlights, dark aesthetic',
    'forest-green': 'nature inspired, deep greens, browns, and earthy tones',
    'elegant-gold': 'black and gold, luxurious, sophisticated, metallic accents'
  };

  const isolation = isTransparent 
    ? "Subject must be completely isolated. Die-cut sticker style. NO drop shadows. NO contact shadows. NO ground reflection."
    : "Subject centered in frame.";

  return `A square unisex default avatar icon (500x500). 
  Style: ${styleMap[style]}. 
  Color Palette: ${colorMap[colorTheme]}. 
  Background: ${bgInstruction}.
  Layout: ${isolation}
  Design: Centered, symmetrical, gender-neutral, no specific human features like hair or beards, professional placeholder, single main subject.
  Format: High quality, clear visibility, flat 2D graphic.`;
};

const buildLogoPrompt = (brandName: string, context: string, style: LogoStyle, colorTheme: ColorTheme, bgInstruction: string, isTransparent: boolean): string => {
  const styleMap: Record<LogoStyle, string> = {
    'modern-minimalist': 'modern minimalist, clean sans-serif typography, negative space, simple recognizable icon',
    'badge-emblem': 'traditional badge style, shield or circular container, trustworthy, established feel',
    'tech-futuristic': 'futuristic, circuit board motifs, gradients, sharp angles, digital innovation',
    'organic-natural': 'organic shapes, flowing lines, leaf or nature motifs, eco-friendly aesthetic',
    'monogram-lettermark': `creative monogram combining the initials of "${brandName}", intertwined letters, bold typography`,
    'abstract-icon': 'abstract symbol representing the industry, memorable shape, non-literal'
  };

  const colorMap: Record<ColorTheme, string> = {
    'neutral-grayscale': 'professional black, white, and grey, corporate',
    'vibrant-blue': 'trustworthy blues, energetic, tech-focused',
    'warm-orange': 'energetic orange, friendly yellow, inviting',
    'pastel-mix': 'approachable pastels, soft, creative, lifestyle',
    'neon-cyberpunk': 'high contrast neon on dark, edgy, gaming/crypto vibe',
    'forest-green': 'sustainable greens, earthy browns, organic',
    'elegant-gold': 'premium black and gold, luxury, exclusive'
  };

  const isolation = isTransparent 
    ? "Subject must be completely isolated. App icon style. NO drop shadows. NO contact shadows. NO ground reflection."
    : "Subject centered in frame.";

  return `A professional square company logo (500x500).
  Brand Name: "${brandName}" (Ensure text is spelled correctly and legible).
  Industry/Description: ${context}.
  Style: ${styleMap[style]}.
  Color Palette: ${colorMap[colorTheme]}.
  Background: ${bgInstruction}.
  Layout: ${isolation}
  Design: Vector-like quality, scalable, centered, balanced composition.
  Format: High quality 2D graphic.`;
};

// Helper to remove white background using flood fill from edges
const removeWhiteBackground = (base64Data: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(base64Data);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // Increased tolerance slightly to catch compression artifacts and off-whites
        // Tolerance of 50 allows RGB values > 205 (255-50) to be considered "white"
        const tolerance = 50; 
        const isWhite = (r: number, g: number, b: number) => 
          r > 255 - tolerance && g > 255 - tolerance && b > 255 - tolerance;

        const stack: [number, number][] = [];
        const visited = new Set<number>();
        
        // Seed from all edges
        const addSeed = (x: number, y: number) => {
           const idx = (y * width + x) * 4;
           if (isWhite(data[idx], data[idx + 1], data[idx + 2])) {
             stack.push([x, y]);
             visited.add(y * width + x);
           }
        };

        // Top and Bottom edges
        for (let x = 0; x < width; x++) {
            addSeed(x, 0);
            addSeed(x, height - 1);
        }
        // Left and Right edges
        for (let y = 0; y < height; y++) {
            addSeed(0, y);
            addSeed(width - 1, y);
        }

        while (stack.length > 0) {
          const [x, y] = stack.pop()!;
          const idx = (y * width + x) * 4;
          
          // If already transparent, skip
          if (data[idx + 3] === 0) continue;

          // Set to transparent
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;

          const neighbors = [
            [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nPos = ny * width + nx;
              if (!visited.has(nPos)) {
                const nIdx = nPos * 4;
                // Check if neighbor is also white-ish
                if (data[nIdx + 3] !== 0 && isWhite(data[nIdx], data[nIdx + 1], data[nIdx + 2])) {
                  stack.push([nx, ny]);
                  visited.add(nPos);
                }
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      } catch (e) {
        console.error("Error processing image transparency:", e);
        resolve(base64Data);
      }
    };
    img.onerror = () => {
      console.error("Failed to load image for processing");
      resolve(base64Data);
    };
    img.src = base64Data;
  });
};

export const generateAsset = async (options: GenerateAssetOptions): Promise<string> => {
  try {
    const { apiKey, type, style, colorTheme, isTransparent, bgColor, brandName, context } = options;
    const ai = getClient(apiKey);

    // Stricter instruction for transparency to prevent shadows
    const bgInstruction = isTransparent 
      ? 'solid pure white background (hex #FFFFFF). STRICTLY NO SHADOWS. NO DROP SHADOW. NO AMBIENT OCCLUSION. Flat vector style.' 
      : `solid flat background color ${bgColor}`;

    let prompt = '';
    if (type === 'avatar') {
      prompt = buildAvatarPrompt(style as AvatarStyle, colorTheme, bgInstruction, isTransparent);
    } else {
      if (!brandName) throw new Error("Brand name is required for logo generation");
      prompt = buildLogoPrompt(brandName, context || "General Business", style as LogoStyle, colorTheme, bgInstruction, isTransparent);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K" 
        }
      }
    });

    let base64Image = '';
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
            base64Image = part.inlineData.data;
            break;
        }
      }
    }

    if (!base64Image) {
      throw new Error("No image data returned from Gemini.");
    }

    let imageUrl = `data:image/png;base64,${base64Image}`;

    if (isTransparent) {
        imageUrl = await removeWhiteBackground(imageUrl);
    }

    return imageUrl;

  } catch (error) {
    console.error("Error generating asset:", error);
    throw error;
  }
};

export const removeBackgroundWithAI = async (apiKey: string, imageBase64: string): Promise<string> => {
  try {
    const ai = getClient(apiKey);
    
    // Extract base64 clean string
    const base64Data = imageBase64.split(',')[1] || imageBase64;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { 
             inlineData: { 
               mimeType: 'image/png', // Use generic mimeType or detect
               data: base64Data 
             } 
          },
          { text: "Replace the background of this image with a SOLID PURE WHITE color (#FFFFFF). Do NOT create a checkerboard pattern. Do NOT create a transparency grid. Ensure the background is completely flat white and the main subject is isolated." }
        ]
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1", // Note: Model might enforce aspect ratio, ideally should match input
            imageSize: "1K" 
        }
      }
    });

    let resultBase64 = '';
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          resultBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (!resultBase64) {
      throw new Error("Failed to process image background removal.");
    }

    // Pass through client-side removal to turn the solid white into real transparency
    let finalUrl = `data:image/png;base64,${resultBase64}`;
    finalUrl = await removeWhiteBackground(finalUrl);
    
    return finalUrl;

  } catch (error) {
    console.error("Error removing background:", error);
    throw error;
  }
};

export const translateJson = async (apiKey: string, jsonContent: any, targetLang: string): Promise<any> => {
  try {
    const ai = getClient(apiKey);
    const jsonString = JSON.stringify(jsonContent, null, 2);

    const systemPrompt = `
      You are an expert software localization engine. 
      Your task is to translate the VALUES of the provided JSON object into ${targetLang}.
      
      CRITICAL RULES:
      1. Keep all KEYS exactly the same. Only translate the values.
      2. PRESERVE DYNAMIC PLACEHOLDERS. Do NOT translate words inside curly braces {}, double curly braces {{}}, percent signs like %s, %d, variables starting with $, or HTML tags like <br/>, <b>.
      3. Move the placeholders to the grammatically correct position in the translated sentence.
      4. Example: "Hello {name}, welcome back" -> (Spanish) "Hola {name}, bienvenido de nuevo".
      5. Output ONLY the valid, parseable JSON string. Do not include markdown formatting like \`\`\`json.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash is sufficient and faster for text tasks
      contents: {
        parts: [
          { text: systemPrompt },
          { text: `JSON to translate:\n${jsonString}` }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    let responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("No translation returned.");
    }

    // Cleanup potential markdown if model ignored instruction
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(responseText);

  } catch (error) {
    console.error("Error translating JSON:", error);
    throw error;
  }
};
