import fs from 'node:fs';

const src = fs.readFileSync('index.html','utf8');

function balancedFunction(name){
  const start = src.indexOf(`function ${name}`);
  if(start < 0) return `\n===== ${name}: NOT FOUND =====\n`;
  const brace = src.indexOf('{', start);
  let depth = 0, quote = '', esc = false, lineComment = false, blockComment = false;
  for(let i=brace;i<src.length;i++){
    const c=src[i], n=src[i+1];
    if(lineComment){ if(c==='\n') lineComment=false; continue; }
    if(blockComment){ if(c==='*'&&n==='/'){ blockComment=false; i++; } continue; }
    if(quote){ if(esc){esc=false;continue;} if(c==='\\'){esc=true;continue;} if(c===quote) quote=''; continue; }
    if(c==='/'&&n==='/'){lineComment=true;i++;continue;}
    if(c==='/'&&n==='*'){blockComment=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{') depth++;
    else if(c==='}' && --depth===0) return `\n===== ${name} =====\n${src.slice(start,i+1)}\n`;
  }
  return `\n===== ${name}: UNTERMINATED =====\n`;
}

const names = [...src.matchAll(/function\s+(s3d[A-Za-z0-9_$]+)/g)].map(m=>m[1]);
const unique = [...new Set(names)];
const likely = unique.filter(n => /sam|pose|run|clip|draw|rig|mesh|template|camera|world|scene|avatar|char|hair|body|human/i.test(n));
let out = `Sam 3D extraction\nfunctions: ${unique.join(', ')}\n\nLIKELY: ${likely.join(', ')}\n`;
for(const n of likely) out += balancedFunction(n);

for(const needle of ['skin','hair','torso','head','shoe','shirt','pants','avatar','runner','s3dPose','s3dDraw']){
  let from=0, count=0;
  while(count<8){
    const i=src.toLowerCase().indexOf(needle.toLowerCase(),from);
    if(i<0) break;
    out += `\n===== CONTEXT ${needle} @ ${i} =====\n${src.slice(Math.max(0,i-1200), Math.min(src.length,i+2600))}\n`;
    from=i+needle.length; count++;
  }
}
fs.writeFileSync('sam-3d-analysis.txt',out);
console.log(`extracted ${likely.length} functions, ${out.length} chars`);
