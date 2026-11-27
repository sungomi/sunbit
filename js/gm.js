'use strict';
/* ═════════ 실시간 시세 모드 (게임 배율·서킷·충격 비활성화, 1:1 현실 시세 반영) ═════════ */
const GM = { E: {}, lastE: 0, ready: true, loading: false, poll: 0, cache: {}, mc: {} };
const MIN = 60e3;
const SHOCK = { HOLD: 2, FADE: 30, GAP: 60e3, RISE: 3 / 60 };
const gmCls = () => null;
const gmMult = () => 1;
const cbBadge = () => 0;
const gmBadge = () => '';
const gmBadgeHTML = () => '';
const lastShock = () => 0;
const gmInit = () => {};
const gmTick = () => {};
const gmChartPts = (sym, pts) => pts;
const gmRange = (sym, t, span, p) => [p, p];
