# fizz-gesture-player

Fizz の **ジェスチャ計算コア**。one-shot ジェスチャ(banzai/rage/slump/relax/nod/
shake/tilt/shrug)のボーンオフセットを、ジェスチャ ID と進捗 `u` (0..1) から計算する。

設計: **envelope(timing/curve)× amplitude(どのボーンにどれだけ)= channel offset**。
lipsync / idle-motion と同じく DSP を Almide で 1 回書き、native と wasm の両方で使う。
ブラウザはジェスチャ開始時刻を持ち、毎フレーム `u` を計算してここを呼び、返った
オフセットを idle clip に**加算合成**して VRM ボーンに適用する(適用 = Three.js の
I/O は JS グルーが担当)。移植元: openaituber `src/vrm/idle.ts`。

## ジェスチャ / チャンネル

| id | gesture | | ch | channel |
|---|---|---|---|---|
| 0 | banzai (喜) | | 0 | head_x (pitch) |
| 1 | rage (怒) | | 1 | head_y (yaw) |
| 2 | slump (哀) | | 2 | head_z (roll) |
| 3 | relax (楽) | | 3 | spine_x |
| 4 | nod | | 4 | leftShoulder.z |
| 5 | shake | | 5 | rightShoulder.z |
| 6 | tilt | | 6 | leftUpperArm.z |
| 7 | shrug | | 7 | rightUpperArm.z |

## ① native — precompute / 確認

```sh
almide build src/main.almd -o build/fizz-gesture-player
FIZZ_GESTURE=4 FIZZ_GESTURE_FPS=30 ./build/fizz-gesture-player   # 4 = nod
# {"u":0.26,"head_x":0.218,...}  ← うなずき 2 山
```

## ② wasm — requestAnimationFrame

```sh
almide build src/bridge.almd --target wasm -o build/gesture.wasm
```

エクスポート: `gesture_ch(gid, ch, u) -> Float`(channel オフセット)/
`gesture_duration(gid) -> Float`。引数は Float(JS から number で呼べる、BigInt 不要)。
ブラウザ側グルー例は [`browser/gesture-driver.js`](./browser/gesture-driver.js):

```js
const gp = await loadGestures("/gesture.wasm");
gp.play("nod");                  // 返答時などに発火
// raf ループ内で gp.apply(vrm);  // idle に加算合成
```

wasm が native と一致することを CI(`test/wasm-smoke.mjs`)で検証。

## 開発

```sh
almide check src/main.almd
almide test spec/gesture_player_test.almd
almide build src/main.almd -o build/fizz-gesture-player
almide build src/bridge.almd --target wasm -o build/gesture.wasm
```

ツールチェーン: [almide](https://github.com/almide/almide) v0.27.6+。依存なし。
