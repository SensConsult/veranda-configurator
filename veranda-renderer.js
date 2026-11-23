(() => {
  "use strict";

  // World axes follow the facade (x), the paving towards the viewer (y) and height (z), in cm.
  // Both vanishing points lie on the photographed horizon. All sizes use this same camera.
  const VIEW_WIDTH = 900, VIEW_HEIGHT = 600;
  function project([x, y, z]) {
    const across = .00053 * x, outward = -.00065 * y;
    const distance = 1 + across + outward;
    return [
      (352 + 1760 * across - 49 * outward) / distance,
      (416 + 344 * (across + outward) - .88 * z) / distance
    ];
  }
  const finishes = {
    antraciet: [72, 74, 73],
    zwart: [39, 39, 38],
    grijs: [141, 144, 139]
  };
  const rgba = (r,g,b,a) => `rgba(${r},${g},${b},${a})`;
  const mixTone = (rgb, light) => `rgb(${rgb.map(v => Math.max(0, Math.min(255, v + light))).join(",")})`;

  const garden = new Image();
  const ready = new Promise((resolve, reject) => {
    garden.onload = resolve;
    garden.onerror = () => reject(new Error("Het tuinbeeld kon niet worden geladen."));
  });
  const gardenFile = new URL("./tuin.webp", document.currentScript.src);
  garden.src = gardenFile.href;
  const pending = new WeakMap();
  const backingWidth = 1536, backingHeight = 1024;

  function paint(canvas, cfg) {
    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth;
      canvas.height = backingHeight;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(backingWidth / VIEW_WIDTH, 0, 0, backingHeight / VIEW_HEIGHT, 0, 0);
    ctx.drawImage(garden,0,0,VIEW_WIDTH,VIEW_HEIGHT);

    const w = Math.max(300,Math.min(700,Number(cfg.width) || 500));
    const d = Math.max(200,Math.min(cfg.roof === "glas-helder" ? 400 : 600, Number(cfg.depth) || 300));
    const left = -w / 2, right = w / 2;
    const topAt = y => 270 - .051 * y;
    const eave = topAt(d);
    const color = finishes[cfg.color] || finishes.antraciet;
    const spans = Math.ceil(w / 89);
    const span = w / spans;

    function path(points) {
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
      fill([bottom(p),bottom(q),bottom(r),bottom(s)],underside);
      fill([p,s,bottom(s),bottom(p)],flank);
      fill([s,r,bottom(r),bottom(s)],bare);
      if (Math.max(z0,z1) < 82) fill([p,q,r,s],bright);
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
      const screen = points.map(project);
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
      // Reflections are continuous across adjoining glazing panels.
      ctx.translate(VIEW_WIDTH, isRoof ? 260 : 40);
      ctx.scale(-1, isRoof ? -.64 : .93);
      ctx.drawImage(garden,0,0,VIEW_WIDTH,VIEW_HEIGHT);
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

    function roof() {
      const at=(x,y)=>[x,y,topAt(y)];
      const points=(a,b,y0,y1)=>[at(a,y0),at(b,y0),at(b,y1),at(a,y1)];
      glazing(points(left,right,0,d),cfg.roof,true);
      if(cfg.roof.startsWith("poly")) {
        for(let x=left+1.8;x<right;x+=2.4) {
          line(at(x,0),at(x,d),rgba(115,145,143,.34),.6);
          line(at(x+.7,0),at(x+.7,d),rgba(243,246,236,.52),.55);
        }
      }
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
      for(let i=spans;i>=0;i--) {
        const x=left+i*span;
        const rafterWidth= i===0 || i===spans ? 5.2 : 3.8;
        profile(x-rafterWidth/2,x+rafterWidth/2,1,d,topAt(1)+.3,eave+.3,6.1);
        if(cfg.led==="koud" || cfg.led==="warm") {
          for(const y of [d*.37,d*.74]) spotlight([x,y,topAt(y)-6.3],cfg.led==="warm");
        }
      }
    }
    function spotlight(pos,warm) {
      const [x,y]=project(pos), scale=1/(1+.00053*pos[0]-.00065*pos[1]);
      const spread=(warm?10:6)*scale, hue=warm?"255,209,128":"218,238,255";
      ctx.save(); ctx.translate(x,y);ctx.scale(1,.69);
      const glow=ctx.createRadialGradient(0,0,0,0,0,spread);
      glow.addColorStop(0,`rgba(${hue},.8)`);glow.addColorStop(.28,`rgba(${hue},.23)`);glow.addColorStop(1,`rgba(${hue},0)`);
      ctx.fillStyle=glow;ctx.fillRect(-spread,-spread,spread*2,spread*2);
      ctx.beginPath();ctx.ellipse(0,0,1.7*scale,1.1*scale,0,0,Math.PI*2);ctx.fillStyle=warm?"#fff1c7":"#f2fbff";ctx.fill();
      ctx.restore();
    }

    shadows();
    profile(left-2,right+2,0,6,270.5,270.2,10.5);
    // The fixed viewpoint is in front and to the left of the veranda.
    wall("right",cfg.right);
    wedge("right",cfg.rightWedge);
    post(right,d,9,eave-5.8);
    roof();
    wall("front",cfg.front);
    wall("left",cfg.left);
    wedge("left",cfg.leftWedge);
    if(w>=600) post(0,d,9,eave-5.8);
    post(left,d,9,eave-5.8);
    profile(left-5,right+5,d-4.5,d+5.3,eave+1,eave+1,12.4);
    line([left-5,d+5.3,eave-9.7],[right+5,d+5.3,eave-9.7],rgba(198,199,185,.29),.72);
    profile(left-4.5,left+2.2,1,d-4.5,topAt(1)+1,eave+1,7.8);
  }

  function render(canvas,config) {
    const snapshot={ color:"antraciet",roof:"glas-helder",...config };
    pending.set(canvas,snapshot);
    if(garden.complete && garden.naturalWidth) {
      paint(canvas,snapshot);
      return Promise.resolve();
    }
    return ready.then(() => {
      if(pending.get(canvas) === snapshot) paint(canvas,snapshot);
    });
  }
  window.VerandaPreview={ render, ready };
})();
