/* Procedural film stage: a night takeoff over city lights, a climb through four
   cloud decks and a break-out into sunrise above the clouds. One fragment shader,
   driven by the same scroll progress the video clips would use. When real clips are
   added (see README), main.js plays those instead and this file stays idle. */
(function () {
  'use strict';
  var host = document.getElementById('film');
  if (!host || (host.getAttribute('data-clips') || '').trim()) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = matchMedia('(pointer: coarse)').matches;
  var canvas = document.createElement('canvas');
  canvas.className = 'sky';
  canvas.setAttribute('aria-hidden', 'true');
  var gl = null;
  try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
  if (!gl) { document.documentElement.classList.add('no-sky'); return; }
  host.appendChild(canvas);

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform vec2 uRes;uniform float uTime;uniform vec4 uCam;uniform float uDawn;uniform float uSunY;uniform float uSunX;uniform float uRoll;',
    'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    ' return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}',
    'vec3 SUN;',
    'vec3 sky(vec3 rd){',
    ' float y=max(rd.y,0.);',
    ' vec3 night=mix(vec3(.055,.075,.14),vec3(.012,.016,.036),pow(y,.45));',
    ' vec3 dawn=mix(vec3(1.,.6,.32),mix(vec3(.42,.40,.56),vec3(.075,.11,.25),smoothstep(.06,.62,y)),smoothstep(0.,.24,y));',
    ' vec3 c=mix(night,dawn,uDawn);',
    ' float s=max(dot(rd,SUN),0.);',
    ' c+=uDawn*(vec3(1.,.5,.22)*pow(s,5.)*.5+vec3(1.,.78,.5)*pow(s,48.)*.9);',
    ' c+=uDawn*(vec3(1.,.95,.84)*smoothstep(.9992,.99975,s)*5.+vec3(1.,.7,.4)*pow(s,400.)*1.5);',
    ' c+=(1.-uDawn)*vec3(.42,.2,.08)*exp(-y*16.)*.32;',
    ' vec2 sc=vec2(atan(rd.x,rd.z),asin(clamp(rd.y,-1.,1.)))*190.;',
    ' vec2 id=floor(sc);float h=hash(id);',
    ' float st=step(.986,h)*smoothstep(.16,0.,length(fract(sc)-.5-(vec2(hash(id+1.7),hash(id+4.3))-.5)*.5));',
    ' c+=vec3(.9,.92,1.)*st*(1.-uDawn)*smoothstep(.03,.25,rd.y)*(.55+.45*sin(uTime*2.+h*60.));',
    ' return c;}',
    'vec3 hzc(vec3 rd){',
    ' vec3 c=mix(vec3(.055,.075,.14),vec3(1.,.6,.32),uDawn);',
    ' float s=max(dot(normalize(vec3(rd.x,0.,rd.z)),normalize(vec3(SUN.x,0.,SUN.z))),0.);',
    ' c+=uDawn*vec3(1.,.5,.22)*pow(s,5.)*.35;',
    ' c+=(1.-uDawn)*vec3(.42,.2,.08)*.28;',
    ' return c;}',
    'vec3 city(vec2 p,float fp){',
    ' float m=smoothstep(.3,.52,fbm(p*1.1+3.1))*(.4+.6*smoothstep(.22,.55,noise(p*4.+1.)));',
    ' m*=smoothstep(.015,.06,abs(p.x+sin(p.y*1.3)*.5-.15));',
    ' float rg=floor(noise(p*1.4+9.)*4.);float an=rg*.52+.3;',
    ' vec2 pr=mat2(cos(an),-sin(an),sin(an),cos(an))*p;',
    ' vec2 g=pr*20.;vec2 id=floor(g);vec2 f=fract(g)-.5;',
    ' float px=fp*20.;',
    ' vec2 q=.5-abs(fract(g)-.5);',
    ' float r=.04+px*.55;float k=(.0016)/(r*r);',
    ' vec2 lx=vec2(fract(g.x*2.+hash(vec2(id.y,rg)))-.5,fract(g.y*2.+hash(vec2(id.x,rg+2.)))-.5)*.5;',
    ' vec2 lid=floor(g*2.);',
    ' float on1=step(hash(lid+rg*3.),m*1.15),on2=step(hash(lid.yx+rg*5.+1.),m*1.15);',
    ' float det=1.-smoothstep(.12,.45,px);',
    ' float dots=(exp(-(q.y*q.y+lx.x*lx.x)/(r*r))*on1*(.35+.9*hash(lid))+exp(-(q.x*q.x+lx.y*lx.y)/(r*r))*on2*(.35+.9*hash(lid+.7)))*k*det;',
    ' float halo=(exp(-q.y/(r*2.5))*on1+exp(-q.x/(r*2.5))*on2)*.04*min(k,1.)*det;',
    ' vec2 lp=(vec2(hash(id+3.1),hash(id+7.7))-.5)*.6;',
    ' float bld=step(.8,hash(id+rg))*step(hash(id+9.1),m)*exp(-dot(f-lp,f-lp)/(r*r*.35))*k*.5*det;',
    ' vec3 lc=mix(vec3(1.,.55,.2),vec3(1.,.84,.62),step(.75,hash(floor(g*.3)+rg+.5)));',
    ' vec3 wc=mix(vec3(1.,.82,.6),vec3(.6,.84,1.),step(.84,hash(id+5.9)));',
    ' vec2 g2=pr*2.6;vec2 q2=.5-abs(fract(g2)-.5);float r2=.012+fp*2.;float k2=(.012*.012)/(r2*r2);',
    ' float a2=fract(g2.x*12.)-.5,b2=fract(g2.y*12.)-.5;',
    ' float rd2=(exp(-(q2.y*q2.y+a2*a2*.006)/(r2*r2))+exp(-(q2.x*q2.x+b2*b2*.006)/(r2*r2)))*k2*step(.25,m);',
    ' float hw=abs(p.x-sin(p.y*.7)*.6-.9);float ww=.006+fp;',
    ' float hwy=exp(-hw*hw/(ww*ww))*(.006/ww)*(.6+.4*sin(p.y*90.-uTime*4.));',
    ' vec3 c=vec3(.003,.004,.008)+vec3(.01,.013,.024)*fbm(p*.5);',
    ' c+=dots*lc*2.6+halo*lc*1.3+bld*wc*1.3+rd2*vec3(1.,.76,.48)*.8+m*vec3(.05,.022,.008)+(1.-det)*m*lc*.1;',
    ' c+=hwy*vec3(1.,.82,.6);',
    ' c*=1.-.75*uDawn;',
    ' return c;}',
    'float deck(vec2 p,float i){vec2 q=p*.42+vec2(i*7.3,i*3.1)+vec2(uTime*.008,uTime*.002);return fbm(q+.35*vec2(noise(q*.5),noise(q*.5+5.)));}',
    'void main(){',
    ' SUN=normalize(vec3(uSunX,uSunY,1.));',
    ' vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;',
    ' float cr=cos(uRoll),sr=sin(uRoll);uv=mat2(cr,-sr,sr,cr)*uv;',
    ' vec3 rd=normalize(vec3(uv*1.12,1.));',
    ' float cp=cos(uCam.z),sp=sin(uCam.z);rd.yz=vec2(rd.y*cp+rd.z*sp,-rd.y*sp+rd.z*cp);',
    ' vec3 ro=vec3(uCam.w,uCam.x,uCam.y);',
    ' float pix=2.24/uRes.y;',
    ' vec3 bg;',
    ' vec3 hz=hzc(rd);',
    ' if(rd.y<0.){',
    '  float t=-ro.y/rd.y;vec2 p=ro.xz+rd.xz*t;',
    '  bg=city(p,t*pix/max(-rd.y,.05));',
    '  bg=mix(bg,mix(hz*.5,vec3(.2,.22,.36),uDawn),1.-exp(-t*.045));bg=mix(bg,hz,smoothstep(30.,140.,t));',
    ' } else bg=sky(rd);',
    ' vec3 acc=vec3(0.);float A=0.;',
    ' for(int k=0;k<4;k++){',
    '  float i=rd.y>0.?float(k):3.-float(k);',
    '  float H=1.+i*.15;',
    '  float t=(H-ro.y)/rd.y;',
    '  if(t<=0.||t>260.)continue;',
    '  vec2 p=ro.xz+rd.xz*t;',
    '  float d=deck(p,i);',
    '  float cov=mix(.6,mix(.47,.41,uDawn),i/3.);',
    '  float a=smoothstep(cov,cov+.13,d);',
    '  if(a<.002)continue;',
    '  float d2=deck(p+SUN.xz*.1,i);',
    '  float lit=clamp(.5+(d-d2)*4.,0.,1.);',
    '  float th=smoothstep(cov,cov+.42,d);',
    '  float above=step(H,ro.y);',
    '  vec3 topN=mix(vec3(.06,.08,.14),vec3(.24,.28,.42),lit);',
    '  vec3 topD=mix(vec3(.34,.33,.5),vec3(1.05,.88,.7),lit*lit*(3.-2.*lit))*(.72+.4*th);',
    '  topD+=vec3(1.,.5,.2)*pow(max(dot(rd,SUN),0.),3.)*.55*(1.-th*.5);',
    '  vec3 botN=mix(vec3(.06,.045,.08),vec3(.36,.17,.09),(1.-th)*(1.-th));',
    '  vec3 botD=mix(vec3(.22,.22,.34),vec3(.62,.52,.54),lit);',
    '  vec3 c=mix(mix(botN,botD,uDawn),mix(topN,topD,uDawn),above);',
    '  c=mix(c,hz*mix(.8,1.,uDawn),1.-exp(-t*.026));',
    '  a=mix(a,1.,smoothstep(25.,110.,t)*uDawn*step(2.5,i));a*=smoothstep(.0,.35,t);',
    '  acc+=(1.-A)*a*c;A+=(1.-A)*a;',
    ' }',
    ' vec3 col=acc+(1.-A)*bg;',
    ' float h=ro.y;',
    ' float band=smoothstep(.9,1.06,h)*(1.-smoothstep(1.44,1.6,h));',
    ' float pass=0.;for(int k=0;k<4;k++){pass+=exp(-abs(h-(1.+float(k)*.15))*30.);}',
    ' vec3 mist=mix(vec3(.07,.08,.13),vec3(.84,.8,.86),uDawn);',
    ' float mf=clamp(band*.34+pass*.42,0.,.86)*(.55+.45*fbm(uv*vec2(2.,4.)+vec2(0.,ro.z*1.2)));',
    ' col=mix(col,mist,mf);',
    ' col=1.-exp(-col*1.18);',
    ' col+=(hash(gl_FragCoord.xy+fract(uTime))-.5)*.018;',
    ' gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) {
    console.warn('sky shader', e); canvas.remove(); document.documentElement.classList.add('no-sky'); return;
  }
  gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ['uRes', 'uTime', 'uCam', 'uDawn', 'uSunY', 'uSunX', 'uRoll'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  // camera keyframes over film progress: [p, value]
  var KH = [[0, .2], [.12, .27], [.3, .6], [.44, .97], [.56, 1.24], [.66, 1.52], [.8, 2.0], [1, 2.3]];
  var KP = [[0, -.52], [.14, -.36], [.3, -.12], [.44, .03], [.58, .05], [.72, -.06], [1, -.11]];
  var KD = [[0, 0], [.42, 0], [.6, .32], [.78, .9], [1, 1]];
  function spline(k, p) {
    if (p <= k[0][0]) return k[0][1];
    for (var i = 0; i < k.length - 1; i++) {
      if (p <= k[i + 1][0]) {
        var a = k[i], b = k[i + 1], t = (p - a[0]) / (b[0] - a[0]);
        var m0 = i > 0 ? (b[1] - k[i - 1][1]) / (b[0] - k[i - 1][0]) * (b[0] - a[0]) * .5 : 0;
        var m1 = i < k.length - 2 ? (k[i + 2][1] - a[1]) / (k[i + 2][0] - a[0]) * (b[0] - a[0]) * .5 : 0;
        var t2 = t * t, t3 = t2 * t;
        return (2 * t3 - 3 * t2 + 1) * a[1] + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * b[1] + (t3 - t2) * m1;
      }
    }
    return k[k.length - 1][1];
  }

  var film = 0, phase = 0, dirty = true, last = 0, t0 = performance.now(), scale = coarse ? .5 : .75;
  function resize() {
    var w = Math.max(2, Math.round(host.clientWidth * scale)), h = Math.max(2, Math.round(host.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); dirty = true; }
  }
  addEventListener('resize', resize); resize();

  window.SKY = {
    set: function (f, ph) { if (Math.abs(f - film) > 1e-5 || Math.abs(ph - phase) > 1e-5) { film = f; phase = ph; dirty = true; } },
    active: true
  };

  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); document.documentElement.classList.add('no-sky'); window.SKY.active = false; });

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || !window.SKY.active) return;
    var idle = now - last < 33 && !dirty;       // ~30 fps while only the clouds drift
    if (idle) return;
    if (document.documentElement.classList.contains('past-track') && !dirty) return;
    if (reduce && !dirty) return;
    last = now; dirty = false;
    var time = reduce ? 0 : (now - t0) / 1000;
    var p = film;
    var h = spline(KH, p) + phase * .22;
    var pitch = spline(KP, p) - phase * .03;
    var z = p * 24 + phase * 16 + time * .03;
    var x = .37 + Math.sin(p * 2.6) * .7 + phase * .4;
    var roll = Math.sin(p * 5.2) * .035 * (1 - phase) + (reduce ? 0 : Math.sin(time * .5) * .006);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, time);
    gl.uniform4f(U.uCam, h, z, pitch, x);
    gl.uniform1f(U.uDawn, spline(KD, p));
    gl.uniform1f(U.uSunY, .018 + .036 * spline(KD, p) + phase * .025);
    gl.uniform1f(U.uSunX, .16 - .185 * Math.min(1, phase / ((window.SITE && window.SITE.T) ? window.SITE.T.entry : .1)));   // sun slides to the gap between the text columns
    gl.uniform1f(U.uRoll, roll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
})();
