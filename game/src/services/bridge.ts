/**
 * 썬빗 연결 다리.
 * 곰사냥은 썬빗 안에서 iframe(rpg/index.html)으로 떠요. 같은 주소라서 parent 창의
 * window.SunbitRPG 를 그대로 불러 써요. 썬빗 밖에서 따로 열면(npm run dev) 연습용 가짜 다리를 써요.
 */

// 썬빗 지갑 문서(sb2_players/{uid})의 rpg 칸에 저장하는 내용. 시세·쿨타임 같은 그때그때 값은 빼요.
export interface RpgSave {
  v: 1;
  day: number;
  level: number;
  exp: number;
  meso: number;
  totalMesoEarned: number;
  totalKills: number;
  activeQuestId: string;
  hpPotions: number;
  mpPotions: number;
  quests: Record<string, { kills: number; claimed: boolean }>;
  inventory: Record<string, number>;
  loot: Record<string, number>;
  equipped: Record<string, string>;
  ownedEquips: string[];
  equipStars: Record<string, number>;
  cosmetic: { hairStyle: string; hairColor: string; eyeStyle: string };
  power: number; // 친구 화면에 보이는 전투력 (저장할 때 계산)
  gear: { n: string; i: string; s: number }[]; // 썬빗 프로필에 보여 줄 착용 장비 (이름·아이콘·별)
  dojo: { best: number; bestAt: number; week: string; weekBest: number };
  duel: { day: string; n: number; w: number; l: number };
  riceOut: { day: string; amt: number }; // 오늘 꿀→원 환전한 원화
  questDay: string; // 일일 퀘스트를 마지막으로 초기화한 날 (KST)
  soundEnabled: boolean;
}

export interface BridgePlayer {
  id: string;
  name: string;
  photo?: string;
  rpg?: RpgSave;
  bot?: boolean;
}

export interface FeedItem {
  kind: 'rpg_star' | 'rpg_dojo' | 'rpg_duel' | 'rpg_buy' | 'rpg_boss';
  [k: string]: unknown;
}

export interface SunbitBridge {
  uid: () => string | null;
  ready: () => boolean; // 지갑을 불러왔고 참가까지 한 상태
  cash: () => number;
  name: () => string;
  load: () => RpgSave | null;
  // rpg 저장과 현금 증감을 한 번에 (환전·현금 아이템 구매). 현금이 모자라면 false
  commit: (rpg: RpgSave, cashDelta: number) => Promise<boolean>;
  players: () => BridgePlayer[];
  feed: (f: FeedItem) => void;
  toast: (msg: string) => void;
  close: () => void; // 썬빗 홈으로
  takeDuelTarget: () => string | null; // 친구 프로필에서 '분신과 대결'을 누르고 왔으면 그 친구 uid
}

const DEMO_KEY = 'ssalmeok_sunbit_demo_v1';
function demoBridge(): SunbitBridge {
  let cash = 5_000_000_000;
  const read = (): { rpg: RpgSave | null; cash: number } => {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* 저장소를 못 쓰는 브라우저 */
    }
    return { rpg: null, cash };
  };
  const init = read();
  cash = init.cash;
  let rpg = init.rpg;
  const write = () => {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify({ rpg, cash }));
    } catch {
      /* 무시 */
    }
  };
  return {
    uid: () => 'demo',
    ready: () => true,
    cash: () => cash,
    name: () => '연습곰',
    load: () => rpg,
    commit: async (next, delta) => {
      if (cash + delta < 0) return false;
      cash = Math.round(cash + delta);
      rpg = next;
      write();
      return true;
    },
    players: () => [
      { id: 'demo', name: '연습곰', rpg: rpg ?? undefined },
      {
        id: 'bot_a',
        name: '존버왕',
        bot: true,
        rpg: { power: 3200, level: 9, dojo: { best: 14, bestAt: 0, week: kstWeek(), weekBest: 12 } } as RpgSave,
      },
      {
        id: 'bot_b',
        name: '단타의신',
        bot: true,
        rpg: { power: 900, level: 4, dojo: { best: 6, bestAt: 0, week: kstWeek(), weekBest: 6 } } as RpgSave,
      },
    ],
    feed: () => {},
    toast: () => {},
    close: () => {},
    takeDuelTarget: () => null,
  };
}

// 이번 주 월요일 (KST) — 도장 주간 순위용
export function kstWeek(t = Date.now()): string {
  const k = new Date(t + 9 * 3600e3);
  const dow = (k.getUTCDay() + 6) % 7;
  k.setUTCDate(k.getUTCDate() - dow);
  return k.toISOString().slice(0, 10);
}

function findBridge(): SunbitBridge {
  try {
    const p = window.parent as unknown as { SunbitRPG?: SunbitBridge };
    if (p && p !== (window as unknown) && p.SunbitRPG) return p.SunbitRPG;
  } catch {
    /* 다른 주소에서 띄운 경우 */
  }
  return demoBridge();
}

export const sunbit: SunbitBridge = findBridge();
export const inSunbit = (() => {
  try {
    return window.parent !== window && !!(window.parent as unknown as { SunbitRPG?: unknown }).SunbitRPG;
  } catch {
    return false;
  }
})();
