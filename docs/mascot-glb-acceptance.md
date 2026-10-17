# オリジナル3DマスコットのGLB検収ゲート

関連: Epic #99 / 3D #103 / 性能 #106 / 初期追従制御 PR #117。

## 検収の目的

実際の3DモデルをWebGLランタイムへ組み込む**前に**、権利確認済み候補アセットのバイナリ形式・素材分離・アニメーションの最低条件を検証する。

`src/lib/mascot-glb.ts` の `inspectMascotGlb` は、GLBの **構造上の受け入れ条件**を返す。モデル本体はまだリポジトリに存在しない。バリデーターは3D描画やGLBロードを実行しない。

## 必須受け入れ条件

- GLB 2.0、1ファイル **5 MiB以下**（初期予算、品質と測定結果で変更可）。
- GLBのJSON chunk +埋め込みBIN chunkを持ち、外部テクスチャURLや外部バッファ、追加decoder必須の拡張を使わない。
- 3D mesh、skin、jointを持ち、少なくとも1つのmesh nodeがskinを参照する。
- `idle`、`walk`、`run`の異なる名前のAnimationClipが存在し、各Clipに関節対象のchannelが少なくとも1本ある。
- 目標上限はメッシュ20、ノード128、関節96/skin、アニメ12、画像8。
- 生成者・素材の由来、改変/公開/商用利用の権限が確認できる。第三者のキャラクターや外部URLを無断流用しない。
- 同等の2Dスプライトではなく、本当に立体感のある造形で、歩行・走行中の**足運び・重心移動・速度差が視覚的に見える**。

## 検査の適用

開発者が候補GLBのバイト列を用意し、`inspectMascotGlb(new Uint8Array(...))`の`ok`と`reason`を確認する。静的アセットの取り込みPRにはこの結果を含める。将来はアセット登録専用CIでファイル全体を検査し、モデルがない環境でも静的サイトが正常に動くようにする。

合格しても **見た目、AnimationSamplerの実データ、glTF構造すべての妥当性、性能、権利は保証されない**。これは第一段階の保守的なメタデータゲートであり、最終的な検収にはGLTFLoaderでのロード、骨の動作、モーション切替、モデル表示・シルエット確認が必要。

## 実装時の接続境界

1. オリジナルモデルの三面図とrigged GLBを制作/承認。
2. バイナリ検査 → GLTFLoaderとAnimations（Three.js/React Three Fiberは選定後）。
3. PR #117の`stepMascotFollow`で位置と回転、`resolveMascotLocomotion`でアニメーション名を決定。
4. `AnimationMixer`等で`idle/walk/run`のクリップをloop再生・crossfadeする。Clip名の一致だけで足運びを保証しないので実際に確認。
5. ON/OFF・reduced-motion・fine pointerの条件とWebGL失敗/ロード失敗での停止を追加。2DのPR #78との二重動作はしない。
6. 本番導入はCI/Preview/速度計測/レビュー承認を経て別のPRで行う。

## テスト条件

- 正常なGLB、アニメ3種・joint対象channelを受け入れる。
- GLB magic/version/byteLength/chunkの破損や過大サイズを拒否。
- 実skinのないモデル、joint motionのないアニメ、必須クリップの欠落を拒否。
- 外部素材やdecoderが必要なGLBを予期せず取り込まない。
- 実モデル導入後にWebGL Context Lost、hidden tab、低性能PC、モバイル、reduced-motionを検証する。

今回の検査を「3D追従キャラの完成」としてIssue #103を閉じない。
