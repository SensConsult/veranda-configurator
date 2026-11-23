(() => {
  "use strict";

  // World axes follow the facade (x), the paving towards the viewer (y) and height (z), in cm.
  // Both vanishing points lie on the photographed horizon. All sizes use this same camera.
  const VIEW_WIDTH = 900, VIEW_HEIGHT = 600;
  function overviewProject([x, y, z]) {
    const across = .00053 * x, outward = -.00065 * y;
    const distance = 1 + across + outward;
    return [
      (352 + 1760 * across - 49 * outward) / distance,
      (416 + 344 * (across + outward) - .88 * z) / distance
    ];
  }
  const radians = degrees => degrees * Math.PI / 180;
  const cameraLength = Math.hypot(.00053, -.00065);
  const forwardX = .00053 / cameraLength, forwardY = -.00065 / cameraLength;
  const principalX = (1760 * .00053 ** 2 - 49 * .00065 ** 2) / cameraLength ** 2;
  const focalX = (1760 * .00053 * -forwardY + 49 * .00065 * forwardX) / cameraLength;
  const horizontal = (352 - principalX) / (cameraLength * focalX);
  const original = {
    x: horizontal * forwardY, y: -horizontal * forwardX, z: (416 - 344) / .88,
    yaw: Math.atan2(-forwardX,-forwardY), pitch: 0, distance: 1/cameraLength,
    fx: focalX, fy: .88/cameraLength, cx: principalX, cy: 344, detail: 0
  };

  function cameraPose(part, cfg) {
    const w=Number(cfg.width)||500, d=Math.min(Number(cfg.depth)||300,cfg.roof==="glas-helder"?400:600);
    const side=part.startsWith("right")?1:-1;
    let x=0, y=d*.5, z=145, yaw=-26, pitch=6, distance=w*1.12+d*.44, focal=765;
    switch(part) {
      case "color": x=-w*.07; break;
      case "roof": z=246; yaw=-26; pitch=55; distance=Math.max(410,w*1.10+d*.51); break;
      case "shade": z=246; yaw=24; pitch=46; distance=Math.max(395,w*1.04+d*.48); break;
      case "led": x=-w*.07; y=d*.36; z=254; yaw=-19; pitch=-58;
        distance=Math.max(156,Math.min(228,d*.64)); focal=485; break;
      case "front": y=d; z=122; yaw=3; pitch=3; distance=Math.max(354,w*.96); focal=677; break;
      case "left": case "right":
        x=side*w/2; y=d*.51; z=124; yaw=side*69; pitch=5;
        distance=Math.max(340,d*.88+83); focal=650; break;
      case "leftWedge": case "rightWedge":
        x=side*w/2; y=d*.31; z=255; yaw=side*69; pitch=2;
        distance=Math.max(155,Math.min(272,d*.64)); focal=635; break;
      default: return original;
    }
    return {x,y,z,yaw:radians(yaw),pitch:radians(pitch),distance,fx:focal,fy:focal,cx:450,cy:300,detail:1};
  }

  function viewpoint(pose) {
    const sx=Math.sin(pose.yaw), cx=Math.cos(pose.yaw), sz=Math.sin(pose.pitch), cz=Math.cos(pose.pitch);
    const depth=([x,y,z])=>pose.distance-(x-pose.x)*sx*cz-(y-pose.y)*cx*cz-(z-pose.z)*sz;
    const project=p=>{
      if(!pose.detail) return overviewProject(p);
      const n=Math.max(18,depth(p)), x=p[0]-pose.x, y=p[1]-pose.y, z=p[2]-pose.z;
      return [pose.cx+pose.fx*(cx*x-sx*y)/n, pose.cy-pose.fy*(-sx*sz*x-cx*sz*y+cz*z)/n];
    };
    return {project,depth,eye:[pose.x+pose.distance*sx*cz,pose.y+pose.distance*cx*cz,pose.z+pose.distance*sz]};
  }

  function clipNear(points,depth,closed=true) {
    const cut=22;
    const clipped=[];
    let a=closed?points.at(-1):points[0], za=depth(a);
    for(const b of points) {
      const zb=depth(b);
      if((za>=cut)!==(zb>=cut)) {
        const t=(cut-za)/(zb-za);
        clipped.push(a.map((value,i)=>value+(b[i]-value)*t));
      }
      if(zb>=cut) clipped.push(b);
      a=b;za=zb;
    }
    return clipped;
  }

  const finishes = {
    antraciet: [72, 74, 73],
    zwart: [39, 39, 38],
    grijs: [141, 144, 139]
  };
  const rgba = (r,g,b,a) => `rgba(${r},${g},${b},${a})`;
  const mixTone = (rgb, light) => `rgb(${rgb.map(v => Math.max(0, Math.min(255, v + light))).join(",")})`;

  const garden = new Image();
  let landscape;
  const ready = new Promise((resolve, reject) => {
    garden.onload = resolve;
    garden.onerror = () => reject(new Error("Het tuinbeeld kon niet worden geladen."));
  });
  // Prepare the detail environment once. Material fragments come from the same
  // garden photograph; the architecture itself occupies solid planes in world space.
  function detailLandscape() {
    if(landscape) return landscape;
    function surface(width,height) {
      const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
      return canvas;
    }
    const sw=garden.naturalWidth/900, sh=garden.naturalHeight/600;
    function sample(ctx,sx,sy,width,height,...dest) {
      ctx.drawImage(garden,sx*sw,sy*sh,width*sw,height*sh,...dest);
    }
    let seed=8731;
    const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
    const ambient=surface(500,340), sky=ambient.getContext("2d");
    sky.fillStyle="#aebda6";sky.fillRect(0,0,500,340);
    sky.filter="blur(6px) saturate(.82)";
    sample(sky,671,96,229,310,-18,-16,536,372);
    sky.filter="none";sky.fillStyle="rgba(210,222,204,.16)";sky.fillRect(0,0,500,340);
    const brick=surface(220,84), b=brick.getContext("2d");
    b.fillStyle="#bba893";b.fillRect(0,0,220,84);
    for(let row=0;row<14;row++) {
      for(let col=-1;col<11;col++) {
        const x=col*22+(row%2)*11, y=row*6;
        sample(b,265+random()*48,164+random()*36,17,3.8,x+.6,y+.55,21.1,4.85);
        b.fillStyle= `rgba(81,61,44,${random()*.09})`;b.fillRect(x+.6,y+.55,21.1,4.85);
        b.fillStyle="rgba(242,223,187,.21)";b.fillRect(x+1,y+.7,19,.53);
      }
    }
    const facade=surface(1280,410), f=facade.getContext("2d");
    f.fillStyle=f.createPattern(brick,"repeat");f.fillRect(0,0,1280,410);
    const side=surface(450,410), g=side.getContext("2d");
    g.fillStyle=g.createPattern(brick,"repeat");g.fillRect(0,0,450,410);
    g.fillStyle="rgba(72,73,67,.16)";g.fillRect(0,0,450,410);
    function windowFrame(x,z,w,h,panes,curtains) {
      const y=410-z-h;
      f.fillStyle="#a5937d";f.fillRect(x-2,y-2,w+4,h+4);
      f.fillStyle="#343b37";f.fillRect(x,y,w,h);
      const border=3.5, gap=3.4, pane=(w-2*border-(panes-1)*gap)/panes;
      for(let i=0;i<panes;i++) {
        const px=x+border+i*(pane+gap), py=y+border;
        f.save();f.beginPath();f.rect(px,py,pane,h-2*border);f.clip();
        const glass=f.createLinearGradient(0,py,0,py+h);
        glass.addColorStop(0,"#727f76");glass.addColorStop(.4,"#52675d");glass.addColorStop(1,"#303a32");
        f.fillStyle=glass;f.fillRect(px,py,pane,h);
        f.globalAlpha=.39;
        f.drawImage(ambient,x,y,w,h);
        f.globalAlpha=1;
        if(curtains && (i===0||i===panes-1)) {
          const start=i===0?px:px+pane*.66;
          for(let j=0;j<pane*.34;j+=3.8) {
            const wave=.5+.5*Math.cos(j*.85);
            f.fillStyle=`rgba(226,219,192,${.28+.32*wave})`;
            f.fillRect(start+j,py,3.9,h-2*border);
          }
        }
        f.fillStyle="rgba(213,226,217,.16)";f.fillRect(px,py,.9,h-2*border);
        f.restore();
      }
      f.fillStyle="#696e65";f.fillRect(x+1,y,w-2,1.3);
      if(curtains){f.fillStyle="#9faaa0";f.fillRect(x+w*.5+3,y+h*.51,1.9,10);}
    }
    // Sliding door and upper windows follow the placement of the photographed house.
    windowFrame(414,1,478,208,4,true);
    windowFrame(534,278,96,103,2,false);windowFrame(735,278,94,103,2,false);
    const stone=surface(320,320), st=stone.getContext("2d");
    st.fillStyle="#d6c9b9";st.fillRect(0,0,320,320);
    for(let y=0;y<320;y+=80)for(let x=0;x<320;x+=80){
      st.globalAlpha=.69;
      sample(st,305+random()*175,452+random()*14,46,8,x+1,y+1,79.2,79.2);
      st.globalAlpha=1;st.fillStyle="rgba(157,146,126,.36)";st.fillRect(x,y,80,.92);st.fillRect(x,y,.9,80);
    }
    const tiles=surface(130,92), tt=tiles.getContext("2d");
    tt.fillStyle="#686660";tt.fillRect(0,0,130,92);
    for(let y=0;y<92;y+=23)for(let x=0;x<130;x+=13){
      const gr=tt.createLinearGradient(x,y,x+13,y);
      const grey=69+Math.round(random()*14);
      gr.addColorStop(0,`rgb(${grey-18},${grey-18},${grey-15})`);
      gr.addColorStop(.36,`rgb(${grey+28},${grey+26},${grey+19})`);
      gr.addColorStop(1,`rgb(${grey},${grey},${grey-1})`);
      tt.fillStyle=gr;tt.fillRect(x,y,13,22);
    }
    landscape={ambient,facade,side,stone,tiles};
    return landscape;
  }
  const gardenFile = new URL("./tuin.webp", document.currentScript.src);
  garden.src = gardenFile.href;
  const pending = new WeakMap();
  const backingWidth = 1536, backingHeight = 1024;

  function paint(canvas, cfg, pose=original) {
    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth;
      canvas.height = backingHeight;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(backingWidth / VIEW_WIDTH, 0, 0, backingHeight / VIEW_HEIGHT, 0, 0);
    const {project,depth:cameraDepth,eye}=viewpoint(pose);

    const w = Math.max(300,Math.min(700,Number(cfg.width) || 500));
    const d = Math.max(200,Math.min(cfg.roof === "glas-helder" ? 400 : 600, Number(cfg.depth) || 300));
    const left = -w / 2, right = w / 2;
    const topAt = y => 270 - .051 * y;
    const eave = topAt(d);
    const color = finishes[cfg.color] || finishes.antraciet;
    const spans = Math.ceil(w / 89);
    const span = w / spans;

    function path(points) {
      if(pose.detail) points=clipNear(points,cameraDepth);
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
      if(pose.detail) {
        const clipped=clipNear([a,b],cameraDepth,false);
        if(clipped.length<2) return;
        [a,b]=clipped;
      }
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
      if (!pose.detail || eye[2] < Math.max(z0,z1)) fill([bottom(p),bottom(q),bottom(r),bottom(s)],underside);
      if (!pose.detail || eye[0]<x0) fill([p,s,bottom(s),bottom(p)],flank);
      if (pose.detail && eye[0]>x1) fill([q,r,bottom(r),bottom(q)],bright);
      if (pose.detail && eye[1]<y0) fill([p,q,bottom(q),bottom(p)],flank);
      if (!pose.detail || eye[1]>y1) fill([s,r,bottom(r),bottom(s)],bare);
      if (Math.max(z0,z1) < (pose.detail?eye[2]:82)) fill([p,q,r,s],bright);
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
      fill([shadow(left,0,270),shadow(right,0,270),shadow(right,d,eave),shadow(left,d,eave)],
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
      const visible=pose.detail?clipNear(points,cameraDepth):points;
      if(visible.length<3) return;
      const screen = visible.map(project);
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
      ctx.globalAlpha=opal ? .035 : isRoof ? .13 + .09*pose.detail : .095 + .055*pose.detail;
      // Reflections are continuous across adjoining glazing panels.
      if(pose.detail) {
        ctx.translate(VIEW_WIDTH,0);ctx.scale(-1,1);
        ctx.drawImage(detailLandscape().ambient,-38,-34,VIEW_WIDTH+76,VIEW_HEIGHT+68);
      } else {
        ctx.translate(VIEW_WIDTH, isRoof ? 260 : 40);
        ctx.scale(-1, isRoof ? -.64 : .93);
        ctx.drawImage(garden,0,0,VIEW_WIDTH,VIEW_HEIGHT);
      }
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

    function roof(above=false) {
      const at=(x,y)=>[x,y,topAt(y)];
      const points=(a,b,y0,y1)=>[at(a,y0),at(b,y0),at(b,y1),at(a,y1)];
      function panels() {
        glazing(points(left,right,0,d),cfg.roof,true);
        if(cfg.roof.startsWith("poly")) {
        for(let x=left+1.8;x<right;x+=2.4) {
          line(at(x,0),at(x,d),rgba(115,145,143,.34),.6);
          line(at(x+.7,0),at(x+.7,d),rgba(243,246,236,.52),.55);
        }
      }
      }
      if(!above) panels();
      if(cfg.shade==="met") {
        const extended=d*.77;
        for(let i=0;i<spans;i++) {
          const x0=left+i*span+2.4, x1=x0+span-4.8;
          const awning=(y,x)=>[x,y,topAt(y)-5];
          const stripe=gradient(project(awning(0,x0)),project(awning(extended,x1)),[
            [0,"#a69b83"],[.28,"#c7bca2"],[.77,"#d1c4a8"],[1,"#b6a78b"]
          ]);
          fill([awning(0,x0),awning(0,x1),awning(extended,x1),awning(extended,x0)],stripe);
          for(let y=5;y<extended;y+=3) {
            line(awning(y,x0),awning(y,x1),"rgba(90,76,53,.13)",.54);
          }
        }
        profile(left,right,extended-1.7,extended+1.7,topAt(extended)-4,topAt(extended)-4,2.9);
      }
      if(above) panels();
      for(let n=0;n<=spans;n++) {
        const i=eye[0]>0?n:spans-n;
        const x=left+i*span;
        const rafterWidth= i===0 || i===spans ? 5.2 : 3.8;
        profile(x-rafterWidth/2,x+rafterWidth/2,1,d,topAt(1)+.3,eave+.3,6.1);
        if(!above && (cfg.led==="koud" || cfg.led==="warm")) {
          for(const y of [d*.37,d*.74]) spotlight([x,y,topAt(y)-6.3],cfg.led==="warm");
        }
      }
    }
    function spotlight(pos,warm) {
      if(cameraDepth(pos)<25) return;
      const [x,y]=project(pos), scale=pose.detail?Math.min(6,pose.fx/cameraDepth(pos)):1/(1+.00053*pos[0]-.00065*pos[1]);
      const spread=(warm?10:6)*scale, hue=warm?"255,209,128":"218,238,255";
      ctx.save(); ctx.translate(x,y);ctx.scale(1,.69);
      const glow=ctx.createRadialGradient(0,0,0,0,0,spread);
      glow.addColorStop(0,`rgba(${hue},.8)`);glow.addColorStop(.28,`rgba(${hue},.23)`);glow.addColorStop(1,`rgba(${hue},0)`);
      ctx.fillStyle=glow;ctx.fillRect(-spread,-spread,spread*2,spread*2);
      ctx.beginPath();ctx.ellipse(0,0,1.7*scale,1.1*scale,0,0,Math.PI*2);ctx.fillStyle=warm?"#fff1c7":"#f2fbff";ctx.fill();
      ctx.restore();
    }

    function environment() {
      ctx.drawImage(garden,0,0,VIEW_WIDTH,VIEW_HEIGHT);
      if(!pose.detail) return;
      const assets=detailLandscape();
      const intensity=Math.min(1,pose.detail*3);
      ctx.save();ctx.globalAlpha=intensity;
      ctx.drawImage(assets.ambient,0,0,VIEW_WIDTH,VIEW_HEIGHT);
      const lawn=[[-1700,-3,-4],[1800,-3,-4],[1800,1900,-4],[-1700,1900,-4]];
      fill(lawn,gradient([0,50],[100,610],[[0,"#8d9e69"],[.56,"#8c9c62"],[1,"#738246"]]));
      function texturedPatch(image,positions,uv) {
        if(positions.some(p=>cameraDepth(p)<25)) return;
        const target=positions.map(project);
        if(target.every(p=>p[0]<0)||target.every(p=>p[0]>900)||target.every(p=>p[1]<0)||target.every(p=>p[1]>600))return;
        textureTriangle(image,[0,1,2],uv,target);
        textureTriangle(image,[2,3,0],uv,target);
      }
      // Each triangle maps image pixels into its actual screen orientation; a small
      // overlap avoids subpixel cracks between adjacent patches.
      function textureTriangle(image,order,source,target) {
        const [[u,v],[u1,v1],[u2,v2]]=order.map(i=>source[i]);
        const [[x,y],[x1,y1],[x2,y2]]=order.map(i=>target[i]);
        const du=u1-u,dv=v1-v,eu=u2-u,ev=v2-v,det=du*ev-eu*dv;
        if(Math.abs(det)<.01) return;
        const a=((x1-x)*ev-(x2-x)*dv)/det,c=(du*(x2-x)-eu*(x1-x))/det;
        const b=((y1-y)*ev-(y2-y)*dv)/det,e=(du*(y2-y)-eu*(y1-y))/det;
        const mid=[(x+x1+x2)/3,(y+y1+y2)/3];
        ctx.save();ctx.beginPath();
        for(const [i,p] of order.map(i=>target[i]).entries()){
          const dx=p[0]-mid[0],dy=p[1]-mid[1],f=.65/(Math.hypot(dx,dy)||1);
          const xx=p[0]+dx*f,yy=p[1]+dy*f;
          if(i) ctx.lineTo(xx,yy); else ctx.moveTo(xx,yy);
        }
        ctx.closePath();ctx.clip();ctx.transform(a,b,c,e,x-a*u-c*v,y-b*u-e*v);
        ctx.drawImage(image,0,0);ctx.restore();
      }
      const paver=(x,y)=>[x,y,-.4];
      for(let x=-480;x<640;x+=160)for(let y=0;y<640;y+=160) {
        const tx=(x+480)%320,ty=y%320;
        texturedPatch(assets.stone,[paver(x,y),paver(x+160,y),paver(x+160,y+160),paver(x,y+160)],
          [[tx,ty],[tx+160,ty],[tx+160,ty+160],[tx,ty+160]]);
      }
      const facadeX=-558, houseWidth=1280, height=410;
      const frontAt=(x,z)=>[x,-2,z];
      function houseWall(texture,width,at) {
        // Small perspective patches preserve masonry and window-frame proportions at oblique angles.
        for(let x=0;x<width;x+=80)for(let z=0;z<height;z+=68) {
          const xx=Math.min(x+80,width),zz=Math.min(z+68,height);
          const sx=x/width*texture.width,ex=xx/width*texture.width;
          texturedPatch(texture,[at(x,z),at(xx,z),at(xx,zz),at(x,zz)],
            [[sx,height-z],[ex,height-z],[ex,height-zz],[sx,height-zz]]);
        }
      }
      const edgeX=eye[0]>0?facadeX+houseWidth:facadeX;
      houseWall(assets.side,650,(y,z)=>[edgeX,-2-y,z]);
      houseWall(assets.facade,houseWidth,(x,z)=>frontAt(facadeX+x,z));
      // A pitched return makes the house a volume, including from the elevated roof camera.
      const tiled=(x,y)=>[x,-y,410+y*.52];
      for(let x=facadeX-10;x<facadeX+houseWidth+10;x+=130)for(let y=0;y<368;y+=92){
        texturedPatch(assets.tiles,[tiled(x,y),tiled(x+130,y),tiled(x+130,y+92),tiled(x,y+92)],
          [[0,0],[130,0],[130,92],[0,92]]);
      }
      ctx.restore();
    }

    environment();
    shadows();
    profile(left-2,right+2,0,6,270.5,270.2,10.5);
    const near=eye[0]>0?"right":"left", far=near==="left"?"right":"left";
    const sideX=side=>side==="left"?left:right;
    const sideWall=side=>{wall(side,cfg[side]);wedge(side,cfg[side+"Wedge"]);};
    const above=pose.detail>0 && eye[2]>topAt(d*.5);
    sideWall(far);
    post(sideX(far),d,9,eave-5.8);
    if(!above) roof();
    // In the lighting view the eye is inside the veranda; near exterior walls lie behind it.
    if(!pose.detail || eye[1]>d || above) wall("front",cfg.front);
    sideWall(near);
    if(w>=600) post(0,d,9,eave-5.8);
    post(sideX(near),d,9,eave-5.8);
    if(above) roof(true);
    profile(left-5,right+5,d-4.5,d+5.3,eave+1,eave+1,12.4);
    line([left-5,d+5.3,eave-9.7],[right+5,d+5.3,eave-9.7],rgba(198,199,185,.29),.72);
    const x=sideX(near);
    profile(x-4.5,x+2.2,1,d-4.5,topAt(1)+1,eave+1,7.8);
  }

  function stateFor(canvas) {
    if(!pending.has(canvas)) pending.set(canvas,{
      config:{color:"antraciet",roof:"glas-helder",width:500,depth:300},part:"overview",
      pose:original,from:original,start:0,frame:0
    });
    return pending.get(canvas);
  }
  function draw(canvas,state) {
    if(garden.complete && garden.naturalWidth) paint(canvas,state.config,state.pose);
  }
  function render(canvas,config) {
    const state=stateFor(canvas);
    state.config={color:"antraciet",roof:"glas-helder",...config};
    if(!state.frame) state.pose=cameraPose(state.part,state.config);
    if(garden.complete && garden.naturalWidth) {draw(canvas,state);return Promise.resolve();}
    return ready.then(()=>draw(canvas,state));
  }
  function setView(canvas,part) {
    const state=stateFor(canvas);
    if(state.part===part) return;
    state.part=part;
    if(state.frame) cancelAnimationFrame(state.frame);
    const target=()=>cameraPose(state.part,state.config);
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      state.frame=0;state.pose=target();draw(canvas,state);return;
    }
    state.start=performance.now();state.from=state.pose;
    function tick(now) {
      const t=Math.min(1,(now-state.start)/600), ease=t*t*(3-2*t);
      const goal=target(), pose={};
      for(const field in goal) pose[field]=state.from[field]+(goal[field]-state.from[field])*ease;
      state.pose=t===1?goal:pose;
      draw(canvas,state);
      state.frame=t===1?0:requestAnimationFrame(tick);
    }
    state.frame=requestAnimationFrame(tick);
  }
  window.VerandaPreview={ render, setView, ready };
})();
