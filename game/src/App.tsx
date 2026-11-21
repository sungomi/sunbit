import { useCallback, useEffect, useRef, useState } from 'react';
import { GameTab } from './components/GameTab';
import { HubTab, type HubView } from './components/HubTab';
import {
  computePlayerStats,
  computePower,
  createInitialQuests,
  createInitialState,
  DAILY_QUESTS,
  DEFAULT_COSMETIC,
  DEFAULT_EQUIPPED,
  dojoFloorReward,
  dojoQuest,
  DOJO_TOP,
  dojoCheckpoints,
  dojoFloorTime,
  DUEL_DAILY,
  duelReward,
  EQUIP_ITEMS,
  FEE_BUY_RICE,
  FEE_SELL_RICE,
  formatNumber,
  getExpForLevel,
  getMaxHp,
  getMaxMp,
  getStarforceCost,
  getStarforceSuccessRate,
  kstDay,
  LOOT_ITEMS,
  MAX_STARS,
  RICE_OUT_DAILY_CAP,
  SHOP_ITEMS,
  starDropsOnFail,
} from './data/gameData';
import { kstWeek, sunbit, inSunbit, type RpgSave } from './services/bridge';
import { fighterFromSave, simulateDuel, type DuelResult } from './services/duel';
import { sfx } from './services/sound';
import type { CosmeticConfig, DojoRun, EquipSlot, GameState, HeroSkillKey, MainTab } from './types/game';

type Extra = Pick<RpgSave, 'dojo' | 'duel' | 'riceOut' | 'questDay'>;
const freshExtra = (): Extra => ({
  dojo: { best: 0, bestAt: 0, week: kstWeek(), weekBest: 0 },
  duel: { day: kstDay(), n: 0, w: 0, l: 0 },
  riceOut: { day: kstDay(), amt: 0 },
  questDay: kstDay(),
});

function toSave(s: GameState, x: Extra): RpgSave {
  const stats = computePlayerStats(s.inventory, s.level, s.equipped, s.equipStars);
  return {
    v: 1,
    day: s.day,
    level: s.level,
    exp: s.exp,
    meso: Math.max(0, Math.floor(s.meso)),
    totalMesoEarned: Math.floor(s.totalMesoEarned),
    totalKills: s.totalKills,
    activeQuestId: s.activeQuestId,
    hpPotions: s.hpPotions,
    mpPotions: s.mpPotions,
    quests: s.quests,
    inventory: s.inventory,
    loot: s.loot,
    equipped: s.equipped,
    ownedEquips: s.ownedEquips,
    equipStars: s.equipStars,
    cosmetic: s.cosmetic,
    power: computePower(stats, s.level),
    gear: Object.values(s.equipped).flatMap((id) => {
      const eq = EQUIP_ITEMS.find((e) => e.id === id);
      return eq ? [{ n: eq.name, i: eq.icon, s: s.equipStars[id] ?? 0 }] : [];
    }),
    soundEnabled: s.soundEnabled,
    ...x,
  };
}

function fromSave(saved: RpgSave | null): { state: GameState; extra: Extra } {
  const base = createInitialState();
  if (!saved) return { state: base, extra: freshExtra() };
  // 잠깐 있던 탭 사냥 버전(v2)에서 넘어오면 꿀만 가져와요
  const old = saved as unknown as { v?: number; honey?: number };
  if (old.v === 2) return { state: { ...base, meso: Math.max(0, Math.floor(old.honey ?? 0)) }, extra: freshExtra() };
  const level = saved.level ?? 1;
  const ex = freshExtra();
  return {
    state: {
      ...base,
      day: saved.day ?? 1,
      level,
      exp: saved.exp ?? 0,
      meso: saved.meso ?? 0,
      totalMesoEarned: saved.totalMesoEarned ?? 0,
      totalKills: saved.totalKills ?? 0,
      activeQuestId: DAILY_QUESTS.some((q) => q.id === saved.activeQuestId) ? saved.activeQuestId : base.activeQuestId,
      hp: getMaxHp(level),
      mp: getMaxMp(level),
      hpPotions: saved.hpPotions ?? 25,
      mpPotions: saved.mpPotions ?? 25,
      quests: { ...createInitialQuests(), ...(saved.quests ?? {}) },
      inventory: saved.inventory ?? {},
      loot: saved.loot ?? {},
      equipped: { ...DEFAULT_EQUIPPED, ...((saved.equipped ?? {}) as Record<EquipSlot, string>) },
      ownedEquips: saved.ownedEquips ?? base.ownedEquips,
      equipStars: saved.equipStars ?? {},
      cosmetic: { ...DEFAULT_COSMETIC, ...((saved.cosmetic ?? {}) as Partial<CosmeticConfig>) },
      soundEnabled: saved.soundEnabled ?? true,
    },
    extra: {
      dojo: { ...ex.dojo, ...(saved.dojo ?? {}) },
      duel: { ...ex.duel, ...(saved.duel ?? {}) },
      riceOut: { ...ex.riceOut, ...(saved.riceOut ?? {}) },
      questDay: saved.questDay ?? ex.questDay,
    },
  };
}

const AUTOSAVE_MS = 30_000;

export function App() {
  const [boot] = useState(() => fromSave(sunbit.load()));
  const [state, setState] = useState<GameState>(boot.state);
  const [extra, setExtra] = useState<Extra>(boot.extra);
  const [activeTab, setActiveTab] = useState<MainTab>('game');
  const [hubView, setHubView] = useState<HubView>('home');
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [cash, setCash] = useState<number>(() => sunbit.cash());
  const [dojo, setDojo] = useState<DojoRun | null>(null);
  const [duelTarget, setDuelTarget] = useState<string | null>(null);
  const [lastDuel, setLastDuel] = useState<DuelResult | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  // 최신 값을 타이머·저장에서 쓰려고 ref에도 담아 둬요
  const stateRef = useRef(state);
  const extraRef = useRef(extra);
  const dojoRef = useRef(dojo);
  stateRef.current = state;
  extraRef.current = extra;
  dojoRef.current = dojo;
  const dirtyRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    sfx.enabled = boot.state.soundEnabled;
  }, [boot]);

  // 바뀐 게 있으면 저장 표시
  useEffect(() => {
    dirtyRef.current = true;
  }, [state, extra]);

  // 썬빗 지갑에 저장 (현금 변화 없이). 30초마다 + 화면을 떠날 때
  const flush = useCallback(async () => {
    if (!dirtyRef.current || busyRef.current || !sunbit.ready()) return;
    dirtyRef.current = false;
    const ok = await sunbit.commit(toSave(stateRef.current, extraRef.current), 0);
    if (!ok) dirtyRef.current = true;
  }, []);
  useEffect(() => {
    const id = window.setInterval(flush, AUTOSAVE_MS);
    const onHide = () => {
      if (document.hidden) flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush]);

  // 현금이 걸린 일(환전·현금 상점)은 바로 저장해요. 실패하면 아무것도 안 바뀌어요.
  const commitNow = useCallback(
    async (next: GameState, nextExtra: Extra, cashDelta: number): Promise<boolean> => {
      if (busyRef.current) return false;
      if (!sunbit.ready()) {
        showToast('썬빗에 참가한 뒤에 할 수 있어요');
        return false;
      }
      busyRef.current = true;
      try {
        const ok = await sunbit.commit(toSave(next, nextExtra), cashDelta);
        if (ok) {
          setState(next);
          setExtra(nextExtra);
          dirtyRef.current = false;
          setCash(sunbit.cash());
        } else {
          sfx.error();
          showToast('저장하지 못했어요. 잠시 후 다시 해 주세요');
        }
        return ok;
      } finally {
        busyRef.current = false;
      }
    },
    [showToast]
  );

  // 친구 프로필에서 '분신과 대결'을 누르고 들어왔는지 확인
  useEffect(() => {
    const check = () => {
      const t = sunbit.takeDuelTarget();
      if (t) {
        setDuelTarget(t);
        setActiveTab('hub');
        setHubView('duel');
      }
    };
    check();
    window.addEventListener('focus', check);
    const id = window.setInterval(check, 1000);
    return () => {
      window.removeEventListener('focus', check);
      window.clearInterval(id);
    };
  }, []);

  // 0.5초: 시계, 체력·마나 회복, 현금 표시, 도장 시간, 날짜 바뀜
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      setCash(sunbit.cash());
      setState((prev) => {
        const maxHp = getMaxHp(prev.level);
        const maxMp = getMaxMp(prev.level);
        if (prev.hp >= maxHp && prev.mp >= maxMp) return prev;
        return { ...prev, hp: Math.min(maxHp, prev.hp + 1), mp: Math.min(maxMp, prev.mp + 2) };
      });
      const today = kstDay(t);
      if (extraRef.current.questDay !== today) {
        setExtra((x) => ({ ...x, questDay: today }));
        setState((prev) => ({ ...prev, day: prev.day + 1, quests: createInitialQuests() }));
      }
      const run = dojoRef.current;
      if (run && t >= run.endsAt) finishDojo('time');
    }, 500);
    return () => window.clearInterval(id);
    // finishDojo는 ref만 읽어요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ───────── 🥋 곰 도장 ───────── */
  const finishDojo = (why: 'time' | 'dead' | 'quit' | 'clear') => {
    const run = dojoRef.current;
    if (!run) return;
    dojoRef.current = null;
    setDojo(null);
    const cleared = why === 'clear' ? DOJO_TOP : run.floor - 1;
    const x = extraRef.current;
    const week = kstWeek();
    const oldBest = x.dojo.best;
    let reward = 0;
    for (let f = oldBest + 1; f <= cleared; f++) reward += dojoFloorReward(f);
    const weekBest = x.dojo.week === week ? x.dojo.weekBest : 0;
    const nextDojo = {
      best: Math.max(oldBest, cleared),
      bestAt: cleared > oldBest ? Date.now() : x.dojo.bestAt,
      week,
      weekBest: Math.max(weekBest, cleared),
    };
    setExtra({ ...x, dojo: nextDojo });
    if (reward > 0) {
      setState((prev) => ({ ...prev, meso: prev.meso + reward, totalMesoEarned: prev.totalMesoEarned + reward }));
    }
    if (cleared >= DOJO_TOP && oldBest < DOJO_TOP) sunbit.feed({ kind: 'rpg_boss' });
    else if (cleared > oldBest && cleared >= 5) sunbit.feed({ kind: 'rpg_dojo', floor: cleared });
    dirtyRef.current = true;
    window.setTimeout(flush, 300);
    const head = why === 'clear' ? '👑 말레이곰을 쓰러뜨렸어요! 곰굴의 주인' : why === 'dead' ? '💫 쓰러졌어요' : why === 'quit' ? '🏳️ 탑에서 나왔어요' : '⏱ 시간 끝';
    sfx.questClear();
    showToast(
      `${head} · ${cleared}층 클리어${cleared > oldBest ? ` · 최고 기록! +${formatNumber(reward)} 꿀` : ` (최고 ${oldBest}층)`}`
    );
    setActiveTab('hub');
    setHubView('dojo');
  };

  const startDojo = (from = 1) => {
    if (dojoRef.current) return;
    if (!dojoCheckpoints(extraRef.current.dojo.best).includes(from)) return;
    sfx.fever();
    const t = Date.now();
    const run = { from, floor: from, kills: 0, startedAt: t, endsAt: t + dojoFloorTime(from) };
    dojoRef.current = run;
    setDojo(run);
    setState((prev) => ({ ...prev, hp: getMaxHp(prev.level), mp: getMaxMp(prev.level) }));
    setActiveTab('game');
    showToast(`🗼 곰굴 탑 ${from}층부터! 층마다 시간 안에 다 잡아야 올라가요`);
  };

  /* ───────── 사냥 ───────── */
  const handleKillReward = useCallback(
    (kills: number, mesoGain: number, expGain: number) => {
      if (kills === 0 && mesoGain === 0 && expGain === 0) return;

      const run = dojoRef.current;
      if (run && kills > 0) {
        const need = dojoQuest(run.floor).targetKills;
        const k = run.kills + kills;
        if (k >= need && run.floor >= DOJO_TOP) {
          finishDojo('clear');
        } else {
          const next =
            k >= need
              ? { ...run, floor: run.floor + 1, kills: 0, endsAt: Date.now() + dojoFloorTime(run.floor + 1) }
              : { ...run, kills: k };
          if (k >= need) {
            sfx.questClear();
            showToast(`🗼 ${run.floor}층 돌파!`);
          }
          dojoRef.current = next;
          setDojo(next);
        }
      }

      setState((prev) => {
        const questId = prev.activeQuestId;
        const prevQ = prev.quests[questId] ?? { kills: 0, claimed: false };
        let nextLevel = prev.level;
        let nextExp = prev.exp + expGain;
        while (nextExp >= getExpForLevel(nextLevel)) {
          nextExp -= getExpForLevel(nextLevel);
          nextLevel += 1;
        }
        if (nextLevel > prev.level) {
          sfx.questClear();
          showToast(`🎊 LEVEL UP! Lv.${nextLevel} 달성! (HP/MP 전체 회복)`);
        }
        return {
          ...prev,
          level: nextLevel,
          exp: nextExp,
          hp: nextLevel > prev.level ? getMaxHp(nextLevel) : prev.hp,
          mp: nextLevel > prev.level ? getMaxMp(nextLevel) : prev.mp,
          meso: prev.meso + mesoGain,
          totalMesoEarned: prev.totalMesoEarned + mesoGain,
          totalKills: prev.totalKills + kills,
          quests:
            kills > 0 && !run
              ? { ...prev.quests, [questId]: { ...prevQ, kills: prevQ.kills + kills } }
              : prev.quests,
        };
      });
    },
    [showToast]
  );

  const handleCollectLoot = useCallback((lootId: string) => {
    setState((prev) => ({
      ...prev,
      loot: { ...(prev.loot ?? {}), [lootId]: ((prev.loot ?? {})[lootId] ?? 0) + 1 },
    }));
  }, []);

  const handleSellAllLoot = useCallback(() => {
    const totalMeso = LOOT_ITEMS.reduce((sum, item) => sum + ((state.loot ?? {})[item.id] ?? 0) * item.sellMeso, 0);
    if (totalMeso <= 0) return;
    sfx.sell();
    showToast(`💎 전리품 일괄 판매! +${formatNumber(totalMeso)} 꿀!`);
    setState((prev) => ({ ...prev, meso: prev.meso + totalMeso, totalMesoEarned: prev.totalMesoEarned + totalMeso, loot: {} }));
  }, [state.loot, showToast]);

  const handleHitFever = useCallback(
    (gain: number) => {
      const ts = Date.now();
      setState((prev) => {
        if (prev.feverActiveUntil > ts) return prev;
        const nextFever = prev.fever + gain;
        if (nextFever >= 100) {
          sfx.fever();
          showToast('🔥 도파민 피버 발동! 12초간 꿀 2배!');
          return { ...prev, fever: 0, feverActiveUntil: ts + 12000 };
        }
        return { ...prev, fever: nextFever };
      });
    },
    [showToast]
  );

  const handleConsumeSkill = useCallback((key: HeroSkillKey, mpCost: number, cdMs: number) => {
    const ts = Date.now();
    setNow(ts);
    setState((prev) => ({
      ...prev,
      mp: Math.max(0, prev.mp - mpCost),
      skillCooldowns: { ...(prev.skillCooldowns ?? { w: 0, s: 0, e: 0, d: 0 }), [key]: ts + cdMs },
    }));
  }, []);

  const handleUsePotion = useCallback(
    (type: 'hp' | 'mp') => {
      setState((prev) => {
        const maxHp = getMaxHp(prev.level);
        const maxMp = getMaxMp(prev.level);
        const have = type === 'hp' ? prev.hpPotions : prev.mpPotions;
        const heal = (p: GameState): GameState =>
          type === 'hp'
            ? { ...p, hp: Math.min(maxHp, p.hp + Math.round(maxHp * 0.55)) }
            : { ...p, mp: Math.min(maxMp, p.mp + Math.round(maxMp * 0.6)) };
        if (have <= 0) {
          if (prev.meso < 50_000) {
            sfx.error();
            showToast(type === 'hp' ? '🧪 빨간 포션이 없어요!' : '💧 파란 포션이 없어요!');
            return prev;
          }
          sfx.buy();
          return heal({ ...prev, meso: prev.meso - 50_000 });
        }
        sfx.coin();
        return heal(type === 'hp' ? { ...prev, hpPotions: prev.hpPotions - 1 } : { ...prev, mpPotions: prev.mpPotions - 1 });
      });
    },
    [showToast]
  );

  const handlePlayerDamaged = useCallback(
    (dmg: number) => {
      const dead = stateRef.current.hp - dmg <= 0;
      if (dead && dojoRef.current) {
        setState((prev) => ({ ...prev, hp: getMaxHp(prev.level), mp: getMaxMp(prev.level) }));
        finishDojo('dead');
        return;
      }
      setState((prev) => {
        const nextHp = prev.hp - dmg;
        if (nextHp <= 0) {
          sfx.error();
          showToast('💫 체력이 다해 부활했어요! (HP/MP 회복)');
          return { ...prev, hp: getMaxHp(prev.level), mp: getMaxMp(prev.level) };
        }
        return { ...prev, hp: nextHp };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showToast]
  );

  const handleSelectQuest = (questId: string) => {
    const q = DAILY_QUESTS.find((item) => item.id === questId);
    if (!q || q.id === state.activeQuestId || dojo) return;
    sfx.click();
    setState((prev) => ({ ...prev, activeQuestId: q.id, monsterHp: q.monsterMaxHp }));
  };

  const handleClaimQuest = (questId: string) => {
    const q = DAILY_QUESTS.find((item) => item.id === questId);
    const prog = state.quests[questId];
    if (!q || !prog || prog.claimed || prog.kills < q.targetKills) return;
    sfx.questClear();
    showToast(`🎉 [${q.title}] 완료! +${formatNumber(q.clearBonusMeso)} 꿀!`);
    setState((prev) => ({
      ...prev,
      meso: prev.meso + q.clearBonusMeso,
      totalMesoEarned: prev.totalMesoEarned + q.clearBonusMeso,
      quests: { ...prev.quests, [questId]: { ...prog, claimed: true } },
    }));
  };

  const handleNextDay = () => showToast('☀️ 일일 퀘스트는 매일 0시(한국 시간)에 새로 열려요');

  const handleToggleSound = () => {
    setState((prev) => {
      const next = !prev.soundEnabled;
      sfx.enabled = next;
      if (next) sfx.click();
      return { ...prev, soundEnabled: next };
    });
  };

  /* ───────── 장비 · 강화 (꿀) ───────── */
  const handleBuyEquip = (equipId: string) => {
    const eq = EQUIP_ITEMS.find((e) => e.id === equipId);
    if (!eq || state.ownedEquips.includes(equipId)) return;
    if (state.level < eq.reqLevel) {
      sfx.error();
      showToast(`Lv.${eq.reqLevel} 이상 장착할 수 있어요!`);
      return;
    }
    if (state.meso < eq.priceMeso) {
      sfx.error();
      showToast('🍯 꿀이 부족해요! 상점 환전소에서 원을 꿀로 바꿀 수 있어요');
      return;
    }
    sfx.buy();
    showToast(`⚔️ ${eq.name} 구매하고 바로 장착!`);
    setState((prev) => ({
      ...prev,
      meso: prev.meso - eq.priceMeso,
      ownedEquips: [...prev.ownedEquips, eq.id],
      equipped: { ...prev.equipped, [eq.slot]: eq.id },
    }));
    if (eq.priceMeso >= 500_000_000) sunbit.feed({ kind: 'rpg_buy', item: eq.name, amt: eq.priceMeso });
  };

  const handleWearEquip = (equipId: string) => {
    const eq = EQUIP_ITEMS.find((e) => e.id === equipId);
    if (!eq || !state.ownedEquips.includes(equipId)) return;
    sfx.click();
    showToast(`🛡️ ${eq.name} 장착!`);
    setState((prev) => ({ ...prev, equipped: { ...prev.equipped, [eq.slot]: eq.id } }));
  };

  const handleStarforce = (equipId: string) => {
    const eq = EQUIP_ITEMS.find((e) => e.id === equipId);
    if (!eq) return;
    const stars = state.equipStars[equipId] ?? 0;
    if (stars >= MAX_STARS) return;
    const cost = getStarforceCost(stars);
    if (state.meso < cost) {
      sfx.error();
      showToast('🍯 강화할 꿀이 부족해요!');
      return;
    }
    const success = Math.random() < getStarforceSuccessRate(stars);
    const drop = !success && starDropsOnFail(stars);
    const nextStars = success ? stars + 1 : drop ? stars - 1 : stars;
    if (success) {
      sfx.questClear();
      showToast(`★ 강화 성공! ${eq.name} ★${nextStars}!`);
      if (nextStars >= 15) sunbit.feed({ kind: 'rpg_star', item: eq.name, stars: nextStars });
    } else {
      sfx.error();
      showToast(drop ? `💥 강화 실패... ★${nextStars}로 떨어졌어요` : `💥 강화 실패... (★${stars} 유지)`);
    }
    setState((prev) => ({
      ...prev,
      meso: prev.meso - cost,
      equipStars: { ...prev.equipStars, [equipId]: nextStars },
    }));
  };

  const handleUpdateCosmetic = (cosmetic: CosmeticConfig) => setState((prev) => ({ ...prev, cosmetic }));

  /* ───────── 원(썬빗 현금)으로 사는 아이템 ───────── */
  const handleBuyItem = async (itemId: string) => {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    const owned = state.inventory[itemId] ?? 0;
    if (item.maxCount !== undefined && owned >= item.maxCount) {
      sfx.error();
      return;
    }
    const next = { ...state, inventory: { ...state.inventory, [itemId]: owned + 1 } };
    if (item.currency === 'meso') {
      if (state.meso < item.price) {
        sfx.error();
        showToast('🍯 꿀이 부족해요!');
        return;
      }
      sfx.buy();
      setState({ ...next, meso: state.meso - item.price });
      showToast(`🛒 ${item.name} 구매!`);
      return;
    }
    if (sunbit.cash() < item.price) {
      sfx.error();
      showToast(`💸 썬빗 현금이 ${formatNumber(item.price - sunbit.cash())}원 부족해요`);
      return;
    }
    const ok = await commitNow(next, extra, -item.price);
    if (ok) {
      sfx.buy();
      showToast(`🛒 ${item.name} 구매! (-${formatNumber(item.price)}원)`);
      if (item.price >= 500_000_000) sunbit.feed({ kind: 'rpg_buy', item: item.name, amt: item.price });
    }
  };

  /* ───────── 💱 환전소: 원 ↔ 꿀 ───────── */
  const riceOutToday = extra.riceOut.day === kstDay() ? extra.riceOut.amt : 0;
  const handleBuyRice = async (won: number) => {
    const amt = Math.floor(Math.min(won, sunbit.cash()));
    if (amt < 1_000_000) {
      sfx.error();
      showToast('100만원부터 바꿀 수 있어요');
      return;
    }
    const rice = Math.floor(amt * (1 - FEE_BUY_RICE));
    const ok = await commitNow({ ...state, meso: state.meso + rice }, extra, -amt);
    if (ok) {
      sfx.coin();
      showToast(`💱 ${formatNumber(amt)}원 → 🍯 ${formatNumber(rice)} 꿀`);
    }
  };
  const handleSellRice = async (rice: number) => {
    const room = Math.max(0, RICE_OUT_DAILY_CAP - riceOutToday);
    const maxRice = Math.floor(room / (1 - FEE_SELL_RICE));
    const amt = Math.floor(Math.min(rice, state.meso, maxRice));
    if (room <= 0) {
      sfx.error();
      showToast(`오늘 꿀→원 한도(${formatNumber(RICE_OUT_DAILY_CAP)}원)를 다 썼어요`);
      return;
    }
    if (amt < 1_000_000) {
      sfx.error();
      showToast('100만 꿀부터 바꿀 수 있어요');
      return;
    }
    const won = Math.floor(amt * (1 - FEE_SELL_RICE));
    const nextExtra = { ...extra, riceOut: { day: kstDay(), amt: riceOutToday + won } };
    const ok = await commitNow({ ...state, meso: state.meso - amt }, nextExtra, won);
    if (ok) {
      sfx.sell();
      showToast(`💱 🍯 ${formatNumber(amt)} 꿀 → ${formatNumber(won)}원 입금`);
    }
  };

  /* ───────── ⚔️ 친구 분신과 대결 ───────── */
  const duelsToday = extra.duel.day === kstDay() ? extra.duel.n : 0;
  const handleDuel = (oppId: string) => {
    if (duelsToday >= DUEL_DAILY) {
      sfx.error();
      showToast(`오늘 대결은 ${DUEL_DAILY}번까지예요. 내일 다시!`);
      return null;
    }
    const opp = sunbit.players().find((p) => p.id === oppId);
    if (!opp || opp.id === sunbit.uid()) return null;
    const me = fighterFromSave(sunbit.name(), toSave(state, extra));
    const res = simulateDuel(me, fighterFromSave(opp.name, opp.rpg));
    const reward = res.win ? duelReward(res.opp.power) : 0;
    const d = extra.duel.day === kstDay() ? extra.duel : { day: kstDay(), n: 0, w: 0, l: 0 };
    setExtra({ ...extra, duel: { day: d.day, n: d.n + 1, w: d.w + (res.win ? 1 : 0), l: d.l + (res.win ? 0 : 1) } });
    if (reward) setState((prev) => ({ ...prev, meso: prev.meso + reward, totalMesoEarned: prev.totalMesoEarned + reward }));
    sunbit.feed({ kind: 'rpg_duel', vs: opp.id, win: res.win, reward, myPow: res.me.power, oppPow: res.opp.power });
    window.setTimeout(flush, 300);
    setLastDuel(res);
    return { res, reward };
  };

  const stats = computePlayerStats(state.inventory, state.level, state.equipped, state.equipStars);
  const power = computePower(stats, state.level);

  return (
    <div className="app-viewport">
      <div className="device-frame">
        <header className="top-brand-bar">
          <div className="brand-left">
            {inSunbit ? (
              <button className="brand-back" onClick={() => sunbit.close()} aria-label="썬빗으로">
                ←
              </button>
            ) : null}
            <img src="../bear.jpg" alt="곰사냥" className="brand-icon" />
            <span className="brand-title">곰사냥</span>
          </div>
          <div className="brand-right">
            <span className="top-pill">⚡{formatNumber(power)}</span>
            <span className="top-pill">💵 {formatNumber(cash)}원</span>
          </div>
        </header>

        {toast && <div className="pixel-toast">{toast}</div>}

        <main className="main-content">
          {activeTab === 'hub' ? (
            <HubTab
              view={hubView}
              setView={setHubView}
              state={state}
              extra={extra}
              cash={cash}
              power={power}
              riceOutToday={riceOutToday}
              duelsToday={duelsToday}
              duelTarget={duelTarget}
              lastDuel={lastDuel}
              onBuyItem={handleBuyItem}
              onBuyRice={handleBuyRice}
              onSellRice={handleSellRice}
              onSellAllLoot={handleSellAllLoot}
              onStartDojo={startDojo}
              onDuel={handleDuel}
              onClearDuelTarget={() => setDuelTarget(null)}
            />
          ) : (
            <GameTab
              state={state}
              now={now}
              onKillReward={handleKillReward}
              onCollectLoot={handleCollectLoot}
              onHitFever={handleHitFever}
              onConsumeSkill={handleConsumeSkill}
              onUsePotion={handleUsePotion}
              onPlayerDamaged={handlePlayerDamaged}
              onSelectQuest={handleSelectQuest}
              onClaimQuest={handleClaimQuest}
              onNextDay={handleNextDay}
              onToggleSound={handleToggleSound}
              onBuyEquip={handleBuyEquip}
              onWearEquip={handleWearEquip}
              onStarforce={handleStarforce}
              onUpdateCosmetic={handleUpdateCosmetic}
              dojo={dojo}
              onDojoQuit={() => finishDojo('quit')}
            />
          )}
        </main>

        <nav className="bottom-tab-bar">
          <button
            className={`bottom-tab-btn ${activeTab === 'hub' ? 'active' : ''}`}
            onClick={() => {
              sfx.click();
              setActiveTab('hub');
            }}
            disabled={!!dojo}
          >
            <span className="tab-emoji">🏯</span>
            <span className="tab-label">마을</span>
          </button>
          <button
            className={`bottom-tab-btn ${activeTab === 'game' ? 'active' : ''}`}
            onClick={() => {
              sfx.click();
              setActiveTab('game');
            }}
          >
            <span className="tab-emoji">⚔️</span>
            <span className="tab-label">{dojo ? '도장' : '사냥'}</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default App;
