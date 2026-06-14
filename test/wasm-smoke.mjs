// wasm-smoke.mjs — gesture-player の wasm が native と同じ bone offset を出すか検証。
//   node test/wasm-smoke.mjs

import { readFileSync } from "node:fs";

const mod = await WebAssembly.compile(
  readFileSync(new URL("../build/gesture.wasm", import.meta.url)),
);
const imports = {};
for (const i of WebAssembly.Module.imports(mod)) {
  (imports[i.module] ??= {})[i.name] = () => 0;
}
const { exports: ex } = await WebAssembly.instantiate(mod, imports);
try { ex._start(); } catch { /* proc_exit */ }

const near = (a, b) => Math.abs(a - b) < 1e-3;
let ok = true;
const check = (name, got, want) => {
  if (!near(got, want)) { console.error(`FAIL ${name}: ${got} != ${want}`); ok = false; }
};

// nod (id 4): head_x (ch 0) は u=0.25 で 0.22 (1山目), u=0.5 で 0 (谷)
check("nod head_x @0.25", ex.gesture_ch(4, 0, 0.25), 0.22);
check("nod head_x @0.5", ex.gesture_ch(4, 0, 0.5), 0.0);
check("nod head_y @0.25", ex.gesture_ch(4, 1, 0.25), 0.0);
// banzai (id 0): plateau u=0.5 で upperarm が ±2.0
check("banzai l_ua @0.5", ex.gesture_ch(0, 6, 0.5), -2.0);
check("banzai r_ua @0.5", ex.gesture_ch(0, 7, 0.5), 2.0);
// 範囲外は 0
check("out-of-range", ex.gesture_ch(0, 7, 1.5), 0.0);
// duration
check("nod duration", ex.gesture_duration(4), 0.95);
check("banzai duration", ex.gesture_duration(0), 2.0);

if (ok) {
  console.log("wasm OK — gesture channels + durations match native");
} else {
  process.exit(1);
}
