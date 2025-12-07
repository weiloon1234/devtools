
export interface Dependency {
  name: string;
  currentVersion: string;
  source: 'npm' | 'packagist';
  type: 'prod' | 'dev';
  
  // Versions
  latestSafe: string | null;  // e.g. 1.2.5 (from ^1.0.0)
  latestMajor: string | null; // e.g. 2.0.0

  // State
  selection: 'keep' | 'safe' | 'major';
  status: 'loading' | 'analyzed' | 'error';
  errorMsg?: string;
}

export interface AnalysisResult {
  dependencies: Dependency[];
  originalJson: any;
  fileType: 'package.json' | 'composer.json';
}

// --- Helpers ---

const cleanVersion = (ver: string) => ver.replace(/^[\^~>=<v]/, '').split(' ')[0]; // Handle "1.0 || 2.0" roughly

// Simple SemVer comparison: returns 1 if a > b, -1 if a < b, 0 if equal
const compareSemVer = (a: string, b: string): number => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (nb > na) return -1;
  }
  return 0;
};

const getMajor = (ver: string): number => {
  return Number(ver.split('.')[0]) || 0;
};

// --- Fetchers ---

const fetchNpmPackageInfo = async (pkgName: string, currentRange: string): Promise<{ safe: string | null, major: string | null }> => {
  try {
    // 1. Fetch "Major" (Absolute Latest)
    const latestReq = await fetch(`https://unpkg.com/${pkgName}@latest/package.json`);
    let latestVer: string | null = null;
    if (latestReq.ok) {
      const data = await latestReq.json();
      latestVer = data.version;
    }

    // 2. Fetch "Safe" (Satisfies current range)
    // If current range is hardcoded (e.g. "1.2.3"), Unpkg returns that exact version, effectively "safe".
    // If it's "^1.0.0", Unpkg resolves to highest compatible.
    // Note: If currentRange contains invalid chars for URL, this might fail, but standard package.json ranges work.
    let safeVer: string | null = null;
    
    // Cleanup range for URL (remove local file paths, git urls)
    if (!currentRange.includes('/') && !currentRange.includes('git')) {
        const safeReq = await fetch(`https://unpkg.com/${pkgName}@${currentRange}/package.json`);
        if (safeReq.ok) {
        const data = await safeReq.json();
        safeVer = data.version;
        }
    }

    // If fetch failed or resulted in same version, treat as no update
    return { safe: safeVer, major: latestVer };
  } catch (e) {
    return { safe: null, major: null };
  }
};

const fetchPackagistPackageInfo = async (pkgName: string, currentVer: string): Promise<{ safe: string | null, major: string | null }> => {
  try {
    const response = await fetch(`https://packagist.org/packages/${pkgName}.json`);
    if (!response.ok) return { safe: null, major: null };
    
    const data = await response.json();
    const versions = Object.keys(data.package.versions)
      .filter(v => !v.includes('dev') && !v.includes('alpha') && !v.includes('beta') && !v.includes('RC'))
      .map(v => v.replace(/^v/, '')); // Remove 'v' prefix if present

    if (versions.length === 0) return { safe: null, major: null };

    // Sort descending
    versions.sort((a, b) => compareSemVer(b, a));

    const absoluteLatest = versions[0];
    
    // Determine Safe: Highest version with SAME Major as current
    const currentClean = cleanVersion(currentVer);
    const currentMajor = getMajor(currentClean);

    const safeLatest = versions.find(v => getMajor(v) === currentMajor && compareSemVer(v, currentClean) > 0);

    return {
      safe: safeLatest || null, // If no newer safe version, null
      major: absoluteLatest // Always return absolute latest
    };

  } catch (e) {
    return { safe: null, major: null };
  }
};

// --- Main Service ---

export const analyzeDependencies = async (jsonString: string): Promise<AnalysisResult> => {
  let json: any;
  try {
    json = JSON.parse(jsonString);
  } catch (e) {
    throw new Error("Invalid JSON format");
  }

  const deps: Dependency[] = [];
  let fileType: 'package.json' | 'composer.json' = 'package.json';

  if (json.require || json['require-dev']) {
    fileType = 'composer.json';
  }

  const addDep = (obj: Record<string, string>, type: 'prod' | 'dev') => {
    if (!obj) return;
    Object.entries(obj).forEach(([name, version]) => {
      // Filter out non-package requirements
      if (fileType === 'composer.json' && (name === 'php' || name.startsWith('ext-'))) return;
      if (fileType === 'package.json' && (version.startsWith('file:') || version.startsWith('git'))) return;

      deps.push({
        name,
        currentVersion: version,
        source: fileType === 'package.json' ? 'npm' : 'packagist',
        type,
        latestSafe: null,
        latestMajor: null,
        selection: 'keep',
        status: 'loading'
      });
    });
  };

  if (fileType === 'package.json') {
    addDep(json.dependencies, 'prod');
    addDep(json.devDependencies, 'dev');
  } else {
    addDep(json.require, 'prod');
    addDep(json['require-dev'], 'dev');
  }

  return { dependencies: deps, originalJson: json, fileType };
};

export const processUpdates = async (
  dependencies: Dependency[], 
  onProgress: (updatedDeps: Dependency[]) => void
) => {
  const updatedDeps = [...dependencies];
  const CHUNK_SIZE = 6;

  for (let i = 0; i < updatedDeps.length; i += CHUNK_SIZE) {
    const chunk = updatedDeps.slice(i, i + CHUNK_SIZE);

    await Promise.all(chunk.map(async (dep) => {
      const target = updatedDeps.find(d => d.name === dep.name && d.type === dep.type);
      if (!target) return;

      let result;
      if (dep.source === 'npm') {
        result = await fetchNpmPackageInfo(dep.name, dep.currentVersion);
      } else {
        result = await fetchPackagistPackageInfo(dep.name, dep.currentVersion);
      }

      const currentClean = cleanVersion(dep.currentVersion);
      
      // Logic:
      // 1. If 'Safe' version <= current, it's not an update.
      // 2. If 'Major' version <= current, it's not an update.
      // 3. If 'Major' == 'Safe', we only have one update path (Safe).
      
      if (result.safe && compareSemVer(result.safe, currentClean) <= 0) {
          result.safe = null;
      }
      if (result.major && compareSemVer(result.major, currentClean) <= 0) {
          result.major = null;
      }
      
      // If Major is same as Safe, treat it as just Safe to avoid duplicate buttons
      if (result.major && result.safe && result.major === result.safe) {
          result.major = null; 
      }
      // However, if Major is essentially just a minor bump but the logic categorized it as major, fix it.
      // Actually, standard logic: Safe is same Major, Major is different Major.
      // But if Unpkg safe returned 1.5 and latest returned 1.5, we already nulled Major above.
      
      // Edge Case: If only Major returned but it is same major number? (Shouldn't happen with our fetch logic but safe to check)
      if (result.major && getMajor(result.major) === getMajor(currentClean)) {
           // It's actually a safe update
           if (!result.safe || compareSemVer(result.major, result.safe) > 0) {
               result.safe = result.major;
           }
           result.major = null;
      }

      target.latestSafe = result.safe;
      target.latestMajor = result.major;
      target.status = (result.safe || result.major) ? 'analyzed' : 'error';
      if (!result.safe && !result.major) target.errorMsg = "Up to date";
      
    }));

    onProgress([...updatedDeps]);
  }
};

export const generateUpdatedJson = (
  originalJson: any, 
  dependencies: Dependency[], 
  fileType: 'package.json' | 'composer.json'
): string => {
  const newJson = JSON.parse(JSON.stringify(originalJson));

  dependencies.forEach(dep => {
    if (dep.selection === 'keep') return;

    let newVer = dep.currentVersion;
    let targetVer = dep.selection === 'safe' ? dep.latestSafe : dep.latestMajor;

    if (targetVer) {
        // Maintain prefix style if possible
        const prefix = dep.currentVersion.match(/^[\^~]/)?.[0] || '^';
        newVer = `${prefix}${targetVer}`;
        
        const key = dep.type === 'prod' 
            ? (fileType === 'package.json' ? 'dependencies' : 'require')
            : (fileType === 'package.json' ? 'devDependencies' : 'require-dev');
        
        if (newJson[key] && newJson[key][dep.name]) {
            newJson[key][dep.name] = newVer;
        }
    }
  });

  return JSON.stringify(newJson, null, 2);
};
