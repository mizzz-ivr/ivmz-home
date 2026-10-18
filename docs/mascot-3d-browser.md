# ブラウザの3Dマスコット追従と運用基準

関連：Epic #99、Issue #103 / #106、PR #117（追従）、#118（GLB検査）、#119（AnimationAction制御）、#120（実GLB）、本Draft PR #121（Three.js表示）。

## 実装範囲

- `src/components/site/Mascot3D.tsx` はclient-onlyのCanvasを配置し、ユーザーがfine pointerを動かした際、3Dの利用が許可されている場合に限り`three`と`GLTFLoader`を動的importする。
- `/mascot/ivmz-mascot-v1.glb`は自前の静的ファイル。認証や外部サービス/テクスチャへの通信は不要。
- GLTFLoaderで復号後、3つのAnimationClipをAnimationMixerへ接続し、既存Controllerがidle/walk/runをcrossfade。
- `stepMascotFollow`で毎フレームの位置・旋回角を計算し、GPUに描画。React stateの毎フレーム更新を避ける。
- WebGL canvasは固定表示だがpointer-events:none、aria-hidden、レイアウトへの影響なし。モデルの最大Canvasは156×184 CSS px、ピクセル比最大1.5、描画は最大45fpsを目指す。
- フッターのユーザー設定と同じ`ivmz-follow-pet`にON/OFFを保存。storageが使用できないブラウザでも同一タブ内の選択を維持。

## 作動条件と失敗時

- fine pointer/hoverが使えるデスクトップ・reduced-motion設定なし・ユーザー設定ON・ページ可視の条件でのみ読み込む。
- モデルダウンロードとGLTFLoader失敗時は透明な非干渉Canvasのままとし、本文は表示できる。
- tabが非表示の間は描画とアニメを一時停止。復帰時はイベントに応じ再開。
- ブラウザのWebGL context lost、動き軽減やON/OFF切り替え時にAnimationMixer・ジオメトリ・材質・WebGLRendererを破棄。
- タッチ端末や動き軽減環境でGLBやThree.jsの読み込みを発生させない。

## 既存PRとマージ依存

- **PR #78の2Dペットと3Dを同時公開しない。** #78は暫定MVPであり、3Dを正式採用する場合は2D描画のマージを見送るか3D側に置換する。共通保存キー/イベントを再利用するが2つの画面表示を同時に追加しない。
- このPRは **#120（GLB）をbaseにした積み上げDraft PR**。ほか #117 / #119 と同一の検証済み純粋関数を統合している。先にコンポーネントPRをマージする場合、差分衝突を修正してE2Eを再実行する。
- #118のGLB検査はランタイム負荷を抑えるためデプロイ前検査で利用し、WebGLの描画・脚のIKの正しさは別途確認する。

## 動作・ビジュアル・性能の追加受入条件

- [ ] PC実機で3Dの立体感、目と耳の造形、脚の回転・腕振り・idle/walk/runの見た目を確認する
- [ ] 曲がる時の向き、境界、重心・足の接地を実測し必要に応じAnimationClipを調整する
- [ ] Canvasがリンク・フォーム・ナビゲーションを邪魔しない
- [ ] pointer/fine無し、prefers-reduced-motion、WebGL context lost、GLB 404、ネットワーク遅延で主要コンテンツが動作する
- [ ] 375px、768px、1440px、Chrome/Edge/Safari/Firefoxの操作回帰
- [ ] JS/GLBの転送量・GPU/CPU/fps・LCP/INP/CLSを既存サイトと比較し、明確に重い場合は品質設定・無効化を選択する
- [ ] E2Eの安定稼働、Netlify Preview Smoke、第三者アセットの混入なし
- [ ] アバターとの類似度とデザイン完成度についてオーナー承認

このPRの自動テストが緑でも、ビジュアルと各端末の体感性能が未確認なら本番マージしない。

## main向け統合Deploy Preview（2026-10-18）

- PR #121を一時的に`main`ベースとし、PR #120の実GLBと表示実装を合わせた状態でNetlify Deploy Previewを生成する。**Draftのままでマージはしない**。PR #120に先行して本番へ公開しない。
- React hydrationより早くマウスが動くテスト不安定性を解消。Canvasは`data-ready="true"`でpointerリスナー準備完了を示し、E2Eはその後に操作する。コミット`44655c0`においてGitHub CI/E2E成功。
- GLB取得/WebGL初期化が失敗した場合、マウス移動ごとの連続再試行を防止。明示的なペット設定変更で再試行できる。失敗時も主要導線を操作できることをE2Eで検証。コミット`93a30b0`でGitHub CI/E2E成功。
- Netlify Previewで目視確認する項目：3Dモデルが白/青/紫のオリジナル造形になっているか、移動方向への向き・歩幅・足運びが自然か、待機から走行への切替が分かるか、背景の透過・フォーム非干渉・OFF設定が機能するか。
- GPU負荷・LCP/INP/CLS・WebGL Context Lost・Safari/モバイルでの実機確認が揃うまで**レビュー停止**とする。


## モバイルのオンデマンド表示（Issue #125）

- タッチ端末には48px以上の小型「✦ 3D」ボタンだけを出す。初期状態で3D Canvasは非表示、GLBとThree.jsを要求しない。
- ユーザーがボタンをタップした場合のみ、画面左下のコンパクトな固定プレビューを表示。カーソル追従はせず、`idle` Clipのみを再生。
- 再タップ、プレビュー外のタップ、Escapeで閉じる。Canvasは`pointer-events:none`・`aria-hidden=true`を維持し、閉じるとRAF/GLTF/WebGLリソースを破棄する。
- **表示中かどうかはsession/localStorageへ永続化しない**。再ロード・ページ遷移で毎回閉じた状態に戻す。フッター設定の明示OFFは従来どおり優先する。
- Reduced MotionではトリガーとCanvasを隠し、3Dを読み込まない。デスクトップfine pointerの追従は従来どおり。
- 関連テスト：mobile WebKitで初期DL=0、タップ後GLB取得、再タップ/外タップ・再読込・OFF・reduced-motion、デスクトップの追従回帰。
- 未確認：実機iOS Safari/Androidと低メモリ/WebGL loss時の挙動、320/375/390px・Chatとの重なり、GPU/INP/CLS。プレビュー目視と性能検証が完了するまで本番マージ不可。
