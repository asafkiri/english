import fs from 'node:fs';

const path='index.html';
let src=fs.readFileSync(path,'utf8');

function replaceFunction(name, replacement){
  const marker=`function ${name}`;
  const start=src.indexOf(marker);
  if(start<0) throw new Error(`${name} not found`);
  const brace=src.indexOf('{',start);
  let depth=0, quote='', esc=false, line=false, block=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i], n=src[i+1];
    if(line){ if(c==='\n') line=false; continue; }
    if(block){ if(c==='*'&&n==='/'){ block=false; i++; } continue; }
    if(quote){ if(esc){esc=false;continue;} if(c==='\\'){esc=true;continue;} if(c===quote) quote=''; continue; }
    if(c==='/'&&n==='/'){line=true;i++;continue;}
    if(c==='/'&&n==='*'){block=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{') depth++;
    else if(c==='}' && --depth===0){ src=src.slice(0,start)+replacement+src.slice(i+1); return; }
  }
  throw new Error(`${name} unterminated`);
}

const rig=`function s3dDrawRig(r,look,P){
  const K=r.kinds,C=look,R=S3D_RIG;
  const flash=P.flash||0;
  const tint=c=>flash>0?s3dMix(c,[1,.35,.3],flash):c;
  const skin=tint(C.skin),cloth=tint(C.clothes),acc=tint(C.accent),pants=tint(C.pants),shoes=tint(C.shoes),hair=tint(C.hair),a=P.alpha;
  let groundDrop=0;
  if(P.legs&&P.ground) groundDrop=Math.min(s3dFootDrop(P.hipL,P.kneeL),s3dFootDrop(P.hipR,P.kneeR));
  const root=new Float32Array(16);
  m4TRS(root,P.x,P.y+P.rootY-groundDrop,P.z,P.lean,P.yaw,P.bank,1,P.sy,1);
  const torso=new Float32Array(16),node=new Float32Array(16),node2=new Float32Array(16);

  /* A soft contact shadow anchors Sam to the road instead of making him float. */
  if(P.ground) s3dPushChild(K.disc,root,0,.012,.04,0,0,0,.34,.02,.52,[.035,.045,.06],a*.22);

  /* Pelvis + tapered torso.  The old rig was a stack of stretched balls; this
     keeps rounded joints but lets the silhouette read as one athletic body. */
  s3dPushChild(K.sphere,root,0,R.hipY-.015,0,0,0,0,.18,.12,.13,pants,a);
  m4TRS(node,0,R.hipY,0,P.torsoRx,P.torsoRy,P.torsoRz,1,1,1); m4Mul(torso,root,node);
  s3dPushChild(K.sphere,torso,0,.11,0,0,0,0,.155,.13,.125,cloth,a);
  s3dPushChild(K.sphere,torso,0,.285,0,0,0,0,.205,.19,.14,cloth,a);
  s3dPushChild(K.sphere,torso,0,.385,-.005,0,0,0,.225,.09,.145,acc,a);
  /* collar and neck make the head belong to the body */
  s3dPushChild(K.cyl,torso,0,.47,0,0,0,0,.072,.10,.072,skin,a);
  s3dPushChild(K.cyl,torso,0,.455,0,0,0,0,.105,.035,.105,acc,a);

  /* Head: smaller and a little taller than wide. */
  m4TRS(node,0,.505,0,P.headRx,P.headRy,P.headRz,1,1,1); m4Mul(node2,torso,node);
  const head=node2.slice();
  s3dPushChild(K.sphere,head,0,.145,0,0,0,0,.165,.19,.16,skin,a);
  for(const s of [-1,1]) s3dPushChild(K.sphere,head,s*.164,.145,.002,0,0,0,.026,.045,.024,skin,a);
  /* face is restrained instead of oversized toy features */
  const eyeW=[.97,.98,1];
  for(const s of [-1,1]){
    const bk=1-(P.blink||0)*.92;
    s3dPushChild(K.sphere,head,s*.058,.178,-.151,0,0,0,.023,.027*bk,.012,eyeW,a);
    s3dPushChild(K.sphere,head,s*.058,.178,-.162,0,0,0,.011,.014*bk,.007,tint(C.eye).map(v=>v*.45),a);
    s3dPushChild(K.box,head,s*.06,.222,-.156,0,0,s*.09,.05,.009,.009,hair,a);
  }
  s3dPushChild(K.sphere,head,0,.135,-.158,0,0,0,.019,.027,.014,tint(C.skinShadow),a*.85);
  s3dPushChild(K.box,head,0,.078,-.164,0,0,0,.052,.009,.008,[.48,.20,.20],a*.8);
  if(C.glasses){
    for(const s of [-1,1]) s3dPushChild(K.disc,head,s*.06,.178,-.172,Math.PI/2,0,0,.047,.01,.047,[.12,.13,.17],a);
    s3dPushChild(K.box,head,0,.178,-.174,0,0,0,.05,.008,.008,[.12,.13,.17],a);
  }

  /* Hair follows the skull instead of replacing it with a second giant ball. */
  const hs=C.hairStyle;
  const crown=()=>s3dPushChild(K.sphere,head,0,.235,.018,0,0,0,.17,.105,.165,hair,a);
  if(hs==='cap'){
    crown(); s3dPushChild(K.sphere,head,0,.25,.012,0,0,0,.178,.11,.174,acc,a);
    s3dPushChild(K.box,head,0,.235,-.168,-.16,0,0,.22,.018,.11,acc,a);
  } else if(hs==='curly'){
    crown(); for(const [x,y,z] of [[-.11,.31,.02],[0,.33,.03],[.11,.31,.02],[-.16,.25,.05],[.16,.25,.05]]) s3dPushChild(K.sphere,head,x,y,z,0,0,0,.07,.065,.07,hair,a);
  } else if(hs==='long'){
    crown(); s3dPushChild(K.sphere,head,0,.08,.13,.08,0,0,.145,.25,.075,hair,a);
    for(const s of [-1,1]) s3dPushChild(K.sphere,head,s*.145,.08,.045,0,0,s*-.08,.04,.19,.07,hair,a);
  } else if(hs==='bob'){
    crown(); s3dPushChild(K.sphere,head,0,.095,.095,0,0,0,.17,.135,.105,hair,a);
  } else if(hs==='bun'||hs==='bun-side'){
    crown(); s3dPushChild(K.sphere,head,hs==='bun'?0:.17,.34,.055,0,0,0,.075,.075,.075,hair,a);
  } else if(hs==='sidepart'){
    crown(); s3dPushChild(K.sphere,head,-.055,.275,-.04,0,0,.22,.13,.055,.13,hair,a);
  } else crown();

  /* Shoulders, upper arms and forearms are real segments now. Cylinders give
     clean limb lines; small spheres remain only at the joints. */
  for(const s of [-1,1]){
    const rx=s<0?P.shL:P.shR, rz=s<0?-P.shLz:P.shRz, el=s<0?P.elL:P.elR;
    m4TRS(node,s*.215,.39,0,rx,0,rz,1,1,1); m4Mul(node2,torso,node);
    s3dPushChild(K.sphere,node2,0,0,0,0,0,0,.073,.073,.073,cloth,a);
    s3dPushChild(K.cyl,node2,0,-R.upper*.48,0,0,0,0,.055,R.upper*.92,.057,cloth,a);
    m4TRS(node,0,-R.upper,0,el,0,0,1,1,1); const elbowM=node2.slice(); m4Mul(node2,elbowM,node);
    s3dPushChild(K.sphere,node2,0,0,0,0,0,0,.047,.047,.047,skin,a);
    s3dPushChild(K.cyl,node2,0,-.125,0,0,0,0,.039,.25,.041,skin,a);
    s3dPushChild(K.sphere,node2,0,-.27,-.005,0,0,0,.052,.062,.045,skin,a);
  }

  if(P.legs) for(const s of [-1,1]){
    const hip=s<0?P.hipL:P.hipR, hz=s<0?-P.hipLz:P.hipRz, knee=s<0?P.kneeL:P.kneeR, foot=s<0?P.footL:P.footR;
    m4TRS(node,s*.105,R.hipY,0,hip,0,hz,1,1,1); m4Mul(node2,root,node);
    s3dPushChild(K.cyl,node2,0,-R.thigh*.48,0,0,0,0,.078,R.thigh*.94,.085,pants,a);
    m4TRS(node,0,-R.thigh,0,knee,0,0,1,1,1); const kneeM=node2.slice(); m4Mul(node2,kneeM,node);
    s3dPushChild(K.sphere,node2,0,0,0,0,0,0,.066,.062,.07,pants,a);
    s3dPushChild(K.cyl,node2,0,-R.shin*.47,0,0,0,0,.055,R.shin*.9,.06,pants,a);
    m4TRS(node,0,-R.shin,0,foot,0,0,1,1,1); const footM=node2.slice(); m4Mul(node2,footM,node);
    s3dPushChild(K.sphere,node2,0,-.018,-.075,-.04,0,0,.078,.05,.16,shoes,a);
    s3dPushChild(K.box,node2,0,-.04,-.155,0,0,0,.074,.022,.075,[.96,.96,.97],a);
  }
  return {root,torso,head,footY:P.y+P.rootY-groundDrop};
}`;

const runCycle=`function s3dRunCycle(P,phi,w=1,pace=1){
  const bump=(c,wd)=>{ let d=phi-c; d-=Math.round(d/(Math.PI*2))*Math.PI*2; const v=Math.max(0,1-Math.abs(d)/wd); return v*v; };
  const s=Math.sin(phi), c=Math.cos(phi), k=s3dClamp((pace-1)/1.35,0,1);
  const swing=.48+.16*k, lean=-.10-.12*k;
  P.hipL+=(swing*s+.10)*w; P.hipR+=(-swing*s+.10)*w;
  P.kneeL+=-(.14+(1.22+.28*k)*bump(5.35,1.62)+.30*bump(2.5,1.0))*w;
  P.kneeR+=-(.14+(1.22+.28*k)*bump(5.35-Math.PI,1.62)+.30*bump(2.5-Math.PI,1.0))*w;
  P.footL+=(.16*Math.sin(phi-.58))*w; P.footR+=(-.16*Math.sin(phi-.58))*w;
  P.shL+=(-(.48+.09*k)*s+.04)*w; P.shR+=((.48+.09*k)*s+.04)*w;
  P.shLz+=(s<0?.075:.035)*w; P.shRz+=(s>0?.075:.035)*w;
  P.elL+=(1.42+.25*Math.sin(phi+.35))*w; P.elR+=(1.42-.25*Math.sin(phi+.35))*w;
  /* hips and shoulders counter-rotate; vertical motion is subtle so he runs,
     rather than bouncing like a toy. */
  P.torsoRy+=.095*s*w; P.torsoRz+=.022*s*w; P.torsoRx+=(lean-.018*Math.cos(2*phi))*w;
  P.rootY+=.018*(1-c*Math.cos(phi))*w;
  P.headRx+=(-lean*.42+.018*Math.cos(2*phi))*w; P.headRy-=.045*s*w; P.headRz-=.018*s*w;
}`;

replaceFunction('s3dDrawRig',rig);
replaceFunction('s3dRunCycle',runCycle);

fs.writeFileSync(path,src);

const sw='service-worker.js';
let sws=fs.readFileSync(sw,'utf8');
sws=sws.replace(/const CACHE_NAME = 'speak-english-v(\d+)'/,(_,n)=>`const CACHE_NAME = 'speak-english-v${Number(n)+1}'`);
fs.writeFileSync(sw,sws);
console.log('Sam 3D visual rig rebuilt and cache bumped');
