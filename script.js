class AudioVisualizer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.audioElement = document.getElementById('audioElement');
        this.canvas = document.getElementById('visualizer');
        this.ctx = this.canvas.getContext('2d');
        this.fullscreenCanvas = document.getElementById('fullscreenCanvas');
        this.fullscreenCtx = this.fullscreenCanvas.getContext('2d');
        this.isPlaying = false;
        this.currentTrackIndex = 0;
        this.playlist = [];
        this.animationId = null;
        this.particles = [];
        this.isFullscreen = false;
    this.spectrogramOffset = 0; // for spectrogram vertical scrolling
        
        // Visualization settings
        this.vizType = 'bars';
        this.showParticles = true;
        this.sensitivity = 1;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupCanvas();
        this.initializeParticles();
    // UI reflects starting defaults
    this.syncUiControls();
    }

    initializeElements() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.playerControls = document.getElementById('playerControls');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.progressBar = document.getElementById('progressBar');
        this.volumeBar = document.getElementById('volumeBar');
        this.trackName = document.getElementById('trackName');
        this.currentTime = document.getElementById('currentTime');
        this.duration = document.getElementById('duration');
        this.selectFileBtn = document.getElementById('selectFileBtn');
        this.playlist = document.getElementById('playlist');
        this.playlistItems = document.getElementById('playlistItems');
        this.vizTypeSelect = document.getElementById('vizType');
        this.showParticlesCheckbox = document.getElementById('showParticles');
        this.sensitivitySlider = document.getElementById('sensitivity');
        
        // Fullscreen elements
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.fullscreenVisualizer = document.getElementById('fullscreenVisualizer');
        this.exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
        this.fullscreenVizType = document.getElementById('fullscreenVizType');
        this.fullscreenShowParticles = document.getElementById('fullscreenShowParticles');
        this.fullscreenSensitivity = document.getElementById('fullscreenSensitivity');
    // Action buttons
    this.resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
    this.randomizeModeBtn = document.getElementById('randomizeModeBtn');
    this.fullscreenResetDefaultsBtn = document.getElementById('fullscreenResetDefaultsBtn');
    this.fullscreenRandomizeModeBtn = document.getElementById('fullscreenRandomizeModeBtn');
    // Auto cycle controls
    this.autoCycleCheckbox = document.getElementById('autoCycle');
    this.autoCycleIntervalInput = document.getElementById('autoCycleInterval');
    this.fullscreenAutoCycleCheckbox = document.getElementById('fullscreenAutoCycle');
    this.fullscreenAutoCycleIntervalInput = document.getElementById('fullscreenAutoCycleInterval');
    this.autoCycleTimer = null;
    this.autoCycleSeconds = 10;
    // Cycle order and filters
    this.cycleModeSelect = document.getElementById('cycleMode');
    this.fullscreenCycleModeSelect = document.getElementById('fullscreenCycleMode');
    this.availableModes = ['bars','wave','circle','spiral','particles','dualBars','radialBars','spectrogram','lissajous','tunnel'];
    this.modeFilter = new Set(this.availableModes); // included modes
    // checkbox elements map
    this.modeFilterCheckboxes = this.availableModes.map(id => document.getElementById(`modeFilter-${id}`)).filter(Boolean);
    this.fullscreenModeFilterCheckboxes = this.availableModes.map(id => document.getElementById(`fullscreenModeFilter-${id}`)).filter(Boolean);
    }

    setupEventListeners() {
        // File input events
        this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropZone.addEventListener('drop', this.handleDrop.bind(this));
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.selectFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Player controls
        this.playPauseBtn.addEventListener('click', this.togglePlayPause.bind(this));
        this.stopBtn.addEventListener('click', this.stop.bind(this));
        this.prevBtn.addEventListener('click', this.previousTrack.bind(this));
        this.nextBtn.addEventListener('click', this.nextTrack.bind(this));
        this.progressBar.addEventListener('input', this.seekTo.bind(this));
        this.volumeBar.addEventListener('input', this.changeVolume.bind(this));

        // Audio events
        this.audioElement.addEventListener('loadedmetadata', this.onLoadedMetadata.bind(this));
        this.audioElement.addEventListener('timeupdate', this.onTimeUpdate.bind(this));
        this.audioElement.addEventListener('ended', this.onTrackEnded.bind(this));

        // Visualization controls
        this.vizTypeSelect.addEventListener('change', (e) => {
            this.vizType = e.target.value;
            this.fullscreenVizType.value = e.target.value;
            this.applyVizDefaults();
            this.syncUiControls();
        });
        this.showParticlesCheckbox.addEventListener('change', (e) => {
            this.showParticles = e.target.checked;
            this.fullscreenShowParticles.checked = e.target.checked;
        });
        this.sensitivitySlider.addEventListener('input', (e) => {
            this.sensitivity = parseFloat(e.target.value);
            this.fullscreenSensitivity.value = e.target.value;
        });

        // Actions
        this.resetDefaultsBtn.addEventListener('click', () => {
            this.applyVizDefaults();
            this.syncUiControls();
        });
        this.randomizeModeBtn.addEventListener('click', () => {
            this.setRandomMode();
        });

        // Auto cycle main
        this.autoCycleCheckbox.addEventListener('change', (e) => {
            this.fullscreenAutoCycleCheckbox.checked = e.target.checked;
            if (e.target.checked) {
                this.startAutoCycle();
            } else {
                this.stopAutoCycle();
            }
        });
        this.autoCycleIntervalInput.addEventListener('input', (e) => {
            const v = Math.max(2, Math.min(60, parseInt(e.target.value || '10', 10)));
            this.autoCycleSeconds = v;
            this.fullscreenAutoCycleIntervalInput.value = String(v);
            if (this.autoCycleTimer) this.restartAutoCycle();
        });

        // Cycle mode select
        if (this.cycleModeSelect) {
            this.cycleModeSelect.addEventListener('change', (e) => {
                const mode = e.target.value === 'ordered' ? 'ordered' : 'random';
                this.fullscreenCycleModeSelect.value = mode;
                if (this.autoCycleTimer) this.restartAutoCycle();
            });
        }

        // Mode filter main
        const allBtn = document.getElementById('modeFilterAll');
        const noneBtn = document.getElementById('modeFilterNone');
        if (allBtn) allBtn.addEventListener('click', () => this.setModeFilterAll(true));
        if (noneBtn) noneBtn.addEventListener('click', () => this.setModeFilterAll(false));
        this.modeFilterCheckboxes.forEach(cb => cb.addEventListener('change', () => this.onModeFilterChanged('main')));

        // Fullscreen controls
        this.fullscreenBtn.addEventListener('click', this.enterFullscreen.bind(this));
        this.exitFullscreenBtn.addEventListener('click', this.exitFullscreen.bind(this));
        
        // Fullscreen visualization controls
        this.fullscreenVizType.addEventListener('change', (e) => {
            this.vizType = e.target.value;
            this.vizTypeSelect.value = e.target.value;
            this.applyVizDefaults();
            this.syncUiControls();
        });
        this.fullscreenShowParticles.addEventListener('change', (e) => {
            this.showParticles = e.target.checked;
            this.showParticlesCheckbox.checked = e.target.checked;
        });
        this.fullscreenSensitivity.addEventListener('input', (e) => {
            this.sensitivity = parseFloat(e.target.value);
            this.sensitivitySlider.value = e.target.value;
        });

        this.fullscreenResetDefaultsBtn.addEventListener('click', () => {
            this.applyVizDefaults();
            this.syncUiControls();
        });
        this.fullscreenRandomizeModeBtn.addEventListener('click', () => {
            this.setRandomMode();
        });

        // Auto cycle fullscreen
        this.fullscreenAutoCycleCheckbox.addEventListener('change', (e) => {
            this.autoCycleCheckbox.checked = e.target.checked;
            if (e.target.checked) {
                this.startAutoCycle();
            } else {
                this.stopAutoCycle();
            }
        });
        this.fullscreenAutoCycleIntervalInput.addEventListener('input', (e) => {
            const v = Math.max(2, Math.min(60, parseInt(e.target.value || '10', 10)));
            this.autoCycleSeconds = v;
            this.autoCycleIntervalInput.value = String(v);
            if (this.autoCycleTimer) this.restartAutoCycle();
        });

        // Fullscreen cycle select
        if (this.fullscreenCycleModeSelect) {
            this.fullscreenCycleModeSelect.addEventListener('change', (e) => {
                const mode = e.target.value === 'ordered' ? 'ordered' : 'random';
                this.cycleModeSelect.value = mode;
                if (this.autoCycleTimer) this.restartAutoCycle();
            });
        }
        // Fullscreen filter
        const fsAll = document.getElementById('fullscreenModeFilterAll');
        const fsNone = document.getElementById('fullscreenModeFilterNone');
        if (fsAll) fsAll.addEventListener('click', () => this.setModeFilterAll(true));
        if (fsNone) fsNone.addEventListener('click', () => this.setModeFilterAll(false));
        this.fullscreenModeFilterCheckboxes.forEach(cb => cb.addEventListener('change', () => this.onModeFilterChanged('fs')));

        // Keyboard shortcuts for fullscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            } else if (e.key === 'F11' || (e.key === 'f' && !this.isFullscreen)) {
                e.preventDefault();
                if (this.isFullscreen) {
                    this.exitFullscreen();
                } else {
                    this.enterFullscreen();
                }
            }
        });

        // Window resize
        window.addEventListener('resize', this.setupCanvas.bind(this));
    }

    setModeFilterAll(enabled) {
        this.modeFilter = new Set(enabled ? this.availableModes : []);
        // update checkboxes both UIs
        this.modeFilterCheckboxes.forEach(cb => cb.checked = enabled);
        this.fullscreenModeFilterCheckboxes.forEach(cb => cb.checked = enabled);
        // if current viz excluded, pick a valid one
        if (!this.modeFilter.has(this.vizType) && this.modeFilter.size > 0) {
            this.vizType = [...this.modeFilter][0];
            this.applyVizDefaults();
        }
        this.syncUiControls();
        if (this.autoCycleTimer) this.restartAutoCycle();
    }

    onModeFilterChanged(source) {
        // Determine which set of checkboxes changed
        const readFrom = source === 'fs' ? this.fullscreenModeFilterCheckboxes : this.modeFilterCheckboxes;
        const writeTo = source === 'fs' ? this.modeFilterCheckboxes : this.fullscreenModeFilterCheckboxes;

        const newSet = new Set();
        readFrom.forEach(cb => {
            const id = cb.id.replace(source === 'fs' ? 'fullscreenModeFilter-' : 'modeFilter-','');
            if (cb.checked) newSet.add(id);
        });
        this.modeFilter = newSet;
        // Mirror state to the other UI's checkboxes
        writeTo.forEach(cb => {
            const id = cb.id.replace(source === 'fs' ? 'modeFilter-' : 'fullscreenModeFilter-','');
            cb.checked = this.modeFilter.has(id);
        });
        // ensure at least one remains
        if (this.modeFilter.size === 0) {
            // re-enable current mode
            this.modeFilter.add(this.vizType);
            const cb = document.getElementById(`modeFilter-${this.vizType}`);
            const fcb = document.getElementById(`fullscreenModeFilter-${this.vizType}`);
            if (cb) cb.checked = true;
            if (fcb) fcb.checked = true;
        }
        // if current excluded, switch
        if (!this.modeFilter.has(this.vizType)) {
            this.vizType = [...this.modeFilter][0];
            this.applyVizDefaults();
        }
        this.syncUiControls();
        if (this.autoCycleTimer) this.restartAutoCycle();
    }

    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Setup fullscreen canvas
        this.fullscreenCanvas.width = window.innerWidth;
        this.fullscreenCanvas.height = window.innerHeight;
    }

    enterFullscreen() {
        this.isFullscreen = true;
        this.fullscreenVisualizer.style.display = 'block';
        this.setupCanvas();
        
        // Sync control values
        this.fullscreenVizType.value = this.vizType;
        this.fullscreenShowParticles.checked = this.showParticles;
        this.fullscreenSensitivity.value = this.sensitivity;
        
        // Try to enter browser fullscreen if supported
        if (this.fullscreenVisualizer.requestFullscreen) {
            this.fullscreenVisualizer.requestFullscreen();
        } else if (this.fullscreenVisualizer.webkitRequestFullscreen) {
            this.fullscreenVisualizer.webkitRequestFullscreen();
        } else if (this.fullscreenVisualizer.msRequestFullscreen) {
            this.fullscreenVisualizer.msRequestFullscreen();
        }
    }

    exitFullscreen() {
        this.isFullscreen = false;
        this.fullscreenVisualizer.style.display = 'none';
        this.setupCanvas();
        
        // Exit browser fullscreen if active
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    initializeParticles() {
        this.particles = [];
        const canvasWidth = this.isFullscreen ? window.innerWidth : this.canvas.width;
        const canvasHeight = this.isFullscreen ? window.innerHeight : this.canvas.height;
        
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: Math.random() * 100,
                maxLife: 100,
                hue: Math.random() * 360
            });
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('audio/'));
        this.loadFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('audio/'));
        this.loadFiles(files);
    }

    loadFiles(files) {
        if (files.length === 0) return;

        this.playlist = files.map((file, index) => ({
            file,
            name: file.name.replace(/\.[^/.]+$/, ""),
            url: URL.createObjectURL(file),
            index
        }));

        this.renderPlaylist();
        this.loadTrack(0);
        this.playerControls.style.display = 'block';
        this.playlist.style.display = 'block';
        this.dropZone.style.display = 'none';
    }

    renderPlaylist() {
        this.playlistItems.innerHTML = '';
        this.playlist.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.innerHTML = `
                <span class="song-name">${track.name}</span>
            `;
            item.addEventListener('click', () => this.loadTrack(index));
            this.playlistItems.appendChild(item);
        });
    }

    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;

        this.currentTrackIndex = index;
        const track = this.playlist[index];
        
        this.audioElement.src = track.url;
        this.trackName.textContent = track.name;
        
        // Update playlist UI
        document.querySelectorAll('.playlist-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });

        this.initAudioContext();
    }

    async initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.7;
            
            const source = this.audioContext.createMediaElementSource(this.audioElement);
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            // Ensure defaults match current mode now that analyser exists
            this.applyVizDefaults();
        }

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    async play() {
        if (!this.audioElement.src) return;
        
        await this.initAudioContext();
        await this.audioElement.play();
        this.isPlaying = true;
        this.playPauseBtn.textContent = '⏸️';
        this.startVisualization();
    }

    pause() {
        this.audioElement.pause();
        this.isPlaying = false;
        this.playPauseBtn.textContent = '▶️';
        this.stopVisualization();
    }

    stop() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.isPlaying = false;
        this.playPauseBtn.textContent = '▶️';
        this.stopVisualization();
        this.clearCanvas();
    }

    previousTrack() {
        const newIndex = this.currentTrackIndex - 1;
        if (newIndex >= 0) {
            this.loadTrack(newIndex);
            if (this.isPlaying) {
                setTimeout(() => this.play(), 100);
            }
        }
    }

    nextTrack() {
        const newIndex = this.currentTrackIndex + 1;
        if (newIndex < this.playlist.length) {
            this.loadTrack(newIndex);
            if (this.isPlaying) {
                setTimeout(() => this.play(), 100);
            }
        }
    }

    seekTo() {
        const time = (this.progressBar.value / 100) * this.audioElement.duration;
        this.audioElement.currentTime = time;
    }

    changeVolume() {
        this.audioElement.volume = this.volumeBar.value / 100;
    }

    onLoadedMetadata() {
        this.duration.textContent = this.formatTime(this.audioElement.duration);
    }

    onTimeUpdate() {
        const currentTime = this.audioElement.currentTime;
        const duration = this.audioElement.duration;
        
        this.currentTime.textContent = this.formatTime(currentTime);
        this.progressBar.value = (currentTime / duration) * 100;
    }

    onTrackEnded() {
        if (this.currentTrackIndex < this.playlist.length - 1) {
            this.nextTrack();
            this.play();
        } else {
            this.stop();
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    startVisualization() {
        this.animate();
    }

    stopVisualization() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        
        if (!this.analyser) return;
        
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
        
        // Use the appropriate canvas and context
        const currentCanvas = this.isFullscreen ? this.fullscreenCanvas : this.canvas;
        const currentCtx = this.isFullscreen ? this.fullscreenCtx : this.ctx;
        
        // For spectrogram we preserve history, so don't clear here
        if (this.vizType !== 'spectrogram') {
            this.clearCanvas(currentCtx, currentCanvas);
        }
        
        switch (this.vizType) {
            case 'bars':
                this.drawFrequencyBars(dataArray, currentCtx, currentCanvas);
                break;
            case 'wave':
                this.drawWaveform(currentCtx, currentCanvas);
                break;
            case 'circle':
                this.drawCircularVisualization(dataArray, currentCtx, currentCanvas);
                break;
            case 'spiral':
                this.drawSpiralVisualization(dataArray, currentCtx, currentCanvas);
                break;
            case 'particles':
                this.drawParticleVisualization(dataArray, currentCtx, currentCanvas);
                break;
            case 'dualBars':
                this.drawDualBars(dataArray, currentCtx, currentCanvas);
                break;
            case 'radialBars':
                this.drawRadialBars(dataArray, currentCtx, currentCanvas);
                break;
            case 'spectrogram':
                this.drawSpectrogram(currentCtx, currentCanvas);
                break;
            case 'lissajous':
                this.drawLissajous(currentCtx, currentCanvas);
                break;
            case 'tunnel':
                this.drawTunnel(dataArray, currentCtx, currentCanvas);
                break;
        }
        
        if (this.showParticles && this.vizType !== 'particles') {
            this.updateAndDrawParticles(dataArray, currentCtx, currentCanvas);
        }
    }

    applyVizDefaults() {
        // Choose analyzer + visual defaults per mode
        const mode = this.vizType;
        let fft = 256;
        let smooth = 0.7;
        let sens = 1.0;
        let particles = true;

        switch (mode) {
            case 'bars':
                fft = 256; smooth = 0.65; sens = 1.2; particles = true; break;
            case 'dualBars':
                fft = 512; smooth = 0.65; sens = 1.1; particles = true; break;
            case 'radialBars':
                fft = 512; smooth = 0.7; sens = 1.0; particles = true; break;
            case 'circle':
                fft = 512; smooth = 0.7; sens = 1.0; particles = true; break;
            case 'spiral':
                fft = 512; smooth = 0.75; sens = 1.2; particles = true; break;
            case 'wave':
                fft = 2048; smooth = 0.85; sens = 1.0; particles = false; break;
            case 'lissajous':
                fft = 2048; smooth = 0.85; sens = 1.0; particles = false; break;
            case 'spectrogram':
                fft = 2048; smooth = 0.9; sens = 1.0; particles = false; break;
            case 'tunnel':
                fft = 256; smooth = 0.7; sens = 1.3; particles = true; break;
            case 'particles':
                fft = 256; smooth = 0.65; sens = 1.1; particles = true; break;
        }

        // Apply analyser settings if available
        if (this.analyser) {
            try { this.analyser.fftSize = fft; } catch {}
            this.analyser.smoothingTimeConstant = smooth;
        }
        // Apply visual settings
        this.sensitivity = sens;
        this.showParticles = particles;
    }

    syncUiControls() {
        if (this.showParticlesCheckbox) this.showParticlesCheckbox.checked = this.showParticles;
        if (this.fullscreenShowParticles) this.fullscreenShowParticles.checked = this.showParticles;
        if (this.sensitivitySlider) this.sensitivitySlider.value = String(this.sensitivity);
        if (this.fullscreenSensitivity) this.fullscreenSensitivity.value = String(this.sensitivity);
        if (this.vizTypeSelect) this.vizTypeSelect.value = this.vizType;
        if (this.fullscreenVizType) this.fullscreenVizType.value = this.vizType;
        if (this.autoCycleIntervalInput) this.autoCycleIntervalInput.value = String(this.autoCycleSeconds);
        if (this.fullscreenAutoCycleIntervalInput) this.fullscreenAutoCycleIntervalInput.value = String(this.autoCycleSeconds);
        if (this.autoCycleCheckbox && this.fullscreenAutoCycleCheckbox) {
            this.autoCycleCheckbox.checked = !!this.autoCycleTimer;
            this.fullscreenAutoCycleCheckbox.checked = !!this.autoCycleTimer;
        }
        // cycle mode
        if (this.cycleModeSelect && this.fullscreenCycleModeSelect) {
            const val = this.cycleModeSelect.value || 'random';
            this.cycleModeSelect.value = val;
            this.fullscreenCycleModeSelect.value = val;
        }
        // filters
        if (this.modeFilter && this.modeFilterCheckboxes.length) {
            this.modeFilterCheckboxes.forEach(cb => {
                const id = cb.id.replace('modeFilter-','');
                cb.checked = this.modeFilter.has(id);
            });
        }
        if (this.fullscreenModeFilterCheckboxes.length) {
            this.fullscreenModeFilterCheckboxes.forEach(cb => {
                const id = cb.id.replace('fullscreenModeFilter-','');
                cb.checked = this.modeFilter.has(id);
            });
        }
    }

    setRandomMode() {
        const modes = this.getFilteredModes();
        if (modes.length === 0) return;
        const current = this.vizType;
        let next = current;
        if (modes.length === 1) {
            next = modes[0];
        } else {
            while (next === current) {
                next = modes[Math.floor(Math.random() * modes.length)];
            }
        }
        this.vizType = next;
        this.applyVizDefaults();
        this.syncUiControls();
    }

    getFilteredModes() {
        return this.availableModes.filter(m => this.modeFilter.has(m));
    }

    startAutoCycle() {
        this.stopAutoCycle();
        const tick = () => {
            const modes = this.getFilteredModes();
            if (modes.length === 0) return;
            if ((this.cycleModeSelect?.value || 'random') === 'ordered') {
                const idx = modes.indexOf(this.vizType);
                const next = modes[(idx + 1) % modes.length];
                this.vizType = next;
                this.applyVizDefaults();
                this.syncUiControls();
            } else {
                this.setRandomMode();
            }
        };
    // Run immediately so users see it working right away
    tick();
    this.autoCycleTimer = setInterval(tick, this.autoCycleSeconds * 1000);
        this.syncUiControls();
    }

    stopAutoCycle() {
        if (this.autoCycleTimer) {
            clearInterval(this.autoCycleTimer);
            this.autoCycleTimer = null;
        }
        this.syncUiControls();
    }

    restartAutoCycle() {
        if (this.autoCycleTimer) {
            this.startAutoCycle();
        }
    }

    clearCanvas(ctx, canvas) {
        ctx = ctx || this.ctx;
        canvas = canvas || this.canvas;
        ctx.fillStyle = 'rgba(0, 4, 40, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawFrequencyBars(dataArray, ctx, canvas) {
        ctx = ctx || this.ctx;
        canvas = canvas || this.canvas;
        
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height * this.sensitivity;
            
            const hue = (i / dataArray.length) * 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            // Add glow effect
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            ctx.shadowBlur = 10;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            ctx.shadowBlur = 0;
            
            x += barWidth + 1;
        }
    }

    drawWaveform(ctx, canvas) {
        ctx = ctx || this.ctx;
        canvas = canvas || this.canvas;
        
        const bufferLength = this.analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#00ff00';
        ctx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.stroke();
        
        // Add glow
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawDualBars(dataArray, ctx, canvas) {
        ctx = ctx || this.ctx;
        canvas = canvas || this.canvas;
        const barWidth = (canvas.width / dataArray.length) * 2.2;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const value = dataArray[i] / 255;
            const barHeight = value * canvas.height * 0.45 * this.sensitivity;
            const hue = (i / dataArray.length) * 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;

            // Top half mirrored
            ctx.fillRect(x, (canvas.height / 2) - barHeight, barWidth, barHeight);
            // Bottom half
            ctx.fillRect(x, canvas.height / 2, barWidth, barHeight);

            // Glow
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            ctx.shadowBlur = 12;
            ctx.fillRect(x, (canvas.height / 2) - barHeight, barWidth, barHeight);
            ctx.fillRect(x, canvas.height / 2, barWidth, barHeight);
            ctx.shadowBlur = 0;
            x += barWidth + 1;
        }
        // Center line
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }

    drawRadialBars(dataArray, ctx, canvas) {
        ctx = ctx || this.ctx;
        canvas = canvas || this.canvas;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const baseR = Math.min(cx, cy) * 0.3;
        const maxExtra = Math.min(cx, cy) * 0.6;
        for (let i = 0; i < dataArray.length; i++) {
            const angle = (i / dataArray.length) * Math.PI * 2;
            const amp = (dataArray[i] / 255) * maxExtra * this.sensitivity;
            const r1 = baseR;
            const r2 = baseR + amp;
            const x1 = cx + Math.cos(angle) * r1;
            const y1 = cy + Math.sin(angle) * r1;
            const x2 = cx + Math.cos(angle) * r2;
            const y2 = cy + Math.sin(angle) * r2;
            const hue = (i / dataArray.length) * 360;
            ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        // center pulse
        const avg = dataArray.reduce((a,b)=>a+b,0)/dataArray.length/255;
        ctx.fillStyle = `rgba(0,255,65,${0.2+avg*0.5})`;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR*0.6 + avg*20, 0, Math.PI*2);
        ctx.fill();
    }

    drawSpectrogram(ctx, canvas) {
        ctx = ctx || this.ctx;
        canvas = canvas || this.canvas;
        // Shift the existing image up by 1px to create a scrolling spectrogram
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imageData, 0, -1);

        // Draw new line at the bottom representing current frequency bins
        const bufferLength = this.analyser.frequencyBinCount;
        const freq = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(freq);
        for (let x = 0; x < canvas.width; x++) {
            const idx = Math.floor((x / canvas.width) * bufferLength);
            const v = freq[idx] / 255;
            const hue = (idx / bufferLength) * 360;
            ctx.fillStyle = `hsl(${hue}, 100%, ${30 + v * 50}%)`;
            ctx.fillRect(x, canvas.height - 1, 1, 1);
        }
        // Optional glow overlay
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = '#000428';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
    }

    drawLissajous(ctx, canvas) {
        ctx = ctx || this.ctx;
        canvas = canvas || this.canvas;
        // Use time-domain data for X, and a slightly delayed slice for Y
        const bufferLength = this.analyser.fftSize;
        const time = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(time);
        const delay = Math.floor(bufferLength * 0.25);
        ctx.strokeStyle = 'rgba(0,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < bufferLength - delay; i++) {
            const tx = (time[i] - 128) / 128; // -1..1
            const ty = (time[i + delay] - 128) / 128; // -1..1
            const x = canvas.width * (0.5 + tx * 0.45);
            const y = canvas.height * (0.5 + ty * 0.45);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // glow
        ctx.shadowColor = 'cyan';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawTunnel(dataArray, ctx, canvas) {
        ctx = ctx || this.ctx;
        canvas = canvas || this.canvas;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const layers = 20;
        const avg = dataArray.reduce((a,b)=>a+b,0)/dataArray.length/255;
        for (let i = 0; i < layers; i++) {
            const t = i / layers;
            const size = (1 - t) * Math.min(cx, cy);
            const wobble = Math.sin((performance.now()/400 + i) + avg*10) * 10 * this.sensitivity;
            const hue = (t * 360 + performance.now()/50) % 360;
            ctx.strokeStyle = `hsla(${hue},100%,60%,${0.6 - t*0.5})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let a = 0; a <= Math.PI * 2; a += Math.PI / 24) {
                const r = size + Math.sin(a * 6 + i) * (5 + avg * 30) + wobble;
                const x = cx + Math.cos(a) * r;
                const y = cy + Math.sin(a) * r;
                if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }

    drawCircularVisualization(dataArray, ctx, canvas) {
        ctx = ctx || this.ctx;
        canvas = canvas || this.canvas;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;

        for (let i = 0; i < dataArray.length; i++) {
            const amplitude = (dataArray[i] / 255) * radius * this.sensitivity;
            const angle = (i / dataArray.length) * Math.PI * 2;
            
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + amplitude);
            const y2 = centerY + Math.sin(angle) * (radius + amplitude);
            
            const hue = (i / dataArray.length) * 360;
            ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    drawSpiralVisualization(dataArray, ctx, canvas) {
        ctx = ctx || this.ctx;
        canvas = canvas || this.canvas;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(centerX, centerY) * 0.8;

        ctx.beginPath();
        for (let i = 0; i < dataArray.length; i++) {
            const amplitude = (dataArray[i] / 255) * 50 * this.sensitivity;
            const angle = (i / dataArray.length) * Math.PI * 8; // Multiple rotations
            const radius = (i / dataArray.length) * maxRadius + amplitude;
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Add glow
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawParticleVisualization(dataArray, ctx, canvas) {
        ctx = ctx || this.ctx;
        canvas = canvas || this.canvas;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Create new particles based on audio data
        for (let i = 0; i < dataArray.length; i += 8) {
            const amplitude = (dataArray[i] / 255) * this.sensitivity;
            if (amplitude > 0.3) {
                const angle = Math.random() * Math.PI * 2;
                const speed = amplitude * 5;
                this.particles.push({
                    x: centerX,
                    y: centerY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 100,
                    maxLife: 100,
                    hue: (i / dataArray.length) * 360
                });
            }
        }
        
        this.updateAndDrawParticles(dataArray, ctx, canvas);
    }

    updateAndDrawParticles(dataArray, ctx, canvas) {
        ctx = ctx || this.ctx;
        canvas = canvas || this.canvas;
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            // Add some audio-reactive behavior
            const avgAmplitude = dataArray.reduce((a, b) => a + b) / dataArray.length / 255;
            particle.vx += (Math.random() - 0.5) * avgAmplitude * this.sensitivity;
            particle.vy += (Math.random() - 0.5) * avgAmplitude * this.sensitivity;
            
            // Remove dead particles
            if (particle.life <= 0 || 
                particle.x < 0 || particle.x > canvas.width ||
                particle.y < 0 || particle.y > canvas.height) {
                this.particles.splice(i, 1);
            }
        }
        
        // Keep particle count manageable
        while (this.particles.length > 200) {
            this.particles.shift();
        }
        
        // Draw particles
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            const size = alpha * 3;
            
            ctx.fillStyle = `hsla(${particle.hue}, 100%, 50%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Add glow
            ctx.shadowColor = `hsl(${particle.hue}, 100%, 50%)`;
            ctx.shadowBlur = size * 2;
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    }
}

// Initialize the visualizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AudioVisualizer();
});
