import fs from 'node:fs';
let src=fs.readFileSync('index.html','utf8');
function repl(name,body){const s=src.indexOf('function '+name);if(s<0)throw Error(name);const b=src.indexOf('{',s);let d=0,q='',e=false,line=false,block=false;for(let i=b;i<src.length;i++){const c=src[i],n=src[i+1];if(line){if(c==='\n')line=false;continue}if(block){if(c==='*'&&n==='/'){block=false;i++}continue}if(q){if(e){e=false;continue}if(c==='\\'){e=true;continue}if(c===q)q='';continue}if(c==='/'&&n==='/'){line=true;i++;continue}if(c==='/'&&n==='*'){block=true;i++;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0){src=src.slice(0,s)+body+src.slice(i+1);return}}throw Error('unterminated '+name)}
const rig=`function s3dDrawRig(r,look,P){
 const K=r.kinds,C=look,R=S3D_RIG,flash=P.flash||0,tint=c=>flash>0?s3dMix(c,[1,.35,.3],flash):c;
 const skin=s3dMix(tint(C.skin),[1,.78,.62],.16),cloth=tint(C.clothes),acc=tint(C.accent),pants=tint(C.pants),shoes=tint(C.shoes),hair=tint(C.hair),a=P.alpha;
 let drop=0;if(P.legs&&P.ground)drop=Math.min(s3dFootDrop(P.hipL,P.kneeL),s3dFootDrop(P.hipR,P.kneeR));
 const root=new Float32Array(16),torso=new Float32Array(16),node=new Float32Array(16),node2=new Float32Array(16);m4TRS(root,P.x,P.y+P.rootY-drop,P.z,P.lean,P.yaw,P.bank,1,P.sy,1);
 if(P.ground)s3dPushChild(K.disc,root,0,.012,.05,0,0,0,.30,.018,.48,[.02,.03,.04],a*.18);
 /* compact hips, long athletic torso: no shoulder balls */
 s3dPushChild(K.sphere,root,0,R.hipY,0,0,0,0,.155,.105,.115,pants,a);
 m4TRS(node,0,R.hipY,0,P.torsoRx,P.torsoRy,P.torsoRz,1,1,1);m4Mul(torso,root,node);
 s3dPushChild(K.sphere,torso,0,.12,0,0,0,0,.145,.145,.115,cloth,a);
 s3dPushChild(K.sphere,torso,0,.30,-.005,0,0,0,.195,.205,.125,cloth,a);
 s3dPushChild(K.box,torso,0,.395,-.005,0,0,0,.34,.055,.20,acc,a);
 s3dPushChild(K.cyl,torso,0,.48,0,0,0,0,.058,.10,.058,skin,a);
 m4TRS(node,0,.515,0,P.headRx,P.headRy,P.headRz,1,1,1);m4Mul(node2,torso,node);const head=node2.slice();
 /* smaller head, visible jaw and nose; facial marks are intentionally subtle */
 s3dPushChild(K.sphere,head,0,.145,0,0,0,0,.145,.175,.142,skin,a);
 s3dPushChild(K.sphere,head,0,.075,-.018,0,0,0,.125,.10,.125,skin,a);
 for(const s of [-1,1]){const bk=1-(P.blink||0)*.92;s3dPushChild(K.sphere,head,s*.052,.178,-.137,0,0,0,.018,.021*bk,.009,[.94,.95,.96],a);s3dPushChild(K.sphere,head,s*.052,.178,-.145,0,0,0,.008,.011*bk,.005,tint(C.eye).map(v=>v*.38),a);s3dPushChild(K.box,head,s*.052,.215,-.142,0,0,s*.08,.043,.007,.007,hair,a)}
 s3dPushChild(K.sphere,head,0,.135,-.146,0,0,0,.014,.022,.012,s3dMix(skin,[.6,.32,.22],.18),a);s3dPushChild(K.box,head,0,.072,-.148,0,0,0,.042,.006,.006,[.42,.16,.14],a*.72);
 if(C.glasses){for(const s of [-1,1])s3dPushChild(K.disc,head,s*.052,.178,-.154,Math.PI/2,0,0,.039,.008,.039,[.1,.11,.14],a);s3dPushChild(K.box,head,0,.178,-.155,0,0,0,.042,.006,.006,[.1,.11,.14],a)}
 const hs=C.hairStyle,crown=()=>s3dPushChild(K.sphere,head,0,.235,.025,0,0,0,.148,.095,.145,hair,a);crown();
 if(hs==='curly')for(const [x,y,z] of [[-.1,.3,.02],[0,.315,.03],[.1,.3,.02],[-.14,.25,.04],[.14,.25,.04]])s3dPushChild(K.sphere,head,x,y,z,0,0,0,.058,.055,.058,hair,a);
 else if(hs==='long'){s3dPushChild(K.sphere,head,0,.07,.12,.08,0,0,.125,.23,.065,hair,a);for(const s of [-1,1])s3dPushChild(K.sphere,head,s*.128,.08,.04,0,0,s*-.08,.035,.17,.06,hair,a)}
 else if(hs==='bob')s3dPushChild(K.sphere,head,0,.09,.09,0,0,0,.145,.12,.09,hair,a);else if(hs==='bun'||hs==='bun-side')s3dPushChild(K.sphere,head,hs==='bun'?0:.145,.325,.05,0,0,0,.064,.064,.064,hair,a);else if(hs==='sidepart')s3dPushChild(K.sphere,head,-.05,.27,-.04,0,0,.2,.11,.045,.11,hair,a);else if(hs==='cap'){s3dPushChild(K.sphere,head,0,.25,.02,0,0,0,.155,.1,.15,acc,a);s3dPushChild(K.box,head,0,.235,-.145,-.15,0,0,.18,.014,.085,acc,a)}
 /* slimmer arms, shoulder begins inside torso */
 for(const s of [-1,1]){const rx=s<0?P.shL:P.shR,rz=s<0?-P.shLz:P.shRz,el=s<0?P.elL:P.elR;m4TRS(node,s*.19,.385,0,rx,0,rz,1,1,1);m4Mul(node2,torso,node);s3dPushChild(K.cyl,node2,0,-R.upper*.48,0,0,0,0,.045,R.upper*.92,.048,cloth,a);m4TRS(node,0,-R.upper,0,el,0,0,1,1,1);const em=node2.slice();m4Mul(node2,em,node);s3dPushChild(K.sphere,node2,0,0,0,0,0,0,.04,.04,.04,skin,a);s3dPushChild(K.cyl,node2,0,-.12,0,0,0,0,.033,.235,.035,skin,a);s3dPushChild(K.sphere,node2,0,-.255,-.008,0,0,0,.043,.055,.038,skin,a)}
 if(P.legs)for(const s of [-1,1]){const hip=s<0?P.hipL:P.hipR,hz=s<0?-P.hipLz:P.hipRz,knee=s<0?P.kneeL:P.kneeR,foot=s<0?P.footL:P.footR;m4TRS(node,s*.09,R.hipY,0,hip,0,hz,1,1,1);m4Mul(node2,root,node);s3dPushChild(K.cyl,node2,0,-R.thigh*.48,0,0,0,0,.064,R.thigh*.95,.071,pants,a);m4TRS(node,0,-R.thigh,0,knee,0,0,1,1,1);const km=node2.slice();m4Mul(node2,km,node);s3dPushChild(K.sphere,node2,0,0,0,0,0,0,.055,.052,.058,pants,a);s3dPushChild(K.cyl,node2,0,-R.shin*.47,0,0,0,0,.045,R.shin*.91,.049,pants,a);m4TRS(node,0,-R.shin,0,foot,0,0,1,1,1);const fm=node2.slice();m4Mul(node2,fm,node);s3dPushChild(K.sphere,node2,0,-.018,-.08,-.04,0,0,.067,.043,.145,shoes,a);s3dPushChild(K.box,node2,0,-.038,-.15,0,0,0,.066,.018,.067,[.96,.96,.97],a)}
 return {root,torso,head,footY:P.y+P.rootY-drop};
}`;
repl('s3dDrawRig',rig);fs.writeFileSync('index.html',src);let sw=fs.readFileSync('service-worker.js','utf8');sw=sw.replace(/speak-english-v(\d+)/,(_,n)=>'speak-english-v'+(Number(n)+1));fs.writeFileSync('service-worker.js',sw);