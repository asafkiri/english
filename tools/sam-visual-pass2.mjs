import fs from 'node:fs';
let src=fs.readFileSync('index.html','utf8');
function repl(name,body){const s=src.indexOf('function '+name);if(s<0)throw Error(name);const b=src.indexOf('{',s);let d=0,q='',e=false,line=false,block=false;for(let i=b;i<src.length;i++){const c=src[i],n=src[i+1];if(line){if(c==='\n')line=false;continue}if(block){if(c==='*'&&n==='/'){block=false;i++}continue}if(q){if(e){e=false;continue}if(c==='\\'){e=true;continue}if(c===q)q='';continue}if(c==='/'&&n==='/'){line=true;i++;continue}if(c==='/'&&n==='*'){block=true;i++;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0){src=src.slice(0,s)+body+src.slice(i+1);return}}throw Error('unterminated '+name)}
const rig=`function s3dDrawRig(r,look,P){
 const K=r.kinds,C=look,R=S3D_RIG,flash=P.flash||0,tint=c=>flash>0?s3dMix(c,[1,.35,.3],flash):c;
 const skin=s3dMix(tint(C.skin),[1,.80,.66],.10),cloth=tint(C.clothes),acc=tint(C.accent),pants=tint(C.pants),shoes=tint(C.shoes),hair=tint(C.hair),a=P.alpha;
 let drop=0;if(P.legs&&P.ground)drop=Math.min(s3dFootDrop(P.hipL,P.kneeL),s3dFootDrop(P.hipR,P.kneeR));
 const root=new Float32Array(16),torso=new Float32Array(16),node=new Float32Array(16),node2=new Float32Array(16);
 m4TRS(root,P.x,P.y+P.rootY-drop,P.z,P.lean,P.yaw,P.bank,1.02,P.sy*.92,1.02);
 if(P.ground)s3dPushChild(K.disc,root,0,.012,.05,0,0,0,.31,.018,.48,[.02,.03,.04],a*.17);
 s3dPushChild(K.sphere,root,0,R.hipY,0,0,0,0,.16,.11,.12,pants,a);
 m4TRS(node,0,R.hipY,0,P.torsoRx,P.torsoRy,P.torsoRz,1,1,1);m4Mul(torso,root,node);
 /* Clean low-poly torso: two solid volumes, no balloon-like chest spheres. */
 s3dPushChild(K.box,torso,0,.145,0,0,0,0,.29,.20,.18,cloth,a);
 s3dPushChild(K.box,torso,0,.315,-.004,0,0,0,.36,.17,.195,cloth,a);
 s3dPushChild(K.box,torso,0,.392,-.006,0,0,0,.35,.035,.20,acc,a);
 s3dPushChild(K.box,torso,0,.055,-.002,0,0,0,.27,.045,.17,acc,a*.9);
 s3dPushChild(K.cyl,torso,0,.455,0,0,0,0,.062,.082,.062,skin,a);
 m4TRS(node,0,.487,0,P.headRx,P.headRy,P.headRz,1,1,1);m4Mul(node2,torso,node);const head=node2.slice();
 s3dPushChild(K.sphere,head,0,.145,0,0,0,0,.158,.188,.155,skin,a);
 s3dPushChild(K.sphere,head,0,.073,-.012,0,0,0,.136,.104,.134,skin,a);
 for(const s of [-1,1]){const bk=1-(P.blink||0)*.92;s3dPushChild(K.sphere,head,s*.055,.18,-.149,0,0,0,.019,.022*bk,.009,[.95,.96,.97],a);s3dPushChild(K.sphere,head,s*.055,.18,-.157,0,0,0,.0085,.011*bk,.005,tint(C.eye).map(v=>v*.4),a);s3dPushChild(K.box,head,s*.055,.217,-.154,0,0,s*.07,.045,.007,.007,hair,a)}
 s3dPushChild(K.sphere,head,0,.135,-.157,0,0,0,.015,.022,.012,s3dMix(skin,[.62,.34,.24],.14),a);s3dPushChild(K.box,head,0,.073,-.159,0,0,0,.044,.006,.006,[.42,.16,.14],a*.7);
 if(C.glasses){for(const s of [-1,1])s3dPushChild(K.disc,head,s*.055,.18,-.165,Math.PI/2,0,0,.041,.008,.041,[.1,.11,.14],a);s3dPushChild(K.box,head,0,.18,-.166,0,0,0,.045,.006,.006,[.1,.11,.14],a)}
 const hs=C.hairStyle,crown=()=>s3dPushChild(K.sphere,head,0,.247,.028,0,0,0,.157,.088,.151,hair,a);crown();
 if(hs==='curly')for(const [x,y,z] of [[-.085,.305,.02],[0,.322,.025],[.085,.305,.02]])s3dPushChild(K.sphere,head,x,y,z,0,0,0,.048,.045,.048,hair,a);
 else if(hs==='long'){s3dPushChild(K.sphere,head,0,.07,.13,.08,0,0,.13,.225,.065,hair,a);for(const s of [-1,1])s3dPushChild(K.sphere,head,s*.137,.082,.045,0,0,s*-.07,.036,.17,.062,hair,a)}
 else if(hs==='bob')s3dPushChild(K.sphere,head,0,.09,.095,0,0,0,.151,.12,.092,hair,a);else if(hs==='bun'||hs==='bun-side')s3dPushChild(K.sphere,head,hs==='bun'?0:.15,.337,.05,0,0,0,.065,.065,.065,hair,a);else if(hs==='sidepart')s3dPushChild(K.sphere,head,-.052,.28,-.04,0,0,.2,.115,.046,.112,hair,a);else if(hs==='cap'){s3dPushChild(K.sphere,head,0,.258,.02,0,0,0,.163,.10,.158,acc,a);s3dPushChild(K.box,head,0,.242,-.158,-.15,0,0,.188,.015,.09,acc,a)}
 /* Cylindrical limbs: enough volume to read on a phone, without shoulder bulbs. */
 for(const s of [-1,1]){const rx=s<0?P.shL:P.shR,rz=s<0?-P.shLz:P.shRz,el=s<0?P.elL:P.elR;m4TRS(node,s*.195,.355,0,rx,0,rz,1,1,1);m4Mul(node2,torso,node);s3dPushChild(K.cyl,node2,0,-R.upper*.45,0,0,0,0,.052,R.upper*.87,.055,cloth,a);m4TRS(node,0,-R.upper*.94,0,el,0,0,1,1,1);const em=node2.slice();m4Mul(node2,em,node);s3dPushChild(K.sphere,node2,0,0,0,0,0,0,.044,.044,.044,skin,a);s3dPushChild(K.cyl,node2,0,-.112,0,0,0,0,.041,.218,.043,skin,a);s3dPushChild(K.sphere,node2,0,-.232,-.008,0,0,0,.047,.057,.041,skin,a)}
 if(P.legs)for(const s of [-1,1]){const hip=s<0?P.hipL:P.hipR,hz=s<0?-P.hipLz:P.hipRz,knee=s<0?P.kneeL:P.kneeR,foot=s<0?P.footL:P.footR;m4TRS(node,s*.095,R.hipY,0,hip,0,hz,1,1,1);m4Mul(node2,root,node);s3dPushChild(K.cyl,node2,0,-R.thigh*.47,0,0,0,0,.078,R.thigh*.92,.083,pants,a);m4TRS(node,0,-R.thigh,0,knee,0,0,1,1,1);const km=node2.slice();m4Mul(node2,km,node);s3dPushChild(K.sphere,node2,0,0,0,0,0,0,.064,.059,.067,pants,a);s3dPushChild(K.cyl,node2,0,-R.shin*.46,0,0,0,0,.058,R.shin*.89,.061,pants,a);m4TRS(node,0,-R.shin,0,foot,0,0,1,1,1);const fm=node2.slice();m4Mul(node2,fm,node);s3dPushChild(K.sphere,node2,0,-.018,-.082,-.04,0,0,.077,.05,.153,shoes,a);s3dPushChild(K.box,node2,0,-.04,-.156,0,0,0,.074,.02,.072,[.96,.96,.97],a)}
 return {root,torso,head,footY:P.y+P.rootY-drop};
}`;
repl('s3dDrawRig',rig);fs.writeFileSync('index.html',src);let sw=fs.readFileSync('service-worker.js','utf8');sw=sw.replace(/speak-english-v(\d+)/,(_,n)=>'speak-english-v'+(Number(n)+1));fs.writeFileSync('service-worker.js',sw);
