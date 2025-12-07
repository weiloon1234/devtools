
import React from 'react';
import { Conflict } from '../services/jsonUtils';
import { ArrowRight, AlertTriangle, Check } from 'lucide-react';

interface DeduplicateModalProps {
  conflict: Conflict;
  totalConflicts?: number; // Optional visual indicator if we were counting
  onResolve: (choice: 'keep-old' | 'keep-new') => void;
  onCancel: () => void;
}

const DeduplicateModal: React.FC<DeduplicateModalProps> = ({ conflict, onResolve, onCancel }) => {
  
  const formatValue = (val: any) => {
    const s = JSON.stringify(val, null, 2);
    // Limit length for display
    if (s.length > 500) return s.substring(0, 500) + '... (truncated)';
    return s;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
               <AlertTriangle className="w-5 h-5" />
               <h3 className="font-bold text-lg">Duplicate Key Detected</h3>
            </div>
            <p className="text-slate-400 text-sm">
              The key <code className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono">{conflict.key}</code> appears multiple times in the same object.
            </p>
            <div className="mt-2 text-xs font-mono text-slate-500 flex items-center gap-1">
               path: <span className="text-slate-300">root</span>
               {conflict.path.map((p, i) => (
                 <React.Fragment key={i}>
                    <ArrowRight className="w-3 h-3" />
                    <span className="text-slate-300">{p}</span>
                 </React.Fragment>
               ))}
            </div>
          </div>
        </div>

        {/* Comparison Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid md:grid-cols-2 gap-4 h-full">
            
            {/* Existing Value */}
            <div className="flex flex-col gap-2">
               <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex justify-between">
                  <span>First Occurrence</span>
                  <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Line {conflict.indexOld + 1} approx</span>
               </div>
               <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex-1 overflow-auto custom-scrollbar font-mono text-xs text-slate-300">
                 <pre className="whitespace-pre-wrap break-words">{formatValue(conflict.valueOld)}</pre>
               </div>
               <button
                 onClick={() => onResolve('keep-old')}
                 className="mt-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600"
               >
                 <Check className="w-4 h-4" /> Keep First
               </button>
            </div>

            {/* New Value */}
            <div className="flex flex-col gap-2">
               <div className="text-xs font-bold uppercase tracking-wider text-green-500/80 mb-1 flex justify-between">
                  <span>Duplicate Occurrence</span>
                  <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Line {conflict.indexNew + 1} approx</span>
               </div>
               <div className="bg-slate-950 border border-green-500/20 rounded-xl p-4 flex-1 overflow-auto custom-scrollbar font-mono text-xs text-green-300/90 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]">
                 <pre className="whitespace-pre-wrap break-words">{formatValue(conflict.valueNew)}</pre>
               </div>
               <button
                 onClick={() => onResolve('keep-new')}
                 className="mt-2 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
               >
                 <Check className="w-4 h-4" /> Keep Duplicate
               </button>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl flex justify-center">
           <button 
             onClick={onCancel}
             className="text-slate-500 hover:text-white text-sm transition-colors"
           >
             Cancel Deduplication
           </button>
        </div>
      </div>
    </div>
  );
};

export default DeduplicateModal;
