// KOTA SENJA — the HUD: health, money, wanted stars, objective,
// speed, and a live top-down minimap drawn on a 2D canvas.

import { cityHalfSpan } from './config.js';

export function initHud() {
  return {
    healthFill: document.getElementById('health-fill'),
    healthText: document.getElementById('health-text'),
    moneyText: document.getElementById('money-text'),
    starsEl: document.getElementById('wanted-stars'),
    objectiveTitle: document.getElementById('objective-title'),
    objectiveText: document.getElementById('objective-text'),
    speedText: document.getElementById('speed-text'),
    ammoText: document.getElementById('ammo-text'),
    messageEl: document.getElementById('hud-message'),
    minimap: document.getElementById('minimap'),
    messageTimer: null,
  };
}

export function showHudMessage(hud, text) {
  if (!hud.messageEl) return;
  hud.messageEl.textContent = text;
  hud.messageEl.style.opacity = '1';
  if (hud.messageTimer) clearTimeout(hud.messageTimer);
  hud.messageTimer = setTimeout(() => {
    hud.messageEl.style.opacity = '0';
  }, 3600);
}

export function updateHud(hud, game) {
  const player = game.player;
  if (hud.healthFill) hud.healthFill.style.width = `${Math.max(0, player.health)}%`;
  if (hud.healthText) hud.healthText.textContent = `${Math.ceil(Math.max(0, player.health))}`;
  if (hud.moneyText) hud.moneyText.textContent = `$${player.money}`;
  if (hud.starsEl) {
    let stars = '';
    for (let i = 0; i < 5; i += 1) {
      stars += i < game.wanted ? '★' : '☆';
    }
    hud.starsEl.textContent = stars;
    hud.starsEl.classList.toggle('hot', game.wanted > 0);
  }
  const step = game.missionStepText();
  if (hud.objectiveTitle) {
    hud.objectiveTitle.textContent = game.missions.active
      ? `Misi ${game.missions.index + 1} / 5`
      : 'Kota Senja — bebas';
  }
  if (hud.objectiveText) hud.objectiveText.textContent = step;
  if (hud.speedText) {
    const speed = player.inCar ? Math.abs(player.inCar.speed) * 3.6 : Math.abs(player.speed) * 3.6;
    hud.speedText.textContent = player.inCar ? `${Math.round(speed)} km/h` : '';
  }
  if (hud.ammoText) {
    hud.ammoText.textContent = player.hasPistol ? `Pistol ${player.ammo}` : '';
  }
  drawMinimap(hud, game);
}

export function drawMinimap(hud, game) {
  const canvas = hud.minimap;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const half = cityHalfSpan() + 30;
  const toMap = (x, z) => ({
    x: ((x + half) / (half * 2)) * size,
    y: ((z + half) / (half * 2)) * size,
  });
  ctx.fillStyle = 'rgba(12, 16, 28, 0.85)';
  ctx.fillRect(0, 0, size, size);
  // Streets.
  ctx.strokeStyle = 'rgba(220, 220, 220, 0.55)';
  ctx.lineWidth = 2;
  for (const line of game.city.streetCenterlines) {
    const a = toMap(line.axis === 'x' ? -half : line.at, line.axis === 'x' ? line.at : -half);
    const b = toMap(line.axis === 'x' ? half : line.at, line.axis === 'x' ? line.at : half);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Sea.
  ctx.fillStyle = 'rgba(30, 111, 143, 0.8)';
  const sea = toMap(176, -half);
  ctx.fillRect(sea.x, 0, size - sea.x, size);
  // Mission marker.
  if (game.missions.markerPos) {
    const m = toMap(game.missions.markerPos.x, game.missions.markerPos.z);
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(m.x, m.y - 6);
    ctx.lineTo(m.x + 5, m.y);
    ctx.lineTo(m.x, m.y + 6);
    ctx.lineTo(m.x - 5, m.y);
    ctx.closePath();
    ctx.fill();
  }
  // Cars and police.
  ctx.fillStyle = '#c8c8c8';
  for (const car of game.allCars) {
    const p = toMap(car.x, car.z);
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
  ctx.fillStyle = '#ff4444';
  for (const car of game.policeCars) {
    const p = toMap(car.x, car.z);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow, pointing along the player's heading.
  const playerPos = game.player.inCar
    ? { x: game.player.inCar.x, z: game.player.inCar.z, heading: game.player.inCar.heading }
    : { x: game.player.x, z: game.player.z, heading: game.player.heading };
  const pp = toMap(playerPos.x, playerPos.z);
  ctx.save();
  ctx.translate(pp.x, pp.y);
  ctx.rotate(playerPos.heading + Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(4.5, 5);
  ctx.lineTo(-4.5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---- overlays and the mission list on the title screen ----

export function showOverlay(id) {
  const overlays = document.querySelectorAll('.overlay');
  for (const overlay of overlays) overlay.classList.remove('visible');
  if (!id) return;
  const target = document.getElementById(id);
  if (target) target.classList.add('visible');
}

export function setWinStats(game) {
  const el = document.getElementById('win-stats');
  if (!el) return;
  el.textContent = `Uang: $${game.player.money} · Misi: 5/5 · Bintang tertinggi: ${game.save.bestWanted}★`;
}

export function setMissionCompleteText(def) {
  const el = document.getElementById('mission-done-text');
  if (!el) return;
  el.textContent = `${def.title} selesai! Hadiah $${def.reward}.`;
}

export function renderMissionList(missionsCompleted) {
  const list = document.getElementById('mission-list');
  if (!list) return;
  list.innerHTML = '';
  const defs = [
    '1 — Kiriman Pertama',
    '2 — Tagihan',
    '3 — Lari Pelabuhan',
    '4 — Kabur',
    '5 — Raja Senja',
  ];
  defs.forEach((name, i) => {
    const item = document.createElement('div');
    item.className = 'mission-item' + (i < missionsCompleted ? ' done' : '');
    item.textContent = (i < missionsCompleted ? '✓ ' : '') + name;
    list.appendChild(item);
  });
}
