/**
 * LocalStorage Pilot Profiles and Leaderboard Manager
 * Persists pilot authentication, profiles and high scores locally
 */
const StorageManager = {
    PILOT_STORAGE_KEY: 'cosmic_rush_active_pilot',
    SCORES_STORAGE_KEY: 'cosmic_rush_highscores_v2',

    // Available pilot avatars/badges
    AVATARS: [
        { id: 'phoenix', name: 'FÉNIX ROJO', insignia: '🦅', color: '#ff3366', role: 'Comandante Táctico' },
        { id: 'valkyrie', name: 'VALKIRIA', insignia: '⚡', color: '#00f0ff', role: 'Piloto Interceptor' },
        { id: 'titan', name: 'TITÁN-9', insignia: '🛡️', color: '#39ff14', role: 'Blindaje Pesado' },
        { id: 'specter', name: 'ESPECTRO', insignia: '👾', color: '#b026ff', role: 'Operaciones Especiales' }
    ],

    // Default Seed Leaderboard
    DEFAULT_SCORES: [
        { pilotName: 'CAPTAIN-SOLO', pilotAvatar: 'phoenix', score: 9800, wave: 4, date: '10/10/2026 12:40' },
        { pilotName: 'STAR-LORD', pilotAvatar: 'valkyrie', score: 7200, wave: 3, date: '10/10/2026 11:15' },
        { pilotName: 'CYBER-VALK', pilotAvatar: 'titan', score: 5400, wave: 2, date: '09/10/2026 20:30' },
        { pilotName: 'NOVA-HUNTER', pilotAvatar: 'specter', score: 3200, wave: 2, date: '08/10/2026 18:22' },
        { pilotName: 'ROOKIE-PILOT', pilotAvatar: 'valkyrie', score: 1500, wave: 1, date: '07/10/2026 09:10' }
    ],

    // Load active pilot
    getActivePilot() {
        try {
            const raw = localStorage.getItem(this.PILOT_STORAGE_KEY);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {
            console.warn('Storage read error:', e);
        }
        return {
            name: 'PILOTO-01',
            avatar: 'valkyrie'
        };
    },

    // Save active pilot
    saveActivePilot(pilot) {
        try {
            localStorage.setItem(this.PILOT_STORAGE_KEY, JSON.stringify(pilot));
        } catch (e) {
            console.warn('Storage write error:', e);
        }
    },

    // Retrieve sorted high scores
    getHighScores() {
        try {
            const raw = localStorage.getItem(this.SCORES_STORAGE_KEY);
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list) && list.length > 0) {
                    return list.sort((a, b) => b.score - a.score);
                }
            }
        } catch (e) {
            console.warn('Highscore read error:', e);
        }

        // Return default seed if empty
        return [...this.DEFAULT_SCORES];
    },

    // Save a score entry
    saveScore(pilotName, pilotAvatar, score, wave) {
        const scores = this.getHighScores();
        const now = new Date();
        const dateStr = 
            String(now.getDate()).padStart(2, '0') + '/' +
            String(now.getMonth() + 1).padStart(2, '0') + '/' +
            now.getFullYear() + ' ' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0');

        const newEntry = {
            pilotName: (pilotName || 'PILOTO').toUpperCase().trim(),
            pilotAvatar: pilotAvatar || 'valkyrie',
            score: Math.max(0, parseInt(score, 10) || 0),
            wave: Math.max(1, parseInt(wave, 10) || 1),
            date: dateStr
        };

        scores.push(newEntry);
        scores.sort((a, b) => b.score - a.score);

        // Keep top 12
        const trimmed = scores.slice(0, 12);

        try {
            localStorage.setItem(this.SCORES_STORAGE_KEY, JSON.stringify(trimmed));
        } catch (e) {
            console.warn('Highscore write error:', e);
        }

        const rank = trimmed.findIndex(e => e === newEntry);
        return {
            isNewHigh: rank === 0,
            rank: rank !== -1 ? rank + 1 : null,
            list: trimmed
        };
    },

    // Clear leaderboard
    clearHighScores() {
        try {
            localStorage.removeItem(this.SCORES_STORAGE_KEY);
        } catch (e) {
            console.warn('Storage clear error:', e);
        }
    }
};

window.StorageManager = StorageManager;
