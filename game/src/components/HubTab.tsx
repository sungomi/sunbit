import React, { useEffect, useMemo, useState } from 'react';
import {
  computePlayerStats,
  dojoFloorReward,
  dojoCheckpoints,
  DUEL_DAILY,
  duelReward,
  EQUIP_ITEMS,
  FEE_BUY_RICE,
  FEE_SELL_RICE,
  formatNumber,
  LOOT_ITEMS,
  RICE_OUT_DAILY_CAP,
  SHOP_ITEMS,
} from '../data/gameData';
import { kstWeek, sunbit, type BridgePlayer, type RpgSave } from '../services/bridge';
import { fighterFromSave, type DuelResult } from '../services/duel';
import { sfx } from '../services/sound';
import type { GameState } from '../types/game';
import { PixelMesoCoin } from './PixelSprites';

export type HubView = 'home' | 'exchange' | 'shop' | 'dojo' | 'duel' | 'bag';

interface HubTabProps {
  view: HubView;
  setView: (v: HubView) => void;
  state: GameState;
  extra: Pick<RpgSave, 'dojo' | 'duel' | 'riceOut' | 'questDay'>;
  cash: number;
  power: number;
  riceOutToday: number;
  duelsToday: number;
  duelTarget: string | null;
  lastDuel: DuelResult | null;
  onBuyItem: (id: string) => void;
  onBuyRice: (won: number) => void;
  onSellRice: (rice: number) => void;
  onSellAllLoot: () => void;
  onStartDojo: (from: number) => void;
  onDuel: (oppId: string) => { res: DuelResult; reward: number } | null;
  onClearDuelTarget: () => void;
}

const parseAmt = (s: string): number => {
  const t = s.replace(/[\s,]/g, '');
  const m = t.match(/^(\d+(?:\.\d+)?)(억|만|조)?$/);
  if (!m) return 0;
  const k = m[2] === '조' ? 1e12 : m[2] === '억' ? 1e8 : m[2] === '만' ? 1e4 : 1;
  return Math.floor(parseFloat(m[1]) * k);
};

function useFriends(): BridgePlayer[] {
  const [list, setList] = useState<BridgePlayer[]>(() => sunbit.players());
  useEffect(() => {
    const id = window.setInterval(() => setList(sunbit.players()), 3000);
    return () => window.clearInterval(id);
  }, []);
  return list;
}

export const HubTab: React.FC<HubTabProps> = (p) => {
  const { view, setView, state } = p;
  const players = useFriends();
  const myId = sunbit.uid();
  const go = (v: HubView) => {
    sfx.click();
    setView(v);
  };
  const header = (title: string) => (
    <div className="hub-head">
      <button className="pixel-btn pixel-btn-sm" onClick={() => go('home')}>
        ←
      </button>
      <span>{title}</span>
      <span className="meso-text">
        <PixelMesoCoin size={13} /> {formatNumber(state.meso)}
      </span>
    </div>
  );

  if (view === 'exchange') return <Exchange {...p} header={header('💱 환전소')} />;
  if (view === 'shop') return <Shop {...p} header={header('🛒 썬빗 상점')} />;
  if (view === 'dojo') return <Dojo {...p} players={players} myId={myId} header={header('🗼 곰굴 탑')} />;
  if (view === 'duel') return <Duel {...p} players={players} myId={myId} header={header('⚔️ 분신 대결')} />;
  if (view === 'bag') return <Bag {...p} header={header('🎒 가방')} />;

  const week = kstWeek();
  const dojoWeek = p.extra.dojo.week === week ? p.extra.dojo.weekBest : 0;
  const tiles: [HubView, string, string, string][] = [
    ['exchange', '💱', '환전소', `원 ↔ 꿀 · 수수료 ${FEE_BUY_RICE * 100}% / ${FEE_SELL_RICE * 100}%`],
    ['shop', '🛒', '썬빗 상점', '원으로 사는 세팅템'],
    ['dojo', '🗼', '곰굴 탑', `최고 ${p.extra.dojo.best}층 · 이번 주 ${dojoWeek}층`],
    ['duel', '⚔️', '분신 대결', `오늘 ${p.duelsToday}/${DUEL_DAILY} · ${p.extra.duel.w}승 ${p.extra.duel.l}패`],
    ['bag', '🎒', '가방', '전리품 팔기 · 내 능력치'],
  ];
  return (
    <div className="hub">
      <div className="pixel-card hub-hero">
        <div>
          <small>내 전투력</small>
          <b>⚡ {formatNumber(p.power)}</b>
        </div>
        <div>
          <small>썬빗 현금</small>
          <b>💵 {formatNumber(p.cash)}원</b>
        </div>
        <div>
          <small>꿀</small>
          <b className="meso-text">🍯 {formatNumber(state.meso)}</b>
        </div>
      </div>
      <div className="hub-tiles">
        {tiles.map(([v, ic, t, sub]) => (
          <button key={v} className="pixel-card hub-tile" onClick={() => go(v)}>
            <span className="hub-ic">{ic}</span>
            <b>{t}</b>
            <small>{sub}</small>
          </button>
        ))}
      </div>
      <PowerBoard players={players} myId={myId} />
    </div>
  );
};

/* ───────── 전투력 순위 ───────── */
const PowerBoard: React.FC<{ players: BridgePlayer[]; myId: string | null }> = ({ players, myId }) => {
  const rows = players
    .filter((x) => x.rpg && x.rpg.power)
    .sort((a, b) => (b.rpg!.power || 0) - (a.rpg!.power || 0))
    .slice(0, 12);
  if (!rows.length) return null;
  return (
    <div className="pixel-card hub-board">
      <div className="hub-board-title">⚡ 전투력 순위</div>
      {rows.map((x, i) => (
        <div key={x.id} className={`hub-row ${x.id === myId ? 'me' : ''}`}>
          <span className="hub-rk">{i === 0 ? '👑' : i + 1}</span>
          <span className="hub-nm">{x.name}</span>
          <span className="hub-sub">Lv.{x.rpg!.level ?? 1}</span>
          <b>{formatNumber(x.rpg!.power)}</b>
        </div>
      ))}
    </div>
  );
};

/* ───────── 💱 환전소 ───────── */
const Exchange: React.FC<HubTabProps & { header: React.ReactNode }> = (p) => {
  const [inW, setInW] = useState('');
  const [inR, setInR] = useState('');
  const room = Math.max(0, RICE_OUT_DAILY_CAP - p.riceOutToday);
  const w = parseAmt(inW);
  const r = parseAmt(inR);
  const quick = (base: number) => [0.1, 0.25, 0.5, 1].map((f) => Math.floor(base * f));
  return (
    <div className="hub">
      {p.header}
      <div className="pixel-card hub-x">
        <div className="hub-x-title">💵 원 → 🍯 꿀</div>
        <small>1원 = 1꿀, 수수료 {FEE_BUY_RICE * 100}%. 바꾼 원은 썬빗 총자산에서 빠져요.</small>
        <div className="hub-x-row">
          <input inputMode="numeric" placeholder="예: 5억" value={inW} onChange={(e) => setInW(e.target.value)} />
          <button className="pixel-btn pixel-btn-gold" disabled={w < 1e6 || w > p.cash} onClick={() => { p.onBuyRice(w); setInW(''); }}>
            바꾸기
          </button>
        </div>
        <div className="hub-chips">
          {quick(p.cash).map((v, i) => (
            <button key={i} className="pixel-btn pixel-btn-sm" onClick={() => setInW(String(v))}>
              {['10%', '25%', '50%', '전부'][i]}
            </button>
          ))}
        </div>
        {w > 0 && <small className="hub-x-pre">→ 🍯 {formatNumber(w * (1 - FEE_BUY_RICE))} 꿀</small>}
      </div>
      <div className="pixel-card hub-x">
        <div className="hub-x-title">🍯 꿀 → 💵 원</div>
        <small>
          수수료 {FEE_SELL_RICE * 100}%, 하루 {formatNumber(RICE_OUT_DAILY_CAP)}원까지. 오늘 남은 한도 <b>{formatNumber(room)}원</b>
        </small>
        <div className="hub-x-row">
          <input inputMode="numeric" placeholder="예: 1억" value={inR} onChange={(e) => setInR(e.target.value)} />
          <button className="pixel-btn pixel-btn-green" disabled={r < 1e6 || r > p.state.meso || room <= 0} onClick={() => { p.onSellRice(r); setInR(''); }}>
            바꾸기
          </button>
        </div>
        <div className="hub-chips">
          {quick(Math.min(p.state.meso, room / (1 - FEE_SELL_RICE))).map((v, i) => (
            <button key={i} className="pixel-btn pixel-btn-sm" onClick={() => setInR(String(v))}>
              {['10%', '25%', '50%', '최대'][i]}
            </button>
          ))}
        </div>
        {r > 0 && <small className="hub-x-pre">→ 💵 {formatNumber(Math.min(r * (1 - FEE_SELL_RICE), room))}원</small>}
      </div>
    </div>
  );
};

/* ───────── 🛒 상점 (원으로) ───────── */
const Shop: React.FC<HubTabProps & { header: React.ReactNode }> = (p) => (
  <div className="hub">
    {p.header}
    <div className="subapp-balance-bar">
      <span>💵 {formatNumber(p.cash)}원</span>
      <small>썬빗 현금에서 바로 빠져요</small>
    </div>
    <div className="shop-list">
      {SHOP_ITEMS.map((item) => {
        const owned = p.state.inventory[item.id] ?? 0;
        const isMax = item.maxCount !== undefined && owned >= item.maxCount;
        const can = item.currency === 'krw' ? p.cash >= item.price : p.state.meso >= item.price;
        return (
          <div key={item.id} className="pixel-card shop-item-card">
            <div className="shop-item-left">
              <div className="shop-item-icon">{item.icon}</div>
              <div className="shop-item-info">
                <div className="shop-item-name">
                  {item.name} <span className="owned-count">({owned}{item.maxCount ? `/${item.maxCount}` : '개'})</span>
                </div>
                <div className="shop-item-desc">{item.description}</div>
                <div className="shop-item-effect">{item.effectText}</div>
              </div>
            </div>
            <button
              className={`pixel-btn pixel-btn-sm ${isMax ? 'pixel-btn-disabled' : can ? 'pixel-btn-gold' : ''}`}
              disabled={isMax || !can}
              onClick={() => p.onBuyItem(item.id)}
            >
              {isMax ? 'MAX' : `${formatNumber(item.price)}${item.currency === 'krw' ? '원' : '꿀'}`}
            </button>
          </div>
        );
      })}
    </div>
  </div>
);

/* ───────── 🥋 곰 도장 ───────── */
const Dojo: React.FC<HubTabProps & { header: React.ReactNode; players: BridgePlayer[]; myId: string | null }> = (p) => {
  const [mode, setMode] = useState<'week' | 'all'>('week');
  const week = kstWeek();
  const score = (x: BridgePlayer) => {
    const d = x.rpg?.dojo;
    if (!d) return 0;
    return mode === 'all' ? d.best || 0 : d.week === week ? d.weekBest || 0 : 0;
  };
  const rows = p.players.filter((x) => score(x) > 0).sort((a, b) => score(b) - score(a));
  const next = p.extra.dojo.best + 1;
  return (
    <div className="hub">
      {p.header}
      <div className="pixel-card hub-dojo">
        <img src="../bear.jpg" alt="말레이곰" className="hub-dojo-bear" />
        <div>
          <b>100층에서 말레이곰이 기다려요</b>
          <small>
            층마다 5마리를 30초 안에, 10층마다 보스 45초, 말레이곰 90초. 죽거나 시간이 끝나면 멈춰요. 처음 깨는 층마다 꿀
            보상 (다음 {next}층: {formatNumber(dojoFloorReward(next))} 꿀)
          </small>
        </div>
      </div>
      <div className="hub-dojo-starts">
        {dojoCheckpoints(p.extra.dojo.best).map((f, i, arr) => (
          <button
            key={f}
            className={`pixel-btn ${i === arr.length - 1 ? 'pixel-btn-red' : ''}`}
            onClick={() => p.onStartDojo(f)}
          >
            {f}층부터
          </button>
        ))}
      </div>
      <div className="pixel-card hub-board">
        <div className="hub-board-title">
          🏆 곰굴 탑 순위
          <span className="hub-seg">
            <button className={mode === 'week' ? 'on' : ''} onClick={() => setMode('week')}>이번 주</button>
            <button className={mode === 'all' ? 'on' : ''} onClick={() => setMode('all')}>역대</button>
          </span>
        </div>
        {rows.length === 0 && <div className="empty-hint">아직 기록이 없어요. 첫 기록을 세워 보세요!</div>}
        {rows.map((x, i) => (
          <div key={x.id} className={`hub-row ${x.id === p.myId ? 'me' : ''}`}>
            <span className="hub-rk">{i === 0 ? '👑' : i + 1}</span>
            <span className="hub-nm">{x.name}</span>
            <span className="hub-sub">⚡{formatNumber(x.rpg?.power ?? 0)}</span>
            <b>{score(x)}층</b>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ───────── ⚔️ 분신 대결 ───────── */
const Duel: React.FC<HubTabProps & { header: React.ReactNode; players: BridgePlayer[]; myId: string | null }> = (p) => {
  const [step, setStep] = useState(-1);
  const res = p.lastDuel;
  const opps = useMemo(
    () =>
      p.players
        .filter((x) => x.id !== p.myId)
        .map((x) => ({ x, f: fighterFromSave(x.name, x.rpg) }))
        .sort((a, b) => b.f.power - a.f.power),
    [p.players, p.myId]
  );
  // 결과를 한 턴씩 보여 줘요
  useEffect(() => {
    if (!res || step < 0 || step >= res.rounds.length) return;
    const id = window.setTimeout(() => setStep((s) => s + 1), 140);
    return () => window.clearTimeout(id);
  }, [res, step]);
  const fight = (id: string) => {
    const r = p.onDuel(id);
    if (r) {
      sfx.fever();
      setStep(0);
      p.onClearDuelTarget();
    }
  };
  const shown = res && step >= 0 ? res.rounds[Math.min(step, res.rounds.length - 1)] : null;
  const done = res && step >= res.rounds.length;
  return (
    <div className="hub">
      {p.header}
      <small className="hub-note">
        친구의 지금 장비 그대로 만든 분신과 싸워요. 하루 {DUEL_DAILY}번 (오늘 {p.duelsToday}번). 이기면 상대 전투력만큼 꿀을 받고, 소식에 남아요.
      </small>
      {res && step >= 0 && (
        <div className={`pixel-card duel-arena ${done ? (res.win ? 'win' : 'lose') : ''}`}>
          <div className="duel-side">
            <b>{res.me.name}</b>
            <small>⚡{formatNumber(res.me.power)}</small>
            <div className="pixel-progress-track"><div className="pixel-progress-fill fill-red" style={{ width: `${((shown?.meHp ?? res.me.hp) / res.me.hp) * 100}%` }} /></div>
          </div>
          <div className="duel-mid">
            {done ? (res.win ? '🏆 승리!' : '💀 패배') : shown ? `${shown.who === 'me' ? '▶' : '◀'} ${formatNumber(shown.dmg)}${shown.crit ? '!' : ''}` : 'VS'}
          </div>
          <div className="duel-side">
            <b>{res.opp.name}</b>
            <small>⚡{formatNumber(res.opp.power)}</small>
            <div className="pixel-progress-track"><div className="pixel-progress-fill fill-red" style={{ width: `${((shown?.oppHp ?? res.opp.hp) / res.opp.hp) * 100}%` }} /></div>
          </div>
          {done && res.win && <div className="duel-reward">+{formatNumber(duelReward(res.opp.power))} 꿀</div>}
        </div>
      )}
      <div className="pixel-card hub-board">
        <div className="hub-board-title">상대 고르기</div>
        {opps.length === 0 && <div className="empty-hint">아직 대결할 친구가 없어요.</div>}
        {opps.map(({ x, f }) => (
          <div key={x.id} className={`hub-row ${p.duelTarget === x.id ? 'pick' : ''}`}>
            <span className="hub-nm">{x.name}</span>
            <span className="hub-sub">Lv.{f.level} · ⚡{formatNumber(f.power)}</span>
            <button
              className={`pixel-btn pixel-btn-sm ${p.duelTarget === x.id ? 'pixel-btn-red' : 'pixel-btn-gold'}`}
              disabled={p.duelsToday >= DUEL_DAILY || (step >= 0 && !done)}
              onClick={() => fight(x.id)}
            >
              {f.power > p.power ? '도전' : '혼내기'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ───────── 🎒 가방 ───────── */
const Bag: React.FC<HubTabProps & { header: React.ReactNode }> = (p) => {
  const { state } = p;
  const stats = computePlayerStats(state.inventory, state.level, state.equipped, state.equipStars);
  const lootTotal = LOOT_ITEMS.reduce((s, l) => s + (state.loot?.[l.id] ?? 0) * l.sellMeso, 0);
  const lootHave = LOOT_ITEMS.filter((l) => (state.loot?.[l.id] ?? 0) > 0);
  return (
    <div className="hub">
      {p.header}
      <div className="pixel-card stats-summary-card">
        <div className="stat-pill">⚔️ 공격력 {formatNumber(stats.atk)}</div>
        <div className="stat-pill">🤖 자동DPS {formatNumber(stats.autoDps)}</div>
        <div className="stat-pill">🍯 꿀 +{Math.round((stats.mesoMultiplier - 1) * 100)}%</div>
        <div className="stat-pill">💥 치명타 {Math.round(stats.critRate * 100)}%</div>
      </div>
      <div className="pixel-card hub-board">
        <div className="hub-board-title">🛡️ 착용 장비</div>
        {Object.values(state.equipped).map((id) => {
          const eq = EQUIP_ITEMS.find((e) => e.id === id);
          if (!eq) return null;
          const st = state.equipStars[id] ?? 0;
          return (
            <div key={id} className="hub-row">
              <span className="hub-rk">{eq.icon}</span>
              <span className="hub-nm">{eq.name}</span>
              <b className="star">{st ? `★${st}` : ''}</b>
            </div>
          );
        })}
      </div>
      <div className="preview-header">
        <span>💎 전리품 ({lootHave.length}종)</span>
        {lootTotal > 0 && (
          <button className="pixel-btn pixel-btn-sm pixel-btn-gold" onClick={p.onSellAllLoot}>
            전부 팔기 (+{formatNumber(lootTotal)} 꿀)
          </button>
        )}
      </div>
      <div className="inventory-grid">
        {lootHave.length === 0 ? (
          <div className="pixel-card empty-box"><p>사냥하면 전리품이 떨어져요!</p></div>
        ) : (
          lootHave.map((l) => (
            <div key={l.id} className="pixel-card inv-item-card">
              <div className="inv-icon">{l.icon}</div>
              <div className="inv-name">{l.name}</div>
              <div className="inv-count">x{state.loot[l.id]}</div>
              <div className="inv-effect">개당 {formatNumber(l.sellMeso)} 꿀</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
