/* =============================================================================
 * Longitude/Latitude Demonstrator  --  accessible HTML5 port
 *
 * Behavior is a faithful port of the decompiled ActionScript (AS1) for the
 * "shoreDemo" + "CelestialSphere" engine. For THIS sim the engine is used purely
 * in the HORIZON coordinate system with a single shared orientation (theta, phi),
 * so the full 3-D engine reduces to one orthographic projection:
 *
 *     a-matrix (from theta, phi, radius R) projects a unit-sphere point P=(x,y,z):
 *        screenX = x*a0 + y*a1
 *        screenY = x*a3 + y*a4 + z*a5
 *        depth   = x*a6 + y*a7 + z*a8     (>= 0  =>  front hemisphere, visible)
 *
 * The opaque white globe disc hides the back hemisphere, so only front-facing
 * geometry (depth >= 0) is ever visible -- exactly what the original showed.
 *
 * All angle constants, the custom toFixed(), the degrees-minutes formatting, the
 * great-circle math, the drag/snapping math, and the city/IDL data are copied
 * verbatim from the AS source. See CONVERSION_NOTES.md for the mapping.
 * ===========================================================================*/

'use strict';

(function () {

  // ---- angle constants (verbatim from the AS source) -----------------------
  const DEG2RAD = 0.017453292519943295;   // pi/180
  const RAD2DEG = 57.29577951308232;       // 180/pi
  const TWO_PI  = 6.283185307179586;
  const HALF_PI = 1.5707963267948966;
  const PI      = 3.141592653589793;

  // ---- stage / canvas geometry --------------------------------------------
  const R   = 150;        // sphere radius in stage px (sphere.size = 300 -> r = 150)
  const CW  = 440;        // canvas internal width  (extra margin so r=1.1 labels fit)
  const CH  = 400;        // canvas internal height
  const CX  = 220;        // globe center x
  const CY  = 200;        // globe center y

  // ---- colors (AS decimal RGB -> CSS hex; alpha 0-100 -> 0-1) ---------------
  const COL = {
    shore:        '#c0c0c0',                  // 12632256
    equator:      'rgba(71,137,48,0.7)',      // 4688176  @70
    primeMeridian:'rgba(255,131,57,0.7)',     // 16745273 @70
    idl:          'rgba(255,131,57,0.7)',     // 16745273 @70
    meridian:     'rgba(80,80,80,0.1)',       // 5263440  @10
    grayEquator:  'rgba(80,80,80,0.1)',       // 5263440  @10
    smallCircle:  'rgba(144,144,144,0.5)',    // 9474192  @50  (lat/long circles)
    latArc:       'rgba(75,75,254,1)',        // 4934654  @100 (thick 3)
    longArc:      'rgba(254,75,75,1)',        // 16665419 @100 (thick 3)
    latLabel:     '#4b4bfe',                  // latColor
    longLabel:    '#fe4b4b',                  // longColor
    equatorLabel: '#478930',                  // 4688176
    featureLabel: '#ff8339',                  // 16745273
    cityDot:      '#666666',                  // City Dot frame 1 (#666, r~3.5)
    cityDotHi:    '#666666',                  // City Dot frame 2 (#666, grows to r~4.5)
    cursorDot:    '#000000'                    // Cursor Dot (solid black, r~5)
  };

  const POLY_LIMIT = 25;   // shoreDemo.polyLimit

  // ---- city list (verbatim from DefineSprite_130 frame 1) ------------------
  const CITY_LIST = [
    {name:"Buenos Aires, Argentina",lat:{deg:34,min:20,dir:"S"},lon:{deg:58,min:30,dir:"W"}},
    {name:"Lima, Peru",lat:{deg:12,min:6,dir:"S"},lon:{deg:76,min:55,dir:"W"}},
    {name:"Casablanca, Morocco",lat:{deg:33,min:32,dir:"N"},lon:{deg:7,min:41,dir:"W"}},
    {name:"Monrovia, Liberia",lat:{deg:6,min:20,dir:"N"},lon:{deg:10,min:46,dir:"W"}},
    {name:"São Paulo, Brazil",lat:{deg:23,min:34,dir:"S"},lon:{deg:46,min:38,dir:"W"}},
    {name:"Lincoln",lat:{deg:40,min:49,dir:"W"},lon:{deg:96,min:40,dir:"W"}},
    {name:"Baghdad, Iraq",lat:{deg:33,min:14,dir:"N"},lon:{deg:44,min:22,dir:"E"}},
    {name:"Greenwich, England",lat:{deg:51,min:40,dir:"N"},lon:{deg:0,min:0,dir:"E"}},
    {name:"Singapore",lat:{deg:1,min:22,dir:"N"},lon:{deg:103,min:45,dir:"E"}},
    {name:"Havana, Cuba",lat:{deg:23,min:8,dir:"N"},lon:{deg:82,min:23,dir:"W"}},
    {name:"Canberra, Australia",lat:{deg:35,min:18,dir:"S"},lon:{deg:149,min:8,dir:"E"}},
    {name:"Calcutta, India",lat:{deg:22,min:32,dir:"N"},lon:{deg:88,min:22,dir:"E"}},
    {name:"Beijing, China",lat:{deg:39,min:55,dir:"N"},lon:{deg:116,min:23,dir:"E"}},
    {name:"Reykjavik, Iceland",lat:{deg:64,min:9,dir:"N"},lon:{deg:21,min:58,dir:"W"}},
    {name:"Murmansk, Russia",lat:{deg:68,min:59,dir:"N"},lon:{deg:33,min:8,dir:"E"}},
    {name:"Washington DC",lat:{deg:38,min:53,dir:"N"},lon:{deg:77,min:2,dir:"W"}},
    {name:"Barrow, Alaska",lat:{deg:71,min:17,dir:"N"},lon:{deg:156,min:47,dir:"W"}},
    {name:"Moscow, Russia",lat:{deg:55,min:45,dir:"N"},lon:{deg:37,min:37,dir:"E"}},
    {name:"Cape Town, South Africa",lat:{deg:33,min:55,dir:"S"},lon:{deg:18,min:27,dir:"E"}},
    {name:"McMurdo Station",lat:{deg:77,min:51,dir:"S"},lon:{deg:166,min:40,dir:"E"}}
  ];

  // International Date Line vertices (verbatim) -- lat/lon degrees.
  const IDL = [
    {lat:90,lon:180},{lat:75,lon:180},{lat:72,lon:-169},{lat:65.5,lon:-169},
    {lat:64,lon:-175},{lat:50.5,lon:167},{lat:48,lon:180},{lat:2,lon:180},
    {lat:0,lon:-179},{lat:0,lon:-165},{lat:-3,lon:-165},{lat:-3,lon:-160},
    {lat:2,lon:-160},{lat:2,lon:-162},{lat:5,lon:-162},{lat:5,lon:-154},
    {lat:-8,lon:-151},{lat:-12,lon:-151},{lat:-12,lon:-157},{lat:-9,lon:-157},
    {lat:-9,lon:-178},{lat:-15,lon:-175.5},{lat:-44.75,lon:-175.5},
    {lat:-51.5,lon:180},{lat:-90,lon:180}
  ];

  // -------------------------------------------------------------------------
  //  Number formatting -- verbatim port of shoreDemo.toFixed (custom, not native)
  // -------------------------------------------------------------------------
  function toFixed(x, f) {
    let s = "";
    if (x < 0) { s = "-"; x = -x; }
    let m = "";
    if (x < 1e21) {
      const n = Math.round(x * Math.pow(10, f));
      if (n === 0) { m = "0"; } else { m = n.toString(); }
      if (f > 0) {
        let k = m.length;
        if (k <= f) {
          let z = "";
          for (let i = 0; i < f + 1 - k; i++) { z += "0"; }
          m = z + m;
          k = f + 1;
        }
        const a = m.substr(0, k - f);
        const b = m.substr(k - f);
        m = a + "." + b;
      }
    } else {
      m = x.toString();
    }
    return s + m;
  }

  function mod(n, m) { return ((n % m) + m) % m; }

  // -------------------------------------------------------------------------
  //  Orientation (a-matrix) -- verbatim port of doA, R = 150
  // -------------------------------------------------------------------------
  const a = {};
  function doA(thetaRad, phiRad) {
    const ct = Math.cos(thetaRad), st = Math.sin(thetaRad);
    const cp = Math.cos(phiRad),   sp = Math.sin(phiRad);
    a.a0 = -R * st;        a.a1 = R * ct;
    a.a3 = R * ct * sp;    a.a4 = R * st * sp;    a.a5 = -R * cp;
    a.a6 = R * ct * cp;    a.a7 = R * st * cp;    a.a8 = R * sp;
  }

  // unit-sphere point from horizon {az, alt} (degrees) at radius r (parsePointInput)
  function horizonToXYZ(azDeg, altDeg, r) {
    const d = r * Math.cos(altDeg * DEG2RAD);
    return {
      x: d * Math.cos(azDeg * DEG2RAD),
      y: d * Math.sin(-azDeg * DEG2RAD),
      z: r * Math.sin(altDeg * DEG2RAD)
    };
  }

  // project a world point to screen (canvas) coords + depth
  function project(p) {
    return {
      x: CX + p.x * a.a0 + p.y * a.a1,
      y: CY + p.x * a.a3 + p.y * a.a4 + p.z * a.a5,
      depth: p.x * a.a6 + p.y * a.a7 + p.z * a.a8
    };
  }

  // -------------------------------------------------------------------------
  //  Screen -> horizon (StoMH) and getMouseAltAz -- verbatim ports
  // -------------------------------------------------------------------------
  function StoMH(spx, spy, thetaRad, phiRad) {
    const hp = {};
    let d = Math.sqrt(spx * spx + spy * spy) / R;
    if (d > 1) { d = 1; }
    const b = Math.asin(d);
    const A = Math.atan2(spx, -spy);
    if (phiRad === HALF_PI) {
      hp.alt = HALF_PI - b;
      hp.az  = thetaRad + PI - A;
    } else if (phiRad === -HALF_PI) {
      hp.alt = -HALF_PI + b;
      hp.az  = thetaRad + A;
    } else {
      const c  = HALF_PI - phiRad;
      const cc = Math.cos(c), sc = Math.sin(c);
      const cb = Math.cos(b), sb = Math.sin(b);
      const ca = cb * cc + sb * sc * Math.cos(A);
      hp.alt = HALF_PI - Math.acos(ca);
      hp.az  = thetaRad + Math.atan2(sb * Math.sin(A), (cb - ca * cc) / sc);
    }
    hp.az = mod(hp.az, TWO_PI);
    return hp;
  }

  // returns {alt, az} in degrees, or null if outside the disc (getMouseAltAz)
  function getMouseAltAz(spx, spy, thetaRad, phiRad) {
    if (Math.sqrt(spx * spx + spy * spy) > R) { return null; }
    const hp = StoMH(spx, spy, thetaRad, phiRad);
    return { alt: hp.alt * RAD2DEG, az: mod(360 - hp.az * RAD2DEG, 360) };
  }

  // -------------------------------------------------------------------------
  //  Great circles / arcs
  //  A circle is defined by (tilt, beta, lambda, gS, gE) -> w-matrix (doW).
  //  Combined each frame with the a-matrix to give the projected ellipse
  //  (v0..v8). We draw only the front-facing (depth >= 0) portion within the
  //  gamma range -- the visible result the original produced.
  // -------------------------------------------------------------------------
  function doW(tilt, beta, lambda) {
    const st = Math.sin(tilt),   ct = Math.cos(tilt);
    const sb = Math.sin(beta),   cb = Math.cos(beta);
    const cl = Math.cos(lambda), sl = Math.sin(lambda);
    return {
      w0: cl * cb,        w1: -cl * sb * ct,   w2: sl * sb * st,
      w3: cl * sb,        w4: cl * cb * ct,    w5: -sl * cb * st,
      w7: cl * st,        w8: sl * ct
    };
  }

  // build a circle object from az/alt/tilt/gammaStart/gammaEnd (setCircleParameters)
  function circleFromParams(o) {
    let tilt;
    if (o.tilt < 0) tilt = 0;
    else if (o.tilt > 180) tilt = PI;
    else tilt = o.tilt * DEG2RAD;

    let lambda;
    const alt = (o.alt === undefined) ? 0 : o.alt;
    if (alt < -90) lambda = -PI;
    else if (alt > 90) lambda = PI;
    else lambda = alt * DEG2RAD;

    const beta = DEG2RAD * mod(-(o.az || 0), 360);
    const gS = DEG2RAD * mod(o.gammaStart || 0, 360);
    const gE = DEG2RAD * mod(o.gammaEnd || 0, 360);
    return { w: doW(tilt, beta, lambda), gS: gS, gE: gE };
  }

  // build a great-circle arc between two horizon points (setArcPoints) -- for IDL
  function circleFromArcPoints(p1, p2) {
    const theta1 = (360 - p1.az) * DEG2RAD, phi1 = p1.alt * DEG2RAD;
    const theta2 = (360 - p2.az) * DEG2RAD, phi2 = p2.alt * DEG2RAD;
    const cp1 = Math.cos(phi1), sp1 = Math.sin(phi1), z1 = sp1;
    const x1 = cp1 * Math.cos(theta1), y1 = cp1 * Math.sin(theta1);
    const cp2 = Math.cos(phi2), sp2 = Math.sin(phi2), z2 = sp2;
    const x2 = cp2 * Math.cos(theta2), y2 = cp2 * Math.sin(theta2);
    const ax = y1 * z2 - y2 * z1;
    const ay = x2 * z1 - x1 * z2;
    const nz = x1 * y2 - x2 * y1;
    const aN = Math.sqrt(ax * ax + ay * ay + nz * nz);
    const lambda = 0;
    let tilt, beta, gS, gE;
    if (aN < 0.000001) { return null; }   // (IDL points are never coincident/antipodal)
    tilt = Math.acos(nz / aN);
    if (tilt === 0) {
      beta = 0;
      gS = mod(Math.atan2(y1, x1), TWO_PI);
      gE = mod(Math.atan2(y2, x2), TWO_PI);
    } else if (tilt === PI) {
      beta = 0;
      gS = mod(Math.atan2(-y1, x1), TWO_PI);
      gE = mod(Math.atan2(-y2, x2), TWO_PI);
    } else {
      beta = Math.atan2(ax, -ay);
      const st = Math.sin(tilt);
      gS = mod(Math.atan2(sp1 / st, cp1 * Math.cos(theta1 - beta)), TWO_PI);
      gE = mod(Math.atan2(sp2 / st, cp2 * Math.cos(theta2 - beta)), TWO_PI);
    }
    return { w: doW(tilt, beta, lambda), gS: gS, gE: gE };
  }

  // draw the front-facing portion of a circle/arc onto ctx
  function drawCircle(ctx, circ, color, thick) {
    const w = circ.w;
    // v = a-matrix combined with w-matrix (verbatim algebra, w6 == 0)
    const v0 = a.a0 * w.w0 + a.a1 * w.w3;
    const v1 = a.a0 * w.w1 + a.a1 * w.w4;
    const v2 = a.a0 * w.w2 + a.a1 * w.w5;
    const v3 = a.a3 * w.w0 + a.a4 * w.w3;
    const v4 = a.a3 * w.w1 + a.a4 * w.w4 + a.a5 * w.w7;
    const v5 = a.a3 * w.w2 + a.a4 * w.w5 + a.a5 * w.w8;
    const v6 = a.a6 * w.w0 + a.a7 * w.w3;
    const v7 = a.a6 * w.w1 + a.a7 * w.w4 + a.a8 * w.w7;
    const v8 = a.a6 * w.w2 + a.a7 * w.w5 + a.a8 * w.w8;

    let start = circ.gS, end = circ.gE;
    if (start === end) { start = 0; end = TWO_PI; }      // full circle
    else if (end < start) { end += TWO_PI; }             // arc, increasing gamma
    const arc = end - start;
    const n = Math.max(2, Math.ceil(arc / (1.0 * DEG2RAD)));  // ~1 degree steps
    const step = arc / n;

    ctx.strokeStyle = color;
    ctx.lineWidth = thick;
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= n; i++) {
      const g = start + step * i;
      const cg = Math.cos(g), sg = Math.sin(g);
      const depth = v6 * cg + v7 * sg + v8;
      const sx = CX + v0 * cg + v1 * sg + v2;
      const sy = CY + v3 * cg + v4 * sg + v5;
      if (depth >= 0) {
        if (!pen) { ctx.moveTo(sx, sy); pen = true; }
        else { ctx.lineTo(sx, sy); }
      } else {
        pen = false;
      }
    }
    ctx.stroke();
  }

  // =========================================================================
  //  STATE  (single source of truth)
  // =========================================================================
  const INITIAL = {
    thetaDeg: 290, phiDeg: 25,     // sphere.setThetaAndPhi(290, 25)
    cursorAz: 96.7, cursorAlt: 40.8, // shores.moveCursor({alt:40.8, az:96.7})
    format: 'd',                   // decimal radio default
    showCities: false,             // checkbox initialValue false
    showFeatures: false            // checkbox initialValue false
  };
  const state = Object.assign({}, INITIAL);
  let hoverCity = null;            // index of city under pointer, or null

  // =========================================================================
  //  DOM references
  // =========================================================================
  const canvas    = document.getElementById('globe-canvas');
  const ctx       = canvas.getContext('2d');
  const latSlider = document.getElementById('lat-slider');
  const lonSlider = document.getElementById('lon-slider');
  const rotSlider = document.getElementById('rot-slider');
  const tiltSlider= document.getElementById('tilt-slider');
  const latField  = document.getElementById('lat-input');
  const lonField  = document.getElementById('lon-input');
  const rotField  = document.getElementById('rot-input');
  const tiltField = document.getElementById('tilt-input');
  const fmtDecimal= document.getElementById('fmt-decimal');
  const fmtSex    = document.getElementById('fmt-sexagesimal');
  const showCities= document.getElementById('show-cities');
  const showFeats = document.getElementById('show-features');
  const googleBtn = document.getElementById('google-btn');
  const cityCallout = document.getElementById('city-callout');
  const srStatus  = document.getElementById('sr-status');
  const globeDesc = document.getElementById('globe-desc');

  // High-DPI backing store while keeping internal coordinates at CW x CH.
  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  canvas.width  = CW * DPR;
  canvas.height = CH * DPR;
  ctx.scale(DPR, DPR);

  // Globe background disc -- reuse the exported vector shape (globe-background.svg).
  const globeImg = new Image();
  let globeImgReady = false;
  globeImg.onload = function () { globeImgReady = true; render(); };
  globeImg.src = 'assets/globe-background.svg';

  // =========================================================================
  //  Coordinate string computation -- verbatim port of moveCursor() string math
  // =========================================================================
  function cursorStrings(azDeg, altDeg) {
    const cp = {};
    // longitude
    if (azDeg > 180) { cp.lonValStr = toFixed(360 - azDeg, 1); cp.lonDirStr = "E"; }
    else             { cp.lonValStr = toFixed(azDeg, 1);       cp.lonDirStr = "W"; }
    // latitude
    if (altDeg > 0)  { cp.latValStr = toFixed(altDeg, 1);          cp.latDirStr = "N"; }
    else             { cp.latValStr = toFixed(Math.abs(altDeg), 1); cp.latDirStr = "S"; }
    // latitude degrees-minutes string
    let fdeg = Math.abs(altDeg), ideg = Math.floor(fdeg);
    let imin = Math.floor(60 * (fdeg - ideg));
    let str = ideg + "° " + (imin < 10 ? "0" + imin + "' " : imin + "' ");
    cp.latitudeDMSString = str + cp.latDirStr;
    // longitude degrees-minutes string
    fdeg = (azDeg > 180) ? (360 - azDeg) : azDeg;
    ideg = Math.floor(fdeg);
    imin = Math.floor(60 * (fdeg - ideg));
    str = ideg + "° " + (imin < 10 ? "0" + imin + "' " : imin + "' ");
    cp.longitudeDMSString = str + cp.lonDirStr;
    return cp;
  }

  // displayed strings (updateStrings) given the format choice
  function displayStrings(cp) {
    if (state.format === 'd') {
      return {
        lat: cp.latValStr + "° " + cp.latDirStr,
        lon: cp.lonValStr + "° " + cp.lonDirStr
      };
    }
    return { lat: cp.latitudeDMSString, lon: cp.longitudeDMSString };
  }

  const DIR_WORD = { N: "North", S: "South", E: "East", W: "West" };

  // =========================================================================
  //  Longitude slider <-> azimuth conversion
  //  Slider value G is signed longitude (East positive, West negative).
  //  az = mod(-G, 360).  Reading back: az<=180 => West (G=-az);
  //                                    az>180  => East (G=360-az).
  // =========================================================================
  function lonToAz(G)  { return mod(-G, 360); }
  function azToLon(az) { return (az <= 180) ? -az : (360 - az); }

  // =========================================================================
  //  RENDER -- redraws canvas, syncs DOM controls, updates description
  // =========================================================================
  function render() {
    const thetaRad = state.thetaDeg * DEG2RAD;
    const phiRad   = state.phiDeg * DEG2RAD;
    doA(thetaRad, phiRad);

    const az = state.cursorAz, alt = state.cursorAlt;
    const cp = cursorStrings(az, alt);
    const ds = displayStrings(cp);

    // ---- canvas -----------------------------------------------------------
    ctx.clearRect(0, 0, CW, CH);

    // 1. globe background disc (reused exported shape), else a plain white disc
    if (globeImgReady) {
      ctx.drawImage(globeImg, CX - R, CY - R, 2 * R, 2 * R);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, TWO_PI); ctx.fill();
    }

    // 2. subtle shading vignette (celestialBowl: clear center -> 20% black edge)
    const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, R);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, TWO_PI); ctx.fill();

    // clip everything else to the disc so nothing spills past the globe edge
    ctx.save();
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, TWO_PI); ctx.clip();

    // 3. coastlines (front-facing only) -- verbatim cull logic
    drawShores();

    // 4. faint reference meridians + gray equator (always present)
    drawCircle(ctx, circleFromParams({alt:0, az:0,  tilt:90}), COL.meridian, 1);
    drawCircle(ctx, circleFromParams({alt:0, az:90, tilt:90}), COL.meridian, 1);
    if (!state.showFeatures) {
      drawCircle(ctx, circleFromParams({alt:0, az:0, tilt:0}), COL.grayEquator, 1);
    }

    // 5. "features": equator, prime meridian, IDL (when shown)
    if (state.showFeatures) {
      drawCircle(ctx, circleFromParams({alt:0, az:0, tilt:0}), COL.equator, 1);
      drawCircle(ctx, circleFromParams({alt:0, az:0, tilt:90, gammaStart:-90, gammaEnd:90}),
                 COL.primeMeridian, 1);
      for (let i = 1; i < IDL.length; i++) {
        const lp = IDL[i - 1], np = IDL[i];
        const c = circleFromArcPoints({az: -lp.lon, alt: lp.lat},
                                      {az: -np.lon, alt: np.lat});
        if (c) drawCircle(ctx, c, COL.idl, 1);
      }
    }

    // 6. cursor's latitude/longitude reference circles (thin gray)
    drawCircle(ctx, circleFromParams({alt:alt, az:0, tilt:0}), COL.smallCircle, 1);          // latCircle
    drawCircle(ctx, circleFromParams({alt:0, az:az, tilt:90, gammaStart:-90, gammaEnd:90}),  // longCircle
               COL.smallCircle, 1);

    // 7. latitude / longitude arcs (thick, colored) -- per moveCursor
    if (alt > 0) {
      drawCircle(ctx, circleFromParams({alt:0, az:az, tilt:90, gammaStart:0, gammaEnd:alt}),
                 COL.latArc, 3);
    } else {
      drawCircle(ctx, circleFromParams({alt:0, az:az, tilt:90, gammaStart:alt, gammaEnd:0}),
                 COL.latArc, 3);
    }
    if (az > 180) {
      drawCircle(ctx, circleFromParams({alt:0, az:0, tilt:0, gammaStart:0, gammaEnd:-az}),
                 COL.longArc, 3);
    } else {
      drawCircle(ctx, circleFromParams({alt:0, az:0, tilt:180, gammaStart:0, gammaEnd:az}),
                 COL.longArc, 3);
    }

    // 8. cities (front-facing, when shown)
    if (state.showCities) { drawCities(); }

    // 9. cursor dot (on the sphere surface, inside the disc clip)
    drawCursorDot(az, alt);

    ctx.restore();

    // 10. labels -- drawn OUTSIDE the disc clip. The r=1.1 feature labels sit
    //     beyond the sphere silhouette and must not be clipped to the disc.
    if (state.showFeatures) {
      drawLabel("Equator", mod(360 - state.thetaDeg, 360), 0, 1.1, COL.equatorLabel);
      drawLabel("Prime Meridian", 0, 45, 1.1, COL.featureLabel);
      drawLabel("International\nDate Line", 180, 30, 1.1, COL.featureLabel);
    }
    // longitude label near cursor; latitude label offset
    drawLabel(ds.lon, az, (alt > 0 ? -6 : 6), 1, COL.longLabel);
    drawLabel(ds.lat, az + 16, alt / 2, 1, COL.latLabel);

    // ---- DOM sync ---------------------------------------------------------
    // Update typable fields, but never clobber one the user is editing.
    setFieldSilently(latField, ds.lat);
    setFieldSilently(lonField, ds.lon);
    setFieldSilently(rotField, Math.round(mod(state.thetaDeg, 360)) + "°");
    setFieldSilently(tiltField, Math.round(state.phiDeg) + "°");

    // keep sliders in sync without firing their input handlers
    setSliderSilently(latSlider, alt);
    setSliderSilently(lonSlider, azToLon(az));
    setSliderSilently(rotSlider, mod(state.thetaDeg, 360));
    setSliderSilently(tiltSlider, state.phiDeg);

    latSlider.setAttribute('aria-valuetext',
      "Latitude " + cp.latValStr + " degrees " + DIR_WORD[cp.latDirStr]);
    lonSlider.setAttribute('aria-valuetext',
      "Longitude " + cp.lonValStr + " degrees " + DIR_WORD[cp.lonDirStr]);
    rotSlider.setAttribute('aria-valuetext',
      "Globe rotation " + Math.round(mod(state.thetaDeg, 360)) + " degrees");
    tiltSlider.setAttribute('aria-valuetext',
      "Globe tilt " + Math.round(state.phiDeg) + " degrees");

    fmtDecimal.checked = (state.format === 'd');
    fmtSex.checked     = (state.format === 's');
    showCities.checked = state.showCities;
    showFeats.checked  = state.showFeatures;

    updateCityCallout();

    // ---- text equivalent of the diagram ----------------------------------
    let desc = "Globe showing a cursor at latitude " + cp.latValStr + " degrees " +
      DIR_WORD[cp.latDirStr] + ", longitude " + cp.lonValStr + " degrees " +
      DIR_WORD[cp.lonDirStr] + ". ";
    desc += state.showFeatures ? "Equator, prime meridian and international date line shown. "
                               : "Reference features hidden. ";
    desc += state.showCities ? "City markers shown." : "City markers hidden.";
    globeDesc.textContent = desc;
  }

  // ---- coastlines: verbatim front/back cull from shoreDemo -----------------
  function drawShores() {
    const s = window.SHORE_DATA;
    ctx.strokeStyle = COL.shore;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const back = function (pt) { return pt.x * a.a6 + pt.y * a.a7 + pt.z * a.a8 < 0; };
    const sx = function (pt) { return CX + pt.x * a.a0 + pt.y * a.a1; };
    const sy = function (pt) { return CY + pt.x * a.a3 + pt.y * a.a4 + pt.z * a.a5; };
    for (let i = 0; i < s.length && i <= POLY_LIMIT; i++) {
      const p = s[i];
      const pl = p.length;
      let pt = p[pl - 1];
      let ib = back(pt);
      if (!ib) { ctx.moveTo(sx(pt), sy(pt)); }
      for (let k = 0; k < pl; k++) {
        pt = p[k];
        if (back(pt)) { ib = true; }
        else {
          if (ib) { ctx.moveTo(sx(pt), sy(pt)); }
          else { ctx.lineTo(sx(pt), sy(pt)); }
          ib = false;
        }
      }
    }
    ctx.stroke();
  }

  // ---- cities -------------------------------------------------------------
  function cityAzAlt(city) {
    let lat = city.lat.deg + city.lat.min / 60;
    if (city.lat.dir === "S") { lat *= -1; }
    let lon = city.lon.deg + city.lon.min / 60;
    if (city.lon.dir === "W") { lon *= -1; }
    return { az: -lon, alt: lat };       // addObject(... {az:-lon, alt:lat, r:0.99})
  }

  function cityScreen(city) {
    const aa = cityAzAlt(city);
    return project(horizonToXYZ(aa.az, aa.alt, 0.99));
  }

  function drawCities() {
    for (let i = 0; i < CITY_LIST.length; i++) {
      const sp = cityScreen(CITY_LIST[i]);
      if (sp.depth < 0) { continue; }    // back hemisphere hidden by disc
      const hi = (i === hoverCity);
      ctx.fillStyle = hi ? COL.cityDotHi : COL.cityDot;   // both #666 (frame 2 just grows)
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, hi ? 4.5 : 3.5, 0, TWO_PI);     // measured from City Dot frames
      ctx.fill();
    }
  }

  // ---- cursor dot ---------------------------------------------------------
  function drawCursorDot(azDeg, altDeg) {
    const sp = project(horizonToXYZ(azDeg, altDeg, 1));
    if (sp.depth < 0) { return; }
    ctx.beginPath(); ctx.arc(sp.x, sp.y, 5, 0, TWO_PI);   // solid black, r~5 (Cursor Dot)
    ctx.fillStyle = COL.cursorDot; ctx.fill();
  }

  // ---- in-globe text labels (upright; AS uses a slight surface skew) -------
  function drawLabel(text, azDeg, altDeg, r, color) {
    const sp = project(horizonToXYZ(azDeg, altDeg, r));
    if (sp.depth < 0) { return; }
    ctx.fillStyle = color;
    ctx.font = '11px Verdana, Geneva, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = text.split('\n');
    const lh = 12;
    const y0 = sp.y - (lines.length - 1) * lh / 2;
    for (let i = 0; i < lines.length; i++) { ctx.fillText(lines[i], sp.x, y0 + i * lh); }
  }

  // ---- floating city callout (HTML overlay) -------------------------------
  function updateCityCallout() {
    if (hoverCity === null || !state.showCities) {
      cityCallout.style.display = 'none';
      cityCallout.setAttribute('aria-hidden', 'true');
      return;
    }
    const city = CITY_LIST[hoverCity];
    const sp = cityScreen(city);
    if (sp.depth < 0) {
      cityCallout.style.display = 'none';
      cityCallout.setAttribute('aria-hidden', 'true');
      return;
    }
    // position relative to the displayed canvas (internal coords -> CSS px)
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / CW, scaleY = rect.height / CH;
    cityCallout.textContent = city.name;
    cityCallout.style.display = 'block';
    cityCallout.style.left = (sp.x * scaleX) + 'px';
    cityCallout.style.top  = (sp.y * scaleY) + 'px';
    cityCallout.setAttribute('aria-hidden', 'false');
  }

  // =========================================================================
  //  Pointer interaction (mouse + touch share one path via Pointer Events)
  // =========================================================================
  let dragMode = null;            // 'cursor' | 'rotate' | null
  let dragStart = null;           // {x,y,theta,phi} for rotate

  // convert a pointer event to sphere-local coords (origin at globe center)
  function pointerToSphere(ev) {
    const rect = canvas.getBoundingClientRect();
    const ix = (ev.clientX - rect.left) * (CW / rect.width);
    const iy = (ev.clientY - rect.top)  * (CH / rect.height);
    return { x: ix - CX, y: iy - CY };
  }

  function findCityUnder(spx, spy) {
    if (!state.showCities) { return null; }
    for (let i = 0; i < CITY_LIST.length; i++) {
      const sp = cityScreen(CITY_LIST[i]);
      if (sp.depth < 0) { continue; }
      const dx = (CX + spx) - sp.x, dy = (CY + spy) - sp.y;
      if (dx * dx + dy * dy <= 36) { return i; }   // within 6 px
    }
    return null;
  }

  // plain drag -> moveCursor (set cursor lat/long from screen point)
  function doMoveCursor(spx, spy) {
    const pt = getMouseAltAz(spx, spy, state.thetaDeg * DEG2RAD, state.phiDeg * DEG2RAD);
    if (pt && pt.alt != null) {
      state.cursorAz = pt.az;
      state.cursorAlt = pt.alt;
      render();
    }
  }

  // shift drag -> rotate globe (verbatim shoreDemo.updateSimpleDragging math)
  function doRotate(spx, spy) {
    let newTheta = RAD2DEG * (dragStart.theta - (spx - dragStart.x) / R);
    let newPhi   = RAD2DEG * (dragStart.phi  + (spy - dragStart.y) / R);
    newTheta = mod(newTheta, 360);
    newPhi = mod(newPhi + 180, 360) - 180;
    if (newPhi > 90) { newPhi = 90; }
    else if (newPhi < -90) { newPhi = -90; }
    state.thetaDeg = newTheta;
    state.phiDeg = newPhi;
    render();
  }

  canvas.addEventListener('pointerdown', function (ev) {
    const sp = pointerToSphere(ev);
    if (Math.sqrt(sp.x * sp.x + sp.y * sp.y) > R) { return; }  // outside disc
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* non-fatal */ }
    canvas.focus();                       // clicking the globe moves focus to it
    ev.preventDefault();
    if (ev.shiftKey) {
      dragMode = 'rotate';
      dragStart = { x: sp.x, y: sp.y,
                    theta: state.thetaDeg * DEG2RAD, phi: state.phiDeg * DEG2RAD };
    } else {
      dragMode = 'cursor';
      doMoveCursor(sp.x, sp.y);
    }
  });

  canvas.addEventListener('pointermove', function (ev) {
    const sp = pointerToSphere(ev);
    if (dragMode === 'cursor') { doMoveCursor(sp.x, sp.y); }
    else if (dragMode === 'rotate') { doRotate(sp.x, sp.y); }
    else {
      // hover: show city label
      const c = findCityUnder(sp.x, sp.y);
      if (c !== hoverCity) { hoverCity = c; updateCityCallout(); }
    }
  });

  function endDrag(ev) {
    if (dragMode) {
      dragMode = null;
      dragStart = null;
      announceCursor();
    }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', function () {
    if (!dragMode && hoverCity !== null) { hoverCity = null; updateCityCallout(); }
  });

  // When the globe canvas is focused, arrow keys move the cursor location (the point
  // on the surface). Up/Down = latitude north/south, Left/Right = longitude west/east;
  // hold Shift (or use Page Up/Down for latitude) for a larger 10-degree step.
  canvas.addEventListener('keydown', function (ev) {
    const step = ev.shiftKey ? 10 : 1;
    let alt = state.cursorAlt;
    let lon = azToLon(state.cursorAz);      // signed longitude, East positive
    let handled = true;
    switch (ev.key) {
      case 'ArrowUp':    alt += step; break;
      case 'ArrowDown':  alt -= step; break;
      case 'ArrowRight': lon += step; break;   // east
      case 'ArrowLeft':  lon -= step; break;   // west
      case 'PageUp':     alt += 10;   break;
      case 'PageDown':   alt -= 10;   break;
      default: handled = false;
    }
    if (!handled) { return; }                 // let Tab and other keys pass through
    ev.preventDefault();
    if (alt > 90) { alt = 90; } else if (alt < -90) { alt = -90; }   // clamp at poles
    lon = ((lon + 180) % 360 + 360) % 360 - 180;                     // wrap longitude
    state.cursorAlt = alt;
    state.cursorAz = lonToAz(lon);
    render();
    announceCursor();
  });

  // =========================================================================
  //  Keyboard / native controls
  // =========================================================================
  let silentSlider = false;
  function setSliderSilently(slider, value) {
    silentSlider = true;
    slider.value = value;
    silentSlider = false;
  }

  // Update a typable field's value, unless the user is currently editing it.
  function setFieldSilently(field, text) {
    if (document.activeElement !== field) { field.value = text; }
  }

  latSlider.addEventListener('input', function () {
    if (silentSlider) { return; }
    state.cursorAlt = parseFloat(latSlider.value);
    render();
  });
  lonSlider.addEventListener('input', function () {
    if (silentSlider) { return; }
    state.cursorAz = lonToAz(parseFloat(lonSlider.value));
    render();
  });
  rotSlider.addEventListener('input', function () {
    if (silentSlider) { return; }
    state.thetaDeg = parseFloat(rotSlider.value);
    render();
  });
  tiltSlider.addEventListener('input', function () {
    if (silentSlider) { return; }
    state.phiDeg = parseFloat(tiltSlider.value);
    render();
  });

  // announce on commit (change), not on every input tick
  latSlider.addEventListener('change', announceCursor);
  lonSlider.addEventListener('change', announceCursor);
  rotSlider.addEventListener('change', function () {
    announce("Globe rotation " + Math.round(mod(state.thetaDeg, 360)) + " degrees.");
  });
  tiltSlider.addEventListener('change', function () {
    announce("Globe tilt " + Math.round(state.phiDeg) + " degrees.");
  });

  // ---- typable value fields ------------------------------------------------
  // Tolerant parse: pull the numeric tokens out of whatever the user typed.
  // 1 token = decimal degrees; 2-3 tokens = degrees, minutes, seconds.
  function parseAngle(str) {
    const nums = (String(str).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (!nums.length) { return null; }
    const mag = Math.abs(nums[0]) +
                (nums.length > 1 ? Math.abs(nums[1]) / 60 : 0) +
                (nums.length > 2 ? Math.abs(nums[2]) / 3600 : 0);
    return { mag: mag, neg: nums[0] < 0 };
  }

  // Read the signed value currently shown in a field (null if unparseable).
  function readLat() {
    const p = parseAngle(latField.value); if (!p) { return null; }
    let v = p.mag;
    if (/s/i.test(latField.value)) { v = -v; }             // explicit south
    else if (!/n/i.test(latField.value) && p.neg) { v = -v; }  // or a negative number
    return v;
  }
  function readLon() {
    const p = parseAngle(lonField.value); if (!p) { return null; }
    let g = p.mag;                                          // East positive
    if (/w/i.test(lonField.value)) { g = -g; }             // explicit west
    else if (!/e/i.test(lonField.value) && p.neg) { g = -g; }  // or a negative number
    return g;
  }
  function readRot()  { const p = parseAngle(rotField.value);  return p ? (p.neg ? -p.mag : p.mag) : null; }
  function readTilt() { const p = parseAngle(tiltField.value); return p ? (p.neg ? -p.mag : p.mag) : null; }

  // Apply a value (clamp/wrap), redraw, announce, and refresh the (focused) field.
  function applyLat(v) {
    if (v > 90) { v = 90; } else if (v < -90) { v = -90; }   // clamp at the poles
    state.cursorAlt = v; render(); announceCursor();
    latField.value = displayStrings(cursorStrings(state.cursorAz, state.cursorAlt)).lat;
  }
  function applyLon(g) {
    g = ((g + 180) % 360 + 360) % 360 - 180;                 // wrap to [-180, 180)
    state.cursorAz = lonToAz(g); render(); announceCursor();
    lonField.value = displayStrings(cursorStrings(state.cursorAz, state.cursorAlt)).lon;
  }
  function applyRot(t) {
    state.thetaDeg = mod(t, 360); render();
    announce("Globe rotation " + Math.round(mod(state.thetaDeg, 360)) + " degrees.");
    rotField.value = Math.round(mod(state.thetaDeg, 360)) + "°";
  }
  function applyTilt(t) {
    if (t > 90) { t = 90; } else if (t < -90) { t = -90; }
    state.phiDeg = t; render();
    announce("Globe tilt " + Math.round(state.phiDeg) + " degrees.");
    tiltField.value = Math.round(state.phiDeg) + "°";
  }

  // Commit (Enter/blur): apply the typed value, or revert the field if unparseable.
  function commitLat()  { const v = readLat();  if (v !== null) { applyLat(v); }  else { latField.value  = displayStrings(cursorStrings(state.cursorAz, state.cursorAlt)).lat; } }
  function commitLon()  { const g = readLon();  if (g !== null) { applyLon(g); }  else { lonField.value  = displayStrings(cursorStrings(state.cursorAz, state.cursorAlt)).lon; } }
  function commitRot()  { const t = readRot();  if (t !== null) { applyRot(t); }  else { rotField.value  = Math.round(mod(state.thetaDeg, 360)) + "°"; } }
  function commitTilt() { const t = readTilt(); if (t !== null) { applyTilt(t); } else { tiltField.value = Math.round(state.phiDeg) + "°"; } }

  // Step by a delta from the field's current value (or the committed state value).
  function stepLat(d)  { let v = readLat();  if (v === null) { v = state.cursorAlt; }        applyLat(v + d); }
  function stepLon(d)  { let g = readLon();  if (g === null) { g = azToLon(state.cursorAz); } applyLon(g + d); }
  function stepRot(d)  { let t = readRot();  if (t === null) { t = state.thetaDeg; }          applyRot(t + d); }
  function stepTilt(d) { let t = readTilt(); if (t === null) { t = state.phiDeg; }            applyTilt(t + d); }

  // Wire a field: commit on Enter/blur; when the field is focused, Arrow Up/Down,
  // Page Up/Down and the mouse wheel step the value (hold Shift for a 10-unit step).
  function wireField(field, commit, step) {
    field.addEventListener('change', commit);
    field.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); commit(); field.select(); return; }
      let d = 0;
      if      (ev.key === 'ArrowUp')   { d =  (ev.shiftKey ? 10 : 1); }
      else if (ev.key === 'ArrowDown') { d = -(ev.shiftKey ? 10 : 1); }
      else if (ev.key === 'PageUp')    { d =  10; }
      else if (ev.key === 'PageDown')  { d = -10; }
      if (d !== 0) { ev.preventDefault(); step(d); }   // Left/Right still edit the text
    });
    field.addEventListener('wheel', function (ev) {
      if (document.activeElement !== field) { return; }  // only when the field is selected
      ev.preventDefault();
      step((ev.deltaY < 0 ? 1 : -1) * (ev.shiftKey ? 10 : 1));
    }, { passive: false });
  }
  wireField(latField, commitLat, stepLat);
  wireField(lonField, commitLon, stepLon);
  wireField(rotField, commitRot, stepRot);
  wireField(tiltField, commitTilt, stepTilt);

  fmtDecimal.addEventListener('change', function () {
    if (fmtDecimal.checked) { state.format = 'd'; render(); announce("Decimal degrees."); }
  });
  fmtSex.addEventListener('change', function () {
    if (fmtSex.checked) { state.format = 's'; render(); announce("Sexagesimal degrees, minutes."); }
  });

  // Coordinate-format radios: each is its OWN tab stop, and Space (not arrows) turns
  // one on. Tab -> decimal, Tab -> sexagesimal (focus only); Space -> turn on the
  // focused radio and turn the other off. This is handled explicitly so it never
  // depends on native radio-group roving/arrow behavior.
  [fmtDecimal, fmtSex].forEach(function (r) {
    r.tabIndex = 0;                                   // ensure both are tab stops
    r.addEventListener('keydown', function (ev) {
      // Disable the native arrow-key navigation between radios.
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown' ||
          ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
        ev.preventDefault();
        return;
      }
      // Space turns on the focused radio (unchecking its sibling in the group).
      if (ev.key === ' ' || ev.key === 'Spacebar' || ev.code === 'Space') {
        ev.preventDefault();
        if (!r.checked) {
          r.checked = true;                           // unchecks the other radio
          r.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
  });

  showCities.addEventListener('change', function () {
    state.showCities = showCities.checked;
    if (!state.showCities) { hoverCity = null; }
    render();
    announce(state.showCities ? "Cities shown." : "Cities hidden.");
  });
  showFeats.addEventListener('change', function () {
    state.showFeatures = showFeats.checked;
    render();
    announce(state.showFeatures ? "Features shown." : "Features hidden.");
  });

  // open Google Maps -- verbatim URL pattern from openGoogle() (http -> https)
  googleBtn.addEventListener('click', function () {
    const cp = cursorStrings(state.cursorAz, state.cursorAlt);
    const lonStr = cp.lonValStr + cp.lonDirStr;
    const latStr = cp.latValStr + cp.latDirStr;
    const url = "https://maps.google.com/maps?q=" + lonStr + "+" + latStr +
                "&spn=30.454102,33.222656&t=k&hl=en";
    window.open(url, 'googleMapPage');
  });

  // =========================================================================
  //  Reset (masthead "sim-reset" event) -> exact initial state
  // =========================================================================
  document.addEventListener('sim-reset', function () {
    Object.assign(state, INITIAL);
    hoverCity = null;
    render();
    announceCursor();
  });

  // =========================================================================
  //  Live-region announcements
  // =========================================================================
  function announce(msg) { srStatus.textContent = msg; }
  function announceCursor() {
    const cp = cursorStrings(state.cursorAz, state.cursorAlt);
    announce("Cursor at latitude " + cp.latValStr + " degrees " + DIR_WORD[cp.latDirStr] +
             ", longitude " + cp.lonValStr + " degrees " + DIR_WORD[cp.lonDirStr] + ".");
  }

  // reposition callout if the window resizes (canvas display size changes)
  window.addEventListener('resize', updateCityCallout);

  // =========================================================================
  //  Go
  // =========================================================================
  render();

})();
