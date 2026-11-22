import React, { useEffect, useRef, useState } from 'react';
import {
  computePlayerStats,
  DAILY_QUESTS,
  dojoQuest,
  EQUIP_ITEMS,
  formatNumber,
  getExpForLevel,
  getMaxHp,
  getMaxMp,
} from '../data/gameData';
import { sfx } from '../services/sound';
import type { CosmeticConfig, DojoRun, GameState, HeroSkillKey } from '../types/game';
import { EquipModal } from './EquipModal';
import { MapleCanvas, type MapleInputState } from './MapleCanvas';
import { PixelMesoCoin, PixelMonsterSprite } from './PixelSprites';

interface GameTabProps {
  state: GameState;
  now: number;
  onKillReward: (kills: number, meso: number, exp: number) => void;
  onCollectLoot: (lootId: string) => void;
  onHitFever: (gain: number) => void;
  onConsumeSkill: (key: HeroSkillKey, mpCost: number, cdMs: number) => void;
  onUsePotion: (type: 'hp' | 'mp') => void;
  onPlayerDamaged: (dmg: number) => void;
  onSelectQuest: (questId: string) => void;
  onClaimQuest: (questId: string) => void;
  onNextDay: () => void;
  onToggleSound: () => void;
  onBuyEquip: (equipId: string) => void;
  onWearEquip: (equipId: string) => void;
  onStarforce: (equipId: string) => void;
  onUpdateCosmetic: (cosmetic: CosmeticConfig) => void;
  dojo: DojoRun | null;
  onDojoQuit: () => void;
}

export const GameTab: React.FC<GameTabProps> = ({
  state,
  now,
  onKillReward,
  onCollectLoot,
  onHitFever,
  onConsumeSkill,
  onUsePotion,
  onPlayerDamaged,
  onSelectQuest,
  onClaimQuest,
  onNextDay,
  onToggleSound,
  onBuyEquip,
  onWearEquip,
  onStarforce,
  onUpdateCosmetic,
  dojo,
  onDojoQuit,
}) => {
  const [showEquip, setShowEquip] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [auto, setAutoRaw] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gom_auto') === '1';
    } catch {
      return false;
    }
  });
  const setAuto = (v: boolean) => {
    setAutoRaw(v);
    try {
      localStorage.setItem('gom_auto', v ? '1' : '0');
    } catch {
      /* 저장 못 해도 괜찮아요 */
    }
  };
  const potAtRef = useRef(0);

  const haptic = (ms = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  };

  // 조이스틱: 가운데에서 끈 만큼 이동 (좌우), 위아래는 사다리
  const moveStick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const max = r.width * 0.32;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    setKnob({ x: dx, y: dy });
    inputRef.current.left = dx < -max * 0.3;
    inputRef.current.right = dx > max * 0.3;
    inputRef.current.up = dy < -max * 0.55;
    inputRef.current.down = dy > max * 0.55;
  };
  const resetStick = () => {
    inputRef.current.left = false;
    inputRef.current.right = false;
    inputRef.current.up = false;
    inputRef.current.down = false;
    setKnob({ x: 0, y: 0 });
  };

  const inputRef = useRef<MapleInputState>({
    left: false,
    right: false,
    up: false,
    down: false,
    jumpPressed: false,
    attackPressed: false,
    skillWPressed: false,
    skillSPressed: false,
    skillEPressed: false,
    skillDPressed: false,
    potHpPressed: false,
    potMpPressed: false,
  });

  useEffect(() => {
    inputRef.current.auto = auto;
  }, [auto]);
  useEffect(() => {
    if (!auto) return;
    const t = Date.now();
    if (t - potAtRef.current < 1500) return;
    if (state.hp / getMaxHp(state.level) < 0.35 && state.hpPotions > 0) {
      potAtRef.current = t;
      inputRef.current.potHpPressed = true;
    } else if (state.mp / getMaxMp(state.level) < 0.2 && state.mpPotions > 0) {
      potAtRef.current = t;
      inputRef.current.potMpPressed = true;
    }
  }, [auto, state.hp, state.mp, state.level, state.hpPotions, state.mpPotions]);

  const activeQuest = dojo
    ? dojoQuest(dojo.floor)
    : DAILY_QUESTS.find((q) => q.id === state.activeQuestId) ?? DAILY_QUESTS[0];
  const dojoLeft = dojo ? Math.max(0, Math.ceil((dojo.endsAt - now) / 1000)) : 0;
  const stats = computePlayerStats(
    state.inventory,
    state.level,
    state.equipped,
    state.equipStars
  );
  const isFever = state.feverActiveUntil > now;
  const feverRemaining = Math.max(0, Math.ceil((state.feverActiveUntil - now) / 1000));
  const hasMagnetPet = (state.inventory['magnet_pet'] ?? 0) > 0;
  const completedCount = DAILY_QUESTS.filter((q) => state.quests[q.id]?.claimed).length;

  const maxHp = getMaxHp(state.level);
  const maxMp = getMaxMp(state.level);
  const hpPct = Math.max(0, Math.min(100, (state.hp / maxHp) * 100));
  const mpPct = Math.max(0, Math.min(100, (state.mp / maxMp) * 100));
  const expNeeded = getExpForLevel(state.level);
  const expPct = Math.min(100, (state.exp / expNeeded) * 100);

  const cdSec = (key: HeroSkillKey) =>
    Math.max(0, Math.ceil(((state.skillCooldowns?.[key] ?? 0) - now) / 1000));

  const hatColor = EQUIP_ITEMS.find((e) => e.id === state.equipped.hat)?.color ?? '#e03131';
  const armorColor = EQUIP_ITEMS.find((e) => e.id === state.equipped.armor)?.color ?? '#339af0';
  const weaponColor = EQUIP_ITEMS.find((e) => e.id === state.equipped.weapon)?.color ?? '#dee2e6';

  // MapleStory Keybindings (Arrow keys, Space=Jump, A/Ctrl=Default Attack, W/S/E/D=Skills, X/C=Potions)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        inputRef.current.left = true;
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        inputRef.current.right = true;
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        inputRef.current.up = true;
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        inputRef.current.down = true;
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) inputRef.current.jumpPressed = true;
      } else if (e.code === 'KeyA' || e.code === 'ControlLeft' || e.code === 'ControlRight') {
        e.preventDefault();
        if (!e.repeat) inputRef.current.attackPressed = true;
      } else if (e.code === 'KeyW') {
        e.preventDefault();
        if (!e.repeat) inputRef.current.skillWPressed = true;
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        if (!e.repeat) inputRef.current.skillSPressed = true;
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        if (!e.repeat) inputRef.current.skillEPressed = true;
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        if (!e.repeat) inputRef.current.skillDPressed = true;
      } else if (e.code === 'KeyQ') {
        e.preventDefault();
        if (!e.repeat) setAutoRaw((v) => {
          try {
            localStorage.setItem('gom_auto', v ? '0' : '1');
          } catch {
            /* 무시 */
          }
          return !v;
        });
      } else if (e.code === 'KeyX') {
        e.preventDefault();
        if (!e.repeat) inputRef.current.potHpPressed = true;
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        if (!e.repeat) inputRef.current.potMpPressed = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') {
        inputRef.current.left = false;
      } else if (e.code === 'ArrowRight') {
        inputRef.current.right = false;
      } else if (e.code === 'ArrowUp') {
        inputRef.current.up = false;
      } else if (e.code === 'ArrowDown') {
        inputRef.current.down = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const cdW = cdSec('w');
  const cdS = cdSec('s');
  const cdE = cdSec('e');
  const cdD = cdSec('d');

  return (
    <div className="game-shell">
      {/* Top Pixel HUD */}
      <div className="game-hud">
        <div className="hud-left">
          <div className="hud-meso-pill">
            <span className="lv-badge">Lv.{state.level}</span>
            <PixelMesoCoin size={15} />
            <span>{formatNumber(state.meso)}</span>
          </div>
          <div className="hud-sub-stats">
            ⚔️ {stats.atk} · 💥 {Math.round(stats.critRate * 100)}% · 🪙 x
            {(stats.mesoMultiplier * (isFever ? 2 : 1)).toFixed(1)}
          </div>
        </div>
        <div className="hud-right">
          <button
            className="pixel-btn pixel-btn-sm pixel-btn-gold"
            onClick={() => {
              sfx.click();
              setShowEquip(true);
            }}
          >
            🎀 장비/코디
          </button>
          <button
            className="pixel-btn pixel-btn-sm"
            onClick={onToggleSound}
            title="효과음 토글"
          >
            {state.soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* HP & MP Bars */}
      <div className="dual-gauge-row">
        <div className="hp-bar-wrap">
          <div className="gauge-label hp-label">
            HP {formatNumber(state.hp)} / {formatNumber(maxHp)}
          </div>
          <div className="pixel-progress-track pixel-progress-sm">
            <div className="pixel-progress-fill fill-red" style={{ width: `${hpPct}%` }} />
          </div>
        </div>

        <div className="mp-bar-wrap">
          <div className="gauge-label mp-label">
            MP {formatNumber(state.mp)} / {formatNumber(maxMp)}
          </div>
          <div className="pixel-progress-track pixel-progress-sm">
            <div className="pixel-progress-fill fill-mp" style={{ width: `${mpPct}%` }} />
          </div>
        </div>
      </div>

      {/* Maple EXP Bar + Fever Bar */}
      <div className="dual-gauge-row">
        <div className="exp-bar-wrap">
          <div className="gauge-label">
            EXP {formatNumber(state.exp)} / {formatNumber(expNeeded)} ({expPct.toFixed(1)}%)
          </div>
          <div className="pixel-progress-track pixel-progress-sm">
            <div className="pixel-progress-fill fill-exp" style={{ width: `${expPct}%` }} />
          </div>
        </div>

        <div className={`fever-bar-wrap ${isFever ? 'fever-active' : ''}`}>
          <div className="gauge-label">
            {isFever ? `🔥 피버 ${feverRemaining}s` : `⚡ 피버 ${Math.floor(state.fever)}%`}
          </div>
          <div className="pixel-progress-track pixel-progress-sm">
            <div
              className={`pixel-progress-fill ${isFever ? 'fill-fever' : 'fill-orange'}`}
              style={{ width: `${isFever ? 100 : Math.min(100, state.fever)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Real-time 2D MapleStory Hunting Ground */}
      <div className={`maple-stage-wrap ${isFever ? 'stage-fever' : ''}`}>
        {dojo ? (
          <div className="arena-region-tag dojo-tag">
            🗼 {dojo.floor}층 · {Math.min(dojo.kills, activeQuest.targetKills)}/{activeQuest.targetKills} · ⏱{' '}
            {Math.floor(dojoLeft / 60)}:{String(dojoLeft % 60).padStart(2, '0')}
            <button className="pixel-btn pixel-btn-sm pixel-btn-red dojo-quit" onClick={onDojoQuit}>
              그만
            </button>
          </div>
        ) : (
          <div className="arena-region-tag">
            📍 {activeQuest.region} · {activeQuest.monsterName}
          </div>
        )}
        <MapleCanvas
          quest={activeQuest}
          level={state.level}
          mp={state.mp}
          atk={stats.atk}
          critRate={stats.critRate}
          mesoMultiplier={stats.mesoMultiplier}
          isFever={isFever}
          hasMagnetPet={hasMagnetPet}
          autoDps={stats.autoDps}
          hatColor={hatColor}
          armorColor={armorColor}
          weaponColor={weaponColor}
          cosmetic={state.cosmetic}
          skillCooldowns={state.skillCooldowns ?? { w: 0, s: 0, e: 0, d: 0 }}
          inputRef={inputRef}
          onKillReward={onKillReward}
          onCollectLoot={onCollectLoot}
          onHitFever={onHitFever}
          onConsumeSkill={onConsumeSkill}
          onUsePotion={onUsePotion}
          onPlayerDamaged={onPlayerDamaged}
        />

      </div>

      {/* 조작: 왼쪽 조이스틱 · 오른쪽 공격·점프·스킬·물약 · 자동 사냥 */}
      <div className="pad">
        <div
          className="pad-stick"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            haptic(6);
            moveStick(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons > 0 || e.pointerType === 'touch') moveStick(e);
          }}
          onPointerUp={resetStick}
          onPointerCancel={resetStick}
        >
          <div className="pad-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
          <span className="pad-hint pad-hint-up">▲</span>
          <span className="pad-hint pad-hint-down">▼</span>
        </div>

        <div className="pad-right">
          <div className="pad-skills">
            {(
              [
                ['w', '✖️', '할퀴기', cdW],
                ['e', '🌋', '불곰혼', cdE],
                ['s', '⚔️', '내려찍기', cdS],
                ['d', '💥', '포효', cdD],
              ] as const
            ).map(([k, ic, nm, cd]) => (
              <button
                key={k}
                className={`pad-skill ${cd > 0 ? 'cd' : ''}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  haptic(12);
                  if (k === 'w') inputRef.current.skillWPressed = true;
                  if (k === 'e') inputRef.current.skillEPressed = true;
                  if (k === 's') inputRef.current.skillSPressed = true;
                  if (k === 'd') inputRef.current.skillDPressed = true;
                }}
              >
                <span>{ic}</span>
                <small>{cd > 0 ? `${cd}s` : nm}</small>
              </button>
            ))}
          </div>
          <div className="pad-main">
            <button
              className="pad-jump"
              onPointerDown={(e) => {
                e.preventDefault();
                haptic(8);
                inputRef.current.jumpPressed = true;
              }}
            >
              점프
            </button>
            <button
              className="pad-attack"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                haptic(10);
                inputRef.current.attackPressed = true;
                inputRef.current.attackHeld = true;
              }}
              onPointerUp={() => {
                inputRef.current.attackHeld = false;
              }}
              onPointerCancel={() => {
                inputRef.current.attackHeld = false;
              }}
            >
              🐾
              <small>공격</small>
            </button>
          </div>
        </div>
      </div>

      <div className="pad-bar">
        <button
          className={`pad-auto ${auto ? 'on' : ''}`}
          onClick={() => {
            sfx.click();
            setAuto(!auto);
          }}
        >
          {auto ? '⏸ 자동 사냥 끄기' : '▶ 자동 사냥'}
        </button>
        <button
          className="pad-pot hp"
          onPointerDown={(e) => {
            e.preventDefault();
            inputRef.current.potHpPressed = true;
          }}
        >
          🧪 {state.hpPotions}
        </button>
        <button
          className="pad-pot mp"
          onPointerDown={(e) => {
            e.preventDefault();
            inputRef.current.potMpPressed = true;
          }}
        >
          💧 {state.mpPotions}
        </button>
      </div>

      <div className="controls-hint">
        ⌨️ PC: ←→ 이동 · ↑↓ 사다리 · Space 점프 · A 공격 · W/S/E/D 스킬 · X/C 물약 · Q 자동
      </div>

      {/* Daily Quests Section */}
      {dojo ? (
        <div className="pixel-card dojo-live-card">
          🗼 곰굴 탑 도전 중! 시간 안에 {activeQuest.targetKills}마리를 잡으면 다음 층. 100층에는 말레이곰이 있어요.
        </div>
      ) : (
      <div className="quest-section">
        <div className="quest-section-header">
          <span>
            📜 일일 퀘스트 ({completedCount}/{DAILY_QUESTS.length})
          </span>
          <button className="pixel-link-btn" onClick={onNextDay}>
            매일 0시 초기화
          </button>
        </div>

        <div className="quest-list">
          {DAILY_QUESTS.map((q) => {
            const prog = state.quests[q.id] ?? { kills: 0, claimed: false };
            const isSelected = state.activeQuestId === q.id;
            const isDone = prog.kills >= q.targetKills;
            const pct = Math.min(100, (prog.kills / q.targetKills) * 100);

            return (
              <div
                key={q.id}
                className={`pixel-card quest-card ${isSelected ? 'quest-selected' : ''} ${
                  prog.claimed ? 'quest-claimed' : ''
                }`}
                onClick={() => onSelectQuest(q.id)}
              >
                <div className="quest-card-left">
                  <PixelMonsterSprite id={q.spriteId} size={36} />
                  <div className="quest-info">
                    <div className="quest-title-row">
                      <span className="quest-region">[{q.region}]</span>
                      <span className="quest-name">{q.title}</span>
                    </div>
                    <div className="quest-reward-text">
                      +{formatNumber(q.mesoPerKill)}꿀 · +{q.expPerKill}EXP · 완료 +
                      {formatNumber(q.clearBonusMeso)}
                    </div>
                    <div className="quest-prog-row">
                      <div className="pixel-progress-track pixel-progress-sm">
                        <div
                          className={`pixel-progress-fill ${isDone ? 'fill-green' : 'fill-gold'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="quest-count">
                        {Math.min(prog.kills, q.targetKills)}/{q.targetKills}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="quest-card-right">
                  {prog.claimed ? (
                    <span className="claimed-badge">완료</span>
                  ) : isDone ? (
                    <button
                      className="pixel-btn pixel-btn-sm pixel-btn-green"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClaimQuest(q.id);
                      }}
                    >
                      보상!
                    </button>
                  ) : (
                    <span className="hunting-badge">{isSelected ? '사냥중' : '선택'}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {showEquip && (
        <EquipModal
          state={state}
          onClose={() => {
            sfx.click();
            setShowEquip(false);
          }}
          onBuyEquip={onBuyEquip}
          onWearEquip={onWearEquip}
          onStarforce={onStarforce}
          onUpdateCosmetic={onUpdateCosmetic}
        />
      )}
    </div>
  );
};
