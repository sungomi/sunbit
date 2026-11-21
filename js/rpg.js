'use strict';
/* ═════════ ⚔️ 곰사냥 연동: 게임 화면(iframe) · 지갑 다리 · 소식 · 프로필 캐릭터 카드 ═════════
   게임 본체는 game/ 폴더(React)예요. `cd game && npm run build` 하면 rpg/ 폴더로 나와요. 같은 주소라 iframe이
   window.SunbitRPG 를 바로 불러요. 캐릭터는 지갑 문서(sb2_players/{uid})의 rpg 칸에 저장돼요.
   돈: 원 → 꿀(수수료 3%), 꿀 → 원(수수료 10%, 하루 3억원까지). 꿀은 총자산에 안 들어가요. */
let RPG_LATEST = null;   // 게임이 마지막으로 저장한 rpg. 썬빗의 다른 저장이 옛 rpg로 덮어쓰지 않게 붙여요
let RPG_DUEL = null;     // 친구 프로필에서 '분신과 대결'을 누르면 그 친구 uid
const RPG_KINDS = ['rpg_star', 'rpg_dojo', 'rpg_duel', 'rpg_buy', 'rpg_boss'];

window.SunbitRPG = {
  uid: () => S.uid,
  ready: () => !!(S.me && S.loaded && !S.readOnly),
  cash: () => (S.me && S.me.cash) || 0,
  name: () => (S.me && S.me.name) || '나',
  load: () => (S.me && S.me.rpg) || null,
  commit: async (rpg, cashDelta) => {
    if (!S.me || S.readOnly) return false;
    const d = Math.round(+cashDelta || 0);
    if ((S.me.cash || 0) + d < 0) return false;
    const before = S.me, me = JSON.parse(JSON.stringify(before)), prevRpg = RPG_LATEST;
    me.rpg = rpg; me.cash = Math.round((me.cash || 0) + d);
    RPG_LATEST = rpg;
    const ok = await saveMe(me, before);
    if (!ok) RPG_LATEST = prevRpg;
    return ok;
  },
  players: () => activePlayers().map(p => ({ id: p.id, name: p.name, photo: p.photo, rpg: p.rpg, bot: !!p.bot })),
  feed: f => { if (f && RPG_KINDS.includes(f.kind) && S.me) addFeed(f); },
  toast: msg => toast(msg),
  close: () => closeGame(),
  takeDuelTarget: () => { const t = RPG_DUEL; RPG_DUEL = null; return t; },
};

// 썬빗의 다른 저장(매매·공격 등)이 게임 진행을 옛날 값으로 되돌리지 않게, 최신 rpg를 붙여서 저장해요
const _saveMeRaw = saveMe;
saveMe = function (me, before) { if (RPG_LATEST && me) me.rpg = RPG_LATEST; return _saveMeRaw(me, before); };

/* ───────── 게임 화면 (전체 화면 iframe) ───────── */
function openGame(duelTarget) {
  if (!S.me) { if (S.loaded) openSheet('join'); else toast('지갑을 불러오는 중이에요'); return; }
  if (duelTarget) RPG_DUEL = duelTarget;
  if (S.profile) closeProfileRaw();
  if (S.sheet) closeSheetRaw();
  let w = $('#rpgWrap');
  if (!w) {
    w = document.createElement('div'); w.id = 'rpgWrap'; w.className = 'rpg-wrap';
    const f = document.createElement('iframe');
    f.src = 'rpg/index.html?v=' + encodeURIComponent(typeof APP_V === 'string' ? APP_V : '');
    f.title = '곰사냥'; f.allow = 'autoplay; vibrate';
    w.appendChild(f); document.body.appendChild(w);
  }
  w.hidden = false; document.body.classList.add('noscroll');
  const f = w.querySelector('iframe'); try { f.focus(); } catch {}
  if (!S.game) { try { history.pushState({ rpg: 1 }, ''); } catch {} }
  S.game = true;
}
// 휴대폰 뒤로가기 = 게임 닫기 (앱 밖으로 안 튕기게 열 때 기록 한 칸을 쌓아 둬요)
let RPG_SKIP = false;
function closeGameRaw() {
  const w = $('#rpgWrap'); if (w) w.hidden = true;
  document.body.classList.remove('noscroll'); S.game = false; renderAll();
}
function closeGame() {
  if (!S.game) return;
  closeGameRaw();
  if (history.state && history.state.rpg) { RPG_SKIP = true; try { history.back(); } catch { RPG_SKIP = false; } }
}
window.addEventListener('popstate', () => { if (RPG_SKIP) { RPG_SKIP = false; return; } if (S.game) closeGameRaw(); });
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('[data-rpg]'); if (!t) return;
  e.stopPropagation(); openGame(t.dataset.rpg || null);
}, true);

/* ───────── 소식 ───────── */
const _feedTextRaw = feedText;
feedText = function (f) {
  if (!f || typeof f.kind !== 'string' || !f.kind.startsWith('rpg_')) return _feedTextRaw(f);
  const nm = esc(nameOf(f.uid));
  switch (f.kind) {
    case 'rpg_star': return typeof f.stars === 'number' ? ['gold', '⭐', `<b>${nm}</b>님이 ${esc(f.item)} <b>★${f.stars}</b> 강화 성공!`] : null;
    case 'rpg_dojo': return typeof f.floor === 'number' ? ['gold', '🗼', `<b>${nm}</b>님이 곰굴 탑 <b>${f.floor}층</b> 돌파! (최고 기록)`] : null;
    case 'rpg_boss': return ['gold', '👑', `<b>${nm}</b>님이 곰굴 탑 100층에서 <b>말레이곰</b>을 쓰러뜨렸어요!`];
    case 'rpg_buy': return typeof f.amt === 'number' ? ['up', '🛍️', `<b>${nm}</b>님이 ${esc(f.item)}을(를) 🍯${krwUnits(f.amt)} 꿀에 장만했어요`] : null;
    case 'rpg_duel': { const vs = esc(nameOf(f.vs));
      return f.win ? ['up', '⚔️', `<b>${nm}</b>님이 <b>${vs}</b>님의 분신을 쓰러뜨렸어요 (⚡${Number(f.myPow || 0).toLocaleString('ko-KR')} vs ${Number(f.oppPow || 0).toLocaleString('ko-KR')})`]
        : ['down', '🛡️', `<b>${vs}</b>님의 분신이 <b>${nm}</b>님을 막아냈어요`]; }
    default: return null;
  }
};
/* ───────── 프로필: 캐릭터 카드 ───────── */
function rpgCardHTML(p, isMe) {
  const r = p.rpg;
  if (!r) return isMe ? `<button type="button" class="rpg-card empty" data-rpg=""><span>⚔️</span><b>곰사냥 시작하기</b><small>번 돈으로 캐릭터를 키우고, 곰굴 탑 100층 말레이곰에 도전해요</small></button>` : '';
  const pow = Number(r.power || 0), d = r.dojo || {}, du = r.duel || {};
  const gear = (Array.isArray(r.gear) ? r.gear : []).filter(g => g && g.n).map(g => `<span class="rpg-g">${esc(g.i || '')} ${esc(g.n)}${g.s ? ` <b>★${g.s}</b>` : ''}</span>`).join('');
  const mine = S.me && S.me.rpg ? Number(S.me.rpg.power || 0) : 0;
  return `<div class="rpg-card">
    <div class="rpg-top"><span class="rpg-ic">⚔️</span><div class="rpg-id"><b>Lv.${Number(r.level || 1)} · ⚡${pow.toLocaleString('ko-KR')}</b><small>🗼 곰굴 탑 ${Number(d.best || 0)}층${Number(d.best || 0) >= 100 ? ' · 👑 말레이곰 처치' : ''}${du.w || du.l ? ` · 대결 ${Number(du.w || 0)}승 ${Number(du.l || 0)}패` : ''}${!isMe && mine ? ` · 내 전투력 ${mine >= pow ? '우세' : '열세'}` : ''}</small></div>
      ${isMe ? `<button type="button" class="rpg-go" data-rpg="">게임하기</button>` : `<button type="button" class="rpg-go red" data-rpg="${esc(p.id)}">분신과 대결</button>`}</div>
    ${gear ? `<div class="rpg-gear">${gear}</div>` : ''}
  </div>`;
}
const _profileBodyRaw = profileBody;
profileBody = function (p, isMe) {
  const h = _profileBodyRaw(p, isMe), card = rpgCardHTML(p, isMe), at = h.indexOf('<div class="sec ptabs-sec">');
  if (!card) return h;
  return at < 0 ? card + h : h.slice(0, at) + card + h.slice(at);
};
