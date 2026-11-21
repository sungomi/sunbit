import React from 'react';
import type { MonsterSpriteId } from '../types/game';

// 화면(DOM)에 쓰는 작은 아이콘. 캔버스와 같은 그림이에요 (도트 없음).

interface MonsterSpriteProps {
  id: MonsterSpriteId;
  size?: number;
  className?: string;
}

// 🍯 꿀 아이콘 (예전 이름 그대로 두어서 다른 화면 코드를 안 고쳐도 돼요)
export const PixelMesoCoin: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <span style={{ fontSize: size * 0.9, lineHeight: 1, display: 'inline-block', verticalAlign: 'middle' }} aria-hidden>
    🍯
  </span>
);

const EMOJI: Record<MonsterSpriteId, string> = {
  mushroom: '🐜',
  slime: '🐀',
  pig: '🦊',
  golem: '🐺',
  chronos: '🐋',
  zakum: '🐂',
  malaybear: '🐻',
};

export const PixelMonsterSprite: React.FC<MonsterSpriteProps> = ({ id, size = 112, className = '' }) => {
  if (id === 'malaybear') {
    return (
      <img
        src="../bear.jpg"
        alt="말레이곰"
        className={className}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 0 3px #f2b300' }}
      />
    );
  }
  return (
    <span className={className} style={{ fontSize: size * 0.82, lineHeight: 1, display: 'inline-block' }} aria-hidden>
      {EMOJI[id] ?? '🐜'}
    </span>
  );
};
