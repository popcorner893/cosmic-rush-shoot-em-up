/**
 * Cosmic Rush - Visor de Banner Oficial en Pantalla Completa
 * Carga y muestra exclusivamente el archivo de imagen oficial `Main_Menu.jfif` proporcionado por el usuario.
 * No genera réplicas sintéticas: preserva al 100% el archivo original con soporte de pantalla completa,
 * persistencia local y almacenamiento permanente en el servidor.
 */

class BannerViewer {
    constructor() {
        this.modal = null;
        this.img = null;
        this.promptBox = null;
        this.isOpen = false;
        this.storageKey = 'cosmic_rush_banner_data';
    }

    init() {
        this.modal = document.getElementById('bannerModal');
        this.img = document.getElementById('bannerImageDisplay');
        this.promptBox = document.getElementById('bannerUploadPrompt');

        const btnOpen = document.getElementById('btnShowBanner');
        const btnClose = document.getElementById('btnCloseBanner');
        const btnFullscreen = document.getElementById('btnToggleNativeFullscreen');
        const fileInput = document.getElementById('bannerFileInput');

        if (btnOpen) {
            btnOpen.addEventListener('click', () => this.open());
        }

        if (btnClose) {
            btnClose.addEventListener('click', () => this.close());
        }

        if (btnFullscreen) {
            btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    this.loadFromFile(file);
                }
            });
        }

        // Manejadores de carga y error de imagen original
        if (this.img) {
            this.img.addEventListener('load', () => {
                if (this.img.naturalWidth > 0) {
                    this.img.style.display = 'block';
                    if (this.promptBox) this.promptBox.classList.add('hidden');
                }
            });

            this.img.addEventListener('error', () => {
                const cached = localStorage.getItem(this.storageKey);
                if (cached) {
                    this.img.src = cached;
                } else {
                    this.showUploadPrompt();
                }
            });

            // Si hay datos en caché local, aplicarlos de inmediato
            const cached = localStorage.getItem(this.storageKey);
            if (cached) {
                this.img.src = cached;
                this.img.style.display = 'block';
                if (this.promptBox) this.promptBox.classList.add('hidden');
            }
        }

        // Soporte de Arrastrar y Soltar (Drag & Drop)
        if (this.modal) {
            this.modal.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });

            this.modal.addEventListener('drop', (e) => {
                e.preventDefault();
                const file = e.dataTransfer.files && e.dataTransfer.files[0];
                if (file) {
                    this.loadFromFile(file);
                }
            });
        }

        // Cerrar con la tecla ESC
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    open() {
        if (!this.modal) return;
        this.isOpen = true;
        this.modal.classList.remove('hidden');

        const cached = localStorage.getItem(this.storageKey);
        if (cached) {
            if (this.img) {
                this.img.src = cached;
                this.img.style.display = 'block';
            }
            if (this.promptBox) this.promptBox.classList.add('hidden');
        } else if (this.img) {
            if (!this.img.complete || this.img.naturalWidth === 0) {
                this.showUploadPrompt();
            } else {
                this.img.style.display = 'block';
                if (this.promptBox) this.promptBox.classList.add('hidden');
            }
        }
    }

    close() {
        if (!this.modal) return;
        this.isOpen = false;
        this.modal.classList.add('hidden');
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (this.modal && this.modal.requestFullscreen) {
                this.modal.requestFullscreen().catch(() => {});
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        }
    }

    showUploadPrompt() {
        if (this.img) this.img.style.display = 'none';
        if (this.promptBox) this.promptBox.classList.remove('hidden');
    }

    loadFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;

            // 1. Mostrar inmediatamente el archivo exacto
            if (this.img) {
                this.img.src = dataUrl;
                this.img.style.display = 'block';
            }
            if (this.promptBox) {
                this.promptBox.classList.add('hidden');
            }

            // 2. Guardar en localStorage para recargas automáticas
            try {
                localStorage.setItem(this.storageKey, dataUrl);
            } catch (err) {
                console.warn('LocalStorage limit reached for banner:', err);
            }

            // 3. Persistir en el servidor permanentemente
            fetch('/api/save-banner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dataUrl,
                    filename: file.name || 'Main_Menu.jfif'
                })
            }).then(r => r.json()).then(res => {
                console.log('Imagen original guardada en el servidor:', res);
            }).catch(e => console.warn('Could not persist to server:', e));
        };
        reader.readAsDataURL(file);
    }
}

window.bannerViewer = new BannerViewer();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.bannerViewer.init());
} else {
    window.bannerViewer.init();
}
