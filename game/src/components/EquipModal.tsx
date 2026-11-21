import React, { useState } from 'react';
import {
  EQUIP_ITEMS,
  EQUIP_SLOT_LABELS,
  EYE_STYLES,
  formatNumber,
  getStarforceCost,
  MAX_STARS,
  getStarforceSuccessRate,
  HAIR_COLORS,
  HAIR_STYLES,
} from '../data/gameData';
import { sfx } from '../services/sound';
import type { CosmeticConfig, EquipSlot, GameState } from '../types/game';

interface EquipModalProps {
  state: GameState;
  onClose: () => void;
  onBuyEquip: (equipId: string) => void;
  onWearEquip: (equipId: string) => void;
  onStarforce: (equipId: string) => void;
  onUpdateCosmetic: (cosmetic: CosmeticConfig) => void;
}

const SLOTS: EquipSlot[] = ['hat', 'armor', 'weapon', 'gloves', 'shoes', 'cape'];

export const EquipModal: React.FC<EquipModalProps> = ({
  state,
  onClose,
  onBuyEquip,
  onWearEquip,
  onStarforce,
  onUpdateCosmetic,
}) => {
  const [modalTab, setModalTab] = useState<'equip' | 'cosmetic'>('equip');
  const [selectedSlot, setSelectedSlot] = useState<EquipSlot>('weapon');

  const equippedId = state.equipped[selectedSlot];
  const equippedItem = EQUIP_ITEMS.find((e) => e.id === equippedId);
  const currentStars = state.equipStars[equippedId] ?? 0;
  const starCost = getStarforceCost(currentStars);
  const starRate = Math.round(getStarforceSuccessRate(currentStars) * 100);

  const slotItems = EQUIP_ITEMS.filter((e) => e.slot === selectedSlot);

  return (
    <div className="pixel-modal-backdrop" onClick={onClose}>
      <div className="pixel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>⚔️ 캐릭터 창 (Lv.{state.level})</span>
          <button className="pixel-btn pixel-btn-sm pixel-btn-red" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="shop-filter-tabs">
          <button
            className={`pixel-btn pixel-btn-sm ${modalTab === 'equip' ? 'pixel-btn-gold' : ''}`}
            onClick={() => {
              sfx.click();
              setModalTab('equip');
            }}
          >
            ⚔️ 장비 / 별강화
          </button>
          <button
            className={`pixel-btn pixel-btn-sm ${modalTab === 'cosmetic' ? 'pixel-btn-gold' : ''}`}
            onClick={() => {
              sfx.click();
              setModalTab('cosmetic');
            }}
          >
            🎀 코디 / 꾸미기
          </button>
        </div>

        {modalTab === 'cosmetic' ? (
          <div className="cosmetic-panel">
            <div className="equip-list-title">💇 헤어스타일</div>
            <div className="cosmetic-grid">
              {HAIR_STYLES.map((h) => (
                <button
                  key={h.id}
                  className={`pixel-btn pixel-btn-sm ${
                    state.cosmetic.hairStyle === h.id ? 'pixel-btn-gold' : ''
                  }`}
                  onClick={() => {
                    sfx.click();
                    onUpdateCosmetic({ ...state.cosmetic, hairStyle: h.id });
                  }}
                >
                  {h.name}
                </button>
              ))}
            </div>

            <div className="equip-list-title">🎨 헤어 염색</div>
            <div className="color-swatch-row">
              {HAIR_COLORS.map((c) => (
                <button
                  key={c.hex}
                  className={`color-swatch-btn ${
                    state.cosmetic.hairColor === c.hex ? 'active' : ''
                  }`}
                  style={{ background: c.hex }}
                  title={c.name}
                  onClick={() => {
                    sfx.click();
                    onUpdateCosmetic({ ...state.cosmetic, hairColor: c.hex });
                  }}
                />
              ))}
            </div>

            <div className="equip-list-title">👀 성형 / 표정</div>
            <div className="cosmetic-grid">
              {EYE_STYLES.map((eye) => (
                <button
                  key={eye.id}
                  className={`pixel-btn pixel-btn-sm ${
                    state.cosmetic.eyeStyle === eye.id ? 'pixel-btn-gold' : ''
                  }`}
                  onClick={() => {
                    sfx.click();
                    onUpdateCosmetic({ ...state.cosmetic, eyeStyle: eye.id });
                  }}
                >
                  {eye.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>

        {/* 6-Slot 2005 Classic Maple Equipment Grid */}
        <div className="equip-slots-row equip-slots-6">
          {SLOTS.map((slot) => {
            const eqId = state.equipped[slot];
            const eq = EQUIP_ITEMS.find((e) => e.id === eqId);
            const stars = state.equipStars[eqId] ?? 0;
            return (
              <button
                key={slot}
                className={`equip-slot-box ${selectedSlot === slot ? 'active' : ''}`}
                onClick={() => {
                  sfx.click();
                  setSelectedSlot(slot);
                }}
              >
                <span className="slot-label">{EQUIP_SLOT_LABELS[slot]}</span>
                <span className="slot-icon">{eq?.icon ?? '❓'}</span>
                <span className="slot-stars">{stars > 0 ? `+${stars}작` : '노작'}</span>
              </button>
            );
          })}
        </div>

        {/* 2005 MapleStory Scroll Upgrade Box */}
        {equippedItem && (
          <div className="pixel-card starforce-box">
            <div className="starforce-top">
              <div>
                <div className="sf-name">
                  {equippedItem.icon} {equippedItem.name}{' '}
                  <span className="sf-star-badge">+{currentStars}작 / {MAX_STARS}</span>
                </div>
                <div className="sf-stats">
                  공격력 +{Math.round(equippedItem.atk * (1 + currentStars * 0.15))} · 크리 +
                  {((equippedItem.critRate + currentStars * 0.004) * 100).toFixed(1)}% · 메소 +
                  {Math.round(equippedItem.mesoBonus * 100)}%
                </div>
              </div>

              <button
                className={`pixel-btn pixel-btn-sm ${
                  currentStars >= MAX_STARS
                    ? 'pixel-btn-disabled'
                    : state.meso >= starCost
                      ? 'pixel-btn-gold'
                      : ''
                }`}
                disabled={currentStars >= MAX_STARS || state.meso < starCost}
                onClick={() => onStarforce(equippedItem.id)}
              >
                {currentStars >= MAX_STARS ? (
                  '지존작'
                ) : (
                  <>
                    <span>📜 주문서 ({starRate}%)</span>
                    <small>{formatNumber(starCost)} 메소</small>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Available Gear in Selected Slot */}
        <div className="equip-list-title">
          2005 메이플 {EQUIP_SLOT_LABELS[selectedSlot]} 도감 ({slotItems.length}종)
        </div>
        <div className="equip-item-list">
          {slotItems.map((eq) => {
            const isOwned = state.ownedEquips.includes(eq.id);
            const isEquipped = state.equipped[selectedSlot] === eq.id;
            const lvMet = state.level >= eq.reqLevel;
            const canBuy = !isOwned && lvMet && state.meso >= eq.priceMeso;
            const eqStars = state.equipStars[eq.id] ?? 0;

            return (
              <div
                key={eq.id}
                className={`pixel-card equip-list-card ${isEquipped ? 'equipped' : ''}`}
              >
                <div className="equip-list-left">
                  <div className="equip-icon-lg">{eq.icon}</div>
                  <div>
                    <div className="equip-name">
                      {eq.name} {eqStars > 0 && <span className="gold-text">★{eqStars}</span>}
                    </div>
                    <div className="equip-req">
                      요구 Lv.{eq.reqLevel} · 공+{eq.atk} · 크리+{Math.round(eq.critRate * 100)}% ·
                      꿀+{Math.round(eq.mesoBonus * 100)}%
                    </div>
                  </div>
                </div>

                <div>
                  {isEquipped ? (
                    <span className="claimed-badge">장착중</span>
                  ) : isOwned ? (
                    <button
                      className="pixel-btn pixel-btn-sm pixel-btn-blue"
                      onClick={() => onWearEquip(eq.id)}
                    >
                      장착
                    </button>
                  ) : (
                    <button
                      className={`pixel-btn pixel-btn-sm ${
                        canBuy ? 'pixel-btn-gold' : 'pixel-btn-disabled'
                      }`}
                      disabled={!canBuy}
                      onClick={() => onBuyEquip(eq.id)}
                    >
                      {!lvMet ? `Lv.${eq.reqLevel}` : `${formatNumber(eq.priceMeso)}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
          </>
        )}
      </div>
    </div>
  );
};
