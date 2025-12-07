
import React, { useState } from 'react';
import { Languages, Upload, Download, Copy, Check, AlertCircle, FileJson, Lock, RefreshCw, Trash2, ArrowDownAZ, FileCheck, ArrowUpWideNarrow } from 'lucide-react';
import { translateJson } from '../services/geminiService';
import { parseToIR, findNextConflict, irToJson, JsonIR, Conflict } from '../services/jsonUtils';
import DeduplicateModal from './DeduplicateModal';

interface JsonTranslatorProps {
  apiKey: string | null;
  onAuthRequest: () => void;
}

const LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ms', name: 'Malay (Bahasa Malaysia)' },
  { code: 'id', name: 'Indonesian (Bahasa Indonesia)' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
];

const JsonTranslator: React.FC<JsonTranslatorProps> = ({ apiKey, onAuthRequest }) => {
  const [inputJson, setInputJson] = useState('');
  const [targetLang, setTargetLang] = useState('es');
  const [outputJson, setOutputJson] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Deduplication State
  const [irData, setIrData] = useState<JsonIR | null>(null);
  const [currentConflict, setCurrentConflict] = useState<Conflict | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        try {
          // Validate JSON
          const parsed = JSON.parse(content);
          setInputJson(JSON.stringify(parsed, null, 2));
          setError(null);
        } catch (e) {
          setError("Invalid JSON file. Please check the syntax.");
        }
      };
      reader.readAsText(file);
    }
  };

  const sortJsonRecursively = (data: any): any => {
    if (Array.isArray(data)) {
      return data.map(sortJsonRecursively);
    } else if (typeof data === 'object' && data !== null) {
      return Object.keys(data)
        .sort()
        .reduce((acc, key) => {
          acc[key] = sortJsonRecursively(data[key]);
          return acc;
        }, {} as any);
    }
    return data;
  };

  const isParameterized = (value: any): boolean => {
    if (typeof value !== 'string') return false;

    // Checks for various dynamic placeholder patterns commonly used in i18n
    // We check the VALUE, not the KEY, as requested.

    // 1. Mustache/Handlebars: {{ variable }}
    // Matches {{...}} or {{ ... }}
    if (/\{\{.+?\}\}/.test(value)) return true;

    // 2. Standard Braces: {0}, {name}, { count }
    // We strictly look for alphanumeric content (plus space/underscore) to avoid matching random brace usage.
    if (/\{[a-zA-Z0-9_ ]+\}/.test(value)) return true;

    // 3. Printf style: %s, %d, %f
    if (/%[\d\.]*[sd@f]/.test(value)) return true;

    // 4. Colon style: :name, :id, :x (Common in Laravel/Rails/JS frameworks)
    // We must ensure the colon is NOT part of a time (H:i:s) or URL (http://) or typical text (Note: ...)
    // Logic: Match a colon that is either at the start of the string OR preceded by a non-word character (like space).
    // followed by a letter or underscore (params usually don't start with numbers like :123).
    if (/(?:^|[^a-zA-Z0-9_]):[a-zA-Z_]\w*/.test(value)) return true;

    // 5. Variable style: $variable
    if (/\$[a-zA-Z_]\w*/.test(value)) return true;

    return false;
  };

  const sortJsonParameterized = (data: any): any => {
    if (Array.isArray(data)) {
      return data.map(sortJsonParameterized);
    } else if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      const paramKeys: string[] = [];
      const normalKeys: string[] = [];

      keys.forEach(key => {
        // Skip existing dividers if re-sorting
        if (key === '_---_') return;
        
        // IMPORTANT: We check data[key] (the Value), not the Key string itself.
        if (isParameterized(data[key])) {
          paramKeys.push(key);
        } else {
          normalKeys.push(key);
        }
      });

      paramKeys.sort();
      normalKeys.sort();

      const result: any = {};
      
      // 1. Add Parameterized keys on top
      paramKeys.forEach(key => {
        result[key] = sortJsonParameterized(data[key]);
      });

      // 2. Add Divider if we have both types
      if (paramKeys.length > 0 && normalKeys.length > 0) {
        result["_---_"] = "--- End of Parameterized / Start of Static ---";
      }

      // 3. Add Normal keys
      normalKeys.forEach(key => {
        result[key] = sortJsonParameterized(data[key]);
      });

      return result;
    }
    return data;
  };

  const handleSortKeys = () => {
    if (!inputJson.trim()) return;
    try {
      const parsed = JSON.parse(inputJson);
      const sorted = sortJsonRecursively(parsed);
      setInputJson(JSON.stringify(sorted, null, 2));
      setError(null);
    } catch (e) {
      setError("Cannot sort: Invalid JSON syntax.");
    }
  };

  const handleSortParamsTop = () => {
    if (!inputJson.trim()) return;
    try {
      const parsed = JSON.parse(inputJson);
      const sorted = sortJsonParameterized(parsed);
      setInputJson(JSON.stringify(sorted, null, 2));
      setError(null);
    } catch (e) {
      setError("Cannot sort: Invalid JSON syntax.");
    }
  };

  // 1. Start Deduplication
  const handleDeduplicate = () => {
    if (!inputJson.trim()) return;
    setError(null);
    try {
      // Parse using custom parser to preserve duplicates in IR
      const ir = parseToIR(inputJson);
      setIrData(ir);
      processNextConflict(ir);
    } catch (e: any) {
      setError("Cannot deduplicate: " + e.message);
    }
  };

  // 2. Find next conflict or finish
  const processNextConflict = (ir: JsonIR) => {
     const conflict = findNextConflict(ir);
     if (conflict) {
        setCurrentConflict(conflict);
     } else {
        // No more conflicts, convert back to JSON
        const finalObj = irToJson(ir);
        setInputJson(JSON.stringify(finalObj, null, 2));
        setCurrentConflict(null);
        setIrData(null);
        // Optional success message?
     }
  };

  // 3. Resolve user choice
  const handleResolveConflict = (choice: 'keep-old' | 'keep-new') => {
     if (!currentConflict || !irData) return;
     
     // Mark the rejected item as deleted
     if (choice === 'keep-old') {
        currentConflict.object.items[currentConflict.indexNew].deleted = true;
     } else {
        currentConflict.object.items[currentConflict.indexOld].deleted = true;
     }
     
     // Process next
     processNextConflict(irData);
  };

  const handleCancelDeduplicate = () => {
     setIrData(null);
     setCurrentConflict(null);
  };

  const handleTranslate = async () => {
    if (!apiKey) {
      onAuthRequest();
      return;
    }
    
    if (!inputJson.trim()) {
      setError("Please enter or upload valid JSON.");
      return;
    }

    setError(null);
    setIsTranslating(true);

    try {
      const parsedInput = JSON.parse(inputJson);
      
      const translated = await translateJson(apiKey, parsedInput, LANGUAGES.find(l => l.code === targetLang)?.name || targetLang);
      
      setOutputJson(JSON.stringify(translated, null, 2));
    } catch (err: any) {
      console.error(err);
      if (err instanceof SyntaxError) {
        setError("Invalid JSON in input field. Please fix syntax errors.");
      } else {
        setError("Translation failed. " + (err.message || "Please try again."));
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([outputJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `translated_${targetLang}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-800/30 rounded-3xl border border-slate-700/50 p-6 md:p-8 h-full flex flex-col relative">
      
      {/* Deduplication Modal Overlay */}
      {currentConflict && (
        <DeduplicateModal
          conflict={currentConflict}
          onResolve={handleResolveConflict}
          onCancel={handleCancelDeduplicate}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Languages className="w-6 h-6 text-green-400" />
            AI JSON Translator
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Localize your software files. Preserves keys and dynamic placeholders like <code>{'{name}'}</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
             <select
               value={targetLang}
               onChange={(e) => setTargetLang(e.target.value)}
               className="appearance-none bg-slate-900 border border-slate-700 text-white pl-4 pr-10 py-2 rounded-lg font-medium focus:ring-2 focus:ring-green-500 outline-none cursor-pointer"
             >
               {LANGUAGES.map(lang => (
                 <option key={lang.code} value={lang.code}>{lang.name}</option>
               ))}
             </select>
             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
             </div>
          </div>

          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className={`px-6 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition-all ${
              !apiKey 
                ? 'bg-slate-700 text-slate-400 border border-slate-600'
                : 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20'
            }`}
          >
            {!apiKey ? <Lock className="w-4 h-4" /> : isTranslating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
            {isTranslating ? 'Translating...' : 'Translate'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 shrink-0">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Source Panel */}
        <div className="flex flex-col gap-2 h-full">
          <div className="flex flex-wrap justify-between items-center px-1 gap-2">
            <label className="text-sm font-medium text-slate-400">Source JSON</label>
            <div className="flex gap-2 items-center flex-wrap">
               <button 
                  onClick={handleDeduplicate}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors bg-slate-800 border border-slate-700 px-2 py-1 rounded"
                  title="Detect and resolve duplicate keys interactively"
               >
                  <FileCheck className="w-3 h-3" /> Deduplicate
               </button>
               <button 
                  onClick={handleSortParamsTop}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors bg-slate-800 border border-slate-700 px-2 py-1 rounded"
                  title="Sort: Parameterized values on top"
               >
                  <ArrowUpWideNarrow className="w-3 h-3" /> Sort (Params)
               </button>
               <button 
                  onClick={handleSortKeys}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors bg-slate-800 border border-slate-700 px-2 py-1 rounded"
                  title="Sort keys alphabetically (A-Z)"
               >
                  <ArrowDownAZ className="w-3 h-3" /> Sort (A-Z)
               </button>
               <div className="w-px h-4 bg-slate-700 mx-1 self-center"></div>
               <button onClick={() => setInputJson('')} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors" title="Clear">
                  <Trash2 className="w-3 h-3" />
               </button>
               <label className="cursor-pointer text-xs text-primary hover:text-indigo-400 flex items-center gap-1 transition-colors">
                  <Upload className="w-3 h-3" /> Upload File
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
               </label>
            </div>
          </div>
          <div className="relative flex-1 group min-h-0">
            <textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              className="w-full h-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 font-mono text-xs md:text-sm text-slate-300 focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 outline-none resize-none custom-scrollbar"
              placeholder={'{\n  "greeting": "Hello {name}",\n  "welcome": "Welcome to our app"\n}'}
              spellCheck={false}
            />
            {inputJson && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-500 border border-slate-700 pointer-events-none">
                {inputJson.length} chars
              </div>
            )}
          </div>
        </div>

        {/* Target Panel */}
        <div className="flex flex-col gap-2 h-full">
          <div className="flex justify-between items-center px-1">
            <label className="text-sm font-medium text-slate-400">
               {isTranslating ? 'Translating...' : 'Translated JSON'}
            </label>
            {outputJson && (
              <div className="flex gap-3">
                <button 
                  onClick={handleCopy}
                  className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors"
                >
                   {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                   {copied ? 'Copied' : 'Copy'}
                </button>
                <button 
                   onClick={handleDownload}
                   className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                   <Download className="w-3 h-3" /> Download
                </button>
              </div>
            )}
          </div>
          <div className="relative flex-1 min-h-0">
            <div className={`w-full h-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs md:text-sm text-green-300 overflow-auto custom-scrollbar transition-all ${isTranslating ? 'opacity-50' : 'opacity-100'}`}>
               {outputJson ? (
                 <pre>{outputJson}</pre>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
                    <div className="bg-slate-900 p-4 rounded-full">
                       <FileJson className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-sm">Translation will appear here</p>
                 </div>
               )}
            </div>
            
            {isTranslating && (
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-slate-900/80 backdrop-blur-sm px-6 py-4 rounded-2xl border border-green-500/20 shadow-xl flex flex-col items-center gap-3">
                     <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
                     <p className="text-sm font-medium text-green-400">Processing with AI...</p>
                  </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JsonTranslator;
