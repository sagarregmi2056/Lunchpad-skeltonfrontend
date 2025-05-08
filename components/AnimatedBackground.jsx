import React, { useEffect, useRef } from 'react';

const AnimatedBackground = ({ className = "" }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];
        let mouseX = 0;
        let mouseY = 0;
        let interactionRadius = 150;

        // Set canvas dimensions
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        // Track mouse/touch position
        const updateMousePosition = (e) => {
            if (e.touches) {
                mouseX = e.touches[0].clientX;
                mouseY = e.touches[0].clientY;
            } else {
                mouseX = e.clientX;
                mouseY = e.clientY;
            }
        };

        // Create particles
        const initParticles = () => {
            particles = [];
            const numberOfParticles = Math.min(Math.floor(canvas.width * canvas.height / 15000), 100);

            // Multi-color palette for particles (using our theme colors)
            const colorPalette = [
                'rgba(147, 51, 234, 0.2)', // Purple
                'rgba(139, 92, 246, 0.2)', // Violet
                'rgba(124, 58, 237, 0.2)', // Indigo
                'rgba(79, 70, 229, 0.15)', // Blue
                'rgba(168, 85, 247, 0.2)', // Pink
            ];

            for (let i = 0; i < numberOfParticles; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 2 + 0.5,
                    // More varied sizes
                    baseRadius: Math.random() * 2 + 0.5,
                    color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
                    velocity: {
                        x: (Math.random() - 0.5) * 0.4, // Slightly faster
                        y: (Math.random() - 0.5) * 0.4
                    },
                    // Add slight random drift
                    drift: {
                        x: (Math.random() - 0.5) * 0.05,
                        y: (Math.random() - 0.5) * 0.05
                    },
                    // Direction changes
                    directionChangeCounter: Math.random() * 100
                });
            }
        };

        // Draw a single particle (now with glow)
        const drawParticle = (particle) => {
            // Extract the color components for gradient
            const rgbaColor = particle.color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);

            if (rgbaColor) {
                const r = rgbaColor[1];
                const g = rgbaColor[2];
                const b = rgbaColor[3];

                // Add subtle glow
                const gradient = ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.radius * 3
                );

                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
                gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius * 3, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Inner particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
                ctx.fill();
            }
        };

        // Update particle position with mouse interaction
        const updateParticle = (particle) => {
            // Occasional slight direction change
            particle.directionChangeCounter -= 1;
            if (particle.directionChangeCounter <= 0) {
                particle.velocity.x += (Math.random() - 0.5) * 0.1;
                particle.velocity.y += (Math.random() - 0.5) * 0.1;

                // Limit max speed
                const speed = Math.sqrt(particle.velocity.x * particle.velocity.x + particle.velocity.y * particle.velocity.y);
                if (speed > 0.8) {
                    particle.velocity.x = (particle.velocity.x / speed) * 0.8;
                    particle.velocity.y = (particle.velocity.y / speed) * 0.8;
                }

                particle.directionChangeCounter = Math.random() * 100 + 50;
            }

            // Apply drift
            particle.velocity.x += particle.drift.x;
            particle.velocity.y += particle.drift.y;

            // Mouse interaction
            const dx = mouseX - particle.x;
            const dy = mouseY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Particles are pushed away from mouse/touch
            if (distance < interactionRadius) {
                const force = (interactionRadius - distance) / interactionRadius;
                particle.velocity.x -= (dx / distance) * force * 0.2;
                particle.velocity.y -= (dy / distance) * force * 0.2;

                // Grow particles near mouse
                particle.radius = particle.baseRadius + (particle.baseRadius * force);
            } else {
                // Return to base size
                particle.radius = particle.baseRadius;
            }

            // Update position
            particle.x += particle.velocity.x;
            particle.y += particle.velocity.y;

            // Apply slight dampening (friction)
            particle.velocity.x *= 0.99;
            particle.velocity.y *= 0.99;

            // Wrap around edges
            if (particle.x < 0) particle.x = canvas.width;
            if (particle.x > canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = canvas.height;
            if (particle.y > canvas.height) particle.y = 0;
        };

        // Draw connections between particles
        const drawConnections = () => {
            const maxDistance = 150;

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < maxDistance) {
                        const opacity = 1 - (distance / maxDistance);
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(147, 51, 234, ${opacity * 0.15})`;
                        ctx.lineWidth = 0.6;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        };

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const particle of particles) {
                drawParticle(particle);
                updateParticle(particle);
            }

            drawConnections();
            animationFrameId = requestAnimationFrame(animate);
        };

        // Set up canvas
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Add event listeners for mouse and touch input
        window.addEventListener('mousemove', updateMousePosition);
        window.addEventListener('touchmove', updateMousePosition);

        animate();

        // Clean up
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', updateMousePosition);
            window.removeEventListener('touchmove', updateMousePosition);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`fixed top-0 left-0 w-full h-full -z-10 ${className}`}
            style={{ opacity: 0.8 }}
        />
    );
};

export default AnimatedBackground; 