
import React, { useState } from 'react';
import { Package, Upload, RefreshCw, ArrowRight, Download, Check, Copy, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { Dependency, analyzeDependencies, processUpdates, generateUpdatedJson } from '../services/dependencyService';

const DependencyUpdater: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inputContent, setInputContent] = useState('');
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [originalJson, setOriginalJson] = useState<any>(null);
  const [fileType, setFileType] = useState<'package.json' | 'composer.json'>('package.json');
  const [isFetching, setIsFetching] = useState(false);
  const [updatedContent, setUpdatedContent] = useState('');
  const [copied, setCopied] = useState(false);

  // Helper to run analysis on a specific text string
  const runAnalysis = async (text: string) => {
    try {
      const result = await analyzeDependencies(text);
      setDependencies(result.dependencies);
      setOriginalJson(result.originalJson);
      setFileType(result.fileType);
      setStep(2);
      
      setIsFetching(true);
      await processUpdates(result.dependencies, (updated) => {
        setDependencies(updated);
      });
      setIsFetching(false);
    } catch (e) {
      alert("Invalid JSON format or structure. Please check your file.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setInputContent(content);
        // Auto-advance to next step
        runAnalysis(content);
      };
      reader.readAsText(file);
      // Reset input value so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const startAnalysis = () => {
    if (!inputContent.trim()) return;
    runAnalysis(inputContent);
  };

  const setSelection = (index: number, selection: 'keep' | 'safe' | 'major') => {
    const newDeps = [...dependencies];
    newDeps[index].selection = selection;
    setDependencies(newDeps);
  };

  const generateFile = () => {
    const jsonStr = generateUpdatedJson(originalJson, dependencies, fileType);
    setUpdatedContent(jsonStr);
    setStep(3);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(updatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const countUpdates = dependencies.filter(d => d.selection !== 'keep').length;

  return (
    <div className="bg-slate-800/30 rounded-3xl border border-slate-700/50 p-6 md:p-8 h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
      <div className="mb-8 shrink-0">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
          <Package className="w-6 h-6 text-orange-400" />
          Dependency Updater
        </h2>
        <p className="text-slate-400 text-sm">
          Analyze and update your dependencies. Choose between <span className="text-green-400">Safe Updates</span> (Non-breaking) and <span className="text-orange-400">Major Updates</span> (Breaking).
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center gap-4 mb-8 text-sm shrink-0">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-white font-bold' : 'text-slate-500'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 1 ? 'bg-primary border-primary' : 'border-slate-600'}`}>1</div>
          Import
        </div>
        <div className="w-8 h-px bg-slate-700"></div>
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-white font-bold' : 'text-slate-500'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 2 ? 'bg-primary border-primary' : 'border-slate-600'}`}>2</div>
          Review
        </div>
        <div className="w-8 h-px bg-slate-700"></div>
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-white font-bold' : 'text-slate-500'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 3 ? 'bg-primary border-primary' : 'border-slate-600'}`}>3</div>
          Export
        </div>
      </div>

      <div className="flex-1 min-h-0">
        
        {/* STEP 1: INPUT */}
        {step === 1 && (
          <div className="flex flex-col gap-4 h-full">
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-800/50 transition-colors shrink-0">
               <Upload className="w-12 h-12 text-slate-500 mb-4" />
               <p className="text-lg text-slate-300 mb-2">Paste or Upload File</p>
               <p className="text-sm text-slate-500 mb-6">Supports package.json and composer.json</p>
               <label className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors">
                  Choose File
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
               </label>
            </div>
            
            <div className="flex-1 relative min-h-0">
               <textarea
                 value={inputContent}
                 onChange={(e) => setInputContent(e.target.value)}
                 className="w-full h-full bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-xs text-slate-300 focus:ring-2 focus:ring-primary outline-none resize-none custom-scrollbar"
                 placeholder={`{\n  "dependencies": {\n    "react": "^18.0.0"\n  }\n}`}
               />
            </div>

            <button
               onClick={startAnalysis}
               disabled={!inputContent.trim()}
               className="w-full bg-primary hover:bg-indigo-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
            >
               Analyze Dependencies <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: REVIEW */}
        {step === 2 && (
          <div className="flex flex-col h-full">
             <div className="flex justify-between items-center mb-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700 shrink-0">
                <div>
                  <h3 className="font-bold text-white capitalize flex items-center gap-2">
                    {fileType}
                    {isFetching && <RefreshCw className="w-4 h-4 animate-spin text-primary" />}
                  </h3>
                  <p className="text-xs text-slate-400">{dependencies.length} packages found</p>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div> Safe Update
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div> Major Update
                  </div>
                </div>
             </div>

             <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col min-h-0">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 p-3 bg-slate-800/80 text-xs font-bold text-slate-400 border-b border-slate-700 uppercase tracking-wider shrink-0">
                   <div className="col-span-3">Package</div>
                   <div className="col-span-2">Current</div>
                   <div className="col-span-7">Update Options</div>
                </div>
                
                {/* List */}
                <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1">
                   {dependencies.map((dep, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-4 p-3 rounded-lg items-center text-sm bg-slate-800/30 hover:bg-slate-800/60 transition-colors">
                         
                         {/* Name */}
                         <div className="col-span-3">
                            <div className="font-mono font-medium text-white truncate" title={dep.name}>{dep.name}</div>
                            <div className={`text-[10px] inline-block px-1.5 rounded mt-1 ${dep.type === 'prod' ? 'bg-slate-700 text-slate-300' : 'bg-yellow-500/10 text-yellow-500'}`}>
                               {dep.type}
                            </div>
                         </div>
                         
                         {/* Current */}
                         <div className="col-span-2 font-mono text-slate-400">
                            {dep.currentVersion}
                         </div>

                         {/* Options */}
                         <div className="col-span-7 flex items-center gap-2">
                            {/* Keep Button */}
                            <button
                              onClick={() => setSelection(idx, 'keep')}
                              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                                dep.selection === 'keep' 
                                  ? 'bg-slate-700 border-slate-500 text-white' 
                                  : 'bg-transparent border-slate-700 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Keep
                            </button>

                            {/* Safe Update Button */}
                            {dep.latestSafe ? (
                              <button
                                onClick={() => setSelection(idx, 'safe')}
                                className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1 ${
                                  dep.selection === 'safe' 
                                    ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/20' 
                                    : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                                }`}
                              >
                                <ShieldCheck className="w-3 h-3" />
                                {dep.latestSafe}
                              </button>
                            ) : (
                               <div className="flex-1 text-center text-xs text-slate-600 italic">No safe updates</div>
                            )}

                            {/* Major Update Button */}
                            {dep.latestMajor ? (
                              <button
                                onClick={() => setSelection(idx, 'major')}
                                className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1 ${
                                  dep.selection === 'major' 
                                    ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-900/20' 
                                    : 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20'
                                }`}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {dep.latestMajor}
                              </button>
                            ) : (
                               <div className="flex-1 text-center text-xs text-slate-600 italic">-</div>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             <div className="mt-4 flex gap-4 shrink-0">
               <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:bg-slate-800 transition-colors"
               >
                  Back
               </button>
               <button
                  onClick={generateFile}
                  disabled={countUpdates === 0}
                  className="flex-1 bg-primary hover:bg-indigo-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
               >
                  {countUpdates > 0 ? (
                      <>Apply {countUpdates} Updates <Zap className="w-4 h-4 text-yellow-300" /></>
                  ) : (
                      "No Changes Selected"
                  )}
               </button>
             </div>
          </div>
        )}

        {/* STEP 3: EXPORT */}
        {step === 3 && (
          <div className="flex flex-col h-full gap-4">
             <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-3 text-green-300 shrink-0">
                <Check className="w-5 h-5" />
                <p>File generated successfully! Copy or download below.</p>
             </div>

             <div className="flex-1 relative min-h-0">
                <textarea
                  readOnly
                  value={updatedContent}
                  className="w-full h-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-green-300 focus:ring-0 outline-none resize-none custom-scrollbar"
                />
             </div>

             <div className="flex gap-4 shrink-0">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:bg-slate-800 transition-colors"
               >
                  Back
               </button>
               <button
                  onClick={handleCopy}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
               >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy Content"}
               </button>
               <button
                 className="flex-1 bg-primary hover:bg-indigo-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                 onClick={() => {
                    const blob = new Blob([updatedContent], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = fileType;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                 }}
               >
                  <Download className="w-4 h-4" /> Download File
               </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DependencyUpdater;
