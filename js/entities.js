/**
 * Game Entities: Player ("La Medusa"), Bullets, Enemies, Boss, Powerups & Parallax
 * Incorporates mechanisms inspired by Thetawave:
 * - Loot / Powerup drops (Blaster upgrades, Rapid Fire Overdrive, Kinetic Shield, Nanobot repairs, Energy Gems)
 * - Dynamic haptic/screen vibrations during difficult phases (Boss enrage, bullet hell, critical health)
 */

// ==========================================
// 1. PROTAGONISTA: LA MEDUSA (PLAYER)
// ==========================================
class Player {
    constructor(x, y, avatarConfig) {
        this.width = 56;
        this.height = 66;
        this.x = x - this.width / 2;
        this.y = y - this.height - 20;
        this.speed = 6.5;
        this.lives = 3;
        this.maxLives = 3;
        this.invulnerableTimer = 0;
        this.avatarConfig = avatarConfig || { color: '#00f0ff', insignia: '⚡' };
        
        // Cooldown y Mecánicas de Disparo (Thetawave Blaster System)
        this.shotCooldown = 0;
        this.baseShotInterval = 0.16;
        this.blasterLevel = 1; // 1: Simple, 2: Doble paralelo, 3: Triple abanico
        this.tripleShotTimer = 0; // Temporizador de disparo triple
        this.rapidFireTimer = 0; // Temporizador de sobrecarga rápida
        this.hasShield = false; // Escudo cinético protector (absorbe 1 impacto completo)
        this.shieldTimer = 0; // Temporizador del escudo temporal (en segundos)

        // Sprites
        this.sprite = new Image();
        this.sprite.src = 'images/bueno.png';
        this.killedSprite = new Image();
        this.killedSprite.src = 'images/bueno_muerto.png';

        this.isDead = false;
        this.respawnTimer = 0;
        this.thrusterTimer = 0;
        this.criticalHeartbeatTimer = 0;
    }

    update(dt, keys, canvasWidth) {
        if (this.isDead) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.isDead = false;
                this.invulnerableTimer = 2.0; // 2s de escudo protector tras reaparecer
            }
            return;
        }

        // Movimiento horizontal fluido
        if (keys.left && this.x > 8) {
            this.x -= this.speed * dt * 60;
        }
        if (keys.right && this.x < canvasWidth - this.width - 8) {
            this.x += this.speed * dt * 60;
        }

        // Delimitación
        this.x = Math.max(8, Math.min(canvasWidth - this.width - 8, this.x));

        // Partículas del propulsor de energía (se potencian si está en sobrecarga rápida)
        this.thrusterTimer += dt;
        if (this.thrusterTimer > 0.04) {
            this.thrusterTimer = 0;
            window.particleSystem.createThrusterFlame(this.x + this.width / 2, this.y + this.height - 4);
        }

        // Temporizadores de powerups
        if (this.shotCooldown > 0) this.shotCooldown -= dt;
        if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
        if (this.rapidFireTimer > 0) this.rapidFireTimer -= dt;

        // Temporizador de escudo temporal
        if (this.hasShield && this.shieldTimer > 0) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.hasShield = false;
                window.particleSystem.addFloatingText(this.x + this.width / 2, this.y - 12, 'ESCUDO AGOTADO', '#94a3b8');
            }
        }

        // Temporizador de disparo triple
        if (this.tripleShotTimer > 0) {
            this.tripleShotTimer -= dt;
            if (this.tripleShotTimer <= 0 && this.blasterLevel === 3) {
                this.blasterLevel = 2; // Desciende a cañón doble
                window.particleSystem.addFloatingText(this.x + this.width / 2, this.y - 12, 'DISPARO TRIPLE EXPIRADO', '#94a3b8');
            }
        }

        // Vibración háptica periódica de latido si la vida es crítica (1 corazón restante)
        if (this.lives === 1) {
            this.criticalHeartbeatTimer += dt;
            if (this.criticalHeartbeatTimer >= 1.5) {
                this.criticalHeartbeatTimer = 0;
                window.particleSystem.triggerVibrate(3, 0.15, [40]);
                window.soundEngine.playCriticalWarning();
            }
        } else {
            this.criticalHeartbeatTimer = 0;
        }
    }

    canShoot() {
        return !this.isDead && this.shotCooldown <= 0;
    }

    shoot() {
        if (!this.canShoot()) return [];
        const interval = this.rapidFireTimer > 0 ? 0.08 : this.baseShotInterval;
        this.shotCooldown = interval;
        window.soundEngine.playPlayerShoot();

        const shots = [];
        const cx = this.x + this.width / 2;
        const cy = this.y - 12;
        const isOverdrive = this.rapidFireTimer > 0;

        if (this.blasterLevel === 1) {
            // Nivel 1: Disparo simple vertical
            shots.push(new PlayerShot(cx - 9, cy, 0, 12, isOverdrive));
        } else if (this.blasterLevel === 2) {
            // Nivel 2: Doble cañón de plasma paralelo
            shots.push(new PlayerShot(cx - 18, cy, 0, 12, isOverdrive));
            shots.push(new PlayerShot(cx, cy, 0, 12, isOverdrive));
        } else {
            // Nivel 3: Triple cañón con dispersión angular (Disparo Triple Élite)
            shots.push(new PlayerShot(cx - 9, cy, 0, 12, isOverdrive));
            shots.push(new PlayerShot(cx - 18, cy, -2.4, 11.5, isOverdrive));
            shots.push(new PlayerShot(cx, cy, 2.4, 11.5, isOverdrive));
        }

        return shots;
    }

    // Recoger Powerup
    applyPowerup(powerup) {
        window.soundEngine.playPowerup();
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        switch (powerup.type) {
            case 'TRIPLE_SHOT':
            case 'BLASTER':
                this.blasterLevel = 3;
                this.tripleShotTimer = 18.0; // 18 segundos de disparo triple garantizado
                window.particleSystem.createLaserSparks(cx, cy, '#00f0ff');
                window.particleSystem.addFloatingText(cx, cy - 15, '🔱 ¡DISPARO TRIPLE ACTIVADO!', '#00f0ff');
                break;
            case 'SHIELD':
                this.hasShield = true;
                this.shieldTimer = 16.0; // 16 segundos de escudo temporal o absorción de impacto
                window.particleSystem.createLaserSparks(cx, cy, '#39ff14');
                window.particleSystem.addFloatingText(cx, cy - 15, '🛡️ ¡ESCUDO TEMPORAL ACTIVADO!', '#39ff14');
                break;
            case 'RAPID':
                this.rapidFireTimer = 10.0; // 10 segundos de sobrecarga
                window.particleSystem.createLaserSparks(cx, cy, '#ff9900');
                window.particleSystem.addFloatingText(cx, cy - 15, '⏱️ ¡SOBRECARGA RÁPIDA!', '#ff9900');
                break;
            case 'HEAL':
                if (this.lives < this.maxLives) {
                    this.lives++;
                    window.particleSystem.createLaserSparks(cx, cy, '#ff0077');
                    window.particleSystem.addFloatingText(cx, cy - 15, '🔧 +1 VIDA RESTAURADA', '#ff0077');
                } else {
                    window.particleSystem.addFloatingText(cx, cy - 15, '+350 PTS (VIDA MÁXIMA)', '#ffd700');
                }
                break;
            case 'EMP':
                if (window.soundEngine.playBossExplosion) window.soundEngine.playBossExplosion();
                if (window.canvasShake) window.canvasShake.addTrauma(0.55);
                window.particleSystem.createExplosion(cx, cy, 45, ['#b026ff', '#00f0ff', '#ffffff']);
                window.particleSystem.addFloatingText(cx, cy - 18, '💣 ¡PULSO EMP DESATADO!', '#b026ff');
                if (window.gameEngine) {
                    window.gameEngine.enemyShots = [];
                    window.gameEngine.enemies.forEach(e => {
                        if (!e.isDying) e.takeHit();
                    });
                }
                break;
            case 'GEM':
                window.particleSystem.createLaserSparks(cx, cy, '#ffd700');
                window.particleSystem.addFloatingText(cx, cy - 15, '💎 +500 GEM BONUS', '#ffd700');
                break;
        }
    }

    takeDamage() {
        if (this.invulnerableTimer > 0 || this.isDead) return false;

        // Mecanismo de Escudo Cinético de Thetawave: absorbe el impacto completamente
        if (this.hasShield) {
            this.hasShield = false;
            window.soundEngine.playShieldDeflect();
            if (window.canvasShake) window.canvasShake.addTrauma(0.4);
            window.particleSystem.createExplosion(this.x + this.width / 2, this.y + this.height / 2, 16, ['#39ff14', '#ffffff']);
            window.particleSystem.addFloatingText(this.x + this.width / 2, this.y - 10, '¡ESCUDO ABSORBIÓ DAÑO!', '#39ff14');
            this.invulnerableTimer = 0.8;
            return false;
        }

        this.lives--;

        // Sacudida global del canvas en momentos de daño
        if (this.lives <= 1) {
            // Última vida: sacudida intensa de emergencia
            window.soundEngine.playCriticalWarning();
            if (window.canvasShake) window.canvasShake.addTrauma(0.9);
            window.particleSystem.addFloatingText(this.x + this.width / 2, this.y - 10, '⚠️ ¡ALERTA: INTEGRIDAD CRÍTICA!', '#ff0033');
        } else {
            if (window.canvasShake) window.canvasShake.addTrauma(0.65);
        }

        window.soundEngine.playPlayerHit();
        window.particleSystem.createExplosion(this.x + this.width / 2, this.y + this.height / 2, 28, ['#00f0ff', '#ff3366', '#ffffff']);

        // Degradar 1 nivel de blaster si se es impactado
        if (this.blasterLevel > 1) {
            this.blasterLevel--;
        }

        if (this.lives > 0) {
            this.isDead = true;
            this.respawnTimer = 0.6; // Breve pausa tras impacto
        } else {
            if (window.canvasShake) window.canvasShake.addTrauma(1.0);
        }
        return true;
    }

    draw(ctx) {
        ctx.save();
        if (this.isDead) {
            ctx.drawImage(this.killedSprite, this.x, this.y, this.width, this.height);
            ctx.restore();
            return;
        }

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        // Efecto de parpadeo si es invulnerable tras renacer
        if (this.invulnerableTimer > 0) {
            const blink = Math.floor(this.invulnerableTimer * 14) % 2 === 0;
            if (blink) {
                ctx.globalAlpha = 0.4;
            }
            // Anillo protector temporal
            ctx.beginPath();
            ctx.arc(cx, cy, this.width / 2 + 8, 0, Math.PI * 2);
            ctx.strokeStyle = this.avatarConfig.color || '#00f0ff';
            ctx.lineWidth = 2;
            ctx.shadowColor = this.avatarConfig.color || '#00f0ff';
            ctx.shadowBlur = 10;
            ctx.stroke();
        }

        // Efecto visual de Escudo Cinético Activo (Thetawave Shield)
        if (this.hasShield) {
            ctx.beginPath();
            ctx.arc(cx, cy, this.width / 2 + 10, 0, Math.PI * 2);
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#39ff14';
            ctx.shadowBlur = 14;
            ctx.stroke();

            // Resplandor interior
            ctx.beginPath();
            ctx.arc(cx, cy, this.width / 2 + 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
            ctx.fill();
        }

        // Aura de Sobrecarga Rápida (Rapid Fire)
        if (this.rapidFireTimer > 0) {
            ctx.shadowColor = '#ff9900';
            ctx.shadowBlur = 16;
        } else {
            ctx.shadowColor = this.avatarConfig.color || '#00f0ff';
            ctx.shadowBlur = 8;
        }

        ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);

        ctx.restore();
    }
}

// ==========================================
// 2. PROYECTIL DEL JUGADOR
// ==========================================
class PlayerShot {
    constructor(x, y, vx = 0, vy = 12, isOverdrive = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = 18;
        this.height = 18;
        this.isOverdrive = isOverdrive;
        this.sprite = new Image();
        this.sprite.src = 'images/disparo_bueno.png';
    }

    update(dt) {
        this.x += this.vx * dt * 60;
        this.y -= this.vy * dt * 60;
    }

    isOffScreen() {
        return this.y < -30 || this.x < -30 || this.x > 700;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = this.isOverdrive ? '#ff9900' : '#00f0ff';
        ctx.shadowBlur = this.isOverdrive ? 14 : 9;
        ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
        ctx.restore();
    }
}

// ==========================================
// 3. ENEMIGO ESTÁNDAR: BICHOS (ZIG-ZAG)
// ==========================================
class Enemy {
    constructor(startX, startY, wave = 1) {
        this.width = 57;
        this.height = 39;
        this.x = startX;
        this.y = startY;
        this.originX = startX;
        
        // Movimiento en Zig-Zag
        this.speedY = 1.6 + Math.min(2.5, wave * 0.35);
        this.zigzagAmplitude = 50 + Math.random() * 45;
        this.zigzagFrequency = 2.4 + Math.random() * 1.5;
        this.time = Math.random() * Math.PI * 2;

        this.life = 1 + (wave >= 3 ? 1 : 0);
        this.maxLife = this.life;
        this.points = 100 * wave;
        this.wave = wave;

        this.shootCooldown = 1.2 + Math.random() * 3.0 / Math.sqrt(wave);

        // Animación de 8 fotogramas
        this.frames = [];
        for (let i = 1; i <= 8; i++) {
            const img = new Image();
            img.src = `images/malo${i}.png`;
            this.frames.push(img);
        }
        this.currentFrame = Math.floor(Math.random() * 8);
        this.animTimer = 0;

        this.deadSprite = new Image();
        this.deadSprite.src = 'images/malo_muerto.png';
        this.isDying = false;
        this.dyingTimer = 0;
    }

    update(dt, canvasWidth) {
        if (this.isDying) {
            this.dyingTimer -= dt;
            return;
        }

        this.time += dt * this.zigzagFrequency;
        this.y += this.speedY * dt * 60;
        this.x = this.originX + Math.sin(this.time) * this.zigzagAmplitude;

        this.x = Math.max(10, Math.min(canvasWidth - this.width - 10, this.x));

        this.animTimer += dt;
        if (this.animTimer > 0.1) {
            this.animTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
        }

        this.shootCooldown -= dt;
    }

    canShoot() {
        return !this.isDying && this.shootCooldown <= 0 && this.y > 20 && this.y < 520;
    }

    shoot() {
        this.shootCooldown = 2.0 + Math.random() * 3.5 / Math.sqrt(this.wave);
        window.soundEngine.playEnemyShoot();
        return new EnemyShot(this.x + this.width / 2 - 7, this.y + this.height);
    }

    takeHit() {
        this.life--;
        if (this.life <= 0) {
            this.isDying = true;
            this.dyingTimer = 0.12;
            window.soundEngine.playEnemyExplode();
            window.particleSystem.createExplosion(this.x + this.width / 2, this.y + this.height / 2, 22, ['#ff0055', '#ff9900', '#ffff00']);
            window.particleSystem.addFloatingText(this.x + this.width / 2, this.y, `+${this.points}`);

            // Mecanismo de Loot de Thetawave: 25% de probabilidad de soltar un power-up
            if (Math.random() < 0.25) {
                const types = ['BLASTER', 'RAPID', 'SHIELD', 'HEAL', 'GEM'];
                const chosen = types[Math.floor(Math.random() * types.length)];
                return new Powerup(this.x + this.width / 2 - 14, this.y + this.height / 2, chosen);
            }
            return true;
        } else {
            window.soundEngine.playEnemyHit();
            window.particleSystem.createLaserSparks(this.x + this.width / 2, this.y + this.height / 2, '#ff3366');
            return false;
        }
    }

    isOffScreen(canvasHeight) {
        return this.y > canvasHeight + 40;
    }

    isDead() {
        return this.isDying && this.dyingTimer <= 0;
    }

    draw(ctx) {
        ctx.save();
        if (this.isDying) {
            ctx.drawImage(this.deadSprite, this.x, this.y, this.width, this.height);
        } else {
            const frame = this.frames[this.currentFrame];
            if (frame && frame.complete) {
                ctx.drawImage(frame, this.x, this.y, this.width, this.height);
            }
        }
        ctx.restore();
    }
}

// ==========================================
// 4. ENEMIGO ÉLITE (ELITE ENEMY - 100% DROP DE POWER-UP)
// ==========================================
class EliteEnemy extends Enemy {
    constructor(startX, startY, wave = 1) {
        super(startX, startY, wave);
        this.isElite = true;
        this.width = 66;
        this.height = 46;
        this.life = 4 + Math.floor(wave * 0.7);
        this.maxLife = this.life;
        this.points = 350 * wave;
        this.speedY = 1.25 + Math.min(1.8, wave * 0.2);
        this.zigzagAmplitude = 65;
        this.shootCooldown = 1.0;
        this.auraTime = 0;
    }

    update(dt, canvasWidth) {
        super.update(dt, canvasWidth);
        this.auraTime += dt * 4.5;
    }

    shoot() {
        this.shootCooldown = 1.8 + Math.random() * 1.5;
        window.soundEngine.playEnemyShoot();
        // Disparo doble convergente de plasma
        return [
            new EnemyShot(this.x + 10, this.y + this.height, -1.0, 5.2),
            new EnemyShot(this.x + this.width - 24, this.y + this.height, 1.0, 5.2)
        ];
    }

    takeHit() {
        this.life--;
        if (this.life <= 0) {
            this.isDying = true;
            this.dyingTimer = 0.22;
            window.soundEngine.playEnemyExplode();
            if (window.canvasShake) window.canvasShake.addTrauma(0.45);
            window.particleSystem.createExplosion(this.x + this.width / 2, this.y + this.height / 2, 36, ['#ffd700', '#ff0077', '#00f0ff', '#ffffff']);
            window.particleSystem.addFloatingText(this.x + this.width / 2, this.y - 14, `¡ÉLITE DESTRUIDO! +${this.points}`, '#ffd700');

            // 100% GARANTÍA DE DROP DE POWER-UP DE ALTO NIVEL (Disparo Triple o Escudo Temporal)
            const eliteDrops = ['TRIPLE_SHOT', 'SHIELD', 'TRIPLE_SHOT', 'SHIELD', 'RAPID', 'HEAL', 'EMP'];
            const chosen = eliteDrops[Math.floor(Math.random() * eliteDrops.length)];
            return new Powerup(this.x + this.width / 2 - 15, this.y + this.height / 2, chosen);
        } else {
            window.soundEngine.playEnemyHit();
            window.particleSystem.createLaserSparks(this.x + this.width / 2, this.y + this.height / 2, '#ffd700');
            return false;
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.isDying) {
            ctx.drawImage(this.deadSprite, this.x, this.y, this.width, this.height);
        } else {
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const pulse = 1 + Math.sin(this.auraTime) * 0.08;

            // Halo y brillo dorado de élite
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 16;

            ctx.beginPath();
            ctx.arc(cx, cy, (this.width / 2) * pulse + 3, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Dibujar fotograma animado
            const frame = this.frames[this.currentFrame];
            if (frame && frame.complete) {
                ctx.drawImage(frame, this.x, this.y, this.width, this.height);
            }

            // Insignia de corona élite
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('👑', cx, this.y - 6);

            // Mini barra de salud de élite
            const barW = 42;
            const barH = 5;
            const bx = cx - barW / 2;
            const by = this.y - 18;
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(bx, by, barW, barH);
            const fillW = Math.max(0, (this.life / this.maxLife) * barW);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(bx, by, fillW, barH);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(bx, by, barW, barH);
        }
        ctx.restore();
    }
}

// ==========================================
// 5. PROYECTIL ENEMIGO
// ==========================================
class EnemyShot {
    constructor(x, y, vx = 0, vy = 5.2) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = 14;
        this.height = 14;
        this.sprite = new Image();
        this.sprite.src = 'images/disparo_malo.png';
    }

    update(dt) {
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
    }

    isOffScreen(canvasWidth, canvasHeight) {
        return this.y > canvasHeight + 30 || this.x < -30 || this.x > canvasWidth + 30;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 8;
        ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
        ctx.restore();
    }
}

// ==========================================
// 5. JEFE FINAL (FINAL BOSS) CON VIBRACIONES
// ==========================================
class FinalBoss {
    constructor(canvasWidth, wave = 1) {
        this.width = 86;
        this.height = 52;
        this.x = canvasWidth / 2 - this.width / 2;
        this.y = -80;
        this.targetY = 75;
        this.wave = wave;

        this.maxLife = 18 + wave * 8;
        this.life = this.maxLife;
        this.points = 1500 * wave;

        this.speedX = 2.2 + wave * 0.4;
        this.direction = 1;

        this.shootTimer = 1.0;
        this.patternTimer = 0;
        this.pattern = 0;

        this.frames = [];
        for (let i = 1; i <= 8; i++) {
            const img = new Image();
            img.src = `images/jefe${i}.png`;
            this.frames.push(img);
        }
        this.currentFrame = 0;
        this.animTimer = 0;

        this.deadSprite = new Image();
        this.deadSprite.src = 'images/jefe_muerto.png';
        this.isDying = false;
        this.dyingTimer = 0;
        this.enraged = false;

        // Sacudida de impacto al entrar el jefe y temblor continuo de presencia
        if (window.canvasShake) {
            window.canvasShake.addTrauma(0.5);
            window.canvasShake.setTremor(1.2);
        }
    }

    update(dt, playerX, playerY, canvasWidth) {
        if (this.isDying) {
            this.dyingTimer -= dt;
            if (Math.random() < 0.35) {
                const ox = this.x + Math.random() * this.width;
                const oy = this.y + Math.random() * this.height;
                window.particleSystem.createExplosion(ox, oy, 14);
            }
            return [];
        }

        this.animTimer += dt;
        if (this.animTimer > 0.08) {
            this.animTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
        }

        // ESTADO DE FURIA / BERSERK (HP < 35%): PARTE MÁS DIFÍCIL CON VIBRACIÓN
        if (this.life <= this.maxLife * 0.35 && !this.enraged) {
            this.enraged = true;
            this.speedX *= 1.45;
            window.soundEngine.playBossEnrage();
            if (window.canvasShake) {
                window.canvasShake.addTrauma(0.85);
                window.canvasShake.setTremor(2.5); // Temblores continuos de lienzo durante furia
            }
            window.particleSystem.triggerVibrate(15, 0.7, [120, 60, 160, 60, 220]);
            window.particleSystem.setContinuousTremor(2.5);
            window.particleSystem.addFloatingText(this.x + this.width / 2, this.y - 12, '⚡ ¡FURIA JEFE ACTIVADA!', '#ff0033');
        }

        // Entrada inicial
        if (this.y < this.targetY) {
            this.y += 1.8 * dt * 60;
            return [];
        }

        // Movimiento horizontal
        this.x += this.speedX * this.direction * dt * 60;
        if (this.x <= 15) {
            this.x = 15;
            this.direction = 1;
        } else if (this.x >= canvasWidth - this.width - 15) {
            this.x = canvasWidth - this.width - 15;
            this.direction = -1;
        }

        this.y = this.targetY + Math.sin(Date.now() / 320) * 16;

        this.patternTimer += dt;
        if (this.patternTimer > 4.2) {
            this.patternTimer = 0;
            this.pattern = (this.pattern + 1) % 3;
        }

        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
            return this.executeAttack(playerX, playerY);
        }

        return [];
    }

    executeAttack(playerX, playerY) {
        const shots = [];
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height - 4;

        if (this.pattern === 0) {
            // PATRÓN 1: Triple abanico de plasma
            this.shootTimer = this.enraged ? 0.8 : 1.25;
            window.soundEngine.playBossShoot();
            if (window.canvasShake) window.canvasShake.addTrauma(0.2);
            window.particleSystem.triggerVibrate(5, 0.18, [35]);
            shots.push(new EnemyShot(cx - 7, cy, 0, 5.0));
            shots.push(new EnemyShot(cx - 16, cy, -1.8, 4.6));
            shots.push(new EnemyShot(cx + 2, cy, 1.8, 4.6));
        } else if (this.pattern === 1) {
            // PATRÓN 2: Ráfaga teledirigida hacia la medusa
            this.shootTimer = this.enraged ? 0.45 : 0.75;
            window.soundEngine.playBossShoot();
            if (window.canvasShake) window.canvasShake.addTrauma(0.35);
            window.particleSystem.triggerVibrate(8, 0.25, [50, 30, 50]);
            const angle = Math.atan2(playerY - cy, playerX - cx);
            const speed = 5.3;
            shots.push(new EnemyShot(cx - 7, cy, Math.cos(angle) * speed, Math.sin(angle) * speed));
        } else {
            // PATRÓN 3: Cortina masiva de 5 proyectiles (Bullet Hell - Parte difícil)
            this.shootTimer = this.enraged ? 1.0 : 1.5;
            window.soundEngine.playBossShoot();
            if (window.canvasShake) window.canvasShake.addTrauma(0.55);
            window.particleSystem.triggerVibrate(12, 0.4, [90, 40, 90, 40, 110]);
            [-2.6, -1.3, 0, 1.3, 2.6].forEach(vx => {
                shots.push(new EnemyShot(cx - 7, cy, vx, 4.8));
            });
        }

        return shots;
    }

    takeHit() {
        if (this.isDying) return false;

        this.life--;
        window.soundEngine.playBossHit ? window.soundEngine.playBossHit() : window.soundEngine.playEnemyHit();
        window.particleSystem.createLaserSparks(this.x + this.width / 2, this.y + this.height / 2, '#ff00ee');

        if (this.life <= 0) {
            this.isDying = true;
            this.dyingTimer = 1.8;
            if (window.canvasShake) {
                window.canvasShake.addTrauma(1.0);
                window.canvasShake.setTremor(0);
            }
            window.particleSystem.setContinuousTremor(0);
            window.soundEngine.playBossExplosion();
            window.particleSystem.triggerVibrate(18, 1.2, [180, 70, 220, 70, 350]);
            window.particleSystem.createBossExplosion(this.x + this.width / 2, this.y + this.height / 2, 70);
            window.particleSystem.addFloatingText(this.x + this.width / 2, this.y - 15, `¡JEFE ELIMINADO! +${this.points} PTS`, '#ffe600');
            return true;
        }
        return false;
    }

    isDead() {
        return this.isDying && this.dyingTimer <= 0;
    }

    draw(ctx) {
        ctx.save();
        if (this.isDying) {
            ctx.drawImage(this.deadSprite, this.x, this.y, this.width, this.height);
        } else {
            const frame = this.frames[this.currentFrame];
            if (frame && frame.complete) {
                if (this.enraged) {
                    ctx.shadowColor = '#ff0033';
                    ctx.shadowBlur = 18;
                } else {
                    ctx.shadowColor = '#b026ff';
                    ctx.shadowBlur = 8;
                }
                ctx.drawImage(frame, this.x, this.y, this.width, this.height);
            }
        }
        ctx.restore();
    }
}

// ==========================================
// 6. POWER-UPS & LOOT (DROPS DE ENEMIGOS ÉLITE)
// ==========================================
class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.vy = 1.3;
        this.time = Math.random() * Math.PI * 2;
        this.type = type; // 'TRIPLE_SHOT', 'BLASTER', 'SHIELD', 'RAPID', 'HEAL', 'EMP', 'GEM'
        
        const configs = {
            TRIPLE_SHOT: { icon: '🔱', color: '#00f0ff', name: 'DISPARO TRIPLE' },
            BLASTER:     { icon: '⚡', color: '#00f0ff', name: 'BLASTER MAX' },
            SHIELD:      { icon: '🛡️', color: '#39ff14', name: 'ESCUDO TEMPORAL' },
            RAPID:       { icon: '⏱️', color: '#ff9900', name: 'SOBRECARGA' },
            HEAL:        { icon: '🔧', color: '#ff0077', name: '+1 VIDA' },
            EMP:         { icon: '💣', color: '#b026ff', name: 'BOMBA NOVA' },
            GEM:         { icon: '💎', color: '#ffd700', name: '+500 PTS' }
        };
        this.cfg = configs[type] || configs.GEM;
    }

    update(dt, playerX, playerY) {
        this.time += dt * 3.5;
        this.y += this.vy * dt * 60;
        this.x += Math.sin(this.time) * 0.9;

        // Atracción magnética suave hacia La Medusa cuando el jugador está cerca
        if (playerX !== undefined && playerY !== undefined) {
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const dx = playerX - cx;
            const dy = playerY - cy;
            const dist = Math.hypot(dx, dy);
            if (dist < 125 && dist > 2) {
                this.x += (dx / dist) * 4.8 * dt * 60;
                this.y += (dy / dist) * 4.8 * dt * 60;
            }
        }
    }

    isOffScreen(canvasHeight) {
        return this.y > canvasHeight + 40;
    }

    draw(ctx) {
        ctx.save();
        const pulse = 1 + Math.sin(this.time * 2.8) * 0.14;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);

        // Cápsula brillante con doble anillo de energía
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(8, 12, 28, 0.92)';
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = this.cfg.color;
        ctx.shadowColor = this.cfg.color;
        ctx.shadowBlur = 12;
        ctx.stroke();

        // Anillo interior sutil
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Icono del power-up
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.cfg.icon, 0, 1);

        ctx.restore();
    }
}

// ==========================================
// 7. FONDO ESPACIAL PARALAJE DINÁMICO
// ==========================================
class ParallaxBackground {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;

        this.starsLayer1 = [];
        for (let i = 0; i < 45; i++) {
            this.starsLayer1.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                size: Math.random() * 1.5 + 0.5,
                speed: 0.6 + Math.random() * 0.4,
                alpha: 0.4 + Math.random() * 0.6
            });
        }

        this.starsLayer2 = [];
        for (let i = 0; i < 25; i++) {
            this.starsLayer2.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                size: Math.random() * 2.2 + 1.2,
                speed: 1.4 + Math.random() * 0.8,
                alpha: 0.7 + Math.random() * 0.3
            });
        }

        this.bgNormal = new Image();
        this.bgNormal.src = 'images/fondovertical.png';

        this.bgBoss = new Image();
        this.bgBoss.src = 'images/fondovertical_jefe.png';

        this.scrollOffsetY = 0;
        this.scrollSpeed = 1.6;
        this.bossModeAlpha = 0;
    }

    setBossMode(isBoss) {
        this.isBoss = isBoss;
    }

    update(dt) {
        this.scrollOffsetY += this.scrollSpeed * dt * 60;
        if (this.scrollOffsetY >= this.height) {
            this.scrollOffsetY = 0;
        }

        if (this.isBoss) {
            this.bossModeAlpha = Math.min(1, this.bossModeAlpha + dt * 1.2);
        } else {
            this.bossModeAlpha = Math.max(0, this.bossModeAlpha - dt * 1.2);
        }

        this.starsLayer1.forEach(s => {
            s.y += s.speed * dt * 60;
            if (s.y > this.height) {
                s.y = 0;
                s.x = Math.random() * this.width;
            }
        });

        this.starsLayer2.forEach(s => {
            s.y += s.speed * dt * 60;
            if (s.y > this.height) {
                s.y = 0;
                s.x = Math.random() * this.width;
            }
        });
    }

    draw(ctx) {
        ctx.save();

        if (this.bgNormal.complete && this.bgNormal.naturalWidth > 0) {
            ctx.drawImage(this.bgNormal, 0, this.scrollOffsetY - this.height, this.width, this.height);
            ctx.drawImage(this.bgNormal, 0, this.scrollOffsetY, this.width, this.height);
        } else {
            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, this.width, this.height);
        }

        if (this.bossModeAlpha > 0 && this.bgBoss.complete && this.bgBoss.naturalWidth > 0) {
            ctx.globalAlpha = this.bossModeAlpha;
            ctx.drawImage(this.bgBoss, 0, this.scrollOffsetY - this.height, this.width, this.height);
            ctx.drawImage(this.bgBoss, 0, this.scrollOffsetY, this.width, this.height);
            ctx.globalAlpha = 1.0;
        }

        ctx.fillStyle = '#ffffff';
        this.starsLayer1.forEach(s => {
            ctx.globalAlpha = s.alpha * (0.8 + Math.sin(Date.now() / 400 + s.x) * 0.2);
            ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
        });

        ctx.fillStyle = '#66ccff';
        this.starsLayer2.forEach(s => {
            ctx.globalAlpha = s.alpha;
            ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
        });

        ctx.restore();
    }
}

// Exportar
window.Player = Player;
window.PlayerShot = PlayerShot;
window.Enemy = Enemy;
window.EliteEnemy = EliteEnemy;
window.EnemyShot = EnemyShot;
window.FinalBoss = FinalBoss;
window.Powerup = Powerup;
window.ParallaxBackground = ParallaxBackground;
