'use strict';
/* ═════════ 🎴 섯다 (2장 화투 · 전통 족보 · 콜/하프/따당/다이) ═════════
   20장 화투패(1~10월 각 2장)로 딜러 말레이곰과 1:1 승부!
   - 패 돌리기 시 기본 판돈(bet) 차감 → 내 2장 + 딜러 1장 오픈 상태에서 선택:
     · 다이(포기): 추가 손실 없이 종료
     · 콜(×1): 그대로 승부 (승리 시 판돈 ×2)
     · 하프(×2): 판돈 1배 추가 (승리 시 총베팅 ×2 = 기본 4배)
     · 따당(×3): 판돈 2배 추가 (승리 시 총베팅 ×2 = 기본 6배)
   - 38광땡 / 암행어사 / 땡잡이 역전승 시 보너스 ×1.5 (최대 9배)!
   - 비기거나 구사·멍텅구리 구사 파토 시 판돈 100% 환불. */

const SD_MONTH = {
  1: { n: '송학', bg: '#fff4e6', ac: '#d92626', ic: '🦢' },
  2: { n: '매조', bg: '#fff0f3', ac: '#e11d48', ic: '🌸' },
  3: { n: '벚꽃', bg: '#ffe4ec', ac: '#db2777', ic: '🌺' },
  4: { n: '흑싸리', bg: '#f3f0ff', ac: '#4c1d95', ic: '🌿' },
  5: { n: '난초', bg: '#ecfdf5', ac: '#047857', ic: '🌱' },
  6: { n: '모란', bg: '#fef2f2', ac: '#b91c1c', ic: '🌹' },
  7: { n: '홍싸리', bg: '#fff7ed', ac: '#c2410c', ic: '🍀' },
  8: { n: '공산', bg: '#fefce8', ac: '#b45309', ic: '🌕' },
  9: { n: '국진', bg: '#fdf4ff', ac: '#a21caf', ic: '🌼' },
  10: { n: '단풍', bg: '#fef2f2', ac: '#dc2626', ic: '🍁' },
};

// 20장 섯다 덱: m=월, k='g'(광)|'y'(열끗)|'p'(띠/피)
const SD_DECK = [
  { id: '1g', m: 1, k: 'g' }, { id: '1p', m: 1, k: 'p' },
  { id: '2y', m: 2, k: 'y' }, { id: '2p', m: 2, k: 'p' },
  { id: '3g', m: 3, k: 'g' }, { id: '3p', m: 3, k: 'p' },
  { id: '4y', m: 4, k: 'y' }, { id: '4p', m: 4, k: 'p' },
  { id: '5y', m: 5, k: 'y' }, { id: '5p', m: 5, k: 'p' },
  { id: '6y', m: 6, k: 'y' }, { id: '6p', m: 6, k: 'p' },
  { id: '7y', m: 7, k: 'y' }, { id: '7p', m: 7, k: 'p' },
  { id: '8g', m: 8, k: 'g' }, { id: '8p', m: 8, k: 'p' },
  { id: '9y', m: 9, k: 'y' }, { id: '9p', m: 9, k: 'p' },
  { id: '10y', m: 10, k: 'y' }, { id: '10p', m: 10, k: 'p' },
];

const SD_DDANG = ['', '삥땡', '2땡', '3땡', '4땡', '5땡', '6땡', '7땡', '8땡', '9땡', '장땡'];
const SD_TAUNTS = [
  '🐻 크크… 손 떨리는 소리 들리는데?',
  '🐻 이거 광땡 냄새가 진동하는데~',
  '🐻 쫄리면 다이하고 나가시지!',
  '🐻 오늘 판돈은 내가 다 쓸어간다!',
  '🐻 패가 묵직~하구만, 콜 할 자신 있어?',
  '🐻 혹시 망통 잡고 허세 부리는 건 아니지?',
];

function sdShuffle() {
  const a = SD_DECK.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sdEval(c1, c2) {
  const [a, b] = c1.m <= c2.m ? [c1, c2] : [c2, c1];
  const m1 = a.m, m2 = b.m;
  const bothG = a.k === 'g' && b.k === 'g';
  const bothY = a.k === 'y' && b.k === 'y';

  if (m1 === 3 && m2 === 8 && bothG) return { rank: 300, name: '38광땡', tier: 'god', special: null };
  if (m1 === 1 && m2 === 8 && bothG) return { rank: 280, name: '18광땡', tier: 'kwang', special: null };
  if (m1 === 1 && m2 === 3 && bothG) return { rank: 280, name: '13광땡', tier: 'kwang', special: null };
  if (m1 === m2) return { rank: 200 + m1, name: SD_DDANG[m1], tier: 'ddang', special: null };
  if (m1 === 1 && m2 === 2) return { rank: 160, name: '알리', tier: 'jokbo', special: null };
  if (m1 === 1 && m2 === 4) return { rank: 150, name: '독사', tier: 'jokbo', special: null };
  if (m1 === 1 && m2 === 9) return { rank: 140, name: '구삥', tier: 'jokbo', special: null };
  if (m1 === 1 && m2 === 10) return { rank: 130, name: '장삥', tier: 'jokbo', special: null };
  if (m1 === 4 && m2 === 10) return { rank: 120, name: '장사', tier: 'jokbo', special: null };
  if (m1 === 4 && m2 === 6) return { rank: 110, name: '세륙', tier: 'jokbo', special: null };

  // 특수 족보
  if (m1 === 4 && m2 === 7 && bothY) return { rank: 11, name: '암행어사 (1끗)', tier: 'spec', special: 'amhaeng' };
  if (m1 === 3 && m2 === 7 && a.k === 'g' && b.k === 'y') return { rank: 10, name: '땡잡이 (망통)', tier: 'spec', special: 'ddangjabi' };
  if (m1 === 4 && m2 === 9 && bothY) return { rank: 13, name: '멍텅구리 구사', tier: 'spec', special: 'mggusa' };
  if (m1 === 4 && m2 === 9) return { rank: 13, name: '구사 (3끗)', tier: 'spec', special: 'gusa' };

  const k = (m1 + m2) % 10;
  return { rank: 10 + k, name: k === 9 ? '갑오 (9끗)' : k === 0 ? '망통 (0끗)' : `${k}끗`, tier: k >= 7 ? 'hi' : 'kkeut', special: null };
}

function sdCompare(my, dl) {
  // 1) 암행어사: 13·18광땡 잡음 (38광땡 제외)
  if (my.special === 'amhaeng' && dl.rank === 280) return { res: 'win', bonus: true, note: '⚔️ 암행어사 출두! 광땡을 베었어요!' };
  if (dl.special === 'amhaeng' && my.rank === 280) return { res: 'lose', bonus: false, note: '⚔️ 딜러의 암행어사에게 광땡이 당했어요…' };
  // 2) 땡잡이: 1~9땡 잡음 (장땡 제외)
  if (my.special === 'ddangjabi' && dl.rank >= 201 && dl.rank <= 209) return { res: 'win', bonus: true, note: '🎯 땡잡이 성공! 딜러의 땡을 잡았어요!' };
  if (dl.special === 'ddangjabi' && my.rank >= 201 && my.rank <= 209) return { res: 'lose', bonus: false, note: '🎯 딜러의 땡잡이에게 당했어요…' };
  // 3) 멍텅구리 구사: 상대 9땡 이하일 때 파토(재경기)
  if ((my.special === 'mggusa' && dl.rank <= 209) || (dl.special === 'mggusa' && my.rank <= 209)) {
    return { res: 'rematch', bonus: false, note: '🌀 멍텅구리 구사 발동! 판돈 100% 환불' };
  }
  // 4) 일반 구사: 상대 알리 이하일 때 파토(재경기)
  if ((my.special === 'gusa' && dl.rank <= 160) || (dl.special === 'gusa' && my.rank <= 160)) {
    return { res: 'rematch', bonus: false, note: '🌀 구사 파토! 판돈 100% 환불' };
  }
  if (my.rank > dl.rank) {
    const god = my.rank === 300;
    return { res: 'win', bonus: god, note: god ? '👑 38광땡 천하무적! 보너스 ×1.5 적용!' : '' };
  }
  if (my.rank < dl.rank) return { res: 'lose', bonus: false, note: '' };
  return { res: 'tie', bonus: false, note: '🤝 같은 족보 무승부! 판돈 100% 환불' };
}

function sdCardHTML(c, hidden) {
  if (hidden || !c) {
    return `<div class="sd-card back"><div class="sd-back-in"><span>🎴</span><small>SUNBIT</small></div></div>`;
  }
  const m = SD_MONTH[c.m];
  const badge = c.k === 'g' ? '<i class="sd-b kwang">광</i>' : c.k === 'y' ? '<i class="sd-b yeol">열</i>' : '';
  return `<div class="sd-card front" style="--sb:${m.bg};--sa:${m.ac}">
    <div class="sd-top"><b class="num">${c.m}월</b>${badge}</div>
    <div class="sd-art">${m.ic}</div>
    <div class="sd-bot">${m.n}</div>
  </div>`;
}

function seotdaHTML() {
  const r = C.sd, live = r && r.live, bet = betAmount();
  const cash = (S.me && S.me.cash) || 0;
  const canHalf = live && cash >= r.bet;
  const canDouble = live && cash >= r.bet * 2;
  const hist = (C.sdHist || []).slice(-10);
  const pTag = r ? `<span class="sd-jokbo ${r.pHand.tier}">${esc(r.pHand.name)}</span>` : '';
  const dTag = r && !live ? `<span class="sd-jokbo ${r.dHand.tier}">${esc(r.dHand.name)}</span>` : live ? `<span class="sd-jokbo dim">${r.dCards[0].m}월 + ?</span>` : '';

  return `<div class="card game cgame seotda${r && r.win ? ' win' : ''}${r && r.boom ? ' boom' : ''}" id="sdCard">
    <div class="cg-h"><div><h3>🎴 섯다</h3><p class="desc">화투 2장 승부! 콜·하프·따당으로 판을 키워요</p></div>${live ? `<span class="sd-pot num">판돈 ${won(r.myBet)}</span>` : ''}</div>
    <div class="sd-table">
      <div class="sd-side dealer">
        <div class="sd-who"><span>🐻 딜러 말레이곰</span>${dTag}</div>
        <div class="sd-cards">
          ${r ? sdCardHTML(r.dCards[0], false) + sdCardHTML(r.dCards[1], live) : sdCardHTML(null, true) + sdCardHTML(null, true)}
        </div>
      </div>
      <div class="sd-mid">${live ? `<span class="sd-taunt">${esc(r.taunt)}</span>` : r && r.msg ? `<span class="sd-res">${r.msg}</span>` : `<span class="sd-taunt">패를 돌리면 내 2장 + 딜러 1장이 먼저 공개돼요</span>`}</div>
      <div class="sd-side player">
        <div class="sd-cards">
          ${r ? sdCardHTML(r.pCards[0], false) + sdCardHTML(r.pCards[1], false) : sdCardHTML(null, true) + sdCardHTML(null, true)}
        </div>
        <div class="sd-who"><span>😎 내 패</span>${pTag}</div>
      </div>
    </div>
    ${live ? `<div class="sd-acts">
        <button type="button" class="sd-btn die" id="sdDie" ${C.busy ? 'disabled' : ''}><b>다이</b><small>포기</small></button>
        <button type="button" class="sd-btn call" id="sdCall" ${C.busy ? 'disabled' : ''}><b>콜 ×1</b><small>바로 승부</small></button>
        <button type="button" class="sd-btn half" id="sdHalf" ${C.busy || !canHalf ? 'disabled' : ''}><b>하프 ×2</b><small>+${krwUnits(r.bet)}</small></button>
        <button type="button" class="sd-btn dbl" id="sdDbl" ${C.busy || !canDouble ? 'disabled' : ''}><b>따당 ×3</b><small>+${krwUnits(r.bet * 2)}</small></button>
      </div>`
      : `<button class="cta sd-deal" type="button" id="sdGo" ${bet < MINBET || C.busy ? 'disabled' : ''}>🎴 <span data-betlbl>${won(bet)}</span> 걸고 패 돌리기</button>`}
    ${hist.length ? `<div class="sd-hist">${hist.map(x => `<i class="${x.c}">${x.l}</i>`).join('')}</div>` : ''}
    <details class="sd-guide"><summary>📜 섯다 족보 보기</summary>
      <div class="sd-glist">
        <span><b>38광땡</b> 3광+8광 (최강 · 보너스 ×1.5)</span>
        <span><b>광땡</b> 18광땡 · 13광땡</span>
        <span><b>땡</b> 장땡(10) › 9땡 › … › 삥땡(1)</span>
        <span><b>족보</b> 알리(1·2) › 독사(1·4) › 구삥(1·9) › 장삥(1·10) › 장사(4·10) › 세륙(4·6)</span>
        <span><b>끗</b> 갑오(9끗) › 8끗 › … › 1끗 › 망통(0끗)</span>
        <span><b>특수</b> 암행어사(4열+7열: 광땡 킬) · 땡잡이(3광+7열: 1~9땡 킬) · 구사(4+9: 재경기)</span>
      </div>
    </details>
  </div>`;
}

async function sdDeal() {
  const bet = cCanBet(); if (!bet) return;
  C.busy = true;
  if (!(await cMoney(-bet))) { C.busy = false; return; }
  const deck = sdShuffle();
  const pCards = [deck[0], deck[1]], dCards = [deck[2], deck[3]];
  const pHand = sdEval(pCards[0], pCards[1]), dHand = sdEval(dCards[0], dCards[1]);
  const taunt = SD_TAUNTS[Math.floor(Math.random() * SD_TAUNTS.length)];
  C.busy = false; C.live = true;
  C.sd = { live: true, bet, myBet: bet, pCards, dCards, pHand, dHand, taunt, msg: '', win: false, boom: false };
  buzz(25); renderCasino();
}

async function sdAct(mode) {
  const r = C.sd; if (!r || !r.live || C.busy) return;
  if (mode === 'die') {
    r.live = false; C.live = false;
    r.msg = `🏳️ 다이 (포기) · <b class="down">-${won(r.myBet)}</b> <small>(딜러: ${esc(r.dHand.name)})</small>`;
    C.sdHist = [...(C.sdHist || []), { c: 'D', l: '다이' }].slice(-20);
    buzz(30); renderCasino(); renderAll(); return;
  }
  const addMul = mode === 'dbl' ? 2 : mode === 'half' ? 1 : 0;
  const extra = r.bet * addMul;
  if (extra > 0) {
    if (!S.me || S.me.cash < extra) { toast('현금이 부족해요'); return; }
    C.busy = true;
    const ok = await cMoney(-extra);
    C.busy = false;
    if (!ok) return;
    r.myBet += extra;
  }
  r.live = false; C.live = false;
  const cmp = sdCompare(r.pHand, r.dHand);
  if (cmp.res === 'win') {
    const rawMult = cmp.bonus ? 3 : 2;
    const effMult = Math.min(rawMult * (r.myBet / r.bet), cgCap(r.bet));
    const pay = Math.floor(r.bet * effMult);
    const net = pay - r.myBet;
    C.busy = true; await cMoney(pay); C.busy = false;
    r.win = true;
    r.msg = `🎉 <b>${esc(r.pHand.name)}</b> 승리! <b class="up">+${won(net)}</b>${cmp.note ? `<br><small>${esc(cmp.note)}</small>` : ''}`;
    C.sdHist = [...(C.sdHist || []), { c: 'W', l: '승' }].slice(-20);
    renderCasino();
    cWin(net, cmp.bonus ? `🎴 ${r.pHand.name} 대박!` : `🎴 섯다 ${r.pHand.name} 승리!`);
    if (cmp.bonus || r.myBet >= r.bet * 3) confetti();
    cFeed('섯다 ' + r.pHand.name, +(pay / r.bet).toFixed(1), net, r.myBet);
  } else if (cmp.res === 'rematch' || cmp.res === 'tie') {
    C.busy = true; await cMoney(r.myBet); C.busy = false;
    r.msg = `${esc(cmp.note || '무승부 · 판돈 환불')}`;
    C.sdHist = [...(C.sdHist || []), { c: 'T', l: '무' }].slice(-20);
    renderCasino(); toast(cmp.note || '🤝 무승부! 판돈을 돌려받았어요');
  } else {
    r.boom = true;
    r.msg = `💀 <b>${esc(r.dHand.name)}</b>에게 패배… <b class="down">-${won(r.myBet)}</b>${cmp.note ? `<br><small>${esc(cmp.note)}</small>` : ''}`;
    C.sdHist = [...(C.sdHist || []), { c: 'L', l: '패' }].slice(-20);
    renderCasino();
    cLose(`🎴 딜러 ${r.dHand.name}에 패배… -${won(r.myBet)}`);
    cFeed('섯다', 0, -r.myBet, r.myBet);
  }
  renderAll();
}

document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('button'); if (!t) return;
  switch (t.id) {
    case 'sdGo': sdDeal(); break;
    case 'sdDie': sdAct('die'); break;
    case 'sdCall': sdAct('call'); break;
    case 'sdHalf': sdAct('half'); break;
    case 'sdDbl': sdAct('dbl'); break;
  }
});
