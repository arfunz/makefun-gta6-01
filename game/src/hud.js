// The HUD: health, money, mission, wanted stars, speed, the minimap and
// every overlay. The game writes state here; this file writes the DOM.
export function bindHud() {
  const byId = (id) => document.getElementById(id);
  return {
    healthLabel: byId('health-label'),
    healthFill: byId('health-fill'),
    money: byId('money'),
    missionTitle: byId('mission-title'),
    missionLine: byId('mission-line'),
    stars: byId('stars'),
    speed: byId('speed'),
    map: byId('minimap'),
    toast: byId('toast'),
    overlays: {
      title: byId('overlay-title'),
      missionDone: byId('overlay-mission-done'),
      win: byId('overlay-win'),
      busted: byId('overlay-busted'),
      wasted: byId('overlay-wasted'),
      pause: byId('overlay-pause'),
    },
    missionDoneText: byId('mission-done-text'),
    winStats: byId('win-stats'),
    bustedText: byId('busted-text'),
    wastedText: byId('wasted-text'),
    missionList: byId('mission-list'),
  };
}

export function updateHud(G) {
  const h = G.hud;
  const p = G.player;
  h.healthLabel.textContent = `KESEHATAN ${Math.ceil(p.health)}`;
  h.healthFill.style.width = `${Math.max(0, p.health)}%`;
  h.money.textContent = `$${G.money}`;
  const m = G.missions;
  const def = m.defs[m.current];
  h.missionTitle.textContent = `Misi ${m.current + 1} / 5`;
  const d = m.target ? Math.round(Math.hypot(m.target.x - p.x, m.target.z - p.z)) : 0;
  h.missionLine.textContent = `${def.objective} — ${d}m`;
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < G.wanted ? '★' : '☆';
  h.stars.textContent = stars;
  h.speed.textContent = `${Math.round(Math.abs(p.speed) * 3.6)} km/h`;
  drawMinimap(G);
}

// The minimap: a dark grid with the roads, the player arrow, the mission
// marker and the police dots.
function drawMinimap(G) {
  const h = G.hud;
  const cv = h.map;
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width;
  const H = cv.height;
  ctx.fillStyle = '#0d1420';
  ctx.fillRect(0, 0, W, H);
  const minX = -140;
  const maxX = 210;
  const minZ = -140;
  const maxZ = 230;
  const sx = (x) => ((x - minX) / (maxX - minX)) * W;
  const sz = (z) => ((z - minZ) / (maxZ - minZ)) * H;
  ctx.strokeStyle = '#3a3f4a';
  ctx.lineWidth = 4;
  const roads = [-109, -69, -29, 11, 51, 91, 131, 171];
  for (const r of roads) {
    ctx.beginPath();
    ctx.moveTo(sx(r), 0);
    ctx.lineTo(sx(r), H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, sz(r));
    ctx.lineTo(W, sz(r));
    ctx.stroke();
  }
  const m = G.missions;
  if (m.target) {
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath();
    ctx.arc(sx(m.target.x), sz(m.target.z), 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#3b7ad4';
  for (const c of G.policeCars) {
    ctx.beginPath();
    ctx.arc(sx(c.x), sz(c.z), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = G.player;
  ctx.save();
  ctx.translate(sx(p.x), sz(p.z));
  ctx.rotate(Math.PI - p.heading);
  ctx.fillStyle = '#37d67a';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function showOverlay(h, name) {
  hideOverlays(h);
  const el = h.overlays[name];
  if (el) el.classList.add('show');
}

export function hideOverlays(h) {
  for (const key of Object.keys(h.overlays)) h.overlays[key].classList.remove('show');
}

export function showToast(h, text) {
  h.toast.textContent = text;
  h.toast.style.display = 'block';
  clearTimeout(h.toastTimer);
  h.toastTimer = setTimeout(() => { h.toast.style.display = 'none'; }, 2600);
}

export function setMissionDone(h, def) {
  h.missionDoneText.textContent = 'Misi selesai: ' + def.name + ' (+$' + def.reward + ')';
  showOverlay(h, 'mission-done');
  setTimeout(() => {
    if (!h.overlays.win.classList.contains('show')) hideOverlays(h);
  }, 1800);
}

export function setWinStats(h, G) {
  h.winStats.textContent = 'Utang lunas — $' + G.money + ' · Misi: ' + G.missions.completedCount + '/' + G.missions.defs.length + ' · Wanted tertinggi: ' + G.maxWanted + ' bintang';
}

export function renderMissionList(h, G) {
  h.missionList.innerHTML = '';
  G.missions.defs.forEach((m, i) => {
    const done = i < G.missions.completedCount;
    const div = document.createElement('div');
    div.textContent = (done ? '✓ ' : (i + 1) + '. ') + m.name + ' — $' + m.reward;
    h.missionList.appendChild(div);
  });
}
