(() => {
  "use strict";

  const VIEW_WIDTH=900, VIEW_HEIGHT=600;
  // Each camera is calibrated independently against the four corners of the patio
  // door and the paving lines. The common world origin is below the centre of the
  // opening; x follows the facade, y the terrace, and z is height, all in cm.
  const plates={
    overview: {
      file:"tuin.webp", crop:[0,0,900], eye:[-355,1265,102],
      matrix:[[0.91052991,-0.085,0,431.16524217],[0.18694017,-0.208,-0.80164315,411.36182336],[0.00053561,-0.00064,0,1]]
    },
    roof: {
      file:"tuin-dak.webp", crop:[233,109,480], eye:[-542,2281,1255],
      matrix:[[0.76696672,0.037,-0.09106991,445.40253566],[-0.04331537,0.203,-0.64112704,318.45166403],[0.00017116,-0.00027,-0.00023219,1]]
    },
    left: {
      file:"tuin-links.webp", crop:[269,194,449], eye:[-792,1035,140],
      matrix:[[0.79389928,0.14886258,0,474.57168345],[0.30031655,-0.09350705,-0.61639619,420.64897842],[0.00086331,-0.00031169,0,1.00604317]]
    },
    right: {
      file:"tuin-rechts.webp", crop:[204,151,519], eye:[600,1286,132],
      matrix:[[0.38225455,-0.5,0,413.57958788],[-0.20768485,-0.148,-0.74838619,413.89752727],[-0.0006303,-0.000493,0,1.01197576]]
    },
    front: {
      file:"tuin-voor.webp", crop:[92,112,715], eye:[-3,2128,367],
      matrix:[[0.842,-0.21,0,449.5],[0,-0.055,-0.82325581,419],[0,-0.00047,0,1]]
    },
    lighting: {
      file:"tuin-licht.webp", crop:[0,0,900], eye:[-220,475,74],
      matrix:[[1.72865334,-0.31370608,0.09846249,522.02789764],[0.47045919,-1.28894798,-1.39603128,819.0576251],[0.00067168,-0.00182475,0.0001963,1]]
    }
  };
  const closer={
    leftWedge: {plate:"left",crop:[271,160,346]},
    rightWedge: {plate:"right",crop:[365,106,354]},
    shade: {plate:"roof",crop:[245,111,454]}
  };
  const finishes = {
    antraciet: [72, 74, 73],
    zwart: [39, 39, 38],
    grijs: [141, 144, 139]
  };
  const rgba = (r,g,b,a) => `rgba(${r},${g},${b},${a})`;
  const mixTone = (rgb, light) => `rgb(${rgb.map(v => Math.max(0, Math.min(255, v + light))).join(",")})`;

  const baseURL=document.currentScript.src;
  const images=new Map(), latest=new WeakMap();
  const backingWidth=1536, backingHeight=1024;
  function loadPlate(name) {
    if(images.has(name)) return images.get(name);
    const image=new Image();
    const loaded=new Promise((resolve,reject)=>{
      image.onload=()=>resolve(image);
      image.onerror=()=>{images.delete(name);reject(new Error("Kan het tuinbeeld niet laden: "+name));};
    });
    const asset={image,loaded};
    images.set(name,asset);
    image.src=new URL(plates[name].file,baseURL).href;
    return asset;
  }
  const ready=loadPlate("overview").loaded;
  ready.then(()=>{
    for(const key of Object.keys(plates)) if(key!=="overview") loadPlate(key).loaded.catch(()=>{});
  }).catch(()=>{});

  function paint(canvas,cfg,view,plate,garden) {
    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth;
      canvas.height = backingHeight;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(backingWidth / VIEW_WIDTH, 0, 0, backingHeight / VIEW_HEIGHT, 0, 0);
    const w = Math.max(300,Math.min(700,Number(cfg.width) || 500));
    const d = Math.max(200,Math.min(cfg.roof === "glas-helder" ? 400 : 600, Number(cfg.depth) || 300));
    const left = -w / 2, right = w / 2;
    const mountingHeight=263;
    const topAt = y => mountingHeight - .051 * y;
    const eave = topAt(d);
    const color = finishes[cfg.color] || finishes.antraciet;
    const spans = Math.ceil(w / 89);
    const span = w / spans;

    const matrix=plate.matrix, eye=plate.eye, above=eye[2]>mountingHeight;
    const source=(point,row)=>matrix[row][0]*point[0]+matrix[row][1]*point[1]+matrix[row][2]*point[2]+matrix[row][3];
    const distance=point=>source(point,2);
    function platePoint(point) {
      const z=Math.max(.12,distance(point));
      return [source(point,0)/z,source(point,1)/z];
    }
    const base=closer[view]?.crop || plate.crop;
    const framing=(function(){
      if(view==="overview" || view==="lighting" || view.endsWith("Wedge")) return base;
      let focus;
      if(view==="roof" || view==="shade") focus=[
        [left,0,mountingHeight],[right,0,mountingHeight],[left,d,eave],[right,d,eave]
      ];
      else if(view==="front") focus=[[left,d,0],[right,d,0],[left,d,eave],[right,d,eave]];
      else {
        const side=view==="left"?left:right;
        focus=[[side,0,0],[side,d,0],[side,0,mountingHeight],[side,d,eave]];
      }
      const border=12;
      const coords=focus.map(platePoint);
      const x0=Math.min(base[0],...coords.map(p=>p[0]-border));
      const x1=Math.max(base[0]+base[2],...coords.map(p=>p[0]+border));
      const y0=Math.min(base[1],...coords.map(p=>p[1]-border));
      const y1=Math.max(base[1]+base[2]*2/3,...coords.map(p=>p[1]+border));
      const cw=Math.min(900,Math.max(x1-x0,(y1-y0)*1.5));
      return [Math.max(0,Math.min(900-cw,(x0+x1-cw)/2)),Math.max(0,Math.min(600-cw*2/3,(y0+y1-cw*2/3)/2)),cw];
    })();
    const [ox,oy,cropWidth]=framing, zoom=900/cropWidth;
    const sx=garden.naturalWidth/900, sy=garden.naturalHeight/600;
    ctx.drawImage(garden,ox*sx,oy*sy,cropWidth*sx,cropWidth*2/3*sy,0,0,900,600);
    const project=p=>{const [x,y]=platePoint(p);return [(x-ox)*zoom,(y-oy)*zoom];};
    function nearClip(points,closed) {
      if(view!=="lighting"||points.every(p=>distance(p)>=.12)) return points;
      const out=[];
      let a=closed?points.at(-1):points[0], za=distance(a);
      for(const b of points){
        const zb=distance(b);
        if((za>=.12)!==(zb>=.12)){
          const t=(.12-za)/(zb-za);out.push(a.map((v,i)=>v+(b[i]-v)*t));
        }
        if(zb>=.12)out.push(b);
        a=b;za=zb;
      }
      return out;
    }
    function path(points) {
      points=nearClip(points,true);
      ctx.beginPath();
      for (let i=0; i<points.length; i++) {
        const [x,y] = project(points[i]);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.closePath();
    }
    function fill(points, style) {
      path(points);
      ctx.fillStyle = style;
      ctx.fill();
    }
    function line(a,b,style,width=1) {
      const clipped=nearClip([a,b],false);
      if(clipped.length<2) return;
      [a,b]=clipped;
      const [x,y] = project(a), [xx,yy] = project(b);
      ctx.beginPath(); ctx.moveTo(x,y);ctx.lineTo(xx,yy);
      ctx.strokeStyle = style; ctx.lineWidth = width; ctx.stroke();
    }
    function gradient(a, b, stops) {
      const g = ctx.createLinearGradient(...a, ...b);
      for (const [pos, style] of stops) g.addColorStop(pos,style);
      return g;
    }
    function metal(light) {
      return gradient([80,75],[830,435],[
        [0,mixTone(color,light-12)],[.24,mixTone(color,light)],
        [.43,mixTone(color,light-9)],[.57,mixTone(color,light+7)],
        [.72,mixTone(color,light+14)],[1,mixTone(color,light+1)]
      ]);
    }
    const bare = metal(-3), flank = metal(-16), underside = metal(-25), bright = metal(11);
    const edge = rgba(224,226,217,.31), seam = rgba(15,22,22,.55);

    // Rectangular aluminium extrusion, with sloped ends for rafters.
    function profile(x0,x1,y0,y1,z0,z1,t) {
      const p=[x0,y0,z0], q=[x1,y0,z0], r=[x1,y1,z1], s=[x0,y1,z1];
      const bottom = ([x,y,z]) => [x,y,z-t];
      if(eye[2]<Math.max(z0,z1)) fill([bottom(p),bottom(q),bottom(r),bottom(s)],underside);
      if(eye[0]<x0) fill([p,s,bottom(s),bottom(p)],flank);
      if(eye[0]>x1) fill([q,r,bottom(r),bottom(q)],bright);
      if(eye[1]>y1) fill([s,r,bottom(r),bottom(s)],bare);
      if(eye[1]<y0) fill([p,q,bottom(q),bottom(p)],flank);
      if(eye[2]>Math.max(z0,z1)) fill([p,q,r,s],bright);
      line(s,r,edge,.64);
      line(s,bottom(s),rgba(211,217,208,.23),.58);
      line(bottom(s),bottom(r),seam,.52);
    }
    function post(x,y,diameter,height) {
      const half = diameter/2;
      profile(x-half,x+half,y-half,y+half,height,height,height);
      profile(x-half-.7,x+half+.7,y-half-.7,y+half+.7,1.3,1.3,1.3);
    }
    // A soft frame shadow anchors the extrusion to the fixed, photographed paving.
    function shadows() {
      const shadow = (x,y,z) => [x-z*.21,y+z*.17,.25];
      const alongRafter = x => [
        shadow(x-2,0,topAt(0)),shadow(x+2,0,topAt(0)),
        shadow(x+2,d,eave),shadow(x-2,d,eave)
      ];
      const frontPosts = w >= 600 ? [left,0,right] : [left,right];
      ctx.save();
      ctx.filter="blur(1.7px)";
      fill([shadow(left,0,mountingHeight),shadow(right,0,mountingHeight),shadow(right,d,eave),shadow(left,d,eave)],
        cfg.shade==="met" || cfg.roof.endsWith("opaal") ? "rgba(36,40,44,.18)" : "rgba(43,54,59,.065)");
      for(let i=0;i<=spans;i++) fill(alongRafter(left+span*i),"rgba(44,40,37,.14)");
      for (const x of frontPosts) {
        fill([[x-5,d,0],[x+5,d,0],shadow(x+5,d,eave),shadow(x-5,d,eave)],"rgba(35,34,32,.18)");
      }
      ctx.restore();
      for(const x of frontPosts) {
        const [sx,sy]=project([x,d,0]);
        ctx.save();ctx.translate(sx,sy);ctx.scale(1,.27);
        const g=ctx.createRadialGradient(0,0,0,0,0,16);
        g.addColorStop(0,"rgba(24,22,18,.45)");g.addColorStop(1,"rgba(24,22,18,0)");
        ctx.fillStyle=g;ctx.fillRect(-16,-16,32,32);ctx.restore();
      }
    }

    // Window coatings transmit the background and reflect a little of the same sky and foliage.
    function glazing(points, kind, isRoof=false) {
      const opal = kind.includes("opaal");
      const visible=nearClip(points,true);
      if(visible.length<3)return;
      const screen=visible.map(project);
      const xs=screen.map(p=>p[0]), ys=screen.map(p=>p[1]);
      const x=Math.min(...xs), y=Math.min(...ys), rw=Math.max(...xs)-x, rh=Math.max(...ys)-y;
      if(rw<.1 || rh<.1) return;
      const grad=gradient([x,y],[x+rw,y+rh],opal ? [
        [0,rgba(230,232,218,.93)],[.45,rgba(213,221,213,.90)],[1,rgba(187,203,198,.94)]
      ] : [
        [0,rgba(178,199,203,.22)],[.35,rgba(196,215,217,.09)],
        [.65,rgba(166,198,200,.22)],[1,rgba(181,205,202,.13)]
      ]);
      fill(points,grad);
      ctx.save();path(points);ctx.clip();
      ctx.globalAlpha=opal ? .035 : isRoof ? .13 : .095;
      // A subtle sky reflection stays on the glazing. The unmodified garden photo
      // beneath the structure always uses its single, uniform photographic crop.
      const reflection=plate===plates.roof?[710,6,175,125]:
        plate===plates.lighting?[650,0,170,102]:[610,4,215,141];
      ctx.drawImage(garden,reflection[0]*sx,reflection[1]*sy,reflection[2]*sx,reflection[3]*sy,
        x,y,rw,rh);
      ctx.restore();
      ctx.save();path(points);ctx.clip();
      ctx.fillStyle=gradient([x,y+rh],[x+rw,y],[
        [0,rgba(238,247,239,0)],[.25,rgba(245,248,241,.018)],
        [.36,rgba(236,245,243,opal ? .05 : .13)],[.42,rgba(255,254,248,.022)],
        [.75,rgba(222,239,236,.018)],[1,rgba(219,232,236,.11)]
      ]);
      ctx.fillRect(x,y,rw,rh);
      ctx.restore();
    }

    function sidePlane(which) {
      if(which==="front") return {length:w, at:(s,z)=>[left+s,d,z]};
      const x=which==="left" ? left : right;
      return {length:d, at:(s,z)=>[x,s,z]};
    }
    function wall(which,material) {
      if(material==="open" || !material) return;
      const {length,at}=sidePlane(which);
      const high=eave-12;
      const quad=(s0,s1,lo,hi)=>[at(s0,lo),at(s1,lo),at(s1,hi),at(s0,hi)];
      if(material==="aluminium") {
        fill(quad(0,length,0,high),flank);
        for(let z=2;z<high;z+=13) {
          line(at(0,z),at(length,z),seam,1.15);
          line(at(0,z+1.25),at(length,z+1.25),edge,.68);
        }
      } else {
        const panels=material==="schuifpui"?Math.max(2,Math.round(length/138)):Math.max(2,Math.round(length/88));
        glazing(quad(0,length,2,high),"glas");
        for(let i=1;i<panels;i++){
          const s=i*length/panels;
          if(material==="schuifpui") fill(quad(s-2.0,s+2.0,2,high),bare);
          else {
            fill(quad(s-.7,s+1.2,3,high-1),"rgba(101,137,129,.42)");
            line(at(s,3),at(s,high-1),rgba(235,247,240,.79),.8);
            line(at(s+2,3),at(s+2,high-1),rgba(77,106,103,.4),.6);
          }
        }
        const handle = (material==="schuifpui" ? 1/panels : .94)*length - 4;
        fill(quad(handle-1.1,handle+1.1,101,115),flank);
        line(at(handle-1.1,101),at(handle-1.1,115),edge,.65);
      }
      fill(quad(0,length,0,material==="schuifpui"?5:3),bare);
      line(at(0,3.8),at(length,3.8),edge,.8);
      fill(quad(0,length,high-2.5,high),flank);
    }
    function wedge(which,material) {
      if(material==="geen" || !material) return;
      const {at}=sidePlane(which), low=eave-10;
      const pts=[at(0,low),at(d,low),at(0,topAt(0)-7)];
      if(material==="aluminium") {
        fill(pts,bare);
        for(let z=low+7;z<topAt(0)-7;z+=7) {
          const until=d*(1-(z-low)/(topAt(0)-7-low));
          line(at(0,z),at(until,z),seam,.9);
        }
      } else {
        glazing(pts,material);
        if(material.startsWith("poly")) {
          for(let s=5;s<d;s+=5) line(at(s,low),at(s,low+(1-s/d)*(topAt(0)-7-low)),rgba(221,233,225,.5),.72);
        }
      }
      line(at(0,low),at(d,low),flank,2.4);
      line(at(0,low+.9),at(d,low+.9),edge,.66);
    }

    function awning() {
      if(cfg.shade!=="met")return;
      const end=d*.77, margin=4.2;
      const fabric=(x,y)=>[x,y,topAt(y)+4.2];
      const stripe=gradient(project(fabric(left,0)),project(fabric(right,end)),[
        [0,"#b5aa91"],[.28,"#d1c5a9"],[.76,"#dbceb0"],[1,"#bfb093"]
      ]);
      fill([fabric(left+margin,2),fabric(right-margin,2),fabric(right-margin,end),fabric(left+margin,end)],stripe);
      for(let y=5;y<end;y+=3)line(fabric(left+margin,y),fabric(right-margin,y),"rgba(91,79,56,.12)",.48);
      profile(left-margin,left+margin,1,d,topAt(1)+6,eave+6,3);
      profile(right-margin,right+margin,1,d,topAt(1)+6,eave+6,3);
      profile(left-margin,right+margin,1,7,mountingHeight+8,topAt(7)+8,5.6);
      profile(left+margin,right-margin,end-1.6,end+1.6,topAt(end)+5.4,topAt(end)+5.4,2.9);
    }
    function roof() {
      const at=(x,y)=>[x,y,topAt(y)];
      if(!above)awning();
      glazing([at(left,0),at(right,0),at(right,d),at(left,d)],cfg.roof,true);
      if(cfg.roof.startsWith("poly")) {
        const underside=view==="lighting";
        const pitch=underside?5.8:2.4;
        for(let x=left+1.8;x<right;x+=pitch) {
          line(at(x,0),at(x,d),rgba(115,145,143,underside ? .16 : .34),underside ? .8 : .6);
          if(!underside)line(at(x+.7,0),at(x+.7,d),rgba(243,246,236,.52),.55);
        }
      }
      for(let n=0;n<=spans;n++) {
        const i=eye[0]>0?n:spans-n, x=left+i*span;
        const rafterWidth= i===0 || i===spans ? 5.2 : 3.8;
        profile(x-rafterWidth/2,x+rafterWidth/2,1,d,topAt(1)+.3,eave+.3,6.1);
        if(!above && (cfg.led==="koud" || cfg.led==="warm"))
          for(const y of [d*.37,d*.74]) spotlight([x,y,topAt(y)-6.3],cfg.led==="warm");
      }
      if(above)awning();
    }
    function spotlight(pos,warm) {
      if(distance(pos)<.12)return;
      const [x,y]=project(pos), probe=project([pos[0]+2,pos[1],pos[2]]);
      const scale=Math.min(8,Math.max(.55,Math.hypot(probe[0]-x,probe[1]-y)/2));
      const spread=(warm?10:6)*scale, hue=warm?"255,209,128":"218,238,255";
      ctx.save();ctx.translate(x,y);ctx.scale(1,.69);
      ctx.beginPath();ctx.ellipse(0,0,2.5*scale,2.1*scale,0,0,Math.PI*2);
      ctx.fillStyle="#494e4c";ctx.fill();
      const glow=ctx.createRadialGradient(0,0,0,0,0,spread);
      glow.addColorStop(0,`rgba(${hue},.8)`);glow.addColorStop(.28,`rgba(${hue},.23)`);glow.addColorStop(1,`rgba(${hue},0)`);
      ctx.fillStyle=glow;ctx.fillRect(-spread,-spread,spread*2,spread*2);
      ctx.beginPath();ctx.ellipse(0,0,1.7*scale,1.1*scale,0,0,Math.PI*2);ctx.fillStyle=warm?"#fff1c7":"#f2fbff";ctx.fill();
      ctx.restore();
    }

    if(view!=="lighting")shadows();
    // Flashing sits directly on the measured facade plane, with a thin shadow
    // under the ledger and a raised lip closing the top edge against the brick.
    const bottom=mountingHeight-10.4;
    fill([[left-2,0,bottom],[right+2,0,bottom],[right+2,0,bottom-3.1],[left-2,0,bottom-3.1]],"rgba(35,30,27,.26)");
    profile(left-2,right+2,-.25,4.7,mountingHeight+1.6,mountingHeight+.9,11.2);
    profile(left-2,right+2,-.35,.8,mountingHeight+3.1,mountingHeight+3.1,2.3);
    const near=eye[0]>0?"right":"left",far=near==="left"?"right":"left";
    const sideX=name=>name==="left"?left:right;
    const sideWall=name=>{wall(name,cfg[name]);wedge(name,cfg[name+"Wedge"]);};
    sideWall(far);
    post(sideX(far),d,9,eave-5.8);
    if(!above)roof();
    if(eye[1]>d || above)wall("front",cfg.front);
    sideWall(near);
    if(w>=600)post(0,d,9,eave-5.8);
    post(sideX(near),d,9,eave-5.8);
    if(above)roof();
    profile(left-5,right+5,d-4.5,d+5.3,eave+1,eave+1,12.4);
    line([left-5,d+5.3,eave-9.7],[right+5,d+5.3,eave-9.7],rgba(198,199,185,.29),.72);
    const nx=sideX(near);
    profile(nx-3.3,nx+3.3,1,d-4.5,topAt(1)+1,eave+1,7.8);
  }

  function render(canvas,config,view="overview") {
    const key=closer[view]?.plate || view;
    if(!Object.hasOwn(plates,key))return Promise.reject(new Error("Onbekend fotoaanzicht: "+view));
    const token={}, snapshot={color:"antraciet",roof:"glas-helder",...config};
    latest.set(canvas,token);
    const asset=loadPlate(key);
    const draw=image=>{
      if(latest.get(canvas)!==token)return;
      paint(canvas,snapshot,view,plates[key],image);
      canvas.dataset.view=view;
      canvas.dataset.rendered="true";
    };
    if(asset.image.complete && asset.image.naturalWidth){draw(asset.image);return Promise.resolve();}
    return asset.loaded.then(draw);
  }
  window.VerandaPreview={render,ready};
})();
