
export type JsonIR = 
  | { type: 'object', items: { key: string, value: JsonIR, deleted?: boolean }[] }
  | { type: 'array', items: JsonIR[] }
  | { type: 'primitive', value: any };

export interface Conflict {
  key: string;
  path: string[];
  valueOld: any;
  valueNew: any;
  // Internal references to resolve
  object: { items: { key: string, value: JsonIR, deleted?: boolean }[] };
  indexOld: number;
  indexNew: number;
}

// Simple recursive descent JSON parser that builds IR
export const parseToIR = (str: string): JsonIR => {
  let i = 0;
  const skipWhitespace = () => { while (i < str.length && /\s/.test(str[i])) i++; };
  
  const parseValue = (): JsonIR => {
    skipWhitespace();
    if (i >= str.length) throw new Error("Unexpected end of input");
    const char = str[i];
    if (char === '{') return parseObject();
    if (char === '[') return parseArray();
    if (char === '"') return parseString();
    if (char === 't' || char === 'f') return parseBoolean();
    if (char === 'n') return parseNull();
    return parseNumber();
  };

  const parseObject = (): JsonIR => {
    i++; // eat {
    const items: { key: string, value: JsonIR }[] = [];
    skipWhitespace();
    if (str[i] === '}') { i++; return { type: 'object', items }; }
    
    while (i < str.length) {
      skipWhitespace();
      const keyIR = parseString();
      const key = keyIR.value;
      
      skipWhitespace();
      if (str[i] !== ':') throw new Error("Expected ':' after key at pos " + i);
      i++; // eat :
      
      const value = parseValue();
      items.push({ key, value });
      
      skipWhitespace();
      if (str[i] === '}') { i++; break; }
      if (str[i] === ',') { i++; continue; }
      throw new Error("Expected '}' or ',' at pos " + i);
    }
    return { type: 'object', items };
  };

  const parseString = (): { type: 'primitive', value: string } => {
     let start = i;
     i++; // eat starting "
     let escaped = false;
     
     while (i < str.length) {
       const char = str[i];
       if (escaped) {
         escaped = false;
       } else if (char === '\\') {
         escaped = true;
       } else if (char === '"') {
         break;
       }
       i++;
     }
     
     if (i >= str.length) throw new Error("Unterminated string starting at " + start);
     i++; // eat closing "
     
     const raw = str.substring(start, i);
     try {
        return { type: 'primitive', value: JSON.parse(raw) };
     } catch (e) {
        throw new Error("Invalid string at pos " + start);
     }
  };
  
  const parseNumber = (): { type: 'primitive', value: number } => {
     const start = i;
     // simple regex-like scan for number boundary
     while (i < str.length && /[-0-9.eE+]/.test(str[i])) i++;
     const raw = str.substring(start, i);
     const num = Number(raw);
     if (isNaN(num)) throw new Error("Invalid number at pos " + start);
     return { type: 'primitive', value: num };
  };
  
  const parseBoolean = (): { type: 'primitive', value: boolean } => {
     if (str.startsWith("true", i)) { i+=4; return { type: 'primitive', value: true }; }
     if (str.startsWith("false", i)) { i+=5; return { type: 'primitive', value: false }; }
     throw new Error("Invalid boolean at pos " + i);
  };
  
  const parseNull = (): { type: 'primitive', value: null } => {
     if (str.startsWith("null", i)) { i+=4; return { type: 'primitive', value: null }; }
     throw new Error("Invalid null at pos " + i);
  };
  
  const parseArray = (): JsonIR => {
     i++; // eat [
     const items: JsonIR[] = [];
     skipWhitespace();
     if (str[i] === ']') { i++; return { type: 'array', items }; }
     while(i < str.length) {
        items.push(parseValue());
        skipWhitespace();
        if (str[i] === ']') { i++; break; }
        if (str[i] === ',') { i++; continue; }
        throw new Error("Expected ']' or ',' at pos " + i);
     }
     return { type: 'array', items };
  }

  return parseValue();
};

export const findNextConflict = (node: JsonIR, path: string[] = []): Conflict | null => {
  if (node.type === 'object') {
     const seen = new Map<string, number>();
     for (let idx = 0; idx < node.items.length; idx++) {
        const item = node.items[idx];
        if (item.deleted) continue;
        
        if (seen.has(item.key)) {
           // Conflict Found!
           const oldIdx = seen.get(item.key)!;
           const oldItem = node.items[oldIdx];
           
           return {
             key: item.key,
             path,
             valueOld: irToJson(oldItem.value),
             valueNew: irToJson(item.value),
             object: node,
             indexOld: oldIdx,
             indexNew: idx
           };
        }
        seen.set(item.key, idx);
        
        // Recurse
        const childConflict = findNextConflict(item.value, [...path, item.key]);
        if (childConflict) return childConflict;
     }
  } else if (node.type === 'array') {
     for (let i = 0; i < node.items.length; i++) {
        const childConflict = findNextConflict(node.items[i], [...path, `[${i}]`]);
        if (childConflict) return childConflict;
     }
  }
  return null;
}

export const irToJson = (node: JsonIR): any => {
   if (node.type === 'primitive') return node.value;
   if (node.type === 'array') return node.items.map(irToJson);
   if (node.type === 'object') {
      const obj: any = {};
      node.items.forEach(item => {
         if (!item.deleted) obj[item.key] = irToJson(item.value);
      });
      return obj;
   }
};
