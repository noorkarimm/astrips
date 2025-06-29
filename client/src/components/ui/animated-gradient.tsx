import React, { useEffect, useRef } from 'react';

interface AnimatedGradientProps {
  className?: string;
}

export const AnimatedGradient: React.FC<AnimatedGradientProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration based on your settings
    const config = {
      colors: [
        '#130437',
        '#B34BD0', 
        '#210751',
        '#3511A5'
      ],
      speed: 4,
      horizontalPressure: 7,
      verticalPressure: 3,
      colorBrightness: 1.95,
      colorSaturation: 2,
      colorBlending: 9,
      backgroundColor: '#003FFF',
      shadows: 4
    };

    let time = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const createGradientBlob = (x: number, y: number, radius: number, color: string, opacity: number) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(0.5, `${color}${Math.floor(opacity * 0.5 * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${color}00`);
      return gradient;
    };

    const animate = () => {
      // Clear canvas with background color
      ctx.fillStyle = config.backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Set blend mode for color mixing
      ctx.globalCompositeOperation = 'screen';

      time += config.speed * 0.01;

      // Create flowing gradient blobs
      config.colors.forEach((color, index) => {
        const angle1 = time * 0.5 + index * Math.PI * 0.5;
        const angle2 = time * 0.3 + index * Math.PI * 0.7;
        
        // Calculate positions with horizontal and vertical pressure
        const x1 = width * 0.5 + Math.cos(angle1) * width * 0.3 * (config.horizontalPressure / 10);
        const y1 = height * 0.5 + Math.sin(angle1) * height * 0.2 * (config.verticalPressure / 10);
        
        const x2 = width * 0.3 + Math.cos(angle2) * width * 0.4 * (config.horizontalPressure / 10);
        const y2 = height * 0.7 + Math.sin(angle2) * height * 0.3 * (config.verticalPressure / 10);

        // Create multiple layers for depth
        for (let layer = 0; layer < config.shadows; layer++) {
          const layerOffset = layer * 50;
          const layerOpacity = (config.shadows - layer) / config.shadows * 0.3;
          
          // First blob
          const radius1 = Math.min(width, height) * (0.3 + Math.sin(time + index) * 0.1);
          ctx.fillStyle = createGradientBlob(
            x1 + layerOffset, 
            y1 + layerOffset, 
            radius1, 
            color, 
            layerOpacity * config.colorBrightness
          );
          ctx.fillRect(0, 0, width, height);

          // Second blob
          const radius2 = Math.min(width, height) * (0.25 + Math.cos(time * 0.7 + index) * 0.08);
          ctx.fillStyle = createGradientBlob(
            x2 + layerOffset, 
            y2 + layerOffset, 
            radius2, 
            color, 
            layerOpacity * config.colorBrightness
          );
          ctx.fillRect(0, 0, width, height);
        }
      });

      // Add flowing movement with additional color layers
      config.colors.forEach((color, index) => {
        const flowAngle = time * 0.2 + index * Math.PI * 0.3;
        const flowX = width * 0.7 + Math.cos(flowAngle) * width * 0.2;
        const flowY = height * 0.3 + Math.sin(flowAngle * 1.3) * height * 0.4;
        
        const flowRadius = Math.min(width, height) * (0.2 + Math.sin(time * 0.5 + index) * 0.05);
        ctx.fillStyle = createGradientBlob(flowX, flowY, flowRadius, color, 0.2 * config.colorBrightness);
        ctx.fillRect(0, 0, width, height);
      });

      // Reset blend mode
      ctx.globalCompositeOperation = 'source-over';

      animationRef.current = requestAnimationFrame(animate);
    };

    resize();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full ${className}`}
      style={{ zIndex: -1 }}
    />
  );
};