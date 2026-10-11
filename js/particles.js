/**
 * High Performance 2D Particle & Visual Effects Engine
 * Renders retro arcade explosions, laser sparks, engine flames and screen shakes
 */
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.floatingTexts = [];
        this.shakeTime = 0;
        this.shakeIntensity = 0;
    }

    // Trigger screen shake & device haptic vibration
    triggerShake(intensity = 8, duration = 0.3) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeTime = Math.max(this.shakeTime, duration);
    }

    // Vibración háptica en partes difíciles (Furia del jefe, ráfagas pesadas, peligro crítico)
    triggerVibrate(intensity = 12, duration = 0.45, hapticPattern = [100, 50, 100]) {
        this.triggerShake(intensity, duration);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
                navigator.vibrate(hapticPattern);
            } catch (e) {
                // Silently ignore if browser restricts haptics
            }
        }
    }

    // Temblores continuos de fondo (para cuando el jefe está furioso)
    setContinuousTremor(intensity = 0) {
        this.tremorIntensity = intensity;
    }

    getShakeOffset() {
        let totalX = 0;
        let totalY = 0;

        if (this.shakeTime > 0) {
            totalX += (Math.random() * 2 - 1) * this.shakeIntensity;
            totalY += (Math.random() * 2 - 1) * this.shakeIntensity;
        }

        if (this.tremorIntensity > 0) {
            totalX += (Math.random() * 2 - 1) * this.tremorIntensity;
            totalY += (Math.random() * 2 - 1) * this.tremorIntensity;
        }

        return { x: totalX, y: totalY };
    }

    // Add floating text popup (e.g. "+100 PTS")
    addFloatingText(x, y, text, color = '#ffe600') {
        this.floatingTexts.push({
            x,
            y,
            text,
            color,
            alpha: 1.0,
            vy: -1.2,
            life: 45
        });
    }

    // Standard enemy explosion
    createExplosion(x, y, count = 24, colors = ['#ff0055', '#ff9900', '#ffff00', '#ffffff']) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.0 + Math.random() * 4.5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 2 + Math.random() * 3.5;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                size,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                gravity: 0.04
            });
        }
    }

    // Boss massive multi-staged explosion
    createBossExplosion(x, y, count = 60) {
        this.triggerShake(14, 0.7);
        this.createExplosion(x, y, count, ['#ff0033', '#ff00ee', '#00ffff', '#ffe600', '#ffffff']);
    }

    // Laser impact spark
    createLaserSparks(x, y, color = '#00f0ff') {
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.8 + Math.random() * 2.2;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                size: 1.5 + Math.random() * 2,
                alpha: 1.0,
                decay: 0.06 + Math.random() * 0.04,
                gravity: 0.02
            });
        }
    }

    // Engine thruster flame beneath player
    createThrusterFlame(x, y) {
        this.particles.push({
            x: x + (Math.random() * 8 - 4),
            y: y,
            vx: (Math.random() * 2 - 1) * 0.6,
            vy: 2.2 + Math.random() * 1.8,
            color: Math.random() > 0.4 ? '#00f0ff' : '#0077ff',
            size: 2 + Math.random() * 3,
            alpha: 0.9,
            decay: 0.07 + Math.random() * 0.05,
            gravity: 0
        });
    }

    update(dt = 1) {
        // Update Screen Shake
        if (this.shakeTime > 0) {
            this.shakeTime -= dt * 0.016;
            if (this.shakeTime <= 0) {
                this.shakeTime = 0;
                this.shakeIntensity = 0;
            }
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += (p.gravity || 0) * dt;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.alpha -= p.decay * dt;
            p.size = Math.max(0.5, p.size * 0.98);

            if (p.alpha <= 0 || p.size <= 0.5) {
                this.particles.splice(i, 1);
            }
        }

        // Update Floating Texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const t = this.floatingTexts[i];
            t.y += t.vy * dt;
            t.life -= dt;
            t.alpha = Math.max(0, t.life / 45);
            if (t.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        // Draw Particles
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), Math.round(p.size), Math.round(p.size));
        }

        // Draw Floating Texts
        ctx.shadowBlur = 4;
        ctx.font = 'bold 13px "Courier New", monospace';
        ctx.textAlign = 'center';
        for (let i = 0; i < this.floatingTexts.length; i++) {
            const t = this.floatingTexts[i];
            ctx.globalAlpha = Math.max(0, Math.min(1, t.alpha));
            ctx.fillStyle = t.color;
            ctx.shadowColor = '#000000';
            ctx.fillText(t.text, Math.round(t.x), Math.round(t.y));
        }

        ctx.restore();
    }

    clear() {
        this.particles = [];
        this.floatingTexts = [];
        this.shakeTime = 0;
        this.shakeIntensity = 0;
        this.tremorIntensity = 0;
    }
}

window.particleSystem = new ParticleSystem();
