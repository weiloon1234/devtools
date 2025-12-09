
import React, { useState, useEffect } from 'react';
import { FileJson, FileCode, Copy, Trash2, Check, AlignLeft, Minimize2, AlertCircle, ChevronRight, ChevronDown, ChevronsDownUp, ChevronsUpDown, ArrowDownAZ, FileCheck } from 'lucide-react';
import { parseToIR, findNextConflict, irToJson, JsonIR, Conflict } from '../services/jsonUtils';
import DeduplicateModal from './DeduplicateModal';

type DataType = 'json' | 'xml' | 'unknown';

interface ExpansionConfig {
  version: number;
  maxDepth: number;
}

// --- XML Types & Helpers ---

interface XmlElement {
  type: 'element' | 'text';
  name: string;
  attributes?: Record<string, string>;
  content?: string;
  children?: XmlElement[];
}

const parseXmlToTree = (xmlString: string): XmlElement | null => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");
  const errorNode = doc.getElementsByTagName("parsererror")[0];
  if (errorNode) throw new Error("Error parsing XML");

  const processNode = (node: Node): XmlElement | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      const content = node.textContent?.trim();
      return content ? { type: 'text', name: '#text', content } : null;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const attributes: Record<string, string> = {};
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        attributes[attr.name] = attr.value;
      }

      const children: XmlElement[] = [];
      for (let i = 0; i < node.childNodes.length; i++) {
        const processed = processNode(node.childNodes[i]);
        if (processed) children.push(processed);
      }

      return {
        type: 'element',
        name: el.tagName,
        attributes,
        children
      };
    }
    return null;
  };

  // Skip document node, get root element
  for (let i = 0; i < doc.childNodes.length; i++) {
    const node = doc.childNodes[i];
    if (node.nodeType === Node.ELEMENT_NODE) {
      return processNode(node);
    }
  }
  return null;
};

// --- XML Tree Component ---

const XmlNode: React.FC<{
  node: XmlElement;
  depth?: number;
  expansionConfig?: ExpansionConfig;
}> = ({ node, depth = 0, expansionConfig }) => {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (expansionConfig) {
      setExpanded(depth < expansionConfig.maxDepth);
    }
  }, [expansionConfig, depth]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  if (node.type === 'text') {
    return (
      <div className="font-mono text-sm leading-6 whitespace-nowrap">
        <span style={{ marginLeft: depth * 20 }} className="text-slate-200">
          {node.content}
        </span>
      </div>
    );
  }

  const hasChildren = node.children && node.children.length > 0;
  // Check if it only has a single text child for inline rendering
  const isSingleTextChild = hasChildren && node.children?.length === 1 && node.children[0].type === 'text';

  const renderAttributes = () => {
    if (!node.attributes) return null;
    return Object.entries(node.attributes).map(([key, val]) => (
      <span key={key}>
        {' '}<span className="text-purple-300">{key}</span>=<span className="text-green-300">"{val}"</span>
      </span>
    ));
  };

  if (isSingleTextChild) {
    return (
      <div className="font-mono text-sm leading-6 hover:bg-slate-800/50 px-1 rounded transition-colors whitespace-nowrap">
        <span style={{ marginLeft: depth * 20 }}>
          <span className="text-sky-300">&lt;{node.name}</span>
          {renderAttributes()}
          <span className="text-sky-300">&gt;</span>
          <span className="text-slate-200">{node.children![0].content}</span>
          <span className="text-sky-300">&lt;/{node.name}&gt;</span>
        </span>
      </div>
    );
  }

  return (
    <div className="font-mono text-sm leading-6">
      <div
        className="flex items-center hover:bg-slate-800/50 px-1 rounded cursor-pointer group select-none transition-colors whitespace-nowrap"
        onClick={handleToggle}
      >
        <span style={{ marginLeft: depth * 20 }} className="flex items-center flex-wrap">
          <span className="text-slate-500 w-4 h-4 flex items-center justify-center -ml-4 transition-transform duration-200 inline-block align-middle">
            {hasChildren && (expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
          </span>
          <span className="text-sky-300">&lt;{node.name}</span>
          {renderAttributes()}

          {(!hasChildren) ? (
            <span className="text-sky-300"> /&gt;</span>
          ) : (
            <>
              <span className="text-sky-300">&gt;</span>
              {!expanded && <span className="text-slate-500 text-xs mx-1">...</span>}
              {!expanded && <span className="text-sky-300">&lt;/{node.name}&gt;</span>}
            </>
          )}
        </span>
      </div>

      {expanded && hasChildren && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          {node.children!.map((child, idx) => (
            <XmlNode
              key={idx}
              node={child}
              depth={depth + 1}
              expansionConfig={expansionConfig}
            />
          ))}
          <div className="hover:bg-slate-800/50 px-1 rounded transition-colors">
            <span style={{ marginLeft: depth * 20 }} className="text-sky-300">
              &lt;/{node.name}&gt;
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// --- JSON Tree Components ---

const JsonNode: React.FC<{
  name?: string;
  value: any;
  isLast: boolean;
  depth?: number;
  expansionConfig?: ExpansionConfig;
}> = ({ name, value, isLast, depth = 0, expansionConfig }) => {
  const [expanded, setExpanded] = useState(true);

  // Sync with global config whenever version changes
  useEffect(() => {
    if (expansionConfig) {
      setExpanded(depth < expansionConfig.maxDepth);
    }
  }, [expansionConfig, depth]);

  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const isEmpty = isObject && Object.keys(value).length === 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const renderValue = (val: any) => {
    if (val === null) return <span className="text-slate-500 italic">null</span>;
    if (typeof val === 'boolean') return <span className="text-purple-400 font-bold">{val.toString()}</span>;
    if (typeof val === 'number') return <span className="text-orange-400">{val}</span>;
    if (typeof val === 'string') return <span className="text-green-300">"{val}"</span>;
    return <span className="text-slate-300">{String(val)}</span>;
  };

  if (!isObject) {
    return (
      <div className="font-mono text-sm leading-6 hover:bg-slate-800/50 px-1 rounded transition-colors whitespace-nowrap">
        <span style={{ marginLeft: depth * 20 }}>
          {name && <span className="text-sky-300 font-semibold">{name}: </span>}
          {renderValue(value)}
          {!isLast && <span className="text-slate-500">,</span>}
        </span>
      </div>
    );
  }

  const keys = Object.keys(value);
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  if (isEmpty) {
    return (
      <div className="font-mono text-sm leading-6 hover:bg-slate-800/50 px-1 rounded transition-colors whitespace-nowrap">
        <span style={{ marginLeft: depth * 20 }}>
          {name && <span className="text-sky-300 font-semibold">{name}: </span>}
          <span className="text-slate-400">{openBracket}{closeBracket}</span>
          {!isLast && <span className="text-slate-500">,</span>}
        </span>
      </div>
    );
  }

  return (
    <div className="font-mono text-sm leading-6">
      <div
        className="flex items-center hover:bg-slate-800/50 px-1 rounded cursor-pointer group select-none transition-colors whitespace-nowrap"
        onClick={handleToggle}
      >
        <span style={{ marginLeft: depth * 20 }} className="flex items-center flex-wrap">
          <span className="text-slate-500 w-4 h-4 flex items-center justify-center transition-transform duration-200 mr-1">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
          {name && <span className="text-sky-300 font-semibold">{name}: </span>}
          <span className="text-slate-400">{openBracket}</span>
          {!expanded && (
            <span className="text-slate-600 text-xs ml-2 italic">
              {keys.length} {keys.length === 1 ? 'item' : 'items'}... {closeBracket}
            </span>
          )}
        </span>
      </div>

      {expanded && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          {keys.map((key, index) => (
            <JsonNode
              key={key}
              name={isArray ? undefined : `"${key}"`}
              value={value[key]}
              isLast={index === keys.length - 1}
              depth={depth + 1}
              expansionConfig={expansionConfig}
            />
          ))}
          <div className="hover:bg-slate-800/50 px-1 rounded transition-colors">
            <span style={{ marginLeft: depth * 20 + 20 }} className="text-slate-400">
              {closeBracket}
              {!isLast && <span className="text-slate-500">,</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Component ---

const DataViewer: React.FC = () => {
  const [input, setInput] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [xmlTree, setXmlTree] = useState<XmlElement | null>(null);
  const [formattedString, setFormattedString] = useState<string>('');
  const [dataType, setDataType] = useState<DataType>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Controls for tree expansion
  const [expansionConfig, setExpansionConfig] = useState<ExpansionConfig>({ version: 0, maxDepth: 2 });

  // Deduplication State
  const [irData, setIrData] = useState<JsonIR | null>(null);
  const [currentConflict, setCurrentConflict] = useState<Conflict | null>(null);

  // Helper: Recursive Sort
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

  // Helper: Minify JSON
  const minifyJSON = (raw: string) => {
    try {
      return JSON.stringify(JSON.parse(raw));
    } catch (e: any) {
      throw new Error("Invalid JSON: " + e.message);
    }
  };

  // Helper: Format XML
  const formatXML = (xml: string) => {
    let formatted = '';
    const reg = /(>)(<)(\/*)/g;
    xml = xml.replace(reg, '$1\r\n$2$3');
    let pad = 0;

    xml.split('\r\n').forEach((node) => {
      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (node.match(/^<\/\w/)) {
        if (pad !== 0) pad -= 1;
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
        indent = 1;
      } else {
        indent = 0;
      }

      let padding = '';
      for (let i = 0; i < pad; i++) {
        padding += '  ';
      }

      formatted += padding + node + '\r\n';
      pad += indent;
    });

    return formatted.trim();
  };

  // Helper: Minify XML
  const minifyXML = (xml: string) => {
    return xml.replace(/>\s+</g, '><').trim();
  };

  const detectAndFormat = () => {
    setError(null);
    if (!input.trim()) {
      setFormattedString('');
      setParsedData(null);
      setXmlTree(null);
      setDataType('unknown');
      return;
    }

    const trimmed = input.trim();

    // Try JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        setParsedData(parsed);
        setFormattedString(JSON.stringify(parsed, null, 2));
        setDataType('json');
        // Reset expansion on new data
        setExpansionConfig(prev => ({ version: prev.version + 1, maxDepth: 2 }));
        return;
      } catch (e) {
        // Not valid JSON, fall through
      }
    }

    // Try XML
    if (trimmed.startsWith('<')) {
      try {
        // Validation first
        const parser = new DOMParser();
        const doc = parser.parseFromString(trimmed, "application/xml");
        const parseError = doc.getElementsByTagName("parsererror");
        if (parseError.length > 0) {
          throw new Error("Invalid XML structure");
        }

        // Tree parsing
        const tree = parseXmlToTree(trimmed);
        setXmlTree(tree);

        // String formatting
        const pretty = formatXML(trimmed);
        setFormattedString(pretty);

        setDataType('xml');
        // Reset expansion on new data
        setExpansionConfig(prev => ({ version: prev.version + 1, maxDepth: 2 }));
        return;
      } catch (e: any) {
        // Fall through
      }
    }

    setError("Unable to detect valid JSON or XML format.");
    setDataType('unknown');
    setFormattedString(input);
    setParsedData(null);
    setXmlTree(null);
  };

  const handleMinify = () => {
    if (!input.trim()) return;
    setError(null);
    try {
      if (dataType === 'json') {
        const minified = minifyJSON(input);
        setFormattedString(minified);
        const parsed = JSON.parse(minified);
        setParsedData(parsed);
        setExpansionConfig(prev => ({ version: prev.version + 1, maxDepth: 1 }));
      } else if (dataType === 'xml') {
        const minified = minifyXML(input);
        setFormattedString(minified);
        // Re-parse tree from minified to ensure consistency
        setXmlTree(parseXmlToTree(minified));
      } else {
        detectAndFormat();
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSortKeys = () => {
    if (!input.trim()) return;
    setError(null);
    try {
      // Must be JSON to sort keys meaningfuly
      const parsed = JSON.parse(input);
      const sorted = sortJsonRecursively(parsed);
      const sortedString = JSON.stringify(sorted, null, 2);
      setInput(sortedString);

      // Update view
      setParsedData(sorted);
      setFormattedString(sortedString);
      setDataType('json');
      setExpansionConfig(prev => ({ version: prev.version + 1, maxDepth: prev.maxDepth }));
    } catch (e) {
      setError("Cannot sort: Input is not valid JSON.");
    }
  };

  // 1. Start Deduplication
  const handleDeduplicate = () => {
    if (!input.trim()) return;
    setError(null);
    try {
      // Parse using custom parser
      const ir = parseToIR(input);
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
      // No more conflicts, update everything
      const finalObj = irToJson(ir);
      const jsonString = JSON.stringify(finalObj, null, 2);
      setInput(jsonString);
      setParsedData(finalObj);
      setFormattedString(jsonString);
      setDataType('json');

      setCurrentConflict(null);
      setIrData(null);
    }
  };

  // 3. Resolve user choice
  const handleResolveConflict = (choice: 'keep-old' | 'keep-new') => {
    if (!currentConflict || !irData) return;

    if (choice === 'keep-old') {
      currentConflict.object.items[currentConflict.indexNew].deleted = true;
    } else {
      currentConflict.object.items[currentConflict.indexOld].deleted = true;
    }

    processNextConflict(irData);
  };

  const handleCancelDeduplicate = () => {
    setIrData(null);
    setCurrentConflict(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedString || input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInput('');
    setFormattedString('');
    setParsedData(null);
    setXmlTree(null);
    setDataType('unknown');
    setError(null);
  };

  const handleExpandAll = () => setExpansionConfig(prev => ({ version: prev.version + 1, maxDepth: Infinity }));
  const handleCollapseAll = () => setExpansionConfig(prev => ({ version: prev.version + 1, maxDepth: 0 }));
  const handleExpandLevel1 = () => setExpansionConfig(prev => ({ version: prev.version + 1, maxDepth: 1 }));
  const handleExpandLevel2 = () => setExpansionConfig(prev => ({ version: prev.version + 1, maxDepth: 2 }));

  return (
    <div className="bg-slate-800/30 rounded-3xl border border-slate-700/50 p-4 md:p-6 h-[calc(100vh-8rem)] flex flex-col relative">

      {/* Deduplication Modal */}
      {currentConflict && (
        <DeduplicateModal
          conflict={currentConflict}
          onResolve={handleResolveConflict}
          onCancel={handleCancelDeduplicate}
        />
      )}

      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            {dataType === 'json' ? (
              <FileJson className="w-6 h-6 text-yellow-400" />
            ) : dataType === 'xml' ? (
              <FileCode className="w-6 h-6 text-sky-400" />
            ) : (
              <FileCode className="w-6 h-6 text-slate-400" />
            )}
            Data Viewer
          </h2>
        </div>

        {dataType !== 'unknown' && (
          <div className="px-3 py-1 bg-slate-700 rounded-full text-xs font-mono text-slate-300 uppercase tracking-wider">
            {dataType} Detected
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Input Pane */}
        <div className="flex flex-col gap-2 h-full min-h-0">
          <div className="flex justify-between items-center px-1 shrink-0">
            <label className="text-sm font-medium text-slate-400">Input Raw Data</label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeduplicate}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors bg-slate-800 border border-slate-700 px-2 py-1 rounded"
                title="Detect and resolve duplicate keys interactively (JSON Only)"
              >
                <FileCheck className="w-3 h-3" /> Deduplicate
              </button>
              <button
                onClick={handleSortKeys}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors bg-slate-800 border border-slate-700 px-2 py-1 rounded"
                title="Sort keys alphabetically (JSON Only)"
              >
                <ArrowDownAZ className="w-3 h-3" /> Sort
              </button>
              <div className="w-px h-4 bg-slate-700 mx-1"></div>
              <button onClick={handleClear} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors">
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-xs md:text-sm text-slate-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none custom-scrollbar"
            placeholder="Paste JSON or XML here..."
            spellCheck={false}
          />
          <div className="flex gap-2 shrink-0">
            <button
              onClick={detectAndFormat}
              disabled={!input}
              className="flex-1 bg-primary hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AlignLeft className="w-4 h-4" /> Format
            </button>
            <button
              onClick={handleMinify}
              disabled={!input}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minimize2 className="w-4 h-4" /> Minify
            </button>
          </div>
        </div>

        {/* Output Pane */}
        <div className="flex flex-col gap-2 h-full min-h-0">
          <div className="flex justify-between items-center px-1 shrink-0 h-6">
            <label className="text-sm font-medium text-slate-400">
              {(dataType === 'json' || dataType === 'xml') ? 'Interactive Tree View' : 'Formatted Output'}
            </label>

            {/* Tree Controls */}
            {(dataType === 'json' || dataType === 'xml') && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCollapseAll}
                  className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                  title="Collapse All"
                >
                  <ChevronsDownUp className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExpandLevel1}
                  className="px-2 py-0.5 text-xs font-mono hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-600"
                  title="Expand Level 1"
                >
                  Lvl 1
                </button>
                <button
                  onClick={handleExpandLevel2}
                  className="px-2 py-0.5 text-xs font-mono hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-600"
                  title="Expand Level 2"
                >
                  Lvl 2
                </button>
                <button
                  onClick={handleExpandAll}
                  className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                  title="Expand All"
                >
                  <ChevronsUpDown className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
              </div>
            )}

            {formattedString && (
              <button
                onClick={handleCopy}
                className="text-xs text-primary hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          <div className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl p-4 overflow-auto custom-scrollbar relative">
            {error ? (
              <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2 opacity-80">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm text-center">{error}</p>
              </div>
            ) : dataType === 'json' && parsedData ? (
              <div className="min-w-fit pb-4">
                <JsonNode
                  value={parsedData}
                  isLast={true}
                  expansionConfig={expansionConfig}
                />
              </div>
            ) : dataType === 'xml' && xmlTree ? (
              <div className="min-w-fit pb-4">
                <XmlNode
                  node={xmlTree}
                  expansionConfig={expansionConfig}
                />
              </div>
            ) : formattedString ? (
              <pre className="font-mono text-sm leading-relaxed text-slate-300 whitespace-pre">{formattedString}</pre>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-600 text-sm italic">
                Formatted output will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataViewer;
