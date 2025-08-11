class AudioVisualizer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.audioElement = document.getElementById('audioElement');
        this.canvas = document.getElementById('visualizer');
        this.ctx = this.canvas.getContext('2d');
        this.fullscreenCanvas = document.getElementById('fullscreenCanvas');
        this.fullscreenCtx = this.fullscreenCanvas.getContext('2d');
    // WebGPU: optional GPU canvases
    this.webgpuCanvas = document.getElementById('webgpuCanvas');
    this.fullscreenWebgpuCanvas = document.getElementById('fullscreenWebgpuCanvas');
    this.gpu = null;
    this.gpuAdapter = null;
    this.gpuDevice = null;
    this.gpuContext = null; // main
    this.gpuFsContext = null; // fullscreen
    this.gpuFormat = null;
    this.gpuPipeline = null;
    this.gpuUniformBuffer = null;
    this.gpuBindGroup = null;
    this.gpuFsPipeline = null;
    this.gpuFsUniformBuffer = null;
    this.gpuFsBindGroup = null;
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
        
        // Define visualization config (single source of truth)
        this.vizConfig = [
            { id: 'bars', label: 'Frequency Bars', isGpu: false },
            { id: 'wave', label: 'Waveform', isGpu: false },
            { id: 'circle', label: 'Circular', isGpu: false },
            { id: 'spiral', label: 'Spiral', isGpu: false },
            { id: 'particles', label: 'Particles', isGpu: false },
            { id: 'dualBars', label: 'Mirrored Bars', isGpu: false },
            { id: 'radialBars', label: 'Radial Bars', isGpu: false },
            { id: 'spectrogram', label: 'Spectrogram', isGpu: false },
            { id: 'lissajous', label: 'Lissajous', isGpu: false },
            { id: 'tunnel', label: 'Tunnel Grid', isGpu: false },
            { id: 'webgpu', label: 'WebGPU Neon Ring', isGpu: true },
            { id: 'webgpuFlow', label: 'WebGPU Flow Field', isGpu: true },
            { id: 'webgpuGrid', label: 'WebGPU Pulsing Grid', isGpu: true },
            { id: 'webgpuCenter', label: 'WebGPU Center Flow', isGpu: true }
        ];

        this.initializeElements();
        this.setupEventListeners();
        this.setupCanvas();
        this.initializeParticles();
    // Load persisted settings if available, apply defaults, then sync UI
    this.loadSettings();
    // Ensure current vizType is valid; fallback if needed
    if (!this.availableModes.includes(this.vizType)) this.vizType = 'bars';
    this.applyVizDefaults();
    this.syncUiControls();
    // Spectrogram rendering settings
    this.spectrogramRowHeight = 2;
    // WebGPU sizing cache
    this._gpuSized = false;
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
    this.playlistContainer = document.getElementById('playlist');
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
    this.cycleOptions = document.getElementById('cycleOptions');
    this.fullscreenCycleOptions = document.getElementById('fullscreenCycleOptions');
    // Cycle order and filters
    this.cycleModeSelect = document.getElementById('cycleMode');
    this.fullscreenCycleModeSelect = document.getElementById('fullscreenCycleMode');
    this.availableModes = this.vizConfig.map(v => v.id);
    this.modeFilter = new Set(this.availableModes);
    // Dynamically build selects and filter grids
    this.buildVizControls();
    }

    buildVizControls() {
        // Populate main and fullscreen selects
        const fillSelect = (sel) => {
            if (!sel) return;
            sel.innerHTML = '';
            this.vizConfig.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.textContent = v.label;
                sel.appendChild(opt);
            });
        };
        fillSelect(this.vizTypeSelect);
        fillSelect(this.fullscreenVizType);
        // Populate filter checkbox grids
        const mainGrid = document.getElementById('modeFilterGrid');
        const fsGrid = document.getElementById('fullscreenModeFilterGrid');
        const makeCb = (prefix, v) => {
            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = `${prefix}-${v.id}`;
            cb.checked = true;
            label.appendChild(cb);
            label.appendChild(document.createTextNode(` ${v.label}`));
            return label;
        };
        if (mainGrid) {
            mainGrid.innerHTML = '';
            this.vizConfig.forEach(v => mainGrid.appendChild(makeCb('modeFilter', v)));
        }
        if (fsGrid) {
            fsGrid.innerHTML = '';
            this.vizConfig.forEach(v => fsGrid.appendChild(makeCb('fullscreenModeFilter', v)));
        }
        // Collect checkbox NodeLists after building
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
            this.toggleWebGPUVisibility();
            this.saveSettings();
        });
        this.showParticlesCheckbox.addEventListener('change', (e) => {
            this.showParticles = e.target.checked;
            this.fullscreenShowParticles.checked = e.target.checked;
            this.saveSettings();
        });
        this.sensitivitySlider.addEventListener('input', (e) => {
            this.sensitivity = parseFloat(e.target.value);
            this.fullscreenSensitivity.value = e.target.value;
            this.saveSettings();
        });

        // Actions
        this.resetDefaultsBtn.addEventListener('click', () => {
            this.applyVizDefaults();
            this.syncUiControls();
            this.saveSettings();
        });
        this.randomizeModeBtn.addEventListener('click', () => {
            this.setRandomMode();
            this.saveSettings();
        });

        // Auto cycle main
        this.autoCycleCheckbox.addEventListener('change', (e) => {
            this.fullscreenAutoCycleCheckbox.checked = e.target.checked;
            if (this.cycleOptions) this.cycleOptions.style.display = e.target.checked ? '' : 'none';
            if (e.target.checked) {
                this.startAutoCycle();
            } else {
                this.stopAutoCycle();
            }
            this.saveSettings();
        });
        this.autoCycleIntervalInput.addEventListener('input', (e) => {
            const v = Math.max(2, Math.min(60, parseInt(e.target.value || '10', 10)));
            this.autoCycleSeconds = v;
            this.fullscreenAutoCycleIntervalInput.value = String(v);
            if (this.autoCycleTimer) this.restartAutoCycle();
            this.saveSettings();
        });

        // Cycle mode select
        if (this.cycleModeSelect) {
            this.cycleModeSelect.addEventListener('change', (e) => {
                const mode = e.target.value === 'ordered' ? 'ordered' : 'random';
                this.fullscreenCycleModeSelect.value = mode;
                if (this.autoCycleTimer) this.restartAutoCycle();
                this.saveSettings();
            });
        }

        // Mode filter main
        const allBtn = document.getElementById('modeFilterAll');
        const noneBtn = document.getElementById('modeFilterNone');
    if (allBtn) allBtn.addEventListener('click', () => { this.setModeFilterAll(true); this.saveSettings(); });
    if (noneBtn) noneBtn.addEventListener('click', () => { this.setModeFilterAll(false); this.saveSettings(); });
    // re-query in case buildVizControls ran after constructor properties were set
    this.modeFilterCheckboxes = this.availableModes.map(id => document.getElementById(`modeFilter-${id}`)).filter(Boolean);
    this.modeFilterCheckboxes.forEach(cb => cb.addEventListener('change', () => { this.onModeFilterChanged('main'); this.saveSettings(); }));

        // Fullscreen controls
        this.fullscreenBtn.addEventListener('click', this.enterFullscreen.bind(this));
        this.exitFullscreenBtn.addEventListener('click', this.exitFullscreen.bind(this));
        
        // Fullscreen visualization controls
        this.fullscreenVizType.addEventListener('change', (e) => {
            this.vizType = e.target.value;
            this.vizTypeSelect.value = e.target.value;
            this.applyVizDefaults();
            this.syncUiControls();
            this.toggleWebGPUVisibility();
            this.saveSettings();
        });
        this.fullscreenShowParticles.addEventListener('change', (e) => {
            this.showParticles = e.target.checked;
            this.showParticlesCheckbox.checked = e.target.checked;
            this.saveSettings();
        });
        this.fullscreenSensitivity.addEventListener('input', (e) => {
            this.sensitivity = parseFloat(e.target.value);
            this.sensitivitySlider.value = e.target.value;
            this.saveSettings();
        });

        this.fullscreenResetDefaultsBtn.addEventListener('click', () => {
            this.applyVizDefaults();
            this.syncUiControls();
            this.saveSettings();
        });
        this.fullscreenRandomizeModeBtn.addEventListener('click', () => {
            this.setRandomMode();
            this.saveSettings();
        });

        // Auto cycle fullscreen
        this.fullscreenAutoCycleCheckbox.addEventListener('change', (e) => {
            this.autoCycleCheckbox.checked = e.target.checked;
            if (this.fullscreenCycleOptions) this.fullscreenCycleOptions.style.display = e.target.checked ? '' : 'none';
            if (e.target.checked) {
                this.startAutoCycle();
            } else {
                this.stopAutoCycle();
            }
            this.saveSettings();
        });
        this.fullscreenAutoCycleIntervalInput.addEventListener('input', (e) => {
            const v = Math.max(2, Math.min(60, parseInt(e.target.value || '10', 10)));
            this.autoCycleSeconds = v;
            this.autoCycleIntervalInput.value = String(v);
            if (this.autoCycleTimer) this.restartAutoCycle();
            this.saveSettings();
        });

        // Fullscreen cycle select
        if (this.fullscreenCycleModeSelect) {
            this.fullscreenCycleModeSelect.addEventListener('change', (e) => {
                const mode = e.target.value === 'ordered' ? 'ordered' : 'random';
                this.cycleModeSelect.value = mode;
                if (this.autoCycleTimer) this.restartAutoCycle();
                this.saveSettings();
            });
        }
        // Fullscreen filter
        const fsAll = document.getElementById('fullscreenModeFilterAll');
        const fsNone = document.getElementById('fullscreenModeFilterNone');
    if (fsAll) fsAll.addEventListener('click', () => { this.setModeFilterAll(true); this.saveSettings(); });
    if (fsNone) fsNone.addEventListener('click', () => { this.setModeFilterAll(false); this.saveSettings(); });
    this.fullscreenModeFilterCheckboxes = this.availableModes.map(id => document.getElementById(`fullscreenModeFilter-${id}`)).filter(Boolean);
    this.fullscreenModeFilterCheckboxes.forEach(cb => cb.addEventListener('change', () => { this.onModeFilterChanged('fs'); this.saveSettings(); }));

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

    toggleWebGPUVisibility() {
        const isGpu = this.vizType === 'webgpu' || this.vizType === 'webgpuFlow' || this.vizType === 'webgpuGrid' || this.vizType === 'webgpuCenter';
        if (this.webgpuCanvas) this.webgpuCanvas.style.display = isGpu ? '' : 'none';
        if (this.canvas) this.canvas.style.display = isGpu ? 'none' : '';
        if (this.fullscreenWebgpuCanvas) this.fullscreenWebgpuCanvas.style.display = (isGpu && this.isFullscreen) ? '' : 'none';
        if (this.fullscreenCanvas) this.fullscreenCanvas.style.display = (isGpu && this.isFullscreen) ? 'none' : '';
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

        // Size GPU canvases similarly
        if (this.webgpuCanvas) {
            this.webgpuCanvas.width = rect.width;
            this.webgpuCanvas.height = rect.height;
        }
        if (this.fullscreenWebgpuCanvas) {
            this.fullscreenWebgpuCanvas.width = window.innerWidth;
            this.fullscreenWebgpuCanvas.height = window.innerHeight;
        }
    // If WebGPU initialized, reconfigure contexts to new size
        if (this.gpuDevice) {
            this.configureGpuContexts();
        }
    }

    enterFullscreen() {
        this.isFullscreen = true;
        this.fullscreenVisualizer.style.display = 'block';
        this.setupCanvas();
    this.toggleWebGPUVisibility();
        
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
                this.toggleWebGPUVisibility();
        
        // Exit browser fullscreen if active
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    async ensureWebGPU() {
                if (this.gpuDevice) return true;
                try {
                        if (!('gpu' in navigator)) return false;
                        this.gpu = navigator.gpu;
                        this.gpuAdapter = await this.gpu.requestAdapter();
                        if (!this.gpuAdapter) return false;
                        this.gpuDevice = await this.gpuAdapter.requestDevice();
                        this.gpuFormat = this.gpu.getPreferredCanvasFormat();
                        this.configureGpuContexts();
                        await this.createGpuPipelines();
                        return true;
                } catch {
                        return false;
                }
        }

        configureGpuContexts() {
                if (this.webgpuCanvas && !this.gpuContext) {
                        this.gpuContext = this.webgpuCanvas.getContext('webgpu');
                }
                if (this.gpuContext) {
                        this.gpuContext.configure({ device: this.gpuDevice, format: this.gpuFormat, alphaMode: 'premultiplied' });
                }
                if (this.fullscreenWebgpuCanvas && !this.gpuFsContext) {
                        this.gpuFsContext = this.fullscreenWebgpuCanvas.getContext('webgpu');
                }
                if (this.gpuFsContext) {
                        this.gpuFsContext.configure({ device: this.gpuDevice, format: this.gpuFormat, alphaMode: 'premultiplied' });
                }
        }

    async createGpuPipelines() {
            const wgsl2 = `
    struct Uniforms { time:f32, amp:f32, aspect:f32, mode:f32 };
    @group(0) @binding(0) var<uniform> u:Uniforms;

        struct VSOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };

        @vertex fn vs(@builtin(vertex_index) vid:u32) -> VSOut {
            var positions = array<vec2f,6>(
                vec2f(-1.0,-1.0), vec2f(1.0,-1.0), vec2f(-1.0,1.0),
                vec2f(-1.0,1.0), vec2f(1.0,-1.0), vec2f(1.0,1.0)
            );
            let p = positions[vid];
            var out: VSOut;
            out.pos = vec4f(p,0.0,1.0);
            out.uv = p; // clip-space -1..1
            return out;
        }

        fn neonColor(t:f32)->vec3f{
            let r = 0.5 + 0.5 * sin(6.28318*(t));
            let g = 0.5 + 0.5 * sin(6.28318*(t)+2.094);
            let b = 0.5 + 0.5 * sin(6.28318*(t)+4.188);
            return vec3f(r,g,b);
        }

        fn hash(p:vec2f)->f32 { return fract(sin(dot(p, vec2f(127.1,311.7))) * 43758.5453); }

        @fragment fn fs(@location(0) uvIn:vec2f)->@location(0) vec4f{
            var uv = uvIn;
            uv.x *= u.aspect;
            let r = length(uv);
            let mode = u.mode; // 0: ring, 1: flow, 2: grid, 3: center flow
            var col = vec3f(0.0,0.0,0.0);
            if (mode < 0.5) {
                // Neon Ring
                let k = 10.0 + u.amp * 30.0;
                let waves = sin(k * r - u.time*2.0);
                let glow = exp(-8.0 * abs(waves));
                let hue = fract(r * 0.75 + u.time * 0.05);
                col = neonColor(hue) * (0.3 + 0.7 * glow);
            } else if (mode < 1.5) {
                // Flow Field
                var p = uv * 1.2;
                let t = u.time * 0.2;
                let a = sin(p.x*3.0 + t) + cos(p.y*3.0 - t*1.3);
                let b = cos(p.x*2.0 - t*1.7) - sin(p.y*2.5 + t*0.7);
                let v = sin(a*b + r*6.0 + u.amp*8.0);
                let hue = fract(0.5 + v*0.2 + u.time*0.02);
                col = neonColor(hue) * (0.4 + 0.6 * smoothstep(0.2,1.0,abs(v)));
            } else if (mode < 2.5) {
                // Pulsing Grid
                var p = uv * 10.0;
                let gx = abs(fract(p.x) - 0.5);
                let gy = abs(fract(p.y) - 0.5);
                let g = max(0.0, 0.5 - min(gx, gy)*1.6);
                let pulse = 0.5 + 0.5*sin(u.time*3.0 + r*12.0 + u.amp*20.0);
                let hue = fract(uv.x*0.3 + uv.y*0.2 + u.time*0.05);
                col = neonColor(hue) * (g * (0.2 + 0.8*pulse));
            } else {
                // Center Flow: concentric radial bands flowing outward from center
                var p = uv;
                let ang = atan2(p.y, p.x);
                let bandFreq = 20.0 + u.amp * 30.0; // number of bands
                // Move bands outward over time; mod by 1.0 for repeating stripes
                let flow = fract(r * bandFreq - u.time * (1.2 + u.amp*0.8));
                // Sharpen band edges and glow
                let edge = 1.0 - smoothstep(0.45, 0.5, abs(flow - 0.5));
                let glow = pow(edge, 2.0);
                let hue = fract(ang / 6.28318 + u.time * 0.05);
                col = neonColor(hue) * (0.25 + 0.75 * glow);
            }
            return vec4f(col,1.0);
        }
        `;

                const module = this.gpuDevice.createShaderModule({ code: wgsl2 });
                const pipelineDesc = {
                        layout: 'auto',
                        vertex: { module, entryPoint: 'vs' },
                        fragment: { module, entryPoint: 'fs', targets: [{ format: this.gpuFormat }] },
                        primitive: { topology: 'triangle-list' }
                };
                this.gpuPipeline = this.gpuDevice.createRenderPipeline(pipelineDesc);
                this.gpuFsPipeline = this.gpuPipeline; // same pipeline OK for both

                // Create uniforms buffer and bind group (shared shape)
                const uSize = 16; // 4 f32
                this.gpuUniformBuffer = this.gpuDevice.createBuffer({ size: uSize, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
                this.gpuBindGroup = this.gpuDevice.createBindGroup({ layout: this.gpuPipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.gpuUniformBuffer } }] });
                this.gpuFsUniformBuffer = this.gpuDevice.createBuffer({ size: uSize, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
                this.gpuFsBindGroup = this.gpuDevice.createBindGroup({ layout: this.gpuPipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.gpuFsUniformBuffer } }] });
        }

    drawWebGPU(currentCtxIsFullscreen) {
                if (!this.gpuDevice) return;
                const t = performance.now() * 0.001;
                // Estimate amplitude from analyser
                let amp = 0.0;
                if (this.analyser) {
                        const n = this.analyser.frequencyBinCount;
                        const arr = new Uint8Array(n);
                        this.analyser.getByteFrequencyData(arr);
                        let sum = 0;
                        for (let i=0;i<n;i++) sum += arr[i];
                        amp = (sum / (n*255)) * this.sensitivity;
                }
        // Choose mode index for shader
    let modeIdx = 0; // ring
    if (this.vizType === 'webgpuFlow') modeIdx = 1;
    else if (this.vizType === 'webgpuGrid') modeIdx = 2;
    else if (this.vizType === 'webgpuCenter') modeIdx = 3;
                if (currentCtxIsFullscreen) {
                        const aspect = this.fullscreenWebgpuCanvas.width / Math.max(1, this.fullscreenWebgpuCanvas.height);
            const data = new Float32Array([t, amp, aspect, modeIdx]);
                        this.gpuDevice.queue.writeBuffer(this.gpuFsUniformBuffer, 0, data.buffer);
                        const encoder = this.gpuDevice.createCommandEncoder();
                        const view = this.gpuFsContext.getCurrentTexture().createView();
                        const pass = encoder.beginRenderPass({ colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
                        pass.setPipeline(this.gpuFsPipeline);
                        pass.setBindGroup(0, this.gpuFsBindGroup);
                        pass.draw(6);
                        pass.end();
                        this.gpuDevice.queue.submit([encoder.finish()]);
                } else {
                        const aspect = this.webgpuCanvas.width / Math.max(1, this.webgpuCanvas.height);
            const data = new Float32Array([t, amp, aspect, modeIdx]);
                        this.gpuDevice.queue.writeBuffer(this.gpuUniformBuffer, 0, data.buffer);
                        const encoder = this.gpuDevice.createCommandEncoder();
                        const view = this.gpuContext.getCurrentTexture().createView();
                        const pass = encoder.beginRenderPass({ colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
                        pass.setPipeline(this.gpuPipeline);
                        pass.setBindGroup(0, this.gpuBindGroup);
                        pass.draw(6);
                        pass.end();
                        this.gpuDevice.queue.submit([encoder.finish()]);
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

    loadFiles(files, autoPlay = true) {
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
    this.playlistContainer.style.display = 'block';
        this.dropZone.style.display = 'none';
        // Auto-play the first track on user file selection/drop
        if (autoPlay) {
            // Defer slightly to ensure AudioContext is initialized and src set
            setTimeout(() => {
                this.play()?.catch?.(() => { /* ignore autoplay policy errors */ });
            }, 0);
        }
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
            case 'webgpu':
            case 'webgpuFlow':
            case 'webgpuGrid':
            case 'webgpuCenter':
                // Ensure WebGPU is ready then render
                this.drawWebGPU(this.isFullscreen);
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
                fft = 2048; smooth = 0.9; sens = 1.2; particles = false; this.spectrogramRowHeight = 2; break;
            case 'tunnel':
                fft = 256; smooth = 0.7; sens = 1.3; particles = true; break;
            case 'particles':
                fft = 256; smooth = 0.65; sens = 1.1; particles = true; break;
            case 'webgpu':
            case 'webgpuFlow':
            case 'webgpuGrid':
            case 'webgpuCenter':
                fft = 512; smooth = 0.8; sens = 1.1; particles = false; 
                // Lazy-init WebGPU and fallback to bars if unsupported
                this.ensureWebGPU().then((ok)=>{ 
                    if (!ok) { 
                        this.vizType = 'bars'; 
                        this.toggleWebGPUVisibility();
                        this.applyVizDefaults();
                        this.syncUiControls();
                    }
                });
                break;
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

    // Persist and restore settings
    saveSettings() {
        try {
            const obj = {
                vizType: this.vizType,
                showParticles: this.showParticles,
                sensitivity: this.sensitivity,
                autoCycle: !!this.autoCycleTimer || (this.autoCycleCheckbox?.checked ?? false),
                autoCycleSeconds: this.autoCycleSeconds,
                cycleMode: this.cycleModeSelect?.value || 'random',
                modeFilter: Array.from(this.modeFilter || [])
            };
            localStorage.setItem('waviz.settings', JSON.stringify(obj));
        } catch {}
    }

    loadSettings() {
        try {
            const raw = localStorage.getItem('waviz.settings');
            if (!raw) return;
            const s = JSON.parse(raw);
            if (typeof s.vizType === 'string') this.vizType = s.vizType;
            if (typeof s.showParticles === 'boolean') this.showParticles = s.showParticles;
            if (typeof s.sensitivity === 'number') this.sensitivity = s.sensitivity;
            if (typeof s.autoCycleSeconds === 'number') this.autoCycleSeconds = Math.max(2, Math.min(60, s.autoCycleSeconds));
            if (Array.isArray(s.modeFilter) && s.modeFilter.length) this.modeFilter = new Set(s.modeFilter.filter(m => this.availableModes.includes(m)));
            // write to UI if elements exist; start auto cycle if requested
            if (this.vizTypeSelect) this.vizTypeSelect.value = this.vizType;
            if (this.fullscreenVizType) this.fullscreenVizType.value = this.vizType;
            if (this.showParticlesCheckbox) this.showParticlesCheckbox.checked = this.showParticles;
            if (this.fullscreenShowParticles) this.fullscreenShowParticles.checked = this.showParticles;
            if (this.sensitivitySlider) this.sensitivitySlider.value = String(this.sensitivity);
            if (this.fullscreenSensitivity) this.fullscreenSensitivity.value = String(this.sensitivity);
            if (this.autoCycleIntervalInput) this.autoCycleIntervalInput.value = String(this.autoCycleSeconds);
            if (this.fullscreenAutoCycleIntervalInput) this.fullscreenAutoCycleIntervalInput.value = String(this.autoCycleSeconds);
            if (this.cycleModeSelect && typeof s.cycleMode === 'string') {
                const val = s.cycleMode === 'ordered' ? 'ordered' : 'random';
                this.cycleModeSelect.value = val;
                if (this.fullscreenCycleModeSelect) this.fullscreenCycleModeSelect.value = val;
            }
            // Update filter checkboxes
            if (this.modeFilterCheckboxes?.length) {
                this.modeFilterCheckboxes.forEach(cb => {
                    const id = cb.id.replace('modeFilter-','');
                    cb.checked = this.modeFilter.has(id);
                });
            }
            if (this.fullscreenModeFilterCheckboxes?.length) {
                this.fullscreenModeFilterCheckboxes.forEach(cb => {
                    const id = cb.id.replace('fullscreenModeFilter-','');
                    cb.checked = this.modeFilter.has(id);
                });
            }
            // Auto cycle last: reflects in UI and timer
            if (s.autoCycle) {
                if (this.autoCycleCheckbox) this.autoCycleCheckbox.checked = true;
                if (this.fullscreenAutoCycleCheckbox) this.fullscreenAutoCycleCheckbox.checked = true;
                this.startAutoCycle();
            }
        } catch {}
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
            if (this.cycleOptions) this.cycleOptions.style.display = this.autoCycleTimer ? '' : 'none';
            if (this.fullscreenCycleOptions) this.fullscreenCycleOptions.style.display = this.autoCycleTimer ? '' : 'none';
        }
        // cycle mode
        if (this.cycleModeSelect && this.fullscreenCycleModeSelect) {
            const val = this.cycleModeSelect.value || 'random';
            this.cycleModeSelect.value = val;
            this.fullscreenCycleModeSelect.value = val;
        }
        // filters
    if (this.modeFilter && this.modeFilterCheckboxes && this.modeFilterCheckboxes.length) {
            this.modeFilterCheckboxes.forEach(cb => {
                const id = cb.id.replace('modeFilter-','');
                cb.checked = this.modeFilter.has(id);
            });
        }
    if (this.fullscreenModeFilterCheckboxes && this.fullscreenModeFilterCheckboxes.length) {
            this.fullscreenModeFilterCheckboxes.forEach(cb => {
                const id = cb.id.replace('fullscreenModeFilter-','');
                cb.checked = this.modeFilter.has(id);
            });
        }
    this.toggleWebGPUVisibility();
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
        const rowH = Math.max(1, this.spectrogramRowHeight | 0);
        // Shift the existing image up by rowH pixels to create scroll
        // Note: get/putImageData is used for simplicity and broad compatibility
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imageData, 0, -rowH);

        // Draw new stripe at the bottom representing current frequency bins
        const bufferLength = this.analyser.frequencyBinCount;
        const freq = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(freq);
        const yStart = canvas.height - rowH;
        for (let x = 0; x < canvas.width; x++) {
            const idx = Math.floor((x / canvas.width) * bufferLength);
            // Brightness scaled by sensitivity with light gamma to lift quieter content
            const v = (freq[idx] / 255) * this.sensitivity;
            const brightness = 30 + Math.min(1, Math.pow(v, 0.8)) * 55; // 30%..85%
            const hue = (idx / bufferLength) * 360;
            ctx.fillStyle = `hsl(${hue}, 100%, ${brightness}%)`;
            ctx.fillRect(x, yStart, 1, rowH);
        }
        // Subtle darkening to prevent infinite persistence
        ctx.globalAlpha = 0.02;
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
