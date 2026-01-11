import React, { useRef, useEffect, useState } from 'react';
import { MirrorEntity, TowerEntity, Vector2 } from '../types';
import { Vec, reflect, lineIntersectsCircle, getSkyColor } from '../utils';

interface GameCanvasProps {
  mirrors: MirrorEntity[];
  setMirrors: React.Dispatch<React.SetStateAction<MirrorEntity[]>>;
  tower: TowerEntity;
  sunPosition: Vector2;
  timeOfDay: number; // 0 to 1
  onEnergyGenerated: (amount: number) => void;
  isPlaying: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  mirrors,
  setMirrors,
  tower,
  sunPosition,
  timeOfDay,
  onEnergyGenerated,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedMirrorId, setSelectedMirrorId] = useState<number | null>(null);
  const requestRef = useRef<number>();
  const draggingRef = useRef<boolean>(false);

  // Helper to get mouse/touch position
  const getPointerPos = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement): Vector2 => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      // Use the first touch
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const updateMirrors = (targetPos: Vector2) => {
    if (selectedMirrorId === null) return;

    setMirrors((prev) =>
      prev.map((m) => {
        if (m.id !== selectedMirrorId) return m;

        // Calculate angle from mirror center to mouse cursor
        const delta = Vec.sub(targetPos, m.position);
        let angle = Vec.angle(delta); 
        
        return { ...m, angle };
      })
    );
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const pos = getPointerPos(e, canvas);
    
    // Check if clicked near a mirror
    let clickedMirrorId: number | null = null;
    let minDist = 40; // Increased Interaction radius for better mobile touch

    mirrors.forEach(m => {
      const dist = Vec.dist(pos, m.position);
      if (dist < minDist) {
        clickedMirrorId = m.id;
      }
    });

    if (clickedMirrorId !== null) {
      setSelectedMirrorId(clickedMirrorId);
      draggingRef.current = true;
    } else {
      setSelectedMirrorId(null);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingRef.current || !isPlaying || selectedMirrorId === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Prevent scrolling on mobile while dragging
    if ('touches' in e) {
        // e.preventDefault(); // React synthetic events might need passive: false elsewhere, handled via CSS touch-action
    }

    const pos = getPointerPos(e, canvas);
    updateMirrors(pos);
  };

  const handleEnd = () => {
    draggingRef.current = false;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize by disabling alpha channel on backbuffer if possible
    if (!ctx) return;

    const render = () => {
      // 1. Clear Canvas
      const width = canvas.width;
      const height = canvas.height;
      
      // 2. Draw Sky Background
      const skyColors = getSkyColor(timeOfDay);
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, skyColors[0]);
      gradient.addColorStop(0.5, skyColors[1]);
      gradient.addColorStop(1, skyColors[2]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 3. Draw Stars (fade out during day)
      if (timeOfDay < 0.2 || timeOfDay > 0.8) {
        ctx.globalAlpha = timeOfDay < 0.2 ? 1 - timeOfDay * 5 : (timeOfDay - 0.8) * 5;
        ctx.fillStyle = '#FFF';
        for(let i=0; i<50; i++) {
             const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * width;
             const y = (Math.cos(i * 678.90) * 0.5 + 0.5) * height * 0.6;
             ctx.beginPath();
             ctx.arc(x, y, Math.random() > 0.5 ? 1 : 2, 0, Math.PI * 2);
             ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }

      // 4. Draw Sun
      const sunRadius = 25;
      ctx.beginPath();
      ctx.arc(sunPosition.x, sunPosition.y, sunRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24'; // Amber-400
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 40;
      ctx.fill();
      ctx.shadowBlur = 0; // Reset

      // 5. Draw Ground (Dunes)
      ctx.fillStyle = '#451a03'; // Very dark brown for silhouette
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, height - 50);
      for (let x = 0; x <= width; x += 10) {
        const y = height - 50 - Math.sin(x * 0.01) * 20 - Math.cos(x * 0.005) * 10;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.fill();

      // 6. Draw Tower
      const towerBaseW = 40;
      const towerTopW = 20;
      const towerH = tower.height;
      const tX = tower.position.x;
      const tY = tower.position.y;
      
      ctx.fillStyle = '#334155'; // Slate-700
      ctx.beginPath();
      ctx.moveTo(tX - towerBaseW/2, tY);
      ctx.lineTo(tX - towerTopW/2, tY - towerH);
      ctx.lineTo(tX + towerTopW/2, tY - towerH);
      ctx.lineTo(tX + towerBaseW/2, tY);
      ctx.fill();

      // Receiver (The glowing target)
      const rX = tX;
      const rY = tY - tower.receiverOffset;
      const rRad = tower.receiverRadius;
      
      let totalEnergyThisFrame = 0;

      // Draw Receiver Base
      ctx.beginPath();
      ctx.arc(rX, rY, rRad, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();

      // 7. Calculate Physics & Draw Rays
      mirrors.forEach(mirror => {
        // A. Draw Mirror Stand
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mirror.position.x, mirror.position.y);
        ctx.lineTo(mirror.position.x, mirror.position.y + 20); 
        ctx.stroke();

        // B. Calculate Vectors
        const mirrorCenter = mirror.position;
        const I = Vec.norm(Vec.sub(mirrorCenter, sunPosition));
        const normalAngle = mirror.angle - Math.PI / 2;
        const N = Vec.fromAngle(normalAngle);
        const R = reflect(I, N);

        // C. Draw Ray from Sun to Mirror
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.4)'; // Faint yellow
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sunPosition.x, sunPosition.y);
        ctx.lineTo(mirrorCenter.x, mirrorCenter.y);
        ctx.stroke();

        // D. Draw Reflected Ray
        const rayLen = 1000;
        const rayEnd = Vec.add(mirrorCenter, Vec.mul(R, rayLen));

        // Check collision with Tower Receiver
        const hit = lineIntersectsCircle(mirrorCenter, rayEnd, {x: rX, y: rY}, rRad * 1.5); 
        
        ctx.strokeStyle = hit ? '#facc15' : 'rgba(253, 224, 71, 0.2)'; 
        ctx.lineWidth = hit ? 4 : 1;
        
        if (hit) {
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 10;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo(mirrorCenter.x, mirrorCenter.y);
        if (hit) {
            ctx.lineTo(rX, rY);
            const toTarget = Vec.norm(Vec.sub({x: rX, y: rY}, mirrorCenter));
            const alignment = Vec.dot(R, toTarget); 
            
            // Physics efficiency calculation
            if (alignment > 0.99) {
                totalEnergyThisFrame += 2.0;
            } else if (alignment > 0.95) {
                totalEnergyThisFrame += 0.5;
            }
        } else {
            ctx.lineTo(rayEnd.x, rayEnd.y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0; 

        // E. Draw Mirror Plate
        ctx.save();
        ctx.translate(mirrorCenter.x, mirrorCenter.y);
        ctx.rotate(mirror.angle);
        
        if (mirror.id === selectedMirrorId) {
            ctx.shadowColor = '#0ea5e9'; 
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#38bdf8';
        } else {
            ctx.strokeStyle = '#cbd5e1';
        }

        ctx.fillStyle = '#64748b'; 
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-mirror.width / 2, 0);
        ctx.lineTo(mirror.width / 2, 0);
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // 8. Receiver Glow Effect based on Total Energy
      if (totalEnergyThisFrame > 0) {
          const intensity = Math.min(totalEnergyThisFrame / 5, 1);
          const glowColor = `rgba(56, 189, 248, ${intensity})`; 
          const coreColor = `rgba(255, 255, 255, ${intensity})`;
          
          ctx.shadowColor = '#0ea5e9';
          ctx.shadowBlur = 20 + (intensity * 30);
          
          ctx.beginPath();
          ctx.arc(rX, rY, rRad - 2, 0, Math.PI * 2);
          ctx.fillStyle = coreColor;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(rX, rY, rRad + 5, 0, Math.PI * 2);
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 3;
          ctx.stroke();
          
          ctx.shadowBlur = 0;

          if (isPlaying) {
             onEnergyGenerated(totalEnergyThisFrame);
          }
      } else {
          ctx.beginPath();
          ctx.arc(rX, rY, rRad, 0, Math.PI * 2);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.stroke();
      }

      requestRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [mirrors, sunPosition, timeOfDay, isPlaying, selectedMirrorId, onEnergyGenerated, tower]);

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      style={{ touchAction: 'none' }} 
      className="block cursor-crosshair w-full h-full"
    />
  );
};

export default GameCanvas;