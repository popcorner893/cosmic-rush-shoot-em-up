/**
 * Global Canvas Shake & Dynamic Trauma System
 * Applies mathematically smooth, non-linear (trauma²) translation displacement
 * to the canvas rendering context during player damage and boss encounters.
 */

class CanvasShakeManager {
    constructor() {
        this.trauma = 0;          // Rango de trauma de 0.0 a 1.0
        this.decayRate = 1.6;     // Velocidad de disipación por segundo
        this.maxOffsetX = 14;     // Desplazamiento horizontal máximo en píxeles
        this.maxOffsetY = 14;     // Desplazamiento vertical máximo en píxeles
        this.tremorIntensity = 0; // Temblores continuos para la presencia del jefe
        this.time = 0;
    }

    /**
     * Incrementa el trauma acumulado de la cámara (se satura en 1.0)
     * @param {number} amount - Valor entre 0.1 y 1.0
     */
    addTrauma(amount = 0.5) {
        this.trauma = Math.min(1.0, this.trauma + amount);
        
        // Vibración háptica en dispositivos móviles si el impacto es contundente
        if (amount >= 0.4 && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
                const duration = Math.round(amount * 180);
                navigator.vibrate([duration, 40, Math.round(duration * 0.6)]);
            } catch (e) {
                // Silencioso en navegadores sin soporte
            }
        }
    }

    /**
     * Define temblores continuos de fondo (usado durante la presencia o furia del jefe)
     * @param {number} intensity - Amplitud del temblor en píxeles (0 para desactivar)
     */
    setTremor(intensity = 0) {
        this.tremorIntensity = intensity;
    }

    /**
     * Actualiza el decaimiento cuadrático del trauma en cada cuadro de animación
     * @param {number} dt - Delta time en segundos
     */
    update(dt = 0.016) {
        this.time += dt * 30;

        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - this.decayRate * dt);
        }
    }

    /**
     * Obtiene el desplazamiento aleatorio actual basado en trauma²
     * @returns {{x: number, y: number}} Desplazamiento en píxeles
     */
    getDisplacement() {
        // Fórmula: Shake = MaxOffset * Trauma² * Random(-1, 1)
        const shakeMultiplier = this.trauma * this.trauma;
        
        let dx = (Math.random() * 2 - 1) * this.maxOffsetX * shakeMultiplier;
        let dy = (Math.random() * 2 - 1) * this.maxOffsetY * shakeMultiplier;

        // Añadir temblor continuo si está activo
        if (this.tremorIntensity > 0) {
            dx += (Math.random() * 2 - 1) * this.tremorIntensity;
            dy += (Math.random() * 2 - 1) * this.tremorIntensity;
        }

        return {
            x: Math.round(dx * 10) / 10,
            y: Math.round(dy * 10) / 10
        };
    }

    /**
     * Aplica el desplazamiento al contexto del canvas de forma segura
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Function} renderCallback 
     */
    apply(ctx, renderCallback) {
        const offset = this.getDisplacement();
        ctx.save();
        ctx.translate(offset.x, offset.y);
        try {
            renderCallback();
        } finally {
            ctx.restore();
        }
    }

    /**
     * Restablece el sistema a cero
     */
    reset() {
        this.trauma = 0;
        this.tremorIntensity = 0;
    }
}

// Instancia global disponible en toda la aplicación
window.canvasShake = new CanvasShakeManager();

/**
 * Función global auxiliar para disparar la sacudida del canvas
 * @param {number} intensity - Intensidad del impacto (0.1 a 1.0)
 */
window.triggerCanvasShake = function(intensity = 0.5) {
    if (window.canvasShake) {
        window.canvasShake.addTrauma(intensity);
    }
};
