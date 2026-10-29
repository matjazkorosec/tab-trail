/*
 * Tab trail 1.0.0, https://matjazkorosec.com/tools/tab-trail
 *
 * MIT License
 *
 * Copyright (c) 2026 Matjaž Korošec
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(function(){
/* Tab trail 1.0.0. Copyright (c) 2026 Matjaž Korošec. MIT License, full text: https://github.com/matjazkorosec/tab-trail/blob/main/LICENSE */
var VERSION = "1.0.0";
var ID = "tab-trail-host";
var prev = [].filter.call(document.querySelectorAll("[id='" + ID + "']"), function (e) { return typeof e.__close === "function"; })[0];
if (prev) { prev.__close(); return; }
var NS = "http://www.w3.org/2000/svg";
var FOCUSABLE = "a[href],area[href],button,input,select,textarea,iframe,summary,audio[controls],video[controls],[contenteditable]:not([contenteditable='false']),[tabindex]";
var ROLES = /^(button|link|tab|menuitem|menuitemcheckbox|menuitemradio|checkbox|radio|switch|option|combobox|slider|treeitem)$/;

function walk(root, out) {
  var kids = root.children;
  for (var i = 0; i < kids.length; i++) visit(kids[i], out);
  return out;
}
function visit(el, out) {
  if (el.id === ID && el === host && (!skip || skip.checked)) return;
  if (!(host && el.getRootNode() === host.shadowRoot && (!panel.contains(el) || (logList && logList.contains(el))))) out.push(el);
  if (el.shadowRoot) return walk(el.shadowRoot, out);
  if (el.tagName === "SLOT" && el.assignedElements) {
    var got = el.assignedElements({ flatten: true });
    if (got.length) {
      for (var i = 0; i < got.length; i++) visit(got[i], out);
      return;
    }
  }
  walk(el, out);
}
function shown(el) {
  if (el.checkVisibility) return el.checkVisibility({ visibilityProperty: true, opacityProperty: false });
  var s = getComputedStyle(el);
  return s.display !== "none" && s.visibility !== "hidden" && el.getClientRects().length > 0;
}
function tabbable(el) {
  if (!el.matches(FOCUSABLE)) return false;
  if (el.tabIndex < 0 || el.matches(":disabled") || el.closest("[inert]")) return false;
  if (el.tagName === "INPUT" && el.type === "hidden") return false;
  if (el.tagName === "SUMMARY" && (!el.parentElement || el.parentElement.tagName !== "DETAILS" || el.parentElement.querySelector("summary") !== el)) return false;
  return shown(el);
}

var stops = [], stopSet = new Set(), upSet = new Set(), missed = [], forced = [], forcedBad = [], domAt = new Map();
var GROUP = "[role=tablist],[role=menu],[role=menubar],[role=listbox],[role=radiogroup],[role=grid],[role=treegrid],[role=tree],[role=toolbar]";
var ITEM = /^(tab|menuitem|menuitemcheckbox|menuitemradio|option|radio|gridcell|row|treeitem)$/;
function nearTab(el) {
  for (var p = el.parentElement; p; p = p.parentElement) if (stopSet.has(p)) return true;
  return upSet.has(el);
}
function roving(el) {
  var g = el.closest(GROUP);
  if (!g || (!ITEM.test(el.getAttribute("role") || "") && !(el.hasAttribute("tabindex") && el.tabIndex < 0))) return false;
  if (stopSet.has(g) || upSet.has(g)) return true;
  var id = g.id;
  return !!id && stops.some(function (s) { return (" " + (s.getAttribute("aria-controls") || "") + " " + (s.getAttribute("aria-owns") || "") + " ").indexOf(" " + id + " ") >= 0; });
}
function modal() {
  try {
    var l = document.querySelectorAll("dialog:modal");
    return l.length ? l[l.length - 1] : null;
  } catch (e) { return null; }
}
function within(m, e) {
  for (var n = e; n; n = n.parentNode || n.host) if (n === m) return true;
  return false;
}
function scan() {
  var all = walk(document, []);
  var top = modal();
  if (top) all = all.filter(function (e) { return within(top, e); });
  var found = all.filter(tabbable);
  var groups = new Map();
  found = found.filter(function (el) {
    if (el.tagName !== "INPUT" || el.type !== "radio" || !el.name) return true;
    var own = el.form || el.getRootNode(), byName = groups.get(own) || {};
    groups.set(own, byName);
    var g = byName[el.name] || (byName[el.name] = found.filter(function (x) { return x.tagName === "INPUT" && x.type === "radio" && x.name === el.name && (x.form || x.getRootNode()) === own; }));
    var picked = g.filter(function (x) { return x.checked; })[0] || g[0];
    return picked === el;
  });
  forced = found.filter(function (el) { return el.tabIndex > 0 && !(host && el.getRootNode() === host.shadowRoot); });
  stops = ordered(document, found, null);
  domAt = new Map();
  forced.forEach(function (f) { domAt.set(f, forced.length > 30 ? found.indexOf(f) : ordered(document, found, f).indexOf(f)); });
  forcedBad = forced.filter(function (f) { return domAt.get(f) !== stops.indexOf(f); });
  stopSet = new Set(stops);
  upSet = new Set();
  stops.forEach(function (s) {
    for (var p = s.parentElement; p && !upSet.has(p); p = p.parentElement) upSet.add(p);
  });
  var ids = document.querySelectorAll("[id='" + ID + "']"), only = !ids.length || (ids.length === 1 && ids[0] === host);
  var miss = all.filter(function (el) {
    if (stopSet.has(el) || (only ? el === host : el.closest("#" + ID)) || (host && el.getRootNode() === host.shadowRoot)) return false;
    var t = el.tagName;
    if (t === "HTML" || t === "BODY" || t === "LABEL" || t === "OPTION" || t === "OPTGROUP") return false;
    var role = el.getAttribute("role") || "";
    var looks = el.hasAttribute("onclick") || ROLES.test(role);
    var s = getComputedStyle(el);
    if (s.pointerEvents === "none") return false;
    if (!looks) {
      if (s.cursor !== "pointer") return false;
      var ps = el.parentElement && getComputedStyle(el.parentElement);
      if (ps && ps.cursor === "pointer") return false;
    }
    if (el.closest("label") || el.matches(":disabled") || el.closest("[inert]") || el.closest("[aria-disabled='true']")) return false;
    if (!shown(el)) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false;
    return !nearTab(el) && !roving(el);
  });
  var missSet = new Set(miss);
  missed = miss.filter(function (el) {
    for (var p = el.parentElement; p; p = p.parentElement) if (missSet.has(p)) return false;
    return true;
  });
  hoverScan();
}
function ordered(scope, list, flat) {
  var units = [], groups = new Map(), out = [];
  list.forEach(function (el) {
    var h = el;
    while (h.getRootNode() !== scope && h.getRootNode().host) h = h.getRootNode().host;
    if (h === el) return units.push({ k: el === flat ? 0 : el.tabIndex, el: el });
    var g = groups.get(h);
    if (!g) {
      g = { k: h.hasAttribute("tabindex") && h !== flat ? Math.max(h.tabIndex, 0) : 0, host: h, els: [] };
      groups.set(h, g);
      units.push(g);
    }
    g.els.push(el);
  });
  units.filter(function (u) { return u.k > 0; }).sort(function (a, b) { return a.k - b.k; }).concat(units.filter(function (u) { return u.k <= 0; })).forEach(function (u) {
    if (u.host) out = out.concat(ordered(u.host.shadowRoot, u.els, flat));
    else out.push(u.el);
  });
  return out;
}
var hovers = [], hoverOk = [], hovRule = new Map(), hovSeen = new Set(), hovHid = new Map(), tabOpens = new WeakSet();
function hoverTry(s) {
  var hit = false;
  hovers.forEach(function (h) {
    var e = hovHid.get(h);
    if (e && within(h, s) && !within(e, s) && !hiddenNow(e)) {
      tabOpens.add(h);
      hit = true;
    }
  });
  if (hit) rescan();
}
var HOVER = ":hover", FOC = ":focus-within|:focus-visible|:focus";
function parts(sel) {
  var out = [], depth = 0, start = 0;
  for (var i = 0; i < sel.length; i++) {
    var ch = sel.charAt(i);
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && !depth) { out.push(sel.slice(start, i).trim()); start = i + 1; }
  }
  out.push(sel.slice(start).trim());
  return out;
}
function bare(sel, re) {
  return sel.replace(new RegExp("(^|[\\s>+~(])(" + re + ")", "g"), "$1*").replace(new RegExp(re, "g"), "");
}
function reveals(st) {
  var d = st.getPropertyValue("display"), v = st.getPropertyValue("visibility"), o = st.getPropertyValue("opacity"), mh = st.getPropertyValue("max-height");
  return (d !== "" && d !== "none") || v === "visible" || (o !== "" && parseFloat(o) > 0) || (mh !== "" && mh !== "0" && mh !== "0px");
}
var cssRules = 0, cssSheets = 0, cssBlocked = [];
function nest(sel, up) {
  if (!up) return sel;
  return parts(sel).map(function (q) { return q.indexOf("&") >= 0 ? q.split("&").join(":is(" + up + ")") : ":is(" + up + ") " + q; }).join(", ");
}
function depth(p, k) {
  var d = 0;
  for (var i = 0; i < k; i++) {
    var ch = p.charAt(i);
    if (ch === "\\") i++;
    else if (ch === "(") d++;
    else if (ch === ")") d--;
  }
  return d;
}
function compound(p, k) {
  var d = 0, i = k - 1;
  for (; i >= 0; i--) {
    var ch = p.charAt(i);
    if (i > 0 && p.charAt(i - 1) === "\\") {
      i--;
      continue;
    }
    if (ch === ")") d++;
    else if (ch === "(") {
      if (!d) break;
      d--;
    } else if (!d && /[\s>+~,]/.test(ch)) break;
  }
  var c = p.slice(i + 1, k).trim();
  return c ? bare(c, HOVER) : "";
}
function selfFocus(p) {
  var m = p.match(new RegExp(FOC)), k = m ? m.index + m[0].length : -1;
  if (k < 0 || depth(p, k)) return false;
  for (var d = 0; k < p.length; k++) {
    var ch = p.charAt(k);
    if (ch === "\\") k++;
    else if (ch === "(") d++;
    else if (ch === ")") d--;
    else if (!d && /[\s>+~]/.test(ch)) return false;
  }
  return true;
}
var sheetMemo = new WeakMap();
function readRules() {
  var hov = [], foc = [];
  cssRules = 0;
  cssSheets = 0;
  cssBlocked = [];
  function take(sel, src) {
    parts(sel).forEach(function (p) {
      if (/:focus/.test(p)) return foc.push([bare(p, FOC), selfFocus(p)]);
      var k = p.indexOf(HOVER), on;
      if (k < 0) return;
      if (depth(p, k)) on = compound(p, k);
      else {
        var pre = p.slice(0, k);
        if (!pre.trim() || /[\s>+~]$/.test(pre)) return;
        on = bare(pre, HOVER);
      }
      if (on) hov.push([bare(p, HOVER), on, p, src]);
    });
  }
  function go(list, src, up) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i], sel = up, st = null;
      if (r.selectorText !== undefined) {
        sel = nest(r.selectorText, up);
        st = r.style;
      } else if (up && r.style && !r.cssRules) st = r.style;
      if (st) {
        cssRules++;
        if (/:hover|:focus/.test(sel) && reveals(st)) take(sel, src);
      }
      if (r.cssRules && r.cssRules.length) go(r.cssRules, src, sel);
    }
  }
  var sheets = Array.prototype.slice.call(document.styleSheets).concat(document.adoptedStyleSheets || []);
  sheets.forEach(function (sh) {
    var list;
    try { list = sh.cssRules; } catch (e) { return cssBlocked.push(sh.href || "a style sheet"); }
    var memo = sheetMemo.get(sh);
    if (!memo || memo.list !== list || memo.n !== list.length || memo.node !== sh.ownerNode) {
      var h0 = hov, f0 = foc, c0 = cssRules;
      hov = [];
      foc = [];
      cssRules = 0;
      try { go(list, sh.href || (sh.ownerNode ? "an inline <style> in the page" : "a style sheet added by script"), ""); } catch (e) {
        hov = h0;
        foc = f0;
        cssRules = c0;
        return cssBlocked.push(sh.href || "a style sheet");
      }
      memo = { list: list, n: list.length, node: sh.ownerNode, hov: hov, foc: foc, rules: cssRules };
      sheetMemo.set(sh, memo);
      hov = h0;
      foc = f0;
      cssRules = c0;
    }
    hov = hov.concat(memo.hov);
    foc = foc.concat(memo.foc);
    cssRules += memo.rules;
    cssSheets++;
  });
  return [hov, foc];
}
function hiddenNow(e) {
  return !shown(e) || getComputedStyle(e).opacity === "0" || e.getBoundingClientRect().height < 1;
}
function hoverScan() {
  var rr = readRules(), foc = rr[1], found = [], seenH = new Set(), ok = [], top = modal();
  hovRule = new Map();
  hovSeen = new Set();
  rr[0].forEach(function (h) {
    var list;
    try { list = document.querySelectorAll(h[0]); } catch (e) { return; }
    for (var i = 0; i < list.length; i++) {
      var e = list[i], host = null;
      if (!hiddenNow(e) || (!e.matches(FOCUSABLE) && !e.querySelector(FOCUSABLE))) continue;
      try { host = e.parentElement && e.parentElement.closest(h[1]); } catch (x) {}
      if (!host || host === document.body || host === document.documentElement || seenH.has(host) || !shown(host) || (top && !within(top, host))) continue;
      if (host.matches("[aria-expanded],[aria-haspopup]") || host.querySelector("[aria-expanded],[aria-haspopup]")) {
        ok.push([host, "toggle"]);
        continue;
      }
      if (foc.some(function (f) { try { return (!f[1] || shown(e)) && e.matches(f[0]); } catch (x) { return false; } })) {
        ok.push([host, "focus"]);
        continue;
      }
      if (tabOpens.has(host)) {
        ok.push([host, "tab"]);
        continue;
      }
      found.push(host);
      seenH.add(host);
      hovHid.set(host, e);
      hovRule.set(host, [h[2], h[3]]);
      if (shown(e) && stops.some(function (s) { return e.contains(s); })) hovSeen.add(host);
    }
  });
  hovers = found;
  hoverOk = ok.filter(function (o) { return !seenH.has(o[0]); });
}
scan();

var host = document.createElement("div");
host.id = ID;
host.style.cssText = "all:initial;position:absolute;left:0;top:0;width:0;height:0;overflow:visible;z-index:2147483647;pointer-events:none;";
var root = host.attachShadow({ mode: "open" });
var style = document.createElement("style");
style.textContent = [
  ":host{all:initial}",
  "svg{position:fixed;inset:0;width:100vw;height:100vh;overflow:visible}",
  "svg.pg{position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible}",
  ".p{position:fixed;bottom:66px;right:66px;width:350px;box-sizing:border-box;padding:6px;background:#e4dccd;color:#1a1612;border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,.12),0 14px 34px rgba(0,0,0,.26);font:14px/1.45 -apple-system,system-ui,'Segoe UI',Roboto,sans-serif;pointer-events:auto;cursor:grab;overflow-x:hidden;overflow-y:auto;max-height:calc(100vh - 90px);overscroll-behavior:contain}",
  ".tb{display:flex;align-items:center;gap:4px;padding:0 0 5px 4px}",
  ".t{margin:0;flex:1;white-space:nowrap;font:700 17px/1.2 Georgia,serif;letter-spacing:-.01em}",
  ".cd{margin:4px 0 0;padding:7px 10px;background:#fbf8f3;border-radius:10px}",
  ".tb+.cd{margin-top:0}",
  ".p.rm{padding:10px}",
  ".rm .tb{gap:6px;padding:4px 2px 8px 6px}",
  ".rm .t{font-size:19px}",
  ".rm .cd{margin-top:6px;padding:12px 14px}",
  ".rm .tb+.cd{margin-top:0}",
  ".rm .ta{height:32px;padding:0 12px 0 10px}",
  ".rm .n{gap:7px;margin-top:12px}",
  ".rm .n b{font-size:22px}",
  ".rm .k{margin-top:7px}",
  ".rm .x,.rm .b.cn{width:32px;height:32px}",
  ".rm .sec{margin-top:6px}",
  ".rm .sg{min-height:46px;padding:0 12px 0 8px}",
  ".rm .ic{width:30px;height:30px;border-radius:8px}",
  ".rm .so,.rm .lbd,.rm .la{padding:2px 14px 14px}",
  ".rm .hw{margin:10px 6px 2px}",
  ".rm .m{margin-top:8px;gap:6px}",
  ".rm .c{padding:6px 10px}",
  ".rm .pr{margin-top:12px}",
  ".rm .pl{height:30px;padding:0 14px 0 11px}",
  ".rm .b{width:30px;height:30px}",
  ".rm .lf{margin-top:10px}",
  ".rm .lt{padding:3px 9px}",
  ".rm .ll{margin:10px -14px 0}",
  ".rm .lx{padding:6px 14px}",
  ".rm .lr.lb2{gap:6px;margin-top:12px}",
  ".rm .kl,.rm .ka{height:38px;border-radius:8px}",
  ".rm .lnt{height:38px;border-radius:8px}",
  ".rm .lck,.rm .lw,.rm .sm,.rm .lr{margin-top:10px}",
  ".rm .lrt{margin-top:0}",
  ".rm .gp .k,.rm .lgp .k{margin-top:10px}",
  ".rm .mn{margin-top:12px}",
  ".rm .so>.k:first-child,.rm .lbd>:first-child,.rm .la>:first-child,.rm .cd>:first-child,.rm .cd>div:first-child>:first-child{margin-top:0}",
  ".cd>:first-child,.cd>div:first-child>:first-child{margin-top:0}",
  ".cd>div:empty{display:none}",
  ".ta{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px 0 8px;border:1.5px solid #1a1612;border-radius:999px;background:#fbf8f3;font-weight:700;font-size:14px;white-space:nowrap;cursor:pointer;flex:none}",
  ".ta:hover{background:#fff}",
  ".ta:focus-visible{outline:3px solid #c2410c;outline-offset:2px}",
  ".n{display:flex;align-items:baseline;gap:6px;margin:5px 0 0}",
  ".n b{font:700 20px/1 -apple-system,system-ui,'Segoe UI',Roboto,sans-serif;letter-spacing:-.02em;font-variant-numeric:tabular-nums}",
  ".k{display:flex;align-items:center;gap:10px;margin:4px 0 0;font-size:14px}",
  ".d{width:16px;height:16px;border-radius:50%;background:#1a1612;box-shadow:0 0 0 2px #fff inset,0 0 0 1px #1a1612;flex:none}",
  ".r{width:16px;height:12px;box-sizing:border-box;border:2px dashed #d0103a;border-radius:2px;background:rgba(208,16,58,.12);flex:none}",
  ".x{width:28px;height:28px;flex:none;padding:0;border:0;border-radius:50%;background:transparent;color:#1a1612;cursor:pointer;display:grid;place-items:center}",
  ".p svg{display:block;position:static;inset:auto;width:auto;height:auto;overflow:hidden;flex:none}",
  ".x:hover{background:rgba(26,22,18,.08)}",
  ".b.cn{width:28px;height:28px}",
  ".sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
  ".x:focus-visible,.a:focus-visible,.sg:focus-visible{outline:3px solid #c2410c;outline-offset:2px}",
  ".sec{margin:4px 0 0;background:#fbf8f3;border-radius:10px}",
  ".sg{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:10px;width:100%;min-height:32px;padding:0 9px 0 5px;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer}",
  ".sg:hover{background:#fff}",
  ".ic{width:22px;height:22px;border-radius:6px;background:#efe8dc;display:grid;place-items:center;flex:none}",
  ".sg[aria-expanded=true] .ic{background:#1a1612;color:#fbf8f3}",
  ".warn .ic{background:rgba(208,16,58,.12);color:#d0103a}",
  ".warn .sg[aria-expanded=true] .ic{background:#d0103a;color:#fff}",
  ".bg{margin-left:auto;padding:2px 8px;border-radius:999px;background:#d0103a;color:#fff;font-weight:700;line-height:1.3}",
  ".bg:empty{display:none}",
  ".bg:not(:empty)+i{margin-left:12px}",
  ".sg i{margin-left:auto;width:7px;height:7px;border-right:2px solid #1a1612;border-bottom:2px solid #1a1612;transform:translate(-3px,-2px) rotate(45deg)}",
  ".sg[aria-expanded=true] i{transform:translate(-3px,2px) rotate(225deg)}",
  ".so,.lbd,.la{padding:1px 10px 8px}",
  ".lbd{overflow:hidden}",
  ".so>.k:first-child,.lbd>:first-child,.la>:first-child{margin-top:0}",
  ".so[hidden]{display:none}",
  ".hw{margin:5px 4px 0;color:#5f564c;font-size:11px;line-height:1.3;font-weight:600}",
  ".a{color:#5f564c;font-size:13px;font-weight:400;text-decoration:none;white-space:nowrap}",
  ".vr{float:right;margin-left:8px;color:#5f564c;font-weight:400}",
  ".hw+.hw{margin-top:4px}",
  ".mn{margin:6px 0 0;color:#1e3a8a}",
  ".a:hover{color:#9a3412;text-decoration:underline}",
  ".p.g{cursor:grabbing;user-select:none}",
  ".n b.e{color:#d0103a}",
  ".n b.ok{color:#1f7a3f}",
  ".s{cursor:pointer}",
  "svg.in{z-index:1}",
  "g.o{pointer-events:auto;cursor:pointer;-webkit-user-select:none;user-select:none}",
  ".s input{width:16px;height:16px;margin:0 2px 0 1px;accent-color:#c2410c;cursor:pointer}",
  ".s.off{opacity:.45;cursor:default}",
  ".s.off input{cursor:default}",
  ".s input:focus-visible{outline:3px solid #c2410c;outline-offset:2px}",
  ".h{width:16px;height:16px;border-radius:50%;background:#fff;border:2px dashed #1a1612;box-sizing:border-box;flex:none}",
  ".m{list-style:none;margin:5px 0 0;padding:2px;display:flex;flex-wrap:wrap;gap:4px}",
  ".c{all:unset;font:inherit;font-size:14px;line-height:1;cursor:pointer;padding:4px 8px;border:1px dashed #d0103a;border-radius:999px;background:rgba(208,16,58,.06);color:#1a1612}",
  ".c:hover{background:rgba(208,16,58,.14)}",
  ".c[aria-pressed=true]{border-style:solid;background:#d0103a;color:#fff}",
  ".c:focus-visible{outline:3px solid #c2410c;outline-offset:2px}",
  ".gp[hidden]{display:none}",
  ".gp .k,.lgp .k{margin:6px 0 0}",
  ".w{display:flex;align-items:center;gap:8px;margin:0;font-size:14px}",
  ".w span{flex:1;font-variant-numeric:tabular-nums}",
  ".b{all:unset;box-sizing:border-box;width:28px;height:28px;border:1.5px solid #1a1612;border-radius:50%;display:grid;place-items:center;cursor:pointer;color:#1a1612;flex:none}",
  ".b:hover{background:rgba(26,22,18,.08)}",
  ".b:disabled{opacity:.3;cursor:default;background:none}",
  ".b:focus-visible{outline:3px solid #c2410c;outline-offset:2px}",
  ".pr{display:flex;align-items:center;gap:10px;margin:6px 0 0;font-size:14px;color:#5f564c}",
  ".pr+.pr{margin-top:8px}",
  ".pr .lo{display:inline-flex;align-items:center;height:30px;color:#1a1612}",
  ".sm{margin:6px 0 0;font-size:14px;line-height:1.45}",
  ".sm[hidden]{display:none}",
  ".sm .g{color:#1f7a3f;font-weight:600}",
  ".sm .e{color:#d0103a;font-weight:700}",
  ".sm .q{color:#5f564c;font-weight:400}",
  ".m .mo{align-self:center;color:#5f564c;font-size:14px}",
  ".pl{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 13px 0 10px;border-radius:999px;background:#1a1612;color:#f7f3ec;font-weight:700;font-size:14px;cursor:pointer;flex:none}",
  ".pl:hover{background:#3a332c}",
  ".pl:focus-visible{outline:3px solid #c2410c;outline-offset:2px}",
  ".ls{font-weight:400;color:#5f564c}",
  ".lv{color:#d0103a;font-weight:700}",
  ".lbd[hidden],.la[hidden],.lm[hidden]{display:none}",
  ".lf{display:grid;grid-template-columns:1fr 1fr;gap:2px;margin:6px 0 0;padding:3px;background:#efe8dc;border-radius:10px}",
  ".lt{all:unset;box-sizing:border-box;text-align:center;padding:2px 9px;border-radius:7px;color:#5f564c;font-weight:600;font-size:14px;line-height:1.3;cursor:pointer}",
  ".lt:hover{color:#1a1612;background:rgba(26,22,18,.06)}",
  ".lt[aria-pressed=true]{background:#fff;color:#1a1612;box-shadow:0 1px 2px rgba(26,22,18,.2)}",
  ".lt.e{color:#d0103a}",
  ".lt.e:hover{background:rgba(208,16,58,.1)}",
  ".lt.e[aria-pressed=true]{background:#d0103a;color:#fff}",
  ".ll{list-style:none;margin:6px -10px 0;padding:0;cursor:auto}",
  ".lx{padding:3px 10px}",
  ".lx.bad{background:rgba(208,16,58,.07)}",
  ".lx .tm{margin-right:8px;font:500 14px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#5f564c}",
  ".lx .st{font:700 14px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}",
  ".lx .bd{display:block}",
  ".ok .st{color:#1f7a3f}.bad .st{color:#d0103a}.skip .st{color:#5f564c}.info .st{color:#1e3a8a}",
  ".ft{color:#1e3a8a}.bad .ft{color:#d0103a}",
  ".lc{all:unset;box-sizing:border-box;display:inline-block;min-width:22px;padding:0 6px;border:1px dashed #1a1612;border-radius:999px;font-size:14px;line-height:1.4;text-align:center;cursor:pointer}",
  ".lc:hover{background:rgba(26,22,18,.08)}",
  ".lr{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 0}",
  ".lrt{margin:0}",
  ".lr.lb2{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}",
  ".kl,.ka{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:7px;height:30px;border-radius:7px;font-weight:700;font-size:14px;white-space:nowrap;cursor:pointer}",
  ".kl{border:1.5px solid #1a1612;background:#fff;color:#1a1612}",
  ".kl:hover{background:#efe8dc}",
  ".ka{background:#1a1612;color:#fbf8f3}",
  ".ka:hover{background:#3a332c}",
  ".kl:focus-visible,.ka:focus-visible{outline:3px solid #c2410c;outline-offset:2px}",
  ".lnt{all:unset;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:7px;width:100%;height:30px;border:1.5px dashed #1a1612;border-radius:7px;font-weight:700;font-size:14px;cursor:pointer}",
  ".lnt:hover{border-style:solid;background:#fff}",
  ".lnt:focus-visible{outline:3px solid #c2410c;outline-offset:2px}",
  ".lk{all:unset;box-sizing:border-box;padding:5px 13px;border-radius:999px;background:#1a1612;color:#f7f3ec;font-weight:700;font-size:14px;cursor:pointer}",
  ".lk:hover{background:#3a332c}",
  ".lo{all:unset;box-sizing:border-box;padding:4px 12px;border:1.5px solid #1a1612;border-radius:999px;font-weight:600;font-size:14px;cursor:pointer}",
  ".lo:hover{background:rgba(26,22,18,.08)}",
  ".lt:focus-visible,.lc:focus-visible,.lk:focus-visible,.lo:focus-visible{outline:3px solid #c2410c;outline-offset:2px}",
  ".la p,.lm{margin:8px 0 0}",
  ".lck{margin:6px 0 0;font-size:14px;line-height:1.45}",
  ".lck[hidden]{display:none}",
  ".lq{color:#1e3a8a;font-weight:700;text-decoration:none}",
  ".lq:hover{text-decoration:underline;text-underline-offset:2px}",
  ".lq.bad{color:#d0103a}",
  ".lq:focus-visible{outline:3px solid #c2410c;outline-offset:2px;border-radius:2px}",
  ".wc{color:#1f7a3f;font-weight:400}",
  ".nw .wc{display:none}",
  ".lw{display:flex;align-items:center;gap:8px;margin:6px 0 0;font-size:14px;color:#1f7a3f;cursor:pointer}",
  ".lw input{width:16px;height:16px;margin:0 2px 0 1px;accent-color:#c2410c;cursor:pointer}",
  ".lw input:focus-visible{outline:3px solid #c2410c;outline-offset:2px}",
  ".lm{color:#d0103a}"
].join("");
try {
  var sheet = new CSSStyleSheet();
  sheet.replaceSync(style.textContent);
  root.adoptedStyleSheets = [sheet];
} catch (e) {
  root.appendChild(style);
}
var spot = document.createElementNS(NS, "svg");
root.appendChild(spot);
var underPg = document.createElementNS(NS, "svg");
underPg.setAttribute("class", "pg");
root.appendChild(underPg);
var svgPg = document.createElementNS(NS, "svg");
svgPg.setAttribute("class", "pg");
root.appendChild(svgPg);
var under = document.createElementNS(NS, "svg");
root.appendChild(under);
var svg = document.createElementNS(NS, "svg");
root.appendChild(svg);
var dotPg = document.createElementNS(NS, "svg");
dotPg.setAttribute("class", "pg");
root.appendChild(dotPg);
var dot = document.createElementNS(NS, "svg");
root.appendChild(dot);
[spot, underPg, svgPg, under, svg, dotPg, dot].forEach(function (g) { g.setAttribute("aria-hidden", "true"); });

var panel = document.createElement("div");
panel.className = "p";
panel.setAttribute("role", "dialog");
panel.setAttribute("aria-label", "Tab trail");
function line(cls, bold, text, mark) {
  var p = document.createElement("p");
  p.className = cls;
  if (mark) { var m = document.createElement("span"); m.className = mark; p.appendChild(m); }
  if (bold !== null) { var b = document.createElement("b"); b.textContent = bold; p.appendChild(b); }
  p.appendChild(document.createTextNode(text));
  panel.appendChild(p);
  return p;
}
var x = document.createElement("button");
x.className = "x";
x.type = "button";
x.setAttribute("aria-label", "Close Tab trail");
function icon(parent, w, d, sw) {
  var g = el("svg", { width: w, height: w, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", "stroke-width": sw, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" }, parent);
  el("path", { d: d }, g);
  return g;
}
icon(x, 16, "M3 3l10 10M13 3L3 13", 2);
var bar = document.createElement("div");
bar.className = "tb";
panel.appendChild(bar);
var corner = document.createElement("button");
corner.className = "b cn";
corner.type = "button";
corner.setAttribute("aria-label", "Move to the next corner");
corner.title = "Move to the next corner";
var cg = icon(corner, 16, "M5 11.5V5h6.5M9.5 3.2L11.5 5 9.5 6.8", 1.6);
el("rect", { x: 2, y: 2, width: 12, height: 12, rx: 2 }, cg);
el("rect", { x: 9.5, y: 9.5, width: 2, height: 2, fill: "currentColor" }, cg);
corner.addEventListener("click", function () {
  var r = panel.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  var mx = Math.max(8, Math.min(66, (W - r.width) / 2)) + "px", my = Math.max(8, Math.min(66, (H - r.height) / 2)) + "px";
  var right = r.left + r.width / 2 > W / 2, low = r.top + r.height / 2 > H / 2;
  var k = !low && !right ? 1 : !low && right ? 2 : low && right ? 3 : 0;
  for (var i = 0; i < 4; i++) {
    var toRight = k === 1 || k === 2, toLow = k === 2 || k === 3;
    panel.style.left = toRight ? "auto" : mx;
    panel.style.right = toRight ? mx : "auto";
    panel.style.top = toLow ? "auto" : my;
    panel.style.bottom = toLow ? my : "auto";
    var n = panel.getBoundingClientRect();
    if (Math.abs(n.left - r.left) > 2 || Math.abs(n.top - r.top) > 2) break;
    k = (k + 1) % 4;
  }
});
var say = document.createElement("p");
say.className = "sr";
say.setAttribute("role", "status");
say.setAttribute("aria-live", "polite");
panel.appendChild(say);
var sayList = [], sayT = 0;
function announce(t) {
  sayList.push(t);
  if (sayT) return;
  sayT = setTimeout(function () {
    sayT = 0;
    if (closed) return;
    var text = sayList.join(" ");
    sayList = [];
    say.textContent = "";
    setTimeout(function () { say.textContent = text; }, 50);
  }, 1000);
}
bar.appendChild(line("t", null, "Tab trail"));
var playCard = document.createElement("div");
playCard.className = "cd";
panel.appendChild(playCard);
var playRow = document.createElement("p");
playRow.className = "pr";
var play = document.createElement("button");
play.className = "pl";
play.type = "button";
var playIcon = document.createElement("span");
play.appendChild(playIcon);
var playWord = document.createTextNode("Play");
play.appendChild(playWord);
play.addEventListener("mousedown", function (e) { e.preventDefault(); });
var playText = document.createElement("span");
playText.textContent = "Visits every stop for you";
playRow.appendChild(play);
playRow.appendChild(playText);
playCard.appendChild(playRow);
var AI_ICON = "M3.5 5.5h9v8h-9zM8 5.5V3.2M8 1.9v.1M6 8.6v1.1M10 8.6v1.1M6.3 11.6h3.4M1.8 8.5v2.6M14.2 8.5v2.6", COPY_ICON = "M10.5 5.5V3a.5.5 0 0 0-.5-.5H3a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h2.5M5.5 5.5h8v8h-8z";
var aiBtn = document.createElement("button");
aiBtn.className = "ta";
aiBtn.type = "button";
icon(aiBtn, 15, AI_ICON, 1.6);
aiBtn.appendChild(document.createTextNode("Copy for AI"));
aiBtn.addEventListener("click", function () { copyIt(aiBtn, window, aiText(), "Copy for AI"); });
bar.appendChild(aiBtn);
bar.appendChild(corner);
bar.appendChild(x);
var sumLine = document.createElement("p");
sumLine.className = "sm";
sumLine.hidden = true;
playCard.appendChild(sumLine);
var resCard = document.createElement("div");
resCard.className = "cd";
panel.appendChild(resCard);
var info = document.createElement("div");
resCard.appendChild(info);
var shownEl = null, chips = [], drawn = [], panelIn = false, pRet = null;
var KIND = { img: "Image", picture: "Image", svg: "Icon", i: "Icon", video: "Video", a: "Link", li: "List item", tr: "Table row", td: "Table cell" };
var BARE = { button: "Button", textarea: "Field", select: "Dropdown", iframe: "Frame" };
function kind(m, tag) {
  if (tag === "input") return m.type === "checkbox" ? "Checkbox" : m.type === "radio" ? "Radio" : /^(submit|button|reset|image)$/.test(m.type) ? "Button" : "Field";
  return KIND[tag] || BARE[tag] || "Clickable box";
}
function named(m) {
  var by = m.getAttribute("aria-labelledby"), r = m.getRootNode(), t = "";
  if (by && r.getElementById) t = by.split(/\s+/).map(function (id) { var x = r.getElementById(id); return x ? x.textContent : ""; }).join(" ");
  if (!t.trim()) t = m.getAttribute("aria-label") || "";
  if (!t.trim() && m.labels && m.labels.length) t = [].map.call(m.labels, function (l) { return l.innerText || l.textContent; }).join(" ");
  if (!t.trim()) t = m.getAttribute("placeholder") || "";
  if (!t.trim() && m.tagName === "INPUT" && /^(submit|button|reset)$/.test(m.type)) t = m.value;
  if (!t.trim()) t = m.innerText || "";
  if (!t.trim()) t = m.getAttribute("title") || "";
  return t;
}
var EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g, DIGITS = /\d(?:[\s-]?\d){5,}/g, TOKEN = /[A-Za-z0-9_%=+-]{16,}/g;
var SECRET = /\b(?:(?:sk|pk|rk)_(?:live|test)_\w+|gh[pousr]_\w{20,}|github_pat_\w+|AKIA[0-9A-Z]{16}|xox[abprs]-[\w-]+|eyJ[\w-]+\.[\w-]+\.[\w-]*)/g, SAID = /\b((?:password|passwd|pwd|passcode|pin|secret|api[ _-]?key|token)\s*[:=]\s*)\S+/gi;
function tokens(t) { return t.replace(SECRET, "[token]").replace(TOKEN, function (w) { return /\d/.test(w) ? "[token]" : w; }); }
function scrub(t) { return tokens(String(t).replace(SAID, "$1[token]")).replace(EMAIL, "[email]").replace(DIGITS, "[number]"); }
function secretish(t) { return scrub(t) !== t; }
function cleanUrl(u) {
  u = String(u).split(/[?#]/)[0].replace(/^([a-z][\w+.-]*:\/\/)[^@\/]*@/i, "$1");
  if (/^(javascript|data|blob):/i.test(u)) return u.split(":")[0] + ":";
  return scrub(u);
}
function label(m) {
  var tag = m.tagName.toLowerCase();
  var inner = m.querySelector("img[alt],[aria-label],title");
  var alt = (m.getAttribute("alt") || (inner && (inner.getAttribute("alt") || inner.getAttribute("aria-label") || inner.textContent)) || "").trim();
  var t = scrub(named(m)).trim().replace(/\s+/g, " ");
  alt = scrub(alt);
  if (!t && alt) t = (KIND[tag] ? KIND[tag] + ": " : "") + alt.replace(/\s+/g, " ");
  if (!t) t = kind(m, tag);
  return t.length > 28 ? t.slice(0, 27) + "..." : t;
}
function count(n, text, bad, good, parent) {
  var p = document.createElement("p");
  p.className = "n";
  var b = document.createElement("b");
  b.textContent = String(n);
  if (bad) b.className = "e";
  else if (good) b.className = "ok";
  p.appendChild(b);
  p.appendChild(document.createTextNode(text));
  (parent || info).appendChild(p);
}
var CHIPS = 50;
function chipUl(parent, list, text, go) {
  var ul = document.createElement("ul"), out = [];
  ul.className = "m";
  list.slice(0, CHIPS).forEach(function (m) {
    var li = document.createElement("li");
    var c = document.createElement("button");
    c.className = "c";
    c.type = "button";
    c.textContent = text(m);
    c.addEventListener("click", function () { go(m, c); });
    out.push(c);
    li.appendChild(c);
    ul.appendChild(li);
  });
  if (list.length > CHIPS) {
    var mo = document.createElement("li");
    mo.className = "mo";
    mo.textContent = "and " + (list.length - CHIPS).toLocaleString("en-US") + " more";
    ul.appendChild(mo);
  }
  parent.appendChild(ul);
  return out;
}
function fill() {
  var had = chips.indexOf(root.activeElement);
  while (info.firstChild) info.removeChild(info.firstChild);
  chips = [];
  drawn = sig();
  count(stops.length, stops.length === 1 ? " stop for the Tab key" : " stops for the Tab key");
  count(missed.length, missed.length === 0 ? " clickable things Tab skips" : missed.length === 1 ? " looks clickable, but Tab skips it" : " look clickable, but Tab skips them", missed.length > 0, missed.length === 0);
  if (missed.indexOf(shownEl) < 0 && hovers.indexOf(shownEl) < 0 && forcedBad.indexOf(shownEl) < 0) shownEl = null;
  if (missed.length) chipList(missed);
  if (hovers.length) {
    count(hovers.length, hovers.length === 1 ? " menu or box opens only on mouse hover" : " menus or boxes open only on mouse hover", true);
    chipList(hovers);
  }
  if (forcedBad.length) {
    count(forcedBad.length, forcedBad.length === 1 ? " stop has tabindex above 0, which pulls it ahead of the page" : " stops have tabindex above 0, which pulls them ahead of the page", true);
    chipList(forcedBad, true);
  }
  if (skip) skipPanel();
  if (had >= 0 && chips.length) chips[Math.min(had, chips.length - 1)].focus();
}
function sig() { return [stops.length].concat(missed, ["|"], hovers, ["|"], forced, ["|"], forcedBad); }
function chipList(list, num) {
  var made = chipUl(info, list, function (m) { return (num && stops.indexOf(m) >= 0 ? stops.indexOf(m) + 1 + ": " : "") + label(m); }, function (m, c) {
    shownEl = m;
    chips.forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
    m.scrollIntoView({ block: "center", behavior: "smooth" });
    queue();
  });
  made.forEach(function (c, i) { c.setAttribute("aria-pressed", list[i] === shownEl ? "true" : "false"); });
  chips = chips.concat(made);
}
fill();
var PAGE = 50, win = 0, seen = -1;
var pager = document.createElement("p");
pager.className = "w";
var pageText = document.createElement("span");
pager.appendChild(pageText);
function pageBtn(text, step) {
  var b = document.createElement("button");
  b.className = "b";
  b.type = "button";
  b.setAttribute("aria-label", text);
  icon(b, 14, step < 0 ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5", 2);
  b.addEventListener("mousedown", function (e) { e.preventDefault(); });
  b.addEventListener("click", function () {
    win = Math.min(Math.max(win + step, 0), Math.ceil(stops.length / PAGE) - 1);
    queue();
  });
  pager.appendChild(b);
  return b;
}
var prevBtn = pageBtn("Previous", -1), nextBtn = pageBtn("Next", 1);
var group = document.createElement("div");
group.className = "cd gp";
group.appendChild(pager);
var jumpBox = document.createElement("div");
resCard.appendChild(jumpBox);
panel.appendChild(group);
var jumps = [], pressed = 0, before = -1, popMissed = null, lost = false;
var POP = /cookie|consent|gdpr|modal|popup/i;
function dimmed() {
  var W = innerWidth, H = innerHeight;
  return Array.prototype.some.call(document.querySelectorAll("body *"), function (e) {
    if (e.id === ID) return false;
    var cs = getComputedStyle(e);
    if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") return false;
    var r = e.getBoundingClientRect();
    if (r.width < W * 0.9 || r.height < H * 0.9) return false;
    var m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
    var al = m ? m[1].split(",")[3] : null;
    return (al !== undefined && al !== null && +al > 0 && +al < 1) || cs.backdropFilter !== "none" && cs.backdropFilter !== "";
  });
}
function blocking(p) {
  if (p.matches("dialog") && p.matches(":modal")) return true;
  if (p.getAttribute("aria-modal") === "true") return true;
  var r = p.getBoundingClientRect();
  if (r.width * r.height >= innerWidth * innerHeight * 0.5) return true;
  return dimmed();
}
function popupOf(el) {
  for (var p = el; p && p !== document.documentElement; p = p.parentElement || (p.getRootNode().host || null)) {
    if (p.nodeType !== 1) continue;
    if (p.matches("dialog[open],[role=dialog],[role=alertdialog],[aria-modal=true]")) return p;
    var c = typeof p.className === "string" ? p.className : "";
    if (POP.test(p.id + " " + c) && getComputedStyle(p).position === "fixed") return p;
  }
  return null;
}
var covered = [], trapped = [], probHid = new Map();
function pinOf(e) {
  for (var n = e; n && n.nodeType === 1; n = n.parentElement || (n.getRootNode() && n.getRootNode().host)) {
    var pos = getComputedStyle(n).position;
    if (pos === "fixed" || pos === "sticky") return n;
  }
  return null;
}
function hideInfo(s) {
  var r = s.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return { why: "has no size" };
  var m = modal();
  if (m && !within(m, s)) return { why: "is under an open modal" };
  if (popupOf(s)) return { why: "is inside a popup" };
  var pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 1, r.top + 1], [r.right - 1, r.top + 1], [r.left + 1, r.bottom - 1], [r.right - 1, r.bottom - 1]];
  var tested = 0, under = 0, pin = null;
  for (var i = 0; i < pts.length; i++) {
    var px = pts[i][0], py = pts[i][1];
    if (px < 0 || py < 0 || px >= innerWidth || py >= innerHeight) continue;
    tested++;
    var hit = null, list = document.elementsFromPoint(px, py);
    for (var k = 0; k < list.length; k++) if (list[k] !== host && !host.contains(list[k])) { hit = list[k]; break; }
    if (!hit || within(s, hit) || within(hit, s)) continue;
    var p = pinOf(hit);
    if (!p || within(p, s)) continue;
    under++;
    if (!pin) pin = p;
  }
  if (!tested) return { why: "is off screen" };
  return { tested: tested, under: under, pin: pin };
}
function pinText(p) {
  return desc(p) + " (" + getComputedStyle(p).position + ", " + Math.round(p.getBoundingClientRect().height) + " px tall)";
}
var moved = [], movedE = null;
function movedLine() {
  if (movedE) {
    var i = logs.indexOf(movedE);
    if (i >= 0) logs.splice(i, 1);
    if (movedE.li && movedE.li.parentNode) movedE.li.parentNode.removeChild(movedE.li);
    movedE = null;
  }
  moved = moved.filter(function (x) { return x.isConnected; });
  if (!moved.length) {
    if (logList) logSummary();
    return;
  }
  var nums = moved.map(function (x) { return stops.indexOf(x) + 1; }).filter(function (n) { return n > 0; }).sort(function (a, b) { return a - b; });
  var list = nums.length ? ": " + nums.slice(0, 20).join(", ") + (nums.length > 20 ? " and " + (nums.length - 20) + " more" : "") : "";
  log("SKIPPED", "Hidden focus", [pl(moved.length, "stop", "stops") + " not tested, Tab moved on before the page stopped scrolling" + list + ". Press Play to test them."]);
  movedE = logs[logs.length - 1];
}
function tested(s) {
  var i = moved.indexOf(s);
  if (i < 0) return;
  moved.splice(i, 1);
  movedLine();
}
function where(s) {
  var r = s.getBoundingClientRect();
  return scrollX + "," + scrollY + "," + r.left + "," + r.top;
}
function check(s, then) {
  function end() {
    var f = then;
    then = null;
    if (f) f();
  }
  if (!s) return end();
  var was = covered.indexOf(s) >= 0;
  var at = where(s), still = 0, tries = 0;
  function look() {
    if (closed || (covered.indexOf(s) >= 0) !== was) return end();
    var now = where(s);
    if (now !== at) {
      if (stops[current] !== s) {
        if (was) return end();
        if (moved.indexOf(s) < 0) {
          moved.push(s);
          movedLine();
        }
        return end();
      }
      at = now;
      still = 0;
    } else still++;
    if (still < 2 && ++tries < 90) return requestAnimationFrame(look);
    var h = hideInfo(s);
    tested(s);
    hidTested.add(s);
    if (!h.tested) {
      log("SKIPPED", "Hidden focus", [ref(s), " " + h.why + ". Not tested."]);
      return end();
    }
    if (was && h.under >= h.tested) {
      log("INFO", "Hidden focus", [ref(s), " is already listed as hidden."]);
      return end();
    }
    if (was) {
      covered.splice(covered.indexOf(s), 1);
      var pe = probHid.get(s);
      if (pe) pe.fixed = true;
      probHid.delete(s);
      renderJumps();
      end();
      return log("OK", "Hidden focus", h.under ? [ref(s), " is not hidden anymore: it is partly covered by " + pinText(h.pin) + ", " + (h.tested - h.under) + " of " + h.tested + " points clear. That passes AA 2.4.11; AAA 2.4.12 needs it fully visible."] : [ref(s), " is not hidden anymore, " + h.tested + " of " + h.tested + " points clear."]);
    }
    if (h.under < h.tested) {
      end();
      return log("OK", "Hidden focus", h.under ? [ref(s), " is partly covered by " + pinText(h.pin) + ", " + (h.tested - h.under) + " of " + h.tested + " points clear. That passes AA 2.4.11; AAA 2.4.12 needs it fully visible."] : [ref(s), " is in view, " + h.tested + " of " + h.tested + " points clear."]);
    }
    covered.push(s);
    renderJumps();
    announce("Hidden focus: stop " + (stops.indexOf(s) + 1) + ", " + label(s) + ", is covered.");
    var pr = h.pin.getBoundingClientRect(), up = pr.top + pr.height / 2 < innerHeight / 2, ph = Math.round(pr.height);
    log("PROBLEM", "Hidden focus", [ref(s), ": all " + h.tested + " points are under " + pinText(h.pin) + "."], aiOf(W_HIDE, "When the element gets keyboard focus, at least part of it stays visible, not covered by " + desc(h.pin) + ".", "Add html { scroll-padding-" + (up ? "top" : "bottom") + ": " + (ph + 8) + "px; } so the browser scrolls focused elements clear of the " + (up ? "top" : "bottom") + " bar (" + ph + " px tall, plus 8 px of room).", [["Element", s], ["Covered by", h.pin]], ["Measured: " + desc(h.pin) + " is " + getComputedStyle(h.pin).position + ", " + ph + " px tall, at the " + (up ? "top" : "bottom") + " of a " + innerHeight + " px tall window."]));
    probHid.set(s, logs[logs.length - 1]);
    end();
  }
  requestAnimationFrame(look);
}
var popInfo = null, lostPops = [], openPop = null, opener = null, lastOut = null, tapIn = null, tapT = 0, lastKey = "", keyT = 0, keyOn = null;
function deep() {
  var a = document.activeElement;
  while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
  return a;
}
function gone(p) { return !p.isConnected || !shown(p) || (p.matches("dialog") && !p.open); }
function closedBy(p) {
  var now = Date.now();
  if (tapIn && now - tapT < 600 && within(p, tapIn)) {
    var b = tapIn.closest ? tapIn.closest("button,a,[role=button]") : null;
    return b ? " with \"" + label(b) + "\"" : " with a click";
  }
  if (keyT && now - keyT < 600) {
    if (lastKey === "Escape") return " with Escape";
    if (lastKey === "Enter" || lastKey === " ") return " with " + (lastKey === " " ? "Space" : "Enter") + (keyOn && keyOn.nodeType === 1 && keyOn !== document.body && keyOn !== document.documentElement ? " on \"" + label(keyOn) + "\"" : "");
  }
  return "";
}
function popClosed() {
  var p = openPop, from = opener, pn = popName(p), by = closedBy(p), pi = popInfo;
  openPop = null;
  if (!from) return log("SKIPPED", "Lost focus", [pn, " closed" + by + ". It opened on its own, so there is no button to go back to."]);
  if (!from.isConnected || !shown(from)) return log("SKIPPED", "Lost focus", [pn, " closed" + by + ". The button that opened it is gone or hidden."]);
  if (lostPops.some(function (l) { return l[0] === from; })) return log("SKIPPED", "Lost focus", [pn, " closed" + by + ". Already listed."]);
  if (tapIn && Date.now() - tapT < 600 && !within(p, tapIn)) return log("SKIPPED", "Lost focus", [pn, " closed by a click outside it. Not judged."]);
  var frames = 0;
  function look() {
    if (closed) return;
    var a = deep();
    if (a && a !== document.body && a !== document.documentElement && !within(p, a) && shown(a)) {
      if (a === from) return log("OK", "Lost focus", [pn, " closed" + by + ". Focus went back to ", ref(from), "."]);
      return log("OK", "Lost focus", [pn, " closed" + by + ". Focus went to ", ref(a), ", not to the button that opened it, ", ref(from), "."]);
    }
    if (++frames < 30) return requestAnimationFrame(look);
    if (lostPops.some(function (l) { return l[0] === from; })) return;
    lostPops.push([from, p]);
    renderJumps();
    announce("Lost focus: " + pn.l + " closed and focus fell to the page body.");
    log("PROBLEM", "Lost focus", [pn, " closed" + by + ". Focus fell to the page body instead of going back to ", ref(from), "."], aiOf(W_ORDER, "When the popup closes, focus goes back to the element that opened it, so a keyboard user carries on from there.", "Before the popup opens, store document.activeElement. After it closes, call .focus() on that element. A <dialog> opened with showModal() and closed with close() does this by itself, so if this one is a <dialog>, look for code that calls blur() or .focus() on something else after it closes.", [["Popup", p, pi], ["Opened by", from]]));
  }
  requestAnimationFrame(look);
}
function track(a) {
  if (openPop && gone(openPop)) popClosed();
  if (!a || a === document.body || a === document.documentElement || a === host || a.getRootNode() === root) return;
  var p = popupOf(a);
  if (!p) {
    lastOut = a;
    openPop = null;
  } else if (!openPop) {
    openPop = p;
    opener = lastOut;
    popInfo = { sel: sel(p), html: snip(p) };
  }
}
function tap(e) {
  tapIn = e.composedPath ? e.composedPath()[0] : e.target;
  tapT = Date.now();
}
function stopGo(e) {
  e.scrollIntoView({ block: "center", behavior: "smooth" });
  current = stops.indexOf(e);
  queue();
}
function stopName(e) {
  var i = stops.indexOf(e);
  return (i >= 0 ? i + 1 : "?") + ": " + label(e);
}
function byStop(list) { return list.slice().sort(function (a, b) { return stops.indexOf(a) - stops.indexOf(b); }); }
function renderJumps() {
  while (jumpBox.firstChild) jumpBox.removeChild(jumpBox.firstChild);
  if (macNote) {
    var mn = document.createElement("p");
    mn.className = "mn";
    mn.textContent = MAC_NOTE;
    jumpBox.appendChild(mn);
  }
  if (popMissed) {
    count(1, " popup blocks the page, but Tab goes somewhere else first", true, false, jumpBox);
    chipUl(jumpBox, [popMissed], function () { return "Show the popup"; }, function (m) { m.scrollIntoView({ block: "center", behavior: "smooth" }); });
  }
  if (covered.length) {
    count(covered.length, covered.length === 1 ? " stop is hidden when Tab reaches it" : " stops are hidden when Tab reaches them", true, false, jumpBox);
    chipUl(jumpBox, byStop(covered), stopName, stopGo);
  }
  if (trapped.length) {
    count(trapped.length, trapped.length === 1 ? " stop where Tab gets stuck" : " stops where Tab gets stuck", true, false, jumpBox);
    chipUl(jumpBox, byStop(trapped), stopName, stopGo);
  }
  if (lostPops.length) {
    count(lostPops.length, lostPops.length === 1 ? " popup loses focus when it closes" : " popups lose focus when they close", true, false, jumpBox);
    chipUl(jumpBox, lostPops, function (l) {
      var i = stops.indexOf(l[0]);
      return (i >= 0 ? i + 1 : label(l[0])) + " \u2192 Start";
    }, function (l) { stopGo(l[0]); });
  }
  if (jumps.length) {
    count(jumps.length, jumps.length === 1 ? " time Tab jumped out of order" : " times Tab jumped out of order", true, false, jumpBox);
    chipUl(jumpBox, jumps, function (j) {
      var from = j[0] ? stops.indexOf(j[0]) + 1 || label(j[0]) : "Start", to = stops.indexOf(j[1]) + 1;
      return from + " \u2192 " + (to || "?");
    }, function (j) { stopGo(j[1]); });
  }
  if (skip) skipPanel();
}
var legend = document.createElement("div");
legend.className = "so";
legend.hidden = true;
legend.appendChild(line("k", null, "The order Tab visits", "d"));
legend.appendChild(line("k", null, "Hidden until Tab reaches it", "h"));
legend.appendChild(line("k", null, "Tab can't reach or see it", "r"));
var tray = document.createElement("div");
tray.className = "tr";
panel.appendChild(tray);
var gear = document.createElement("button");
gear.className = "sg";
gear.type = "button";
gear.setAttribute("aria-expanded", "false");
var gearIcon = icon(gear, 16, "M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4", 1.6);
el("circle", { cx: 8, cy: 8, r: 2.2 }, gearIcon);
gear.appendChild(document.createTextNode("Settings"));
gear.appendChild(document.createElement("i"));
tray.appendChild(gear);
var settings = document.createElement("div");
settings.className = "so";
settings.hidden = true;
tray.appendChild(settings);
gear.addEventListener("click", function () {
  settings.hidden = !settings.hidden;
  gear.setAttribute("aria-expanded", settings.hidden ? "false" : "true");
});
var skipBox = document.createElement("label");
skipBox.className = "k s";
var skip = document.createElement("input");
skip.type = "checkbox";
skip.checked = true;
skipBox.appendChild(skip);
skipBox.appendChild(document.createTextNode("Leave this panel out of Tab"));
settings.appendChild(skipBox);
var tightBox = document.createElement("label");
tightBox.className = "k s";
var tight = document.createElement("input");
tight.type = "checkbox";
tight.checked = true;
tightBox.appendChild(tight);
tightBox.appendChild(document.createTextNode("Compact view"));
settings.appendChild(tightBox);
tight.addEventListener("change", function () { panel.classList.toggle("rm", !tight.checked); });
var chunkBox = document.createElement("label");
chunkBox.className = "k s";
var chunk = document.createElement("input");
chunk.type = "checkbox";
chunk.checked = true;
chunkBox.appendChild(chunk);
chunkBox.appendChild(document.createTextNode("Show " + PAGE + " stops at a time"));
group.appendChild(chunkBox);
var shortBox = document.createElement("label");
shortBox.className = "k s";
var stub = document.createElement("input");
stub.type = "checkbox";
stub.checked = true;
shortBox.appendChild(stub);
shortBox.appendChild(document.createTextNode("Long lines"));
settings.insertBefore(shortBox, skipBox);
var lineBox = document.createElement("label");
lineBox.className = "k s";
var lines = document.createElement("input");
lines.type = "checkbox";
lines.checked = true;
lineBox.appendChild(lines);
lineBox.appendChild(document.createTextNode("Show lines"));
settings.insertBefore(lineBox, shortBox);
lines.addEventListener("change", function () {
  stub.disabled = !lines.checked;
  shortBox.classList.toggle("off", !lines.checked);
  queue();
});
stub.addEventListener("change", function () { queue(); });
var spotBox = document.createElement("label");
spotBox.className = "k s";
var light = document.createElement("input");
light.type = "checkbox";
spotBox.appendChild(light);
spotBox.appendChild(document.createTextNode("Spotlight"));
settings.insertBefore(spotBox, settings.firstChild);
light.addEventListener("change", function () { queue(); });
chunk.addEventListener("change", function () { queue(); });
function paged() { return chunk.checked && stops.length > PAGE; }
function outT() { return skip.checked && !panelIn ? -1 : 0; }
function skipPanel() {
  panel.tabIndex = outT();
  panel.querySelectorAll("button,a,input").forEach(function (e) { e.tabIndex = e.className === "lc" ? (panelIn ? 0 : -1) : outT(); });
}
skip.addEventListener("change", function () {
  skipPanel();
  svg.classList.toggle("in", !skip.checked);
  svgPg.classList.toggle("in", !skip.checked);
  dot.classList.toggle("in", !skip.checked);
  dotPg.classList.toggle("in", !skip.checked);
  rescan();
});
var a = document.createElement("a");
a.className = "a";
a.href = "https://matjazkorosec.com/tools/tab-trail";
a.target = "_blank";
a.rel = "noopener";
a.textContent = "matjazkorosec.com/tools/tab-trail";
var how = document.createElement("p");
how.className = "hw";
var MAC = /Mac/.test(navigator.platform || navigator.userAgent);
var KEYS = "Ctrl+Shift+F";
var ver = document.createElement("span");
ver.className = "vr";
ver.textContent = "v" + VERSION;
how.appendChild(ver);
how.appendChild(document.createTextNode("How to use & latest version: "));
how.appendChild(a);
var keysBtn = document.createElement("button");
keysBtn.className = "sg";
keysBtn.type = "button";
keysBtn.setAttribute("aria-expanded", "false");
icon(keysBtn, 16, "M1.5 4.5h13v7h-13zM4 7h1M7.5 7h1M11 7h1M5 9.5h6", 1.6);
keysBtn.appendChild(document.createTextNode("Shortcuts"));
keysBtn.appendChild(document.createElement("i"));
tray.insertBefore(keysBtn, gear);
var keysBox = document.createElement("div");
keysBox.className = "so";
keysBox.hidden = true;
tray.insertBefore(keysBox, gear);
[[KEYS + ":", " into this panel"], ["Escape:", " back to the page"], ["Tab, Shift+Tab:", " along the trail"], ["Space or Escape:", " pause Play"]].forEach(function (k) {
  keysBox.appendChild(line("k", k[0], k[1]));
});
keysBtn.addEventListener("click", function () {
  keysBox.hidden = !keysBox.hidden;
  keysBtn.setAttribute("aria-expanded", keysBox.hidden ? "false" : "true");
});
var legendBtn = document.createElement("button");
legendBtn.className = "sg";
legendBtn.type = "button";
legendBtn.setAttribute("aria-expanded", "false");
icon(legendBtn, 16, "M3 4h1M6.5 4H13M3 8h1M6.5 8H13M3 12h1M6.5 12H13", 1.6);
legendBtn.appendChild(document.createTextNode("Legend"));
legendBtn.appendChild(document.createElement("i"));
tray.insertBefore(legendBtn, keysBtn);
tray.insertBefore(legend, keysBtn);
legendBtn.addEventListener("click", function () {
  legend.hidden = !legend.hidden;
  legendBtn.setAttribute("aria-expanded", legend.hidden ? "false" : "true");
});
tray.appendChild(how);
var logs = [], logFilter = "all", logOpen = false, LOG_MAX = 500, showWcag = false, wcagBoxes = [];
function wcagBox(parent, doc) {
  var lb = doc.createElement("label");
  lb.className = "lw";
  var cb = doc.createElement("input");
  cb.type = "checkbox";
  cb.checked = showWcag;
  cb.addEventListener("change", function () {
    showWcag = cb.checked;
    wcagSync();
  });
  lb.appendChild(cb);
  lb.appendChild(doc.createTextNode("Show WCAG"));
  parent.appendChild(lb);
  wcagBoxes.push(cb);
  return cb;
}
function wcagSync() {
  wcagBoxes.forEach(function (b) { b.checked = showWcag; });
  logGroup.classList.toggle("nw", !showWcag);
  if (tabOpen()) logTab.document.body.classList.toggle("nw", !showWcag);
}
var lastStops = -1, lastMissed = -1, lastForced = -1, probMiss = new Map(), probHov = new Map(), probForce = new Map(), seenForce = new WeakSet(), seenOk = new WeakSet(), seenCss = new Set();
var RES = { OK: "ok", PROBLEM: "bad", SKIPPED: "skip", INFO: "info" };
var FILT = [["all", "All"], ["bad", "Problems"], ["ok", "OK"], ["skip", "Skipped"]];
var tabChecked = null, filterSets = [], logTab = null, tabList = null, tabSum = null, tabSet = null, tabNote = null, tabPoll = 0;
function pl(n, one, many) { return n + " " + (n === 1 ? one : many); }
function desc(e) {
  var t = e.tagName.toLowerCase();
  if (e.id) return t + "#" + scrub(e.id);
  var c = typeof e.className === "string" ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
  return c.length ? t + "." + scrub(c.join(".")) : t;
}
function ref(e) { return { el: e, n: stops.indexOf(e) + 1, l: label(e), d: desc(e) }; }
function popName(p) {
  var n = p.getAttribute("aria-label") || "", by = p.getAttribute("aria-labelledby");
  if (!n && by) {
    var t = document.getElementById(by.split(/\s+/)[0]);
    if (t) n = t.textContent || "";
  }
  if (!n) {
    var h = p.querySelector("h1,h2,h3,h4,legend");
    if (h) n = h.textContent || "";
  }
  n = scrub(n).trim().replace(/\s+/g, " ");
  if (n.length > 28) n = n.slice(0, 27) + "...";
  return { el: p, n: 0, l: n || label(p), d: desc(p) };
}
function partText(x) { return typeof x === "string" ? x : x.n ? x.n + " \"" + x.l + "\"" : "\"" + x.l + "\" " + x.d; }
function looksWhy(m) {
  var why = [], role = m.getAttribute("role") || "";
  if (m.tagName === "A" && !m.hasAttribute("href")) why.push("a link with no address");
  if (m.hasAttribute("onclick")) why.push("a click handler in the HTML");
  if (ROLES.test(role)) why.push("role=\"" + role + "\"");
  if (getComputedStyle(m).cursor === "pointer") why.push("a pointer cursor");
  return why.length ? "has " + why.join(", ") : "looks clickable";
}
function addr() { return location.protocol + "//" + location.host + cleanUrl(location.pathname); }
function two(n) { return (n < 10 ? "0" : "") + n; }
function clock(t) { return two(t.getHours()) + ":" + two(t.getMinutes()) + ":" + two(t.getSeconds()); }
function browser() {
  var u = navigator.userAgent, m;
  if ((m = u.match(/Edg\/(\d+)/))) return "Edge " + m[1];
  if ((m = u.match(/Firefox\/(\d+)/))) return "Firefox " + m[1];
  if ((m = u.match(/Chrome\/(\d+)/))) return "Chrome " + m[1];
  if ((m = u.match(/Version\/(\d+)[^ ]* (Mobile\/\S+ )?Safari/))) return "Safari " + m[1];
  return u;
}
var CHECKS = ["Missed spots", "Hover menus", "Forced order", "Out of order", "Keyboard trap", "Hidden focus", "Lost focus"];
var WCAG = { "Missed spots": "2.1.1 A", "Hover menus": "2.1.1 A", "Out of order": "2.4.3 A", "Forced order": "2.4.3 A", "Keyboard trap": "2.1.2 A", "Lost focus": "2.4.3 A", "Hidden focus": "2.4.11 AA" };
function showUrl(f) { return "https://matjazkorosec.com/tools/tab-trail#show-" + f.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function ranChecks() {
  var out = [];
  logs.forEach(function (e) { if (e.k !== "INFO" && CHECKS.indexOf(e.f) >= 0 && out.indexOf(e.f) < 0) out.push(e.f); });
  return out;
}
var checkedKey = {};
function checkedLine(p, doc) {
  var ran = ranChecks(), bad = {};
  logs.forEach(function (e) { if (e.k === "PROBLEM" && !e.fixed) bad[e.f] = 1; });
  var k = ran.map(function (f) { return f + (bad[f] ? "!" : ""); }).join("|");
  p.hidden = !ran.length;
  if (checkedKey[p.className + (doc === document ? "1" : "2")] === k && p.firstChild) return;
  checkedKey[p.className + (doc === document ? "1" : "2")] = k;
  while (p.firstChild) p.removeChild(p.firstChild);
  p.appendChild(doc.createTextNode("Checked: "));
  ran.forEach(function (f, i) {
    if (i) p.appendChild(doc.createTextNode(", "));
    var a = doc.createElement("a");
    a.className = bad[f] ? "lq bad" : "lq";
    a.href = showUrl(f);
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = f;
    a.title = "What " + f + " checks";
    if (doc === document) a.tabIndex = outT();
    p.appendChild(a);
  });
}
function res(e) { return e.fixed ? "fixed" : RES[e.k]; }
function shows(e) { return logFilter === "all" || res(e) === logFilter; }
function logCounts() {
  var c = { all: logs.length, bad: 0, ok: 0, skip: 0, info: 0, fixed: 0 };
  logs.forEach(function (e) { c[res(e)]++; });
  return c;
}
function tabOpen() { return !!(logTab && !logTab.closed); }
function logView() { return tabOpen() ? tabList : logOpen ? logList : null; }
function scroller(v) { return v === logList ? panel : v.ownerDocument.scrollingElement || v.ownerDocument.documentElement; }
function toTop(v) {
  if (v !== logList) return void (scroller(v).scrollTop = 0);
  var d = v.getBoundingClientRect().top - panel.getBoundingClientRect().top;
  if (d < 0) panel.scrollTop += d - 12;
}
function wcagOf(e) { return e.w || WCAG[e.f]; }
function log(k, f, parts, ai, w) {
  var e = { t: new Date(), k: k, f: f, p: parts, li: null, ai: ai || null, w: w || null };
  logs.push(e);
  if (k === "PROBLEM" && e.ai) probLog.push(e);
  if ((k === "OK" || k === "PROBLEM") && (f === "Out of order" || f === "Keyboard trap") && pressed) judgedDir[pressed > 0 ? 1 : -1] = 1;
  if (logs.length > LOG_MAX) {
    var old = logs.shift();
    if (old.li && old.li.parentNode) old.li.parentNode.removeChild(old.li);
  }
  if (!logList) return;
  logSummary();
  var v = logView();
  if (!v || !shows(e)) return;
  var sc = scroller(v), top = v === logList ? v.getBoundingClientRect().top >= sc.getBoundingClientRect().top : sc.scrollTop < 8;
  e.li = logLi(e, v.ownerDocument);
  v.insertBefore(e.li, v.firstChild);
  if (top) { if (v !== logList) sc.scrollTop = 0; }
  else sc.scrollTop += e.li.getBoundingClientRect().height;
}
function review() {
  if (lastStops < 0) log("INFO", "Scan", ["Found " + pl(stops.length, "stop", "stops") + ". Read " + pl(cssRules, "CSS rule", "CSS rules") + " from " + pl(cssSheets, "style sheet", "style sheets") + "."]);
  else if (stops.length !== lastStops) log("INFO", "Scan", ["Page changed: " + pl(stops.length, "stop", "stops") + " now, " + lastStops + " before."]);
  lastStops = stops.length;
  cssBlocked.forEach(function (h) {
    if (seenCss.has(h)) return;
    seenCss.add(h);
    log("SKIPPED", "Hover menus", ["Can't read " + cleanUrl(h) + ", it comes from another site."]);
  });
  var mSet = new Set(missed), hSet = new Set(hovers), fSet = new Set(forcedBad), fresh = {}, nNew = 0;
  function add(f) {
    fresh[f] = 1;
    nNew++;
  }
  probMiss.forEach(function (e, m) {
    if (mSet.has(m)) return;
    e.fixed = true;
    probMiss.delete(m);
    log("OK", "Missed spots", [ref(m), stopSet.has(m) ? " is a Tab stop now." : m.isConnected ? " is no longer flagged." : " is gone from the page."]);
  });
  probHov.forEach(function (e, h) {
    if (hSet.has(h)) return;
    e.fixed = true;
    probHov.delete(h);
    if (tabOpens.has(h)) seenOk.add(h);
    log("OK", "Hover menus", [ref(h), !h.isConnected ? " is gone from the page." : tabOpens.has(h) ? " opens when Tab reaches it." : " no longer opens only on mouse hover."]);
  });
  missed.forEach(function (m) {
    if (probMiss.has(m)) return;
    var item = m.closest(GROUP) && ITEM.test(m.getAttribute("role") || "");
    log("PROBLEM", "Missed spots", [ref(m), " " + looksWhy(m) + ", but Tab never reaches it."], aiOf(W_KEY, "Every element that reacts to a click can be reached with the Tab key and used with Enter or Space.", item ? "It is a role=\"" + m.getAttribute("role") + "\" item in a group the arrow keys move through, and no item in the group is a Tab stop. Give 1 item tabindex=\"0\" (the selected one) and move between the items with the arrow keys." : m.tagName === "A" && !m.hasAttribute("href") ? "Give the link an href, or make it a <button type=\"button\"> if it runs script." : "Use <button type=\"button\"> for an action or <a href> for a link instead of the " + m.tagName.toLowerCase() + ". If the tag can't change, add tabindex=\"0\" and role=\"button\", and handle Enter and Space in a keydown listener." + (looksWhy(m) === "has a pointer cursor" ? " Only the pointer cursor makes it look clickable: if it is not meant to be clickable, remove cursor: pointer from it instead." : ""), [["Element", m]], null, true));
    probMiss.set(m, logs[logs.length - 1]);
    add("Missed spots");
  });
  if (!missed.length && lastMissed !== 0) log("OK", "Missed spots", [lastMissed > 0 ? "No clickable things Tab skips now." : "No clickable things Tab skips."]);
  lastMissed = missed.length;
  hoverOk.forEach(function (o) {
    if (seenOk.has(o[0])) return;
    seenOk.add(o[0]);
    log("OK", "Hover menus", [ref(o[0]), o[1] === "focus" ? " opens on mouse hover and on keyboard focus." : o[1] === "tab" ? " opens when Tab reaches it." : " opens on mouse hover and has a toggle button (aria-expanded), so the keyboard can open it."]);
  });
  hovers.forEach(function (h) {
    if (probHov.has(h)) return;
    var hr = hovRule.get(h) || [":hover", ""];
    hr = [scrub(hr[0]), hr[1]];
    var tw = (hr[0].match(/\.(?:[\w-]|\\.)+/g) || []).map(function (c) { return c.slice(1).replace(/\\(.)/g, "$1"); }).filter(function (c) { return /(^|:)(group-|peer-)?hover:/.test(c); })[0];
    var twFix = tw ? "This rule comes from the Tailwind class " + tw + ". Add " + tw.replace(/(^|:)group-hover:/, "$1group-focus-within:").replace(/(^|:)peer-hover:/, "$1peer-focus:").replace(/(^|:)hover:/, "$1focus-within:") + " next to it in the same class list, so it also opens on keyboard focus. Or open the menu with a <button aria-expanded> that toggles it." : "";
    var seen = hovSeen.has(h);
    var dead = !seen && !h.matches(FOCUSABLE) && ![].some.call(h.querySelectorAll(FOCUSABLE), function (x) { return tabbable(x); });
    var skipped = [].some.call(h.querySelectorAll(FOCUSABLE), function (x) { return x.tabIndex < 0; });
    var deadFix = dead ? " Nothing inside it can take keyboard focus now, so a focus rule alone will never open it: make the part you hover a <button type=\"button\" aria-expanded=\"false\"> that toggles the menu." + (skipped ? " The links or buttons inside have tabindex=\"-1\", so Tab skips them even when the menu is open: remove it." : "") : "";
    log("PROBLEM", "Hover menus", [ref(h), " opens only on mouse hover (" + hr[0] + ")." + (seen ? " Tab reaches its links, but they stay invisible while they have focus." : " No focus rule, no toggle button.")], aiOf(seen ? W_VIS : W_KEY, seen ? "The menu also opens while a link or button inside it has keyboard focus, so keyboard users can see where they are." : "The menu also opens when a link or button inside it gets keyboard focus, so keyboard users can reach its links.", (twFix || "Next to the rule " + hr[0] + " add " + hr[0].replace(/:hover/g, ":focus-within") + " with the same declarations, or open the menu with a <button aria-expanded> that toggles it.") + deadFix, [["Element", h, null, true]], ["CSS rule: " + hr[0], "Style sheet: " + (hr[1] ? cleanUrl(hr[1]) : "unknown")], true), seen ? "2.4.7 AA" : null);
    probHov.set(h, logs[logs.length - 1]);
    add("Hover menus");
  });
  probForce.forEach(function (e, f) {
    if (fSet.has(f)) return;
    e.fixed = true;
    probForce.delete(f);
    log("OK", "Forced order", [ref(f), !f.isConnected ? " is gone from the page." : forced.indexOf(f) >= 0 ? " is in page order now." : f.tabIndex > 0 ? " is no longer a Tab stop." : " has no tabindex above 0 now."]);
  });
  forced.forEach(function (f) {
    if (probForce.has(f) || (!fSet.has(f) && seenForce.has(f))) return;
    var ti = f.getAttribute("tabindex"), at = stops.indexOf(f) + 1, page = domAt.get(f) + 1;
    if (!fSet.has(f)) {
      seenForce.add(f);
      return log("INFO", "Forced order", [ref(f), " has tabindex=\"" + ti + "\", but it is already in page order, so Tab order stays the same. tabindex above 0 pulls it ahead of the page. It fails WCAG 2.4.3 when that order makes no sense (F44)."]);
    }
    seenForce.delete(f);
    log("PROBLEM", "Forced order", [ref(f), " has tabindex=\"" + ti + "\", which pulls it ahead of the page: Tab visits it as stop " + at + ", its place in the page is stop " + page + ". It fails WCAG 2.4.3 when that order makes no sense (F44)."], aiOf(W_FORCE, "Tab follows the order of the page. No element has tabindex above 0, so none is pulled ahead of the rest.", "Remove the tabindex, or set it to 0, and move the element in the HTML where it should come in Tab order.", [["Element", f]], ["Measured: tabindex=\"" + ti + "\", Tab visits it as stop " + at + ", its place in the page is stop " + page + ". " + pl(forced.length, "stop", "stops") + " on the page " + (forced.length === 1 ? "has" : "have") + " tabindex above 0."], true));
    probForce.set(f, logs[logs.length - 1]);
    add("Forced order");
  });
  if (!forcedBad.length && lastForced !== 0) log("OK", "Forced order", [forced.length ? "No stop with tabindex above 0 is out of page order" + (lastForced > 0 ? " now." : ".") : lastForced > 0 ? "No stops with tabindex above 0 now." : "No stops with tabindex above 0."]);
  lastForced = forcedBad.length;
  if (nNew) announce(pl(nNew, "new problem", "new problems") + ": " + Object.keys(fresh).join(", ") + ".");
}
function goTo(e) {
  if (!e.isConnected) return;
  e.scrollIntoView({ block: "center", behavior: "smooth" });
  if (stops.indexOf(e) < 0) return queue();
  endPress();
  e.focus({ preventScroll: true, focusVisible: true });
  focus();
}
function logLi(e, doc) {
  var li = doc.createElement("li");
  li.className = "lx " + RES[e.k];
  function sp(cls, text) {
    var x = doc.createElement("span");
    x.className = cls;
    x.textContent = text;
    li.appendChild(x);
    return x;
  }
  sp("tm", clock(e.t));
  sp("st", e.k);
  var bd = sp("bd", "");
  var ft = doc.createElement(CHECKS.indexOf(e.f) >= 0 ? "a" : "b");
  ft.className = "ft";
  ft.textContent = e.f;
  if (ft.tagName === "A") {
    ft.className = "ft lq";
    ft.href = showUrl(e.f);
    ft.target = "_blank";
    ft.rel = "noopener";
    ft.title = "What " + e.f + " checks";
    if (doc === document) ft.tabIndex = outT();
  }
  bd.appendChild(ft);
  bd.appendChild(doc.createTextNode(" "));
  if (wcagOf(e)) {
    var wc = doc.createElement("span");
    wc.className = "wc";
    wc.textContent = "WCAG " + wcagOf(e);
    bd.appendChild(wc);
    bd.appendChild(doc.createTextNode(" "));
  }
  e.p.forEach(function (x) {
    if (typeof x === "string") return bd.appendChild(doc.createTextNode(x));
    if (!x.n) return bd.appendChild(doc.createTextNode(partText(x)));
    var c = doc.createElement("button");
    c.type = "button";
    c.className = "lc";
    c.textContent = String(x.n);
    c.setAttribute("aria-label", "Go to stop " + x.n);
    if (doc === document) c.tabIndex = panelIn ? 0 : -1;
    c.addEventListener("click", function () {
      if (doc !== document && tabOpen() && window.name) logTab.open("", window.name);
      goTo(x.el);
    });
    bd.appendChild(c);
    bd.appendChild(doc.createTextNode(" \"" + x.l + "\""));
  });
  return li;
}
function logText() {
  var c = logCounts();
  var out = ["Tab trail " + VERSION + " log", addr(), stamp(), browser() + ", window " + innerWidth + " x " + innerHeight, pl(stops.length, "stop", "stops") + ", " + pl(c.bad, "problem", "problems") + ", " + c.ok + " OK, " + c.skip + " skipped", ""];
  logs.slice().reverse().forEach(function (e) {
    out.push(clock(e.t) + " " + (e.k + "        ").slice(0, 8) + " " + e.f + (showWcag && wcagOf(e) ? " (WCAG " + wcagOf(e) + ")" : ""));
    out.push("  " + e.p.map(partText).join(""));
  });
  return out.join("\n");
}
var W_FORCE = "2.4.3 Focus Order (Level A). tabindex above 0 pulls it ahead of the page. It fails WCAG 2.4.3 when that order makes no sense (F44).", W_TRAP = "2.1.2 No Keyboard Trap (Level A)", W_KEY = "2.1.1 Keyboard (Level A)", W_VIS = "2.4.7 Focus Visible (Level AA)", W_ORDER = "2.4.3 Focus Order (Level A)", W_HIDE = "2.4.11 Focus Not Obscured (Minimum) (Level AA)";
function cssId(t) { return /^[A-Za-z][\w-]*$/.test(t); }
function sel(e) {
  if (!e || e.nodeType !== 1) return "";
  var rt = e.getRootNode(), live = e.isConnected, path = [];
  for (var n = e; n && n.nodeType === 1; n = n.parentElement) {
    var t = n.tagName.toLowerCase();
    if (n.id && cssId(n.id) && !secretish(n.id) && live && rt.querySelectorAll("#" + n.id).length === 1) {
      path.unshift("#" + n.id);
      break;
    }
    if (t === "html" || t === "body") {
      path.unshift(t);
      break;
    }
    var c = typeof n.className === "string" ? n.className.trim().split(/\s+/).filter(function (x) { return cssId(x) && !secretish(x); }).slice(0, 2) : [];
    var part = t + (c.length ? "." + c.join(".") : ""), par = n.parentElement;
    if (par) {
      var same = Array.prototype.filter.call(par.children, function (x) { return x.tagName === n.tagName; });
      if (same.length > 1) part += ":nth-of-type(" + (same.indexOf(n) + 1) + ")";
    }
    path.unshift(part);
    if (live) {
      try { if (rt.querySelectorAll(path.join(" > ")).length === 1) break; } catch (x) {}
    }
  }
  var out = path.join(" > ");
  if (rt && rt.host) out = sel(rt.host) + " (inside its shadow root) " + out;
  return out;
}
var KEEP = /^(id|class|role|type|name|href|src|tabindex|disabled|hidden|contenteditable|aria-[\w-]+)$/, VOID = /^(area|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/;
function attrText(n, v) {
  if (n === "href" || n === "src") return cleanUrl(v);
  if (n === "id" || n === "class") return scrub(v);
  if (n === "role" || n === "type") return v;
  v = scrub(v);
  return v.length > 60 ? v.slice(0, 60) + "..." : v;
}
function snip(e, kids) {
  var tag = e.tagName.toLowerCase(), open = "<" + tag;
  [].forEach.call(e.attributes, function (a) {
    if (KEEP.test(a.name)) open += " " + a.name + "=\"" + attrText(a.name, a.value).replace(/"/g, "&quot;") + "\"";
  });
  open += ">";
  if (VOID.test(tag)) return open;
  if (kids && e.children.length) return open + [].slice.call(e.children, 0, 8).map(function (c) { return c.children.length ? snip(c).replace(/>[^<]*<\/[\w-]+>$/, ">...</" + c.tagName.toLowerCase() + ">") : snip(c); }).join("") + (e.children.length > 8 ? "..." : "") + "</" + tag + ">";
  var text = scrub((e.textContent || "").trim().replace(/\s+/g, " "));
  return open + (text.length > 40 ? text.slice(0, 40) + "..." : text) + "</" + tag + ">";
}
var FRAME = /^(__.*|SegmentViewNode|LayoutRouter.*|InnerLayoutRouter|OuterLayoutRouter|RenderFromTemplateContext|ScrollAndFocusHandler|InnerScrollAndFocusHandler|.*Boundary.*|HTTPAccessFallback.*|Router|AppRouter|HotReload|ReactDevOverlay|DevRootHTTPAccessFallbackBoundary|ServerRoot|Root|AppContainer|Suspense|Fragment|StrictMode|Head|Html|Body|Script|ClientPageRoot|ClientSegmentRoot|.*Provider|.*Context|.*Consumer|Link|LinkComponent|Image|ForwardRef|Memo|Anonymous|_c\d*)$/;
function compOf(e) {
  var keys = Object.keys(e), k = keys.filter(function (x) { return x.indexOf("__reactFiber$") === 0 || x.indexOf("__reactInternalInstance$") === 0; })[0];
  if (k) {
    var names = [], src = "", any = false;
    for (var f = e[k]; f && names.length < 3; f = f.return) {
      var t = f.type;
      if (!src && f._debugSource && f._debugSource.fileName) src = f._debugSource.fileName + ":" + f._debugSource.lineNumber;
      if (!t || typeof t === "string" || typeof t === "symbol") continue;
      var n = t.displayName || t.name || (t.render && (t.render.displayName || t.render.name)) || (t.type && (t.type.displayName || t.type.name));
      if (!n) continue;
      any = true;
      if (FRAME.test(n) || names.indexOf(n) >= 0) continue;
      names.push(n);
    }
    if (!names.length) return any ? "React, rendered by a server component or by the framework itself, so its component name is not in the browser; search the code for the HTML or its classes" : "";
    if (names.every(function (n) { return n.length <= 2; })) return "React (component names are minified in this production build; a development build shows them)";
    return "React " + names[0] + (names.length > 1 ? ", inside " + names.slice(1).join(", inside ") : "") + (src ? ", source " + src : "");
  }
  if (e.__vueParentComponent) {
    var vn = [];
    for (var c = e.__vueParentComponent; c && vn.length < 3; c = c.parent) {
      var nm = c.type && (c.type.name || c.type.__name);
      if (nm && vn.indexOf(nm) < 0) vn.push(nm);
    }
    if (vn.length) return "Vue " + vn[0] + (vn.length > 1 ? ", inside " + vn.slice(1).join(", inside ") : "");
  }
  if (e.__vue__ && e.__vue__.$options && e.__vue__.$options.name) return "Vue " + e.__vue__.$options.name;
  try {
    var ng = window.ng;
    if (ng && ng.getOwningComponent) {
      var oc = ng.getOwningComponent(e);
      if (oc && oc.constructor) return "Angular " + oc.constructor.name;
    }
  } catch (x) {}
  return "";
}
function whereOf(el) {
  if (!el || !el.isConnected) return "";
  var out = [], up = el.parentElement;
  while (up && up !== document.body && up !== document.documentElement && !up.id) up = up.parentElement;
  if (up && up.id && up !== document.body) out.push("inside #" + scrub(up.id));
  var hs = document.querySelectorAll("h1,h2,h3,h4,h5,h6,[role=heading]"), last = null;
  for (var i = 0; i < hs.length; i++) {
    if (hs[i] === el || (host && host.contains(hs[i]))) continue;
    if (hs[i].contains(el) || hs[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) last = hs[i]; else break;
  }
  var t = last ? scrub((last.textContent || "").replace(/\s+/g, " ").trim()).slice(0, 60) : "";
  if (t) out.push("under the heading \"" + t + "\"");
  return out.join(", ");
}
function aiOf(crit, expect, fix, els, more, lazy) {
  function fact(x) {
    var o = { role: x[0], el: x[1] };
    function fill() {
      o.sel = x[2] ? x[2].sel : sel(x[1]);
      o.html = x[2] ? x[2].html : snip(x[1], x[3]);
      o.comp = compOf(x[1]);
    }
    if (!lazy) fill();
    else ["sel", "html", "comp"].forEach(function (k) {
      Object.defineProperty(o, k, { configurable: true, enumerable: true, get: function () { fill(); return o[k]; }, set: function (v) { Object.defineProperty(o, k, { value: v, writable: true, enumerable: true }); } });
    });
    return o;
  }
  return {
    crit: crit,
    expect: expect,
    fix: fix,
    more: more || [],
    els: els.filter(function (x) { return x[1]; }).map(fact)
  };
}
function tally(k) {
  var m = {}, order = [];
  logs.forEach(function (e) {
    if (e.k !== k) return;
    if (!m[e.f]) {
      m[e.f] = 0;
      order.push(e.f);
    }
    m[e.f]++;
  });
  return order.map(function (f) { return f + " " + m[f]; }).join(", ");
}
function stamp() {
  var d = new Date();
  return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) + " " + two(d.getHours()) + ":" + two(d.getMinutes());
}
function verifyOf(e) {
  var a = e.ai, t = e.p.map(partText).join("");
  function el(r) {
    var x = a.els.filter(function (y) { return y.role === r; })[0];
    return x ? x.sel : "";
  }
  if (e.f === "Missed spots") return "Reload the page and run Tab trail again: " + el("Element") + " gets a stop number and the skipped count goes down by 1. Press Tab until it has focus, then Enter (and Space for a button) does what a click does.";
  if (e.f === "Forced order") return "Reload the page and run Tab trail again: " + el("Element") + " has no tabindex above 0, its stop number matches its place on the page, and the Forced order count goes down by 1.";
  if (e.f === "Hover menus") return "Press Tab until a link inside " + el("Element") + " has focus: the menu opens while focus is inside it, and Tab trail no longer lists it under hover menus.";
  if (e.f === "Hidden focus") return "Press Tab until " + el("Element") + " has focus: part of it shows next to " + el("Covered by") + ", and its Hidden focus line in the log says in view or partly covered.";
  if (e.f === "Keyboard trap") return "Put focus on " + el("Element") + " and press Tab: focus moves on to " + el("Expected next") + ", and the log shows an OK Out of order line.";
  if (e.f === "Lost focus") return "Open the popup from " + el("Opened by") + " with Enter, then close it with Escape or its close button: focus is back on " + el("Opened by") + ", and the log shows an OK Lost focus line.";
  if (el("Popup")) return "Reload so the popup shows, then press Tab once: focus lands inside " + el("Popup") + ".";
  return "Put focus on " + (el("Tab left from") || "the start of the page") + " and press " + (t.indexOf("(Shift+Tab)") >= 0 ? "Shift+Tab" : "Tab") + " once: focus lands on " + el("Expected next") + ", and the log shows an OK Out of order line.";
}
var hidTested = new Set();
function coverage() {
  var out = [], left = stops.filter(function (x) { return !hidTested.has(x); }).map(function (x) { return stops.indexOf(x) + 1; });
  if (left.length) out.push("Hidden focus: " + left.length + " of " + pl(stops.length, "stop was", "stops were") + " never tested (" + left.slice(0, 30).join(", ") + (left.length > 30 ? " and " + (left.length - 30) + " more" : "") + "). Press Play to test every stop.");
  var presses = logs.filter(function (e) { return e.f === "Out of order" || e.f === "Keyboard trap"; }).length;
  out.push("Out of order and Keyboard trap: judged only for the " + pl(presses, "Tab press", "Tab presses") + " made in this run. Press Tab through the whole page, and Shift+Tab back, to judge every step.");
  var pops = logs.filter(function (e) { return e.f === "Lost focus"; }).length;
  out.push("Lost focus: " + (pops ? "only " + pl(pops, "popup was", "popups were") : "no popups were") + " opened and closed in this run. Open and close every popup, menu and dialog on the page to check them all.");
  out.push("Window size: everything was tested at " + innerWidth + " x " + innerHeight + " only. Sticky bars, menus and popups can behave differently on phones; run it again in a window about 390 px wide.");
  out.push("Not checked by Tab trail at all: whether the focus outline is visible and has enough contrast, accessible names of buttons and links, color contrast of text, what a screen reader announces, and content inside iframes. Use axe DevTools or Lighthouse for names, contrast and iframes. Check focus visibility with Spotlight and screen reader output with VoiceOver or NVDA.");
  return out;
}
var probLog = [], ignore = [], CAP = 200, judgedDir = {};
function ignored(e) {
  return ignore.length && e.ai.els.some(function (x) {
    for (var n = x.el; n && n.nodeType === 1; n = n.parentElement || (n.getRootNode() && n.getRootNode().host)) {
      for (var i = 0; i < ignore.length; i++) if (n.matches(ignore[i])) return true;
    }
    return false;
  });
}
function openProbs(all) {
  var seen = {}, out = [];
  probLog.forEach(function (e) {
    var t = e.f + e.p.map(partText).join("");
    if (e.fixed || seen[t]) return;
    seen[t] = 1;
    if (all || !ignored(e)) out.push(e);
  });
  return out;
}
function hash(t) {
  var h = 2166136261;
  for (var i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return ("0000000" + (h >>> 0).toString(16)).slice(-8);
}
function keyOf(e) {
  var t = e.tagName.toLowerCase();
  if (e.id && cssId(e.id)) return t + "#" + e.id;
  var up = "";
  for (var p = e.parentElement; p; p = p.parentElement) if (p.id && cssId(p.id)) { up = "#" + p.id + " "; break; }
  return up + t + (e.getAttribute("role") ? "[role=" + e.getAttribute("role") + "]" : "") + (e.getAttribute("name") ? "[name=" + e.getAttribute("name") + "]" : "") + "\"" + label(e) + "\"";
}
function mainEl(e) {
  var to = e.ai.els.filter(function (x) { return x.role === "Tab jumped to"; })[0];
  return to || e.ai.els[0];
}
function problemsOf(list) {
  var used = {};
  return list.map(function (e) {
    var m = mainEl(e), id = hash(e.f + "|" + e.ai.els.map(function (x) { return keyOf(x.el); }).join("|"));
    used[id] = (used[id] || 0) + 1;
    return { id: used[id] > 1 ? id + "-" + used[id] : id, check: e.f, wcag: wcagOf(e) || null, selector: m ? m.sel : null, html: m ? m.html : null, component: m && m.comp ? m.comp : null, fix: e.ai.fix, verify: verifyOf(e) };
  });
}
function aiText() {
  var out = [], skips = [], seenS = {}, notes = [], probs = openProbs(), left = openProbs(true).length - probs.length, ids = problemsOf(probs), groups = [], byKey = {};
  probs.forEach(function (e, i) {
    var m = mainEl(e), k = /^(Missed spots|Hover menus|Forced order)$/.test(e.f) && m ? e.f + "|" + e.ai.fix + "|" + desc(m.el) + "|" + m.comp : "#" + i, g = byKey[k];
    if (!g) groups.push((g = byKey[k] = { i: i, list: [] }));
    g.list.push(e);
  });
  logs.forEach(function (e) {
    var t = e.p.map(partText).join("");
    if (e.k === "SKIPPED" && !seenS[e.f + t]) {
      seenS[e.f + t] = 1;
      skips.push(e.f + ": " + t);
    } else if (e.k === "INFO") notes.push(clock(e.t) + " " + e.f + ": " + t);
  });
  var c = logCounts();
  out.push("Tab trail " + VERSION + " report for an AI agent");
  out.push("Page: " + addr());
  out.push("Ran on: " + stamp() + ", " + browser() + ", window " + innerWidth + " x " + innerHeight);
  out.push("Tool: Tab trail (matjazkorosec.com/tools/tab-trail), a bookmarklet that checks the keyboard Tab order of the page. Stop numbers are positions in the Tab order when the check ran. Use the selectors, the HTML and the component names to find each element in the code.");
  out.push("Run it again from a script (for example Playwright): save https://raw.githubusercontent.com/matjazkorosec/tab-trail/v" + VERSION + "/dist/tab-trail.js in your repo once and load your saved copy with page.evaluate(readFileSync(...)), which works under a Content Security Policy. Then await window.__tabTrail.play() to walk every stop, and read window.__tabTrail.problems() for every open problem as data, window.__tabTrail.report() for this same report or window.__tabTrail.log() for every line.");
  out.push("");
  out.push("Summary: " + pl(probs.length, "problem", "problems") + " to fix" + (groups.length < probs.length ? " (" + pl(groups.length, "different fix", "different fixes") + ")" : "") + ". " + pl(c.ok, "check", "checks") + " passed, " + c.skip + " skipped.");
  if (walkEnd || walking) out.push("Play: " + playState() + ".");
  var pass = tally("OK"), sk = tally("SKIPPED");
  if (pass) out.push("Passed: " + pass + ".");
  if (sk) out.push("Skipped: " + sk + ".");
  var ran = ranChecks();
  if (ran.length) out.push("Checked: " + ran.join(", ") + ". Each check is explained at " + showUrl(ran[0]).replace(/#.*/, "#shows") + " under Fix what turns red.");
  if (left) out.push("Left out on purpose: " + pl(left, "problem", "problems") + " inside " + ignore.join(", ") + ".");
  if (groups.length > CAP) out.push("Showing the first " + CAP + " of " + groups.length.toLocaleString("en-US") + " problems. window.__tabTrail.problems() returns every one.");
  groups.slice(0, CAP).forEach(function (g, n) {
    var e = g.list[0], i = g.i, more = g.list.length - 2;
    out.push("");
    out.push("Problem " + (n + 1) + " of " + groups.length + ": " + e.f + (g.list.length > 1 ? ", " + g.list.length + " elements with the same cause: " + desc(mainEl(e).el) + " (" + g.list.slice(0, 2).map(function (x) { return "\"" + label(mainEl(x).el) + "\""; }).join(", ") + (more > 0 ? " and " + more + " more" : "") + "). Fix it once in the component that draws them." : "") + " (" + clock(e.t) + ")");
    out.push("Id: " + ids[i].id + (g.list.length > 1 ? " (the first of " + g.list.length + ", window.__tabTrail.problems() lists every one)" : ""));
    if (e.ai) out.push("WCAG: " + e.ai.crit);
    out.push("What happened: " + e.p.map(partText).join(""));
    if (!e.ai) return;
    out.push("Expected: " + e.ai.expect);
    e.ai.els.forEach(function (x) {
      out.push(x.role + ": " + x.sel + (x.el.isConnected ? "" : " (no longer on the page)"));
      out.push("  HTML: " + x.html);
      if (x.comp) out.push("  Component: " + x.comp);
      var where = whereOf(x.el);
      if (where) out.push("  Where: " + where);
    });
    e.ai.more.forEach(function (m) { out.push(m); });
    out.push("Fix hint: " + e.ai.fix);
    out.push("How to check the fix: " + verifyOf(e));
    if (CHECKS.indexOf(e.f) >= 0) out.push("About this check: " + showUrl(e.f));
  });
  out.push("");
  out.push("Not covered in this run:");
  coverage().forEach(function (t) { out.push("- " + t); });
  if (skips.length) {
    out.push("");
    out.push("Skipped checks, and why:");
    skips.slice(0, 12).forEach(function (t) { out.push("- " + t); });
    if (skips.length > 12) out.push("- and " + (skips.length - 12) + " more");
  }
  if (notes.length) {
    out.push("");
    out.push("Notes:");
    notes.slice(-10).forEach(function (t) { out.push("- " + t); });
  }
  return out.join("\n");
}
function copyIt(b, w, text, word) {
  var d = w.document;
  var lb = b.lastChild && b.lastChild.nodeType === 3 ? b.lastChild : b;
  function done(ok) {
    lb.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(function () { lb.textContent = word; }, 1500);
  }
  function old() {
    var back = w === window ? deep() : d.activeElement;
    var ta = d.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0";
    (w === window ? root : d.body).appendChild(ta);
    ta.focus({ preventScroll: true });
    ta.select();
    var ok = false;
    try { ok = d.execCommand("copy"); } catch (x) {}
    ta.remove();
    if (back && back.focus) back.focus({ preventScroll: true });
    done(ok);
  }
  if (w.navigator.clipboard && w.isSecureContext) w.navigator.clipboard.writeText(text).then(function () { done(true); }, old);
  else old();
}
function filters(parent, doc) {
  var row = doc.createElement("div");
  row.className = "lf";
  var set = FILT.map(function (f) {
    var b = doc.createElement("button");
    b.type = "button";
    b.className = "lt";
    b.addEventListener("click", function () {
      logFilter = f[0];
      logDraw();
    });
    row.appendChild(b);
    return b;
  });
  parent.appendChild(row);
  filterSets.push(set);
  return set;
}
function logSummary() {
  var c = logCounts();
  logSum.textContent = " " + pl(c.all, "event", "events");
  logBad.textContent = c.bad ? pl(c.bad, "problem", "problems") : "";
  logGroup.classList.toggle("warn", c.bad > 0);
  filterSets.forEach(function (set) {
    set.forEach(function (b, i) {
      b.textContent = FILT[i][1] + " " + c[FILT[i][0]];
      b.setAttribute("aria-pressed", logFilter === FILT[i][0] ? "true" : "false");
      b.classList.toggle("e", FILT[i][0] === "bad" && c.bad > 0);
    });
  });
  if (tabSum && tabOpen()) tabSum.textContent = addr() + ", " + pl(stops.length, "stop", "stops");
  checkedLine(logChecked, document);
  if (tabChecked && tabOpen()) checkedLine(tabChecked, logTab.document);
  if (sumLine && walkEnd === "done") sumDraw();
}
function logDraw() {
  if (logTab && logTab.closed) tabGone();
  logSummary();
  [logList, tabList].forEach(function (u) { if (u) while (u.firstChild) u.removeChild(u.firstChild); });
  logs.forEach(function (e) { e.li = null; });
  var away = tabOpen();
  logBody.hidden = !logOpen || away;
  logAway.hidden = !away;
  logBtn.setAttribute("aria-expanded", logBody.hidden ? "false" : "true");
  var v = logView();
  if (!v) return;
  var frag = v.ownerDocument.createDocumentFragment();
  logs.slice().reverse().forEach(function (e) {
    if (!shows(e)) return;
    e.li = logLi(e, v.ownerDocument);
    frag.appendChild(e.li);
  });
  v.appendChild(frag);
  toTop(v);
}
function tabGone() {
  logTab = null;
  tabList = null;
  tabSum = null;
  tabChecked = null;
  wcagBoxes = wcagBoxes.filter(function (b) { return b.ownerDocument === document; });
  tabNote = null;
  filterSets = filterSets.filter(function (x) { return x !== tabSet; });
  tabSet = null;
  if (tabPoll) clearInterval(tabPoll);
  tabPoll = 0;
}
var TAB_CSS = [
  "body{margin:0;padding:12px;background:#e4dccd;color:#1a1612;font:15px/1.5 -apple-system,system-ui,'Segoe UI',Roboto,sans-serif}",
  ".hd,.box{box-sizing:border-box;max-width:1200px;margin:0 auto;background:#fbf8f3;border-radius:12px}",
  ".wide .hd,.wide .box{max-width:none}",
  ".fw{display:inline-grid;place-items:center;width:34px;height:34px;padding:0;border:1.5px solid #1a1612;border-radius:8px;background:#fff;color:#1a1612;cursor:pointer;box-sizing:border-box}",
  ".fw:hover{background:#efe8dc}",
  ".fw:focus-visible{outline:3px solid #c2410c;outline-offset:2px}",
  ".fw .in,.wide .fw .out{display:none}",
  ".wide .fw .in{display:inline}",
  ".hd{position:sticky;top:12px;z-index:1;display:flex;flex-wrap:wrap;align-items:center;gap:10px 8px;padding:14px 18px;box-shadow:0 0 0 12px #e4dccd}",
  ".box{margin-top:8px;padding:12px 0 8px;overflow:hidden}",
  "h1{margin:0;font:700 22px/1.2 Georgia,serif}",
  ".u{margin:0 auto 0 6px;color:#5f564c}",
  ".nt{flex-basis:100%;margin:0;color:#d0103a;font-weight:700}",
  ".nt[hidden]{display:none}",
  ".lf{display:inline-grid;grid-auto-flow:column;gap:2px;padding:3px;background:#efe8dc;border-radius:10px;margin-right:14px}",
  ".fr{flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;gap:8px 0}",
  ".lt,.kl,.ka,.lo,.lc{font:inherit;color:inherit;cursor:pointer}",
  ".lt{padding:3px 14px;border:0;border-radius:7px;background:none;color:#5f564c;font-weight:600;font-size:14px}",
  ".lt:hover{color:#1a1612;background:rgba(26,22,18,.06)}",
  ".lt[aria-pressed=true]{background:#fff;color:#1a1612;box-shadow:0 1px 2px rgba(26,22,18,.2)}",
  ".lt.e{color:#d0103a}",
  ".lt.e:hover{background:rgba(208,16,58,.1)}",
  ".lt.e[aria-pressed=true]{background:#d0103a;color:#fff}",
  ".kl,.ka,.lo{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 14px;border-radius:8px;font-weight:700;font-size:14px;white-space:nowrap;box-sizing:border-box}",
  ".kl,.lo{border:1.5px solid #1a1612;background:#fff;color:#1a1612}",
  ".kl:hover,.lo:hover{background:#efe8dc}",
  ".ka{border:0;background:#1a1612;color:#fbf8f3}",
  ".ka:hover{background:#3a332c}",
  ".lo{font-weight:600}",
  ".lt:focus-visible,.kl:focus-visible,.ka:focus-visible,.lo:focus-visible,.lc:focus-visible{outline:3px solid #c2410c;outline-offset:2px}",
  ".lck{margin:0;padding:0 18px 8px}",
  ".lck[hidden]{display:none}",
  ".lq{color:#1e3a8a;font-weight:700;text-decoration:none}",
  ".lq:hover{text-decoration:underline;text-underline-offset:2px}",
  ".wc{color:#1f7a3f;font-weight:400}",
  ".nw .wc{display:none}",
  ".lw{display:inline-flex;align-items:center;gap:8px;font-size:14px;color:#1f7a3f;cursor:pointer}",
  ".lw input{width:16px;height:16px;margin:0;accent-color:#c2410c;cursor:pointer}",
  ".lw input:focus-visible{outline:3px solid #c2410c;outline-offset:2px}",
  ".lq.bad{color:#d0103a}",
  ".lq:focus-visible{outline:3px solid #c2410c;outline-offset:2px;border-radius:2px}",
  ".ll{list-style:none;margin:0;padding:0}",
  ".lx{display:grid;grid-template-columns:72px 80px 1fr;gap:2px 12px;padding:6px 18px;align-items:baseline}",
  ".lx:hover{background:#f3ede3}",
  ".lx .bd{min-width:0;overflow-wrap:anywhere}",
  ".lx.bad{background:rgba(208,16,58,.07)}",
  ".tm,.st{font:500 14px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#5f564c}",
  ".st{font-weight:700}",
  ".ok .st{color:#1f7a3f}.bad .st{color:#d0103a}.skip .st{color:#5f564c}.info .st{color:#1e3a8a}",
  ".ft{color:#1e3a8a}.bad .ft{color:#d0103a}",
  ".lc{display:inline-block;min-width:24px;padding:0 6px;border:1px dashed #1a1612;border-radius:999px;background:none;font-size:14px;line-height:1.4;text-align:center}",
  ".lc:hover{background:rgba(26,22,18,.08)}"
].join("");
var ownName = false, tabWide = false;
function openTab() {
  var w = window.open("", "_blank");
  if (!w) {
    tabMsg.hidden = false;
    return;
  }
  tabMsg.hidden = true;
  logTab = w;
  if (!window.name) {
    window.name = "tab-trail-" + Date.now();
    ownName = true;
  }
  var d = w.document;
  d.title = "Tab trail log: " + location.host;
  try {
    var tsh = new w.CSSStyleSheet();
    tsh.replaceSync(TAB_CSS);
    d.adoptedStyleSheets = [tsh];
  } catch (e) {
    var st = d.createElement("style");
    st.textContent = TAB_CSS;
    d.head.appendChild(st);
  }
  var hd = d.createElement("div");
  hd.className = "hd";
  var h1 = d.createElement("h1");
  h1.textContent = "Tab trail log";
  hd.appendChild(h1);
  tabSum = d.createElement("p");
  tabSum.className = "u";
  hd.appendChild(tabSum);
  var cp = d.createElement("button");
  cp.type = "button";
  cp.className = "kl";
  icon(cp, 16, COPY_ICON, 1.6);
  cp.appendChild(d.createTextNode("Copy log"));
  cp.addEventListener("click", function () { copyIt(cp, w, logText(), "Copy log"); });
  hd.appendChild(cp);
  var ca = d.createElement("button");
  ca.type = "button";
  ca.className = "ka";
  icon(ca, 16, AI_ICON, 1.6);
  ca.appendChild(d.createTextNode("Copy for AI"));
  ca.addEventListener("click", function () { copyIt(ca, w, aiText(), "Copy for AI"); });
  hd.appendChild(ca);
  var bk = d.createElement("button");
  bk.type = "button";
  bk.className = "lo";
  bk.textContent = "Put back in panel";
  bk.addEventListener("click", putBack);
  hd.appendChild(bk);
  var fw = d.createElement("button");
  fw.type = "button";
  fw.className = "fw";
  fw.setAttribute("aria-label", "Full width");
  fw.title = "Full width";
  fw.setAttribute("aria-pressed", tabWide ? "true" : "false");
  icon(fw, 16, "M1.5 8h13M1.5 8l3-3M1.5 8l3 3M14.5 8l-3-3M14.5 8l-3 3", 1.6).setAttribute("class", "out");
  icon(fw, 16, "M1.5 8h4.5M6 8l-3-3M6 8l-3 3M14.5 8H10M10 8l3-3M10 8l3 3", 1.6).setAttribute("class", "in");
  fw.addEventListener("click", function () {
    tabWide = !tabWide;
    d.body.classList.toggle("wide", tabWide);
    fw.setAttribute("aria-pressed", tabWide ? "true" : "false");
  });
  hd.appendChild(fw);
  d.body.classList.toggle("wide", tabWide);
  tabNote = d.createElement("p");
  tabNote.className = "nt";
  tabNote.textContent = "Tab trail was closed on the page. This log no longer updates.";
  tabNote.hidden = true;
  hd.appendChild(tabNote);
  var fr = d.createElement("div");
  fr.className = "fr";
  hd.appendChild(fr);
  tabSet = filters(fr, d);
  wcagBox(fr, d);
  d.body.appendChild(hd);
  d.body.classList.toggle("nw", !showWcag);
  var bd = d.createElement("div");
  bd.className = "box";
  d.body.appendChild(bd);
  tabChecked = d.createElement("p");
  tabChecked.className = "lck";
  bd.appendChild(tabChecked);
  tabList = d.createElement("ul");
  tabList.className = "ll";
  bd.appendChild(tabList);
  tabPoll = setInterval(function () {
    if (logTab && logTab.closed) {
      tabGone();
      logDraw();
    }
  }, 1000);
  logOpen = true;
  logDraw();
}
function putBack() {
  var w = logTab;
  tabGone();
  logOpen = true;
  logDraw();
  if (w && !w.closed) w.close();
}
function lbtn(cls, text, parent) {
  var b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.textContent = text;
  parent.appendChild(b);
  return b;
}
var logGroup = document.createElement("div");
logGroup.className = "lgp";
var logBtn = document.createElement("button");
logBtn.type = "button";
logBtn.className = "sg";
logBtn.setAttribute("aria-expanded", "false");
var logWord = document.createElement("b");
logWord.textContent = "Log";
icon(logBtn, 16, "M4 1.5h8v13H4zM6.5 5h3M6.5 8h3M6.5 11h2", 1.6);
logBtn.appendChild(logWord);
var logSum = document.createElement("span");
logSum.className = "ls";
var logBad = document.createElement("span");
logBad.className = "bg";
var logInfo = document.createElement("span");
logInfo.appendChild(logSum);
logBtn.appendChild(logInfo);
logBtn.appendChild(logBad);
logBtn.appendChild(document.createElement("i"));
logGroup.appendChild(logBtn);
var logBody = document.createElement("div");
logBody.className = "lbd";
logBody.hidden = true;
logGroup.appendChild(logBody);
var logTop = document.createElement("div");
logTop.className = "lr lrt";
logBody.appendChild(logTop);
var logChecked = document.createElement("p");
logChecked.className = "lck";
logChecked.hidden = true;
logBody.appendChild(logChecked);
filters(logBody, document);
wcagBox(logBody, document);
var logList = document.createElement("ul");
logList.className = "ll";
logBody.appendChild(logList);
var logRow = document.createElement("div");
logRow.className = "lr lb2";
logBody.appendChild(logRow);
var copyBtn = lbtn("kl", "Copy log", logRow);
copyBtn.insertBefore(icon(copyBtn, 16, COPY_ICON, 1.6), copyBtn.firstChild);
copyBtn.addEventListener("click", function () { copyIt(copyBtn, window, logText(), "Copy log"); });
var aiLog = lbtn("ka", "Copy for AI", logRow);
aiLog.insertBefore(icon(aiLog, 16, AI_ICON, 1.6), aiLog.firstChild);
aiLog.addEventListener("click", function () { copyIt(aiLog, window, aiText(), "Copy for AI"); });
function newTabBtn(parent) {
  var b = lbtn("lnt", "", parent);
  icon(b, 14, "M9 2.5h4.5V7M13.5 2.5L7.5 8.5M12 9.5v4h-9.5v-9.5h4", 1.6);
  b.appendChild(document.createTextNode("Open log in new tab"));
  b.addEventListener("click", openTab);
  return b;
}
newTabBtn(logTop);
var logEnd = document.createElement("div");
logEnd.className = "lr";
logBody.insertBefore(logEnd, logRow.nextSibling);
newTabBtn(logEnd);
var tabMsg = document.createElement("p");
tabMsg.className = "lm";
tabMsg.textContent = "The browser blocked the new tab. Allow pop-ups for this site and try again.";
tabMsg.hidden = true;
logBody.insertBefore(tabMsg, logChecked);
var logAway = document.createElement("div");
logAway.className = "la";
logAway.hidden = true;
var awayText = document.createElement("p");
awayText.textContent = "The log is open in a new tab.";
logAway.appendChild(awayText);
var awayRow = document.createElement("div");
awayRow.className = "lr";
logAway.appendChild(awayRow);
lbtn("lo", "Show it", awayRow).addEventListener("click", function () { if (tabOpen()) logTab.focus(); });
lbtn("lo", "Put it back", awayRow).addEventListener("click", putBack);
logGroup.appendChild(logAway);
logBtn.addEventListener("click", function () {
  if (tabOpen()) return logTab.focus();
  logOpen = !logOpen;
  logDraw();
  if (!logOpen) return;
  var gr = logGroup.getBoundingClientRect(), pr = panel.getBoundingClientRect();
  if (gr.bottom > pr.bottom) panel.scrollTop += Math.min(gr.bottom - pr.bottom, gr.top - pr.top);
});
tray.insertBefore(logGroup, tray.firstChild);
logGroup.className = "lgp sec";
[[legendBtn, legend], [keysBtn, keysBox], [gear, settings]].forEach(function (p) {
  var w = document.createElement("div");
  w.className = "sec";
  tray.insertBefore(w, p[0]);
  w.appendChild(p[0]);
  w.appendChild(p[1]);
});
[logBtn, legendBtn, keysBtn, gear].forEach(function (b) {
  var g = b.querySelector("svg"), t = document.createElement("span");
  t.className = "ic";
  b.insertBefore(t, g);
  t.appendChild(g);
});
wcagSync();
logSummary();
root.appendChild(panel);
skipPanel();
var closed = false;
function place() {
  if (closed) return;
  var m = modal(), to = m || document.documentElement;
  if (host.parentNode !== to) to.appendChild(host);
  var want = { position: m ? "fixed" : "absolute", left: m ? -scrollX + "px" : "0px", top: m ? -scrollY + "px" : "0px" };
  for (var k in want) if (host.style[k] !== want[k]) host.style[k] = want[k];
}
place();

function el(name, attrs, parent) {
  var n = document.createElementNS(NS, name);
  for (var k in attrs) n.setAttribute(k, attrs[k]);
  parent.appendChild(n);
  return n;
}
var queued = false, onlyScreen = true, boxKey = [];
var current = -1;
var pinned = new WeakMap();
function isPinned(e) {
  if (pinned.has(e)) return pinned.get(e);
  var p = false;
  for (var n = e; n && n.nodeType === 1; n = n.parentElement || (n.getRootNode() && n.getRootNode().host)) {
    var pos = getComputedStyle(n).position;
    if (pos === "fixed" || pos === "sticky") { p = true; break; }
  }
  pinned.set(e, p);
  return p;
}
function clear(g) { while (g.firstChild) g.removeChild(g.firstChild); }
var spotEl = null;
function lit(r) {
  clear(spot);
  if (!light.checked) return;
  var W = innerWidth, H = innerHeight, d = "M0 0H" + W + "V" + H + "H0Z";
  if (r && (r.width || r.height)) {
    var x0 = r.left - 6, y0 = r.top - 6, x1 = r.right + 6, y1 = r.bottom + 6, k = Math.min(8, (x1 - x0) / 2, (y1 - y0) / 2);
    d += "M" + (x0 + k) + " " + y0 + "H" + (x1 - k) + "A" + k + " " + k + " 0 0 1 " + x1 + " " + (y0 + k) + "V" + (y1 - k) + "A" + k + " " + k + " 0 0 1 " + (x1 - k) + " " + y1 + "H" + (x0 + k) + "A" + k + " " + k + " 0 0 1 " + x0 + " " + (y1 - k) + "V" + (y0 + k) + "A" + k + " " + k + " 0 0 1 " + (x0 + k) + " " + y0 + "Z";
  }
  el("path", { d: d, fill: "rgba(15,12,10,.72)", "fill-rule": "evenodd" }, spot);
}
function box(m, r, layer) {
  if (m === shownEl) {
    el("rect", { x: r.left - 6, y: r.top - 6, width: r.width + 12, height: r.height + 12, fill: "none", stroke: "#fff", "stroke-width": 8, rx: 6 }, layer);
    el("rect", { x: r.left - 6, y: r.top - 6, width: r.width + 12, height: r.height + 12, fill: "none", stroke: "#d0103a", "stroke-width": 4, rx: 6 }, layer);
  }
  el("rect", { x: r.left, y: r.top, width: r.width, height: r.height, fill: "rgba(208,16,58,.12)", stroke: "#d0103a", "stroke-width": 3, "stroke-dasharray": "7 5", rx: 3 }, layer);
}
function trailLine(pts, layer) {
  if (pts.length < 2) return;
  var p = pts.map(function (q) { return q[0] + "," + q[1]; }).join(" ");
  el("polyline", { points: p, fill: "none", stroke: "#fff", "stroke-width": 6, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0.9 }, layer);
  el("polyline", { points: p, fill: "none", stroke: "#ff8f57", "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }, layer);
}
function dotsIn(list, layer) {
  list.sort(function (a, b) { return (a[2] - 1 === current) - (b[2] - 1 === current); });
  list.forEach(function (d) {
    var big = d[2] > 99, on = d[2] - 1 === current;
    var g = el("g", { class: "o", "data-i": d[2] - 1 }, layer);
    if (on) el("circle", { cx: d[0], cy: d[1], r: big ? 19 : 17, fill: "none", stroke: "#ff8f57", "stroke-width": 4 }, g);
    if (d[3] && !on) el("circle", { cx: d[0], cy: d[1], r: big ? 14 : 12, fill: "#fff", stroke: "#1a1612", "stroke-width": 2, "stroke-dasharray": "4 3" }, g);
    else el("circle", { cx: d[0], cy: d[1], r: big ? 14 : 12, fill: on ? "#c2410c" : "#1a1612", stroke: "#fff", "stroke-width": 2 }, g);
    var t = el("text", { x: d[0], y: d[1] + 0.5, fill: d[3] && !on ? "#1a1612" : "#fff", "font-size": big ? 10 : 11, "font-weight": 700, "font-family": "system-ui,sans-serif", "text-anchor": "middle", "dominant-baseline": "middle" }, g);
    t.textContent = d[2];
  });
}
function shortLines(pts, sx, sy) {
  var W = innerWidth, H = innerHeight, MAX = 100;
  var v = pts.map(function (p) { return p[2] ? [p[0], p[1]] : [p[0] - sx, p[1] - sy]; });
  function on(p) { return p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H; }
  function arrow(from, to, L) {
    var dx = to[0] - from[0], dy = to[1] - from[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    var tip = [from[0] + ux * L, from[1] + uy * L];
    trailLine([from, tip], svg);
    var pts3 = [[tip[0] + ux * 6, tip[1] + uy * 6], [tip[0] - ux * 9 + uy * 9, tip[1] - uy * 9 - ux * 9], [tip[0] - ux * 9 - uy * 9, tip[1] - uy * 9 + ux * 9]];
    el("polygon", { points: pts3.map(function (q) { return q[0] + "," + q[1]; }).join(" "), fill: "#ff8f57", stroke: "#fff", "stroke-width": 2, "stroke-linejoin": "round" }, svg);
  }
  for (var k = 1; k < v.length; k++) {
    var a = v[k - 1], b = v[k], ia = on(a), ib = on(b);
    var len = Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]));
    if (ia && ib && len <= MAX) trailLine([a, b], svg);
    else if (ia && ib) {
      var L = Math.min(MAX - 6, len / 2 - 12);
      arrow(a, b, L);
      arrow(b, a, L);
    }
    else if (ia || ib) arrow(ia ? a : b, ia ? b : a, Math.min(MAX - 6, len));
  }
}
function draw() {
  queued = false;
  var page = !onlyScreen;
  onlyScreen = true;
  var sx = scrollX, sy = scrollY;
  var last = Math.max(Math.ceil(stops.length / PAGE) - 1, 0);
  if (win > last) win = last;
  var lo = paged() ? win * PAGE : 0, hi = paged() ? Math.min(lo + PAGE, stops.length) : stops.length;
  var red = [], at = [];
  missed.concat(hovers).forEach(function (m) {
    var p = isPinned(m);
    if (p || page) red.push([m, m.getBoundingClientRect(), p]);
  });
  for (var i = lo; i < hi; i++) {
    var sr = stops[i].getBoundingClientRect(), st = sr.width < 2 && sr.height < 2;
    at.push([sr, st, st || isPinned(stops[i])]);
  }
  var fr = shownEl && hovers.indexOf(shownEl) < 0 && forced.indexOf(shownEl) >= 0 ? [shownEl.getBoundingClientRect(), isPinned(shownEl)] : null;
  var lr = light.checked && spotEl && spotEl.isConnected ? spotEl.getBoundingClientRect() : null;
  var key = [shownEl];
  red.forEach(function (x) { if (!x[2]) key.push(x[0], x[1].left + sx, x[1].top + sy, x[1].width, x[1].height); });
  if (fr && !fr[1]) key.push(fr[0].left + sx, fr[0].top + sy, fr[0].width, fr[0].height);
  var keep = page && same(key, boxKey);
  if (page) boxKey = key;
  clear(svg);
  clear(dot);
  clear(under);
  lit(lr);
  if (page) {
    clear(svgPg);
    clear(dotPg);
    if (!keep) clear(underPg);
  }
  red.forEach(function (x) {
    var m = x[0], r = x[1];
    if (x[2]) box(m, r, under);
    else if (!keep) box(m, { left: r.left + sx, top: r.top + sy, width: r.width, height: r.height }, underPg);
  });
  if (fr) {
    var hr = fr[0], hp = fr[1];
    if (hp || (page && !keep)) {
      var hx = hp ? hr.left : hr.left + sx, hy = hp ? hr.top : hr.top + sy, hl = hp ? under : underPg;
      el("rect", { x: hx - 6, y: hy - 6, width: hr.width + 12, height: hr.height + 12, fill: "none", stroke: "#fff", "stroke-width": 8, rx: 6 }, hl);
      el("rect", { x: hx - 6, y: hy - 6, width: hr.width + 12, height: hr.height + 12, fill: "none", stroke: "#d0103a", "stroke-width": 4, rx: 6 }, hl);
    }
  }
  var hid = 0, placedPg = [], placedSc = [], pts = [], dotsPg = [], dotsSc = [];
  var big = stops.length > PAGE;
  group.style.display = big ? "" : "none";
  pager.style.display = paged() ? "" : "none";
  chunkBox.style.marginTop = paged() ? "" : "0";
  if (paged()) {
    pageText.textContent = "Stops " + (lo + 1) + " to " + hi + " of " + stops.length;
    prevBtn.disabled = win === 0;
    nextBtn.disabled = win === last;
  }
  stops.forEach(function (s, i) {
    if (i < lo || i >= hi) return;
    var r = at[i - lo][0];
    var tiny = at[i - lo][1];
    var onScreen = at[i - lo][2];
    var cx = tiny ? 13 + hid++ * 30 : onScreen ? Math.max(r.left - 8, 13) : Math.max(r.left + sx - 8, 13);
    var cy = tiny ? 13 : onScreen ? Math.max(r.top - 8, 13) : Math.max(r.top + sy - 8, 13);
    var placed = onScreen ? placedSc : placedPg;
    for (var j = placed.length - 1, tries = 0; j >= 0 && tries < 40; j--) {
      if (Math.abs(placed[j][0] - cx) < 26 && Math.abs(placed[j][1] - cy) < 26) {
        cx = placed[j][0] + 28;
        j = placed.length;
        tries++;
      }
    }
    placed.push([cx, cy]);
    pts.push([cx, cy, onScreen]);
    (onScreen ? dotsSc : dotsPg).push([cx, cy, i + 1, tiny]);
  });
  if (lines.checked && !stub.checked) shortLines(pts, sx, sy);
  var run = [], runPg = null;
  function flush() {
    if (runPg === null) return;
    if (runPg) { if (page) trailLine(run, svgPg); }
    else trailLine(run, svg);
    run = [];
    runPg = null;
  }
  for (var k = lines.checked && stub.checked ? 1 : pts.length; k < pts.length; k++) {
    var a = pts[k - 1], b = pts[k], both = !a[2] && !b[2];
    if (runPg !== both) {
      flush();
      runPg = both;
      run.push(both || a[2] ? [a[0], a[1]] : [a[0] - sx, a[1] - sy]);
    }
    run.push(both || b[2] ? [b[0], b[1]] : [b[0] - sx, b[1] - sy]);
  }
  flush();
  if (page) dotsIn(dotsPg, dotPg);
  dotsIn(dotsSc, dot);
}
function queue(screenOnly) {
  if (screenOnly !== true) onlyScreen = false;
  if (!queued) { queued = true; requestAnimationFrame(draw); }
}
var timer = 0, idle = 0, nextScan = 0, settling = false;
function same(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
function rescan() {
  if (timer) clearTimeout(timer);
  if (idle && window.cancelIdleCallback) cancelIdleCallback(idle);
  timer = 0;
  idle = 0;
  if (closed) return;
  if (settling) return later();
  var t0 = performance.now();
  place();
  pinned = new WeakMap();
  scan();
  if (!same(drawn, sig())) {
    fill();
    scan();
    renderJumps();
    review();
  }
  focus();
  var t1 = performance.now();
  nextScan = t1 + Math.max(500, 4 * (t1 - t0));
}
var due = 0;
function later(min) {
  if (idle || closed) return;
  var wait = Math.max(min || 500, nextScan - performance.now());
  if (timer) {
    if (performance.now() + wait >= due) return;
    clearTimeout(timer);
  }
  due = performance.now() + wait;
  timer = setTimeout(function () {
    timer = 0;
    if (window.requestIdleCallback) idle = requestIdleCallback(rescan, { timeout: 1000 });
    else rescan();
  }, wait);
}
var LOUD = /^(tabindex|disabled|inert|href|role|open|hidden)$/;
function matters(m) {
  var t = m.target;
  if (t === host || host.contains(t)) return false;
  if (m.type === "childList") {
    var l = [].concat([].slice.call(m.addedNodes), [].slice.call(m.removedNodes));
    for (var i = 0; i < l.length; i++) if (l[i].nodeType === 1) return true;
    return false;
  }
  if (LOUD.test(m.attributeName || "") || t.nodeType !== 1) return true;
  if (stopSet.has(t) || upSet.has(t) || t.matches(FOCUSABLE) || t.querySelector(FOCUSABLE)) return true;
  return missed.concat(hovers, forced).some(function (x) { return t === x || t.contains(x); });
}
function onMoved(e) { if (host.style.position === "fixed") place(); queue((stub.checked || !lines.checked) && !!e && e.type === "scroll" && (e.target === document || e.target === document.documentElement)); later(); }
var watch = new MutationObserver(function (list) {
  place();
  if (openPop && gone(openPop)) popClosed();
  for (var i = 0; i < list.length; i++) if (matters(list[i])) return later();
  later(3000);
});
function focus() {
  var a = deep();
  track(a);
  if (a && a !== document.body && a !== document.documentElement) {
    lost = false;
    if (a !== host && a.getRootNode() !== root) spotEl = a;
  } else spotEl = null;
  current = stops.indexOf(a);
  if (current !== seen) {
    seen = current;
    if (current >= 0) win = Math.floor(current / PAGE);
  }
  queue();
}
function lose(e) {
  var t = e && !e.relatedTarget && e.composedPath ? e.composedPath()[0] : null, p = t && t.nodeType === 1 ? popupOf(t) : null;
  if (p && p === openPop) requestAnimationFrame(function () { if (!closed && openPop === p && gone(p)) popClosed(); });
  setTimeout(function () {
    var a = document.activeElement;
    if (a && a !== document.body && a !== document.documentElement) return;
    lost = true;
    focus();
  }, 0);
}
var walking = false, walkDelay = 400, walkT = 0, walked = new Set(), walkAt = null, walkEnd = null;
function walkedN() { return stops.filter(function (s) { return walked.has(s); }).length; }
function playState() {
  var at = walkAt && stops.indexOf(walkAt) >= 0 ? " at stop " + (stops.indexOf(walkAt) + 1) + " \"" + label(walkAt) + "\"" : "";
  var n = "walked " + walkedN() + " of " + pl(stops.length, "stop", "stops");
  if (walking) return "still walking" + at + ", " + n;
  return walkEnd === "done" ? "finished, " + n : "paused" + at + ", " + n;
}
function playLook() {
  while (playIcon.firstChild) playIcon.removeChild(playIcon.firstChild);
  icon(playIcon, 12, walking ? "M5 3v10M11 3v10" : "M4 2.5l9 5.5-9 5.5z", 2.4);
  playWord.textContent = walking ? "Pause" : "Play";
  play.setAttribute("aria-pressed", walking ? "true" : "false");
  if (walked.size) playText.textContent = "Walked " + walkedN() + " of " + stops.length + " stops";
}
function walkedText() { return " after " + walkedN() + " of " + pl(stops.length, "stop", "stops") + "."; }
function stopWalk(why, fin) {
  if (!walking) return;
  walking = false;
  walkEnd = fin ? "done" : "paused";
  settling = false;
  if (walkT) clearTimeout(walkT);
  walkT = 0;
  playLook();
  if (why) log("INFO", "Play it", [why]);
  sumDraw();
  if (fin) announce("Walked " + walkedN() + " of " + pl(stops.length, "stop", "stops") + ". " + pl(logCounts().bad, "problem", "problems") + ".");
  else if (why) announce("Play paused" + (walkAt && stops.indexOf(walkAt) >= 0 ? " at stop " + (stops.indexOf(walkAt) + 1) : "") + ". Walked " + walkedN() + " of " + pl(stops.length, "stop", "stops") + ".");
  var done = walkDone;
  walkDone = [];
  done.forEach(function (f) { f(aiText()); });
}
function step(s) {
  walkT = 0;
  if (!walking || closed) return;
  if (!s || stops.indexOf(s) < 0) s = stops.filter(function (x) { return !walked.has(x); })[0];
  if (!s) {
    stopWalk("Finished: walked " + walkedN() + " of " + pl(stops.length, "stop", "stops") + ".", true);
    return;
  }
  endPress();
  s.focus({ focusVisible: true });
  focus();
  walked.add(s);
  walkAt = s;
  playLook();
  var at = where(s), still = 0, tries = 0;
  settling = true;
  function wait() {
    if (!walking || closed) return void (settling = false);
    var now = where(s);
    if (now !== at) {
      at = now;
      still = 0;
    } else still++;
    if (++tries < 90 && (still < 2 || tries < 6)) return requestAnimationFrame(wait);
    settling = false;
    hoverTry(s);
    check(s, function () {
      if (walking && !closed) walkT = setTimeout(function () { step(); }, walkDelay);
    });
  }
  requestAnimationFrame(wait);
}
var walkDone = [];
function untested() {
  var judged = {};
  logs.forEach(function (e) { if ((e.k === "OK" || e.k === "PROBLEM") && e.f === "Lost focus") judged[e.f] = 1; });
  if (judgedDir[1] && judgedDir[-1]) judged["Out of order"] = judged["Keyboard trap"] = 1;
  openProbs().forEach(function (e) { judged[e.f] = 1; });
  return ["Out of order", "Keyboard trap", "Lost focus"].filter(function (f) { return !judged[f]; });
}
function sumDraw() {
  sumLine.hidden = walking || walkEnd !== "done";
  if (sumLine.hidden) return;
  var per = {}, probs = openProbs(), left = untested();
  probs.forEach(function (e) { per[e.f] = (per[e.f] || 0) + 1; });
  var red = CHECKS.filter(function (f) { return per[f]; }), ok = CHECKS.filter(function (f) { return !per[f] && left.indexOf(f) < 0; });
  var tabLeft = left.indexOf("Out of order") >= 0 || left.indexOf("Keyboard trap") >= 0, popLeft = left.indexOf("Lost focus") >= 0;
  while (sumLine.firstChild) sumLine.removeChild(sumLine.firstChild);
  var b = document.createElement("b");
  b.textContent = pl(CHECKS.length, "check", "checks") + ": " + ok.length + " passed, " + red.length + (red.length === 1 ? " found a problem, " : " found problems, ") + left.length + " not tested.";
  sumLine.appendChild(b);
  function part(head, list, cls, count) {
    if (!list.length) return;
    sumLine.appendChild(document.createTextNode(" " + head + ": "));
    var sp = document.createElement("span");
    sp.className = cls;
    sp.textContent = list.map(function (f) { return f + (count ? " " + per[f] : ""); }).join(", ");
    sumLine.appendChild(sp);
    sumLine.appendChild(document.createTextNode("."));
  }
  part("Passed", ok, "g");
  part(red.length === 1 ? "Problem" : "Problems", red, "e", true);
  part("Not tested (" + (tabLeft && popLeft ? "press Tab and Shift+Tab, open and close a popup" : tabLeft ? "press Tab and Shift+Tab" : "open and close a popup") + ")", left, "q");
}
function startWalk() {
  walking = true;
  sumDraw();
  if (walkedN() >= stops.length) walked = new Set();
  playLook();
  var first = current >= 0 && current < stops.length - 1 && walked.size ? current + 1 : 0;
  if (stops[first]) {
    log("INFO", "Play it", [first ? "Went on from " : "Started at ", ref(stops[first]), "."]);
    announce((first ? "Play went on from stop " : "Play started at stop ") + (first + 1) + ".");
  }
  step(stops[first]);
}
play.addEventListener("click", function () {
  if (walking) return stopWalk("Paused with the Pause button" + walkedText());
  walkDelay = 400;
  startWalk();
});
function interrupt(e) {
  if (!walking || (e.composedPath && e.composedPath().indexOf(host) >= 0)) return;
  stopWalk("Paused by a click on the page" + walkedText());
}
playLook();
var SAFARI = MAC && /^Safari /.test(browser()), FIREFOX = MAC && /^Firefox /.test(browser());
var settleT = 0, macNote = false, beforeEl = null, wantEl = null, MAC_NOTE = SAFARI ? "Safari skips links and buttons on Tab until you turn it on: Settings, Advanced, Press Tab to highlight each item." : "Firefox skips links on Tab until you turn it on: System Settings, Keyboard, Keyboard navigation.";
var LINKS = "a[href],area[href]", SKIPS = SAFARI ? ["a[href]", "area[href]", "button", "input[type=button]", "input[type=submit]", "input[type=reset]", "input[type=image]", "input[type=checkbox]", "input[type=radio]", "input[type=range]", "input[type=file]", "input[type=color]"].map(function (q) { return q + ":not([tabindex])"; }).join(",") : LINKS;
function linkSkip(want, cur, dir) {
  if (!SAFARI && !FIREFOX) return null;
  var n = stops.length, k = 0, links = 0;
  for (var i = want; i !== cur && k < n; i = (i + dir + n) % n, k++) {
    if (!stops[i].matches(SKIPS)) return null;
    if (stops[i].matches(LINKS)) links++;
  }
  return k && k < n ? [links, k - links] : null;
}
function skipText(c) {
  var l = c[0] ? pl(c[0], "link", "links") : "", b = c[1] ? pl(c[1], "button", "buttons") : "";
  return l && b ? l + " and " + b : l || b;
}
function after(el, dir) {
  var ord = new Map(), n = stops.length, pick = -1;
  walk(document, []).forEach(function (e, i) { ord.set(e, i); });
  var at = ord.get(el);
  if (at === undefined) return dir > 0 ? 0 : n - 1;
  for (var i = 0; i < n; i++) {
    var k = ord.get(stops[i]);
    if (stops[i].tabIndex > 0 || k === undefined) continue;
    if (dir > 0 && k > at) return i;
    if (dir < 0 && k < at) pick = i;
  }
  return dir > 0 ? 0 : pick >= 0 ? pick : forced.length ? forced.length - 1 : n - 1;
}
var stays = new WeakMap(), leaves = new WeakMap();
function tellsHow(e) {
  if (!(e.tagName === "TEXTAREA" || e.isContentEditable || /^(application|textbox)$/.test(e.getAttribute("role") || ""))) return false;
  var r = e.getRootNode(), t = (e.getAttribute("aria-description") || "") + " " + (e.getAttribute("aria-keyshortcuts") || "") + " " + (e.getAttribute("title") || "");
  (e.getAttribute("aria-describedby") || "").split(/\s+/).forEach(function (id) { var x = id && r.getElementById ? r.getElementById(id) : null; if (x) t += " " + x.textContent; });
  return /\b(escape|esc)\b/i.test(t);
}
function multi(e) { return /^(IFRAME|OBJECT|EMBED|AUDIO|VIDEO)$/.test(e.tagName) || !!e.shadowRoot || (e.tagName === "INPUT" && /^(date|datetime-local|month|time|week)$/.test(e.type)); }
function endPress() {
  if (settleT) {
    clearTimeout(settleT);
    settle();
  }
  pressed = 0;
}
function settle() {
  settleT = 0;
  focus();
  if (pressed && current >= 0) {
    check(stops[current]);
    hoverTry(stops[current]);
  }
  if (!pressed || current < 0 || before === -2) {
    if (pressed && before === -2) log("SKIPPED", "Out of order", ["Focus was on the page body, so this Tab press is not judged."]);
    else if (pressed) {
      var o = deep();
      if (o && o !== document.body && o !== document.documentElement && !within(host, o)) log("SKIPPED", "Out of order", ["Tab landed on ", ref(o), ", which is not in the list of stops. Not judged."]);
      else if (!o || !within(host, o)) log("SKIPPED", "Out of order", ["Focus left the page, or went to the browser. Not judged."]);
    }
    pressed = 0;
    return;
  }
  var w0 = before >= 0 ? (before + pressed + stops.length) % stops.length : -1;
  if (w0 >= 0 && w0 !== current && !tabbable(stops[w0])) {
    var fromEl = stops[before], toEl = stops[current];
    rescan();
    current = stops.indexOf(toEl);
    before = stops.indexOf(fromEl);
    if (before < 0) beforeEl = fromEl;
    if (current < 0) {
      log("SKIPPED", "Out of order", ["Tab landed on ", ref(toEl), ", which is not in the list of stops. Not judged."]);
      pressed = 0;
      return;
    }
  }
  var n = stops.length, src = before >= 0 ? null : beforeEl, first = before < 0 && !src;
  var want = before >= 0 ? (before + pressed + n) % n : src ? after(src, pressed) : pressed > 0 ? 0 : n - 1;
  if (before >= 0 && wantEl && stops.indexOf(wantEl) >= 0) want = stops.indexOf(wantEl);
  var landed = popupOf(stops[current]), left = before >= 0 ? popupOf(stops[before]) : src ? popupOf(src) : null;
  if (first && pressed > 0 && !landed && !popMissed) {
    for (var k = 0; k < n && !popMissed; k++) {
      var pop = popupOf(stops[k]);
      if (pop && shown(pop) && blocking(pop)) popMissed = pop;
    }
    if (popMissed) {
      renderJumps();
      announce("A popup blocks the page, but the first Tab went somewhere else.");
      log("PROBLEM", "Out of order", [popName(popMissed), " blocks the page, but the first Tab went to ", ref(stops[current]), "."], aiOf(W_ORDER, "A popup that blocks the page gets keyboard focus first, so the first Tab lands inside it.", "When the popup opens, move focus into it: call .focus() on its first control, or on the popup itself with tabindex=\"-1\". A <dialog> opened with showModal() does this by itself.", [["Popup", popMissed], ["First Tab went to", stops[current]]]));
    }
  }
  var start = before >= 0 ? [ref(stops[before])] : src ? [ref(src)] : ["Start"], back = pressed < 0 ? " (Shift+Tab)" : "";
  if (current === before && current !== want && !landed && !left) {
    var s = stops[current];
    var d = pressed > 0 ? 1 : -1, st = stays.get(s) || stays.set(s, {}).get(s), key1 = d > 0 ? "Tab" : "Shift+Tab", key2 = d > 0 ? "Shift+Tab" : "Tab";
    if (multi(s)) log("SKIPPED", "Out of order", start.concat([" \u2192 ", ref(s), back + ": Tab moved inside it, it has parts of its own (like a date field, a video or a frame). Not judged."]));
    else if (tellsHow(s)) {
      if (!st.how) log("SKIPPED", "Keyboard trap", [ref(s), " keeps Tab, and says how to leave."]);
      st.how = 1;
    } else if (!st[d] && (leaves.get(s) || {})[-d]) {
      st[d] = 1;
      log("OK", "Keyboard trap", [key1 + " stays on ", ref(s), ", but " + key2 + " leaves it, so it is not a trap."]);
    } else if (!st[d] && !st[-d]) {
      st[d] = 1;
      log("SKIPPED", "Keyboard trap", [key1 + " stays on ", ref(s), ". Press " + key2 + ": if focus can't leave that way either, it is a keyboard trap."]);
    } else if (!st[d] && trapped.indexOf(s) < 0) {
      st[d] = 1;
      trapped.push(s);
      renderJumps();
      announce("Keyboard trap: Tab and Shift+Tab both stay on stop " + (current + 1) + ".");
      log("PROBLEM", "Keyboard trap", ["Tab and Shift+Tab both stay on ", ref(s), ": the keyboard can't move focus away."], aiOf(W_TRAP, "Tab or Shift+Tab moves focus away from the element, so a keyboard user can leave it.", "Find the keydown listener on the element or its parents that calls preventDefault() on Tab, or that calls .focus() on the same element again, and let Tab through. If the element needs Tab (a code editor), let Escape move focus out and say so next to it.", [["Element", s], ["Expected next", stops[(current + 1) % n]]]));
    }
    pressed = 0;
    return;
  }
  if (before >= 0 && current !== before) {
    var lv = leaves.get(stops[before]) || leaves.set(stops[before], {}).get(stops[before]), sd = pressed > 0 ? 1 : -1, so = stays.get(stops[before]);
    if (!lv[sd] && so && so[-sd] && !so[sd] && trapped.indexOf(stops[before]) < 0) log("OK", "Keyboard trap", [(sd > 0 ? "Tab" : "Shift+Tab") + " leaves ", ref(stops[before]), ", so it is not a trap."]);
    lv[sd] = 1;
  }
  var skipped = current !== want && !landed && !left ? linkSkip(want, current, pressed > 0 ? 1 : -1) : null;
  if (first && pressed > 0 && landed) log("OK", "Out of order", ["First Tab went into the popup ", popName(landed), "."]);
  else if (skipped) {
    if (!macNote) {
      macNote = true;
      renderJumps();
      log("INFO", "Out of order", [MAC_NOTE]);
    }
    log("SKIPPED", "Out of order", start.concat([" → ", ref(stops[current]), back + ": your browser skipped " + skipText(skipped) + ". Not judged."]));
  } else if (current !== want && !landed && !left && !(popMissed && first)) {
    var from = before >= 0 ? stops[before] : src, to = stops[current], fromText = before >= 0 ? "stop " + (before + 1) : src ? "\"" + label(src) + "\" " + desc(src) : "the start of the page";
    announce("Tab jumped out of order, from " + (before >= 0 ? "stop " + (before + 1) : src ? label(src) : "the start") + " to stop " + (current + 1) + ".");
    if (!jumps.some(function (j) { return j[0] === from && j[1] === to; })) {
      jumps.push([from, to]);
      renderJumps();
    }
    log("PROBLEM", "Out of order", start.concat([" → ", ref(to), back + ", expected ", ref(stops[want]), to.tabIndex > 0 ? ". It has tabindex=\"" + to.tabIndex + "\"." : "."]), aiOf(W_ORDER, "Tab" + (pressed < 0 ? " with Shift" : "") + " moves from " + fromText + " to stop " + (want + 1) + ", the next element in the Tab order.", to.tabIndex > 0 ? "Remove tabindex=\"" + to.tabIndex + "\" from the element Tab jumped to, or set it to 0. A positive tabindex pulls an element ahead of the page order." : "Tab follows the order of the HTML, so a jump comes from a script. Look for code that calls .focus() on focus, blur or keydown near the element Tab left from, and for content added or moved while Tab was pressed. If the element Tab jumped to sits elsewhere in the HTML on purpose, move it next to the one before it.", [["Tab left from", from], ["Tab jumped to", to], ["Expected next", stops[want]]]));
  } else if (current !== want) log("SKIPPED", "Out of order", start.concat([" → ", ref(stops[current]), back + (landed || left ? ": into or inside a popup, allowed." : ": the popup that blocks the page is listed already.")]));
  else log("OK", "Out of order", start.concat([" → ", ref(stops[current]), back + ", next in line."]));
  pressed = 0;
}
function inPanel() {
  var a = root.activeElement;
  return !!a && panel.contains(a);
}
function panelCtl() {
  return [].filter.call(panel.querySelectorAll("button,a,input"), function (e) { return !e.disabled && e.getClientRects().length > 0; });
}
function enter() {
  endPress();
  if (walking) stopWalk("Paused by " + KEYS + walkedText());
  var a = deep();
  pRet = a && a !== document.body && a !== document.documentElement && a !== host && a.getRootNode() !== root ? a : null;
  panelIn = true;
  skipPanel();
  play.focus({ focusVisible: true });
}
function back() {
  var r = pRet;
  panelIn = false;
  pRet = null;
  skipPanel();
  if (r && r.isConnected) r.focus({ focusVisible: true });
  else {
    var a = root.activeElement;
    if (a && a.blur) a.blur();
  }
}
function key(e) {
  if (e.code === "KeyF" && e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
    e.preventDefault();
    e.stopPropagation();
    if (inPanel()) back();
    else enter();
    return;
  }
  if (e.key !== "Tab" && settleT) endPress();
  lastKey = e.key;
  keyT = Date.now();
  keyOn = deep();
  if (walking && (e.key === " " || e.key === "Tab" || e.key === "Escape")) {
    if (e.key === " ") e.preventDefault();
    stopWalk("Paused by " + (e.key === " " ? "Space" : e.key) + walkedText());
    if (e.key !== "Tab") return;
  }
  if (panelIn && inPanel()) {
    if (e.key === "Escape") {
      e.preventDefault();
      return back();
    }
    if (e.key === "Tab" && skip.checked) {
      var l = panelCtl(), i = l.indexOf(root.activeElement), n = l.length;
      e.preventDefault();
      if (n) l[i < 0 ? 0 : (i + (e.shiftKey ? -1 : 1) + n) % n].focus({ focusVisible: true });
      return;
    }
  }
  var fa = deep(), onBody = !fa || fa === document.body || fa === document.documentElement;
  if (e.key === "Escape" && !modal() && !(openPop && !gone(openPop)) && (onBody || inPanel())) close();
  if (e.key === "Tab") {
    endPress();
    fa = deep();
    pressed = e.shiftKey ? -1 : 1;
    before = current < 0 && lost ? -2 : current;
    beforeEl = current < 0 && !lost && fa && fa !== document.body && fa !== document.documentElement && !within(host, fa) ? fa : null;
    wantEl = null;
    for (var k = 1, n = stops.length; before >= 0 && k < n; k++) {
      var c = stops[(((before + pressed * k) % n) + n) % n];
      if (tabbable(c)) {
        wantEl = c;
        break;
      }
    }
    settleT = setTimeout(settle, 150);
  }
}
function pick(e) {
  var g = e.target.closest && e.target.closest("g.o");
  if (!g) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.type !== "click") return;
  var s = stops[+g.getAttribute("data-i")];
  if (!s) return;
  endPress();
  s.focus({ preventScroll: true, focusVisible: true });
  focus();
}
function close() {
  closed = true;
  stopWalk();
  removeEventListener("pointerdown", interrupt, true);
  removeEventListener("pointerdown", tap, true);
  removeEventListener("scroll", onMoved, true);
  removeEventListener("resize", onMoved);
  removeEventListener("resize", keepIn);
  if (fit) fit.disconnect();
  watch.disconnect();
  if (timer) clearTimeout(timer);
  if (idle && window.cancelIdleCallback) cancelIdleCallback(idle);
  if (sayT) clearTimeout(sayT);
  if (settleT) clearTimeout(settleT);
  removeEventListener("keydown", key, true);
  removeEventListener("focusin", focus, true);
  removeEventListener("focusout", lose, true);
  if (tabPoll) clearInterval(tabPoll);
  if (logTab && !logTab.closed && tabNote) tabNote.hidden = false;
  if (window.__tabTrail === api) delete window.__tabTrail;
  if (ownName) window.name = "";
  host.remove();
}
var grab = null;
panel.addEventListener("pointerdown", function (e) {
  if (e.button !== 0 || e.target.closest("button,a,ul,label")) return;
  var r = panel.getBoundingClientRect();
  grab = [e.clientX - r.left, e.clientY - r.top];
  panel.setPointerCapture(e.pointerId);
  panel.classList.add("g");
});
panel.addEventListener("pointermove", function (e) {
  if (!grab) return;
  var x = Math.min(Math.max(e.clientX - grab[0], 0), innerWidth - panel.offsetWidth);
  var y = Math.min(Math.max(e.clientY - grab[1], 0), innerHeight - panel.offsetHeight);
  panel.style.left = x + "px";
  panel.style.top = y + "px";
  panel.style.right = "auto";
  panel.style.bottom = "auto";
});
function drop() { grab = null; panel.classList.remove("g"); }
function keepIn() {
  if (closed) return;
  var r = panel.getBoundingClientRect(), m = 8;
  if (!r.height || (r.top >= m && r.bottom <= innerHeight - m && r.left >= m && r.right <= innerWidth - m)) return;
  panel.style.top = Math.min(Math.max(r.top, m), Math.max(m, innerHeight - m - r.height)) + "px";
  panel.style.left = Math.min(Math.max(r.left, m), Math.max(m, innerWidth - m - r.width)) + "px";
  panel.style.right = "auto";
  panel.style.bottom = "auto";
}
var fit = window.ResizeObserver ? new ResizeObserver(keepIn) : null;
if (fit) fit.observe(panel);
addEventListener("resize", keepIn);
panel.addEventListener("pointerup", drop);
panel.addEventListener("pointercancel", drop);
host.__close = close;
function mainOf(e) {
  var first = null;
  for (var i = 0; i < e.p.length; i++) {
    var x = e.p[i];
    if (typeof x === "string" || !x.el) continue;
    if (i && typeof e.p[i - 1] === "string" && /\u2192 $/.test(e.p[i - 1])) return x;
    if (!first) first = x;
  }
  return first;
}
var api = {
  report: function () { return aiText(); },
  log: function () {
    return logs.map(function (e) {
      var m = mainOf(e);
      return { time: clock(e.t), result: e.k, check: e.f, wcag: wcagOf(e) || null, text: e.p.map(partText).join(""), fixed: !!e.fixed, selector: m ? sel(m.el) || null : null, stop: m && m.n ? m.n : null };
    });
  },
  play: function (o) {
    o = o || {};
    var skipOut = [].concat(o.ignore || []);
    for (var i = 0; i < skipOut.length; i++) {
      try { document.querySelector(skipOut[i]); } catch (x) { return Promise.reject(new Error("Tab trail: \"" + skipOut[i] + "\" in ignore is not a valid CSS selector.")); }
    }
    ignore = skipOut;
    walkDelay = typeof o.delay === "number" && o.delay >= 0 ? o.delay : 400;
    return new Promise(function (res) {
      walkDone.push(res);
      if (!walking) {
        walked = new Set();
        startWalk();
      }
    });
  },
  problems: function () { return problemsOf(openProbs()); },
  state: function () { return { walked: walkedN(), total: stops.length, done: !walking && walkEnd === "done" && stops.every(function (x) { return hidTested.has(x); }), untested: untested() }; },
  version: VERSION,
  close: function () { close(); }
};
window.__tabTrail = api;
x.addEventListener("click", close);
addEventListener("scroll", onMoved, { capture: true, passive: true });
addEventListener("resize", onMoved);
watch.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class", "hidden", "tabindex", "disabled", "inert", "href", "role", "open"] });
addEventListener("keydown", key, true);
addEventListener("pointerdown", interrupt, true);
addEventListener("pointerdown", tap, true);
addEventListener("focusin", focus, true);
addEventListener("focusout", lose, true);
root.addEventListener("focusin", function () {
  if (root.activeElement === panel && panel.tabIndex < 0) return panel.blur();
  focus();
});
root.addEventListener("focusout", function () {
  setTimeout(function () {
    if (!panelIn || closed || inPanel()) return;
    var a = deep();
    if ((!a || a === document.body || a === document.documentElement) && Date.now() - tapT > 600) return play.focus({ focusVisible: true });
    panelIn = false;
    pRet = null;
    skipPanel();
  }, 0);
});
["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(function (t) {
  dot.addEventListener(t, pick);
  dotPg.addEventListener(t, pick);
});
review();
focus();
draw();
})();
