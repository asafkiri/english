import fs from 'node:fs';
let src=fs.readFileSync('index.html','utf8');
function repl(name,body){const s=src.indexOf('function '+name);if(s<0)throw Error(name);const b=src.indexOf('{',s);let d=0,q='',e=false,line=false,block=false;for(let i=b;i<src.length;i++){const c=src[i],n=src[i+1];if(line){if(c==='\n')line=false;continue}if(block){if(c==='*'&&n==='/'){block=false;i++}continue}if(q){if(e){e=false;continue}if(c==='\\'){e=true;continue}if(c===q)q='';continue}if(c==='/'&&n==='/'){line=true;i++;continue}if(c==='/'&&n==='*'){block=true;i++;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0){src=src.slice(0,s)+body+src.slice(i+1);return}}throw Error('unterminated '+name)}
const rig=`function s3dDrawRig(r,look,P){
 const K=r.kinds,C=look,R=S3D_RIG,flash=P.flash||0,tint=c=>flash>0?s3dMix(c,[1,.35,.3],flash):c;
 const skin=s3dMix(tint(C.skin),[1,.80,.66],.12),cloth=tint(C.clothes),acc=tint(C.accent),pants=tint(C.pants),shoes=tint(C.shoes),hair=tint(C.hair),a=P.alpha;
 let drop=0;if(P.legs&&P.ground)drop=Math.min(s3dFootDrop(P.hipL,P.kneeL),s3dFootDrop(P.hipR,P.kneeR));
 const root=new Float32Array(16),torso=new Float32Array(16),node=new Float32Array(16),node2=new Float32Array(16);
 /* Slightly shorter and wider than the previous pass. The screenshot showed an
    8-head-tall stick figure; this brings Sam back toward a compact game hero. */
 m4TRS(root,P.x,P.y+P.rootY-drop,P.z,P.lean,P.yaw,P.bank,1.075,P.sy*.94,1.06);
 if(P.ground)s3dPushChild(K.disc,root,0,.012,.05,0,0,0,.32,.018,.50,[.02,.03,.04],a*.18);
 s3dPushChild(K.sphere,root,0,R.hipY,0,0,0,0,.17,.115,.125,pants,a);
 m4TRS(node,0,R.hipY,0,P.torsoRx,P.torsoRy,P.torsoRz,1,1,1);m4Mul(torso,root,node);
 /* One chest mass instead of shoulder knobs. */
 s3dPushChild(K.sphere,torso,0,.12,0,0,0,0,.165,.15,.125,cloth,a);
 s3dPushChild(K.sphere,torso,0,.285,-.005,0,0,0,.225,.195,.14,cloth,a);
 s3dPushChild(K.box,torso,0,.38,-.004,0,0,0,.36,.045,.205,acc,a);
 s3dPushChild(K.cyl,torso,0,.458,0,0,0,0,.065,.085,.065,skin,a);
 m4TRS(node,0,.49,0,P.headRx,P.headRy,P.headRz,1,1,1);m4Mul(node2,torso,node);const head=node2.slice();
 /* Head restored a little in size so the body does not dominate it. */
 s3dPushChild(K.sphere,head,0,.145,0,0,0,0,.16,.19,.157,skin,a);
 s3dPushChild(K.sphere,head,0,.07,-.014,0,0,0,.137,.105,.135,skin,a);
 for(const s of [-1,1]){const bk=1-(P.blink||0)*.92;s3dPushChild(K.sphere,head,s*.056,.179,-.151,0,0,0,.019,.022*bk,.009,[.95,.96,.97],a);s3dPushChild(K.sphere,head,s*.056,.179,-.159,0,0,0,.0085,.011*bk,.005,tint(C.eye).map(v=>v*.4),a);s3dPushChild(K.box,head,s*.056,.217,-.156,0,0,s*.07,.045,.007,.007,hair,a)}
 s3dPushChild(K.sphere,head,0,.134,-.159,0,0,0,.015,.023,.012,s3dMix(skin,[.62,.34,.24],.15),a);s3dPushChild(K.box,head,0,.071,-.161,0,0,0,.045,.006,.006,[.42,.16,.14],a*.7);
 if(C.glasses){for(const s of [-1,1])s3dPushChild(K.disc,head,s*.056,.179,-.167,Math.PI/2,0,0,.041,.008,.041,[.1,.11,.14],a);s3dPushChild(K.box,head,0,.179,-.168,0,0,0,.045,.006,.006,[.1,.11,.14],a)}
 const hs=C.hairStyle,crown=()=>s3dPushChild(K.sphere,head,0,.246,.025,0,0,0,.161,.10,.158,hair,a);crown();
 if(hs==='curly')for(const [x,y,z] of [[-.11,.313,.02],[0,.33,.03],[.11,.313,.02],[-.15,.258,.04],[.15,.258,.04]])s3dPushChild(K.sphere,head,x,y,z,0,0,0,.061,.058,.061,hair,a);
 else if(hs==='long'){s3dPushChild(K.sphere,head,0,.07,.13,.08,0,0,.135,.235,.068,hair,a);for(const s of [-1,1])s3dPushChild(K.sphere,head,s*.14,.08,.045,0,0,s*-.07,.038,.175,.064,hair,a)}
 else if(hs==='bob')s3dPushChild(K.sphere,head,0,.09,.095,0,0,0,.155,.125,.095,hair,a);else if(hs==='bun'||hs==='bun-side')s3dPushChild(K.sphere,head,hs==='bun'?0:.155,.34,.05,0,0,0,.068,.068,.068,hair,a);else if(hs==='sidepart')s3dPushChild(K.sphere,head,-.055,.282,-.04,0,0,.2,.12,.048,.115,hair,a);else if(hs==='cap'){s3dPushChild(K.sphere,head,0,.26,.02,0,0,0,.166,.105,.16,acc,a);s3dPushChild(K.box,head,0,.243,-.16,-.15,0,0,.19,.015,.09,acc,a)}
 /* Arms shortened and thickened. Their roots sit under the chest so the shoulder
    silhouette is continuous rather than two blue balls floating outside it. */
 for(const s of [-1,1]){const rx=s<0?P.shL:P.shR,rz=s<0?-P.shLz:P.shRz,el=s<0?P.elL:P.elR;m4TRS(node,s*.205,.36,0,rx,0,rz,1,1,1);m4Mul(node2,torso,node);s3dPushChild(K.cyl,node2,0,-R.upper*.43,0,0,0,0,.055,R.upper*.83,.058,cloth,a);m4TRS(node,0,-R.upper*.90,0,el,0,0,1,1,1);const em=node2.slice();m4Mul(node2,em,node);s3dPushChild(K.sphere,node2,0,0,0,0,0,0,.045,.045,.045,skin,a);s3dPushChild(K.cyl,node2,0,-.105,0,0,0,0,.039,.205,.041,skin,a);s3dPushChild(K.sphere,node2,0,-.218,-.008,0,0,0,.048,.058,.042,skin,a)}
 if(P.legs)for(const s of [-1,1]){const hip=s<0?P.hipL:P.hipR,hz=s<0?-P.hipLz:P.hipRz,knee=s<0?P.kneeL:P.kneeR,foot=s<0?P.footL:P.footR;m4TRS(node,s*.095,R.hipY,0,hip,0,hz,1,1,1);m4Mul(node2,root,node);s3dPushChild(K.cyl,node2,0,-R.thigh*.47,0,0,0,0,.071,R.thigh*.92,.078,pants,a);m4TRS(node,0,-R.thigh,0,knee,0,0,1,1,1);const km=node2.slice();m4Mul(node2,km,node);s3dPushChild(K.sphere,node2,0,0,0,0,0,0,.06,.056,.063,pants,a);s3dPushChild(K.cyl,node2,0,-R.shin*.46,0,0,0,0,.051,R.shin*.89,.055,pants,a);m4TRS(node,0,-R.shin,0,foot,0,0,1,1,1);const fm=node2.slice();m4Mul(node2,fm,node);s3dPushChild(K.sphere,node2,0,-.018,-.08,-.04,0,0,.073,.047,.15,shoes,a);s3dPushChild(K.box,node2,0,-.039,-.154,0,0,0,.071,.019,.07,[.96,.96,.97],a)}
 return {root,torso,head,footY:P.y+P.rootY-drop};
}`;
repl('s3dDrawRig',rig);fs.writeFileSync('index.html',src);let sw=fs.readFileSync('service-worker.js','utf8');sw=sw.replace(/speak-english-v(\d+)/,(_,n)=>'speak-english-v'+(Number(n)+1));fs.writeFileSync('service-worker.js',sw);
