(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const distanceEl = document.getElementById("distance");
  const coinsEl = document.getElementById("coins");
  const scoreEl = document.getElementById("score");
  const distanceLabel = document.getElementById("distanceLabel");
  const coinsLabel = document.getElementById("coinsLabel");
  const scoreLabel = document.getElementById("scoreLabel");
  const tagline = document.getElementById("tagline");
  const langToggle = document.getElementById("langToggle");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const startBtn = document.getElementById("startBtn");
  const orientationGate = document.getElementById("orientationGate");
  const scoreHintPanel = document.getElementById("scoreHintPanel");
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const BASE_W = 960;
  const BASE_H = 420;
  const GROUND_Y = 330;
  const COIN_SCORE = 10;
  const PLAYER_START_X = 118;
  const PLAYER_MIN_X = 56;
  const PLAYER_MAX_X = 315;
  const JUMP_VELOCITY = -620;
  const JUMP_SKILL_VELOCITY_MULTIPLIER = Math.sqrt(3);
  const JUMP_SKILL_SPAWN_RATE = 0.75;
  const SIZE_SKILL_SCALE = 2;
  const SIZE_SKILL_SPAWN_RATE = JUMP_SKILL_SPAWN_RATE * 0.5;
  const SKILL_MIN_DURATION = 3;
  const SKILL_MAX_DURATION = 7;
  const SKILL_NAME = "AI辅助写作技能";
  const JUMP_SKILL_NAME = "AI学术问答技能";
  const SIZE_SKILL_NAME = "AI学习拓展技能";
  const SKILL_BANNER_NAMES = {
    shield: "AI辅助写作技能",
    jump: "AI学术问答技能",
    size: "AI学习拓展技能",
  };
  const JUVENILE_OFFER_URL = "https://qy.chinaunicom.cn/mobile-h5/juvenile/home.html";
  const SKILL_BANNER_DURATION = 7;

  const assets = {
    runner: loadImage("assets/runner-cutout.png"),
    skillRunner: loadImage("assets/skill-runner-cutout.png"),
    shield: loadImage("assets/shield-outline.png"),
    deskChair: loadImage("assets/desk-chair-cutout.png"),
    table: loadImage("assets/table-cutout.png"),
    cloud: loadImage("assets/cloud-cutout.png"),
    coin: loadImage("assets/coin.png"),
    skillOrb: loadImage("assets/skill-orb-cutout.png"),
    jumpSkillOrb: loadImage("assets/jump-skill-orb.png"),
    sizeSkillOrb: loadImage("assets/size-skill-orb.png"),
    rainbowTail: loadImage("assets/rainbow-tail.jpg"),
    backgrounds: [
      loadImage("assets/background-1.png"),
      loadImage("assets/background-2.png"),
      loadImage("assets/background-3.png"),
    ],
  };

  const bgm = new Audio("assets/background-music.mp3");
  bgm.loop = true;
  bgm.preload = "auto";
  bgm.volume = 0.48;

  const groundSfx = new Audio("assets/ground-sfx.mp3");
  groundSfx.loop = true;
  groundSfx.preload = "auto";
  groundSfx.volume = bgm.volume * 0.3;

  const keys = new Set();
  const activeTouchKeys = new Map();
  let state = "ready";
  let lastTime = 0;
  let spawnTimer = 0;
  let coinTimer = 0;
  let distance = 0;
  let coinCount = 0;
  let speed = 330;
  let worldT = 0;
  let backgroundIndex = 0;
  let backgroundTimer = 0;
  let currentLang = "zh";
  let obstacles = [];
  let coins = [];
  let skillTimer = 0;
  let skillOrbs = [];
  let jumpSkillTimer = 0;
  let jumpSkillOrbs = [];
  let sizeSkillTimer = 0;
  let sizeSkillOrbs = [];
  let skillActiveUntil = 0;
  let jumpSkillActiveUntil = 0;
  let sizeSkillActiveUntil = 0;
  let skillBannerUntil = 0;
  let skillBannerText = "";
  let playerIntroFlashUntil = 0;
  let controlGuideHideAt = 0;

  const I18N = {
    en: {
      htmlLang: "zh-CN",
      toggle: "中文",
      tagline: "有梦有方向",
      distance: "沃派里程",
      coins: "沃派积分",
      score: "分数",
      readyTitle: "按空格或 ↑ 开始",
      readyText: "↑ 上跳，↓ 蹲下，← 前进，→ 后退。不要碰到桌椅或云朵。",
      start: "开始游戏",
      restart: "重新开始",
      gameOver: "游戏结束",
      points: "分",
      overText: (meters, coinTotal) => `沃派里程 ${meters}m，沃派积分 ${coinTotal}。按空格或点击按钮重新开始。`,
      touch: {
        ArrowLeft: "←",
        ArrowDown: "↓",
        ArrowUp: "↑",
        ArrowRight: "→",
      },
    },
    zh: {
      htmlLang: "zh-CN",
      toggle: "中文",
      tagline: "有梦有方向",
      distance: "沃派里程",
      coins: "沃派积分",
      score: "分数",
      readyTitle: "按空格或 ↑ 开始",
      readyText: "↑ 上跳，↓ 蹲下，← 前进，→ 后退。不要碰到桌椅或云朵。",
      start: "开始游戏",
      restart: "重新开始",
      gameOver: "游戏结束",
      points: "分",
      overText: (meters, coinTotal) => `沃派里程 ${meters}m，沃派积分 ${coinTotal}。按空格或点击按钮重新开始。`,
      touch: {
        ArrowLeft: "←",
        ArrowDown: "↓",
        ArrowUp: "↑",
        ArrowRight: "→",
      },
    },
  };

  const player = {
    x: PLAYER_START_X,
    y: GROUND_Y - 74,
    w: 62,
    h: 74,
    vy: 0,
    grounded: true,
    ducking: false,
  };

  function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  function playBackgroundMusic() {
    bgm.currentTime = 0;
    bgm.play().catch(() => {
      // Browsers only allow audio after a user action; the next start input will retry.
    });
  }

  function stopBackgroundMusic() {
    bgm.pause();
    bgm.currentTime = 0;
  }

  function updateGroundSfx() {
    const shouldPlay = state === "running" && player.grounded && !isSkillActive();
    if (shouldPlay) {
      if (groundSfx.paused) {
        groundSfx.currentTime = 0;
        groundSfx.play().catch(() => {
        });
      }
      return;
    }
    if (!groundSfx.paused) {
      groundSfx.pause();
      groundSfx.currentTime = 0;
    }
  }

  function stopGroundSfx() {
    groundSfx.pause();
    groundSfx.currentTime = 0;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * DPR);
    canvas.height = Math.round(rect.height * DPR);
    ctx.setTransform((rect.width * DPR) / BASE_W, 0, 0, (rect.height * DPR) / BASE_H, 0, 0);
  }

  function isCoarsePointer() {
    return window.matchMedia?.("(hover: none) and (pointer: coarse)").matches;
  }

  function isPortraitMobile() {
    return isCoarsePointer() && window.matchMedia?.("(orientation: portrait)").matches;
  }

  function updateOrientationGate() {
    const blocked = isPortraitMobile();
    orientationGate?.setAttribute("aria-hidden", blocked ? "false" : "true");
    if (!blocked) {
      resizeCanvas();
      draw();
    }
    return blocked;
  }

  async function requestLandscapeMode() {
    if (!isCoarsePointer()) return;
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (_) {
    }
    try {
      await screen.orientation?.lock?.("landscape");
    } catch (_) {
    }
  }

  function reset() {
    requestLandscapeMode();
    if (updateOrientationGate()) return;
    playBackgroundMusic();
    state = "running";
    lastTime = performance.now();
    spawnTimer = 0.85;
    coinTimer = 0.8;
    skillTimer = random(3.2, 5.8);
    jumpSkillTimer = random(3.2 / JUMP_SKILL_SPAWN_RATE, 5.8 / JUMP_SKILL_SPAWN_RATE);
    sizeSkillTimer = random(3.2 / SIZE_SKILL_SPAWN_RATE, 5.8 / SIZE_SKILL_SPAWN_RATE);
    distance = 0;
    coinCount = 0;
    speed = 330;
    worldT = 0;
    backgroundIndex = randomBackgroundIndex(-1);
    backgroundTimer = random(6, 10);
    obstacles = [];
    coins = [];
    skillOrbs = [];
    jumpSkillOrbs = [];
    sizeSkillOrbs = [];
    skillActiveUntil = 0;
    jumpSkillActiveUntil = 0;
    sizeSkillActiveUntil = 0;
    skillBannerUntil = 0;
    skillBannerText = "";
    playerIntroFlashUntil = 1.1;
    controlGuideHideAt = performance.now() + 5000;
    updateScoreHintPanel();
    stopGroundSfx();
    Object.assign(player, {
      x: PLAYER_START_X,
      y: GROUND_Y - 74,
      w: 62,
      h: 74,
      vy: 0,
      grounded: true,
      ducking: false,
    });
    overlay.classList.add("hidden");
    applyLanguage();
    updateHud();
    updateGroundSfx();
    requestAnimationFrame(loop);
  }

  function endGame() {
    state = "over";
    stopBackgroundMusic();
    stopGroundSfx();
    const text = I18N[currentLang];
    hideScoreHintPanel();
    renderGameOverOverlay();
    startBtn.textContent = text.restart;
    overlay.classList.remove("hidden");
  }

  function rewardMessage(score) {
    if (score > 1000) return "您已成功获得联通青少年专项优惠";
    if (score > 500) return "您还没有获得优惠哦，请再接再厉";
    return "加油沃派青年，你还可以做得更好！";
  }

  function renderGameOverOverlay() {
    const text = I18N[currentLang];
    const score = getScore();
    const reward = rewardMessage(score);
    overlayTitle.textContent = `${text.gameOver}: ${score} ${text.points}`;
    overlayText.replaceChildren();

    const rewardControl = document.createElement(score > 1000 ? "button" : "span");
    rewardControl.className = score > 1000 ? "result-message result-link" : "result-message";
    rewardControl.textContent = reward;
    if (score > 1000) {
      rewardControl.type = "button";
      rewardControl.addEventListener("click", () => {
        window.location.href = JUVENILE_OFFER_URL;
      });
    }
    overlayText.appendChild(rewardControl);

    const resultDetail = document.createElement("span");
    resultDetail.className = "result-detail";
    resultDetail.textContent = text.overText(Math.floor(distance), coinCount);
    overlayText.appendChild(resultDetail);
  }

  function getScore() {
    return Math.floor(distance + coinCount * COIN_SCORE);
  }

  function updateHud() {
    distanceEl.textContent = Math.floor(distance).toString();
    coinsEl.textContent = coinCount.toString();
    scoreEl.textContent = getScore().toString();
  }

  function applyLanguage() {
    const text = I18N[currentLang];
    document.documentElement.lang = text.htmlLang;
    langToggle.textContent = text.toggle;
    tagline.textContent = text.tagline;
    distanceLabel.textContent = text.distance;
    coinsLabel.textContent = text.coins;
    scoreLabel.textContent = text.score;
    document.querySelectorAll("[data-key]").forEach((button) => {
      button.textContent = text.touch[button.dataset.key] || button.textContent;
    });
    if (state === "over") {
      renderGameOverOverlay();
      startBtn.textContent = text.restart;
    } else {
      overlayTitle.textContent = text.readyTitle;
      overlayText.textContent = text.readyText;
      startBtn.textContent = text.start;
    }
  }

  function toggleLanguage() {
    currentLang = "zh";
    localStorage.setItem("timeoutRunnerLang", "zh");
    applyLanguage();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
    lastTime = now;
    if (state === "running") {
      update(dt);
    }
    updateScoreHintPanel();
    draw();
    if (state === "running") {
      requestAnimationFrame(loop);
    }
  }

  function update(dt) {
    worldT += dt;
    speed = 330;
    const sceneSpeed = speed * (isSkillActive() ? 3 : 1);
    distance += (sceneSpeed * dt) / 10;
    backgroundTimer -= dt;
    if (backgroundTimer <= 0) {
      backgroundIndex = randomBackgroundIndex(backgroundIndex);
      backgroundTimer = random(7, 12);
    }

    const moveDir = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
    const playerMoveSpeed = 245 * (isSkillActive() ? 3 : 1);
    player.x = clamp(player.x + moveDir * playerMoveSpeed * dt, PLAYER_MIN_X, PLAYER_MAX_X);

    player.ducking = keys.has("ArrowDown") && player.grounded;
    player.h = player.ducking ? 46 : 74;
    if (player.grounded) {
      player.y = GROUND_Y - player.h;
    }
    if (keys.has("ArrowUp")) triggerJump();

    player.vy += 1750 * dt;
    player.y += player.vy * dt;
    if (player.y < 0) {
      player.y = 0;
      player.vy = Math.max(0, player.vy);
    }
    if (player.y + player.h >= GROUND_Y) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      player.grounded = true;
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = random(0.78, 1.32);
    }
    coinTimer -= dt;
    if (coinTimer <= 0) {
      spawnCoins();
      coinTimer = random(0.86, 1.42);
    }
    skillTimer -= dt;
    if (skillTimer <= 0) {
      spawnSkillOrb();
      skillTimer = random(6.5, 10.5);
    }
    jumpSkillTimer -= dt;
    if (jumpSkillTimer <= 0) {
      spawnJumpSkillOrb();
      jumpSkillTimer = random(6.5 / JUMP_SKILL_SPAWN_RATE, 10.5 / JUMP_SKILL_SPAWN_RATE);
    }
    sizeSkillTimer -= dt;
    if (sizeSkillTimer <= 0) {
      spawnSizeSkillOrb();
      sizeSkillTimer = random(6.5 / SIZE_SKILL_SPAWN_RATE, 10.5 / SIZE_SKILL_SPAWN_RATE);
    }

    for (const obstacle of obstacles) {
      obstacle.x -= sceneSpeed * dt;
    }
    for (const coin of coins) {
      coin.x -= sceneSpeed * dt;
      coin.spin += dt * 8;
    }
    for (const orb of skillOrbs) {
      orb.x -= sceneSpeed * dt;
      orb.spin += dt * 5;
      orb.y += Math.sin(worldT * 5 + orb.phase) * 0.18;
    }
    for (const orb of jumpSkillOrbs) {
      orb.x -= sceneSpeed * dt;
      orb.spin += dt * 5.4;
      orb.y += Math.sin(worldT * 5.6 + orb.phase) * 0.18;
    }
    for (const orb of sizeSkillOrbs) {
      orb.x -= sceneSpeed * dt;
      orb.spin += dt * 4.8;
      orb.y += Math.sin(worldT * 4.8 + orb.phase) * 0.18;
    }
    obstacles = obstacles.filter((o) => o.x + o.w > -40);
    coins = coins.filter((c) => c.x + c.r > -40 && !c.collected);
    skillOrbs = skillOrbs.filter((orb) => orb.x + orb.r > -40 && !orb.collected);
    jumpSkillOrbs = jumpSkillOrbs.filter((orb) => orb.x + orb.r > -40 && !orb.collected);
    sizeSkillOrbs = sizeSkillOrbs.filter((orb) => orb.x + orb.r > -40 && !orb.collected);

    const hitbox = playerHitbox();
    if (!isSkillActive()) {
      for (const obstacle of obstacles) {
        if (rectsOverlap(hitbox, obstacleHitbox(obstacle))) {
          endGame();
          return;
        }
      }
    }
    for (const coin of coins) {
      const box = { x: coin.x - coin.r, y: coin.y - coin.r, w: coin.r * 2, h: coin.r * 2 };
      if (rectsOverlap(hitbox, box)) {
        coin.collected = true;
        coinCount += 1;
      }
    }
    for (const orb of skillOrbs) {
      const box = { x: orb.x - orb.r, y: orb.y - orb.r, w: orb.r * 2, h: orb.r * 2 };
      if (rectsOverlap(hitbox, box)) {
        orb.collected = true;
        const duration = random(SKILL_MIN_DURATION, SKILL_MAX_DURATION);
        skillActiveUntil = worldT + duration;
        skillBannerUntil = worldT + SKILL_BANNER_DURATION;
        skillBannerText = SKILL_BANNER_NAMES.shield;
      }
    }
    for (const orb of jumpSkillOrbs) {
      const box = { x: orb.x - orb.r, y: orb.y - orb.r, w: orb.r * 2, h: orb.r * 2 };
      if (rectsOverlap(hitbox, box)) {
        orb.collected = true;
        const duration = random(SKILL_MIN_DURATION, SKILL_MAX_DURATION);
        jumpSkillActiveUntil = worldT + duration;
        skillBannerUntil = worldT + SKILL_BANNER_DURATION;
        skillBannerText = SKILL_BANNER_NAMES.jump;
      }
    }
    for (const orb of sizeSkillOrbs) {
      const box = { x: orb.x - orb.r, y: orb.y - orb.r, w: orb.r * 2, h: orb.r * 2 };
      if (rectsOverlap(hitbox, box)) {
        orb.collected = true;
        const duration = random(SKILL_MIN_DURATION, SKILL_MAX_DURATION);
        sizeSkillActiveUntil = worldT + duration;
        skillBannerUntil = worldT + SKILL_BANNER_DURATION;
        skillBannerText = SKILL_BANNER_NAMES.size;
      }
    }
    updateGroundSfx();
    updateHud();
  }

  function spawnObstacle() {
    const roll = Math.random();
    if (roll < 0.34) {
      pushObstacle({
        x: BASE_W + 46,
        y: random(222, 235),
        w: random(78, 112),
        h: random(36, 44),
        type: "low-clearance",
      });
      return;
    }
    if (roll < 0.68) {
      const h = random(58, 82);
      pushObstacle({
        x: BASE_W + 46,
        y: GROUND_Y - h,
        w: random(50, 64),
        h,
        type: "narrow",
      });
      return;
    }
    const h = random(40, 58);
    pushObstacle({
      x: BASE_W + 46,
      y: GROUND_Y - h,
      w: random(86, 116),
      h,
      type: "wide",
    });
  }

  function pushObstacle(obstacle) {
    obstacles.push(obstacle);
    coins = coins.filter((coin) => !rectsOverlap(coinRect(coin, 8), obstacle));
  }

  function spawnCoins() {
    if (Math.random() < 0.72) {
      spawnGroundCoins();
    } else {
      spawnAirCoins();
    }
  }

  function spawnSkillOrb() {
    const orb = {
      x: BASE_W + random(84, 180),
      y: Math.random() < 0.55 ? GROUND_Y - 42 : random(205, 255),
      r: 16,
      spin: random(0, Math.PI * 2),
      phase: random(0, Math.PI * 2),
      collected: false,
    };
    const box = orbRect(orb, 12);
    const overlapsObstacle = obstacles.some((obstacle) => rectsOverlap(box, obstacle));
    const overlapsCoin = coins.some((coin) => rectsOverlap(box, coinRect(coin, 8)));
    const overlapsJumpSkill = jumpSkillOrbs.some((existing) => rectsOverlap(box, orbRect(existing, 10)));
    const overlapsSizeSkill = sizeSkillOrbs.some((existing) => rectsOverlap(box, orbRect(existing, 10)));
    if (!overlapsObstacle && !overlapsCoin && !overlapsJumpSkill && !overlapsSizeSkill) {
      skillOrbs.push(orb);
    }
  }

  function spawnJumpSkillOrb() {
    const orb = {
      x: BASE_W + random(96, 196),
      y: Math.random() < 0.48 ? GROUND_Y - 46 : random(180, 238),
      r: 17,
      spin: random(0, Math.PI * 2),
      phase: random(0, Math.PI * 2),
      collected: false,
    };
    const box = orbRect(orb, 12);
    const overlapsObstacle = obstacles.some((obstacle) => rectsOverlap(box, obstacle));
    const overlapsCoin = coins.some((coin) => rectsOverlap(box, coinRect(coin, 8)));
    const overlapsShieldSkill = skillOrbs.some((existing) => rectsOverlap(box, orbRect(existing, 10)));
    const overlapsJumpSkill = jumpSkillOrbs.some((existing) => rectsOverlap(box, orbRect(existing, 10)));
    const overlapsSizeSkill = sizeSkillOrbs.some((existing) => rectsOverlap(box, orbRect(existing, 10)));
    if (!overlapsObstacle && !overlapsCoin && !overlapsShieldSkill && !overlapsJumpSkill && !overlapsSizeSkill) {
      jumpSkillOrbs.push(orb);
    }
  }

  function spawnSizeSkillOrb() {
    const orb = {
      x: BASE_W + random(108, 208),
      y: Math.random() < 0.46 ? GROUND_Y - 46 : random(182, 240),
      r: 17,
      spin: random(0, Math.PI * 2),
      phase: random(0, Math.PI * 2),
      collected: false,
    };
    const box = orbRect(orb, 12);
    const overlapsObstacle = obstacles.some((obstacle) => rectsOverlap(box, obstacle));
    const overlapsCoin = coins.some((coin) => rectsOverlap(box, coinRect(coin, 8)));
    const overlapsShieldSkill = skillOrbs.some((existing) => rectsOverlap(box, orbRect(existing, 10)));
    const overlapsJumpSkill = jumpSkillOrbs.some((existing) => rectsOverlap(box, orbRect(existing, 10)));
    const overlapsSizeSkill = sizeSkillOrbs.some((existing) => rectsOverlap(box, orbRect(existing, 10)));
    if (!overlapsObstacle && !overlapsCoin && !overlapsShieldSkill && !overlapsJumpSkill && !overlapsSizeSkill) {
      sizeSkillOrbs.push(orb);
    }
  }

  function spawnGroundCoins() {
    const count = Math.floor(random(1, 3));
    const startX = BASE_W + random(46, 120);
    for (let i = 0; i < count; i += 1) {
      addCoinIfClear({
        x: startX + i * 30,
        y: GROUND_Y - 24,
        r: 10,
        spin: random(0, Math.PI * 2),
        collected: false,
      });
    }
  }

  function spawnAirCoins() {
    const count = Math.floor(random(1, 3));
    const startX = BASE_W + random(54, 130);
    const baseY = random(185, 245);
    for (let i = 0; i < count; i += 1) {
      addCoinIfClear({
        x: startX + i * 34,
        y: baseY - Math.sin(i / Math.max(1, count - 1) * Math.PI) * 28,
        r: 10,
        spin: random(0, Math.PI * 2),
        collected: false,
      });
    }
  }

  function addCoinIfClear(coin) {
    const box = coinRect(coin, 10);
    const overlapsObstacle = obstacles.some((obstacle) => rectsOverlap(box, obstacle));
    const overlapsCoin = coins.some((existing) => rectsOverlap(box, coinRect(existing, 4)));
    if (!overlapsObstacle && !overlapsCoin) {
      coins.push(coin);
      return true;
    }
    return false;
  }

  function coinRect(coin, padding = 0) {
    return {
      x: coin.x - coin.r - padding,
      y: coin.y - coin.r - padding,
      w: coin.r * 2 + padding * 2,
      h: coin.r * 2 + padding * 2,
    };
  }

  function orbRect(orb, padding = 0) {
    return {
      x: orb.x - orb.r - padding,
      y: orb.y - orb.r - padding,
      w: orb.r * 2 + padding * 2,
      h: orb.r * 2 + padding * 2,
    };
  }

  function playerHitbox() {
    const insetX = player.ducking ? 12 : 10;
    const insetTop = player.ducking ? 9 : 8;
    const scale = playerDrawScale();
    if (scale > 1) {
      const scaledW = player.w * scale;
      const scaledH = player.h * scale;
      const scaledX = player.x + player.w / 2 - scaledW / 2;
      const scaledY = player.y + player.h - scaledH;
      return {
        x: scaledX + insetX * scale,
        y: scaledY + insetTop * scale,
        w: scaledW - insetX * scale * 2,
        h: scaledH - insetTop * scale - 6 * scale,
      };
    }
    return {
      x: player.x + insetX,
      y: player.y + insetTop,
      w: player.w - insetX * 2,
      h: player.h - insetTop - 6,
    };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function draw() {
    ctx.clearRect(0, 0, BASE_W, BASE_H);
    drawSky();
    drawGround();
    obstacles.forEach(drawObstacle);
    coins.forEach(drawCoin);
    skillOrbs.forEach(drawSkillOrb);
    jumpSkillOrbs.forEach(drawJumpSkillOrb);
    sizeSkillOrbs.forEach(drawSizeSkillOrb);
    drawRainbowTail();
    drawPlayer();
    drawControlGuide();
    drawSkillStatus();
    drawSkillBanner();
  }

  function drawSky() {
    const img = assets.backgrounds[backgroundIndex];
    if (img.complete && img.naturalWidth) {
      drawCoverImage(img, 0, 0, BASE_W, BASE_H);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(0, 0, BASE_W, BASE_H);
      return;
    }
    const sky = ctx.createLinearGradient(0, 0, 0, BASE_H);
    sky.addColorStop(0, "#cfe4f7");
    sky.addColorStop(0.62, "#f1f7fb");
    sky.addColorStop(1, "#f6efe3");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  function drawCloud(x, y, scale) {
    ctx.beginPath();
    ctx.ellipse(x, y, 34 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 28 * scale, y - 8 * scale, 28 * scale, 20 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 58 * scale, y, 36 * scale, 15 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawScenery() {
  }

  function drawGround() {
    ctx.fillStyle = "#5e4536";
    ctx.fillRect(0, GROUND_Y, BASE_W, 5);
    const groundTop = GROUND_Y + 5;
    const brickW = 70;
    const brickH = 20;
    const mortar = 3;
    const scroll = (worldT * speed) % brickW;
    ctx.fillStyle = "#6b3c2b";
    ctx.fillRect(0, groundTop, BASE_W, BASE_H - groundTop);
    for (let y = groundTop; y < BASE_H; y += brickH + mortar) {
      const row = Math.floor((y - groundTop) / (brickH + mortar));
      const rowOffset = row % 2 === 0 ? 0 : brickW / 2;
      for (let x = -brickW - scroll + rowOffset; x < BASE_W + brickW; x += brickW) {
        const shade = row % 3 === 0 ? "#b86940" : row % 3 === 1 ? "#a95736" : "#c17547";
        ctx.fillStyle = shade;
        ctx.fillRect(Math.round(x), y, brickW - mortar, brickH);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(Math.round(x) + 4, y + 3, brickW - mortar - 8, 3);
      }
    }
    ctx.fillStyle = "rgba(23,33,43,0.14)";
    ctx.fillRect(PLAYER_MIN_X, GROUND_Y + 8, PLAYER_MAX_X + player.w - PLAYER_MIN_X, 3);
  }

  function drawPlayer() {
    ctx.save();
    const skillActive = isSkillActive();
    const scale = playerDrawScale();
    const scaledW = player.w * scale;
    const scaledH = player.h * scale;
    const scaledX = player.x + player.w / 2 - scaledW / 2;
    const scaledY = player.y + player.h - scaledH;
    if (!skillActive && worldT < playerIntroFlashUntil) {
      ctx.globalAlpha = Math.sin(worldT * 48) > 0 ? 1 : 0.28;
    }
    if (skillActive) {
      drawSkillShield();
    }
    const img = skillActive && assets.skillRunner.complete && assets.skillRunner.naturalWidth
      ? assets.skillRunner
      : assets.runner;
    if (img.complete && img.naturalWidth) {
      if (skillActive && img === assets.skillRunner) {
        const drawW = scaledW * 1.74;
        const drawH = drawW * (img.naturalHeight / img.naturalWidth);
        const drawX = player.x + player.w / 2 - drawW / 2;
        const drawY = scaledY + scaledH / 2 - drawH / 2 + 2;
        ctx.save();
        ctx.translate(drawX + drawW, drawY);
        ctx.scale(-1, 1);
        drawRunningSprite(img, 0, 0, drawW, drawH, -1);
        ctx.restore();
      } else {
        drawRunningSprite(img, scaledX - 6 * scale, scaledY - 8 * scale, scaledW + 12 * scale, scaledH + 14 * scale, 1);
      }
    } else {
      ctx.fillStyle = "#2b6f45";
      ctx.fillRect(scaledX, scaledY, scaledW, scaledH);
      ctx.fillStyle = "#15222e";
      ctx.fillRect(scaledX + scaledW - 18 * scale, scaledY + 16 * scale, 6 * scale, 6 * scale);
    }
    if (skillActive) {
      drawSkillShield(true);
    }
    ctx.restore();
  }

  function drawRunningSprite(img, x, y, w, h, direction = 1) {
    const phase = Math.sin(worldT * Math.PI * 4);
    const bob = Math.abs(phase) * 2.2;
    const lean = phase * 0.045 * direction;
    const stretch = 1 + Math.abs(phase) * 0.025;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2 + bob);
    ctx.rotate(lean);
    ctx.scale(1, stretch);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function drawRainbowTail() {
    if (!isSkillActive()) return;
    const anchorX = player.x + player.w * 0.18;
    const anchorY = player.y + player.h * 0.5;
    const tailEnd = -120;
    const tailLength = anchorX - tailEnd;
    const bandH = Math.max(5, player.h * 0.095);
    const totalH = bandH * 6;
    const colors = ["#ff1518", "#ff970e", "#ffed00", "#00c82b", "#1495de", "#a600ff"];
    const step = 14;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (let band = 0; band < colors.length; band += 1) {
      for (let x = anchorX; x > tailEnd; x -= step) {
        const nextX = Math.max(x - step - 1, tailEnd);
        const progress = clamp((anchorX - x) / tailLength, 0, 1);
        const nextProgress = clamp((anchorX - nextX) / tailLength, 0, 1);
        const alpha = Math.pow(1 - progress, 1.45) * 0.9;
        if (alpha <= 0.015) continue;
        const waveA = Math.sin(x * 0.035 - worldT * 9.2) * 8;
        const waveB = Math.sin(x * 0.014 + worldT * 5.4) * 4;
        const nextWaveA = Math.sin(nextX * 0.035 - worldT * 9.2) * 8;
        const nextWaveB = Math.sin(nextX * 0.014 + worldT * 5.4) * 4;
        const blockLift = ((Math.floor((x + worldT * 140) / 56) + band) % 2) * 3;
        const nextBlockLift = ((Math.floor((nextX + worldT * 140) / 56) + band) % 2) * 3;
        const y1 = anchorY - totalH / 2 + band * bandH + waveA + waveB + blockLift;
        const y2 = anchorY - totalH / 2 + band * bandH + nextWaveA + nextWaveB + nextBlockLift;
        const edgeTaper = Math.max(0.25, 1 - progress * 0.42);
        const nextEdgeTaper = Math.max(0.25, 1 - nextProgress * 0.42);
        ctx.fillStyle = colors[band];
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(nextX, y2);
        ctx.lineTo(nextX, y2 + bandH * nextEdgeTaper);
        ctx.lineTo(x, y1 + bandH * edgeTaper);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function obstacleHitbox(obstacle) {
    const insetX = obstacle.type === "low-clearance" ? obstacle.w * 0.24 : obstacle.w * 0.2;
    const insetTop = obstacle.type === "low-clearance" ? obstacle.h * 0.28 : obstacle.h * 0.16;
    const insetBottom = obstacle.type === "low-clearance" ? obstacle.h * 0.2 : obstacle.h * 0.1;
    return {
      x: obstacle.x + insetX,
      y: obstacle.y + insetTop,
      w: obstacle.w - insetX * 2,
      h: obstacle.h - insetTop - insetBottom,
    };
  }

  function drawSkillShield(strokeOnly = false) {
    const cx = player.x + player.w / 2;
    const scale = playerDrawScale();
    const scaledH = player.h * scale;
    const scaledY = player.y + player.h - scaledH;
    const top = scaledY - 26 * scale;
    const shieldW = player.w * scale * 1.52;
    const shieldH = scaledH * 1.72;
    const left = cx - shieldW / 2;
    const right = cx + shieldW / 2;
    const bottom = top + shieldH;
    ctx.save();
    ctx.fillStyle = "rgba(24, 135, 224, 0.22)";
    ctx.strokeStyle = "rgba(24, 135, 224, 0.9)";
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.bezierCurveTo(cx + shieldW * 0.18, top + shieldH * 0.12, right - shieldW * 0.18, top + shieldH * 0.16, right, top + shieldH * 0.18);
    ctx.lineTo(right, top + shieldH * 0.62);
    ctx.bezierCurveTo(right, top + shieldH * 0.78, cx + shieldW * 0.24, bottom - shieldH * 0.12, cx, bottom);
    ctx.bezierCurveTo(cx - shieldW * 0.24, bottom - shieldH * 0.12, left, top + shieldH * 0.78, left, top + shieldH * 0.62);
    ctx.lineTo(left, top + shieldH * 0.18);
    ctx.bezierCurveTo(left + shieldW * 0.18, top + shieldH * 0.16, cx - shieldW * 0.18, top + shieldH * 0.12, cx, top);
    ctx.closePath();
    if (!strokeOnly) {
      ctx.fill();
    }
    if (strokeOnly) {
      ctx.stroke();
      const shieldImg = assets.shield;
      if (shieldImg.complete && shieldImg.naturalWidth) {
        ctx.globalAlpha = 0.95;
        ctx.drawImage(shieldImg, left - 2, top - 2, shieldW + 4, shieldH + 4);
      }
    }
    ctx.restore();
  }

  function drawObstacle(o) {
    ctx.save();
    if (o.type === "low-clearance") {
      const img = assets.cloud;
      if (img.complete && img.naturalWidth) {
        ctx.drawImage(img, o.x, o.y, o.w, o.h);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }
    } else {
      const img = o.type === "narrow" ? assets.table : assets.deskChair;
      if (img.complete && img.naturalWidth) {
        ctx.drawImage(img, o.x, o.y, o.w, o.h);
      } else {
        ctx.fillStyle = "#7b5136";
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }
    }
    ctx.strokeStyle = "rgba(23,33,43,0.34)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(o.x, o.y, o.w, o.h);
    ctx.restore();
  }

  function drawCoin(c) {
    const wobble = Math.cos(c.spin) * 0.42 + 0.58;
    const img = assets.coin;
    if (img.complete && img.naturalWidth) {
      ctx.save();
      ctx.drawImage(img, c.x - c.r * wobble, c.y - c.r, c.r * 2 * wobble, c.r * 2);
      ctx.restore();
      return;
    }
    const grad = ctx.createRadialGradient(c.x - 4, c.y - 5, 2, c.x, c.y, c.r);
    grad.addColorStop(0, "#fff3a5");
    grad.addColorStop(0.48, "#f7c84b");
    grad.addColorStop(1, "#b87612");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.r * wobble, c.r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#93620f";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawSkillOrb(orb) {
    ctx.save();
    const pulse = 1 + Math.sin(orb.spin) * 0.08;
    const size = orb.r * 2 * pulse;
    ctx.shadowColor = "rgba(58, 185, 255, 0.8)";
    ctx.shadowBlur = 14;
    const img = assets.skillOrb;
    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, orb.x - size / 2, orb.y - size / 2, size, size);
    } else {
      const grad = ctx.createRadialGradient(orb.x - 5, orb.y - 6, 2, orb.x, orb.y, orb.r);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.55, "#44c7ff");
      grad.addColorStop(1, "#1767b3");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawJumpSkillOrb(orb) {
    ctx.save();
    const pulse = 1 + Math.sin(orb.spin) * 0.08;
    const size = orb.r * 2 * pulse;
    ctx.shadowColor = "rgba(255, 132, 0, 0.8)";
    ctx.shadowBlur = 14;
    const img = assets.jumpSkillOrb;
    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, orb.x - size / 2, orb.y - size / 2, size, size);
    } else {
      const grad = ctx.createRadialGradient(orb.x - 5, orb.y - 6, 2, orb.x, orb.y, orb.r);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.55, "#ff9a18");
      grad.addColorStop(1, "#d45100");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSizeSkillOrb(orb) {
    ctx.save();
    const pulse = 1 + Math.sin(orb.spin) * 0.08;
    const size = orb.r * 2 * pulse;
    ctx.shadowColor = "rgba(0, 205, 22, 0.78)";
    ctx.shadowBlur = 14;
    const img = assets.sizeSkillOrb;
    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, orb.x - size / 2, orb.y - size / 2, size, size);
    } else {
      const grad = ctx.createRadialGradient(orb.x - 5, orb.y - 6, 2, orb.x, orb.y, orb.r);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.55, "#00d820");
      grad.addColorStop(1, "#138a1c");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawControlGuide() {
    if (state !== "running" || performance.now() >= controlGuideHideAt) return;
    const x = 14;
    const y = 14;
    const w = 268;
    const h = 74;
    ctx.save();
    ctx.fillStyle = "rgba(255, 246, 218, 0.94)";
    roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(116, 45, 18, 0.58)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#6f2110";
    ctx.font = "bold 14px Microsoft YaHei, Segoe UI, Arial";
    ctx.fillText("操作说明", x + 14, y + 20);
    ctx.font = "12px Microsoft YaHei, Segoe UI, Arial";
    ctx.fillStyle = "#8d2c15";
    ctx.fillText("↑ 上跳   ↓ 蹲下   ← 前进   → 后退", x + 14, y + 42);
    ctx.fillStyle = "#c23b17";
    ctx.fillText("不要碰到桌椅或云朵", x + 14, y + 62);
    ctx.restore();
  }

  function hideScoreHintPanel() {
    if (scoreHintPanel) scoreHintPanel.classList.add("hidden");
  }

  function updateScoreHintPanel() {
    if (!scoreHintPanel) return;
    const shouldShow = state !== "over";
    scoreHintPanel.classList.toggle("hidden", !shouldShow);
  }

  function drawSkillStatus() {
    const activeSkills = [];
    if (isSkillActive()) {
      activeSkills.push({
        title: SKILL_NAME,
        detail: "速度增加300%，并且提供保护罩",
        remaining: Math.max(0, skillActiveUntil - worldT),
        accent: "#2f9cff",
      });
    }
    if (isJumpSkillActive()) {
      activeSkills.push({
        title: JUMP_SKILL_NAME,
        detail: "跳跃高度增加200%",
        remaining: Math.max(0, jumpSkillActiveUntil - worldT),
        accent: "#ff8a00",
      });
    }
    if (isSizeSkillActive()) {
      activeSkills.push({
        title: SIZE_SKILL_NAME,
        detail: "体积增加300%",
        remaining: Math.max(0, sizeSkillActiveUntil - worldT),
        accent: "#00c816",
      });
    }
    if (!activeSkills.length) return;
    ctx.save();
    activeSkills.forEach((skill, index) => {
      const x = 14;
      const y = 100 + index * 44;
      const w = 250;
      const h = 36;
      ctx.fillStyle = "rgba(255, 246, 218, 0.94)";
      roundRect(x, y, w, h, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(116, 45, 18, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = skill.accent;
      ctx.fillRect(x + 7, y + 7, 4, h - 14);
      ctx.fillStyle = "#6f2110";
      ctx.font = "bold 13px Microsoft YaHei, Segoe UI, Arial";
      ctx.fillText(`${skill.title} ${skill.remaining.toFixed(1)}s`, x + 17, y + 15);
      ctx.fillStyle = "#9a3519";
      ctx.font = "12px Microsoft YaHei, Segoe UI, Arial";
      ctx.fillText(skill.detail, x + 17, y + 30);
    });
    ctx.restore();
  }

  function drawSkillBanner() {
    const remaining = skillBannerUntil - worldT;
    if (remaining <= 0) return;
    const duration = SKILL_BANNER_DURATION;
    const progress = clamp(1 - remaining / duration, 0, 1);
    const bannerW = 344;
    const bannerH = 42;
    const y = 68;
    const travel = BASE_W + bannerW + 80;
    const x = BASE_W + 40 - progress * travel;
    ctx.save();
    ctx.globalAlpha = Math.min(1, remaining / 0.28);
    ctx.fillStyle = "rgba(15, 94, 168, 0.92)";
    roundRect(x, y, bannerW, bannerH, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Microsoft YaHei, Segoe UI, Arial";
    ctx.fillText(`技能：${skillBannerText || SKILL_BANNER_NAMES.shield}`, x + 22, y + 27);
    ctx.restore();
  }

  function isSkillActive() {
    return worldT < skillActiveUntil;
  }

  function isJumpSkillActive() {
    return worldT < jumpSkillActiveUntil;
  }

  function isSizeSkillActive() {
    return worldT < sizeSkillActiveUntil;
  }

  function playerDrawScale() {
    return isSizeSkillActive() ? SIZE_SKILL_SCALE : 1;
  }

  function randomBackgroundIndex(previous) {
    if (assets.backgrounds.length <= 1) return 0;
    let next = Math.floor(random(0, assets.backgrounds.length));
    while (next === previous) {
      next = Math.floor(random(0, assets.backgrounds.length));
    }
    return next;
  }

  function drawCoverImage(img, x, y, w, h) {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (img.naturalWidth - sw) / 2;
    const sy = (img.naturalHeight - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function controlKeyFromEvent(e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) return e.code;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return e.key;
    if (e.key === " ") return "Space";
    return "";
  }

  function handleKeyDown(e) {
    const key = controlKeyFromEvent(e);
    if (key) {
      e.preventDefault();
    }
    if (key === "Space") {
      if (state !== "running") reset();
      return;
    }
    if (key.startsWith("Arrow")) {
      keys.add(key);
      if (state !== "running" && key === "ArrowUp") {
        reset();
      }
      if (key === "ArrowUp") triggerJump();
    }
  }

  function handleKeyUp(e) {
    const key = controlKeyFromEvent(e);
    if (key.startsWith("Arrow")) {
      keys.delete(key);
    }
  }

  function keyAxis(key) {
    if (key === "ArrowLeft" || key === "ArrowRight") return "x";
    if (key === "ArrowUp" || key === "ArrowDown") return "y";
    return "";
  }

  function syncActiveTouchKeys() {
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].forEach((key) => keys.delete(key));
    activeTouchKeys.forEach((key) => keys.add(key));
  }

  function nudgeTouchResponse(key) {
    if (state !== "running") return;
    const nudge = 18 * (isSkillActive() ? 3 : 1);
    if (key === "ArrowLeft") {
      player.x = clamp(player.x - nudge, PLAYER_MIN_X, PLAYER_MAX_X);
    } else if (key === "ArrowRight") {
      player.x = clamp(player.x + nudge, PLAYER_MIN_X, PLAYER_MAX_X);
    } else if (key === "ArrowUp") {
      triggerJump();
    } else if (key === "ArrowDown" && player.grounded) {
      player.ducking = true;
      player.h = 46;
      player.y = GROUND_Y - player.h;
    }
  }

  function triggerJump() {
    if (state !== "running" || !player.grounded) return false;
    player.ducking = false;
    player.h = 74;
    player.y = GROUND_Y - player.h;
    player.vy = JUMP_VELOCITY * (isJumpSkillActive() ? JUMP_SKILL_VELOCITY_MULTIPLIER : 1);
    player.grounded = false;
    return true;
  }

  function beginTouchKey(pointerId, key) {
    const axis = keyAxis(key);
    if (axis) {
      activeTouchKeys.forEach((activeKey, activePointerId) => {
        if (activePointerId !== pointerId && keyAxis(activeKey) === axis) {
          activeTouchKeys.delete(activePointerId);
        }
      });
    }
    activeTouchKeys.set(pointerId, key);
    syncActiveTouchKeys();
    if (state !== "running" && key === "ArrowUp") reset();
    nudgeTouchResponse(key);
  }

  function endTouchKey(pointerId) {
    const key = activeTouchKeys.get(pointerId);
    if (!key) return;

    activeTouchKeys.delete(pointerId);
    syncActiveTouchKeys();
  }

  window.addEventListener("resize", () => {
    updateOrientationGate();
  });
  window.addEventListener("orientationchange", () => {
    window.setTimeout(updateOrientationGate, 160);
  });
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  startBtn.addEventListener("click", reset);
  langToggle.addEventListener("click", toggleLanguage);

  document.querySelectorAll("[data-key]").forEach((btn) => {
    const key = btn.dataset.key;
    const touchKeyId = (touch) => `button:${key}:${touch.identifier}`;

    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      requestLandscapeMode();
      if (updateOrientationGate()) return;
      btn.setPointerCapture?.(e.pointerId);
      beginTouchKey(e.pointerId, key);
    });
    const release = (e) => endTouchKey(e.pointerId);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("lostpointercapture", release);

    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      requestLandscapeMode();
      if (updateOrientationGate()) return;
      Array.from(e.changedTouches).forEach((touch) => {
        beginTouchKey(touchKeyId(touch), key);
      });
    }, { passive: false });

    const releaseTouch = (e) => {
      Array.from(e.changedTouches).forEach((touch) => {
        endTouchKey(touchKeyId(touch));
      });
    };
    btn.addEventListener("touchend", releaseTouch);
    btn.addEventListener("touchcancel", releaseTouch);
  });

  function getTouchZoneKey(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (x < 0.5) {
      return x < 0.25 ? "ArrowLeft" : "ArrowRight";
    }
    if (x > 0.5) {
      return y < 0.5 ? "ArrowUp" : "ArrowDown";
    }
    return "";
  }

  function pressTouchZone(e) {
    if (e.pointerType === "mouse") return;
    if (e.target.closest?.("button")) return;

    const key = getTouchZoneKey(e);
    if (!key) return;

    e.preventDefault();
    requestLandscapeMode();
    if (updateOrientationGate()) return;
    canvas.setPointerCapture?.(e.pointerId);
    beginTouchKey(e.pointerId, key);
  }

  function moveTouchZone(e) {
    if (!activeTouchKeys.has(e.pointerId)) return;

    const previousKey = activeTouchKeys.get(e.pointerId);
    const nextKey = getTouchZoneKey(e);
    if (!nextKey || nextKey === previousKey) return;

    beginTouchKey(e.pointerId, nextKey);
  }

  function releaseTouchZone(e) {
    const key = activeTouchKeys.get(e.pointerId);
    if (!key) return;

    endTouchKey(e.pointerId);
  }

  canvas.addEventListener("pointerdown", pressTouchZone);
  canvas.addEventListener("pointermove", moveTouchZone);
  canvas.addEventListener("pointerup", releaseTouchZone);
  canvas.addEventListener("pointercancel", releaseTouchZone);
  canvas.addEventListener("lostpointercapture", releaseTouchZone);

  resizeCanvas();
  applyLanguage();
  updateOrientationGate();
  draw();
})();
