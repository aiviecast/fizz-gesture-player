// gesture-driver.js — gesture-player の wasm をブラウザの raf から駆動するグルー例。
// 値の計算は Almide(wasm)、VRM ボーンへの加算合成は Three.js(JS)。
//
//   const gp = await loadGestures("/gesture.wasm");
//   gp.play("nod");   // コメント返答時などに呼ぶ
//   // raf ループ内で gp.apply(vrm) を毎フレーム呼ぶ

const GESTURES = ["banzai", "rage", "slump", "relax", "nod", "shake", "tilt", "shrug"];
// channel id → (boneName, axis)
const CH = [
  ["head", "x"], ["head", "y"], ["head", "z"], ["spine", "x"],
  ["leftShoulder", "z"], ["rightShoulder", "z"],
  ["leftUpperArm", "z"], ["rightUpperArm", "z"],
];

export async function loadGestures(wasmUrl) {
  const bytes = await (await fetch(wasmUrl)).arrayBuffer();
  const mod = await WebAssembly.compile(bytes);
  const imports = {};
  for (const i of WebAssembly.Module.imports(mod)) {
    (imports[i.module] ??= {})[i.name] = () => 0;
  }
  const { exports: ex } = await WebAssembly.instantiate(mod, imports);
  try { ex._start(); } catch { /* proc_exit */ }

  let active = -1;
  let startT = 0;

  return {
    play(name) {
      const id = GESTURES.indexOf(name);
      if (id < 0) return;
      active = id;
      startT = Date.now() / 1000;
    },
    // raf ループで毎フレーム呼ぶ。idle clip 適用の「後」に加算するのが前提。
    apply(vrm) {
      if (active < 0) return;
      const dur = ex.gesture_duration(active);
      const u = (Date.now() / 1000 - startT) / dur;
      if (u >= 1) { active = -1; return; }
      const h = vrm.humanoid;
      for (let ch = 0; ch < CH.length; ch++) {
        const off = ex.gesture_ch(active, ch, u);
        if (off === 0) continue;
        const [bone, axis] = CH[ch];
        const node = h?.getNormalizedBoneNode?.(bone);
        if (node) node.rotation[axis] += off;   // idle に加算合成
      }
    },
  };
}
