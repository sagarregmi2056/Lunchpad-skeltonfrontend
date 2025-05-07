import React, { useEffect, useRef } from 'react';

const AnimatedBackground = ({ className = "" }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];

        // Set canvas dimensions
        const resizeCanvas = () => {
            const container = canvas.parentElement;
            if (!container) return;

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        // Create particles
        const initParticles = () => {
            particles = [];
            const numberOfParticles = Math.min(Math.floor(canvas.width * canvas.height / 20000), 80);

            for (let i = 0; i < numberOfParticles; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 1.5 + 0.5,
                    color: `rgba(130, 94, 216, ${Math.random() * 0.15 + 0.05})`,
                    velocity: {
                        x: (Math.random() - 0.5) * 0.3,
                        y: (Math.random() - 0.5) * 0.3
                    }
                });
            }
        };

        // Draw a single particle
        const drawParticle = (particle) => {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();
        };

        // Update particle position
        const updateParticle = (particle) => {
            particle.x += particle.velocity.x;
            particle.y += particle.velocity.y;

            // Wrap around edges instead of bouncing
            if (particle.x < 0) particle.x = canvas.width;
            if (particle.x > canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = canvas.height;
            if (particle.y > canvas.height) particle.y = 0;
        };

        // Draw connections between particles
        const drawConnections = () => {
            const maxDistance = 120;

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < maxDistance) {
                        const opacity = 1 - (distance / maxDistance);
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(130, 94, 216, ${opacity * 0.1})`;
                        ctx.lineWidth = 0.5;
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
        animate();

        // Clean up
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`fixed top-0 left-0 w-full h-full -z-10 ${className}`}
            style={{ opacity: 0.7 }}
        />
    );
};

export default AnimatedBackground; 