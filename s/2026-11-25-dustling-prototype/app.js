const ROUND_SIZE = 15;
const $ = (id) => document.getElementById(id);

const state = {
  photos: [],
  index: 0,
  history: [], // { photo, action: "sweep" | "keep" }
  bin: new Map(), // id -> photo, 尘筐
  restored: new Set(), // 结算时移出尘筐的照片 id
  roundsToday: 0,
  roundNo: 0,
};

const FALLBACKS = [
  ["#e8c79a", "#b57a4a"], ["#a9c3c9", "#5f7f8c"], ["#d7b4b0", "#8d5f66"],
  ["#c6d1a5", "#6e8252"], ["#e2d3b8", "#9c8463"], ["#b9b3d6", "#625b8c"],
];

function makeRound(roundNo) {
  const now = new Date();
  return Array.from({ length: ROUND_SIZE }, (_, i) => {
    const n = roundNo * ROUND_SIZE + i;
    const daysAgo = 40 + ((n * 137) % 2400);
    const date = new Date(now - daysAgo * 864e5);
    const isVideo = n % 6 === 4;
    const sizeMB = isVideo ? 18 + ((n * 7) % 60) : 1.2 + ((n * 13) % 70) / 10;
    return { id: `p${n}`, seed: `dustlight-${n}`, date, daysAgo, isVideo, sizeMB, fb: FALLBACKS[n % FALLBACKS.length] };
  });
}

function agoText(days) {
  if (days >= 365) return `${Math.floor(days / 365)} 年前`;
  if (days >= 30) return `${Math.floor(days / 30)} 个月前`;
  return `${days} 天前`;
}
const fmtDate = (d) => `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
const fmtMB = (mb) => (mb >= 10 ? Math.round(mb) : mb.toFixed(1)) + " MB";
const sum = (arr) => arr.reduce((s, p) => s + p.sizeMB, 0);

function photoEl(p, cls, w = 600, h = 800) {
  const el = document.createElement("div");
  el.className = `ph ${cls}`;
  el.style.backgroundImage = `linear-gradient(160deg, ${p.fb[0]}, ${p.fb[1]})`;
  const img = new Image();
  img.src = `https://picsum.photos/seed/${p.seed}/${w}/${h}`;
  img.alt = "";
  img.onerror = () => img.remove();
  el.appendChild(img);
  return el;
}

function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 1800);
}

function haptic() {
  navigator.vibrate?.(12);
}

/* 今日 */
function renderHome() {
  const d = new Date();
  $("today-date").textContent = `${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${"日一二三四五六"[d.getDay()]}`;
  const used = state.roundsToday > 0;
  $("today-title").textContent = used ? "今日已拂尘" : `今日拾光 · ${ROUND_SIZE} 张`;
  $("today-hint").textContent = used ? "明天会有新的照片被拾起" : "从相册里随机拾起，约 1 分钟";
  $("start-btn").textContent = used ? "再来一轮" : "开始扫尘";
  const peek = $("peek");
  peek.innerHTML = "";
  makeRound(99).slice(0, 3).forEach((p, i) => {
    const el = photoEl(p, "", 220, 292);
    el.style.transform = `translateX(-50%) translateX(${(i - 1) * 62}px) rotate(${(i - 1) * 9}deg)`;
    el.style.zIndex = i === 1 ? 2 : 1;
    peek.appendChild(el);
  });
}

function startRound() {
  if (state.roundsToday > 0) return openPaywall("今日的拾光已用完");
  state.photos = makeRound(state.roundNo++);
  state.index = 0;
  state.history = [];
  state.bin.clear();
  state.restored.clear();
  renderDeck();
  renderProgress();
  show("swipe");
}

/* 滑卡 */
function renderDeck(enterFrom) {
  const deck = $("deck");
  deck.innerHTML = "";
  const rest = state.photos.slice(state.index, state.index + 3).reverse();
  rest.forEach((p, i) => {
    const card = photoEl(p, "card", 600, 800);
    card.insertAdjacentHTML("beforeend", `
      ${p.isVideo ? '<span class="badge">▶ 视频</span>' : ""}
      <span class="stamp sweep">扫尘</span><span class="stamp keep">留光</span>
      <div class="meta"><p class="ago">${agoText(p.daysAgo)}</p>
      <p class="info">${fmtDate(p.date)} · ${fmtMB(p.sizeMB)}</p></div>`);
    deck.appendChild(card);
    if (i === rest.length - 1) bindDrag(card);
  });
  const top = deck.lastElementChild;
  if (top && enterFrom) {
    top.style.transition = "none";
    top.style.transform = `translateX(${enterFrom === "sweep" ? -480 : 480}px) rotate(${enterFrom === "sweep" ? -20 : 20}deg)`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      top.style.transition = "";
      top.style.transform = "";
    }));
  }
}

function renderProgress() {
  const n = Math.min(state.index + 1, ROUND_SIZE);
  $("progress-text").textContent = `${n} / ${ROUND_SIZE}`;
  $("progress-bar").style.width = `${(state.index / ROUND_SIZE) * 100}%`;
  const bin = [...state.bin.values()];
  $("bin-chip").textContent = bin.length ? `尘筐 ${bin.length} · ${fmtMB(sum(bin))}` : "尘筐 0";
}

function bindDrag(card) {
  let startX = 0, startY = 0, dx = 0, dragging = false;
  const stamps = { sweep: card.querySelector(".stamp.sweep"), keep: card.querySelector(".stamp.keep") };
  card.addEventListener("pointerdown", (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    card.setPointerCapture(e.pointerId);
    card.classList.add("dragging");
  });
  card.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    const dy = (e.clientY - startY) * 0.3;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
    stamps.sweep.style.opacity = Math.min(1, Math.max(0, -dx / 90));
    stamps.keep.style.opacity = Math.min(1, Math.max(0, dx / 90));
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    card.classList.remove("dragging");
    if (Math.abs(dx) > 100) decide(dx < 0 ? "sweep" : "keep");
    else {
      card.style.transform = "";
      stamps.sweep.style.opacity = stamps.keep.style.opacity = 0;
    }
    dx = 0;
  };
  card.addEventListener("pointerup", end);
  card.addEventListener("pointercancel", end);
}

function decide(action) {
  if (state.index >= ROUND_SIZE || decide.busy) return;
  decide.busy = true;
  const p = state.photos[state.index];
  const card = $("deck").lastElementChild;
  card.querySelector(`.stamp.${action}`).style.opacity = 1;
  card.style.transform = `translate(${action === "sweep" ? -520 : 520}px, 40px) rotate(${action === "sweep" ? -28 : 28}deg)`;
  card.style.opacity = 0;
  haptic();

  state.history.push({ photo: p, action });
  if (action === "sweep") {
    state.bin.set(p.id, p);
    const chip = $("bin-chip");
    chip.classList.add("bump");
    setTimeout(() => chip.classList.remove("bump"), 220);
  }
  state.index++;
  renderProgress();

  setTimeout(() => {
    decide.busy = false;
    if (state.index >= ROUND_SIZE) openSettle();
    else renderDeck();
  }, 280);
}

function undo() {
  const last = state.history.pop();
  if (!last) return toast("没有可撤销的操作");
  state.bin.delete(last.photo.id);
  state.index--;
  renderProgress();
  renderDeck(last.action);
  haptic();
}

/* 结算 */
function openSettle() {
  const bin = [...state.bin.values()];
  const kept = ROUND_SIZE - bin.length;
  $("settle-title").textContent = "本轮结算";
  $("settle-sub").textContent = `留光 ${kept} 张 · 扫尘 ${bin.length} 张`;
  $("done").hidden = true;
  $("done-actions").hidden = true;
  $("settle-tip").hidden = !bin.length;
  $("settle-btn").hidden = false;
  $("settle-empty").hidden = bin.length > 0;
  $("grid").hidden = false;
  const grid = $("grid");
  grid.innerHTML = "";
  bin.forEach((p) => {
    const tile = photoEl(p, "tile", 300, 400);
    tile.dataset.id = p.id;
    tile.insertAdjacentHTML("beforeend", `<span class="size">${fmtMB(p.sizeMB)}</span>`);
    tile.onclick = () => {
      state.restored.has(p.id) ? state.restored.delete(p.id) : state.restored.add(p.id);
      tile.classList.toggle("restored");
      haptic();
      renderSettleBtn();
    };
    grid.appendChild(tile);
  });
  renderSettleBtn();
  show("settle");
}

const toDelete = () => [...state.bin.values()].filter((p) => !state.restored.has(p.id));

function renderSettleBtn() {
  const list = toDelete();
  $("settle-btn").textContent = list.length
    ? `拂去 ${list.length} 张 · 释放 ${fmtMB(sum(list))}`
    : "全部留光，完成本轮";
}

function onSettle() {
  const list = toDelete();
  if (!list.length) return finishRound(0, 0);
  $("alert-title").textContent = `允许“Dustlight”删除这 ${list.length} 张照片吗？`;
  $("alert").hidden = false;
}

function confirmDelete() {
  $("alert").hidden = true;
  const list = toDelete();
  const ids = new Set(list.map((p) => p.id));
  const phone = document.querySelector(".phone").getBoundingClientRect();
  document.querySelectorAll("#grid .tile").forEach((tile, i) => {
    if (!ids.has(tile.dataset.id)) return tile.classList.add("vanish");
    setTimeout(() => {
      tile.classList.add("vanish");
      spawnDust(tile.getBoundingClientRect(), phone);
    }, i * 90);
  });
  haptic();
  setTimeout(() => finishRound(list.length, sum(list)), 1100 + list.length * 90);
}

function spawnDust(rect, phone) {
  const host = document.querySelector(".phone");
  for (let i = 0; i < 18; i++) {
    const dot = document.createElement("span");
    dot.className = "particle";
    dot.style.left = `${rect.left - phone.left + Math.random() * rect.width}px`;
    dot.style.top = `${rect.top - phone.top + Math.random() * rect.height}px`;
    dot.style.setProperty("--dx", `${(Math.random() - 0.3) * 80}px`);
    dot.style.setProperty("--dy", `${-40 - Math.random() * 120}px`);
    dot.style.opacity = 0.4 + Math.random() * 0.6;
    host.appendChild(dot);
    setTimeout(() => dot.remove(), 1500);
  }
}

function finishRound(count, mb) {
  state.roundsToday++;
  $("grid").hidden = true;
  $("settle-empty").hidden = true;
  $("settle-tip").hidden = true;
  $("settle-btn").hidden = true;
  $("done").hidden = false;
  $("done-actions").hidden = false;
  $("settle-title").textContent = count ? "拂尘完成" : "本轮完成";
  $("settle-sub").textContent = `留光 ${ROUND_SIZE - count} 张 · 拂去 ${count} 张`;
  $("done-line").textContent = count
    ? `拂去 ${count} 张，留下更清晰的回忆`
    : "每一张都值得留下，今天的相册很干净";
  if (count) $("last-freed").textContent = fmtMB(mb);
  $("streak").textContent = 7;
  rollNumber($("freed-num"), mb);
}

function rollNumber(el, target) {
  const start = performance.now();
  const dur = 900;
  const step = (t) => {
    const k = Math.min(1, (t - start) / dur);
    const v = target * (1 - Math.pow(1 - k, 3));
    el.textContent = target >= 10 ? Math.round(v) : v.toFixed(1);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* 付费墙 */
function openPaywall(title) {
  $("pw-title").textContent = title;
  $("paywall").hidden = false;
}
const closePaywall = () => ($("paywall").hidden = true);

/* 事件 */
$("start-btn").onclick = startRound;
$("quit-btn").onclick = () => { show("home"); renderHome(); };
$("sweep-btn").onclick = () => decide("sweep");
$("keep-btn").onclick = () => decide("keep");
$("undo-btn").onclick = undo;
$("settle-btn").onclick = onSettle;
$("alert-cancel").onclick = () => ($("alert").hidden = true);
$("alert-ok").onclick = confirmDelete;
$("home-btn").onclick = () => { renderHome(); show("home"); };
$("again-btn").onclick = () => openPaywall("今日的拾光已用完");
$("buy-btn").onclick = () => toast("原型：购买流程未实现");
$("later-btn").onclick = closePaywall;
$("paywall").onclick = (e) => e.target.id === "paywall" && closePaywall();
document.querySelectorAll("[data-pro]").forEach((el) => {
  el.onclick = () => openPaywall(`解锁「${el.textContent.replace("Pro", "").trim()}」`);
});

document.addEventListener("keydown", (e) => {
  if (!$("swipe").classList.contains("active")) return;
  if (e.key === "ArrowLeft") decide("sweep");
  else if (e.key === "ArrowRight") decide("keep");
  else if (e.key.toLowerCase() === "z" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); undo(); }
});

renderHome();
