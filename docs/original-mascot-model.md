# ivmz オリジナル3Dマスコット v1（試作モデル）

## 位置づけ
Epic #99 / Issue #103の3Dマスコット実装用**オリジナル試作アセット**。サイトに表示して完成と判断する前に、人物/キャラクターの見た目と歩行・走行モーションをレビューする必要がある。

## 成果物

- `public/mascot/ivmz-mascot-v1.glb`：glTF 2.0 Binary (GLB)、埋め込みバッファ。約126KB。
- `scripts/build-original-mascot.mjs`：外部アセットを利用せず、数学的に生成した3D幾何・ボーンとAnimationClipを出力する再現可能なNodeスクリプト。
- `src/lib/mascot-original-asset.test.ts`：構造・アニメクリップ・リグ・バイナリ再現性のCIテスト。

デザインは白い丸型マスコット、青い靴とイヤーチップ、紫の瞳を持つ低負荷の3D形状。オリジナルの球体パーツで制作しており、他社の3Dモデルやライセンス素材は使用していない。ユーザーの最終キャラクターデザインの承認はまだ受けていない。

## ボーンとアニメ

- `left_leg`、`right_leg`：左右の脚の前後スイング
- `left_arm`、`right_arm`：脚と反対方向の腕振り
- `head`：左右の軽い首振り
- `body`：待機と歩行・走行による上下の重心移動

GLBに`idle`（2秒）、`walk`（0.8秒）、`run`（0.45秒）の3クリップを同梱。動きは**実際の関節回転・上下位置移動のタイムライン**であり、平面画像の位置移動ではない。ただしシンプルなプロシージャルモーションであり、着地や接地判定・足裏IKは未実装。

## 再生成と検証

- `node scripts/build-original-mascot.mjs`：GLBを生成・上書きする。実行前に既存内容との差分をレビューする。
- `node scripts/build-original-mascot.mjs --check`：既存GLBと**バイト単位で一致**することを確認し、異なる場合はエラー終了する。既存ファイルを更新しない。
- `pnpm test`：GLB構造・ボーン・アニメ・生成再現性を検証。
- 既存[Draft PR #118](https://github.com/mizzz-ivr/ivmz-home/pull/118)のGLB検収ゲートとの統合テストは、PRが同じブランチに統合された後に実施する。

## ブラウザ表示に向けて

1. PR #117の追従制御とPR #119のAnimationAction互換controllerを統合する。
2. GLTFLoaderでGLBをロードし、AnimationMixerで`idle/walk/run`をループ再生する。
3. Desktopの細かいポインター操作に追従、歩き・走りと移動速度を一致させる。
4. 2Dペットと排他にし、reduced-motion/モバイル/Canvas context lost/読み込み失敗時はWebGLを停止する。
5. 3Dのビジュアル・足運びとGPU/CPU・LCP/INP/CLSを実機とPreviewで確認する。

**このアセットだけではサイトで3Dが動くわけではない。** 先に素材と実アニメを用意している段階。正式採用と公開にはデザインレビューとブラウザ統合が必要。

## 権利・セキュリティ・性能
スクリプトとメッシュは本リポジトリ内で独自に作成したもので、外部フォント/テクスチャ/他者キャラクターデータを使用しない。GLBにネットワークアクセスやスクリプトは含まれない。5MiB以内、mesh 1、joint 6、clip 3で軽量にする。変更時はCIと視覚確認を実施。
