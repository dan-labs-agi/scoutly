import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Command } from 'lucide-react';
import { gsap } from 'gsap';
import { ChatInterface } from './ChatInterface';

interface LandingPageProps {
  onSearch: (domain: string) => void;
  onOpenChat?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSearch, onOpenChat }) => {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 }); // Initialize off-screen

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(input.trim());
    }
  };

  const hasText = input.length > 0;
  const isExpanded = hasText; 
  const isActive = isFocused || hasText;

  // --- GSAP Starfield Animation ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // Resize handler
    const setSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    setSize();
    window.addEventListener('resize', setSize);

    // Mouse Handler
    const handleMouseMove = (e: MouseEvent) => {
        mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Star Interface
    interface Star {
      x: number;
      y: number;
      radius: number;
      alpha: number;
      baseAlpha: number; // Keep track of base alpha for tweening
    }

    const stars: Star[] = [];
    const numStars = 60; // Reduced from 150 for minimalism

    // Initialize Stars (Concentrated at the top)
    for (let i = 0; i < numStars; i++) {
        const yBias = Math.random(); // 0 to 1
        // Squaring yBias makes it more likely to be small (top of screen)
        const y = (yBias * yBias) * (height * 0.6); 
        const alpha = Math.random() * 0.5 + 0.1;

        stars.push({
            x: Math.random() * width,
            y: y,
            radius: Math.random() * 1.5,
            alpha: alpha,
            baseAlpha: alpha
        });
    }

    // Animation Loop
    const render = () => {
        ctx.clearRect(0, 0, width, height);
        
        stars.forEach(star => {
            // --- Interaction Physics ---
            let renderX = star.x;
            let renderY = star.y;
            let renderAlpha = star.alpha;
            
            const dx = mouseRef.current.x - star.x;
            const dy = mouseRef.current.y - star.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const interactionRadius = 150; // Distance to trigger effect

            if (distance < interactionRadius) {
                const force = (interactionRadius - distance) / interactionRadius; // 0 (far) to 1 (close)
                
                // Repulsion: Move star away from cursor
                const angle = Math.atan2(dy, dx);
                const moveDistance = force * 20; // Max displacement pixels
                
                renderX -= Math.cos(angle) * moveDistance;
                renderY -= Math.sin(angle) * moveDistance;

                // Glow: Increase alpha based on proximity
                renderAlpha = Math.min(1, renderAlpha + force * 0.6);
            }
            // ---------------------------

            // Draw
            ctx.beginPath();
            ctx.arc(renderX, renderY, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${renderAlpha})`;
            ctx.fill();
        });
        
        requestAnimationFrame(render);
    };

    render();

    // GSAP Twinkle Effect
    stars.forEach(star => {
        // Twinkle Alpha
        gsap.to(star, {
            alpha: 'random(0.1, 0.6)',
            duration: 'random(0.5, 3)',
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
        
        // Slight Floating Movement
        gsap.to(star, {
            y: `+=${Math.random() * 30 - 15}`, 
            x: `+=${Math.random() * 30 - 15}`,
            duration: 'random(5, 15)',
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    });

    // Shooting Star Effect
    const shootingStarTimeline = gsap.timeline({ repeat: -1, repeatDelay: 6 }); // Increased delay
    const shootingStar = { x: 0, y: 0, len: 0, alpha: 0 };
    
    const animateShootingStar = () => {
        const startX = Math.random() * width;
        const startY = Math.random() * (height * 0.3);
        shootingStar.x = startX;
        shootingStar.y = startY;
        shootingStar.len = 0;
        shootingStar.alpha = 1;

        gsap.to(shootingStar, {
            x: startX + 250, // Move right
            y: startY + 120, // Move down
            len: 120, 
            alpha: 0,
            duration: 1.2,
            ease: "power2.in",
            onUpdate: () => {
                ctx.beginPath();
                const grad = ctx.createLinearGradient(shootingStar.x, shootingStar.y, shootingStar.x - shootingStar.len, shootingStar.y - (shootingStar.len * 0.5));
                grad.addColorStop(0, `rgba(255,255,255,${shootingStar.alpha})`);
                grad.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1;
                ctx.moveTo(shootingStar.x, shootingStar.y);
                ctx.lineTo(shootingStar.x - shootingStar.len, shootingStar.y - (shootingStar.len * 0.5));
                ctx.stroke();
            }
        });
    };
    
    // Trigger shooting star randomly
    const interval = setInterval(() => {
        if(Math.random() > 0.6) animateShootingStar();
    }, 5000);

    return () => {
      window.removeEventListener('resize', setSize);
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
      gsap.killTweensOf(stars);
    };
  }, []);

  // GSAP Entrance for Main Content
  useEffect(() => {
    if (containerRef.current) {
        gsap.fromTo(containerRef.current, 
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.2, ease: "power3.out", delay: 0.2 }
        );
    }
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* GSAP Canvas Starfield */}
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
      />

      {/* --- Bottom Semi-Circle Glow Effect --- */}
      <div className="absolute bottom-[-35vh] left-1/2 -translate-x-1/2 w-[140vw] h-[70vh] bg-emerald-600/20 blur-[120px] rounded-[100%] pointer-events-none z-0 mix-blend-screen" />
      <div className="absolute bottom-[-40vh] left-1/2 -translate-x-1/2 w-[100vw] h-[60vh] bg-lime-500/30 blur-[100px] rounded-[100%] pointer-events-none z-0 mix-blend-screen" />
      
      {/* Main Layout Container */}
      <div 
        ref={containerRef}
        className={`z-10 w-full relative flex flex-col items-center transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] ${
            isExpanded ? 'max-w-3xl' : 'max-w-lg'
        }`}
      >
        
        {/* Branding - Subtle retraction when active */}
        <div className={`flex flex-col items-center space-y-3 transition-all duration-700 ${isExpanded ? 'mb-8 scale-95 origin-bottom' : 'mb-12 scale-100 origin-bottom'}`}>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/5 backdrop-blur-md">
                <div className="w-1.5 h-1.5 rounded-full bg-lime-500 shadow-[0_0_10px_rgba(132,204,22,0.5)]"></div>
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                    Outreach Intelligence v3.1
                </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-center text-white drop-shadow-2xl font-sans">
               scoutly
            </h1>
        </div>

        {/* Chat Interface - Width expands via parent */}
        <div className="w-full relative group">
          {/* Active Glow Gradient */}
          <div className={`absolute -inset-[1px] bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-2xl blur-[1px] transition-all duration-700 ${
              isActive ? 'opacity-100 from-lime-500/20 to-emerald-500/20' : 'opacity-70'
          }`}></div>
          
          <div className={`relative bg-[#050505] rounded-2xl flex items-center shadow-2xl shadow-black/90 p-1.5 ring-1 transition-all duration-500 ${
              isActive ? 'ring-lime-500/20 bg-black' : 'ring-white/5'
          }`}>
            <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2 pl-5 pr-1.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="What domain are you scouting? (e.g. AI Agents...)"
                className="flex-1 bg-transparent border-none text-[15px] py-3 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-0 font-light tracking-wide h-10"
                autoFocus
              />
              
              <button
                type="submit"
                disabled={!input.trim()}
                className={`h-9 w-9 flex items-center justify-center rounded-xl border transition-all duration-300 ${
                    input.trim() 
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700' 
                    : 'bg-zinc-900/50 text-zinc-600 border-zinc-800/50 cursor-not-allowed opacity-50'
                }`}
              >
                <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Hints - Fade/Slide adjustment */}
        <div className={`flex flex-col items-center gap-5 text-center w-full transition-all duration-700 delay-75 ${
            isExpanded ? 'mt-8 opacity-100' : 'mt-12 opacity-80'
        }`}>
             <p className="text-sm text-zinc-600 font-light max-w-md mx-auto">
                AI-driven OSINT agent for finding pre-seed & seed stage founders.
             </p>
              <div className="flex flex-wrap justify-center gap-2 items-center">
              <button
                   onClick={() => {
                     onSearch('AI Startups');
                     onOpenChat?.();
                   }}
                   className="px-3 py-1.5 text-[11px] font-medium border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-lg text-zinc-500 hover:text-zinc-300 transition-all duration-300 flex items-center gap-1.5"
                 >
                   AI Chat
                 </button>
                 {['Crypto', 'GenAI', 'SaaS', 'Biotech', 'Marketplaces'].map((tag) => (
                     <button 
                       key={tag}
                       onClick={() => onSearch(tag)}
                       className="px-3 py-1.5 text-[11px] font-medium border border-white/5 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-lg text-zinc-500 hover:text-zinc-300 hover:border-white/10 transition-all duration-300"
                       >
                       {tag}
                     </button>
                 ))}
              </div>
        </div>
      </div>
      
      {/* Updated Footer - More Visible */}
      <div className="absolute bottom-8 text-[10px] text-emerald-200 font-mono flex items-center gap-2 tracking-widest uppercase opacity-90 drop-shadow-md">
         <Command size={10} />
         <span>product by dan</span>
      </div>
    </div>
  );
};