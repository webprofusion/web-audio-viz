# 🎵 Web Audio Visualizer

A retro-style web-based music visualizer inspired by classic Winamp screensavers. Drop in your audio files and enjoy stunning real-time visualizations that react to your music!

![Web Audio Visualizer Demo](https://img.shields.io/badge/Status-Live-green)

## ✨ Features

### 🎮 **Audio Player**
- **Drag & Drop Support**: Simply drop MP3, WAV, and other audio files
- **Multi-file Playlist**: Load multiple tracks and navigate between them
- **Full Controls**: Play, pause, stop, previous/next, seek, volume control
- **Track Information**: Display current track name and playback time

### 🌈 **Visualization Modes**
- **Frequency Bars**: Classic spectrum analyzer with colorful bars
- **Waveform**: Real-time audio waveform display
- **Circular**: Radial frequency visualization
- **Spiral**: Mesmerizing spinning spiral patterns
- **Particles**: Audio-reactive particle system

### 🎨 **Visual Effects**
- **Retro Styling**: Neon green, magenta, and cyan color scheme
- **Glowing Effects**: CSS shadows and particle glow
- **Particle Overlay**: Optional floating particles on any visualization
- **Sensitivity Control**: Adjust visualization responsiveness
- **Smooth Animations**: 60fps canvas-based rendering

### 🔲 **Fullscreen Mode**
- **Immersive Experience**: Hide UI for full-screen visualization
- **Floating Controls**: Minimal controls in fullscreen
- **Keyboard Shortcuts**: F11 or 'F' to toggle, Escape to exit
- **Responsive Design**: Adapts to any screen size

## 🚀 Quick Start

1. Open `index.html` in a modern web browser
2. Drag & drop audio files or click "Select Files"
3. Use player controls to manage playback
4. Switch between visualization modes
5. Click "🔲 Fullscreen" for immersive experience

## 🎯 Usage

### Loading Music
- **Drag & Drop**: Drop audio files directly onto the interface
- **File Browser**: Click "Select Files" to browse your music library
- **Supported Formats**: MP3, WAV, FLAC, OGG, and most web-supported audio formats

### Controls
- **▶️/⏸️**: Play/Pause current track
- **⏹️**: Stop and reset to beginning
- **⏮️/⏭️**: Previous/Next track
- **Progress Bar**: Click to seek to any position
- **Volume**: Adjust playback volume

### Visualizations
- **Mode Selector**: Choose from 5 different visualization types
- **Particles Toggle**: Add/remove floating particle effects
- **Sensitivity**: Control how reactive visuals are to audio

### Fullscreen
- **Enter**: Click fullscreen button or press 'F'
- **Exit**: Press Escape or click exit button
- **Controls**: Floating panel in top-right corner

## 🛠️ Technical Details

### Built With
- **Vanilla JavaScript**: No frameworks, pure web APIs
- **Web Audio API**: Real-time audio analysis
- **Canvas 2D**: High-performance graphics rendering
- **CSS3**: Modern styling with animations and effects
- **HTML5**: Semantic markup and audio element

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (may require user interaction for audio)
- Mobile browsers: Responsive design included

### Audio Analysis
- **FFT Size**: 256 samples for smooth visualization
- **Frequency Data**: Real-time frequency domain analysis
- **Time Domain**: Waveform visualization support
- **60fps Rendering**: Smooth animations via requestAnimationFrame

## 🎨 Customization

The visualizer is highly customizable through the code:

### Colors
Modify the color schemes in the drawing functions:
```javascript
const hue = (i / dataArray.length) * 360;
ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
```

### Effects
Adjust glow and shadow effects:
```javascript
ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
ctx.shadowBlur = 10;
```

### Particle System
Customize particle behavior in `updateAndDrawParticles()`:
- Particle count (currently 200 max)
- Lifetime (currently 100 frames)
- Speed and physics

## 📱 Mobile Support

The visualizer includes responsive design optimizations:
- Touch-friendly controls
- Optimized layouts for mobile screens
- Gesture support for fullscreen mode
- Performance optimizations for mobile browsers

## 🔧 Development

### File Structure
```
web-audio-viz/
├── index.html          # Main HTML structure
├── styles.css          # CSS styling and animations
├── script.js           # JavaScript audio visualizer logic
└── README.md          # This documentation
```

### Local Development
1. Clone the repository
2. Open `index.html` in a web browser
3. No build process required - pure vanilla web technologies

## 🎵 Demo

Try it live: [Open index.html](./index.html)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by classic Winamp visualizations
- Built with modern web standards
- Designed for music lovers and developers alike

---

**Enjoy the visual music experience!** 🎶✨
