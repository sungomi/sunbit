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
  const [padDir, setPadDir] = useState<'none' | 'left' | 'right' | 'up' | 'down'>('none');
  const wasUpRef = useRef(false);

  const haptic = (ms = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  };

  const handleSlidePad = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    inputRef.current.left = dx < -10;
    inputRef.current.right = dx > 10;
    inputRef.current.up = dy < -12;
    inputRef.current.down = dy > 14;

    // Edge-trigger Jump / Flash Jump when sliding into upper zone (supports diagonal up-left / up-right!)
    if (dy < -12 && !wasUpRef.current) {
      inputRef.current.jumpPressed = true;
      haptic(8);
    }
    wasUpRef.current = dy < -12;

    if (Math.hypot(dx, dy) < 10) {
      setPadDir('none');
    } else if (dy < -12 && Math.abs(dy) >= Math.abs(dx) * 0.7) {
      setPadDir('up');
    } else if (dy > 14 && Math.abs(dy) >= Math.abs(dx) * 0.7) {
      setPadDir('down');
    } else {
      setPadDir(dx < 0 ? 'left' : 'right');
    }
  };

  const resetSlidePad = () => {
    inputRef.current.left = false;
    inputRef.current.right = false;
    inputRef.current.up = false;
    inputRef.current.down = false;
    wasUpRef.current = false;
    setPadDir('none');
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

        {/* On-Screen MapleStory Quickslot Bar (Potions + Skills + Cooldowns) */}
        <div className="maple-quickslot-bar">
          <div
            className="quickslot-icon slot-pot-hp"
            onPointerDown={(e) => {
              e.stopPropagation();
              inputRef.current.potHpPressed = true;
            }}
            title="빨간 포션 (HP 회복)"
          >
            <span className="qs-key">X</span>
            <span className="qs-emoji">🧪</span>
            <span className="qs-name">{state.hpPotions}</span>
          </div>

          <div
            className="quickslot-icon slot-pot-mp"
            onPointerDown={(e) => {
              e.stopPropagation();
              inputRef.current.potMpPressed = true;
            }}
            title="파란 포션 (MP 회복)"
          >
            <span className="qs-key">C</span>
            <span className="qs-emoji">💧</span>
            <span className="qs-name">{state.mpPotions}</span>
          </div>

          <div
            className="quickslot-icon slot-raging"
            onPointerDown={(e) => {
              e.stopPropagation();
              inputRef.current.attackPressed = true;
            }}
            title="곰발 연타 (기본공격)"
          >
            <span className="qs-key">A</span>
            <span className="qs-emoji">🔥</span>
            <span className="qs-name">곰발</span>
          </div>

          <div
            className={`quickslot-icon slot-incising ${cdW > 0 ? 'on-cd' : ''}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              inputRef.current.skillWPressed = true;
            }}
            title="할퀴기 (MP 18)"
          >
            <span className="qs-key">W</span>
            <span className="qs-emoji">✖️</span>
            <span className="qs-name">할퀴기</span>
            {cdW > 0 && <div className="qs-cd-overlay">{cdW}s</div>}
          </div>

          <div
            className={`quickslot-icon slot-deathfault ${cdS > 0 ? 'on-cd' : ''}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              inputRef.current.skillSPressed = true;
            }}
            title="콤보 내려찍기 (MP 35)"
          >
            <span className="qs-key">S</span>
            <span className="qs-emoji">⚔️</span>
            <span className="qs-name">내려찍기</span>
            {cdS > 0 && <div className="qs-cd-overlay">{cdS}s</div>}
          </div>

          <div
            className={`quickslot-icon slot-burning ${cdE > 0 ? 'on-cd' : ''}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              inputRef.current.skillEPressed = true;
            }}
            title="버닝 소울 (MP 25)"
          >
            <span className="qs-key">E</span>
            <span className="qs-emoji">🌋</span>
            <span className="qs-name">불곰혼</span>
            {cdE > 0 && <div className="qs-cd-overlay">{cdE}s</div>}
          </div>

          <div
            className={`quickslot-icon slot-shout ${cdD > 0 ? 'on-cd' : ''}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              inputRef.current.skillDPressed = true;
            }}
            title="포효 (MP 15)"
          >
            <span className="qs-key">D</span>
            <span className="qs-emoji">💥</span>
            <span className="qs-name">포효</span>
            {cdD > 0 && <div className="qs-cd-overlay">{cdD}s</div>}
          </div>
        </div>
      </div>

      {/* Mobile + PC Action Pad (Slide D-Pad + Haptic Action Buttons) */}
      <div className="maple-controls-bar">
        <div
          className={`slide-dpad dir-${padDir}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            haptic(8);
            handleSlidePad(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons > 0 || e.pressure > 0) handleSlidePad(e);
          }}
          onPointerUp={resetSlidePad}
          onPointerCancel={resetSlidePad}
        >
          <span className="sd-up">▲</span>
          <span className="sd-left">◀</span>
          <span className="sd-center">●</span>
          <span className="sd-right">▶</span>
          <span className="sd-down">▼</span>
        </div>

        <div className="action-btn-group">
          <button
            className="pixel-btn pixel-btn-gold action-pad-btn"
            onPointerDown={() => {
              haptic(12);
              inputRef.current.attackPressed = true;
            }}
          >
            🔥 곰발(A)
          </button>
          <button
            className={`pixel-btn ${
              cdW > 0 ? 'pixel-btn-disabled' : 'pixel-btn-purple'
            } action-pad-btn`}
            disabled={cdW > 0}
            onPointerDown={() => {
              haptic(14);
              inputRef.current.skillWPressed = true;
            }}
          >
            {cdW > 0 ? `${cdW}s` : '✖️ 인사이징(W)'}
          </button>
          <button
            className={`pixel-btn ${
              cdS > 0 ? 'pixel-btn-disabled' : 'pixel-btn-red'
            } action-pad-btn`}
            disabled={cdS > 0}
            onPointerDown={() => {
              haptic(20);
              inputRef.current.skillSPressed = true;
            }}
          >
            {cdS > 0 ? `${cdS}s` : '⚔️ 내려찍기(S)'}
          </button>
        </div>
      </div>

      <div className="controls-hint">
        ⌨️ 이동: ←→ · 점프: Space · 기본: A · 스킬: W/S/E/D · 물약: X(HP)/C(MP)
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
