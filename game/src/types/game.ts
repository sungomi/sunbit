export type MainTab = 'hub' | 'game';

export type PhoneAppId = 'home' | 'bank' | 'stocks' | 'shop' | 'inventory' | 'exchange';

export type MonsterSpriteId =
  | 'mushroom'
  | 'slime'
  | 'pig'
  | 'golem'
  | 'chronos'
  | 'zakum'
  | 'malaybear';

export type EquipSlot = 'hat' | 'weapon' | 'armor' | 'gloves' | 'shoes' | 'cape';

export interface EquipDef {
  id: string;
  slot: EquipSlot;
  name: string;
  reqLevel: number;
  priceMeso: number;
  icon: string;
  color: string; // visual tint on pixel character
  atk: number;
  critRate: number; // e.g. 0.03 = 3%
  mesoBonus: number; // e.g. 0.1 = +10%
}

export interface DailyQuestDef {
  id: string;
  region: string;
  title: string;
  monsterName: string;
  spriteId: MonsterSpriteId;
  monsterMaxHp: number;
  targetKills: number;
  mesoPerKill: number;
  expPerKill: number;
  clearBonusMeso: number;
  contactPct?: number; // 부딪히면 최대 HP의 몇 % 피해 (곰굴 탑)
}

export interface QuestProgress {
  kills: number;
  claimed: boolean;
}

export interface StockDef {
  id: string;
  ticker: string;
  name: string;
  basePrice: number;
  volatility: number;
  description: string;
}

export interface StockHolding {
  shares: number;
  avgPrice: number;
}

export interface StockMarketItem {
  id: string;
  price: number;
  prevPrice: number;
  history: number[];
}

export type ShopCategory = 'upgrade' | 'flex';

export interface ShopItemDef {
  id: string;
  name: string;
  category: ShopCategory;
  currency: 'krw' | 'meso';
  price: number;
  icon: string;
  description: string;
  effectText: string;
  maxCount?: number;
  bonuses: {
    atk?: number;
    autoDps?: number;
    mesoMultiplier?: number;
    critRate?: number;
  };
}

export interface LootDef {
  id: string;
  name: string;
  icon: string;
  sellMeso: number;
  questId?: string; // drops primarily from this quest's monster
  color: string;
}

export type HeroSkillKey = 'w' | 's' | 'e' | 'd';

export type HairStyleId = 'spiky' | 'bob' | 'twintail' | 'bowl';
export type EyeStyleId = 'bright' | 'wink' | 'cool';

export interface CosmeticConfig {
  hairStyle: HairStyleId;
  hairColor: string;
  eyeStyle: EyeStyleId;
}

export interface GameState {
  day: number;
  level: number;
  exp: number;
  hp: number;
  mp: number;
  hpPotions: number;
  mpPotions: number;
  krw: number;
  meso: number;
  totalMesoEarned: number;
  totalKills: number;
  activeQuestId: string;
  monsterHp: number;
  fever: number;
  feverActiveUntil: number;
  skillCooldownUntil: number;
  skillCooldowns: Record<HeroSkillKey, number>;
  quests: Record<string, QuestProgress>;
  inventory: Record<string, number>;
  loot: Record<string, number>;
  equipped: Record<EquipSlot, string>;
  ownedEquips: string[];
  equipStars: Record<string, number>;
  cosmetic: CosmeticConfig;
  stocks: Record<string, StockHolding>;
  market: Record<string, StockMarketItem>;
  mesoRatePer10k: number;
  mesoRateHistory: number[];
  soundEnabled: boolean;
  lastSavedAt: number;
}

export interface FloatingPopup {
  id: number;
  text: string;
  subText?: string;
  x: number;
  y: number;
  variant: 'dmg' | 'crit' | 'meso' | 'skill';
}

// 🥋 곰 도장 한 판
export interface DojoRun {
  from: number; // 시작한 층
  floor: number; // 지금 도전 중인 층
  kills: number; // 이 층에서 잡은 수
  startedAt: number;
  endsAt: number;
}
