# Sangeetham — Carnatic Voice Trainer

> A web app for learning and practicing Carnatic music with real-time pitch detection, guided swara exercises, tanpura drone, and a library of 100+ compositions.

---

## What is Sangeetham?

Sangeetham (Sanskrit: *संगीतम्* — "music") is an interactive Carnatic music learning platform built for vocalists at all levels. It combines **swara notation**, **sahitya (lyrics)**, and **audio playback** in a single synchronized view, while providing real-time feedback on your pitch accuracy using your device's microphone.

Whether you are a beginner learning Sarali Varisai or an advanced student practicing Varnams and Krithis, Sangeetham gives you the tools to practice independently with the precision of a guru's ear.

---

## Features

### Pitch Detection & Feedback
- **Real-time pitch detection** using autocorrelation with parabolic interpolation
- **Cent-level accuracy** — detects deviation from the target swara in fractions of a semitone
- **Color-coded feedback**: Green (±15¢ perfect) · Yellow (±35¢ good) · Red (off-pitch)
- **Pitch curve visualizer** — scrolling canvas that overlays your sung pitch against the reference melody

### Tanpura Drone
- **Authentic tanpura synthesis** via additive harmonics (8 partials) with natural pluck decay
- Classic **Sa–Pa–Ṡa–Sa strumming pattern** cycling continuously
- **12 shruti presets** (C through B, 130–247 Hz) to match any singer's vocal range

### Guided Practice
- **Structured exercise mode** with countdown, real-time note queue, and auto-advance
- **Per-note scoring** with session history saved locally
- **Post-session feedback** with overall accuracy percentage, grade badge, and note-by-note breakdown

### Song Library (115+ Compositions)
| Category | Count | Examples |
|---|---|---|
| Basic Practices | 2 | Sarali Varisai, Janta Varisai |
| Geethams | 9 | Malahari, Saveri, Kalyani, Mohanam, Arabhi |
| Swarajatis | 2 | Bilahari, Khamas |
| Varnams | 24 | Bhairavi, Hamsadhwani, Mohanam, Kalyani |
| Krithis | 75+ | Tyagaraja, Muthuswami Dikshitar compositions |
| Thillanas | 3 | Revathi, Brindavani, Kamas |

Each piece includes: raga, tala, composer, and composition type. The browser supports filtering by any of these fields plus full-text search.

### Swara System
- 12 Carnatic swaras with **just intonation ratios**: Sa · Ri₁ · Ri₂ · Ga₂ · Ga₃ · Ma₁ · Ma₂ · Pa · Da₁ · Da₂ · Ni₂ · Ni₃ · Ṡa
- Swara names displayed in both Carnatic (Sa Ri Ga Ma) and Western (C D E F) notation

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 4 + custom glassmorphism |
| Audio Synthesis | Tone.js 15 |
| Pitch Detection | Web Audio API (autocorrelation) |
| Icons | Lucide React |
| Storage | Browser LocalStorage |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A modern browser with Web Audio API support (Chrome recommended for best microphone performance)
- A microphone for pitch detection features

### Installation

```bash
git clone https://github.com/your-username/sangeetham.git
cd sangeetham
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## How to Use

### 1. Set Your Shruti
On the home screen, select the tonic (shruti) that matches your vocal range. The app supports 12 pitches from C (130 Hz) to B (247 Hz).

### 2. Enable the Tanpura
Toggle the drone on to hear the continuous tanpura accompaniment. The Sa–Pa–Ṡa–Sa pattern provides a pitch reference while you practice.

### 3. Browse the Lesson Library
Navigate through the lesson categories — from Basic Practices up to Krithis and Thillanas. Each lesson links to a guided exercise session.

### 4. Practice with Real-Time Feedback
In exercise mode, the pitch visualizer shows your sung pitch as a green trail against the reference curve. The note queue at the bottom shows your current and upcoming swaras. After the session, review your accuracy in the feedback summary.

### 5. Free Sandbox
Use the "Free Sandbox" mode to sing freely against the drone without any guided exercise — useful for warm-up, raga exploration, or improvisation.

---

## App Architecture

```
src/
├── components/
│   ├── ShrutiSelector.jsx      # Tonic frequency picker
│   ├── DronePlayer.jsx         # Tanpura toggle & controls
│   ├── LivePitchMonitor.jsx    # Real-time Hz/swara display
│   ├── LessonsPanel.jsx        # Home screen lesson browser
│   ├── SongBrowser.jsx         # Filterable song library
│   ├── ExerciseRunner.jsx      # Guided practice orchestrator
│   ├── NoteQueue.jsx           # Upcoming swara display
│   ├── PitchVisualizer.jsx     # Canvas pitch curve renderer
│   └── FeedbackSummary.jsx     # Post-session results
├── utils/
│   ├── pitchDetection.js       # Autocorrelation pitch algorithm
│   ├── swaraUtils.js           # Swara system & just intonation
│   ├── droneEngine.js          # Tone.js tanpura synthesis
│   ├── audioEngine.js          # Microphone & FFT pipeline
│   ├── storage.js              # LocalStorage practice history
│   └── songs.js                # Full song library metadata
└── App.jsx                     # View router (home/browser/practice/feedback)
```

---

## Pitch Detection Algorithm

Pitch detection uses a **time-domain autocorrelation** approach with:
- **Parabolic interpolation** for sub-sample accuracy at the fundamental frequency peak
- **RMS-based silence detection** to suppress noise when not singing
- **Confidence filtering** (threshold 0.4) to reject ambiguous detections
- **Median + exponential smoothing** for a stable, responsive display
- Detection range: 60–1200 Hz (B1 to B5), covering all vocal ranges

---

## Carnatic Music Context

Carnatic music is one of the two main subgenres of Indian classical music, with roots in South India. It is highly melodic, based on ragas (melodic frameworks) and talas (rhythmic cycles). Practitioners traditionally learn through the guru-shishya (teacher-student) oral tradition.

Sangeetham is designed as a supplement to traditional learning — it does not replace a guru, but it gives students a tool to practice on their own with precise pitch feedback that previously required real-time teacher correction.

---

## Roadmap

- [ ] Full swara + sahitya display synchronized with audio playback for all songs
- [ ] Raga recognition — identify which raga the user is singing
- [ ] Gamakas (ornament) detection and visualization
- [ ] Tala cycle tracker with visual metronome
- [ ] Multi-octave pitch display (Mandra / Madhya / Tara sthayis)
- [ ] Mobile-optimized portrait layout for tablet practice
- [ ] Offline PWA support

---

## Contributing

Contributions are welcome — especially notation data for additional compositions, raga definitions, or audio samples. Please open an issue to discuss before submitting a pull request.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

*Sangeetham is a personal project born out of a love for Carnatic music and a desire to make high-quality practice tools more accessible.*
