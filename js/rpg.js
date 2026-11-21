'use strict';
/* ═════════ ⚔️ 곰사냥 (게임 탭) ═════════
   원으로 번 돈을 🍯꿀로 바꿔 캐릭터를 키우고, 친구들보다 높이 오르고, 친구 분신을 혼내 줘요.
   - 꿀: 원 → 꿀 수수료 3%, 꿀 → 원 수수료 10% (하루 3억원까지). 꿀은 총자산에 안 들어가요.
   - 사냥: 몬스터를 탭해서 꿀·경험치. 장갑이 있으면 자동 공격.
   - 장비 5부위 × 5단계, 강화 ★25 (★15부터 실패하면 한 칸 떨어짐, 단계를 올리면 별은 0부터).
   - 곰굴 탑 100층: 층마다 제한 시간, 10층마다 보스, 100층 최종보스 👑 말레이곰.
   - 분신 대결: 친구의 지금 장비로 만든 분신과 자동 전투. 하루 5번.
   저장: 지갑 문서(sb2_players/{uid})의 rpg 칸. 탭으로 바뀌는 값은 20초마다 모아서 저장해요. */

/* ───────── 숫자 ───────── */
const G_FEE_IN = 0.03, G_FEE_OUT = 0.1, G_OUT_CAP = 300_000_000, G_DUEL_DAILY = 5, G_MAX_STAR = 25, G_SAVE_MS = 20_000;
const hny = n => krwUnits(Math.max(0, Math.floor(n)));
const gDay = (t = now()) => kstDay(t);
const gWeek = (t = now()) => seasonAt(t).sid;

/* ───────── 장비 ───────── */
// [이름, 아이콘] × 5단계. 단계 가격은 부위 공통
const G_TIER_PRICE = [0, 20_000_000, 200_000_000, 2_000_000_000, 20_000_000_000];
const G_SLOTS = [
  { k: 'w', n: '무기', stat: '공격력', tiers: [['나무 몽둥이', '🪵'], ['개미 송곳', '🗡️'], ['차트 분석검', '⚔️'], ['고래 작살', '🔱'], ['상한가 창', '🔥']], v: [8, 40, 220, 1200, 6500] },
  { k: 'h', n: '투구', stat: '치명타', tiers: [['밀짚모자', '👒'], ['강철 투구', '🪖'], ['호가창 고글', '🥽'], ['세력의 왕관', '👑'], ['황금곰 투구', '🏆']], v: [0.02, 0.05, 0.09, 0.14, 0.2] },
  { k: 'a', n: '갑옷', stat: '공격력·체력', tiers: [['면티', '👕'], ['가죽 조끼', '🦺'], ['손절 방탄복', '🛡️'], ['존버 갑옷', '🥋'], ['다이아손 갑옷', '💎']], v: [2, 10, 50, 280, 1500] },
  { k: 'g', n: '장갑', stat: '자동 공격', tiers: [['목장갑', '🧤'], ['단타 장갑', '✊'], ['매크로 장갑', '🤖'], ['알고리즘 건틀릿', '🦾'], ['초단타 건틀릿', '⚡']], v: [0, 15, 90, 500, 2800] },
  { k: 'b', n: '신발', stat: '꿀 획득', tiers: [['슬리퍼', '🩴'], ['운동화', '👟'], ['존버 장화', '🥾'], ['로켓 부츠', '🚀'], ['달까지 부츠', '🌕']], v: [0, 0.1, 0.25, 0.5, 1.0] },
];
const G_SLOT = Object.fromEntries(G_SLOTS.map(s => [s.k, s]));
const starMul = s => 1 + 0.15 * s;
const starRate = s => s < 5 ? 0.9 : s < 10 ? 0.7 : s < 13 ? 0.5 : s < 15 ? 0.35 : s < 20 ? 0.3 : 0.2;
const starCost = (tier, s) => Math.floor((10_000_000 + G_TIER_PRICE[tier] * 0.02) * Math.pow(1.35, s));
const lvNeed = lv => Math.floor(80 * Math.pow(1.18, lv - 1));

/* ───────── 사냥터 · 탑 ───────── */
const G_ZONES = [
  { n: '개미굴', m: '개미 떼', e: '🐜', hp: 60, honey: 30_000, exp: 5, req: 0 },
  { n: '단타 골목', m: '단타쥐', e: '🐀', hp: 400, honey: 150_000, exp: 18, req: 300 },
  { n: '작전 숲', m: '작전 여우', e: '🦊', hp: 2_500, honey: 600_000, exp: 60, req: 2_000 },
  { n: '공매도 늪', m: '공매도 늑대', e: '🐺', hp: 15_000, honey: 2_500_000, exp: 200, req: 12_000 },
  { n: '세력 바다', m: '세력 고래', e: '🐋', hp: 90_000, honey: 10_000_000, exp: 700, req: 70_000 },
  { n: '황소 평원', m: '성난 황소', e: '🐂', hp: 550_000, honey: 40_000_000, exp: 2_500, req: 400_000 },
];
const G_BOSSES = { 10: ['공매도 늑대왕', '🐺'], 20: ['작전 세력 두목', '🦊'], 30: ['상장폐지 해골', '💀'], 40: ['마진콜 저승사자', '👻'], 50: ['세력 대왕고래', '🐋'],
  60: ['폭락 용', '🐉'], 70: ['서킷브레이커 로봇', '🤖'], 80: ['하락장 북극곰', '🐻‍❄️'], 90: ['블랙스완', '🦢'], 100: ['말레이곰', 'BEAR'] };
function floorMob(f) {
  const boss = G_BOSSES[f], fin = f === 100;
  const z = G_ZONES[Math.min(G_ZONES.length - 1, Math.floor((f - 1) / 17))];
  const hp = Math.round(150 * Math.pow(1.115, f - 1) * (fin ? 8 : boss ? 4 : 1));
  return { f, boss: !!boss, fin, n: boss ? boss[0] : `${f}층 ${z.m}`, e: boss ? boss[1] : z.e, hp, time: fin ? 60_000 : boss ? 30_000 : 15_000 };
}
const floorReward = f => f === 100 ? 10_000_000_000 : f * 2_000_000 * (G_BOSSES[f] ? 5 : 1);

/* ───────── 상태 ───────── */
// G = 내 캐릭터(저장되는 값). 썬빗 스냅샷이 S.me를 바꿔도 G가 기준이에요.
let G = null, G_UID = null, G_DIRTY = false, G_SAVED_AT = 0;
// GV = 화면 상태(저장 안 함)
const GV = { view: 'hunt', mob: null, run: null, duelPick: null, duel: null, duelStep: -1, busy: false, lastAuto: 0 };

function gFresh() {
  return { v: 2, honey: 0, lv: 1, exp: 0, zone: 0, kills: 0,
    gear: { w: { t: 0, s: 0 }, h: { t: 0, s: 0 }, a: { t: 0, s: 0 }, g: { t: 0, s: 0 }, b: { t: 0, s: 0 } },
    tower: { best: 0, bestAt: 0, week: gWeek(), weekBest: 0, beat: 0 },
    duel: { day: gDay(), n: 0, w: 0, l: 0 }, out: { day: gDay(), amt: 0 }, power: 0 };
}
function gLoad() {
  if (!S.me || S.uid === G_UID) return;
  G_UID = S.uid;
  const r = S.me.rpg;
  if (r && r.v === 2) { const f = gFresh(); G = { ...f, ...r, gear: { ...f.gear, ...(r.gear || {}) }, tower: { ...f.tower, ...(r.tower || {}) }, duel: { ...f.duel, ...(r.duel || {}) }, out: { ...f.out, ...(r.out || {}) } }; }
  else { G = gFresh(); if (r && typeof r.meso === 'number') G.honey = Math.max(0, Math.floor(r.meso)); } // 예전 쌀먹 버전에서 산 쌀은 꿀로 1:1
  G.power = gPower(gStats());
}

/* ───────── 능력치 ───────── */
function gStats(g = G) {
  const gear = (g && g.gear) || gFresh().gear, lv = (g && g.lv) || 1;
  const val = k => { const x = gear[k] || { t: 0, s: 0 }; return { v: G_SLOT[k].v[x.t] || 0, s: x.s || 0 }; };
  const w = val('w'), a = val('a'), h = val('h'), gl = val('g'), b = val('b');
  const atk = Math.round((10 + w.v * starMul(w.s) + a.v * starMul(a.s)) * (1 + 0.03 * (lv - 1)));
  const crit = Math.min(0.6, 0.05 + h.v + h.s * 0.004);
  const auto = Math.round(gl.v * starMul(gl.s) * (1 + 0.03 * (lv - 1)));
  const bonus = b.v + b.s * 0.02;
  const hp = Math.round(2000 + atk * 20 + a.v * starMul(a.s) * 40);
  return { atk, crit, auto, bonus, hp, lv };
}
const gPower = st => Math.round(st.atk * (1 + st.crit) * 5 + st.auto * 1.5);
// 친구 저장값으로 능력치 (예전 버전이면 전투력만 보고 대충)
function gStatsOf(r) {
  if (r && r.v === 2) return gStats(r);
  const p = Math.max(50, (r && r.power) || 50);
  return { atk: Math.round(p / 6), crit: 0.08, auto: 0, bonus: 0, hp: 2000 + Math.round(p * 3), lv: (r && (r.lv || r.level)) || 1 };
}

/* ───────── 저장 ───────── */
function gSnapshot() { G.power = gPower(gStats()); return JSON.parse(JSON.stringify(G)); }
// 썬빗의 다른 저장(매매·공격 등)에도 지금 캐릭터를 붙여서, 옛날 값으로 덮어쓰지 않게 해요
const _saveMeRaw = saveMe;
saveMe = function (me, before) { if (G && me && G_UID === S.uid) me.rpg = gSnapshot(); return _saveMeRaw(me, before); };
async function gSave(cashDelta = 0) {
  if (!S.me || !G || S.readOnly) return false;
  const d = Math.round(cashDelta);
  if ((S.me.cash || 0) + d < 0) { toast(`현금이 ${won(-(S.me.cash + d))} 부족해요`); return false; }
  const before = S.me, me = JSON.parse(JSON.stringify(before));
  me.cash = Math.round((me.cash || 0) + d);
  G_DIRTY = false; G_SAVED_AT = Date.now();
  const ok = await saveMe(me, before);
  if (!ok) G_DIRTY = true;
  return ok;
}
function gDirty() { G_DIRTY = true; }
function gAutosave() { if (G_DIRTY && !GV.busy && Date.now() - G_SAVED_AT > G_SAVE_MS) gSave(0); }
document.addEventListener('visibilitychange', () => { if (document.hidden && G_DIRTY) gSave(0); });
window.addEventListener('pagehide', () => { if (G_DIRTY) gSave(0); });

// 돈이 걸린 일: 실패하면 G를 되돌려요
async function gTx(mutate, cashDelta, okMsg) {
  if (GV.busy) return false;
  if (!S.me) { openSheet('join'); return false; }
  const prev = JSON.parse(JSON.stringify(G));
  if (mutate() === false) return false;
  GV.busy = true;
  const ok = await gSave(cashDelta);
  GV.busy = false;
  if (!ok) { G = prev; toast('저장하지 못했어요. 잠시 후 다시 해 주세요'); }
  else if (okMsg) toast(okMsg);
  renderGame();
  return ok;
}

/* ───────── 경험치 · 꿀 ───────── */
function gGain(honey, exp) {
  const st = gStats();
  if (honey) G.honey += Math.floor(honey * (1 + st.bonus));
  G.exp += exp;
  let up = 0;
  while (G.exp >= lvNeed(G.lv) && G.lv < 200) { G.exp -= lvNeed(G.lv); G.lv++; up++; }
  if (up) { gPop(`🎉 Lv.${G.lv}`, 'lvup'); setTimeout(renderGame, 0); }
  gDirty();
}

/* ───────── 전투 (탭) ───────── */
function gNewMob() {
  if (GV.run) { const m = floorMob(GV.run.floor); GV.mob = { ...m, max: m.hp }; return; }
  const z = G_ZONES[G.zone] || G_ZONES[0];
  const hp = Math.round(z.hp * (0.85 + Math.random() * 0.3));
  GV.mob = { n: z.m, e: z.e, hp, max: hp, zone: G.zone };
}
function gHit(dmg, crit, auto) {
  const m = GV.mob; if (!m || m.hp <= 0) return;
  m.hp = Math.max(0, m.hp - dmg);
  if (!auto) gPop((crit ? '💥' : '') + krwUnits(dmg), crit ? 'crit' : '');
  if (m.hp <= 0) gKill();
  gLive();
}
function gTap(x, y) {
  if (!G || !GV.mob) return;
  const st = gStats(), crit = Math.random() < st.crit;
  const dmg = Math.round(st.atk * (0.9 + Math.random() * 0.2) * (crit ? 2 : 1));
  const el = $('#gmMob'); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
  GV.popAt = [x, y];
  gHit(dmg, crit, false);
}
function gKill() {
  if (GV.run) {
    const f = GV.run.floor;
    GV.run.cleared = f;
    if (f > G.tower.best) {
      const r = floorReward(f); G.honey += r; GV.run.earned += r;
      if (f === 100) { G.tower.beat = (G.tower.beat || 0) + 1; addFeed({ kind: 'rpg_boss' }); toast('👑 말레이곰을 쓰러뜨렸어요! 곰굴의 주인이 됐어요'); }
    }
    gGain(0, Math.round(10 * Math.pow(1.1, f - 1)));
    if (f >= 100) { gEndRun('clear'); return; }
    GV.run.floor = f + 1; GV.run.ends = now() + floorMob(f + 1).time;
    gNewMob(); renderGame(); return;
  }
  const z = G_ZONES[GV.mob.zone] || G_ZONES[0];
  G.kills++;
  gPop('+🍯' + hny(z.honey * (1 + gStats().bonus)), 'honey');
  gGain(z.honey, z.exp);
  gNewMob();
}
// 떠오르는 숫자
function gPop(text, cls) {
  const box = $('#gmStage'); if (!box) return;
  const s = document.createElement('span'); s.className = 'gm-pop ' + (cls || ''); s.textContent = text;
  const r = box.getBoundingClientRect(), [x, y] = GV.popAt || [r.left + r.width / 2, r.top + r.height / 2];
  s.style.left = (x - r.left + (Math.random() * 30 - 15)) + 'px'; s.style.top = (y - r.top - 20) + 'px';
  box.appendChild(s); setTimeout(() => s.remove(), 900);
}

/* ───────── 🗼 곰굴 탑 ───────── */
const gCheckpoints = () => { const out = [1]; for (let f = 11; f <= Math.min(91, (G.tower.best || 0) + 1); f += 10) out.push(f); return out; };
function gStartRun(from) {
  if (GV.run) return;
  if (!gCheckpoints().includes(from)) return;
  GV.result = null;
  GV.run = { from, floor: from, cleared: from - 1, ends: now() + floorMob(from).time, earned: 0 };
  GV.view = 'tower'; gNewMob(); renderGame();
}
function gEndRun(why) {
  const run = GV.run; if (!run) return;
  GV.run = null;
  const cleared = run.cleared, wk = gWeek(), t = G.tower, old = t.best;
  if (t.week !== wk) { t.week = wk; t.weekBest = 0; }
  t.weekBest = Math.max(t.weekBest, cleared);
  if (cleared > old) { t.best = cleared; t.bestAt = now(); if (cleared >= 5 && cleared < 100) addFeed({ kind: 'rpg_tower', floor: cleared }); }
  gDirty(); gSave(0);
  GV.result = { why, cleared, from: run.from, newBest: cleared > old, earned: run.earned };
  gNewMob(); renderGame();
}
function gTick() {
  if (!G) return;
  const t = now();
  if (GV.run && t >= GV.run.ends) { gEndRun('time'); return; }
  // 자동 공격: 게임 탭을 보고 있을 때만, 1초에 한 번
  if (S.tab === 'game' && !document.hidden && GV.mob && (GV.view === 'hunt' || GV.run) && t - GV.lastAuto >= 1000) {
    GV.lastAuto = t; const a = gStats().auto; if (a > 0) gHit(a, false, true);
  }
  gAutosave();
}
setInterval(gTick, 250);

/* ───────── 장비 · 강화 ───────── */
function gBuyTier(k) {
  const cur = G.gear[k], t = cur.t + 1, price = G_TIER_PRICE[t]; if (!price) return;
  if (G.honey < price) { toast(`🍯 꿀이 ${hny(price - G.honey)} 부족해요. 환전에서 원을 꿀로 바꿀 수 있어요`); return; }
  const it = G_SLOT[k].tiers[t];
  G.honey -= price; G.gear[k] = { t, s: 0 }; gDirty();
  if (t >= 3) addFeed({ kind: 'rpg_buy', item: it[0], amt: price });
  toast(`${it[1]} ${it[0]} 장착!`); gSave(0); renderGame();
}
function gStar(k) {
  const cur = G.gear[k]; if (cur.s >= G_MAX_STAR) return;
  const cost = starCost(cur.t, cur.s);
  if (G.honey < cost) { toast(`🍯 꿀이 ${hny(cost - G.honey)} 부족해요`); return; }
  G.honey -= cost;
  const ok = Math.random() < starRate(cur.s), it = G_SLOT[k].tiers[cur.t];
  if (ok) { cur.s++; toast(`⭐ 강화 성공! ${it[0]} ★${cur.s}`); if (cur.s >= 15) addFeed({ kind: 'rpg_star', item: it[0], stars: cur.s }); }
  else if (cur.s >= 15) { cur.s--; toast(`💥 강화 실패… ★${cur.s}로 떨어졌어요`); }
  else toast(`💥 강화 실패 (★${cur.s} 유지)`);
  GV.flash = k + (ok ? ':ok' : ':ng');
  gDirty(); if (cur.s >= 12 || !ok) gSave(0); renderGame();
}

/* ───────── 💱 환전 ───────── */
const gOutToday = () => G.out.day === gDay() ? G.out.amt : 0;
function gBuyHoney(amt) {
  amt = Math.floor(Math.min(amt, (S.me && S.me.cash) || 0));
  if (amt < 1_000_000) { toast('100만원부터 바꿀 수 있어요'); return; }
  const h = Math.floor(amt * (1 - G_FEE_IN));
  gTx(() => { G.honey += h; }, -amt, `💱 ${won(amt)} → 🍯 ${hny(h)} 꿀`);
}
function gSellHoney(amt) {
  const room = Math.max(0, G_OUT_CAP - gOutToday());
  if (room <= 0) { toast(`오늘 꿀→원 한도(${won(G_OUT_CAP)})를 다 썼어요`); return; }
  amt = Math.floor(Math.min(amt, G.honey, room / (1 - G_FEE_OUT)));
  if (amt < 1_000_000) { toast('100만 꿀부터 바꿀 수 있어요'); return; }
  const w = Math.floor(amt * (1 - G_FEE_OUT));
  gTx(() => { G.honey -= amt; G.out = { day: gDay(), amt: gOutToday() + w }; }, w, `💱 🍯 ${hny(amt)} 꿀 → ${won(w)}`);
}
const gParse = s => { const t = String(s || '').replace(/[\s,원꿀]/g, ''), m = t.match(/^(\d+(?:\.\d+)?)(조|억|만)?$/); if (!m) return 0; return Math.floor(parseFloat(m[1]) * ({ 조: 1e12, 억: 1e8, 만: 1e4 }[m[2]] || 1)); };

/* ───────── ⚔️ 분신 대결 ───────── */
const gDuelsToday = () => G.duel.day === gDay() ? G.duel.n : 0;
const duelReward = p => Math.round(Math.min(500_000_000, Math.max(3_000_000, p * 50)));
function gDuel(id) {
  if (gDuelsToday() >= G_DUEL_DAILY) { toast(`오늘 대결은 ${G_DUEL_DAILY}번까지예요`); return; }
  const opp = S.players[id]; if (!opp || id === S.uid) return;
  const A = gStats(), B = gStatsOf(opp.rpg), pa = gPower(A), pb = gPower(B);
  let ha = A.hp, hb = B.hp, turn = Math.random() < 0.5 ? 0 : 1; const rounds = [];
  for (let i = 0; i < 40 && ha > 0 && hb > 0; i++) {
    const s = turn ? B : A, crit = Math.random() < s.crit, dmg = Math.max(1, Math.round(s.atk * (0.75 + Math.random() * 0.5) * (crit ? 2 : 1) + s.auto));
    if (turn) ha = Math.max(0, ha - dmg); else hb = Math.max(0, hb - dmg);
    rounds.push({ who: turn, dmg, crit, ha, hb }); turn = 1 - turn;
  }
  const win = hb <= 0 || (ha > 0 && ha / A.hp >= hb / B.hp), reward = win ? duelReward(pb) : 0;
  const d = G.duel.day === gDay() ? G.duel : { day: gDay(), n: 0, w: 0, l: 0 };
  G.duel = { day: d.day, n: d.n + 1, w: d.w + (win ? 1 : 0), l: d.l + (win ? 0 : 1) };
  G.honey += reward; gDirty(); gSave(0);
  addFeed({ kind: 'rpg_duel', vs: id, win, reward, myPow: pa, oppPow: pb });
  GV.duel = { id, win, reward, rounds, A: { n: S.me.name, hp: A.hp, p: pa }, B: { n: opp.name, hp: B.hp, p: pb } }; GV.duelStep = 0; GV.duelPick = null;
  gDuelAnim();
}
function gDuelAnim() {
  if (!GV.duel || GV.duelStep < 0 || GV.duelStep > GV.duel.rounds.length + 1) return;
  if (S.tab === 'game' && GV.view === 'duel') renderGame();
  GV.duelStep++;
  if (GV.duelStep <= GV.duel.rounds.length + 1) setTimeout(gDuelAnim, 120);
}

/* ───────── 화면 ───────── */
const gSec = () => $('#tab-game');
const mobFace = m => m.e === 'BEAR' ? `<img src="bear.jpg" alt="말레이곰" class="gm-bear">` : `<span class="gm-emo">${m.e}</span>`;
function gHeader() {
  const st = gStats(), need = lvNeed(G.lv);
  return `<div class="card gm-top">
    <div class="gm-id">${ava({ id: S.uid, ...S.me }, true)}<div><b>${esc(S.me.name)} <span class="gm-lv">Lv.${G.lv}</span></b>
      <small>⚡ 전투력 <b class="num">${gPower(st).toLocaleString('ko-KR')}</b>${G.tower.beat ? ' · 👑 말레이곰 처치' : ''}</small></div></div>
    <div class="gm-xp"><i style="width:${Math.min(100, G.exp / need * 100).toFixed(1)}%"></i></div>
    <div class="gm-money"><span>🍯 <b class="num" id="gmHoney">${hny(G.honey)}</b> 꿀</span><span class="dim">현금 <b class="num">${won(S.me.cash || 0)}</b></span></div>
  </div>`;
}
function gTabs() {
  const T = [['hunt', '사냥'], ['tower', '곰굴 탑'], ['gear', '장비'], ['duel', '대결'], ['swap', '환전']];
  return `<div class="xtabs gm-tabs" role="tablist">${T.map(([k, l]) => `<button type="button" role="tab" data-gview="${k}" aria-selected="${GV.view === k}" ${GV.run && k !== 'tower' ? 'disabled' : ''}>${l}</button>`).join('')}</div>`;
}
function gStageHTML(sub) {
  const m = GV.mob;
  return `<div class="gm-stage${m.fin ? ' fin' : m.boss ? ' boss' : ''}" id="gmStage">
    <div class="gm-mobname">${m.fin ? '👑 최종보스 ' : m.boss ? '⚠️ 보스 ' : ''}${esc(m.n)}</div>
    <button type="button" class="gm-mob" id="gmMob" aria-label="공격">${mobFace(m)}</button>
    <div class="gm-hp"><i id="gmHpBar" style="width:${(m.hp / m.max * 100).toFixed(1)}%"></i><span id="gmHpTxt" class="num">${krwUnits(m.hp)} / ${krwUnits(m.max)}</span></div>
    ${sub || ''}
  </div>`;
}
function gHuntHTML() {
  const pow = gPower(gStats()), z = G_ZONES[G.zone];
  return gStageHTML(`<small class="gm-hint">탭해서 공격 · 한 마리에 🍯 ${hny(z.honey * (1 + gStats().bonus))}</small>`) +
    `<div class="sec"><div class="sec-h"><h2>사냥터</h2><small>전투력이 모자라면 못 들어가요</small></div>
    <div class="gm-zones">${G_ZONES.map((x, i) => { const lock = pow < x.req;
      return `<button type="button" class="gm-zone${i === G.zone ? ' on' : ''}" data-gzone="${i}" ${lock ? 'disabled' : ''}><span>${x.e}</span><b>${x.n}</b><small>${lock ? `🔒 ⚡${krwUnits(x.req)}` : `🍯 ${hny(x.honey)}`}</small></button>`; }).join('')}</div></div>`;
}
function gTowerHTML() {
  if (GV.run) {
    const m = floorMob(GV.run.floor), left = Math.max(0, GV.run.ends - now());
    return `<div class="gm-run"><b>🗼 ${GV.run.floor}층</b><span class="num" id="gmTimer">${(left / 1000).toFixed(1)}초</span><button type="button" class="gm-quit" data-gquit>포기</button></div>
      <div class="gm-timebar"><i id="gmTimeBar" style="width:${(left / m.time * 100).toFixed(1)}%"></i></div>` + gStageHTML(`<small class="gm-hint">${m.fin ? '말레이곰을 쓰러뜨리면 곰굴의 주인!' : '시간 안에 쓰러뜨리면 다음 층'}</small>`);
  }
  const t = G.tower, wk = gWeek(), res = GV.result, cps = gCheckpoints();
  const rk = key => activePlayers().map(p => { const r = p.id === S.uid ? G.tower : p.rpg && p.rpg.tower; return { p, v: r ? (key === 'week' ? (r.week === wk ? r.weekBest || 0 : 0) : r.best || 0) : 0, beat: r && r.beat }; }).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const mode = GV.tRank || 'week', rows = rk(mode);
  return `${res ? `<div class="card gm-res ${res.newBest ? 'good' : ''}"><b>${res.why === 'clear' ? '👑 100층 정복!' : res.why === 'quit' ? '🏳️ 포기했어요' : '⏱ 시간 끝'} · ${res.cleared}층까지</b>
      <small>${res.newBest ? `최고 기록! 처음 깬 층 보상 🍯 ${hny(res.earned)}` : `최고 기록 ${t.best}층`}</small></div>` : ''}
    <div class="card gm-towerhead"><div class="gm-bossline"><img src="bear.jpg" alt="" class="gm-bear sm"><div><b>100층에 말레이곰이 기다려요</b>
      <small>층마다 15초, 10층마다 보스 30초, 말레이곰 60초. 처음 깨는 층마다 꿀 보상 (말레이곰 🍯 ${hny(floorReward(100))})</small></div></div>
      <div class="gm-best"><span>최고 <b>${t.best}층</b></span><span>이번 주 <b>${t.week === wk ? t.weekBest : 0}층</b></span></div>
      <div class="gm-starts">${cps.map(f => `<button type="button" class="cta${f === cps[cps.length - 1] ? '' : ' soft'}" data-grun="${f}">${f}층부터</button>`).join('')}</div></div>
    <div class="sec"><div class="sec-h"><h2>🏆 탑 순위</h2><div class="hswitch">${[['week', '이번 주'], ['all', '역대']].map(([k, l]) => `<button type="button" data-gtrank="${k}" aria-selected="${mode === k}">${l}</button>`).join('')}</div></div>
      ${rows.length ? `<div class="card gm-list">${rows.map((x, i) => `<button type="button" class="lrow" data-player="${esc(x.p.id)}"><span class="rk${i < 3 ? ' r' + (i + 1) : ''}">${i + 1}</span>${ava(x.p)}<span class="nm"><b>${esc(x.p.name)}</b>${x.beat ? '<small>👑 말레이곰 처치</small>' : ''}</span><b class="num">${x.v}층</b></button>`).join('')}</div>` : '<div class="empty">아직 아무도 안 올라갔어요. 첫 기록을 세워 보세요!</div>'}</div>`;
}
function gGearHTML() {
  const st = gStats();
  return `<div class="gm-stats"><span>공격력<b class="num">${st.atk.toLocaleString('ko-KR')}</b></span><span>치명타<b class="num">${Math.round(st.crit * 100)}%</b></span><span>자동<b class="num">${st.auto.toLocaleString('ko-KR')}/초</b></span><span>꿀 획득<b class="num">+${Math.round(st.bonus * 100)}%</b></span></div>
    <div class="gm-gear">${G_SLOTS.map(sl => { const cur = G.gear[sl.k], it = sl.tiers[cur.t], nx = sl.tiers[cur.t + 1], cost = starCost(cur.t, cur.s), max = cur.s >= G_MAX_STAR, fl = GV.flash && GV.flash.startsWith(sl.k) ? (GV.flash.endsWith('ok') ? ' ok' : ' ng') : '';
      return `<div class="card gm-item${fl}"><div class="gm-it"><span class="gm-ic">${it[1]}</span><div><small>${sl.n} · ${sl.stat}</small><b>${esc(it[0])}${cur.s ? ` <em>★${cur.s}</em>` : ''}</b></div></div>
        <div class="gm-stars">${Array.from({ length: G_MAX_STAR }, (_, i) => `<i class="${i < cur.s ? 'on' : ''}"></i>`).join('')}</div>
        <div class="gm-act"><button type="button" class="gm-btn star" data-gstar="${sl.k}" ${max ? 'disabled' : ''}>${max ? 'MAX ★25' : `⭐ 강화 ${Math.round(starRate(cur.s) * 100)}%<small>🍯 ${hny(cost)}${cur.s >= 15 ? ' · 실패 시 ★-1' : ''}</small>`}</button>
          ${nx ? `<button type="button" class="gm-btn" data-gtier="${sl.k}">${nx[1]} ${esc(nx[0])}<small>🍯 ${hny(G_TIER_PRICE[cur.t + 1])}${cur.s ? ' · 별 초기화' : ''}</small></button>` : ''}</div></div>`; }).join('')}</div>`;
}
function gDuelHTML() {
  const d = GV.duel, myP = gPower(gStats());
  let arena = '';
  if (d && GV.duelStep >= 0) {
    const done = GV.duelStep > d.rounds.length, r = d.rounds[Math.min(GV.duelStep, d.rounds.length) - 1];
    const ha = r ? r.ha : d.A.hp, hb = r ? r.hb : d.B.hp;
    arena = `<div class="card gm-arena ${done ? (d.win ? 'win' : 'lose') : ''}">
      <div class="gm-f"><b>${esc(d.A.n)}</b><small>⚡${d.A.p.toLocaleString('ko-KR')}</small><div class="gm-hp sm"><i style="width:${(ha / d.A.hp * 100).toFixed(1)}%"></i></div></div>
      <div class="gm-vs">${done ? (d.win ? '🏆 승리' : '💀 패배') : r ? `${r.who ? '◀' : '▶'} ${krwUnits(r.dmg)}${r.crit ? '!' : ''}` : 'VS'}</div>
      <div class="gm-f"><b>${esc(d.B.n)}</b><small>⚡${d.B.p.toLocaleString('ko-KR')}</small><div class="gm-hp sm"><i style="width:${(hb / d.B.hp * 100).toFixed(1)}%"></i></div></div>
      ${done && d.win ? `<div class="gm-rew">+🍯 ${hny(d.reward)} 꿀</div>` : ''}</div>`;
  }
  const opps = activePlayers().filter(p => p.id !== S.uid).map(p => ({ p, pw: gPower(gStatsOf(p.rpg)) })).sort((a, b) => b.pw - a.pw);
  const left = G_DUEL_DAILY - gDuelsToday(), busy = d && GV.duelStep >= 0 && GV.duelStep <= d.rounds.length;
  return `${arena}<p class="gm-note">친구의 지금 장비 그대로 만든 분신과 싸워요. 오늘 <b>${left}번</b> 남았어요 · 전적 ${G.duel.w}승 ${G.duel.l}패</p>
    <div class="card gm-list">${opps.map(({ p, pw }) => `<div class="lrow gm-opp${GV.duelPick === p.id ? ' pick' : ''}">${ava(p)}<span class="nm"><b>${esc(p.name)}</b><small>⚡${pw.toLocaleString('ko-KR')} · ${pw > myP ? '나보다 셈' : '나보다 약함'}</small></span>
      <button type="button" class="gm-fight${pw > myP ? ' hard' : ''}" data-gduel="${esc(p.id)}" ${left <= 0 || busy ? 'disabled' : ''}>${pw > myP ? '도전' : '혼내기'}</button></div>`).join('') || '<div class="empty">아직 대결할 친구가 없어요</div>'}</div>`;
}
function gSwapHTML() {
  const room = Math.max(0, G_OUT_CAP - gOutToday()), cash = S.me.cash || 0;
  const chips = (kind, base, labels) => `<div class="gm-chips">${[0.1, 0.25, 0.5, 1].map((f, i) => `<button type="button" data-gfill="${kind}:${Math.floor(base * f)}">${labels[i]}</button>`).join('')}</div>`;
  return `<div class="card gm-swap"><b>💵 원 → 🍯 꿀</b><small>1원 = 1꿀, 수수료 ${G_FEE_IN * 100}%. 바꾼 원은 총자산에서 빠져요.</small>
      <div class="gm-in"><input id="gmInW" inputmode="numeric" placeholder="예: 5억" autocomplete="off"><button type="button" class="cta" data-gswap="in">바꾸기</button></div>${chips('in', cash, ['10%', '25%', '50%', '전부'])}</div>
    <div class="card gm-swap"><b>🍯 꿀 → 💵 원</b><small>수수료 ${G_FEE_OUT * 100}%, 하루 ${won(G_OUT_CAP)}까지 · 오늘 남은 한도 <b>${won(room)}</b></small>
      <div class="gm-in"><input id="gmInH" inputmode="numeric" placeholder="예: 1억" autocomplete="off"><button type="button" class="cta cover" data-gswap="out">바꾸기</button></div>${chips('out', Math.min(G.honey, room / (1 - G_FEE_OUT)), ['10%', '25%', '50%', '최대'])}</div>`;
}
function renderGame() {
  const el = gSec(); if (!el) return;
  if (!S.me) { el.innerHTML = `<div class="empty">썬빗에 참가하면 곰사냥을 할 수 있어요<br><br><button type="button" class="cta" data-join>참가하기</button></div>`; return; }
  gLoad();
  if (!GV.mob || (!GV.run && GV.mob.zone !== G.zone)) gNewMob();
  const body = { hunt: gHuntHTML, tower: gTowerHTML, gear: gGearHTML, duel: gDuelHTML, swap: gSwapHTML }[GV.view] || gHuntHTML;
  const keep = ['gmInW', 'gmInH'].map(id => { const i = document.getElementById(id); return i ? [id, i.value] : null; }).filter(Boolean);
  el.innerHTML = gHeader() + gTabs() + body();
  keep.forEach(([id, v]) => { const i = document.getElementById(id); if (i) i.value = v; });
  GV.flash = null;
}
// 1초마다 / 탭할 때: 숫자만 바꿔요 (다시 그리면 떠오르는 숫자·입력이 끊겨요)
function gLive() {
  if (S.tab !== 'game' || !G) return;
  const m = GV.mob, bar = $('#gmHpBar'), tx = $('#gmHpTxt');
  if (m && bar) { bar.style.width = (m.hp / m.max * 100).toFixed(1) + '%'; if (tx) tx.textContent = `${krwUnits(m.hp)} / ${krwUnits(m.max)}`; }
  const h = $('#gmHoney'); if (h) h.textContent = hny(G.honey);
  if (GV.run) { const left = Math.max(0, GV.run.ends - now()), tb = $('#gmTimeBar'), tt = $('#gmTimer');
    if (tb) tb.style.width = (left / floorMob(GV.run.floor).time * 100).toFixed(1) + '%'; if (tt) tt.textContent = (left / 1000).toFixed(1) + '초'; }
}
setInterval(() => { if (GV.run) gLive(); }, 100);

/* ───────── 입력 ───────── */
document.addEventListener('pointerdown', e => {
  const m = e.target.closest && e.target.closest('#gmMob'); if (!m) return;
  e.preventDefault(); gTap(e.clientX, e.clientY);
});
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('button'); if (!t || !G) return;
  const d = t.dataset;
  if (d.gview) { GV.view = d.gview; GV.result = null; renderGame(); }
  else if (d.gzone) { G.zone = +d.gzone; gDirty(); gNewMob(); renderGame(); }
  else if (d.grun) gStartRun(+d.grun);
  else if (t.hasAttribute('data-gquit')) gEndRun('quit');
  else if (d.gtrank) { GV.tRank = d.gtrank; renderGame(); }
  else if (d.gstar) gStar(d.gstar);
  else if (d.gtier) gBuyTier(d.gtier);
  else if (d.gduel) gDuel(d.gduel);
  else if (d.gfill) { const [k, v] = d.gfill.split(':'), i = $(k === 'in' ? '#gmInW' : '#gmInH'); if (i) i.value = (+v).toLocaleString('ko-KR'); }
  else if (d.gswap) { const i = $(d.gswap === 'in' ? '#gmInW' : '#gmInH'), v = gParse(i && i.value); if (d.gswap === 'in') gBuyHoney(v); else gSellHoney(v); if (i) i.value = ''; }
  else if (t.id === 'gmMob') { /* pointerdown에서 처리 */ }
  else return;
  e.stopPropagation();
});
// 친구 프로필의 '분신과 대결' / 내 프로필의 '게임하기'
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('[data-gogame]'); if (!t) return;
  e.stopPropagation();
  if (S.profile) closeProfile();
  if (t.dataset.gogame) { GV.view = 'duel'; GV.duelPick = t.dataset.gogame; GV.duel = null; GV.duelStep = -1; } else GV.view = 'hunt';
  goTab('game');
}, true);

/* ───────── 소식 ───────── */
const _feedTextRaw = feedText;
feedText = function (f) {
  if (!f || typeof f.kind !== 'string' || !f.kind.startsWith('rpg_')) return _feedTextRaw(f);
  const nm = esc(nameOf(f.uid));
  switch (f.kind) {
    case 'rpg_star': return typeof f.stars === 'number' ? ['gold', '⭐', `<b>${nm}</b>님이 ${esc(f.item)} <b>★${f.stars}</b> 강화 성공!`] : null;
    case 'rpg_tower': return typeof f.floor === 'number' ? ['gold', '🗼', `<b>${nm}</b>님이 곰굴 탑 <b>${f.floor}층</b>까지 올라갔어요`] : null;
    case 'rpg_boss': return ['gold', '👑', `<b>${nm}</b>님이 곰굴 100층에서 <b>말레이곰</b>을 쓰러뜨렸어요!`];
    case 'rpg_buy': return typeof f.amt === 'number' ? ['up', '🛍️', `<b>${nm}</b>님이 ${esc(f.item)}을(를) 🍯${hny(f.amt)} 꿀에 장만했어요`] : null;
    case 'rpg_dojo': return typeof f.floor === 'number' ? ['gold', '🥋', `<b>${nm}</b>님이 도장 <b>${f.floor}층</b> 돌파`] : null;
    case 'rpg_duel': { const vs = esc(nameOf(f.vs));
      return f.win ? ['up', '⚔️', `<b>${nm}</b>님이 <b>${vs}</b>님의 분신을 쓰러뜨렸어요 (⚡${Number(f.myPow || 0).toLocaleString('ko-KR')} vs ${Number(f.oppPow || 0).toLocaleString('ko-KR')})`]
        : ['down', '🛡️', `<b>${vs}</b>님의 분신이 <b>${nm}</b>님을 막아냈어요`]; }
    default: return null;
  }
};

/* ───────── 프로필 카드 ───────── */
function rpgCardHTML(p, isMe) {
  const r = isMe && G ? G : p.rpg;
  if (!r) return isMe ? `<button type="button" class="card gm-pcard empty" data-gogame=""><span>⚔️</span><b>곰사냥 시작하기</b><small>번 돈으로 캐릭터를 키우고, 곰굴 꼭대기 말레이곰에 도전해요</small></button>` : '';
  const st = gStatsOf(r), pw = gPower(st), t = r.tower || {}, du = r.duel || {};
  const gear = r.v === 2 ? G_SLOTS.map(sl => { const x = (r.gear || {})[sl.k] || { t: 0, s: 0 }, it = sl.tiers[x.t] || sl.tiers[0]; return `<span class="gm-g">${it[1]} ${esc(it[0])}${x.s ? ` <b>★${x.s}</b>` : ''}</span>`; }).join('') : '';
  const myPw = isMe ? 0 : gPower(G ? gStats() : gStatsOf(S.me && S.me.rpg));
  return `<div class="card gm-pcard">
    <div class="gm-ptop"><span class="gm-pic">⚔️</span><div><b>Lv.${st.lv} · ⚡${pw.toLocaleString('ko-KR')}</b><small>🗼 곰굴 최고 ${Number(t.best || 0)}층${t.beat ? ' · 👑 말레이곰 처치' : ''}${du.w || du.l ? ` · 대결 ${Number(du.w || 0)}승 ${Number(du.l || 0)}패` : ''}</small></div>
      ${isMe ? `<button type="button" class="gm-fight" data-gogame="">게임하기</button>` : `<button type="button" class="gm-fight${pw > myPw ? ' hard' : ''}" data-gogame="${esc(p.id)}">분신과 대결</button>`}</div>
    ${gear ? `<div class="gm-gearrow">${gear}</div>` : ''}</div>`;
}
const _profileBodyRaw = profileBody;
profileBody = function (p, isMe) {
  const h = _profileBodyRaw(p, isMe), card = rpgCardHTML(p, isMe), at = h.indexOf('<div class="sec ptabs-sec">');
  if (!card) return h;
  return at < 0 ? card + h : h.slice(0, at) + card + h.slice(at);
};
