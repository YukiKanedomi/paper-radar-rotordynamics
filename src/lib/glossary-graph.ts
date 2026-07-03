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
    ],
  },
  {
    key: "seal",
    label: "シール",
    color: "#4a6fa5",
    terms: [
      "ラビリンスシール",
      "ロマキン効果",
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
];

const CAT_OF = new Map<string, GraphCategory>();
for (const c of CATEGORIES) for (const t of c.terms) CAT_OF.set(t, c);

export function categoryOf(term: string): GraphCategory | undefined {
  return CAT_OF.get(term);
}
