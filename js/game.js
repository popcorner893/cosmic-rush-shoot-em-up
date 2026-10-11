/**
 * Main Game Controller: State Machine, Wave Progression, Game Loop & UI Binding
 * Incorporates mechanisms inspired by Thetawave:
 * - Loot / Powerup drop collection (Blaster, Rapid Fire Overdrive, Kinetic Shield, Heal, Gems)
 * - Combo kill streak multiplier (x2, x3, x4)
 * - Quick non-intrusive alert toast that only appears at the start of boss encounters
 * - Intense haptic & camera vibration in the most difficult parts (Boss enrage, bullet hell, critical health)
 */

class CosmicRushEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = 650;
        this.height = 700;

        // Estados del Juego: 'LOGIN', 'PLAYING', 'PAUSED', 'GAME_OVER', 'VICTORY'
        this.state = 'LOGIN';

        // Perfil del Piloto
        this.pilot = {
            name: 'PILOTO-01',
            avatar: 'valkyrie'
        };

        // Entidades y Sistemas
        this.player = null;
        this.playerShots = [];
        this.enemies = [];
        this.enemyShots = [];
        this.powerups = [];
        this.boss = null;
        this.background = null;

        // Progresión de Oleada
        this.wave = 1;
        this.score = 0;
        this.enemiesRemainingToSpawn = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 1.4;

        // Mecanismo de Combo (Thetawave Kill Streak)
        this.combo = 0;
        this.comboTimer = 0;
        this.comboMaxTime = 3.2;

        // Alerta de Jefe breve
        this.bossAlertTimeout = null;

        // Entradas (Input)
        this.keys = {
            left: false,
            right: false,
            fire: false
        };
        this.autoFire = false;

        // Tiempo
        this.lastTime = 0;

        // Elementos del DOM
        this.dom = {};
    }

    // Inicialización del sistema
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.bindDOM();

        // Cargar piloto guardado si existe
        const savedPilot = window.StorageManager.getActivePilot();
        if (savedPilot) {
            this.pilot = savedPilot;
            if (this.dom.pilotInput) this.dom.pilotInput.value = this.pilot.name;
        }

        // Inicializar Fondo Parallax
        this.background = new window.ParallaxBackground(this.width, this.height);

        // Configurar Event Listeners
        this.setupInputListeners();

        // Renderizar Récords iniciales
        this.updateLeaderboardUI();
        this.updatePilotSelectionUI();

        // Bucle de renderizado principal
        requestAnimationFrame(this.loop.bind(this));
    }

    bindDOM() {
        this.dom = {
            loginOverlay: document.getElementById('loginOverlay'),
            hudOverlay: document.getElementById('hudOverlay'),
            gameOverModal: document.getElementById('gameOverModal'),
            victoryModal: document.getElementById('victoryModal'),
            leaderboardModal: document.getElementById('leaderboardModal'),
            pauseOverlay: document.getElementById('pauseOverlay'),
            bossWarningBanner: document.getElementById('bossWarningBanner'),
            dangerVignette: document.getElementById('dangerVignette'),
            loginShipContainer: document.getElementById('loginShipContainer'),
            loginHeroStatus: document.getElementById('loginHeroStatus'),
            loginShipPreview: document.getElementById('loginShipPreview'),
            
            // HUD elementos
            hudPilotName: document.getElementById('hudPilotName'),
            hudPilotBadge: document.getElementById('hudPilotBadge'),
            hudScore: document.getElementById('hudScore'),
            hudHighScore: document.getElementById('hudHighScore'),
            hudWave: document.getElementById('hudWave'),
            hudHearts: document.getElementById('hudHearts'),
            hudComboBadge: document.getElementById('hudComboBadge'),
            hudPowerupsBar: document.getElementById('hudPowerupsBar'),
            bossHealthContainer: document.getElementById('bossHealthContainer'),
            bossHealthFill: document.getElementById('bossHealthFill'),
            bossHealthText: document.getElementById('bossHealthText'),

            // Inputs
            pilotInput: document.getElementById('pilotInput'),
            avatarOptions: document.querySelectorAll('.avatar-card'),

            // Modales resultados
            finalScoreText: document.getElementById('finalScoreText'),
            finalWaveText: document.getElementById('finalWaveText'),
            newRecordBadge: document.getElementById('newRecordBadge'),
            victoryScoreText: document.getElementById('victoryScoreText'),
            victoryWaveText: document.getElementById('victoryWaveText'),
            recordsList: document.getElementById('recordsList')
        };
    }

    setupInputListeners() {
        window.addEventListener('keydown', (e) => {
            window.soundEngine.init();
            if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.keys.left = true;
                e.preventDefault();
            }
            if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.keys.right = true;
                e.preventDefault();
            }
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                this.keys.fire = true;
                e.preventDefault();
            }
            if (e.code === 'KeyP' || e.code === 'Escape') {
                this.togglePause();
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.keys.left = false;
            }
            if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.keys.right = false;
            }
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                this.keys.fire = false;
            }
        });

        // Controles táctiles
        const btnLeft = document.getElementById('touchLeft');
        const btnRight = document.getElementById('touchRight');
        const btnFire = document.getElementById('touchFire');
        const btnAutoFire = document.getElementById('btnAutoFire');

        const bindTouch = (elem, onStart, onEnd) => {
            if (!elem) return;
            const startHandler = (e) => {
                e.preventDefault();
                window.soundEngine.init();
                onStart();
            };
            const endHandler = (e) => {
                e.preventDefault();
                onEnd();
            };
            elem.addEventListener('mousedown', startHandler);
            elem.addEventListener('mouseup', endHandler);
            elem.addEventListener('mouseleave', endHandler);
            elem.addEventListener('touchstart', startHandler, { passive: false });
            elem.addEventListener('touchend', endHandler, { passive: false });
        };

        bindTouch(btnLeft, () => this.keys.left = true, () => this.keys.left = false);
        bindTouch(btnRight, () => this.keys.right = true, () => this.keys.right = false);
        bindTouch(btnFire, () => this.keys.fire = true, () => this.keys.fire = false);

        if (btnAutoFire) {
            btnAutoFire.addEventListener('click', () => {
                this.autoFire = !this.autoFire;
                btnAutoFire.classList.toggle('active', this.autoFire);
            });
        }

        if (this.dom.avatarOptions) {
            this.dom.avatarOptions.forEach(card => {
                card.addEventListener('click', () => {
                    const avatarId = card.getAttribute('data-avatar');
                    this.pilot.avatar = avatarId;
                    this.updatePilotSelectionUI();
                });
            });
        }

        const btnStartGame = document.getElementById('btnStartGame');
        if (btnStartGame) {
            btnStartGame.addEventListener('click', () => {
                this.confirmPilotAndStart();
            });
        }

        const btnShowLeaderboard = document.getElementById('btnShowLeaderboard');
        if (btnShowLeaderboard) {
            btnShowLeaderboard.addEventListener('click', () => {
                this.openLeaderboard();
            });
        }

        const btnCloseLeaderboard = document.getElementById('btnCloseLeaderboard');
        if (btnCloseLeaderboard) {
            btnCloseLeaderboard.addEventListener('click', () => {
                this.closeLeaderboard();
            });
        }

        const btnRestart = document.getElementById('btnRestart');
        if (btnRestart) {
            btnRestart.addEventListener('click', () => {
                this.startMission();
            });
        }

        const btnNextWave = document.getElementById('btnNextWave');
        if (btnNextWave) {
            btnNextWave.addEventListener('click', () => {
                this.dom.victoryModal.classList.add('hidden');
                this.nextWave();
            });
        }

        const btnBackToMenu = document.getElementById('btnBackToMenu');
        if (btnBackToMenu) {
            btnBackToMenu.addEventListener('click', () => {
                this.goToLogin();
            });
        }

        const btnResume = document.getElementById('btnResume');
        if (btnResume) {
            btnResume.addEventListener('click', () => {
                this.togglePause();
            });
        }

        const btnMute = document.getElementById('btnMuteSound');
        if (btnMute) {
            btnMute.addEventListener('click', () => {
                const unmuted = window.soundEngine.toggleMute();
                btnMute.innerHTML = unmuted ? '🔊' : '🔇';
                btnMute.classList.toggle('muted', !unmuted);
            });
        }
    }

    updatePilotSelectionUI() {
        if (!this.dom.avatarOptions) return;
        this.dom.avatarOptions.forEach(card => {
            const id = card.getAttribute('data-avatar');
            card.classList.toggle('selected', id === this.pilot.avatar);
        });

        const avatarInfo = window.StorageManager.AVATARS.find(a => a.id === this.pilot.avatar) || window.StorageManager.AVATARS[0];
        if (this.dom.loginShipContainer) {
            this.dom.loginShipContainer.style.borderColor = avatarInfo.color;
            this.dom.loginShipContainer.style.boxShadow = `0 0 24px ${avatarInfo.color}88, inset 0 0 16px ${avatarInfo.color}44`;
        }
        if (this.dom.loginHeroStatus) {
            this.dom.loginHeroStatus.innerText = `${avatarInfo.role.toUpperCase()} // ${avatarInfo.name}`;
            this.dom.loginHeroStatus.style.color = avatarInfo.color;
            this.dom.loginHeroStatus.style.borderColor = `${avatarInfo.color}88`;
            this.dom.loginHeroStatus.style.backgroundColor = `${avatarInfo.color}22`;
        }
    }

    confirmPilotAndStart() {
        const rawName = this.dom.pilotInput ? this.dom.pilotInput.value.trim() : '';
        this.pilot.name = rawName ? rawName.toUpperCase().slice(0, 14) : 'PILOTO-01';

        window.StorageManager.saveActivePilot(this.pilot);
        window.soundEngine.init();
        this.startMission();
    }

    startMission() {
        this.state = 'PLAYING';
        this.wave = 1;
        this.score = 0;
        this.combo = 0;
        this.comboTimer = 0;

        this.dom.loginOverlay.classList.add('hidden');
        this.dom.gameOverModal.classList.add('hidden');
        this.dom.victoryModal.classList.add('hidden');
        this.dom.pauseOverlay.classList.add('hidden');
        this.dom.hudOverlay.classList.remove('hidden');
        if (this.dom.dangerVignette) this.dom.dangerVignette.classList.remove('active');

        const avatarInfo = window.StorageManager.AVATARS.find(a => a.id === this.pilot.avatar) || window.StorageManager.AVATARS[0];

        this.player = new window.Player(this.width / 2, this.height, avatarInfo);
        this.playerShots = [];
        this.enemies = [];
        this.enemyShots = [];
        this.powerups = [];
        this.boss = null;
        window.particleSystem.clear();
        if (window.canvasShake) window.canvasShake.reset();

        this.dom.hudPilotName.innerText = this.pilot.name;
        this.dom.hudPilotBadge.innerText = avatarInfo.insignia;
        this.dom.hudPilotBadge.style.color = avatarInfo.color;

        this.setupWave(1);
    }

    setupWave(w) {
        this.wave = w;
        this.enemiesRemainingToSpawn = 7 + w * 3;
        this.spawnedCountInWave = 0;
        this.enemySpawnTimer = 0.5;
        this.enemySpawnInterval = Math.max(0.7, 1.5 - w * 0.12);
        this.boss = null;
        this.background.setBossMode(false);
        this.dom.bossHealthContainer.classList.add('hidden');
        this.dom.bossWarningBanner.classList.add('hidden');
        if (this.bossAlertTimeout) clearTimeout(this.bossAlertTimeout);

        this.updateHUD();
        window.particleSystem.addFloatingText(this.width / 2, this.height / 2 - 40, `¡OLEADA ${this.wave}!`, '#00f0ff');
    }

    nextWave() {
        this.state = 'PLAYING';
        this.playerShots = [];
        this.enemyShots = [];
        this.powerups = [];
        this.setupWave(this.wave + 1);
    }

    // Activación del Jefe: aviso rápido que solo sale al principio y no estorba
    triggerBossPhase() {
        this.background.setBossMode(true);
        window.soundEngine.playBossAlarm();

        // Alerta solo al principio (se oculta sola en 1.4s)
        this.dom.bossWarningBanner.classList.remove('hidden');
        window.particleSystem.triggerVibrate(7, 0.25, [70]);

        if (this.bossAlertTimeout) clearTimeout(this.bossAlertTimeout);
        this.bossAlertTimeout = setTimeout(() => {
            this.dom.bossWarningBanner.classList.add('hidden');
        }, 1400);

        // Desplegar jefe inmediatamente
        this.spawnBoss();
    }

    spawnBoss() {
        this.boss = new window.FinalBoss(this.width, this.wave);
        this.dom.bossHealthContainer.classList.remove('hidden');
        this.updateBossHealthUI();
    }

    updateBossHealthUI() {
        if (!this.boss) return;
        const pct = Math.max(0, Math.min(100, (this.boss.life / this.boss.maxLife) * 100));
        this.dom.bossHealthFill.style.width = `${pct}%`;
        this.dom.bossHealthText.innerText = `${Math.ceil(this.boss.life)} / ${this.boss.maxLife} HP`;
    }

    // Bucle Principal
    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        if (this.state === 'PLAYING') {
            this.update(dt);
        } else if (this.state === 'LOGIN') {
            if (this.background) {
                this.background.update(dt * 0.4);
            }
        }

        this.draw();

        requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        this.background.update(dt);
        window.particleSystem.update(dt);
        if (window.canvasShake) {
            window.canvasShake.update(dt);
        }

        // Actualizar combo de bajas (Thetawave kill streak)
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.updateHUD();
            }
        }

        // Detección de momentos difíciles para vibración visual / viñeta de peligro
        const isCriticalLife = this.player && this.player.lives === 1;
        const isBossEnraged = this.boss && this.boss.enraged;
        if (this.dom.dangerVignette) {
            if (isCriticalLife || isBossEnraged) {
                this.dom.dangerVignette.classList.add('active');
            } else {
                this.dom.dangerVignette.classList.remove('active');
            }
        }

        // Jugador
        if (this.player) {
            this.player.update(dt, this.keys, this.width);

            if ((this.keys.fire || this.autoFire) && this.player.canShoot()) {
                const shots = this.player.shoot();
                if (shots && shots.length > 0) {
                    this.playerShots.push(...shots);
                }
            }

            if (this.player.lives <= 0 && this.state !== 'GAME_OVER') {
                this.gameOver();
                return;
            }
        }

        // Proyectiles del jugador
        for (let i = this.playerShots.length - 1; i >= 0; i--) {
            const shot = this.playerShots[i];
            shot.update(dt);
            if (shot.isOffScreen()) {
                this.playerShots.splice(i, 1);
            }
        }

        // Spawning de Enemigos Estándar y Enemigos Élite
        if (this.enemiesRemainingToSpawn > 0) {
            this.enemySpawnTimer -= dt;
            if (this.enemySpawnTimer <= 0) {
                this.enemySpawnTimer = this.enemySpawnInterval;
                const startX = 60 + Math.random() * (this.width - 120);
                this.spawnedCountInWave++;

                // Cada 4to enemigo generado es un Enemigo Élite (100% de drop de power-up)
                const isElite = (this.spawnedCountInWave % 4 === 0);
                if (isElite) {
                    this.enemies.push(new window.EliteEnemy(startX, -55, this.wave));
                    window.particleSystem.addFloatingText(startX, 60, '👑 ¡ENEMIGO ÉLITE DETECTADO!', '#ffd700');
                    if (window.soundEngine.playBossHit) window.soundEngine.playBossHit();
                } else {
                    this.enemies.push(new window.Enemy(startX, -50, this.wave));
                }
                this.enemiesRemainingToSpawn--;
            }
        }

        // Actualizar Enemigos Estándar y Élite
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt, this.width);

            if (enemy.canShoot()) {
                const eShot = enemy.shoot();
                if (Array.isArray(eShot)) {
                    this.enemyShots.push(...eShot);
                } else if (eShot) {
                    this.enemyShots.push(eShot);
                }
            }

            // Sale de pantalla sin sumar puntos
            if (enemy.isOffScreen(this.height)) {
                this.enemies.splice(i, 1);
                continue;
            }

            // Enemigo destruido
            if (enemy.isDead()) {
                // Multiplicador de combo
                this.combo++;
                this.comboTimer = this.comboMaxTime;
                const comboMult = Math.min(4, 1 + Math.floor(this.combo / 3));
                this.score += enemy.points * comboMult;
                if (comboMult > 1) {
                    window.particleSystem.addFloatingText(enemy.x + enemy.width / 2, enemy.y - 12, `COMBO x${comboMult}!`, '#ffd700');
                }
                this.updateHUD();
                this.enemies.splice(i, 1);
                continue;
            }

            // Colisión directa con La Medusa
            if (!enemy.isDying && this.player && !this.player.isDead && this.checkCollision(enemy, this.player)) {
                this.player.takeDamage();
                this.combo = 0; // Se rompe el combo al recibir daño
                enemy.takeHit();
                this.updateHUD();
            }
        }

        // Comprobar si la horda fue derrotada y activar el Jefe
        if (this.enemiesRemainingToSpawn === 0 && this.enemies.length === 0 && !this.boss && this.state === 'PLAYING') {
            this.triggerBossPhase();
            return;
        }

        // Actualizar Jefe Final
        if (this.boss) {
            const bossShots = this.boss.update(dt, this.player.x + this.player.width / 2, this.player.y, this.width);
            if (bossShots && bossShots.length > 0) {
                this.enemyShots.push(...bossShots);
            }
            this.updateBossHealthUI();

            if (!this.boss.isDying && this.player && !this.player.isDead && this.checkCollision(this.boss, this.player)) {
                this.player.takeDamage();
                this.combo = 0;
                this.updateHUD();
            }

            // Jefe derrotado
            if (this.boss.isDead()) {
                this.score += this.boss.points;
                const lifeBonus = this.player.lives * 250;
                this.score += lifeBonus;

                // Suelta múltiples power-ups al morir (Mecanismo Thetawave)
                this.powerups.push(new window.Powerup(this.boss.x + 10, this.boss.y, 'BLASTER'));
                this.powerups.push(new window.Powerup(this.boss.x + 35, this.boss.y, 'SHIELD'));
                this.powerups.push(new window.Powerup(this.boss.x + 60, this.boss.y, 'HEAL'));

                this.boss = null;
                this.dom.bossHealthContainer.classList.add('hidden');
                this.updateHUD();
                this.waveVictory(lifeBonus);
                return;
            }
        }

        // Actualizar Proyectiles Enemigos
        for (let i = this.enemyShots.length - 1; i >= 0; i--) {
            const eShot = this.enemyShots[i];
            eShot.update(dt);

            if (this.player && !this.player.isDead && this.checkCollision(eShot, this.player)) {
                this.player.takeDamage();
                this.combo = 0;
                this.enemyShots.splice(i, 1);
                this.updateHUD();
                continue;
            }

            if (eShot.isOffScreen(this.width, this.height)) {
                this.enemyShots.splice(i, 1);
            }
        }

        // Colisión: Proyectiles del jugador vs Enemigos Estándar
        for (let i = this.playerShots.length - 1; i >= 0; i--) {
            const pShot = this.playerShots[i];
            let hit = false;

            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (!enemy.isDying && this.checkCollision(pShot, enemy)) {
                    const drop = enemy.takeHit();
                    // Si soltó un Power-up de Thetawave, lo agregamos al mapa
                    if (drop instanceof window.Powerup) {
                        this.powerups.push(drop);
                    }
                    this.playerShots.splice(i, 1);
                    hit = true;
                    break;
                }
            }

            if (hit) continue;

            // Colisión con el Jefe Final
            if (this.boss && !this.boss.isDying && this.checkCollision(pShot, this.boss)) {
                this.boss.takeHit();
                this.score += 15;
                this.updateHUD();
                this.playerShots.splice(i, 1);
            }
        }

        // Actualizar Power-ups y Detección de Recolección (Mecanismo Thetawave & Élite)
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            const px = this.player ? this.player.x + this.player.width / 2 : undefined;
            const py = this.player ? this.player.y + this.player.height / 2 : undefined;
            p.update(dt, px, py);

            if (this.player && !this.player.isDead && this.checkCollision(p, this.player)) {
                this.player.applyPowerup(p);
                this.score += 200;
                this.updateHUD();
                this.powerups.splice(i, 1);
                continue;
            }

            if (p.isOffScreen(this.height)) {
                this.powerups.splice(i, 1);
            }
        }
    }

    checkCollision(rect1, rect2) {
        const padding = 6;
        return (
            rect1.x + padding < rect2.x + rect2.width - padding &&
            rect1.x + rect1.width - padding > rect2.x + padding &&
            rect1.y + padding < rect2.y + rect2.height - padding &&
            rect1.y + rect1.height - padding > rect2.y + padding
        );
    }

    draw() {
        // Desplazamiento global del contexto del canvas basado en canvasShake (trauma²)
        const shake = window.canvasShake ? window.canvasShake.getDisplacement() : window.particleSystem.getShakeOffset();
        this.ctx.save();
        this.ctx.translate(shake.x, shake.y);

        this.background.draw(this.ctx);

        if (this.state !== 'LOGIN') {
            // Power-ups en el espacio
            this.powerups.forEach(p => p.draw(this.ctx));

            // Proyectiles
            this.playerShots.forEach(s => s.draw(this.ctx));
            this.enemyShots.forEach(s => s.draw(this.ctx));

            // Enemigos estándar
            this.enemies.forEach(e => e.draw(this.ctx));

            // Jefe Final
            if (this.boss) {
                this.boss.draw(this.ctx);
            }

            // Jugador
            if (this.player) {
                this.player.draw(this.ctx);
            }

            // Partículas
            window.particleSystem.draw(this.ctx);
        }

        this.ctx.restore();
    }

    updateHUD() {
        if (!this.dom.hudScore) return;
        this.dom.hudScore.innerText = String(this.score).padStart(6, '0');
        this.dom.hudWave.innerText = `OLEADA ${this.wave}`;

        // Vidas
        if (this.player) {
            let heartsStr = '';
            for (let i = 0; i < 3; i++) {
                heartsStr += (i < this.player.lives) ? '❤️ ' : '🖤 ';
            }
            this.dom.hudHearts.innerText = heartsStr.trim();

            // Barra de Power-ups activos en HUD con temporizadores en tiempo real
            if (this.dom.hudPowerupsBar) {
                let pillsHtml = '';
                if (this.player.blasterLevel === 3) {
                    const sec = Math.ceil(this.player.tripleShotTimer || 0);
                    pillsHtml += `<span class="powerup-pill" style="color: #00f0ff; border-color: #00f0ff; text-shadow: 0 0 6px #00f0ff;">🔱 DISPARO TRIPLE ${sec > 0 ? `(${sec}s)` : ''}</span>`;
                } else if (this.player.blasterLevel === 2) {
                    pillsHtml += `<span class="powerup-pill" style="color: #00f0ff; border-color: #00f0ff;">⚡ DOBLE LÁSER</span>`;
                }

                if (this.player.hasShield) {
                    const sec = Math.ceil(this.player.shieldTimer || 0);
                    pillsHtml += `<span class="powerup-pill" style="color: #39ff14; border-color: #39ff14; text-shadow: 0 0 6px #39ff14;">🛡️ ESCUDO ${sec > 0 ? `(${sec}s)` : ''}</span>`;
                }

                if (this.player.rapidFireTimer > 0) {
                    const sec = Math.ceil(this.player.rapidFireTimer);
                    pillsHtml += `<span class="powerup-pill" style="color: #ff9900; border-color: #ff9900; text-shadow: 0 0 6px #ff9900;">⏱️ RAPID FIRE (${sec}s)</span>`;
                }
                this.dom.hudPowerupsBar.innerHTML = pillsHtml;
            }
        }

        // Medidor de Combo de Bajas
        if (this.dom.hudComboBadge) {
            if (this.combo >= 2) {
                const mult = Math.min(4, 1 + Math.floor(this.combo / 3));
                this.dom.hudComboBadge.innerText = `🔥 COMBO x${mult} (${this.combo})`;
                this.dom.hudComboBadge.classList.remove('hidden');
            } else {
                this.dom.hudComboBadge.classList.add('hidden');
            }
        }

        // Récord
        const scores = window.StorageManager.getHighScores();
        const topScore = scores.length > 0 ? scores[0].score : 0;
        this.dom.hudHighScore.innerText = String(Math.max(this.score, topScore)).padStart(6, '0');
    }

    waveVictory(bonus) {
        this.state = 'VICTORY';
        window.soundEngine.playVictory();
        window.particleSystem.triggerVibrate(15, 0.8, [150, 70, 200]);

        this.dom.victoryModal.classList.remove('hidden');
        this.dom.victoryScoreText.innerText = `${this.score} PTS`;
        this.dom.victoryWaveText.innerText = `Superada Oleada ${this.wave} (Bonus Vidas: +${bonus})`;
    }

    gameOver() {
        this.state = 'GAME_OVER';
        window.soundEngine.playGameOver();
        window.particleSystem.triggerVibrate(16, 0.7, [180, 80, 240]);

        const result = window.StorageManager.saveScore(this.pilot.name, this.pilot.avatar, this.score, this.wave);

        this.dom.gameOverModal.classList.remove('hidden');
        this.dom.finalScoreText.innerText = `${this.score} PTS`;
        this.dom.finalWaveText.innerText = `Alcanzaste la Oleada ${this.wave}`;

        if (result.isNewHigh) {
            this.dom.newRecordBadge.classList.remove('hidden');
        } else {
            this.dom.newRecordBadge.classList.add('hidden');
        }

        this.updateLeaderboardUI();
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.dom.pauseOverlay.classList.remove('hidden');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.dom.pauseOverlay.classList.add('hidden');
        }
    }

    goToLogin() {
        this.state = 'LOGIN';
        this.dom.gameOverModal.classList.add('hidden');
        this.dom.victoryModal.classList.add('hidden');
        this.dom.pauseOverlay.classList.add('hidden');
        this.dom.hudOverlay.classList.add('hidden');
        this.dom.loginOverlay.classList.remove('hidden');
        if (this.dom.dangerVignette) this.dom.dangerVignette.classList.remove('active');
        if (window.canvasShake) window.canvasShake.reset();
        this.updateLeaderboardUI();
    }

    openLeaderboard() {
        this.updateLeaderboardUI();
        this.dom.leaderboardModal.classList.remove('hidden');
    }

    closeLeaderboard() {
        this.dom.leaderboardModal.classList.add('hidden');
    }

    updateLeaderboardUI() {
        if (!this.dom.recordsList) return;
        const scores = window.StorageManager.getHighScores();
        this.dom.recordsList.innerHTML = '';

        if (scores.length === 0) {
            this.dom.recordsList.innerHTML = '<li class="empty-notice">No hay récords registrados todavía. ¡Sé el primero!</li>';
            return;
        }

        scores.slice(0, 10).forEach((entry, idx) => {
            const li = document.createElement('li');
            li.className = `record-row ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`;

            const rankBadge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            const avatar = window.StorageManager.AVATARS.find(a => a.id === entry.pilotAvatar) || window.StorageManager.AVATARS[0];

            li.innerHTML = `
                <div class="record-rank">${rankBadge}</div>
                <div class="record-pilot">
                    <span class="pilot-insignia" style="color: ${avatar.color}">${avatar.insignia}</span>
                    <span class="pilot-name">${entry.pilotName}</span>
                </div>
                <div class="record-wave">OL. ${entry.wave}</div>
                <div class="record-score">${entry.score.toLocaleString()} PTS</div>
                <div class="record-date">${entry.date || ''}</div>
            `;
            this.dom.recordsList.appendChild(li);
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new CosmicRushEngine();
    window.gameEngine.init();
});
