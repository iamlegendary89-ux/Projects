"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    targetAlpha: number;
    pulsePhase: number; // For pulsing size
}

interface ParticleFieldProps {
    archetypeColor?: string;
}

const ParticleField: React.FC<ParticleFieldProps> = ({ archetypeColor }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Use a safe mouse hook or just standard event listeners
    // For simplicity in this fix, we'll use local event listeners to avoid hook dependency issues

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Configuration
        const particleCount = window.innerWidth < 768 ? 50 : 120; // More particles for legend status
        const connectionDistance = 150;
        const mouseRepelRadius = 250; // Radius where mouse affects particles
        const baseSpeed = 0.3;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        let mouseX = -1000;
        let mouseY = -1000;

        // Particle System
        const particles: Particle[] = [];

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * baseSpeed,
                vy: (Math.random() - 0.5) * baseSpeed,
                size: Math.random() * 2 + 1, // Varied sizes
                alpha: Math.random() * 0.5 + 0.1,
                targetAlpha: Math.random() * 0.5 + 0.1,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }

        // Animation Loop
        let animationFrameId: number;

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // Update & Draw Particles
            particles.forEach(p => {
                // 1. Mouse Interaction (Repulsion + Excitement)
                const dx = p.x - mouseX;
                const dy = p.y - mouseY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouseRepelRadius) {
                    const force = (mouseRepelRadius - distance) / mouseRepelRadius;
                    const angle = Math.atan2(dy, dx);

                    // Push away
                    p.vx += Math.cos(angle) * force * 0.2;
                    p.vy += Math.sin(angle) * force * 0.2;

                    // Glow up
                    p.targetAlpha = 0.8;
                } else {
                    // Return to normal
                    if (Math.random() < 0.01) p.targetAlpha = Math.random() * 0.5 + 0.1;

                    // Drag (return to base speed)
                    p.vx *= 0.98;
                    p.vy *= 0.98;

                    // Add base drift if too slow
                    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                    if (speed < baseSpeed) {
                        p.vx += (Math.random() - 0.5) * 0.05;
                        p.vy += (Math.random() - 0.5) * 0.05;
                    }
                }

                // 2. Pulsing Size
                p.pulsePhase += 0.05;
                const currentSize = p.size + Math.sin(p.pulsePhase) * 0.5;

                // 3. Move
                p.x += p.vx;
                p.y += p.vy;

                // 4. Wrap around screen
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                // 5. Smooth Alpha Transition
                p.alpha += (p.targetAlpha - p.alpha) * 0.05;

                // Draw Particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.1, currentSize), 0, Math.PI * 2);
                ctx.fillStyle = archetypeColor || `rgba(255, 255, 255, ${p.alpha})`;
                ctx.fill();
            });

            // Draw Connections (Subtle Constellations)
            ctx.strokeStyle = archetypeColor ? archetypeColor : "rgba(255, 255, 255, 0.05)";
            ctx.lineWidth = 0.5;

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const p1 = particles[i];
                    const p2 = particles[j];
                    if (!p1 || !p2) continue;

                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionDistance) {
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        // Opacity based on distance
                        ctx.globalAlpha = 1 - (dist / connectionDistance);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        // Event Listeners
        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, [archetypeColor]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0 transition-colors duration-1000"
            style={{ background: "transparent" }}
            aria-hidden="true"
        />
    );
};

export default ParticleField;
