import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState, MirrorEntity, TowerEntity, Vector2 } from './types';
import { 
  Play, RotateCcw, Zap, Clock, Info, Sun, MousePointer2, BatteryCharging, 
  ChevronDown, ArrowRight, Menu, X, ArrowUp, Github, Linkedin, Youtube, 
  Instagram, Twitter, Mail, Globe, Shield, FileText 
} from 'lucide-react';

// Constants
const DAY_DURATION_SECONDS = 30;
const LEVEL_CONFIGS = [
  { mirrors: 1, target: 500, timeScale: 0.5 },
  { mirrors: 2, target: 1200, timeScale: 0.8 },
  { mirrors: 3, target: 2000, timeScale: 1.0 },
  { mirrors: 4, target: 3500, timeScale: 1.2 },
  { mirrors: 5, target: 5000, timeScale: 1.5 },
];

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0">
        <h2 className="text-2xl font-display font-bold text-white">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Close modal">
          <X size={24} />
        </button>
      </div>
      <div className="p-6 overflow-y-auto text-slate-300 leading-relaxed text-sm md:text-base">
        {children}
      </div>
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 text-right">
        <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-semibold">
          Close
        </button>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  // --- Game State ---
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    energy: 0,
    maxEnergy: 500,
    level: 1,
    timeOfDay: 0.8, // Start at sunset for the landing page vibe
    isPlaying: false,
    gameOver: false,
    victory: false,
  });

  const [inGameMode, setInGameMode] = useState(false);
  const [mirrors, setMirrors] = useState<MirrorEntity[]>([]);
  const [sunPosition, setSunPosition] = useState<Vector2>({ x: 0, y: 0 });
  const [tower, setTower] = useState<TowerEntity>({
    position: { x: 0, y: 0 },
    height: 200,
    receiverRadius: 15,
    receiverOffset: 180,
  });

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // UI States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  const initLevel = useCallback((level: number) => {
    const config = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)];
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Place Tower
    const towerX = w * 0.8;
    const towerY = h;
    setTower({
      position: { x: towerX, y: towerY },
      height: h * 0.35,
      receiverRadius: 15,
      receiverOffset: h * 0.35 - 20,
    });

    // Place Mirrors
    const newMirrors: MirrorEntity[] = [];
    const startX = w * 0.1;
    const endX = w * 0.6;
    const step = (endX - startX) / (config.mirrors + 1);

    for (let i = 0; i < config.mirrors; i++) {
      newMirrors.push({
        id: i,
        position: { x: startX + step * (i + 1), y: h - 50 }, // On ground
        angle: 0, // Flat
        width: 60,
        isSelected: false,
        efficiency: 0,
      });
    }
    setMirrors(newMirrors);

    setGameState(prev => ({
      ...prev,
      level,
      energy: 0,
      maxEnergy: config.target,
      timeOfDay: 0,
      isPlaying: false,
      gameOver: false,
      victory: false,
    }));
  }, []);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initial load
  useEffect(() => {
    initLevel(1);
    if (!inGameMode) {
        setGameState(prev => ({ ...prev, timeOfDay: 0.85 })); // Golden hour
    }
  }, [initLevel, inGameMode]);

  // Scroll Listener for Back to Top
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [inGameMode]);

  // --- Game Loop ---
  useEffect(() => {
    if (!inGameMode) {
         const w = windowSize.width;
         const h = windowSize.height;
         const demoTime = 0.85; 
         const sunX = w * 0.1 + (w * 0.8) * demoTime;
         const normalizedTime = (demoTime - 0.5) * 2;
         const sunY = h * 0.1 + (h * 0.4) * (normalizedTime * normalizedTime);
         setSunPosition({ x: w * 0.85, y: h * 0.2 }); 
         return;
    }

    if (!gameState.isPlaying || gameState.gameOver || gameState.victory) return;

    let lastTime = performance.now();
    const loopId = requestAnimationFrame(function loop(time) {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      setGameState(prev => {
        const levelConfig = LEVEL_CONFIGS[Math.min(prev.level - 1, LEVEL_CONFIGS.length - 1)];
        const timeRate = (1 / DAY_DURATION_SECONDS) * levelConfig.timeScale * dt;
        const newTime = prev.timeOfDay + timeRate;

        if (newTime >= 1.0) {
          return { ...prev, timeOfDay: 1.0, gameOver: true, isPlaying: false };
        }

        const w = windowSize.width;
        const h = windowSize.height;
        const sunX = w * 0.1 + (w * 0.8) * newTime;
        const sunHeight = Math.sin(newTime * Math.PI); 
        const actualSunY = h * 0.8 - (h * 0.7) * sunHeight; 

        setSunPosition({ x: sunX, y: actualSunY });

        if (prev.energy >= prev.maxEnergy) {
          return { ...prev, timeOfDay: newTime, victory: true, isPlaying: false };
        }

        return { ...prev, timeOfDay: newTime };
      });

      requestAnimationFrame(loop);
    });

    return () => cancelAnimationFrame(loopId);
  }, [gameState.isPlaying, gameState.gameOver, gameState.victory, gameState.level, windowSize, inGameMode]);

  const handleEnergyGenerated = (amount: number) => {
    setGameState(prev => ({
        ...prev,
        energy: Math.min(prev.energy + amount, prev.maxEnergy * 1.1)
    }));
  };

  const startGame = () => {
      setInGameMode(true);
      initLevel(1);
      setTimeout(() => {
          setGameState(prev => ({ ...prev, isPlaying: true }));
      }, 100);
  };

  const nextLevel = () => {
      initLevel(gameState.level + 1);
      setTimeout(() => {
          setGameState(prev => ({ ...prev, isPlaying: true }));
      }, 100);
  };
  
  const restartLevel = () => {
      initLevel(gameState.level);
      setTimeout(() => {
          setGameState(prev => ({ ...prev, isPlaying: true }));
      }, 100);
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- Render ---
  return (
    <div className="relative w-full h-screen bg-slate-900 text-white overflow-hidden select-none font-sans">
      
      {/* Background Canvas Layer */}
      <div className="fixed inset-0 z-0">
        <GameCanvas 
          mirrors={mirrors}
          setMirrors={setMirrors}
          tower={tower}
          sunPosition={sunPosition}
          timeOfDay={gameState.timeOfDay}
          onEnergyGenerated={handleEnergyGenerated}
          isPlaying={gameState.isPlaying || (!inGameMode)}
        />
        
        {/* Cinematic Vignette Overlay */}
        {!inGameMode && (
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-slate-900/10 pointer-events-none" />
        )}
      </div>

      {/* --- MODALS --- */}
      {activeModal === 'privacy' && (
        <Modal title="Privacy Policy" onClose={() => setActiveModal(null)}>
          <p className="mb-4"><strong>Effective Date: 2025-01-01</strong></p>
          <p className="mb-4">At Helios Mirror, we prioritize your privacy. This Privacy Policy outlines the types of information we do not collect and how we ensure your data security.</p>
          <h3 className="text-white font-bold text-lg mt-4 mb-2">1. Data Collection</h3>
          <p className="mb-4">We do not collect, store, or process any personal data. This game runs entirely in your browser. No cookies are used for tracking purposes.</p>
          <h3 className="text-white font-bold text-lg mt-4 mb-2">2. Local Storage</h3>
          <p className="mb-4">We may use local storage solely to save your game progress (e.g., unlocked levels). This data stays on your device and is never transmitted to our servers.</p>
          <h3 className="text-white font-bold text-lg mt-4 mb-2">3. Third-Party Services</h3>
          <p className="mb-4">This site may use standard CDNs for fonts and libraries (e.g., Google Fonts, Tailwind). These providers may collect standard access logs (IP address) for security and performance.</p>
        </Modal>
      )}

      {activeModal === 'terms' && (
        <Modal title="Terms of Service" onClose={() => setActiveModal(null)}>
          <p className="mb-4"><strong>Last Updated: 2025-01-01</strong></p>
          <h3 className="text-white font-bold text-lg mt-4 mb-2">1. Acceptance of Terms</h3>
          <p className="mb-4">By accessing Helios Mirror, you agree to these Terms of Service. If you do not agree, please discontinue use immediately.</p>
          <h3 className="text-white font-bold text-lg mt-4 mb-2">2. Usage License</h3>
          <p className="mb-4">Permission is granted to temporarily play the materials (information or software) on Helios Mirror's website for personal, non-commercial transitory viewing only.</p>
          <h3 className="text-white font-bold text-lg mt-4 mb-2">3. Disclaimer</h3>
          <p className="mb-4">The materials on Helios Mirror are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim all other warranties including, without limitation, implied warranties of merchantability.</p>
        </Modal>
      )}

      {/* --- LANDING PAGE VIEW --- */}
      {!inGameMode && (
        <div ref={scrollRef} className="absolute inset-0 z-10 overflow-y-auto scroll-smooth no-scrollbar">
            
            {/* Navigation */}
            <nav className="fixed top-0 w-full p-4 md:p-6 flex justify-between items-center z-50 backdrop-blur-md bg-slate-900/60 border-b border-white/5 shadow-lg">
                <div className="text-xl md:text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400 cursor-default">
                    HELIOS<span className="text-white">MIRROR</span>
                </div>

                {/* Desktop Menu */}
                <div className="hidden md:flex gap-8 text-sm font-semibold tracking-wide text-slate-300">
                    <a href="#how-it-works" className="hover:text-cyan-400 transition-colors py-2">SYSTEM</a>
                    <a href="#story" className="hover:text-cyan-400 transition-colors py-2">LORE</a>
                    <a href="#about" className="hover:text-cyan-400 transition-colors py-2">CREATOR</a>
                </div>

                {/* Mobile Hamburger */}
                <button 
                  className="md:hidden text-white hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-white/5"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Desktop Button */}
                <div className="hidden md:block">
                  <button 
                      onClick={startGame}
                      className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-full transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] hover:scale-105 active:scale-95"
                      aria-label="Start Game"
                  >
                      LAUNCH SYSTEM
                  </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
              <div className="fixed inset-0 top-[70px] z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 p-6 flex flex-col items-center gap-8 md:hidden animate-in slide-in-from-top-5 duration-200">
                  <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-display font-bold text-slate-300 hover:text-white transition-colors">SYSTEM</a>
                  <a href="#story" onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-display font-bold text-slate-300 hover:text-white transition-colors">LORE</a>
                  <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-display font-bold text-slate-300 hover:text-white transition-colors">CREATOR</a>
                  <button 
                      onClick={() => { setIsMobileMenuOpen(false); startGame(); }}
                      className="w-full max-w-xs px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all shadow-lg mt-4 active:scale-95"
                  >
                      LAUNCH SYSTEM
                  </button>
              </div>
            )}

            {/* Hero Section */}
            <section className="min-h-screen flex flex-col items-center justify-center text-center px-4 pt-24 pb-12">
                <div className="max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-display tracking-tighter leading-[1.1] md:leading-none">
                        <span className="block text-slate-100 drop-shadow-2xl">HARVEST THE</span>
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 drop-shadow-lg py-2">UNLIMITED</span>
                    </h1>
                    <p className="text-lg md:text-2xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed px-4">
                        Master the physics of light in this high-tech solar energy simulation. 
                        Align the array. Power the future.
                    </p>
                    <div className="pt-8 flex flex-col items-center">
                        <a 
                            href="game.html" 
                            onClick={(e) => { e.preventDefault(); startGame(); }}
                            className="group relative inline-flex items-center justify-center px-8 md:px-12 py-4 md:py-5 text-lg font-bold text-white transition-all duration-200 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg hover:from-cyan-500 hover:to-blue-500 hover:scale-105 shadow-xl hover:shadow-cyan-500/25 ring-1 ring-white/20 overflow-hidden"
                            aria-label="Start Game"
                        >
                            <span className="relative z-10 flex items-center">
                                INITIALIZE SEQUENCE <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 rounded-lg ring-2 ring-white/20 group-hover:ring-cyan-300/50 animate-pulse"></div>
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </a>
                        <p className="mt-4 text-xs text-slate-500 uppercase tracking-widest font-semibold">Optimized for Desktop & Mobile</p>
                    </div>
                </div>
                
                <div className="absolute bottom-10 animate-bounce text-slate-500 hidden md:block">
                    <ChevronDown size={32} />
                </div>
            </section>

            {/* 'How It Works' Section */}
            <section id="how-it-works" className="min-h-screen bg-slate-950/80 backdrop-blur-xl py-24 px-4 border-t border-slate-800">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16 md:mb-20">
                        <h2 className="text-3xl md:text-5xl font-display font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">OPERATIONAL MANUAL</h2>
                        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
                          Our proprietary heliostat technology requires precise calibration. Follow these three steps to achieve maximum efficiency.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        {/* Card 1 */}
                        <div className="group bg-slate-900/50 border border-slate-700/50 p-6 md:p-8 rounded-2xl hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all duration-300 hover:-translate-y-2">
                            <div className="w-16 h-16 bg-cyan-900/30 rounded-xl flex items-center justify-center mb-6 text-cyan-400 group-hover:scale-110 transition-transform group-hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                                <MousePointer2 size={32} />
                            </div>
                            <h3 className="text-xl md:text-2xl font-display font-bold mb-3 text-slate-100">1. ALIGN ARRAY</h3>
                            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                                Touch and drag anywhere to rotate the heliostat mirrors. Precision is key. 
                                Calculate the angle of incidence in real-time.
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="group bg-slate-900/50 border border-slate-700/50 p-6 md:p-8 rounded-2xl hover:border-amber-500/50 hover:bg-slate-800/50 transition-all duration-300 hover:-translate-y-2">
                            <div className="w-16 h-16 bg-amber-900/30 rounded-xl flex items-center justify-center mb-6 text-amber-400 group-hover:scale-110 transition-transform group-hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                                <Sun size={32} />
                            </div>
                            <h3 className="text-xl md:text-2xl font-display font-bold mb-3 text-slate-100">2. REFLECT LIGHT</h3>
                            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                                Direct the solar beam onto the central tower's receiver. 
                                Physics dictates the path—miss the target, and energy is lost.
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="group bg-slate-900/50 border border-slate-700/50 p-6 md:p-8 rounded-2xl hover:border-green-500/50 hover:bg-slate-800/50 transition-all duration-300 hover:-translate-y-2">
                            <div className="w-16 h-16 bg-green-900/30 rounded-xl flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition-transform group-hover:shadow-[0_0_20px_rgba(74,222,128,0.2)]">
                                <BatteryCharging size={32} />
                            </div>
                            <h3 className="text-xl md:text-2xl font-display font-bold mb-3 text-slate-100">3. HARVEST ENERGY</h3>
                            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                                Fill the grid capacity before the sun sets below the horizon. 
                                Advance technology levels by meeting production quotas.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Story Section */}
            <section id="story" className="py-24 md:py-32 px-4 relative overflow-hidden bg-slate-900 border-t border-slate-800">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-indigo-950/20 to-slate-900 z-0"></div>
                <div className="max-w-4xl mx-auto relative z-10 text-center">
                     <span className="inline-block px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-bold tracking-widest rounded-full mb-6 border border-cyan-500/20">
                        ESTABLISHED 2142
                     </span>
                     <h2 className="text-3xl md:text-5xl font-display font-bold mb-8 leading-tight">
                        THE WORLD HAS GONE DARK. <br/>
                        <span className="text-cyan-400">YOU ARE THE LIGHT.</span>
                     </h2>
                     <p className="text-base md:text-lg text-slate-300 mb-8 leading-relaxed max-w-2xl mx-auto px-4">
                        Following the Great Dust Clouds of the 22nd century, direct sunlight became the planet's most valuable resource. 
                        As the Chief Engineer of the Helios Project, you control the last remaining high-efficiency thermal arrays.
                        <br/><br/>
                        The city relies on your calculations. Every photon counts.
                     </p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-center mt-12 px-8">
                         <div className="text-center p-4 bg-slate-800/30 rounded-lg md:bg-transparent">
                             <div className="text-3xl md:text-4xl font-display font-bold text-white mb-1">100%</div>
                             <div className="text-xs text-slate-500 uppercase tracking-widest">Physics Accuracy</div>
                         </div>
                         <div className="w-px h-12 bg-slate-700 hidden md:block mx-auto"></div>
                         <div className="text-center p-4 bg-slate-800/30 rounded-lg md:bg-transparent">
                             <div className="text-3xl md:text-4xl font-display font-bold text-white mb-1">5</div>
                             <div className="text-xs text-slate-500 uppercase tracking-widest">Sectors to Clear</div>
                         </div>
                         <div className="w-px h-12 bg-slate-700 hidden md:block mx-auto"></div>
                         <div className="text-center p-4 bg-slate-800/30 rounded-lg md:bg-transparent">
                             <div className="text-3xl md:text-4xl font-display font-bold text-white mb-1">∞</div>
                             <div className="text-xs text-slate-500 uppercase tracking-widest">Replay Value</div>
                         </div>
                     </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="about" className="bg-slate-950 border-t border-slate-800 pt-16 pb-8 px-4 text-center z-20 relative">
                <div className="max-w-4xl mx-auto">
                  <div className="flex flex-col items-center gap-2 mb-8">
                      <div className="font-display font-bold text-2xl tracking-tighter text-slate-200">
                        HELIOS<span className="text-cyan-500">MIRROR</span>
                      </div>
                      <p className="text-slate-500 text-sm max-w-md">
                        A next-gen browser game optimizing solar energy through code.
                      </p>
                  </div>

                  {/* Social Links Grid */}
                  <div className="flex flex-wrap justify-center gap-4 mb-10">
                      <a href="https://youtube.com/@vickyiitp" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-900 rounded-full hover:bg-red-600 hover:text-white text-slate-400 transition-all shadow-md hover:shadow-red-500/20" aria-label="YouTube">
                        <Youtube size={20} />
                      </a>
                      <a href="https://linkedin.com/in/vickyiitp" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-900 rounded-full hover:bg-blue-600 hover:text-white text-slate-400 transition-all shadow-md hover:shadow-blue-500/20" aria-label="LinkedIn">
                        <Linkedin size={20} />
                      </a>
                      <a href="https://x.com/vickyiitp" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-900 rounded-full hover:bg-black hover:text-white hover:border-slate-700 border border-transparent text-slate-400 transition-all shadow-md hover:shadow-slate-500/20" aria-label="X (Twitter)">
                        <Twitter size={20} />
                      </a>
                      <a href="https://github.com/vickyiitp" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-900 rounded-full hover:bg-slate-700 hover:text-white text-slate-400 transition-all shadow-md hover:shadow-slate-500/20" aria-label="GitHub">
                        <Github size={20} />
                      </a>
                      <a href="https://instagram.com/vickyiitp" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-900 rounded-full hover:bg-pink-600 hover:text-white text-slate-400 transition-all shadow-md hover:shadow-pink-500/20" aria-label="Instagram">
                        <Instagram size={20} />
                      </a>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 mb-12 border-t border-slate-900 pt-8 text-sm">
                      <div className="flex flex-col items-center md:items-end gap-2 text-slate-400">
                          <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs">CONTACT</h4>
                          <a href="mailto:themvaplatform@gmail.com" className="hover:text-cyan-400 flex items-center gap-2 transition-colors">
                             <Mail size={14} /> themvaplatform@gmail.com
                          </a>
                      </div>
                      <div className="flex flex-col items-center md:items-start gap-2 text-slate-400">
                          <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs">PORTFOLIO</h4>
                          <a href="https://vickyiitp.tech" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 flex items-center gap-2 transition-colors">
                             <Globe size={14} /> vickyiitp.tech
                          </a>
                      </div>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600 border-t border-slate-900 pt-8">
                      <p>© 2025 Vickyiitp. All rights reserved.</p>
                      <div className="flex gap-4">
                        <button onClick={() => setActiveModal('privacy')} className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                          <Shield size={10} /> Privacy Policy
                        </button>
                        <button onClick={() => setActiveModal('terms')} className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                          <FileText size={10} /> Terms of Service
                        </button>
                      </div>
                  </div>
                </div>
            </footer>

            {/* Back To Top Button */}
            {showBackToTop && (
              <button 
                onClick={scrollToTop}
                className="fixed bottom-6 right-6 p-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-full shadow-lg z-50 transition-all hover:scale-110 animate-in fade-in slide-in-from-bottom-5"
                aria-label="Back to top"
              >
                <ArrowUp size={24} />
              </button>
            )}

        </div>
      )}

      {/* --- HUD Layer (Only visible when InGameMode) --- */}
      {inGameMode && (
        <div className="absolute inset-0 z-10 pointer-events-none p-4 md:p-6 flex flex-col justify-between animate-in fade-in duration-500">
          
          {/* Top Bar */}
          <div className="flex justify-between items-start pointer-events-auto">
              
              {/* Energy Meter */}
              <div className="flex flex-col gap-1 w-48 md:w-64 bg-slate-900/80 backdrop-blur-md p-3 md:p-4 rounded-lg border border-slate-700 shadow-xl">
                  <div className="flex justify-between items-center text-xs text-cyan-400 font-bold uppercase tracking-wider font-display">
                      <span className="flex items-center gap-2"><Zap size={14} /> Grid Output</span>
                      <span>{Math.floor(gameState.energy)} / {gameState.maxEnergy}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                      <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-75 ease-linear relative"
                          style={{ width: `${Math.min((gameState.energy / gameState.maxEnergy) * 100, 100)}%` }}
                      >
                         <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                  </div>
              </div>

              {/* Level & Time */}
              <div className="flex flex-col items-end gap-2">
                  <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1 md:px-4 md:py-2 rounded-lg border border-slate-700 text-amber-400 font-bold font-display shadow-lg text-sm md:text-base">
                      LEVEL {gameState.level}
                  </div>
                  <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1 md:px-4 md:py-2 rounded-lg border border-slate-700 flex items-center gap-2 text-slate-300 text-xs md:text-sm shadow-lg">
                      <Clock size={14} />
                      <span className="hidden md:inline">
                        {gameState.timeOfDay < 0.2 ? 'Morning' : 
                         gameState.timeOfDay < 0.7 ? 'Midday' : 'Evening'}
                      </span>
                       <span className="text-slate-500 font-mono">{(gameState.timeOfDay * 100).toFixed(0)}%</span>
                  </div>
              </div>
          </div>

          {/* Center Notifications */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto w-full px-4 flex justify-center z-50">
              {gameState.victory && (
                   <div className="bg-slate-900/95 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-green-500/30 text-center shadow-2xl animate-in fade-in zoom-in duration-300 w-full max-w-sm">
                      <h2 className="text-2xl md:text-3xl font-bold font-display text-green-400 mb-2">QUOTA MET</h2>
                      <p className="text-slate-300 mb-6">Energy production sufficient.</p>
                      <button 
                          onClick={nextLevel}
                          className="w-full px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 mx-auto shadow-lg"
                      >
                          NEXT SECTOR <Play size={18} />
                      </button>
                   </div>
              )}

              {gameState.gameOver && (
                   <div className="bg-slate-900/95 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-red-500/30 text-center shadow-2xl animate-in fade-in zoom-in duration-300 w-full max-w-sm">
                      <h2 className="text-2xl md:text-3xl font-bold font-display text-red-400 mb-2">SYSTEM FAILURE</h2>
                      <p className="text-slate-300 mb-6">Insufficient energy generated.</p>
                      <button 
                          onClick={restartLevel}
                          className="w-full px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 mx-auto shadow-lg"
                      >
                          <RotateCcw size={18} /> REBOOT SYSTEM
                      </button>
                   </div>
              )}
          </div>

          {/* Bottom Bar Hints */}
          <div className="w-full flex justify-center pb-4 opacity-70 text-xs text-slate-400 pointer-events-none">
              {gameState.isPlaying && (
                  <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full backdrop-blur-sm border border-slate-700/50">
                     <Info size={14} className="text-cyan-400" /> 
                     <span>Drag anywhere to rotate mirrors.</span>
                  </div>
              )}
          </div>

        </div>
      )}
    </div>
  );
};

export default App;