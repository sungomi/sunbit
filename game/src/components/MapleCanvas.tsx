import React, { useEffect, useRef } from 'react';
import { formatNumber, LOOT_ITEMS } from '../data/gameData';
import { sfx } from '../services/sound';
import type { CosmeticConfig, DailyQuestDef, HeroSkillKey, LootDef, MonsterSpriteId } from '../types/game';

export interface MapleInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpPressed: boolean;
  attackPressed: boolean;
  skillWPressed: boolean;
  skillSPressed: boolean;
  skillEPressed: boolean;
  skillDPressed: boolean;
  potHpPressed: boolean;
  potMpPressed: boolean;
}

interface MapleCanvasProps {
  quest: DailyQuestDef;
  level: number;
  mp: number;
  atk: number;
  critRate: number;
  mesoMultiplier: number;
  isFever: boolean;
  hasMagnetPet: boolean;
  autoDps: number;
  hatColor: string;
  armorColor: string;
  weaponColor: string;
  cosmetic: CosmeticConfig;
  skillCooldowns: Record<HeroSkillKey, number>;
  inputRef: React.MutableRefObject<MapleInputState>;
  onKillReward: (kills: number, meso: number, exp: number) => void;
  onCollectLoot: (lootId: string) => void;
  onHitFever: (gain: number) => void;
  onConsumeSkill: (key: HeroSkillKey, mpCost: number, cdMs: number) => void;
  onUsePotion: (type: 'hp' | 'mp') => void;
  onPlayerDamaged: (dmg: number) => void;
}

interface Platform {
  x: number;
  y: number;
  w: number;
}

interface Rope {
  x: number;
  topY: number;
  botY: number;
}

interface Mob {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  dir: 1 | -1;
  hitFlash: number;
  hopTimer: number;
}

interface CoinDrop {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  meso: number;
  age: number;
}

interface LootDrop {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  loot: LootDef;
  age: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
}

interface MapleDamageNum {
  x: number;
  y: number;
  text: string;
  isCrit: boolean;
  isSkill: boolean;
  life: number;
  maxLife: number;
  delay: number;
}

const VIEW_W = 384;
const WORLD_W = 960;
const H = 288;
const GROUND_Y = 252;
const GRAVITY = 0.42;

const PLATFORMS: Platform[] = [
  { x: 36, y: 198, w: 140 },
  { x: 240, y: 160, w: 140 },
  { x: 420, y: 202, w: 150 },
  { x: 520, y: 126, w: 140 },
  { x: 690, y: 186, w: 150 },
  { x: 800, y: 120, w: 130 },
  { x: 110, y: 108, w: 120 },
  { x: 330, y: 92, w: 120 },
];

const ROPES: Rope[] = [
  { x: 104, topY: 198, botY: GROUND_Y },
  { x: 310, topY: 160, botY: GROUND_Y },
  { x: 585, topY: 126, botY: GROUND_Y },
  { x: 765, topY: 186, botY: GROUND_Y },
];

interface RegionTheme {
  skyTop: string;
  skyBot: string;
  hillFar: string;
  groundTop: string;
  dirt: string;
  platBody: string;
  candleUp: string;
  candleDown: string;
}
const T = (skyTop: string, skyBot: string, hillFar: string, groundTop: string, dirt: string): RegionTheme => ({
  skyTop, skyBot, hillFar, groundTop, dirt, platBody: '#ffffff',
  candleUp: 'rgba(242,65,79,0.5)', candleDown: 'rgba(47,120,238,0.45)',
});
const REGION_THEMES: Record<string, RegionTheme> = {
  개미굴: T('#fff6dc', '#ffe8a3', '#ffd877', '#e9b44c', '#d99a2b'),
  '단타 골목': T('#eef2ff', '#dbe4ff', '#c5d0fa', '#9aa8e8', '#7b8bd6'),
  '작전 숲': T('#e8f8ef', '#c9f0da', '#a6e3c0', '#5cc08a', '#3c9a69'),
  '공매도 늪': T('#f1f0ff', '#e0dcff', '#c9c1ff', '#8f7cf0', '#6a4cf5'),
  '세력 바다': T('#e9f4ff', '#cde6ff', '#a9d2ff', '#4f9df0', '#2f78ee'),
  '황소 평원': T('#fff0f0', '#ffd9d9', '#ffc0c0', '#f2717c', '#d9414f'),
};
const DOJO_THEME: RegionTheme = {
  ...T('#2b211c', '#6b4a2e', '#4a3526', '#f2b300', '#3a2a1f'),
  platBody: '#fff6dc', candleUp: 'rgba(242,179,0,0.5)', candleDown: 'rgba(255,255,255,0.18)',
};

/* ═════════ 그림 (썬빗 스타일: 도트 대신 둥근 벡터 그림) ═════════ */
const RES = 2; // 캔버스를 2배로 그려서 폰·레티나에서도 또렷하게

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

// 몬스터: 썬빗 시장 괴물들 (이모지로 부드럽게). malaybear = 곰굴 100층 최종보스 (곰 사진)
const MOB_LOOK: Record<MonsterSpriteId, { emoji: string; size: number }> = {
  mushroom: { emoji: '🐜', size: 30 },
  slime: { emoji: '🐀', size: 32 },
  pig: { emoji: '🦊', size: 34 },
  golem: { emoji: '🐺', size: 38 },
  chronos: { emoji: '🐋', size: 42 },
  zakum: { emoji: '🐂', size: 54 },
  malaybear: { emoji: '🐻', size: 92 },
};
export const mobHeight = (id: MonsterSpriteId) => MOB_LOOK[id]?.size ?? 32;

let bearImg: HTMLImageElement | null = null;
function getBearImg() {
  if (!bearImg && typeof Image !== 'undefined') {
    bearImg = new Image();
    bearImg.src = '../bear.jpg';
  }
  return bearImg;
}

function drawMob(
  ctx: CanvasRenderingContext2D,
  id: MonsterSpriteId,
  cx: number,
  by: number,
  dir: 1 | -1,
  flash: boolean,
  tick: number,
  seed: number
) {
  const look = MOB_LOOK[id] ?? MOB_LOOK.mushroom;
  const sz = look.size;
  const hop = Math.abs(Math.sin(tick * 0.12 + seed)) * 3;
  const squash = 1 + Math.sin(tick * 0.24 + seed) * 0.04;
  ctx.fillStyle = 'rgba(23,22,31,0.16)';
  ctx.beginPath();
  ctx.ellipse(cx, by - 1, sz * 0.42, sz * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(cx, by - hop);
  ctx.scale(squash * (dir === 1 ? -1 : 1), 1 / squash);
  if (id === 'malaybear') {
    const img = getBearImg();
    const r = sz / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(242,179,0,0.9)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#f2b300';
    ctx.beginPath();
    ctx.arc(0, -r, r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -r, r, 0, Math.PI * 2);
    ctx.clip();
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -r, -2 * r, 2 * r, 2 * r);
    else {
      ctx.fillStyle = '#2b211c';
      ctx.fillRect(-r, -2 * r, 2 * r, 2 * r);
    }
    ctx.restore();
    ctx.font = `${Math.round(sz * 0.42)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000';
    ctx.fillText('👑', 0, -2 * r + sz * 0.08);
  } else {
    ctx.font = `${sz}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000'; // 그림자 색(반투명)이 남아 있으면 이모지도 흐려져요
    ctx.fillText(look.emoji, 0, -sz * 0.12);
  }
  ctx.restore();
  if (flash) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, by - hop - sz * 0.5, sz * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * 곰 모자를 쓴 사냥꾼 (둥근 벡터 그림). 발 아래 가운데(cx, by)가 기준점.
 * hatColor = 곰 모자 색, armorColor = 옷 색
 */
function drawCuteMapleHero(
  ctx: CanvasRenderingContext2D,
  cx: number,
  by: number,
  dir: 1 | -1,
  walkPhase: number,
  isMoving: boolean,
  isAttacking: boolean,
  hatColor: string,
  armorColor: string,
  cosmetic: CosmeticConfig
) {
  ctx.save();
  ctx.translate(cx, by);
  if (dir === -1) ctx.scale(-1, 1);
  const bob = isMoving ? Math.abs(Math.sin(walkPhase)) * 2 : 0;
  const leg = isMoving ? Math.sin(walkPhase) * 2.5 : 0;
  const ink = '#2b211c';

  ctx.fillStyle = 'rgba(23,22,31,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, -0.5, 10, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = ink;
  rr(ctx, -6 + leg, -7, 5, 7, 2.5);
  ctx.fill();
  rr(ctx, 1 - leg, -7, 5, 7, 2.5);
  ctx.fill();

  ctx.fillStyle = armorColor;
  rr(ctx, -8, -17 - bob, 16, 12, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  rr(ctx, -6, -16 - bob, 6, 4, 2);
  ctx.fill();
  ctx.fillStyle = '#f2b300';
  rr(ctx, -8, -9 - bob, 16, 2.4, 1.2);
  ctx.fill();

  ctx.fillStyle = '#ffe3c4';
  ctx.beginPath();
  ctx.arc(isAttacking ? 10 : 7, -11 - bob, 2.6, 0, Math.PI * 2);
  ctx.fill();

  const hy = -27 - bob;
  ctx.fillStyle = '#ffe3c4';
  ctx.beginPath();
  ctx.arc(0, hy, 10.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = cosmetic.hairColor;
  ctx.beginPath();
  ctx.ellipse(-1, hy - 6, 9.5, 4.5, -0.1, Math.PI, 0);
  ctx.fill();
  if (cosmetic.hairStyle === 'twintail') {
    ctx.beginPath();
    ctx.ellipse(-11, hy + 3, 3, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (cosmetic.hairStyle === 'bob') {
    ctx.beginPath();
    ctx.ellipse(-8.5, hy + 2, 3.2, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (cosmetic.hairStyle === 'spiky') {
    ctx.beginPath();
    ctx.moveTo(-5, hy - 9);
    ctx.lineTo(-2, hy - 14);
    ctx.lineTo(1, hy - 9);
    ctx.lineTo(4, hy - 13);
    ctx.lineTo(6, hy - 8);
    ctx.fill();
  }

  // 곰 모자 (귀 두 개)
  ctx.fillStyle = hatColor;
  ctx.beginPath();
  ctx.arc(-7, hy - 9, 3.8, 0, Math.PI * 2);
  ctx.arc(7, hy - 9, 3.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, hy - 6.5, 10.8, 5.6, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(-7, hy - 9, 1.6, 0, Math.PI * 2);
  ctx.arc(7, hy - 9, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = ink;
  if (cosmetic.eyeStyle === 'wink') {
    ctx.beginPath();
    ctx.ellipse(-3.5, hy + 1, 1.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = ink;
    ctx.beginPath();
    ctx.moveTo(2.2, hy + 1.2);
    ctx.quadraticCurveTo(4, hy - 0.4, 5.8, hy + 1.2);
    ctx.stroke();
  } else if (cosmetic.eyeStyle === 'cool') {
    rr(ctx, -5.5, hy, 4, 2, 1);
    ctx.fill();
    rr(ctx, 2, hy, 4, 2, 1);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(-3.5, hy + 1, 1.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, hy + 1, 1.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-3, hy + 0.2, 0.6, 0, Math.PI * 2);
    ctx.arc(4.5, hy + 0.2, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,120,120,0.45)';
  ctx.beginPath();
  ctx.arc(-6.5, hy + 4.5, 1.9, 0, Math.PI * 2);
  ctx.arc(7, hy + 4.5, 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0.5, hy + 4.5, 1.6, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

// 배경: 지역 색으로 칠한 차트 캔들 실루엣 (썬빗 느낌)
function drawMapleLandmark(ctx: CanvasRenderingContext2D, region: string, camX: number, tick: number) {
  const theme = REGION_THEMES[region] ?? DOJO_THEME;
  const shift = camX * 0.35;
  let seed = 0;
  for (let i = 0; i < region.length; i++) seed = (seed * 31 + region.charCodeAt(i)) >>> 0;
  const rnd = (n: number) => {
    const x = Math.sin(seed + n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const first = Math.floor(shift / 30);
  // 앞 캔들부터 가격을 이어 붙여요 (스크롤해도 모양이 그대로)
  let price = GROUND_Y - 110;
  for (let n = 0; n < first; n++) price = Math.max(GROUND_Y - 190, Math.min(GROUND_Y - 50, price + (rnd(n) - 0.5) * 40));
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 24; i++) {
    const n = first + i;
    const x = n * 30 - shift;
    const open = price;
    const close = Math.max(GROUND_Y - 190, Math.min(GROUND_Y - 50, open + (rnd(n) - 0.5) * 40));
    price = close;
    const hi = Math.min(open, close) - rnd(n + 99) * 14;
    const lo = Math.max(open, close) + rnd(n + 199) * 14;
    ctx.fillStyle = close < open ? theme.candleUp : theme.candleDown;
    ctx.fillRect(x + 11.5, hi, 2, lo - hi);
    rr(ctx, x + 6, Math.min(open, close), 13, Math.max(3, Math.abs(close - open)), 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 10; i++) {
    const x = (i * 97 + tick * 0.3) % VIEW_W;
    const y = 40 + ((i * 53 + Math.sin(tick * 0.02 + i) * 12) % 160);
    ctx.beginPath();
    ctx.arc(x, y, 1.4 + (i % 3) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const MapleCanvas: React.FC<MapleCanvasProps> = ({
  quest,
  level,
  mp,
  atk,
  critRate,
  mesoMultiplier,
  isFever,
  hasMagnetPet,
  autoDps,
  hatColor,
  armorColor,
  weaponColor,
  cosmetic,
  skillCooldowns,
  inputRef,
  onKillReward,
  onCollectLoot,
  onHitFever,
  onConsumeSkill,
  onUsePotion,
  onPlayerDamaged,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const propsRef = useRef({
    quest,
    level,
    mp,
    atk,
    critRate,
    mesoMultiplier,
    isFever,
    hasMagnetPet,
    autoDps,
    hatColor,
    armorColor,
    weaponColor,
    cosmetic,
    skillCooldowns,
    onKillReward,
    onCollectLoot,
    onHitFever,
    onConsumeSkill,
    onUsePotion,
    onPlayerDamaged,
  });
  propsRef.current = {
    quest,
    level,
    mp,
    atk,
    critRate,
    mesoMultiplier,
    isFever,
    hasMagnetPet,
    autoDps,
    hatColor,
    armorColor,
    weaponColor,
    cosmetic,
    skillCooldowns,
    onKillReward,
    onCollectLoot,
    onHitFever,
    onConsumeSkill,
    onUsePotion,
    onPlayerDamaged,
  };

  const mobsRef = useRef<Mob[]>([]);
  const nextMobIdRef = useRef(1);
  const questIdRef = useRef(quest.id);
  const prevLevelRef = useRef(level);
  const levelUpBannerRef = useRef(0);

  useEffect(() => {
    if (questIdRef.current !== quest.id) {
      questIdRef.current = quest.id;
      mobsRef.current = [];
    }
  }, [quest.id]);

  useEffect(() => {
    if (level > prevLevelRef.current) {
      levelUpBannerRef.current = 75;
    }
    prevLevelRef.current = level;
  }, [level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;

    const player = {
      x: WORLD_W / 2,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      dir: 1 as 1 | -1,
      onGround: true,
      onRope: false,
      jumpsLeft: 2,
      attackTimer: 0,
      attackCooldown: 0,
      walkFrame: 0,
      deathfaultTimer: 0,
      incisingTimer: 0,
      burningTimer: 0,
      shoutTimer: 0,
      flashJumpTimer: 0,
      shakeTimer: 0,
      invulnTimer: 0,
    };

    let camX = Math.max(0, Math.min(WORLD_W - VIEW_W, player.x - VIEW_W / 2));

    const coins: CoinDrop[] = [];
    const loots: LootDrop[] = [];
    const particles: Particle[] = [];
    const floats: FloatingText[] = [];
    const dmgNums: MapleDamageNum[] = [];
    const afterimages: { x: number; y: number; dir: 1 | -1; life: number }[] = [];
    let nextDropId = 1;
    let tickCount = 0;
    let autoTickAcc = 0;
    let rafId = 0;
    let lastTime = performance.now();

    const spawnMob = () => {
      const q = propsRef.current.quest;
      const usePlat = Math.random() < 0.6;
      let sx = 32 + Math.random() * (WORLD_W - 64);
      let sy = GROUND_Y;
      if (usePlat) {
        const p = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
        sx = p.x + 18 + Math.random() * (p.w - 36);
        sy = p.y;
      }
      mobsRef.current.push({
        id: nextMobIdRef.current++,
        x: sx,
        y: sy,
        vx: (Math.random() < 0.5 ? -1 : 1) * (0.38 + Math.random() * 0.35),
        vy: 0,
        hp: q.monsterMaxHp,
        maxHp: q.monsterMaxHp,
        dir: 1,
        hitFlash: 0,
        hopTimer: 45 + Math.random() * 80,
      });
    };

    while (mobsRef.current.length < 10) {
      spawnMob();
    }

    const spawnHitParticles = (x: number, y: number, color: string, count = 6) => {
      for (let i = 0; i < count; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 3.6,
          vy: -1 - Math.random() * 2.5,
          color,
          size: Math.random() < 0.5 ? 2 : 3,
          life: 16 + Math.random() * 10,
        });
      }
    };

    const pickMonsterLoot = (questId: string): LootDef | null => {
      const roll = Math.random();
      if (roll < 0.55) {
        const specific = LOOT_ITEMS.find((l) => l.questId === questId);
        if (specific) return specific;
      } else if (roll < 0.68) {
        return LOOT_ITEMS.find((l) => l.id === 'loot_elixir') ?? null;
      } else if (roll < 0.75) {
        return LOOT_ITEMS.find((l) => l.id === 'loot_cube') ?? null;
      }
      return null;
    };

    const damageMob = (
      mob: Mob,
      totalDmg: number,
      isCrit: boolean,
      isSkill: boolean,
      hits = 2
    ) => {
      mob.hp -= totalDmg;
      mob.hitFlash = 7;
      mob.vx = (mob.x >= player.x ? 1 : -1) * 2.5;
      mob.vy = -2.2;

      spawnHitParticles(
        mob.x,
        mob.y - 14,
        isSkill ? '#ff4d4f' : isCrit ? '#ff6b6b' : '#ffd43b',
        isCrit ? 9 : 5
      );

      // Stacked MapleStory-style multi-hit damage numbers
      const perHit = Math.max(1, Math.round(totalDmg / hits));
      for (let h = 0; h < hits; h++) {
        const jitter = Math.round(perHit * (0.94 + Math.random() * 0.12));
        dmgNums.push({
          x: mob.x + (h % 2 === 0 ? -4 : 4),
          y: mob.y - 26 - h * 15,
          text: isCrit ? `✦${formatNumber(jitter)}` : `${formatNumber(jitter)}`,
          isCrit,
          isSkill,
          life: 44,
          maxLife: 44,
          delay: h * 3,
        });
      }

      if (mob.hp <= 0) {
        const { quest: q, mesoMultiplier: mult, isFever: fev } = propsRef.current;
        const mesoDrop = Math.floor(q.mesoPerKill * mult * (fev ? 2 : 1));
        coins.push({
          id: nextDropId++,
          x: mob.x - 6,
          y: mob.y - 10,
          vx: -0.8 - Math.random() * 0.8,
          vy: -3.6,
          meso: mesoDrop,
          age: 0,
        });

        const droppedLoot = pickMonsterLoot(q.id);
        if (droppedLoot) {
          loots.push({
            id: nextDropId++,
            x: mob.x + 6,
            y: mob.y - 10,
            vx: 0.8 + Math.random() * 0.8,
            vy: -4.1,
            loot: droppedLoot,
            age: 0,
          });
        }
      }
    };

    const step = (now: number) => {
      const dt = Math.min(2, (now - lastTime) / 16.67);
      lastTime = now;
      tickCount += dt;
      const pState = propsRef.current;
      const input = inputRef.current;

      while (mobsRef.current.length < 10) {
        spawnMob();
      }

      // Check Rope Climbing
      const nearRope = ROPES.find(
        (r) => Math.abs(player.x - r.x) < 14 && player.y >= r.topY - 4 && player.y <= r.botY + 4
      );

      if (nearRope && (input.up || input.down)) {
        player.onRope = true;
        player.x = nearRope.x;
        player.vx = 0;
        player.vy = 0;
        player.jumpsLeft = 2;
      }

      if (player.onRope) {
        if (!nearRope) {
          player.onRope = false;
        } else {
          if (input.up) player.y -= 2.2 * dt;
          if (input.down) player.y += 2.2 * dt;
          if (player.y <= nearRope.topY) {
            player.y = nearRope.topY;
            player.onRope = false;
            player.onGround = true;
          }
          if (player.y >= nearRope.botY) {
            player.y = nearRope.botY;
            player.onRope = false;
            player.onGround = true;
          }
          if (input.jumpPressed) {
            input.jumpPressed = false;
            player.onRope = false;
            player.vy = -5.8;
            player.vx = (input.left ? -1 : input.right ? 1 : player.dir) * 3.2;
          }
        }
      } else {
        // Horizontal movement
        const speed = 2.85;
        if (input.left) {
          player.vx = -speed;
          player.dir = -1;
          player.walkFrame += 0.25 * dt;
        } else if (input.right) {
          player.vx = speed;
          player.dir = 1;
          player.walkFrame += 0.25 * dt;
        } else {
          player.vx *= 0.72;
        }

        // Jump / Flash Jump (Double jump!)
        if (input.jumpPressed) {
          input.jumpPressed = false;
          if (player.jumpsLeft > 0) {
            if (player.onGround) {
              player.vy = -7.0;
            } else {
              // MapleStory Flash Jump with cyan wind-burst & speed afterimages!
              player.vy = -5.2;
              player.vx = player.dir * 5.6;
              player.flashJumpTimer = 16;
              spawnHitParticles(player.x, player.y - 10, '#74c0fc', 10);
              afterimages.push(
                { x: player.x - player.dir * 8, y: player.y, dir: player.dir, life: 12 },
                { x: player.x - player.dir * 18, y: player.y, dir: player.dir, life: 9 }
              );
            }
            player.onGround = false;
            player.jumpsLeft -= 1;
            sfx.click();
          }
        }
      }

      // Attack (Hero's Raging Blow!)
      if (player.attackCooldown > 0) player.attackCooldown -= dt;
      if (player.attackTimer > 0) player.attackTimer -= dt;
      if (player.deathfaultTimer > 0) player.deathfaultTimer -= dt;
      if (player.incisingTimer > 0) player.incisingTimer -= dt;
      if (player.burningTimer > 0) player.burningTimer -= dt;
      if (player.shoutTimer > 0) player.shoutTimer -= dt;
      if (player.flashJumpTimer > 0) player.flashJumpTimer -= dt;
      if (player.shakeTimer > 0) player.shakeTimer -= dt;
      if (player.invulnTimer > 0) player.invulnTimer -= dt;

      // Potions (X = HP, C = MP)
      if (input.potHpPressed) {
        input.potHpPressed = false;
        pState.onUsePotion('hp');
      }
      if (input.potMpPressed) {
        input.potMpPressed = false;
        pState.onUsePotion('mp');
      }

      if (input.attackPressed) {
        input.attackPressed = false;
        if (player.attackCooldown <= 0) {
          player.attackTimer = 14;
          player.attackCooldown = 13;

          const minX = player.dir === 1 ? player.x - 16 : player.x - 78;
          const maxX = player.dir === 1 ? player.x + 78 : player.x + 16;

          let hitAny = false;
          let hadCrit = false;
          for (const mob of mobsRef.current) {
            if (mob.x >= minX && mob.x <= maxX && Math.abs(mob.y - player.y) <= 50) {
              const isCrit = Math.random() < pState.critRate;
              if (isCrit) hadCrit = true;
              const dmg = Math.floor(pState.atk * (isCrit ? 2.2 : 1));
              damageMob(mob, dmg, isCrit, false, 3);
              hitAny = true;
            }
          }
          if (hitAny) {
            if (hadCrit) sfx.crit();
            else sfx.hit();
            pState.onHitFever(7);
          } else {
            sfx.click();
          }
        }
      }

      const trySkill = (
        key: HeroSkillKey,
        mpCost: number,
        cdMs: number,
        rangeX: number,
        dmgMult: number,
        hits: number,
        onCast: () => void
      ) => {
        const ts = Date.now();
        if (ts < (pState.skillCooldowns[key] ?? 0) || pState.mp < mpCost) {
          sfx.error();
          return;
        }
        pState.onConsumeSkill(key, mpCost, cdMs);
        onCast();
        for (const mob of mobsRef.current) {
          if (Math.abs(mob.x - player.x) <= rangeX && Math.abs(mob.y - player.y) <= 130) {
            const dmg = Math.floor(pState.atk * dmgMult);
            damageMob(mob, dmg, true, true, hits);
          }
        }
        pState.onHitFever(15);
      };

      // W: 할퀴기 (Incising)
      if (input.skillWPressed) {
        input.skillWPressed = false;
        trySkill('w', 18, 4000, 110, 3.0, 4, () => {
          player.incisingTimer = 18;
          sfx.crit();
        });
      }

      // S: 콤보 내려찍기 (Combo Deathfault)
      if (input.skillSPressed) {
        input.skillSPressed = false;
        trySkill('s', 35, 8000, VIEW_W * 0.78, 5.5, 5, () => {
          player.deathfaultTimer = 28;
          player.shakeTimer = 18;
          sfx.deathfault();
        });
      }

      // E: 버닝 소울 (Burning Soul)
      if (input.skillEPressed) {
        input.skillEPressed = false;
        trySkill('e', 25, 6000, 140, 3.8, 4, () => {
          player.burningTimer = 24;
          sfx.fever();
        });
      }

      // D: 포효 (Hero Shout)
      if (input.skillDPressed) {
        input.skillDPressed = false;
        trySkill('d', 15, 5000, 165, 3.2, 3, () => {
          player.shoutTimer = 20;
          player.shakeTimer = 8;
          sfx.crit();
        });
      }

      // Auto DPS
      if (pState.autoDps > 0) {
        autoTickAcc += dt;
        if (autoTickAcc >= 60 && mobsRef.current.length > 0) {
          autoTickAcc = 0;
          const target = mobsRef.current[0];
          damageMob(target, pState.autoDps, false, false);
        }
      }

      // Player Physics
      if (!player.onRope) {
        const prevY = player.y;
        player.x = Math.max(14, Math.min(WORLD_W - 14, player.x + player.vx * dt));
        player.vy += GRAVITY * dt;
        player.y += player.vy * dt;

        player.onGround = false;
        if (player.vy >= 0) {
          for (const plat of PLATFORMS) {
            if (
              player.x >= plat.x - 6 &&
              player.x <= plat.x + plat.w + 6 &&
              prevY <= plat.y + 4 &&
              player.y >= plat.y
            ) {
              player.y = plat.y;
              player.vy = 0;
              player.onGround = true;
              player.jumpsLeft = 2;
              break;
            }
          }
        }
        if (player.y >= GROUND_Y) {
          player.y = GROUND_Y;
          player.vy = 0;
          player.onGround = true;
          player.jumpsLeft = 2;
        }
      }

      // Smooth Camera Follow
      const targetCamX = Math.max(0, Math.min(WORLD_W - VIEW_W, player.x - VIEW_W / 2));
      camX += (targetCamX - camX) * 0.14;

      // Mobs
      const deadMobs = mobsRef.current.filter((m) => m.hp <= 0);
      if (deadMobs.length > 0) {
        mobsRef.current = mobsRef.current.filter((m) => m.hp > 0);
        sfx.mobDie(pState.quest.spriteId);
        const expGain = deadMobs.length * pState.quest.expPerKill;
        pState.onKillReward(deadMobs.length, 0, expGain);
        floats.push({
          x: deadMobs[0].x,
          y: deadMobs[0].y - 38,
          vy: -0.5,
          text: `+${expGain} EXP`,
          color: '#a9e34b',
          life: 32,
        });
      }

      for (const mob of mobsRef.current) {
        if (mob.hitFlash > 0) mob.hitFlash -= dt;
        mob.hopTimer -= dt;
        if (mob.hopTimer <= 0 && mob.vy === 0) {
          mob.vy = -3.2;
          mob.vx = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.4);
          mob.hopTimer = 70 + Math.random() * 90;
        }

        const mPrevY = mob.y;
        mob.x += mob.vx * dt;
        if (mob.x < 18) {
          mob.x = 18;
          mob.vx = Math.abs(mob.vx);
        }
        if (mob.x > WORLD_W - 18) {
          mob.x = WORLD_W - 18;
          mob.vx = -Math.abs(mob.vx);
        }
        mob.dir = mob.vx >= 0 ? 1 : -1;

        mob.vy += GRAVITY * dt;
        mob.y += mob.vy * dt;

        if (mob.vy >= 0) {
          for (const plat of PLATFORMS) {
            if (
              mob.x >= plat.x &&
              mob.x <= plat.x + plat.w &&
              mPrevY <= plat.y + 4 &&
              mob.y >= plat.y
            ) {
              mob.y = plat.y;
              mob.vy = 0;
              break;
            }
          }
        }
        if (mob.y >= GROUND_Y) {
          mob.y = GROUND_Y;
          mob.vy = 0;
        }

        // Monster contact damage to player
        if (
          player.invulnTimer <= 0 &&
          Math.abs(mob.x - player.x) < 16 &&
          Math.abs(mob.y - player.y) < 20
        ) {
          player.invulnTimer = 65;
          player.vy = -3.4;
          player.vx = (player.x >= mob.x ? 1 : -1) * 3.2;
          const contactDmg = pState.quest.contactPct
            ? Math.max(8, Math.round((200 + (pState.level - 1) * 45) * pState.quest.contactPct))
            : Math.max(8, Math.round(mob.maxHp * 0.14));
          pState.onPlayerDamaged(contactDmg);
          floats.push({
            x: player.x,
            y: player.y - 32,
            vy: -0.5,
            text: `-${contactDmg}`,
            color: '#ff6b6b',
            life: 32,
          });
        }
      }

      // Coins
      let collectedMeso = 0;
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        c.age += dt;
        c.vy += GRAVITY * 0.9 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;

        if (c.y >= GROUND_Y) {
          c.y = GROUND_Y;
          c.vy = 0;
          c.vx *= 0.7;
        }

        if (pState.hasMagnetPet) {
          c.x += (player.x - c.x) * 0.12;
          c.y += (player.y - 10 - c.y) * 0.12;
        }

        const dist = Math.hypot(c.x - player.x, c.y - (player.y - 10));
        if (dist < 26 || c.age > 240) {
          collectedMeso += c.meso;
          floats.push({
            x: c.x,
            y: c.y - 14,
            vy: -0.65,
            text: `+${formatNumber(c.meso)} 꿀`,
            color: '#ffd43b',
            life: 40,
          });
          coins.splice(i, 1);
        }
      }
      if (collectedMeso > 0) {
        sfx.coin();
        pState.onKillReward(0, collectedMeso, 0);
      }

      // Item Loot Drops
      for (let i = loots.length - 1; i >= 0; i--) {
        const l = loots[i];
        l.age += dt;
        l.vy += GRAVITY * 0.9 * dt;
        l.x += l.vx * dt;
        l.y += l.vy * dt;

        if (l.y >= GROUND_Y) {
          l.y = GROUND_Y;
          l.vy = 0;
          l.vx *= 0.7;
        }

        if (pState.hasMagnetPet) {
          l.x += (player.x - l.x) * 0.12;
          l.y += (player.y - 10 - l.y) * 0.12;
        }

        const dist = Math.hypot(l.x - player.x, l.y - (player.y - 10));
        if (dist < 26 || l.age > 260) {
          sfx.buy();
          pState.onCollectLoot(l.loot.id);
          floats.push({
            x: l.x,
            y: l.y - 18,
            vy: -0.6,
            text: `[득템] ${l.loot.name}`,
            color: '#69db7c',
            life: 48,
          });
          loots.splice(i, 1);
        }
      }

      // Particles & Floating Texts
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 0.18 * dt;
        pt.life -= dt;
        if (pt.life <= 0) particles.splice(i, 1);
      }

      for (let i = floats.length - 1; i >= 0; i--) {
        floats[i].y += floats[i].vy * dt;
        floats[i].life -= dt;
        if (floats[i].life <= 0) floats.splice(i, 1);
      }

      for (let i = dmgNums.length - 1; i >= 0; i--) {
        const d = dmgNums[i];
        if (d.delay > 0) {
          d.delay -= dt;
        } else {
          d.y -= 0.48 * dt;
          d.life -= dt;
          if (d.life <= 0) dmgNums.splice(i, 1);
        }
      }

      for (let i = afterimages.length - 1; i >= 0; i--) {
        afterimages[i].life -= dt;
        if (afterimages[i].life <= 0) afterimages.splice(i, 1);
      }

      // ====================
      // RENDER
      // ====================
      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      const theme = REGION_THEMES[pState.quest.region] ?? DOJO_THEME;
      const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      grad.addColorStop(0, pState.isFever ? '#5f3dc4' : theme.skyTop);
      grad.addColorStop(1, pState.isFever ? '#f06595' : theme.skyBot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_W, GROUND_Y);

      // 구름·언덕 (부드럽게)
      const farShift = camX * 0.25;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (const cx of [60, 230, 400, 560]) {
        const x = (((cx - farShift) % 760) + 760) % 760 - 60;
        ctx.beginPath();
        ctx.ellipse(x, 34, 30, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 16, 26, 18, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 14, 30, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = theme.hillFar;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      for (let hx = 0; hx <= VIEW_W; hx += 8) {
        const w = hx + farShift;
        ctx.lineTo(hx, GROUND_Y - 34 - Math.sin(w * 0.012) * 16 - Math.sin(w * 0.031) * 7);
      }
      ctx.lineTo(VIEW_W, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Parallax Midground Maple Landmarks
      drawMapleLandmark(ctx, pState.quest.region, camX, tickCount);

      // World-space rendering (with screen shake!)
      const shakeX = player.shakeTimer > 0 ? Math.round((Math.random() - 0.5) * 8) : 0;
      const shakeY = player.shakeTimer > 0 ? Math.round((Math.random() - 0.5) * 8) : 0;
      ctx.save();
      ctx.translate(-Math.round(camX) + shakeX, shakeY);

      // 사다리
      ctx.strokeStyle = 'rgba(23,22,31,0.35)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (const r of ROPES) {
        ctx.beginPath();
        ctx.moveTo(r.x - 4, r.topY);
        ctx.lineTo(r.x - 4, r.botY);
        ctx.moveTo(r.x + 4, r.topY);
        ctx.lineTo(r.x + 4, r.botY);
        for (let ry = r.topY + 6; ry < r.botY; ry += 10) {
          ctx.moveTo(r.x - 4, ry);
          ctx.lineTo(r.x + 4, ry);
        }
        ctx.stroke();
      }

      // 발판 (둥근 카드)
      for (const plat of PLATFORMS) {
        ctx.save();
        ctx.shadowColor = 'rgba(23,22,31,0.18)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = theme.platBody;
        rr(ctx, plat.x, plat.y, plat.w, 10, 5);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = theme.groundTop;
        rr(ctx, plat.x, plat.y, plat.w, 3.5, 1.75);
        ctx.fill();
      }

      // 땅
      const gg = ctx.createLinearGradient(0, GROUND_Y, 0, H);
      gg.addColorStop(0, theme.groundTop);
      gg.addColorStop(1, theme.dirt);
      ctx.fillStyle = gg;
      ctx.fillRect(0, GROUND_Y, WORLD_W, H - GROUND_Y);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(0, GROUND_Y, WORLD_W, 2);

      // 꿀 방울
      for (const c of coins) {
        const x = c.x;
        const y = c.y - 7;
        ctx.fillStyle = '#f2b300';
        ctx.beginPath();
        ctx.moveTo(x, y - 7);
        ctx.quadraticCurveTo(x + 6, y, x, y + 6);
        ctx.quadraticCurveTo(x - 6, y, x, y - 7);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(x - 1.5, y - 0.5, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 전리품 (둥근 보석)
      for (const l of loots) {
        const lx = l.x;
        const ly = l.y - 7;
        ctx.save();
        ctx.shadowColor = l.loot.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = l.loot.color;
        ctx.beginPath();
        ctx.arc(lx, ly, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(lx - 2, ly - 2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 몬스터
      const sid = pState.quest.spriteId;
      const mh = mobHeight(sid);
      for (const mob of mobsRef.current) {
        drawMob(ctx, sid, mob.x, mob.y, mob.dir, mob.hitFlash > 0, tickCount, mob.id);
        const bw = Math.max(28, mh * 0.8);
        const hpRatio = Math.max(0, mob.hp / mob.maxHp);
        const barY = mob.y - mh - 10;
        ctx.fillStyle = 'rgba(23,22,31,0.18)';
        rr(ctx, mob.x - bw / 2, barY, bw, 5, 2.5);
        ctx.fill();
        ctx.fillStyle = '#f2414f';
        rr(ctx, mob.x - bw / 2, barY, Math.max(2, bw * hpRatio), 5, 2.5);
        ctx.fill();
      }

      // Flash Jump Afterimages & Wind Ring
      for (const ai of afterimages) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.15, ai.life / 14) * 0.55;
        drawCuteMapleHero(
          ctx,
          ai.x,
          ai.y,
          ai.dir,
          0,
          false,
          false,
          '#74c0fc',
          '#3bc9db',
          { ...pState.cosmetic, hairColor: '#a5f3fc' }
        );
        ctx.restore();
      }

      if (player.flashJumpTimer > 0) {
        const fjProg = 1 - player.flashJumpTimer / 16;
        ctx.save();
        ctx.strokeStyle = `rgba(116, 192, 252, ${1 - fjProg})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(
          Math.round(player.x - player.dir * 12),
          Math.round(player.y - 14),
          6 + fjProg * 16,
          14 + fjProg * 6,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      }

      // Cute MapleStory Chibi Hero Character
      const isMoving = player.onGround && Math.abs(player.vx) > 0.3;
      if (player.invulnTimer <= 0 || Math.floor(player.invulnTimer / 4) % 2 === 0) {
        drawCuteMapleHero(
          ctx,
          player.x,
          player.y,
          player.dir,
          player.walkFrame,
          isMoving,
          player.attackTimer > 0,
          pState.hatColor,
          pState.armorColor,
          pState.cosmetic
        );
      }

      // Maple Name Tag below character
      ctx.font = 'bold 9px "Gothic A1", sans-serif';
      ctx.textAlign = 'center';
      const tag = `Lv.${pState.level} 곰사냥꾼`;
      ctx.fillStyle = 'rgba(23, 22, 31, 0.72)';
      rr(ctx, player.x - 30, player.y + 3, 60, 12, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tag, Math.round(player.x), Math.round(player.y) + 10);

      // Dynamic Sweeping Hero Raging Blow VFX!
      ctx.save();
      ctx.translate(Math.round(player.x), Math.round(player.y));
      if (player.dir === -1) ctx.scale(-1, 1);
      if (player.attackTimer > 0) {
        const atkProg = 1 - player.attackTimer / 14;
        const sweepStart = -1.35 + atkProg * 0.55;
        const sweepEnd = -0.2 + atkProg * 1.15;

        ctx.globalAlpha = 1 - atkProg * 0.4;
        // Outer crimson flame wave
        ctx.fillStyle = '#e03131';
        ctx.beginPath();
        ctx.arc(14, -15, 50 + atkProg * 8, sweepStart, sweepEnd);
        ctx.arc(14, -15, 22, sweepEnd, sweepStart, true);
        ctx.closePath();
        ctx.fill();

        // Mid fiery orange arc
        ctx.fillStyle = '#ff922b';
        ctx.beginPath();
        ctx.arc(16, -15, 42 + atkProg * 6, sweepStart + 0.1, sweepEnd);
        ctx.arc(16, -15, 25, sweepEnd, sweepStart + 0.1, true);
        ctx.closePath();
        ctx.fill();

        // White-hot blade edge
        ctx.fillStyle = '#fff9db';
        ctx.beginPath();
        ctx.arc(18, -15, 36 + atkProg * 6, sweepStart + 0.2, sweepEnd);
        ctx.arc(18, -15, 30, sweepEnd, sweepStart + 0.2, true);
        ctx.closePath();
        ctx.fill();

        // Dynamic rotating sword
        ctx.save();
        ctx.translate(8, -12);
        ctx.rotate(-0.8 + atkProg * 2.1);
        ctx.fillStyle = '#1a1c2c';
        ctx.fillRect(0, -3, 24, 6);
        ctx.fillStyle = pState.weaponColor;
        ctx.fillRect(1, -2, 22, 4);
        ctx.restore();
      } else {
        ctx.fillStyle = '#1a1c2c';
        ctx.fillRect(8, -22, 5, 14);
        ctx.fillStyle = pState.weaponColor;
        ctx.fillRect(9, -21, 3, 11);
      }
      ctx.restore();

      // Particles
      for (const pt of particles) {
        ctx.fillStyle = pt.color;
        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
      }

      // W: Kinetic Dual X-Slash Incising VFX
      if (player.incisingTimer > 0) {
        const p = 1 - player.incisingTimer / 18;
        const reach = 20 + p * 26;
        const cx = player.x + player.dir * (30 + p * 18);
        const cy = player.y - 16;
        ctx.save();
        ctx.globalAlpha = 1 - p * 0.85;
        // Crimson outer X
        ctx.strokeStyle = '#ff2e63';
        ctx.lineWidth = 8 * (1 - p * 0.4);
        ctx.beginPath();
        ctx.moveTo(cx - reach, cy - reach * 0.8);
        ctx.lineTo(cx + reach, cy + reach * 0.8);
        ctx.moveTo(cx + reach, cy - reach * 0.8);
        ctx.lineTo(cx - reach, cy + reach * 0.8);
        ctx.stroke();
        // White-hot inner X
        ctx.strokeStyle = '#fff9db';
        ctx.lineWidth = 3 * (1 - p * 0.4);
        ctx.beginPath();
        ctx.moveTo(cx - reach, cy - reach * 0.8);
        ctx.lineTo(cx + reach, cy + reach * 0.8);
        ctx.moveTo(cx + reach, cy - reach * 0.8);
        ctx.lineTo(cx - reach, cy + reach * 0.8);
        ctx.stroke();
        ctx.restore();
      }

      // E: Burning Soul Giant Descending Sword Spirit & Flame Pillar
      if (player.burningTimer > 0) {
        const p = 1 - player.burningTimer / 24;
        ctx.save();
        // Flame Pillar
        ctx.fillStyle = `rgba(255, 69, 58, ${0.5 * (1 - p)})`;
        ctx.fillRect(player.x - 54 * (1 - p * 0.3), player.y - 110, 108 * (1 - p * 0.3), 110);
        ctx.fillStyle = `rgba(255, 214, 10, ${0.8 * (1 - p)})`;
        ctx.fillRect(player.x - 18, player.y - 110, 36, 110);

        // Giant Crimson Spirit Sword slamming down
        const swordY = player.y - 130 + Math.min(1, p * 2.2) * 110;
        ctx.fillStyle = '#1a1c2c';
        ctx.fillRect(player.x - 7, swordY - 52, 14, 52);
        ctx.fillStyle = '#ff4d4f';
        ctx.fillRect(player.x - 5, swordY - 50, 10, 48);
        ctx.fillStyle = '#ffd43b';
        ctx.fillRect(player.x - 14, swordY - 52, 28, 6);
        ctx.restore();
      }

      // D: Hero Shout Multi-Ring Golden Shockwave
      if (player.shoutTimer > 0) {
        const p = 1 - player.shoutTimer / 20;
        ctx.save();
        for (let r = 0; r < 2; r++) {
          const rp = Math.max(0, p - r * 0.18);
          ctx.strokeStyle = r === 0 ? `rgba(255, 212, 59, ${1 - rp})` : `rgba(255, 146, 43, ${1 - rp})`;
          ctx.lineWidth = 4 - r;
          ctx.beginPath();
          ctx.arc(player.x, player.y - 16, 14 + rp * 130, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Hero 5th Job Combo Deathfault (Refined 3-stage MapleStory VFX)
      if (player.deathfaultTimer > 0) {
        const prog = 1 - player.deathfaultTimer / 28; // 0 -> 1
        ctx.save();

        // 1. Dramatic dark void backdrop + subtle crimson vignette
        const darkAlpha = prog < 0.25 ? (prog / 0.25) * 0.78 : 0.78 * (1 - (prog - 0.25) / 0.75);
        ctx.fillStyle = `rgba(8, 2, 14, ${Math.max(0, darkAlpha)})`;
        ctx.fillRect(camX, 0, VIEW_W, H);

        // 2. Hero Crimson Aura burst around player during windup
        if (prog < 0.45) {
          const auraR = 16 + prog * 90;
          const auraGrad = ctx.createRadialGradient(
            player.x,
            player.y - 14,
            2,
            player.x,
            player.y - 14,
            auraR
          );
          auraGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          auraGrad.addColorStop(0.35, 'rgba(255, 45, 85, 0.75)');
          auraGrad.addColorStop(1, 'rgba(120, 0, 30, 0)');
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(player.x, player.y - 14, auraR, 0, Math.PI * 2);
          ctx.fill();
        }

        // 3. Space-splitting Diagonal Slash (tapered razor-sharp polygon!)
        if (prog >= 0.12) {
          const slashProg = Math.min(1, (prog - 0.12) / 0.88);
          const fade = 1 - slashProg * slashProg;
          const x1 = camX - 24;
          const y1 = H + 18;
          const x2 = camX + VIEW_W + 24;
          const y2 = -18;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;

          // Perpendicular unit vector for tapered width
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy);
          const nx = -dy / len;
          const ny = dx / len;

          const drawTaperedBeam = (halfWidth: number, color: string) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(mx + nx * halfWidth, my + ny * halfWidth, x2, y2);
            ctx.quadraticCurveTo(mx - nx * halfWidth, my - ny * halfWidth, x1, y1);
            ctx.closePath();
            ctx.fill();
          };

          // Dark void tear gap (makes screen look physically sliced apart!)
          drawTaperedBeam(26 * fade, `rgba(0, 0, 0, ${0.9 * fade})`);
          // Outer crimson/violet glow
          drawTaperedBeam(19 * fade, `rgba(224, 49, 49, ${0.85 * fade})`);
          // Inner fiery orange-red
          drawTaperedBeam(10 * fade, `rgba(255, 107, 107, ${0.95 * fade})`);
          // Razor white-hot core
          drawTaperedBeam(4.5 * fade, `rgba(255, 255, 255, ${fade})`);

          // Secondary cross-slashes & jagged dimensional cracks
          ctx.strokeStyle = `rgba(255, 135, 135, ${0.85 * fade})`;
          ctx.lineWidth = 1.5;
          const crackAnchors = [0.22, 0.38, 0.52, 0.68, 0.82];
          for (let k = 0; k < crackAnchors.length; k++) {
            const t = crackAnchors[k];
            const ax = x1 + dx * t;
            const ay = y1 + dy * t;
            const dirSign = k % 2 === 0 ? 1 : -1;
            const reach = (24 + (k % 3) * 14) * fade;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax + nx * reach * 0.5 * dirSign + 8, ay + ny * reach * 0.5 * dirSign - 6);
            ctx.lineTo(ax + nx * reach * dirSign - 6, ay + ny * reach * dirSign + 8);
            ctx.stroke();
          }

          // Floating crimson ember shards along the tear
          ctx.fillStyle = `rgba(255, 212, 59, ${fade})`;
          for (let s = 0; s < 10; s++) {
            const t = 0.1 + s * 0.085;
            const sx = x1 + dx * t + Math.sin(s * 7 + prog * 12) * 18;
            const sy = y1 + dy * t + Math.cos(s * 5 + prog * 10) * 18;
            ctx.fillRect(Math.round(sx), Math.round(sy), 3, 3);
          }
        }

        ctx.restore();
      }

      // Level Up Banner
      if (levelUpBannerRef.current > 0) {
        levelUpBannerRef.current -= dt;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 212, 59, 0.2)';
        ctx.fillRect(player.x - 18, 0, 36, GROUND_Y);
        ctx.font = 'bold 16px "Gothic A1", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000';
        ctx.fillText(
          `LEVEL UP! Lv.${pState.level}`,
          Math.round(player.x) + 2,
          Math.round(player.y - 42) + 2
        );
        ctx.fillStyle = '#ffd43b';
        ctx.fillText(
          `LEVEL UP! Lv.${pState.level}`,
          Math.round(player.x),
          Math.round(player.y - 42)
        );
        ctx.restore();
      }

      // MapleStory Damage Skin Numbers
      ctx.textAlign = 'center';
      for (const d of dmgNums) {
        if (d.delay > 0) continue;
        const alpha = Math.min(1, d.life / 12);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = d.isSkill
          ? 'bold 16px "Gothic A1", sans-serif'
          : d.isCrit
            ? 'bold 14px "Gothic A1", sans-serif'
            : 'bold 12px "Gothic A1", sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#1a0f00';
        ctx.strokeText(d.text, Math.round(d.x), Math.round(d.y));
        ctx.fillStyle = d.isSkill ? '#ff4d4f' : d.isCrit ? '#ff6b6b' : '#ffb703';
        ctx.fillText(d.text, Math.round(d.x), Math.round(d.y));
        ctx.restore();
      }

      // Floating Texts
      ctx.font = 'bold 11px "Gothic A1", sans-serif';
      ctx.textAlign = 'center';
      for (const f of floats) {
        ctx.fillStyle = '#000000';
        ctx.fillText(f.text, Math.round(f.x) + 1, Math.round(f.y) + 1);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, Math.round(f.x), Math.round(f.y));
      }

      ctx.restore();

      // ====================
      // MINIMAP (Top-Right)
      // ====================
      const mmW = 86;
      const mmH = 26;
      const mmX = VIEW_W - mmW - 6;
      const mmY = 6;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      rr(ctx, mmX, mmY, mmW, mmH, 7);
      ctx.fill();

      // Minimap dots
      for (const mob of mobsRef.current) {
        ctx.fillStyle = '#ff4d4f';
        ctx.fillRect(
          mmX + Math.round((mob.x / WORLD_W) * (mmW - 4)) + 1,
          mmY + Math.round((mob.y / H) * (mmH - 4)) + 1,
          2,
          2
        );
      }
      for (const l of loots) {
        ctx.fillStyle = '#69db7c';
        ctx.fillRect(
          mmX + Math.round((l.x / WORLD_W) * (mmW - 4)) + 1,
          mmY + Math.round((l.y / H) * (mmH - 4)) + 1,
          2,
          2
        );
      }
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(
        mmX + Math.round((player.x / WORLD_W) * (mmW - 4)) + 1,
        mmY + Math.round((player.y / H) * (mmH - 4)),
        3,
        3
      );

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [inputRef]);

  return (
    <canvas
      ref={canvasRef}
      width={VIEW_W * RES}
      height={H * RES}
      className="maple-canvas"
      onPointerDown={() => {
        inputRef.current.attackPressed = true;
      }}
    />
  );
};
