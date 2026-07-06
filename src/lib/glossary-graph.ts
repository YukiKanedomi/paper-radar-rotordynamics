// 用語の関係マップ（手キュレーション部分）。
// カテゴリ（テーマ分類）と、意味的なエッジ（関係）を定義。
// これに加えて「同じ論文に出た用語どうし」の自動エッジ（共起）をランタイムで合成する。
// term 名は data/papers.json の terms[].term と完全一致させること。

export interface GraphCategory {
  key: string;
  label: string;
  color: string;
  terms: string[];
}

export interface CuratedEdge {
  from: string;
  to: string;
  label?: string;
}

export const CATEGORIES: GraphCategory[] = [
  {
    key: "foil",
    label: "フォイル軸受・気体潤滑",
    color: "#1a5e54",
    terms: [
      "コンプライアンス",
      "バンプフォイル",
      "偏心率 ε",
      "コンプライアンス数 Λc",
      "最小膜厚",
      "リフトオフ",
      "負荷容量",
      "トップフォイル",
      "ヘリンボーン溝",
      "スラスト軸受",
      "ガスフォイル軸受",
      "負荷容量係数 D",
    ],
  },
  {
    key: "motion",
    label: "運転挙動・軌跡",
    color: "#8a6d3b",
    terms: [
      "軸心軌跡",
      "姿勢角",
      "ホワール",
      "旋回運動",
      "アンバランス応答",
      "運転たわみ形状",
      "Campbell図",
      "パラメトリック励振",
      "疑似線形挙動",
    ],
  },
  {
    key: "experiment",
    label: "実験・計測",
    color: "#5f7a8a",
    terms: [
      "デュアルドライブ",
      "反動タービン",
      "衝動タービン",
      "非接触計測",
      "能動磁気軸受",
      "不確かさ定量化",
    ],
  },
  {
    key: "stability",
    label: "ロータの安定性・動特性",
    color: "#b4451f",
    terms: [
      "対数減衰率",
      "軸受の剛性・減衰係数",
      "危険速度",
      "交差剛性",
      "有効減衰",
      "傾き・モーメント係数",
      "クーロン摩擦減衰",
      "分離余裕",
      "内部減衰",
      "異方性軸受剛性",
      "固有振動数",
      "曲げ振動数",
      "接触剛性",
    ],
  },
  {
    key: "seal",
    label: "シール・環状ギャップ",
    color: "#4a6fa5",
    terms: [
      "ラビリンスシール",
      "ロマキン効果",
      "環状ギャップ",
    ],
  },
];

export const CURATED_EDGES: CuratedEdge[] = [
  { from: "バンプフォイル", to: "コンプライアンス", label: "生む" },
  { from: "コンプライアンス", to: "コンプライアンス数 Λc", label: "無次元化" },
  { from: "偏心率 ε", to: "軸受の剛性・減衰係数", label: "動作点で変化" },
  { from: "軸受の剛性・減衰係数", to: "対数減衰率", label: "安定性を左右" },
  // --- 起動過渡（Yu & Wang 2026） ---
  { from: "偏心率 ε", to: "最小膜厚", label: "対応" },
  { from: "最小膜厚", to: "リフトオフ", label: "浮上の判定" },
  { from: "姿勢角", to: "軸心軌跡", label: "釣合い位置" },
  // --- シールと安定性（Ashraf & Untaroiu 2026） ---
  { from: "ロマキン効果", to: "ラビリンスシール", label: "求心力を与える" },
  { from: "ラビリンスシール", to: "交差剛性", label: "流体力が生む" },
  { from: "交差剛性", to: "ホワール", label: "前向き旋回を駆動" },
  { from: "交差剛性", to: "有効減衰", label: "差し引いて評価" },
  { from: "有効減衰", to: "対数減衰率", label: "安定性の目安" },
  // --- 実験ベンチ（Yu & Wang 2026 / Kuhr 2022） ---
  { from: "デュアルドライブ", to: "リフトオフ", label: "起動を助ける" },
  { from: "反動タービン", to: "デュアルドライブ", label: "起動側" },
  { from: "衝動タービン", to: "デュアルドライブ", label: "加速側" },
  { from: "非接触計測", to: "姿勢角", label: "乱さず測る" },
  { from: "能動磁気軸受", to: "旋回運動", label: "で加振" },
  { from: "旋回運動", to: "傾き・モーメント係数", label: "を同定" },
  { from: "不確かさ定量化", to: "傾き・モーメント係数", label: "信頼区間を付す" },
  { from: "環状ギャップ", to: "交差剛性", label: "流体力を生む" },
  { from: "環状ギャップ", to: "ラビリンスシール", label: "共通の要素" },
  { from: "傾き・モーメント係数", to: "危険速度", label: "固有値に効く" },
  // --- 負荷容量ROTとフォイル構造（DellaCorte & Valco 2000） ---
  { from: "トップフォイル", to: "バンプフォイル", label: "圧力を伝える" },
  { from: "バンプフォイル", to: "負荷容量", label: "設計が高める" },
  { from: "負荷容量", to: "クーロン摩擦減衰", label: "トレードオフ" },
  // --- ヘリンボーン溝スラスト軸受（Panda & Behera 2026） ---
  { from: "ヘリンボーン溝", to: "負荷容量", label: "発熱を抑え高める" },
  // --- アンバランス応答とODS（Ying & Liu 2025） ---
  { from: "ガスフォイル軸受", to: "軸受の剛性・減衰係数", label: "力-変位モデルを持つ" },
  { from: "軸受の剛性・減衰係数", to: "アンバランス応答", label: "モデルに使う" },
  { from: "アンバランス応答", to: "運転たわみ形状", label: "変位パターンで説明" },
  { from: "危険速度", to: "分離余裕", label: "運転速度との差で定義" },
  { from: "危険速度", to: "Campbell図", label: "速度依存の固有振動数で示す" },
  // --- オープンソースフォイル軸受（DellaCorte et al. 2008） ---
  { from: "バンプフォイル", to: "負荷容量係数 D", label: "支持の複雑さが左右する" },
  { from: "トップフォイル", to: "コンプライアンス", label: "たわみで荷重を伝える" },
  // --- 内部減衰とロータ安定性（Zorzi & Nelson 1977） ---
  { from: "内部減衰", to: "ホワール", label: "非同期の前向き旋回を誘発" },
  { from: "異方性軸受剛性", to: "内部減衰", label: "由来の不安定化を抑える" },
  // --- 低速パラメトリック励振バランシング（Dolev, Tresser & Bucher 2018） ---
  { from: "パラメトリック励振", to: "疑似線形挙動", label: "非線形フィードバックの調整で実現" },
  { from: "疑似線形挙動", to: "アンバランス応答", label: "低速のまま検出可能にする" },
  // --- 特別号：高速PMロータの固有振動数解析（Huang & Le 2018・抄録ベース） ---
  { from: "固有振動数", to: "曲げ振動数", label: "曲げモードの固有値" },
  { from: "接触剛性", to: "曲げ振動数", label: "組立部の剛性が左右" },
  { from: "曲げ振動数", to: "危険速度", label: "曲げ危険速度に直結" },
];

const CAT_OF = new Map<string, GraphCategory>();
for (const c of CATEGORIES) for (const t of c.terms) CAT_OF.set(t, c);

export function categoryOf(term: string): GraphCategory | undefined {
  return CAT_OF.get(term);
}
