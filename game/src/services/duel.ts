import { computePlayerStats, computePower, DEFAULT_EQUIPPED, getMaxHp, type ComputedStats } from '../data/gameData';
import type { EquipSlot } from '../types/game';
import type { RpgSave } from './bridge';

export interface Fighter {
  name: string;
  level: number;
  stats: ComputedStats;
  power: number;
  hp: number;
}

export interface DuelRound {
  who: 'me' | 'opp';
  dmg: number;
  crit: boolean;
  meHp: number;
  oppHp: number;
}

export interface DuelResult {
  win: boolean;
  rounds: DuelRound[];
  me: Fighter;
  opp: Fighter;
}

// 친구의 저장된 장비 그대로 분신을 만들어요 (예전 저장이라 장비 정보가 없으면 전투력으로 대충 맞춰요)
export function fighterFromSave(name: string, rpg: RpgSave | undefined): Fighter {
  const level = Math.max(1, rpg?.level ?? 1);
  let stats: ComputedStats;
  if (rpg && rpg.equipped && rpg.inventory) {
    stats = computePlayerStats(
      rpg.inventory,
      level,
      { ...DEFAULT_EQUIPPED, ...(rpg.equipped as Record<EquipSlot, string>) },
      rpg.equipStars ?? {}
    );
  } else {
    const p = Math.max(100, rpg?.power ?? 100);
    stats = { atk: Math.round(p / 14), autoDps: 0, mesoMultiplier: 1, critRate: 0.1 };
  }
  return { name, level, stats, power: computePower(stats, level), hp: fighterHp(level, stats) };
}

export function fighterHp(level: number, stats: ComputedStats): number {
  return Math.round(getMaxHp(level) * 6 + stats.atk * 8);
}

// 서로 번갈아 때려요. 데미지는 공격력 ±25%, 치명타 1.8배, 자동 DPS는 매 턴 더해져요. 최대 40턴.
export function simulateDuel(me: Fighter, opp: Fighter): DuelResult {
  let meHp = me.hp;
  let oppHp = opp.hp;
  const rounds: DuelRound[] = [];
  let turn: 'me' | 'opp' = Math.random() < 0.5 ? 'me' : 'opp';
  for (let i = 0; i < 40 && meHp > 0 && oppHp > 0; i++) {
    const f = turn === 'me' ? me : opp;
    const crit = Math.random() < f.stats.critRate;
    const dmg = Math.max(1, Math.round(f.stats.atk * (0.75 + Math.random() * 0.5) * (crit ? 1.8 : 1) + f.stats.autoDps));
    if (turn === 'me') oppHp = Math.max(0, oppHp - dmg);
    else meHp = Math.max(0, meHp - dmg);
    rounds.push({ who: turn, dmg, crit, meHp, oppHp });
    turn = turn === 'me' ? 'opp' : 'me';
  }
  // 40턴 안에 안 끝나면 남은 체력 비율이 높은 쪽이 이겨요
  const win = oppHp <= 0 || (meHp > 0 && meHp / me.hp >= oppHp / opp.hp);
  return { win, rounds, me, opp };
}
