'use strict';

/* ============ ユーティリティ ============ */
const $ = (sel) => document.querySelector(sel);
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// 正解を含む4つの選択肢を作る（重複なし）
function makeChoices(answer, distractorPool) {
  const set = new Set([answer]);
  const pool = shuffle(distractorPool.filter((v) => v !== answer));
  for (const v of pool) {
    if (set.size >= 4) break;
    set.add(v);
  }
  return shuffle([...set]);
}
// 数値問題用：正解の近くの数から選択肢を作る
function numberChoices(answer) {
  const cand = new Set();
  [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10,
   answer + 3, answer - 3, answer + 5, answer - 5].forEach((v) => {
    if (v >= 0 && v !== answer) cand.add(v);
  });
  return makeChoices(answer, [...cand]);
}

/* ============ 保存データ ============ */
let course = localStorage.getItem('manabi-course') || 'kids'; // 'kids' | 'elem'
let totalStars = parseInt(localStorage.getItem('manabi-stars') || '0', 10);
let muted = localStorage.getItem('manabi-muted') === '1';

function saveStars() {
  localStorage.setItem('manabi-stars', String(totalStars));
  $('#total-stars').textContent = totalStars;
  $('#total-stars-top').textContent = totalStars;
  $('#game-stars').textContent = totalStars;
}

/* ============ 効果音（Web Audio API） ============ */
let audioCtx = null;
function tone(freq, start, dur, type = 'sine', vol = 0.15) {
  if (muted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime + start;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch (e) { /* 音が出なくても遊べるようにする */ }
}
const soundCorrect = () => { tone(523, 0, 0.15); tone(659, 0.12, 0.15); tone(784, 0.24, 0.3); };
const soundTry = () => { tone(330, 0, 0.2, 'sine', 0.08); tone(262, 0.18, 0.3, 'sine', 0.08); };
const soundFinish = () => { tone(523, 0, 0.15); tone(659, 0.12, 0.15); tone(784, 0.24, 0.15); tone(1047, 0.36, 0.4); };

/* ============ 画面遷移 ============ */
function showScreen(id) {
  ['screen-top', 'screen-game', 'screen-result'].forEach((s) => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

/* ============ データ ============ */
const COUNT_EMOJIS = ['🍎', '🍊', '🍓', '🍌', '🍇', '🍉', '🍑', '🐶', '🐱', '⭐', '🌸', '🚗'];

// もじ（ようちえん）：ことば・絵・さいしょのひらがな
const MOJI_KIDS = [
  ['りんご', '🍎', 'り'], ['みかん', '🍊', 'み'], ['いちご', '🍓', 'い'],
  ['ばなな', '🍌', 'ば'], ['ぶどう', '🍇', 'ぶ'], ['すいか', '🍉', 'す'],
  ['もも', '🍑', 'も'], ['さくらんぼ', '🍒', 'さ'], ['いぬ', '🐶', 'い'],
  ['ねこ', '🐱', 'ね'], ['うま', '🐴', 'う'], ['とり', '🐦', 'と'],
  ['ぞう', '🐘', 'ぞ'], ['うさぎ', '🐰', 'う'], ['かめ', '🐢', 'か'],
  ['さかな', '🐟', 'さ'], ['くるま', '🚗', 'く'], ['でんしゃ', '🚃', 'で'],
  ['ばす', '🚌', 'ば'], ['ひこうき', '✈️', 'ひ'], ['ふね', '🚢', 'ふ'],
  ['はな', '🌸', 'は'], ['つき', '🌙', 'つ'], ['ほし', '⭐', 'ほ'],
  ['たいよう', '☀️', 'た'], ['かさ', '🌂', 'か'], ['ぼうし', '🧢', 'ぼ'],
  ['けーき', '🍰', 'け'], ['あいす', '🍦', 'あ'], ['めがね', '👓', 'め'],
];

// カタカナ → ひらがな読み
const KATAKANA_WORDS = [
  ['パン', 'ぱん'], ['ネコ', 'ねこ'], ['イヌ', 'いぬ'], ['ケーキ', 'けーき'],
  ['バス', 'ばす'], ['テレビ', 'てれび'], ['ラジオ', 'らじお'], ['ピアノ', 'ぴあの'],
  ['サッカー', 'さっかー'], ['バナナ', 'ばなな'], ['トマト', 'とまと'], ['レモン', 'れもん'],
  ['メロン', 'めろん'], ['カメラ', 'かめら'], ['ノート', 'のーと'], ['ペン', 'ぺん'],
  ['ドア', 'どあ'], ['ベッド', 'べっど'], ['コップ', 'こっぷ'], ['タクシー', 'たくしー'],
];

// 小1〜小3配当漢字の読み（語で出題）
const KANJI_WORDS = [
  ['山', 'やま'], ['川', 'かわ'], ['田', 'た'], ['雨', 'あめ'], ['雪', 'ゆき'],
  ['海', 'うみ'], ['空', 'そら'], ['森', 'もり'], ['花', 'はな'], ['鳥', 'とり'],
  ['魚', 'さかな'], ['犬', 'いぬ'], ['猫', 'ねこ'], ['馬', 'うま'], ['牛', 'うし'],
  ['春', 'はる'], ['夏', 'なつ'], ['秋', 'あき'], ['冬', 'ふゆ'], ['朝', 'あさ'],
  ['夜', 'よる'], ['電車', 'でんしゃ'], ['駅', 'えき'], ['先生', 'せんせい'],
  ['学校', 'がっこう'], ['友達', 'ともだち'], ['家族', 'かぞく'], ['明日', 'あした'],
  ['今日', 'きょう'], ['天気', 'てんき'],
];

/* ============ 問題ジェネレータ ============ */
// 戻り値: { html, choices:[], answer, hint, emojiChoices?:bool }

function qNumberKids() {
  if (Math.random() < 0.5) {
    // かずをかぞえよう
    const emoji = pick(COUNT_EMOJIS);
    const n = Math.random() < 0.3 ? rand(11, 20) : rand(1, 10);
    return {
      html: `<span class="prompt">いくつ あるかな？</span><span class="emoji-row">${emoji.repeat(n)}</span>`,
      choices: numberChoices(n).map(String),
      answer: String(n),
      hint: 'ゆっくり 1つずつ かぞえてみよう。',
    };
  }
  // かんたんな たし算（合計10まで、絵ヒント付き）
  const a = rand(1, 9);
  const b = rand(1, 10 - a);
  const emoji = pick(COUNT_EMOJIS);
  return {
    html: `<span class="prompt">あわせて いくつ？</span>` +
      `<span class="formula">${a} ＋ ${b} ＝ ？</span><br>` +
      `<span class="hint-emoji">${emoji.repeat(a)} ＋ ${emoji.repeat(b)}</span>`,
    choices: numberChoices(a + b).map(String),
    answer: String(a + b),
    hint: 'えを ぜんぶ かぞえると こたえに なるよ。',
  };
}

function qNumberElem() {
  const kind = pick(['add', 'sub', 'mul']);
  if (kind === 'add') {
    const a = rand(12, 99), b = rand(11, 99);
    return {
      html: `<span class="prompt">けいさんしよう</span><span class="formula">${a} ＋ ${b} ＝ ？</span>`,
      choices: numberChoices(a + b).map(String),
      answer: String(a + b),
      hint: '一のくらいから じゅんに たしてみよう。',
    };
  }
  if (kind === 'sub') {
    const a = rand(21, 99), b = rand(11, a - 1);
    return {
      html: `<span class="prompt">けいさんしよう</span><span class="formula">${a} － ${b} ＝ ？</span>`,
      choices: numberChoices(a - b).map(String),
      answer: String(a - b),
      hint: '一のくらいから じゅんに ひいてみよう。たりないときは 十のくらいから かりてくるよ。',
    };
  }
  const a = rand(2, 9), b = rand(2, 9);
  return {
    html: `<span class="prompt">九九の けいさん</span><span class="formula">${a} × ${b} ＝ ？</span>`,
    choices: numberChoices(a * b).map(String),
    answer: String(a * b),
    hint: `${a}の段の 九九を おもいだしてね。`,
  };
}

function qMojiKids() {
  const item = pick(MOJI_KIDS);
  const [word, emoji, kana] = item;
  if (Math.random() < 0.5) {
    // 絵 → ひらがな（さいしょの文字）
    const pool = MOJI_KIDS.map((m) => m[2]);
    return {
      html: `<span class="prompt">この えの ことばは、どの ひらがなから はじまる？</span><span class="emoji-row">${emoji}</span>`,
      choices: makeChoices(kana, pool),
      answer: kana,
      hint: `「${word}」と こえに だして いってみよう。さいしょの おとは？`,
    };
  }
  // ひらがな → 絵
  const others = shuffle(MOJI_KIDS.filter((m) => m[1] !== emoji)).slice(0, 3);
  return {
    html: `<span class="prompt">この ひらがなから はじまる えは どれ？</span><span class="big-kana">${kana}</span>`,
    choices: shuffle([emoji, ...others.map((m) => m[1])]),
    answer: emoji,
    emojiChoices: true,
    hint: `「${kana}」から はじまる ことばを かんがえてね。たとえば「${word}」。`,
  };
}

function qMojiElem() {
  if (Math.random() < 0.5) {
    const [kata, hira] = pick(KATAKANA_WORDS);
    const pool = KATAKANA_WORDS.map((w) => w[1]);
    return {
      html: `<span class="prompt">カタカナの よみかたは？</span><span class="big-word">${kata}</span>`,
      choices: makeChoices(hira, pool),
      answer: hira,
      hint: 'カタカナを 1文字ずつ ひらがなに かえて よんでみよう。',
    };
  }
  const [kanji, yomi] = pick(KANJI_WORDS);
  const pool = KANJI_WORDS.map((w) => w[1]);
  return {
    html: `<span class="prompt">かんじの よみかたは？</span><span class="big-word">${kanji}</span>`,
    choices: makeChoices(yomi, pool),
    answer: yomi,
    hint: `「${kanji}」を つかった ことばを おもいだしてみよう。`,
  };
}

/* ---- とけい ---- */
const MIN_READING = {
  0: '', 5: '5ふん', 10: '10ぷん', 15: '15ふん', 20: '20ぷん', 25: '25ふん',
  30: '30ぷん', 35: '35ふん', 40: '40ぷん', 45: '45ふん', 50: '50ぷん', 55: '55ふん',
};
const timeLabel = (h, m) => `${h}じ${MIN_READING[m]}`;

function clockSVG(h, m) {
  const cx = 110, cy = 110, r = 100;
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const ang = (i * 6 * Math.PI) / 180;
    const big = i % 5 === 0;
    const r1 = big ? r - 14 : r - 7;
    ticks += `<line x1="${cx + r1 * Math.sin(ang)}" y1="${cy - r1 * Math.cos(ang)}" x2="${cx + r * Math.sin(ang)}" y2="${cy - r * Math.cos(ang)}" stroke="#456" stroke-width="${big ? 3 : 1.5}"/>`;
  }
  let nums = '';
  for (let n = 1; n <= 12; n++) {
    const ang = (n * 30 * Math.PI) / 180;
    nums += `<text x="${cx + (r - 28) * Math.sin(ang)}" y="${cy - (r - 28) * Math.cos(ang)}" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="bold" fill="#234">${n}</text>`;
  }
  const hAng = (((h % 12) * 30 + m * 0.5) * Math.PI) / 180;
  const mAng = ((m * 6) * Math.PI) / 180;
  return `<svg viewBox="0 0 220 220" role="img" aria-label="とけい">
    <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="#fff" stroke="#ff9f1c" stroke-width="6"/>
    ${ticks}${nums}
    <line x1="${cx}" y1="${cy}" x2="${cx + 52 * Math.sin(hAng)}" y2="${cy - 52 * Math.cos(hAng)}" stroke="#234" stroke-width="8" stroke-linecap="round"/>
    <line x1="${cx}" y1="${cy}" x2="${cx + 78 * Math.sin(mAng)}" y2="${cy - 78 * Math.cos(mAng)}" stroke="#e8590c" stroke-width="5" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="7" fill="#234"/>
  </svg>`;
}

function qClock() {
  const h = rand(1, 12);
  let m, candidates;
  if (course === 'kids') {
    m = pick([0, 30]);
    candidates = [];
    [0, 30].forEach((mm) => {
      [h, h === 12 ? 1 : h + 1, h === 1 ? 12 : h - 1].forEach((hh) => candidates.push(timeLabel(hh, mm)));
    });
  } else {
    m = pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    candidates = [];
    [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].forEach((mm) => candidates.push(timeLabel(h, mm)));
    [h === 12 ? 1 : h + 1, h === 1 ? 12 : h - 1].forEach((hh) => candidates.push(timeLabel(hh, m)));
  }
  return {
    html: `<span class="prompt">いま なんじ？</span>${clockSVG(h, m)}`,
    choices: makeChoices(timeLabel(h, m), candidates),
    answer: timeLabel(h, m),
    hint: course === 'kids'
      ? 'みじかい針（はり）が さす数字が「○じ」。ながい針が 12 なら ちょうど、6 なら 30ぷんだよ。'
      : 'ながい針は 1めもりで 5ふん。みじかい針の 数字と あわせて よんでみよう。',
  };
}

/* ---- おみせやさん ---- */
const SHOP_ITEMS_KIDS = [
  ['りんご', '🍎'], ['パン', '🍞'], ['ケーキ', '🍰'], ['アイス', '🍦'],
  ['ドーナツ', '🍩'], ['あめ', '🍬'], ['ジュース', '🧃'], ['クッキー', '🍪'],
  ['バナナ', '🍌'], ['みかん', '🍊'],
];
const SHOP_ITEMS_ELEM = [
  ...SHOP_ITEMS_KIDS,
  ['ほん', '📕'], ['えんぴつ', '✏️'], ['ノート', '📓'], ['ぼうし', '🧢'],
  ['おにぎり', '🍙'], ['プリン', '🍮'], ['サンドイッチ', '🥪'], ['はな', '💐'],
];

// 金額（10円単位）→ コインの組み合わせ文字列。例: 160 → 「100円玉×1・50円玉×1・10円玉×1」
// ときどき大きなコインを細かく崩して、組み合わせにバリエーションを出す
function coinComboText(total) {
  const counts = { 500: 0, 100: 0, 50: 0, 10: 0 };
  let rest = total;
  [500, 100, 50, 10].forEach((d) => { counts[d] = Math.floor(rest / d); rest %= d; });
  if (Math.random() < 0.35) {
    if (counts[500] >= 1) { counts[500]--; counts[100] += 5; }
    else if (counts[100] >= 1) { counts[100]--; counts[50] += 2; }
    else if (counts[50] >= 1) { counts[50]--; counts[10] += 5; }
  }
  return [500, 100, 50, 10].filter((d) => counts[d] > 0).map((d) => `${d}円玉×${counts[d]}`).join('・');
}

// ぴったり払う問題の選択肢（正解＋合計金額が違う3つ）。文字列が一意に合計を表すので重複しない
function shopExactChoices(price) {
  const answer = coinComboText(price);
  const offsets = shuffle([10, -10, 20, -20, 30, -30, 40, -40, 50, 60, 70, 80, 90, 100]);
  const totals = [];
  for (const off of offsets) {
    const t = price + off;
    if (t >= 10 && t !== price && !totals.includes(t)) totals.push(t);
    if (totals.length >= 3) break;
  }
  return { choices: shuffle([answer, ...totals.map((t) => coinComboText(t))]), answer };
}

function qShopKids() {
  const [name, emoji] = pick(SHOP_ITEMS_KIDS);
  const price = rand(2, 10) * 10; // 20〜100円
  const { choices, answer } = shopExactChoices(price);
  return {
    html: `<span class="prompt">🧑‍🍳「${name}は ${price}えん です」</span><span class="emoji-row">${emoji}</span><span class="prompt">ぴったり はらえるのは どれ？</span>`,
    choices,
    answer,
    smallChoices: true,
    hint: `${price}えんに なる コインの あわせかたを さがそう。大きなコインから かんがえると わかりやすいよ。`,
    testMeta: { kind: 'exact', price },
  };
}

function qShopElem() {
  const [name, emoji] = pick(SHOP_ITEMS_ELEM);
  if (Math.random() < 0.5) {
    // おつり（500円玉または1000円札を出す）
    const useThousand = Math.random() < 0.5;
    const price = useThousand ? rand(51, 99) * 10 : rand(11, 49) * 10;
    const paid = useThousand ? 1000 : 500;
    const change = paid - price;
    return {
      html: `<span class="prompt">🧑‍🍳「${name}は ${price}えん です」</span><span class="emoji-row">${emoji}</span><span class="prompt">${paid}えんを だしたら、おつりは いくら？</span>`,
      choices: numberChoices(change).map(String),
      answer: String(change),
      hint: `${paid} － ${price} を けいさんしてみよう。`,
      testMeta: { kind: 'change', price, paid },
    };
  }
  // ぴったり払う（120〜990円）
  const price = rand(12, 99) * 10;
  const { choices, answer } = shopExactChoices(price);
  return {
    html: `<span class="prompt">🧑‍🍳「${name}は ${price}えん です」</span><span class="emoji-row">${emoji}</span><span class="prompt">ぴったり はらえるのは どれ？</span>`,
    choices,
    answer,
    smallChoices: true,
    hint: '500円玉・100円玉・50円玉・10円玉を、大きなものから じゅんに あわせていこう。',
    testMeta: { kind: 'exact', price },
  };
}

/* ---- たるかぞえ（立体カウント） ---- */
// 高さマップ: 3×3の各マスに下から積まれた樽の段数。総数＝段数の合計（浮いた樽は構造上できない）
function taruHiddenExists(h) {
  // 同じ斜め列（c-r が同じ）で、奥のマスより手前のマスが同じか高く積まれていれば「隠れる段」がある
  for (let d = -2; d <= 2; d++) {
    const cells = [];
    for (let r = 0; r < 3; r++) {
      const c = r + d;
      if (c >= 0 && c < 3) cells.push(h[r][c]);
    }
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        if (cells[i] >= 1 && cells[j] >= cells[i]) return true;
      }
    }
  }
  return false;
}

// 積み方のルール（階段ルール）: 同じ斜め列（c-r が同じ＝等角投影で同じ画面列に並ぶマス同士）では、
// 奥（r が小さい）ほど段数が多いか同じになる積み方だけを出す。
// 手前の柱が高いと奥の柱の天面が隠れて数えられないため、奥→手前に向かって段数が増えない形に限定し、
// 全ての柱の天面（上面楕円）が必ず見えるようにする。
// 並べ替えは斜め列ごとの段数の合計を変えないので、コース別の総数範囲はそのまま保たれる。
function taruApplyStairs(h) {
  for (let d = -2; d <= 2; d++) {
    const cells = [];
    for (let r = 0; r < 3; r++) {
      const c = r + d;
      if (c >= 0 && c < 3) cells.push([r, c]);
    }
    const vals = cells.map(([r, c]) => h[r][c]).sort((a, b) => b - a); // 奥→手前へ降順
    cells.forEach(([r, c], i) => { h[r][c] = vals[i]; });
  }
  return h;
}

function taruStairsOk(h) {
  for (let d = -2; d <= 2; d++) {
    let prev = Infinity;
    for (let r = 0; r < 3; r++) {
      const c = r + d;
      if (c < 0 || c > 2) continue;
      if (h[r][c] > prev) return false;
      prev = h[r][c];
    }
  }
  return true;
}

function genTaruHeights() {
  const empty = () => [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  if (course === 'kids') {
    for (let tries = 0; tries < 500; tries++) {
      const h = empty();
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) h[r][c] = Math.random() < 0.45 ? rand(1, 2) : 0;
      taruApplyStairs(h);
      const total = h.flat().reduce((a, b) => a + b, 0);
      if (total >= 4 && total <= 10 && h.flat().some((v) => v === 2) && taruStairsOk(h)) return h;
    }
    return [[1, 2, 0], [0, 1, 2], [1, 0, 1]]; // 合計8・階段ルール適合
  }
  for (let tries = 0; tries < 1000; tries++) {
    const h = empty();
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const x = Math.random();
        h[r][c] = x < 0.25 ? 0 : x < 0.55 ? 1 : x < 0.8 ? 2 : x < 0.93 ? 3 : 4;
      }
    }
    taruApplyStairs(h);
    const total = h.flat().reduce((a, b) => a + b, 0);
    if (total >= 12 && total <= 20 && Math.max(...h.flat()) >= 3 && taruHiddenExists(h) && taruStairsOk(h)) return h;
  }
  return [[3, 3, 1], [2, 3, 2], [1, 2, 2]]; // 合計19・隠れる段あり・階段ルール適合
}

// 高さマップを等角投影（アイソメトリック）SVGで描く。
// 地面はひし形タイル（2:1）、樽は上面楕円＋側面を持つ円柱として描く。
// 胴には帯（たが）などの横線を入れない（1個の樽が2つに割れて見えるため）。
// 段の境目は、上の段の底面の輪郭線と、その樽が下の樽に落とす柔らかい影で示す。
// 描画順は「奥のマス（r+c が小さい）→手前」「下の段→上の段」を守り、隠れる部分が自然に隠れる。
// 樽の幅(54)よりマスの横間隔(76)が広く、高さ1段(30)より手前マスとの縦ずれ(19×2段分=38)が効くため、
// 奥の柱は上面か側面上部が必ず少し見え、「柱がある」ことが読める寸法にしてある。
const TARU_GEO = { hw: 38, hh: 19, rx: 27, ry: 13, bh: 30, ox: 160, oy: 148 };

function taruBarrel(x, baseY, lv, hasAbove) {
  const { rx, ry, bh } = TARU_GEO;
  const botY = baseY - lv * bh; // この段の底面楕円の中心
  const topY = botY - bh; // この段の上面楕円の中心
  const odd = lv % 2 === 1; // 段ごとに色味を変えて境目を読みやすくする
  let s = '';
  // 側面（左が明るく右が濃いグラデーションで丸みを出す）
  s += `<path d="M ${x - rx} ${topY} L ${x - rx} ${botY} A ${rx} ${ry} 0 0 0 ${x + rx} ${botY} L ${x + rx} ${topY} Z" fill="url(#taruWood)" stroke="#7a4a21" stroke-width="2" stroke-linejoin="round"/>`;
  if (odd) {
    s += `<path d="M ${x - rx} ${topY} L ${x - rx} ${botY} A ${rx} ${ry} 0 0 0 ${x + rx} ${botY} L ${x + rx} ${topY} Z" fill="#5a3413" opacity="0.10"/>`;
  }
  // 上の段の樽が落とす影：接触部のすぐ下に、輪郭線ではなく放射グラデーションで
  // ふちが透明に消える柔らかい影として描く（胴の途中に横線は入れない）
  if (hasAbove) {
    s += `<ellipse cx="${x}" cy="${topY + ry + 2}" rx="${rx - 1}" ry="10" fill="url(#taruShade)"/>`;
  }
  // 樽板（縦の板）の線
  for (const off of [-12, 0, 12]) {
    s += `<line x1="${x + off}" y1="${topY + 5}" x2="${x + off}" y2="${botY - 2}" stroke="#7a4a21" stroke-width="1.2" opacity="0.16"/>`;
  }
  // 上面（ふた）：外側の楕円＋内側の楕円で厚みと輪郭をはっきりさせる
  s += `<ellipse cx="${x}" cy="${topY}" rx="${rx}" ry="${ry}" fill="${odd ? '#e9bd7f' : '#f2cd97'}" stroke="#7a4a21" stroke-width="2"/>`;
  s += `<ellipse cx="${x}" cy="${topY}" rx="${rx - 6}" ry="${ry - 3.5}" fill="none" stroke="#b9834a" stroke-width="1.6"/>`;
  return s;
}

function taruSVG(h) {
  const { hw, hh, ox, oy } = TARU_GEO;
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push({ r, c, v: h[r][c] });
  cells.sort((a, b) => (a.r + a.c) - (b.r + b.c) || a.r - b.r);
  let s = '<svg class="taru-svg" viewBox="0 0 320 258" role="img" aria-label="つまれた たる">';
  s += '<defs><linearGradient id="taruWood" x1="0" y1="0" x2="1" y2="0">'
    + '<stop offset="0" stop-color="#dfa860"/><stop offset="0.45" stop-color="#c98a46"/>'
    + '<stop offset="1" stop-color="#9c652c"/></linearGradient>'
    + '<radialGradient id="taruShade">'
    + '<stop offset="0" stop-color="#3a2008" stop-opacity="0.30"/>'
    + '<stop offset="0.65" stop-color="#3a2008" stop-opacity="0.14"/>'
    + '<stop offset="1" stop-color="#3a2008" stop-opacity="0"/></radialGradient></defs>';
  // 地面のひし形タイル（市松模様で1マスずつ追えるようにする）
  for (const { r, c } of cells) {
    const x = ox + (c - r) * hw;
    const y = oy + (r + c) * hh;
    const fill = (r + c) % 2 === 0 ? '#c2e3a3' : '#add693';
    s += `<polygon points="${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}" fill="${fill}" stroke="#7cb35e" stroke-width="1.5"/>`;
  }
  // 樽の柱（マスごと：影→下の段から上の段へ）
  for (const { r, c, v } of cells) {
    if (v === 0) continue;
    const x = ox + (c - r) * hw;
    const yBase = oy + (r + c) * hh;
    s += `<ellipse cx="${x}" cy="${yBase + 5}" rx="31" ry="10" fill="#3d6027" opacity="0.28"/>`;
    for (let lv = 0; lv < v; lv++) s += taruBarrel(x, yBase, lv, lv + 1 < v);
  }
  return s + '</svg>';
}

// ヒント用：真上から見たマップ（各マスの段数を数字で表示）。r=0 が奥、r=2 が手前
function taruTopSVG(h) {
  const fills = ['#eef7e2', '#f7dfae', '#f2c879', '#eaa84f', '#dd8f33'];
  let s = '<svg class="taru-top-svg" viewBox="0 0 156 178" role="img" aria-label="うえから みた たるの マップ">';
  s += '<text x="78" y="14" text-anchor="middle" font-size="12" font-weight="bold" fill="#5b7a43">おく</text>';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const v = h[r][c];
      const x = 4 + c * 50;
      const y = 20 + r * 50;
      s += `<rect x="${x}" y="${y}" width="46" height="46" rx="8" fill="${fills[v]}" stroke="#7cb35e" stroke-width="1.5"/>`;
      s += v > 0
        ? `<text x="${x + 23}" y="${y + 31}" text-anchor="middle" font-size="24" font-weight="bold" fill="#6b4420">${v}</text>`
        : `<text x="${x + 23}" y="${y + 30}" text-anchor="middle" font-size="16" fill="#9db98a">・</text>`;
    }
  }
  s += '<text x="78" y="174" text-anchor="middle" font-size="12" font-weight="bold" fill="#5b7a43">てまえ</text>';
  return s + '</svg>';
}

function qTaru() {
  const h = genTaruHeights();
  const total = h.flat().reduce((a, b) => a + b, 0);
  return {
    html: `<span class="prompt">たるは ぜんぶで いくつ？</span>${taruSVG(h)}`
      + '<button type="button" class="taru-hint-btn">🗺️ ヒント：うえから みる</button>'
      + `<div class="taru-topview" hidden>${taruTopSVG(h)}<span class="taru-top-cap">すうじは そのマスの たるの かずだよ</span></div>`
      + '<span class="prompt">かくれている たるも かぞえよう！</span>',
    choices: numberChoices(total).map(String),
    answer: String(total),
    hint: 'マスごとに、下から つみあがっている たるを かぞえて、ぜんぶ たしてみよう。',
    onRender: () => {
      const btn = document.querySelector('.taru-hint-btn');
      const view = document.querySelector('.taru-topview');
      if (!btn || !view) return;
      btn.addEventListener('click', () => {
        view.hidden = !view.hidden;
        btn.textContent = view.hidden ? '🗺️ ヒント：うえから みる' : '🗺️ ヒントを かくす';
      });
    },
    testMeta: { heights: h, total },
  };
}

/* ---- なぞときパズル ---- */
const ODD_SETS = {
  fruits: ['🍎', '🍊', '🍓', '🍌', '🍇', '🍉', '🍑', '🍒'],
  veggies: ['🥕', '🥦', '🍅', '🥒', '🌽'],
  animals: ['🐶', '🐱', '🐰', '🐴', '🐷', '🐮'],
  sea: ['🐟', '🐙', '🦀', '🐳', '🐠', '🦐'],
  vehicles: ['🚗', '🚌', '🚃', '✈️', '🚢', '🚲'],
  sweets: ['🍰', '🍦', '🍩', '🍬', '🍮', '🍫'],
};
// [なかま3つ の分類, なかまはずれ の分類]（分類どうしは重ならないので正解は必ず1つ）
const ODD_PAIRS = [
  ['fruits', 'vehicles'], ['veggies', 'vehicles'], ['animals', 'vehicles'],
  ['sea', 'sweets'], ['sweets', 'animals'], ['vehicles', 'fruits'],
  ['fruits', 'animals'], ['animals', 'sweets'], ['veggies', 'sweets'],
];

function qPuzzleOdd() {
  const [main, oddCat] = pick(ODD_PAIRS);
  const mains = shuffle(ODD_SETS[main].slice()).slice(0, 3);
  const odd = pick(ODD_SETS[oddCat]);
  return {
    html: '<span class="prompt">なかまはずれは どれ？</span><span class="prompt">3つは おなじ なかま、1つだけ ちがうよ</span>',
    choices: shuffle([odd, ...mains]),
    answer: odd,
    emojiChoices: true,
    hint: '3つは おなじ なかま。1つだけ ちがう なかまが まざっているよ。',
    testMeta: { type: 'odd', mainSet: ODD_SETS[main], odd },
  };
}

function seqEmojiQuestion(unit, showLen) {
  const shown = Array.from({ length: showLen }, (_, i) => unit[i % unit.length]);
  const next = unit[showLen % unit.length];
  return {
    html: `<span class="prompt">つぎに くるのは どれ？</span><span class="emoji-row">${shown.join('')} ➡️ ❓</span>`,
    choices: makeChoices(next, [...unit, '🍊', '🐱', '🚗', '🌷', '⭐']),
    answer: next,
    emojiChoices: true,
    hint: 'おなじ じゅんばんが くりかえされているよ。さいしょから 見なおしてみよう。',
    testMeta: { type: 'seq', unit, shown, next },
  };
}

function qPuzzleSeqKids() {
  const e = shuffle(['🍎', '🍌', '⭐', '🌙', '🍓', '🐶', '🌸', '🍇']).slice(0, 3);
  const unit = pick([[e[0], e[1]], [e[0], e[0], e[1]], [e[0], e[1], e[2]]]);
  return seqEmojiQuestion(unit, 5);
}

function qPuzzleSeqElem() {
  if (Math.random() < 0.3) {
    const e = shuffle(['🍎', '🍌', '⭐', '🌙', '🍓', '🐶', '🌸', '🍇']).slice(0, 3);
    const unit = pick([[e[0], e[1], e[2]], [e[0], e[0], e[1]], [e[0], e[1], e[0]]]);
    return seqEmojiQuestion(unit, 6);
  }
  const kind = pick(['add', 'sub', 'mul2']);
  let seq, next;
  if (kind === 'add') {
    const start = rand(1, 20), diff = rand(2, 9);
    seq = Array.from({ length: 5 }, (_, i) => start + diff * i);
    next = start + diff * 5;
  } else if (kind === 'sub') {
    const diff = rand(2, 8), start = rand(5 * diff + 2, 5 * diff + 40);
    seq = Array.from({ length: 5 }, (_, i) => start - diff * i);
    next = start - diff * 5;
  } else {
    const start = pick([1, 2, 3]);
    seq = Array.from({ length: 5 }, (_, i) => start * 2 ** i);
    next = start * 2 ** 5;
  }
  return {
    html: `<span class="prompt">つぎに くる かずは どれ？</span><span class="seq">${seq.join(' → ')} → ？</span>`,
    choices: numberChoices(next).map(String),
    answer: String(next),
    hint: 'となりどうしの かずが、どう かわっているか 見てみよう（たされている／ひかれている／2ばいに なっている）。',
    testMeta: { type: 'seqnum', seq, next },
  };
}

const SHAPE_EMOJIS = ['🍎', '🍌', '🐟', '🚗', '🌙', '⭐', '🍄', '🦋', '🐢', '✈️', '🍓', '🐶', '🍇', '🚃', '🌸', '🐙'];

function qPuzzleShape() {
  const target = pick(SHAPE_EMOJIS);
  const rot = course === 'elem' ? pick([0, 90, 180, 270]) : 0;
  const style = `filter: brightness(0); display: inline-block;${rot ? ` transform: rotate(${rot}deg);` : ''}`;
  return {
    html: `<span class="prompt">この シルエット（かげ）は どれかな？</span><span class="silhouette" style="${style}">${target}</span>`,
    choices: makeChoices(target, SHAPE_EMOJIS),
    answer: target,
    emojiChoices: true,
    hint: 'かたちの とくちょう（とがっている・まるい・あしや はねが あるか）を よく見てみよう。',
    testMeta: { type: 'shape', target },
  };
}

function qPuzzle() {
  const t = pick(['odd', 'seq', 'shape']);
  if (t === 'odd') return qPuzzleOdd();
  if (t === 'shape') return qPuzzleShape();
  return course === 'kids' ? qPuzzleSeqKids() : qPuzzleSeqElem();
}

const GENERATORS = {
  number: () => (course === 'kids' ? qNumberKids() : qNumberElem()),
  moji: () => (course === 'kids' ? qMojiKids() : qMojiElem()),
  clock: () => qClock(),
  shop: () => (course === 'kids' ? qShopKids() : qShopElem()),
  taru: () => qTaru(),
  puzzle: () => qPuzzle(),
};

/* ============ ゲーム進行 ============ */
const QUESTIONS_PER_SET = 10;
let currentGame = null;
let questions = [];
let qIndex = 0;
let earnedThisSet = 0;
let locked = false;

// カスタム進行ゲーム（たからさがし／まとあて）の後片付け（タイマー・キー監視の解除）
let customCleanup = null;
function runCustomCleanup() {
  if (customCleanup) {
    const f = customCleanup;
    customCleanup = null;
    f();
  }
}

const PRAISES = ['せいかい！すごい！🎉', 'やったね！せいかい！✨', 'ばっちり！せいかい！🌟'];

function startGame(game) {
  runCustomCleanup();
  currentGame = game;
  qIndex = 0;
  earnedThisSet = 0;
  showScreen('screen-game');
  if (game === 'treasure') { startTreasure(); return; }
  if (game === 'target') { startTarget(); return; }
  if (game === 'memory') { startMemory(); return; }
  if (game === 'fishing') { startFishing(); return; }
  if (game === 'balance') { startBalance(); return; }
  questions = Array.from({ length: QUESTIONS_PER_SET }, () => GENERATORS[game]());
  renderQuestion();
}

function renderQuestion() {
  locked = false;
  const q = questions[qIndex];
  $('#progress').textContent = `だい ${qIndex + 1} もん ／ ${QUESTIONS_PER_SET} もん`;
  $('#question').innerHTML = q.html;
  $('#feedback').textContent = '';
  $('#feedback').className = 'feedback';
  const box = $('#choices');
  box.className = 'choices';
  box.innerHTML = '';
  q.choices.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn' + (q.emojiChoices ? ' emoji-choice' : '') + (q.smallChoices ? ' small-choice' : '');
    btn.textContent = c;
    btn.addEventListener('click', () => answer(btn, c));
    box.appendChild(btn);
  });
  if (q.onRender) q.onRender();
}

function answer(btn, choice) {
  if (locked || btn.classList.contains('wrong')) return;
  const q = questions[qIndex];
  const fb = $('#feedback');
  if (choice === q.answer) {
    locked = true;
    btn.classList.add('correct');
    totalStars++;
    earnedThisSet++;
    saveStars();
    soundCorrect();
    fb.textContent = `${pick(PRAISES)} スターを ゲット！`;
    fb.className = 'feedback good';
    document.querySelectorAll('.choice-btn').forEach((b) => (b.disabled = true));
    setTimeout(() => {
      qIndex++;
      if (qIndex >= QUESTIONS_PER_SET) finishSet();
      else renderQuestion();
    }, 1400);
  } else {
    btn.classList.add('wrong');
    btn.disabled = true;
    soundTry();
    fb.textContent = `おしい！ヒント：${q.hint} もういちど やってみよう💪`;
    fb.className = 'feedback try';
  }
}

function finishSet() {
  soundFinish();
  $('#result-text').textContent =
    earnedThisSet === QUESTIONS_PER_SET
      ? 'ぜんぶ せいかい！かんぺきだね！🏆'
      : `${QUESTIONS_PER_SET}もん おわったよ！`;
  $('#result-stars').textContent =
    '⭐'.repeat(Math.max(earnedThisSet, 0)) + `\nスター ${earnedThisSet}こ ゲット！（ぜんぶで ${totalStars}こ）`;
  showScreen('screen-result');
}

// カスタム進行ゲーム用の結果表示（既存の結果画面をそのまま使う）
function finishCustomSet(mainText, extraText) {
  runCustomCleanup();
  soundFinish();
  $('#result-text').textContent = mainText;
  $('#result-stars').textContent =
    '⭐'.repeat(Math.max(earnedThisSet, 0)) + `\nスター ${earnedThisSet}こ ゲット！（ぜんぶで ${totalStars}こ）` +
    (extraText ? `\n${extraText}` : '');
  showScreen('screen-result');
}

function setFeedback(text, kind) {
  const fb = $('#feedback');
  fb.textContent = text;
  fb.className = 'feedback' + (kind ? ` ${kind}` : '');
}

/* ============ まとあてアクション ============ */
const TARGET_KANA_KIDS = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と'];
const TARGET_KANA_ELEM = ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ', 'サ', 'シ', 'ス', 'セ', 'ソ', 'タ', 'チ', 'ツ', 'テ', 'ト'];

// 戻り値: { prompt, labels:[4つ], correct }（correct は labels にちょうど1つ含まれる）
function genTargetRound() {
  if (course === 'kids') {
    if (Math.random() < 0.5) {
      const c = pick(TARGET_KANA_KIDS);
      return { prompt: `「${c}」を ねらえ！`, labels: makeChoices(c, TARGET_KANA_KIDS), correct: c };
    }
    const n = rand(1, 10);
    return { prompt: `${n}を ねらえ！`, labels: numberChoices(n).map(String), correct: String(n) };
  }
  if (Math.random() < 0.5) {
    const a = rand(2, 9), b = rand(2, 9);
    return { prompt: `${a} × ${b} の こたえを ねらえ！`, labels: numberChoices(a * b).map(String), correct: String(a * b) };
  }
  const c = pick(TARGET_KANA_ELEM);
  return { prompt: `「${c}」を ねらえ！`, labels: makeChoices(c, TARGET_KANA_ELEM), correct: c };
}

let targetState = null;

function startTarget() {
  targetState = { round: 0, lock: false, timer: null, current: null };
  customCleanup = () => {
    if (targetState && targetState.timer) clearTimeout(targetState.timer);
    targetState = null;
  };
  renderTargetRound();
}

function renderTargetRound() {
  const st = targetState;
  if (!st) return;
  st.lock = false;
  const r = genTargetRound();
  st.current = r;
  $('#progress').textContent = `だい ${st.round + 1} もん ／ ${QUESTIONS_PER_SET} もん`;
  $('#question').innerHTML = `<span class="prompt">🎯 まとあてアクション</span><span class="big-word">${r.prompt}</span>`;
  setFeedback('', '');
  const box = $('#choices');
  box.className = 'choices stage-mode';
  box.innerHTML = '';
  const stage = document.createElement('div');
  stage.className = 'target-stage';
  const slots = shuffle([[5, 6], [55, 2], [28, 50], [72, 46]]);
  r.labels.forEach((label, i) => {
    const b = document.createElement('button');
    b.className = 'target-bubble';
    b.textContent = label;
    b.style.left = `${slots[i][0]}%`;
    b.style.top = `${slots[i][1]}%`;
    b.style.animationDuration = `${(2.6 + Math.random() * 1.6).toFixed(2)}s`;
    b.style.animationDelay = `${(Math.random() * 0.8).toFixed(2)}s`;
    b.addEventListener('click', () => tapTarget(b, label));
    stage.appendChild(b);
  });
  box.appendChild(stage);
}

function tapTarget(btn, label) {
  const st = targetState;
  if (!st || st.lock || btn.classList.contains('miss')) return;
  if (label === st.current.correct) {
    st.lock = true;
    btn.classList.add('hit');
    totalStars++;
    earnedThisSet++;
    saveStars();
    soundCorrect();
    setFeedback(`${pick(PRAISES)} スターを ゲット！`, 'good');
    st.timer = setTimeout(() => {
      if (targetState !== st) return; // 途中で離脱・再開していたら何もしない
      st.round++;
      if (st.round >= QUESTIONS_PER_SET) {
        targetState = null;
        finishCustomSet(
          earnedThisSet === QUESTIONS_PER_SET
            ? 'ぜんぶ あたった！かんぺきだね！🏆'
            : `${QUESTIONS_PER_SET}もん おわったよ！`
        );
      } else {
        renderTargetRound();
      }
    }, 1200);
  } else {
    btn.classList.add('miss');
    btn.disabled = true;
    soundTry();
    setFeedback('おしい！ よく見て もういちど ねらってみよう💪', 'try');
  }
}

/* ============ たからさがしアドベンチャー ============ */
// マップ記号: S=スタート, C=かぎの宝箱, B=おたから宝箱, D=かぎ付きの扉, G=ゴール(⛩️), #=き(壁), .=みち
// 流れ: 宝箱のクイズに正解して鍵を集め → 鍵で扉を開けて → 次のエリアへ → ゴール
const TREASURE_MAPS = [
  [
    'S..#C.',
    '.#.##.',
    '.#.D..',
    '.####.',
    'C...DG',
    '..B..#',
  ],
  [
    'SC.#..',
    '.#.##.',
    '.#.DC.',
    '.#####',
    '..B.DG',
    'C..#.#',
  ],
  [
    'S.#C#C',
    '..#.#.',
    '#.D...',
    '#.###.',
    'C..DB#',
    '.#.#DG',
  ],
];

function parseTreasureMap(rows) {
  const grid = rows.map((r) => r.split(''));
  let start = null;
  let goal = null;
  const chests = [];
  const doors = [];
  grid.forEach((row, y) => row.forEach((c, x) => {
    if (c === 'S') start = { x, y };
    if (c === 'G') goal = { x, y };
    if (c === 'C') chests.push({ x, y, kind: 'key', opened: false });
    if (c === 'B') chests.push({ x, y, kind: 'bonus', opened: false });
    if (c === 'D') doors.push({ x, y, opened: false });
  }));
  return { grid, start, goal, chests, doors };
}

let treasure = null;

function startTreasure() {
  const parsed = parseTreasureMap(pick(TREASURE_MAPS));
  treasure = { ...parsed, px: parsed.start.x, py: parsed.start.y, busy: false, keys: 0 };
  customCleanup = () => {
    document.removeEventListener('keydown', treasureKeys);
    treasure = null;
  };
  document.addEventListener('keydown', treasureKeys);
  setFeedback('たからばこで かぎ🔑を あつめて、とびら🚪を あけながら ゴールを めざそう！', '');
  renderTreasureMap();
}

function treasureKeys(e) {
  if (!treasure || treasure.busy) return;
  const dirs = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  const d = dirs[e.key];
  if (d) {
    e.preventDefault();
    treasureMove(d[0], d[1]);
  }
}

function renderTreasureMap() {
  const t = treasure;
  if (!t) return;
  const opened = t.chests.filter((c) => c.opened).length;
  $('#progress').textContent = `🔑 かぎ ×${t.keys}　🎁 たからばこ ${opened}／${t.chests.length}`;
  let cells = '';
  for (let y = 0; y < t.grid.length; y++) {
    for (let x = 0; x < t.grid[y].length; x++) {
      const c = t.grid[y][x];
      let cls = 'map-cell';
      let content = '';
      if (c === '#') { cls += ' wall'; content = '🌴'; }
      else if (c === 'G') { cls += ' goal open'; content = '⛩️'; }
      const door = t.doors.find((d) => d.x === x && d.y === y);
      if (door) { cls += door.opened ? ' door-open' : ' door'; content = '🚪'; }
      const chest = t.chests.find((ch) => ch.x === x && ch.y === y);
      if (chest) content = chest.opened ? '🌟' : '🎁';
      if (t.px === x && t.py === y) { cls += ' player'; content = '🧒'; }
      cells += `<div class="${cls}">${content}</div>`;
    }
  }
  $('#question').innerHTML =
    `<span class="prompt">🗺️ かぎを あつめて とびらを あけ、ゴール（⛩️）を めざそう！</span><div class="map-grid">${cells}</div>`;
  const box = $('#choices');
  box.className = 'choices dpad-mode';
  box.innerHTML =
    `<div class="dpad">
      <span></span><button class="dpad-btn" data-dx="0" data-dy="-1" aria-label="うえ">⬆️</button><span></span>
      <button class="dpad-btn" data-dx="-1" data-dy="0" aria-label="ひだり">⬅️</button><span></span><button class="dpad-btn" data-dx="1" data-dy="0" aria-label="みぎ">➡️</button>
      <span></span><button class="dpad-btn" data-dx="0" data-dy="1" aria-label="した">⬇️</button><span></span>
    </div>`;
  box.querySelectorAll('.dpad-btn').forEach((b) => {
    b.addEventListener('click', () => treasureMove(parseInt(b.dataset.dx, 10), parseInt(b.dataset.dy, 10)));
  });
}

function treasureMove(dx, dy) {
  const t = treasure;
  if (!t || t.busy) return;
  const nx = t.px + dx;
  const ny = t.py + dy;
  if (ny < 0 || ny >= t.grid.length || nx < 0 || nx >= t.grid[ny].length) return;
  const cell = t.grid[ny][nx];
  if (cell === '#') {
    soundTry();
    setFeedback('🌴が あって すすめないよ。べつの みちを いってみよう', 'try');
    return;
  }
  const door = t.doors.find((d) => d.x === nx && d.y === ny && !d.opened);
  if (door) {
    if (t.keys <= 0) {
      soundTry();
      setFeedback('🔒 この とびらは かぎが いるよ。たからばこを さがして かぎを てにいれよう！', 'try');
      return;
    }
    t.keys--;
    door.opened = true;
    t.px = nx;
    t.py = ny;
    soundCorrect();
    renderTreasureMap();
    setFeedback(`🔑 かぎを つかって とびらを あけた！（かぎ のこり ×${t.keys}）`, 'good');
    return;
  }
  t.px = nx;
  t.py = ny;
  tone(440, 0, 0.06, 'sine', 0.06);
  const chest = t.chests.find((c) => c.x === nx && c.y === ny && !c.opened);
  if (chest) {
    openTreasureQuiz(chest);
    return;
  }
  if (cell === 'G') {
    finishTreasure();
    return;
  }
  renderTreasureMap();
}

// 宝箱マスに着いたら、かず／もじのクイズを出す（既存ジェネレータを流用）
function openTreasureQuiz(chest) {
  const t = treasure;
  t.busy = true;
  const q = pick([GENERATORS.number, GENERATORS.moji])();
  $('#question').innerHTML = `<span class="prompt">🎁 たからばこの クイズ！</span>` + q.html;
  const box = $('#choices');
  box.className = 'choices';
  box.innerHTML = '';
  q.choices.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn' + (q.emojiChoices ? ' emoji-choice' : '');
    btn.textContent = c;
    btn.addEventListener('click', () => treasureAnswer(btn, c, q, chest));
    box.appendChild(btn);
  });
  setFeedback('クイズに こたえると たからばこが あくよ✨', '');
}

function treasureAnswer(btn, choice, q, chest) {
  const t = treasure;
  if (!t || btn.disabled) return;
  if (choice === q.answer) {
    chest.opened = true;
    soundCorrect();
    document.querySelectorAll('.choice-btn').forEach((b) => (b.disabled = true));
    btn.classList.add('correct');
    if (chest.kind === 'key') {
      t.keys++;
      setFeedback(`🔑 かぎを てにいれた！（かぎ ×${t.keys}）`, 'good');
    } else {
      totalStars++;
      earnedThisSet++;
      saveStars();
      setFeedback(`${pick(PRAISES)} おたから💎と スターを ゲット！`, 'good');
    }
    setTimeout(() => {
      if (treasure !== t) return; // 途中で離脱・再開していたら何もしない
      t.busy = false;
      renderTreasureMap();
      if (chest.kind === 'key') {
        setFeedback('かぎを つかえる とびら🚪を さがそう！', '');
      } else {
        setFeedback('つぎの たからばこを さがそう！', '');
      }
    }, 1300);
  } else {
    btn.classList.add('wrong');
    btn.disabled = true;
    soundTry();
    setFeedback(`おしい！ヒント：${q.hint} もういちど やってみよう💪`, 'try');
  }
}

function finishTreasure() {
  const t = treasure;
  const opened = t.chests.filter((c) => c.opened).length;
  const extra = `（かぎ のこり ${t.keys}こ・たからばこ ${opened}／${t.chests.length} あけた）`;
  treasure = null;
  finishCustomSet('ゴール！ぼうけん クリア！🏆', extra);
}

/* ============ めもりーカード（神経衰弱） ============ */
// ペア生成（純粋関数寄り・検証可能）: 戻り値 { total, deck:[{pair, kind, label}] }
// deck はシャッフル済みで、各 pair はちょうど2枚（対応する2種のカード）
// ようちえん: ひらがなカード ⇔ その文字で始まる絵カード（MOJI_KIDS と整合、かなは重複させない）
// しょうがくせい: 九九の式カード ⇔ 答えカード（積が重複しない式だけを採用し、対応を一意にする）
function genMemoryDeck() {
  if (course === 'kids') {
    const usedKana = new Set();
    const items = [];
    for (const m of shuffle(MOJI_KIDS)) {
      if (items.length >= 6) break;
      if (usedKana.has(m[2])) continue;
      usedKana.add(m[2]);
      items.push(m);
    }
    const deck = [];
    items.forEach(([, emoji, kana], i) => {
      deck.push({ pair: i, kind: 'kana', label: kana });
      deck.push({ pair: i, kind: 'emoji', label: emoji });
    });
    return { total: items.length, deck: shuffle(deck) };
  }
  const usedProduct = new Set();
  const pairs = [];
  const combos = [];
  for (let a = 2; a <= 9; a++) for (let b = 2; b <= 9; b++) combos.push([a, b]);
  for (const [a, b] of shuffle(combos)) {
    if (pairs.length >= 8) break;
    const p = a * b;
    if (usedProduct.has(p)) continue;
    usedProduct.add(p);
    pairs.push([a, b, p]);
  }
  const deck = [];
  pairs.forEach(([a, b, p], i) => {
    deck.push({ pair: i, kind: 'formula', label: `${a}×${b}` });
    deck.push({ pair: i, kind: 'answer', label: String(p) });
  });
  return { total: pairs.length, deck: shuffle(deck) };
}

let memoryState = null;

function startMemory() {
  const { total, deck } = genMemoryDeck();
  memoryState = { total, deck, open: [], matched: new Set(), lock: false, flips: 0, timer: null };
  customCleanup = () => {
    if (memoryState && memoryState.timer) clearTimeout(memoryState.timer);
    memoryState = null;
  };
  renderMemory();
  setFeedback('カードを めくって、同じ ペアを さがしてね！', '');
}

function renderMemory() {
  const st = memoryState;
  if (!st) return;
  $('#progress').textContent = `ペア ${st.matched.size}／${st.total}`;
  let cards = '';
  st.deck.forEach((card, i) => {
    const up = st.matched.has(card.pair) || st.open.includes(i);
    const cls = 'memory-card' + (up ? ' up' : '') + (st.matched.has(card.pair) ? ' matched' : '')
      + (card.label.length >= 3 ? ' long' : '');
    cards += `<button class="${cls}" data-idx="${i}">${up ? card.label : '🏝️'}</button>`;
  });
  $('#question').innerHTML =
    `<span class="prompt">🃏 めもりーカード：同じ ペアを さがそう！</span><div class="memory-grid">${cards}</div>`;
  const box = $('#choices');
  box.className = 'choices stage-mode';
  box.innerHTML = '';
  $('#question').querySelectorAll('.memory-card').forEach((b) => {
    b.addEventListener('click', () => flipMemoryCard(parseInt(b.dataset.idx, 10)));
  });
}

function flipMemoryCard(idx) {
  const st = memoryState;
  if (!st || st.lock) return;
  const card = st.deck[idx];
  if (st.matched.has(card.pair) || st.open.includes(idx)) return;
  st.open.push(idx);
  st.flips++;
  tone(520, 0, 0.07, 'sine', 0.07);
  renderMemory();
  if (st.open.length < 2) return;
  const [i, j] = st.open;
  if (st.deck[i].pair === st.deck[j].pair) {
    st.matched.add(card.pair);
    st.open = [];
    totalStars++;
    earnedThisSet++;
    saveStars();
    soundCorrect();
    renderMemory();
    if (st.matched.size === st.total) {
      st.lock = true;
      setFeedback('全部の ペアが そろった！🎉', 'good');
      st.timer = setTimeout(() => {
        if (memoryState !== st) return;
        memoryState = null;
        finishCustomSet('全部の ペアが そろった！クリア！🏆', `（カードを めくった回数：${st.flips}回）`);
      }, 1300);
    } else {
      setFeedback(`${pick(PRAISES)} スターを ゲット！`, 'good');
    }
  } else {
    st.lock = true;
    soundTry();
    setFeedback('ちがう ペアだよ。場所を おぼえて もういちど！', 'try');
    st.timer = setTimeout(() => {
      if (memoryState !== st) return;
      st.open = [];
      st.lock = false;
      renderMemory();
    }, 950);
  }
}

/* ============ つりたいかい（フィッシング） ============ */
// 条件判定（検証用に分離）: ようちえんの数条件
function fishingKidsTest(cond, n) {
  if (cond.kind === 'bigger') return n > cond.t;
  if (cond.kind === 'smaller') return n < cond.t;
  if (cond.kind === 'even') return n % 2 === 0;
  return n % 2 === 1; // odd
}

// ラウンド生成（純粋関数寄り・検証可能）: 戻り値 { prompt, cond, fish:[{label, match}] }
// 条件に合う魚は必ず2〜3匹。cond は機械検証用（{kind:'bigger'|'smaller'|'even'|'odd', t} /
// {kind:'mult', base} / {kind:'formula', op:'mul'|'add', target}）
function genFishingRound() {
  if (course === 'kids') {
    const type = pick(['bigger', 'smaller', 'even', 'odd']);
    let prompt, cond;
    // しきい値は、該当・非該当どちらも4以上残る範囲にする（魚5〜6匹・該当2〜3匹を必ず作れる）
    if (type === 'bigger') { const t = rand(4, 6); cond = { kind: 'bigger', t }; prompt = `${t}より 大きい かずの さかなを 全部 つろう！`; }
    else if (type === 'smaller') { const t = rand(5, 7); cond = { kind: 'smaller', t }; prompt = `${t}より 小さい かずの さかなを 全部 つろう！`; }
    else if (type === 'even') { cond = { kind: 'even' }; prompt = 'ぐうすう（2・4・6・8・10）の さかなを 全部 つろう！'; }
    else { cond = { kind: 'odd' }; prompt = 'きすう（1・3・5・7・9）の さかなを 全部 つろう！'; }
    const test = (n) => fishingKidsTest(cond, n);
    const all = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const yes = all.filter(test);
    const no = all.filter((n) => !test(n));
    const need = rand(2, 3);
    const count = rand(5, 6);
    const nums = shuffle([...yes.slice(0, need), ...no.slice(0, count - need)]);
    return { prompt, cond, fish: nums.map((n) => ({ label: String(n), match: test(n) })) };
  }
  if (Math.random() < 0.5) {
    // 倍数
    const base = pick([2, 3, 4, 5, 6, 7, 8, 9]);
    const cond = { kind: 'mult', base };
    const mults = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => base * k));
    const nonPool = shuffle(Array.from({ length: 68 }, (_, i) => i + 3).filter((n) => n % base !== 0));
    const need = rand(2, 3);
    const nums = shuffle([...mults.slice(0, need), ...nonPool.slice(0, 6 - need)]);
    return {
      prompt: `${base}の ばいすうの さかなを 全部 つろう！`,
      cond,
      fish: nums.map((n) => ({ label: String(n), match: n % base === 0 })),
    };
  }
  // 答えが目標になる式
  if (Math.random() < 0.5) {
    const byProduct = new Map();
    for (let a = 2; a <= 9; a++) for (let b = 2; b <= 9; b++) {
      const p = a * b;
      if (!byProduct.has(p)) byProduct.set(p, []);
      byProduct.get(p).push(`${a}×${b}`);
    }
    // 同じ答えになる式が3つ以上ある積だけを狙う（該当魚を2〜3匹そろえられる）
    const targets = [...byProduct.entries()].filter(([, list]) => list.length >= 3);
    const [target, formulas] = pick(targets);
    const need = rand(2, 3);
    const matchLabels = shuffle(formulas).slice(0, need);
    const others = [];
    byProduct.forEach((list, p) => { if (p !== target) others.push(...list); });
    const nonLabels = shuffle(others).slice(0, 6 - need);
    return {
      prompt: `答えが ${target} に なる 式の さかなを 全部 つろう！`,
      cond: { kind: 'formula', op: 'mul', target },
      fish: shuffle([
        ...matchLabels.map((label) => ({ label, match: true })),
        ...nonLabels.map((label) => ({ label, match: false })),
      ]),
    };
  }
  const target = rand(10, 30);
  const pairs = [];
  for (let a = 2; a <= target - 2; a++) pairs.push(`${a}＋${target - a}`);
  const need = rand(2, 3);
  const matchLabels = shuffle(pairs).slice(0, need);
  const used = new Set(matchLabels);
  const nonLabels = [];
  while (nonLabels.length < 6 - need) {
    const a = rand(2, 30), b = rand(2, 30);
    if (a + b === target) continue;
    const label = `${a}＋${b}`;
    if (used.has(label)) continue;
    used.add(label);
    nonLabels.push(label);
  }
  return {
    prompt: `答えが ${target} に なる 式の さかなを 全部 つろう！`,
    cond: { kind: 'formula', op: 'add', target },
    fish: shuffle([
      ...matchLabels.map((label) => ({ label, match: true })),
      ...nonLabels.map((label) => ({ label, match: false })),
    ]),
  };
}

const FISH_SLOTS = [[3, 8], [36, 3], [68, 9], [9, 55], [42, 58], [71, 52]];
const FISH_EMOJIS = ['🐟', '🐠', '🐡', '🐟', '🐠', '🐡'];
let fishingState = null;

function startFishing() {
  fishingState = { round: 0, lock: false, timer: null, current: null, left: 0 };
  customCleanup = () => {
    if (fishingState && fishingState.timer) clearTimeout(fishingState.timer);
    fishingState = null;
  };
  renderFishingRound();
}

function renderFishingRound() {
  const st = fishingState;
  if (!st) return;
  st.lock = false;
  const r = genFishingRound();
  st.current = r;
  st.left = r.fish.filter((f) => f.match).length;
  $('#progress').textContent = `だい ${st.round + 1} もん ／ ${QUESTIONS_PER_SET} もん`;
  $('#question').innerHTML = `<span class="prompt">🎣 つりたいかい</span><span class="big-word">${r.prompt}</span>`;
  setFeedback(`お題に 合う さかなは ${st.left} ひき いるよ。全部 つろう！`, '');
  const box = $('#choices');
  box.className = 'choices stage-mode';
  box.innerHTML = '';
  const stage = document.createElement('div');
  stage.className = 'target-stage sea-stage';
  r.fish.forEach((f, i) => {
    const b = document.createElement('button');
    b.className = 'fish-btn';
    b.innerHTML = `<span class="fish-emoji">${FISH_EMOJIS[i % FISH_EMOJIS.length]}</span><span class="fish-label">${f.label}</span>`;
    b.style.left = `${FISH_SLOTS[i][0]}%`;
    b.style.top = `${FISH_SLOTS[i][1]}%`;
    b.style.animationDuration = `${(2.2 + Math.random() * 1.8).toFixed(2)}s`;
    b.style.animationDelay = `${(Math.random() * 0.9).toFixed(2)}s`;
    b.addEventListener('click', () => tapFish(b, f));
    stage.appendChild(b);
  });
  box.appendChild(stage);
}

function tapFish(btn, f) {
  const st = fishingState;
  if (!st || st.lock || btn.classList.contains('caught')) return;
  if (f.match) {
    btn.classList.add('caught');
    btn.disabled = true;
    st.left--;
    tone(880, 0, 0.1, 'sine', 0.12);
    tone(1175, 0.09, 0.16, 'sine', 0.12);
    if (st.left > 0) {
      setFeedback(`つれた！🎣 あと ${st.left} ひき`, 'good');
      return;
    }
    st.lock = true;
    totalStars++;
    earnedThisSet++;
    saveStars();
    soundCorrect();
    setFeedback(`${pick(PRAISES)} スターを ゲット！`, 'good');
    st.timer = setTimeout(() => {
      if (fishingState !== st) return;
      st.round++;
      if (st.round >= QUESTIONS_PER_SET) {
        fishingState = null;
        finishCustomSet(
          earnedThisSet === QUESTIONS_PER_SET
            ? '全部の お題を クリア！かんぺきだね！🏆'
            : `${QUESTIONS_PER_SET}もん おわったよ！`
        );
      } else {
        renderFishingRound();
      }
    }, 1200);
  } else {
    btn.classList.add('wrongfish');
    soundTry();
    setFeedback('ちがうよ！その さかなは お題に 合わないよ。よく見て もういちど！', 'try');
    setTimeout(() => btn.classList.remove('wrongfish'), 650);
  }
}

/* ============ てんびんマスター ============ */
// 問題生成（純粋関数寄り・検証可能）: 戻り値 { target, targetLabel, weights:[{value, label}] }
// ようちえん: 右の皿は絵の個数（＝重さ）。手持ちは 1〜5 のおもり各1個（部分和で 0〜15 全部作れる）
// しょうがくせい: 目標は2桁。先に「解になる組み合わせ」を作ってから外れのおもりを足すので到達可能が保証される
function genBalanceQuestion() {
  if (course === 'kids') {
    const target = rand(3, 9);
    const emoji = pick(['🍎', '🍊', '🍓', '🍌', '🍑', '🍇']);
    return {
      target,
      targetLabel: emoji.repeat(target),
      weights: shuffle([1, 2, 3, 4, 5]).map((v) => ({ value: v, label: String(v) })),
    };
  }
  const target = rand(13, 58);
  const sol = [];
  let rest = target;
  while (rest >= 20) { sol.push(20); rest -= 20; }
  if (rest >= 10) { sol.push(10); rest -= 10; }
  if (rest >= 5) { sol.push(5); rest -= 5; }
  if (rest > 0) { sol.push(rest); rest = 0; }
  const values = sol.slice();
  for (const d of shuffle([1, 2, 3, 4, 5, 10])) {
    if (values.length >= sol.length + 3) break;
    values.push(d);
  }
  return {
    target,
    targetLabel: String(target),
    weights: shuffle(values).map((v) => ({ value: v, label: String(v) })),
  };
}

// 皿の上のおもり（丸チップ＋数字）をSVG文字列にする
function panChipsSVG(cx, dishY, values) {
  let s = '';
  values.forEach((v, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const inRow = Math.min(values.length - row * 4, 4);
    const x = cx + (col - (inRow - 1) / 2) * 23;
    const y = dishY - 16 - row * 21;
    s += `<circle cx="${x}" cy="${y}" r="10.5" fill="#ffd93d" stroke="#b8860b" stroke-width="1.6"/>`;
    s += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="10.5" font-weight="bold" fill="#5c4303">${v}</text>`;
  });
  return s;
}

// 天秤のSVG。左が重いと左へ、右が重いと右へ傾く。釣り合うと水平＋✨表示
function balanceSVG(q, leftValues) {
  const leftSum = leftValues.reduce((a, b) => a + b, 0);
  const diff = leftSum - q.target;
  const ang = Math.max(-13, Math.min(13, -diff * 2.4));
  const beamStyle = `transform: rotate(${ang}deg); transform-origin: 160px 56px;`;
  const panLStyle = `transform: rotate(${-ang}deg); transform-origin: 46px 56px;`;
  const panRStyle = `transform: rotate(${-ang}deg); transform-origin: 274px 56px;`;
  return `<svg class="balance-svg" viewBox="0 0 320 196" role="img" aria-label="てんびん">
    <line x1="18" y1="182" x2="302" y2="182" stroke="#8a6d3b" stroke-width="4" stroke-linecap="round"/>
    <polygon points="160,66 138,182 182,182" fill="#c98a46" stroke="#7a4a21" stroke-width="2" stroke-linejoin="round"/>
    <g class="beam" style="${beamStyle}">
      <rect x="26" y="50" width="268" height="12" rx="6" fill="#a9713a" stroke="#7a4a21" stroke-width="2"/>
      <g class="pan" style="${panLStyle}">
        <line x1="46" y1="56" x2="24" y2="104" stroke="#7a4a21" stroke-width="2"/>
        <line x1="46" y1="56" x2="68" y2="104" stroke="#7a4a21" stroke-width="2"/>
        <path d="M 8 104 A 38 12 0 0 0 84 104 Z" fill="#74c0fc" stroke="#3f7fbf" stroke-width="2"/>
        ${panChipsSVG(46, 104, leftValues)}
      </g>
      <g class="pan" style="${panRStyle}">
        <line x1="274" y1="56" x2="252" y2="104" stroke="#7a4a21" stroke-width="2"/>
        <line x1="274" y1="56" x2="296" y2="104" stroke="#7a4a21" stroke-width="2"/>
        <path d="M 236 104 A 38 12 0 0 0 312 104 Z" fill="#ffa8a8" stroke="#c26060" stroke-width="2"/>
        ${panChipsSVG(274, 104, [q.target])}
      </g>
    </g>
    <circle cx="160" cy="56" r="8" fill="#7a4a21"/>
    ${diff === 0 ? '<text x="160" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#2b8a3e">✨ つりあった！ ✨</text>' : ''}
  </svg>`;
}

let balanceState = null;

function startBalance() {
  balanceState = {
    idx: 0,
    questions: Array.from({ length: QUESTIONS_PER_SET }, () => genBalanceQuestion()),
    placed: new Set(),
    lock: false,
    timer: null,
    leftSum: 0,
  };
  customCleanup = () => {
    if (balanceState && balanceState.timer) clearTimeout(balanceState.timer);
    balanceState = null;
  };
  renderBalance();
  setFeedback('おもりを タップすると 左の お皿に のるよ。もういちど タップすると はずれるよ', '');
}

function renderBalance() {
  const st = balanceState;
  if (!st) return;
  const q = st.questions[st.idx];
  const leftValues = [...st.placed].map((i) => q.weights[i].value);
  st.leftSum = leftValues.reduce((a, b) => a + b, 0);
  $('#progress').textContent = `だい ${st.idx + 1} もん ／ ${QUESTIONS_PER_SET} もん`;
  const rightInfo = course === 'kids'
    ? `<span class="seq">みぎの お皿： ${q.targetLabel}（おもさ ${q.target}）</span>`
    : `<span class="seq">みぎの お皿の おもさは ${q.target}</span>`;
  $('#question').innerHTML =
    `<span class="prompt">⚖️ てんびんマスター：左と 右を 同じ おもさに しよう！</span>` +
    rightInfo +
    balanceSVG(q, leftValues) +
    `<span class="seq">ひだりの お皿： あわせて ${st.leftSum}</span>`;
  const box = $('#choices');
  box.className = 'choices balance-chips';
  box.innerHTML = '';
  q.weights.forEach((w, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn weight-chip' + (st.placed.has(i) ? ' placed' : '');
    btn.textContent = st.placed.has(i) ? `✓ ${w.label}` : w.label;
    btn.addEventListener('click', () => toggleWeight(i));
    box.appendChild(btn);
  });
}

function toggleWeight(i) {
  const st = balanceState;
  if (!st || st.lock) return;
  const q = st.questions[st.idx];
  if (st.placed.has(i)) st.placed.delete(i);
  else st.placed.add(i);
  tone(440, 0, 0.06, 'triangle', 0.08);
  renderBalance();
  const sum = st.leftSum;
  if (sum === q.target) {
    st.lock = true;
    totalStars++;
    earnedThisSet++;
    saveStars();
    soundCorrect();
    setFeedback(`${pick(PRAISES)} つりあった！スターを ゲット！`, 'good');
    st.timer = setTimeout(() => {
      if (balanceState !== st) return;
      st.idx++;
      st.placed = new Set();
      st.lock = false;
      if (st.idx >= QUESTIONS_PER_SET) {
        balanceState = null;
        finishCustomSet(
          earnedThisSet === QUESTIONS_PER_SET
            ? '全部 つりあった！かんぺきだね！🏆'
            : `${QUESTIONS_PER_SET}もん おわったよ！`
        );
      } else {
        renderBalance();
        setFeedback('おもりを タップして 左の お皿に のせよう。もういちど タップすると はずれるよ', '');
      }
    }, 1500);
  } else if (sum > q.target) {
    soundTry();
    setFeedback(`重すぎるよ！いま ${sum}。${q.target} に なるように おもりを はずしてみよう`, 'try');
  } else {
    setFeedback(`あと ${q.target - sum} たりないよ。おもりを 足してみよう`, '');
  }
}

/* ============ イベント ============ */
document.querySelectorAll('.course-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    course = btn.dataset.course;
    localStorage.setItem('manabi-course', course);
    refreshCourseButtons();
    tone(660, 0, 0.1);
  });
});
function refreshCourseButtons() {
  document.querySelectorAll('.course-btn').forEach((b) => {
    b.classList.toggle('selected', b.dataset.course === course);
  });
}

document.querySelectorAll('.game-card').forEach((card) => {
  card.addEventListener('click', () => startGame(card.dataset.game));
});

$('#back-btn').addEventListener('click', () => { runCustomCleanup(); showScreen('screen-top'); });
$('#retry-btn').addEventListener('click', () => startGame(currentGame));
$('#home-btn').addEventListener('click', () => { runCustomCleanup(); showScreen('screen-top'); });

const muteBtn = $('#mute-btn');
function refreshMute() { muteBtn.textContent = muted ? '🔇' : '🔊'; }
muteBtn.addEventListener('click', () => {
  muted = !muted;
  localStorage.setItem('manabi-muted', muted ? '1' : '0');
  refreshMute();
  if (!muted) tone(660, 0, 0.1);
});

/* ============ 初期化 ============ */
refreshCourseButtons();
refreshMute();
saveStars();
showScreen('screen-top');
