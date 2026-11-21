import { CLASSIC_EQUIPS_2005, EQUIP_SLOT_LABELS } from './classicEquips2005';
import type {
  CosmeticConfig,
  DailyQuestDef,
  EquipSlot,
  GameState,
  LootDef,
  QuestProgress,
  ShopItemDef,
  StockDef,
  StockMarketItem,
} from '../types/game';

export { EQUIP_SLOT_LABELS };
export const EQUIP_ITEMS = CLASSIC_EQUIPS_2005;

export const HAIR_STYLES: { id: CosmeticConfig['hairStyle']; name: string }[] = [
  { id: 'spiky', name: '초보자 뾰족머리' },
  { id: 'bob', name: '단발 컷' },
  { id: 'twintail', name: '귀여운 트윈테일' },
  { id: 'bowl', name: '순둥이 바가지' },
];

export const HAIR_COLORS: { name: string; hex: string }[] = [
  { name: '밤색', hex: '#6b3e26' },
  { name: '블랙', hex: '#1f2336' },
  { name: '딸기핑크', hex: '#ff6b9d' },
  { name: '금발', hex: '#ffd43b' },
  { name: '은발', hex: '#dee2e6' },
  { name: '민트', hex: '#3bc9db' },
];

export const EYE_STYLES: { id: CosmeticConfig['eyeStyle']; name: string }[] = [
  { id: 'bright', name: '반짝 큰눈' },
  { id: 'wink', name: '상큼 윙크' },
  { id: 'cool', name: '시크 눈빛' },
];

export const DEFAULT_COSMETIC: CosmeticConfig = {
  hairStyle: 'spiky',
  hairColor: '#6b3e26',
  eyeStyle: 'bright',
};

export const LOOT_ITEMS: LootDef[] = [
  {
    id: 'loot_mushroom_cap',
    name: '개미의 더듬이',
    icon: '🍄',
    sellMeso: 250000,
    questId: 'henesys_mushroom',
    color: '#ff7b00',
  },
  {
    id: 'loot_slime_bubble',
    name: '단타쥐의 꼬리',
    icon: '🫧',
    sellMeso: 500000,
    questId: 'ellinia_slime',
    color: '#51cf66',
  },
  {
    id: 'loot_pig_ribbon',
    name: '여우의 작전 메모',
    icon: '🎀',
    sellMeso: 950000,
    questId: 'perion_pig',
    color: '#ff2e63',
  },
  {
    id: 'loot_golem_stone',
    name: '늑대의 공매도 증서',
    icon: '🪨',
    sellMeso: 2200000,
    questId: 'perion_golem',
    color: '#adb5bd',
  },
  {
    id: 'loot_chronos_gear',
    name: '고래의 비늘',
    icon: '⚙️',
    sellMeso: 5500000,
    questId: 'ludi_chronos',
    color: '#9775fa',
  },
  {
    id: 'loot_zakum_branch',
    name: '황소의 뿔',
    icon: '🪵',
    sellMeso: 28000000,
    questId: 'zakum_boss',
    color: '#ffd43b',
  },
  {
    id: 'loot_elixir',
    name: '꿀 엘릭서',
    icon: '🧪',
    sellMeso: 1800000,
    color: '#e64980',
  },
  {
    id: 'loot_cube',
    name: '황금 캔들',
    icon: '🧊',
    sellMeso: 6500000,
    color: '#3bc9db',
  },
];

export const DAILY_QUESTS: DailyQuestDef[] = [
  {
    id: 'henesys_mushroom',
    region: '개미굴',
    title: '개미 떼 소탕',
    monsterName: '개미 떼',
    spriteId: 'mushroom',
    monsterMaxHp: 45,
    targetKills: 8,
    mesoPerKill: 350000,
    expPerKill: 25,
    clearBonusMeso: 4000000,
  },
  {
    id: 'ellinia_slime',
    region: '단타 골목',
    title: '단타쥐 퇴치',
    monsterName: '단타쥐',
    spriteId: 'slime',
    monsterMaxHp: 90,
    targetKills: 10,
    mesoPerKill: 720000,
    expPerKill: 55,
    clearBonusMeso: 8500000,
  },
  {
    id: 'perion_pig',
    region: '작전 숲',
    title: '작전 여우 사냥',
    monsterName: '작전 여우',
    spriteId: 'pig',
    monsterMaxHp: 170,
    targetKills: 12,
    mesoPerKill: 1400000,
    expPerKill: 110,
    clearBonusMeso: 18000000,
  },
  {
    id: 'perion_golem',
    region: '공매도 늪',
    title: '공매도 늑대 퇴치',
    monsterName: '공매도 늑대',
    spriteId: 'golem',
    monsterMaxHp: 380,
    targetKills: 12,
    mesoPerKill: 3200000,
    expPerKill: 240,
    clearBonusMeso: 42000000,
  },
  {
    id: 'ludi_chronos',
    region: '세력 바다',
    title: '세력 고래 잡기',
    monsterName: '세력 고래',
    spriteId: 'chronos',
    monsterMaxHp: 850,
    targetKills: 15,
    mesoPerKill: 7500000,
    expPerKill: 520,
    clearBonusMeso: 120000000,
  },
  {
    id: 'zakum_boss',
    region: '황소 평원',
    title: '[보스] 성난 황소',
    monsterName: '성난 황소',
    spriteId: 'zakum',
    monsterMaxHp: 3200,
    targetKills: 3,
    mesoPerKill: 45000000,
    expPerKill: 1800,
    clearBonusMeso: 350000000,
  },
];

export const STOCKS: StockDef[] = [
  {
    id: 'nxz',
    ticker: 'NXZ',
    name: '넥슨즈',
    basePrice: 18500,
    volatility: 0.045,
    description: '패치 노트 뜨면 급등락하는 게임 대장주',
  },
  {
    id: 'ssal',
    ticker: 'SSAL',
    name: '쌀전자',
    basePrice: 68000,
    volatility: 0.025,
    description: '국민 곰사냥 반도체 우량주',
  },
  {
    id: 'meso_coin',
    ticker: 'MESO',
    name: '쌀코인',
    basePrice: 4200,
    volatility: 0.11,
    description: '야수의 심장 전용 고변동성 도파민 코인',
  },
  {
    id: 'nvda',
    ticker: 'NVDA',
    name: '엔비디아',
    basePrice: 142000,
    volatility: 0.038,
    description: 'AI 곰사냥 서버 그래픽카드 독점 기업',
  },
  {
    id: 'dotbio',
    ticker: 'DOT',
    name: '도트바이오',
    basePrice: 9800,
    volatility: 0.075,
    description: '도트 치료제 임상 소식에 요동치는 테마주',
  },
];

export const SHOP_ITEMS: ShopItemDef[] = [
  {
    id: 'cup_ramen',
    name: '육개장 사발면',
    category: 'flex',
    currency: 'krw',
    price: 15000000,
    icon: '🍜',
    description: '곰사냥꾼의 영혼의 소울푸드',
    effectText: '공격력 +5 / 자부심 +1',
    bonuses: { atk: 5 },
  },
  {
    id: 'magnet_pet',
    name: '자석펫 (꼬마달)',
    category: 'upgrade',
    currency: 'krw',
    price: 120000000,
    icon: '🐾',
    description: '꿀을 알아서 싹쓸이하는 효자 펫',
    effectText: '꿀 획득 +25% / 자동DPS +15',
    maxCount: 3,
    bonuses: { mesoMultiplier: 0.25, autoDps: 15 },
  },
  {
    id: 'macro_keyboard',
    name: '청축 매크로 키보드',
    category: 'upgrade',
    currency: 'krw',
    price: 350000000,
    icon: '⌨️',
    description: '딸깍거릴 때마다 꿀이 복사된다',
    effectText: '공격력 +45 / 자동DPS +45',
    maxCount: 3,
    bonuses: { atk: 45, autoDps: 45 },
  },
  {
    id: 'dual_monitor',
    name: '듀얼 모니터 세팅',
    category: 'upgrade',
    currency: 'krw',
    price: 950000000,
    icon: '🖥️',
    description: '왼쪽은 일퀘, 오른쪽은 주식창 국룰',
    effectText: '자동DPS +120 / 꿀 획득 +30%',
    maxCount: 2,
    bonuses: { autoDps: 120, mesoMultiplier: 0.3 },
  },
  {
    id: 'iced_americano',
    name: '아이스 아메리카노',
    category: 'flex',
    currency: 'krw',
    price: 45000000,
    icon: '🧋',
    description: '새벽 보스전 버티기 필수템',
    effectText: '자동DPS +8',
    bonuses: { autoDps: 8 },
  },
  {
    id: 'gaming_chair',
    name: '시디즈 게이밍 의자',
    category: 'flex',
    currency: 'krw',
    price: 2800000000,
    icon: '🪑',
    description: '허리가 튼튼해야 12시간 곰사냥 가능',
    effectText: '공격력 +90 / 자동DPS +150',
    maxCount: 1,
    bonuses: { atk: 90, autoDps: 150 },
  },
  {
    id: 'gold_rice_sack',
    name: '황금 꿀단지',
    category: 'flex',
    currency: 'krw',
    price: 7777770000,
    icon: '🌾',
    description: '곰사냥의 신을 상징하는 순금 꿀단지',
    effectText: '꿀 획득 +60% / 치명타 +10%',
    maxCount: 5,
    bonuses: { mesoMultiplier: 0.6, critRate: 0.1 },
  },
];

export const BASE_MESO_RATE_PER_10K = 300;

export function getExpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.38, level - 1));
}

export function getMaxHp(level: number): number {
  return 200 + (level - 1) * 45;
}

export function getMaxMp(level: number): number {
  return 120 + (level - 1) * 25;
}

export function getStarforceCost(stars: number): number {
  return Math.floor(15_000_000 * Math.pow(1.45, stars));
}

export function getStarforceSuccessRate(stars: number): number {
  if (stars < 5) return 0.9;
  if (stars < 10) return 0.7;
  if (stars < 13) return 0.5;
  if (stars < 15) return 0.35;
  if (stars < 20) return 0.3;
  return 0.2;
}

export function createInitialQuests(): Record<string, QuestProgress> {
  const quests: Record<string, QuestProgress> = {};
  for (const q of DAILY_QUESTS) {
    quests[q.id] = { kills: 0, claimed: false };
  }
  return quests;
}

export function createInitialMarket(): Record<string, StockMarketItem> {
  const market: Record<string, StockMarketItem> = {};
  for (const s of STOCKS) {
    const history: number[] = [];
    let p = s.basePrice;
    for (let i = 0; i < 20; i++) {
      const delta = (Math.random() - 0.49) * s.volatility;
      p = Math.max(500, Math.round(p * (1 + delta)));
      history.push(p);
    }
    market[s.id] = {
      id: s.id,
      price: p,
      prevPrice: history[history.length - 2] ?? s.basePrice,
      history,
    };
  }
  return market;
}

export const DEFAULT_EQUIPPED: Record<EquipSlot, string> = {
  hat: 'hat_bandana',
  weapon: 'wpn_wood',
  armor: 'arm_tshirt',
  gloves: 'glv_cotton',
  shoes: 'sho_leather',
  cape: 'cape_old',
};

export function createInitialState(): GameState {
  const firstQuest = DAILY_QUESTS[0];
  return {
    day: 1,
    level: 1,
    exp: 0,
    hp: getMaxHp(1),
    mp: getMaxMp(1),
    hpPotions: 25,
    mpPotions: 25,
    krw: 0,
    meso: 0,
    totalMesoEarned: 0,
    totalKills: 0,
    activeQuestId: firstQuest.id,
    monsterHp: firstQuest.monsterMaxHp,
    fever: 0,
    feverActiveUntil: 0,
    skillCooldownUntil: 0,
    skillCooldowns: { w: 0, s: 0, e: 0, d: 0 },
    quests: createInitialQuests(),
    inventory: {},
    loot: {},
    equipped: { ...DEFAULT_EQUIPPED },
    ownedEquips: Object.values(DEFAULT_EQUIPPED),
    equipStars: {},
    cosmetic: { ...DEFAULT_COSMETIC },
    stocks: {},
    market: createInitialMarket(),
    mesoRatePer10k: BASE_MESO_RATE_PER_10K,
    mesoRateHistory: Array.from({ length: 16 }, () => BASE_MESO_RATE_PER_10K),
    soundEnabled: true,
    lastSavedAt: Date.now(),
  };
}

export interface ComputedStats {
  atk: number;
  autoDps: number;
  mesoMultiplier: number;
  critRate: number;
}

export function computePlayerStats(
  inventory: Record<string, number>,
  level = 1,
  equipped: Record<EquipSlot, string> = DEFAULT_EQUIPPED,
  equipStars: Record<string, number> = {}
): ComputedStats {
  let atk = 10 + (level - 1) * 6;
  let autoDps = 0;
  let mesoMultiplier = 1;
  let critRate = 0.08;

  // Shop / Flex items
  for (const item of SHOP_ITEMS) {
    const count = inventory[item.id] ?? 0;
    if (count <= 0) continue;
    atk += (item.bonuses.atk ?? 0) * count;
    autoDps += (item.bonuses.autoDps ?? 0) * count;
    mesoMultiplier += (item.bonuses.mesoMultiplier ?? 0) * count;
    critRate += (item.bonuses.critRate ?? 0) * count;
  }

  // Equipped MapleStory gear + Starforce bonus (+15% atk per star)
  for (const slot of Object.keys(equipped) as EquipSlot[]) {
    const eqId = equipped[slot];
    const eq = EQUIP_ITEMS.find((e) => e.id === eqId);
    if (!eq) continue;
    const stars = equipStars[eqId] ?? 0;
    const starMult = 1 + stars * 0.15;
    atk += Math.round(eq.atk * starMult);
    critRate += eq.critRate + stars * 0.004;
    mesoMultiplier += eq.mesoBonus;
  }

  return {
    atk,
    autoDps,
    mesoMultiplier,
    critRate: Math.min(0.8, critRate),
  };
}

// 1억 이상은 썬빗처럼 큰 단위 두 개까지 (예: 18억 5,000만)
const KR_UNITS: [string, number][] = [['경', 1e16], ['조', 1e12], ['억', 1e8], ['만', 1e4]];
export function formatNumber(n: number): string {
  const v = Math.floor(n);
  const a = Math.abs(v);
  if (a < 1e8) return v.toLocaleString('ko-KR');
  const i = KR_UNITS.findIndex(([, u]) => a >= u);
  const [u, uv] = KR_UNITS[i];
  const hi = Math.floor(a / uv);
  const nx = KR_UNITS[i + 1];
  const lo = nx ? Math.floor((a - hi * uv) / nx[1]) : 0;
  return (v < 0 ? '-' : '') + hi.toLocaleString('ko-KR') + u + (lo ? ' ' + lo.toLocaleString('ko-KR') + nx[0] : '');
}

/* ───────── 썬빗 연동: 강화 상한 · 전투력 · 도장 · 대결 · 환전 ───────── */
export const MAX_STARS = 25;

// 강화 ★15부터는 실패하면 한 칸 떨어져요
export function starDropsOnFail(stars: number): boolean {
  return stars >= 15;
}

// 전투력: 친구 프로필·도장·대결에 쓰는 한 숫자
export function computePower(stats: ComputedStats, level: number): number {
  const dps = stats.atk * (1 + stats.critRate) + stats.autoDps * 2;
  return Math.round(dps * (1 + stats.mesoMultiplier * 0.05) * (1 + level * 0.04) * 10);
}

// 도장: 층마다 몹 5마리, 제한 시간 안에 최대한 높이
export const DOJO_KILLS_PER_FLOOR = 5;
export const DOJO_TOP = 100; // 100층 = 최종보스 말레이곰
export const DOJO_SPRITES: DailyQuestDef['spriteId'][] = ['mushroom', 'slime', 'pig', 'golem', 'chronos', 'zakum'];
const DOJO_BOSS_NAMES: Record<number, string> = { 10: '공매도 늑대왕', 20: '작전 세력 두목', 30: '상장폐지 해골', 40: '마진콜 저승사자', 50: '세력 대왕고래',
  60: '폭락 황소', 70: '서킷브레이커', 80: '하락장 북극곰', 90: '블랙스완' };
// 층마다 제한 시간: 일반 30초, 10층마다 보스 45초, 말레이곰 90초
export const dojoFloorTime = (floor: number): number => (floor >= DOJO_TOP ? 90_000 : floor % 10 === 0 ? 45_000 : 30_000);
// 시작할 수 있는 층: 1층, 그리고 깨 본 층 바로 위의 10단위 체크포인트(11·21·…·91)
export const dojoCheckpoints = (best: number): number[] => {
  const out = [1];
  for (let f = 11; f <= Math.min(91, best + 1); f += 10) out.push(f);
  return out;
};
export function dojoQuest(floor: number): DailyQuestDef {
  const fin = floor >= DOJO_TOP;
  const boss = !fin && floor % 10 === 0;
  const sprite = DOJO_SPRITES[Math.min(DOJO_SPRITES.length - 1, Math.floor((floor - 1) / 17))];
  // 1층 60 → 99층 약 16만 (최고 장비에 ★25쯤이어야 30초 안에 5마리)
  const hp = Math.round(60 * Math.pow(1.0838, floor - 1));
  const name = fin ? '👑 말레이곰' : boss ? DOJO_BOSS_NAMES[floor] ?? `${floor}층 보스` : `${floor}층 수련생`;
  return {
    id: 'dojo_' + floor,
    region: `🗼 곰굴 탑 ${floor}층`,
    title: name,
    monsterName: name,
    spriteId: fin ? 'malaybear' : boss ? 'zakum' : sprite,
    monsterMaxHp: fin ? 3_600_000 : boss ? hp * 6 : hp,
    targetKills: fin || boss ? 1 : DOJO_KILLS_PER_FLOOR,
    mesoPerKill: 0,
    expPerKill: Math.round(20 * Math.pow(1.06, floor - 1)),
    clearBonusMeso: 0,
    contactPct: fin ? 0.3 : (boss ? 0.18 : 0.08) + floor * 0.0012,
  };
}
// 처음 깬 층 보상 (최고 기록을 넘긴 층만). 말레이곰은 100억 꿀
export const dojoFloorReward = (floor: number): number =>
  floor >= DOJO_TOP ? 10_000_000_000 : floor * 5_000_000 * (floor % 10 === 0 ? 5 : 1);

// 원 ↔ 꿀 환전: 1원 = 1꿀. 원→꿀 수수료 3%, 꿀→원 수수료 10%, 꿀→원은 하루 3억원까지
export const FEE_BUY_RICE = 0.03;
export const FEE_SELL_RICE = 0.1;
export const RICE_OUT_DAILY_CAP = 300_000_000;
export const kstDay = (t = Date.now()): string => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);

// 대결: 하루 5번, 이기면 상대 전투력에 비례한 꿀
export const DUEL_DAILY = 5;
export const duelReward = (oppPower: number): number => Math.round(Math.min(2e9, Math.max(5e6, oppPower * 2000)));
