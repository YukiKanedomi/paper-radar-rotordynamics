// keyword-suggest — 検索キーワードの拡張・見直しを「提案」するツール（書き換えはしない）。
//
// 方針（承認済み）：提案→承認・配信実績ドリブン。
//   実際にヒット/配信した論文が OpenAlex で持つ keywords/concepts を集計し、
//   ・topics.json に未収載で分野ガード CORE に合致する語＝「追加候補」
//   ・配信実績の語彙に一度も現れない既存キーワード＝「見直し候補（弱シグナル）」
//   をトピックごとに提示する。topics.json は絶対に書き換えない（採否は人＝チャットで）。
//
// データ源：
//   1) scripts/.collect-candidates.json（直近の collect 出力・OpenAlex 由来に keywords/concepts あり）
//   2) data/papers.json の配信済み論文 DOI → OpenAlex works を引き直して keywords/concepts 取得
//
// 使い方:  node scripts/keyword-suggest.mjs [--min-score 0.35] [--top 12] [--out <path>]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CORE } from "./keyword-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const getArg = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const MIN_SCORE = Number(getArg("--min-score", "0.35")); // concept/keyword の平均 score 下限
const TOP = Number(getArg("--top", "12")); // トピックあたり提示上限
const MIN_LEVEL = 2; // concept の level 下限（"Engineering" 等の広すぎる語を除外）
const KW_CAP = 15; // トピックあたりキーワード上限（超過時は追加より入れ替えを促す）
const outPath = resolve(root, getArg("--out", "scripts/.keyword-report.json"));

const UA = "paper-radar-rotordynamics/0.1 (mailto:kanedomi918@gmail.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const topicsCfg = JSON.parse(readFileSync(resolve(root, "topics.json"), "utf8"));
const papers = JSON.parse(readFileSync(resolve(root, "data/papers.json"), "utf8")).papers ?? [];
const candPath = resolve(root, "scripts/.collect-candidates.json");
const candidates = existsSync(candPath) ? JSON.parse(readFileSync(candPath, "utf8")) : { topics: [] };

const norm = (s) => (s ?? "").toLowerCase().replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();

// CORE の単語境界を通ってしまうが分野外の既知誤検出を弾く。
//   "FOIL method"＝数学の展開法（First Outer Inner Last）、"helicopter rotor"＝航空機。
const ANTI = /\bfoil method\b|helicopter/i;

// OpenAlex works を DOI で取得（keywords/concepts/fields を抽出）
async function fetchWorkByDoi(doi) {
  const url = `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}?mailto=kanedomi918@gmail.com`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) {
        const w = await res.json();
        return {
          keywords: (w.keywords ?? []).map((k) => ({ name: k.display_name, score: k.score ?? 0 })),
          concepts: (w.concepts ?? []).map((c) => ({ name: c.display_name, level: c.level ?? 0, score: c.score ?? 0 })),
          title: w.title ?? "",
        };
      }
      if (![429, 500, 502, 503, 504].includes(res.status)) return null;
    } catch {
      /* retry */
    }
    await sleep(600 * (i + 1));
  }
  return null;
}

// 1論文ぶんの語彙（keywords＋level>=2 の concepts）を [{name, score, title}] に平坦化
function termsOf(work) {
  const out = [];
  for (const k of work.keywords ?? []) out.push({ name: k.name, score: k.score, title: work.title });
  for (const c of work.concepts ?? []) if ((c.level ?? 0) >= MIN_LEVEL) out.push({ name: c.name, score: c.score, title: work.title });
  return out.filter((t) => t.name);
}

const report = { generatedAt: null, minScore: MIN_SCORE, topics: [] };

for (const t of topicsCfg.topics) {
  // --- 集計対象プール（このトピックの実績＋候補）---
  const pool = [];
  // (a) 配信済み論文（DOIを OpenAlex で引き直す）
  const delivered = papers.filter((p) => p.topic === t.key && (p.doi || p.id?.startsWith("doi:")));
  for (const p of delivered) {
    const doi = p.doi || p.id.replace(/^doi:/, "");
    const w = await fetchWorkByDoi(doi);
    if (w) pool.push(w);
    await sleep(150);
  }
  // (b) 直近 collect の候補（OpenAlex由来には keywords/concepts が載っている）
  const cand = candidates.topics?.find((x) => x.key === t.key);
  for (const arr of [cand?.latest ?? [], cand?.classic ?? []]) {
    for (const p of arr) {
      if (p.source === "openalex" && (p.keywords?.length || p.concepts?.length)) {
        pool.push({ keywords: p.keywords ?? [], concepts: p.concepts ?? [], title: p.title ?? "" });
      }
    }
  }

  const existing = t.keywords.map(norm);
  const isExisting = (name) => existing.some((e) => e && (e.includes(name) || name.includes(e)));

  // --- 追加候補の集計（頻度×score・分野ガード）---
  const agg = new Map(); // normName -> {display, freq, scoreSum, titles:Set}
  const poolVocab = new Set(); // 見直し判定用：プールに現れた語（正規化）
  for (const w of pool) {
    const seen = new Set();
    for (const term of termsOf(w)) {
      const n = norm(term.name);
      if (!n) continue;
      poolVocab.add(n);
      if (seen.has(n)) continue; // 同一論文内の重複は1回
      seen.add(n);
      if (!CORE.test(n)) continue; // ★分野ガード（ノイズ除去の要）
      if (ANTI.test(n)) continue; // CORE を通る分野外の既知誤検出を除外
      if (isExisting(n)) continue; // 既存キーワードと重複
      const e = agg.get(n) ?? { display: term.name, freq: 0, scoreSum: 0, titles: new Set() };
      e.freq += 1;
      e.scoreSum += term.score ?? 0;
      if (term.title) e.titles.add(term.title);
      agg.set(n, e);
    }
  }

  const additions = [...agg.values()]
    .map((e) => ({
      term: e.display,
      freq: e.freq,
      avgScore: Number((e.scoreSum / e.freq).toFixed(3)),
      rank: Number((e.freq * (e.scoreSum / e.freq)).toFixed(3)),
      evidence: [...e.titles].slice(0, 3),
    }))
    .filter((e) => e.avgScore >= MIN_SCORE)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, TOP);

  // --- 見直し候補（弱シグナル）：実績の語彙に一度も現れない既存キーワード ---
  // ※ collect は語別ヒット数を保存していないため厳密な0件判定はできない。
  //   ここでは「配信/候補の語彙に主要語が現れない＝実績で裏打ちされていない」ものを弱く挙げる。
  const vocabBlob = [...poolVocab].join(" ");
  const review = t.keywords
    .filter((kw) => {
      const words = norm(kw).split(" ").filter((w) => w.length >= 4);
      // 主要語のいずれも語彙blobに現れない → 実績と乖離
      return words.length > 0 && !words.some((w) => vocabBlob.includes(w));
    })
    .map((kw) => ({ term: kw, reason: "配信/候補の語彙に主要語が現れない（実績で裏打ちされていない）" }));

  report.topics.push({
    key: t.key,
    label: t.label,
    keywordCount: t.keywords.length,
    keywordCap: KW_CAP,
    overCap: t.keywords.length >= KW_CAP,
    poolSize: pool.length,
    additions,
    review,
  });
}

writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

// --- 人が読むコンソール要約 ---
console.log("\n=== キーワード提案（配信実績ドリブン・提案のみ／topics.json は未変更）===");
for (const tr of report.topics) {
  console.log(`\n■ ${tr.key}（${tr.label}）  既存 ${tr.keywordCount}/${tr.keywordCap} 語・実績プール ${tr.poolSize} 本`);
  if (tr.overCap) console.log("  ⚠ キーワード上限に到達。追加より、弱い既存語との入れ替えを検討。");
  if (tr.additions.length) {
    console.log("  ＋ 追加候補（頻度×score 上位・CORE合致のみ）:");
    for (const a of tr.additions)
      console.log(`     ・${a.term}  [${a.freq}本・avg ${a.avgScore}]  例: ${a.evidence[0] ?? ""}`);
  } else {
    console.log("  ＋ 追加候補: なし（分野ガードを通る新語が実績に見当たらず）");
  }
  if (tr.review.length) {
    console.log("  △ 見直し候補（弱シグナル・実績で裏打ちされていない既存語）:");
    for (const r of tr.review) console.log(`     ・${r.term}`);
  }
}
console.log(`\n→ レポートを書き出し: ${outPath}`);
console.log("※ これは提案です。採否はチャットで決め、topics.json は人が編集します（無人 collect は変更しません）。");
