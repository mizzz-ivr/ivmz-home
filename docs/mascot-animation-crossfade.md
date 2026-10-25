# 3Dマスコットのアニメーションクリップ接続設計

関連：Epic #99、Issue #103、PR #117（移動・状態）、PR #118（GLB検査）。

## 目的

`idle/walk/run`を選択する既存ロジックと、将来採用するGLBのAnimationClip再生をつなぐ。**モデル自体の描画は本PRの対象外**として、アニメーション制御を単体テストで確定する。

## 新たな実装

`src/lib/mascot-clip-controller.ts` はThree.js `AnimationAction`と互換性のある最小インターフェイスを受け取り、再生・クロスフェード・停止・破棄を行う。

- `createMascotClipController({ idle, walk, run })` は3アクションが実在すること、必要な操作が実装されていること、参照が重複していないことを検証する。欠落・不整合はnullで拒否。
- `transitionTo(state)` は前の状態を `fadeOut` して新状態を `reset().fadeIn().play()` する。同じ状態なら再操作しない。通常の切替時間は0.2秒、許容範囲0〜0.5秒。
- `stop()` はタブ非表示・ユーザーによる停止・WebGL context lost時のループ停止用。**クロスフェード中の旧クリップも含め、以前再生したアクションをすべて停止**する。後から `idle` で再開できる。
- `dispose()` は3クリップを停止して再開できない状態へ移す。モデルを差し替えるときやReactコンポーネントをアンマウントするときに必ず呼ぶ。

## Three.jsを接続する際の責務

1. 著作権・容量とGLB構造の受け入れが済んだモデルを`GLTFLoader`で読み込む。
2. `gltf.animations`から厳密な`idle`、`walk`、`run`の名前を探し、それぞれ`AnimationMixer.clipAction(clip)`を生成する。ループ/時間スケールをrenderer側で設定する。
3. `createMascotClipController`へ渡し、ロジック`resolveMascotLocomotion` / `stepMascotFollow`の返すstateを`transitionTo`へ渡す。
4. モデルの位置・向きは`stepMascotFollow`が決め、画面座標からThree.js座標へrenderer側で変換する。
5. レンダラーがフレームごとに`AnimationMixer.update(delta)`を呼ぶ。**React stateを毎フレーム更新しない**。
6. reduced-motion / hover:none / ウィンドウ非表示 / WebGL失敗時はループを停止する。ユーザーが無効化した際にWebGLやネットワークが起動しないことを検証する。
7. 旧PR #78の2Dペットと同時起動させない。移行は表示設定とマウスイベントの一元管理後に行う。

## 注意と受け入れ条件

- ここでのユニットテストが保証するのは**呼び出し順序と停止操作**のみ。Three.jsへの正しいバインドやスキンメッシュの足運びはモデルを使用したE2E・映像レビューで別途確認する。
- `turn`は方向補間で表現し、`stop`は移動が止まって`idle`になる状態とする。モデルに個別Clipがあれば後続で導入を検討する。
- AnimationMixerを3D描画用クライアント境界外（Next.js SSRなど）から実行しない。
- 3D追加時はfps、JS/GLB転送量、LCP/INP/CLS、Canvas重なり、ポインター非干渉を比較。
- ユーザーのデータ・AI・CMS・認証などの機能変更なし。Productionには承認まで反映しない。
