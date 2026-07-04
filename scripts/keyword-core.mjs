// 分野ガード：軸受・ロータダイナミクスの語だけを on-topic とみなす正規表現。
// collect.mjs（候補のノイズ除去）と keyword-suggest.mjs（キーワード候補の分野適合判定）で共有する。
// 新しい概念のキーワードを増やすときは、ここも合わせて見直すこと（分野ドリフト防止の要）。
// 注意：venue も検査対象になるため "journal" 等の一般語は入れない（Journal of… に誤ヒットする）。
export const CORE =
  /bearing|rotordynam|rotor[\s-]?dynam|rotor[\s-]?bearing|\brotor\b|\bwhirl|oil[\s-]?whip|unbalance|critical[\s-]?speed|\bfoil\b|squeeze[\s-]?film|fluid[\s-]?film|oil[\s-]?film|lubricat|tribolog|labyrinth|annular[\s-]?seal|seal[\s-]?force|tilting[\s-]?pad|spiral[\s-]?groove|herringbone|hydrostatic|aerostatic|damping[\s-]?coefficient|shaft[\s-]?vibration|torsional[\s-]?vibration|rub[\s-]?impact|morton[\s-]?effect|subsynchronous|jeffcott/i;

export const onTopicText = (text) => CORE.test(text ?? "");
