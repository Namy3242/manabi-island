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

const GENERATORS = {
  number: () => (course === 'kids' ? qNumberKids() : qNumberElem()),
  moji: () => (course === 'kids' ? qMojiKids() : qMojiElem()),
  clock: () => qClock(),
};

/* ============ ゲーム進行 ============ */
const QUESTIONS_PER_SET = 10;
let currentGame = null;
let questions = [];
let qIndex = 0;
let earnedThisSet = 0;
let locked = false;

const PRAISES = ['せいかい！すごい！🎉', 'やったね！せいかい！✨', 'ばっちり！せいかい！🌟'];

function startGame(game) {
  currentGame = game;
  questions = Array.from({ length: QUESTIONS_PER_SET }, () => GENERATORS[game]());
  qIndex = 0;
  earnedThisSet = 0;
  showScreen('screen-game');
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
  box.innerHTML = '';
  q.choices.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn' + (q.emojiChoices ? ' emoji-choice' : '');
    btn.textContent = c;
    btn.addEventListener('click', () => answer(btn, c));
    box.appendChild(btn);
  });
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

$('#back-btn').addEventListener('click', () => showScreen('screen-top'));
$('#retry-btn').addEventListener('click', () => startGame(currentGame));
$('#home-btn').addEventListener('click', () => showScreen('screen-top'));

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
