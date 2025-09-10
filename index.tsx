import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// TypeScript declarations for citygen.js globals
declare global {
  interface Window {
    CityGenReady?: boolean;
    require: (module: string) => any;
  }
}

interface Point {
  x: number;
  y: number;
}

interface Segment {
  r: {
    start: Point;
    end: Point;
  };
  width: number;
  q: {
    highway?: boolean;
  };
}

interface MapData {
  segments: Segment[];
}

const App: React.FC = () => {
  const [seed, setSeed] = useState<string>('gemini-2.5');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mapData, setMapData] = useState<MapData | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pan = useRef({ x: 0, y: 0 });
  const zoom = useRef(1);
  const isDragging = useRef(false);
  const lastDragPos = useRef({ x: 0, y: 0 });
  // Initialize useRef with undefined to fix TypeScript error
  const animationFrameId = useRef<number | undefined>(undefined);

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !mapData) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.translate(pan.current.x, pan.current.y);
    ctx.scale(zoom.current, zoom.current);

    mapData.segments.forEach((segment) => {
      const isHighway = segment.q.highway;
      ctx.strokeStyle = isHighway ? 'hsl(54, 78%, 70%)' : '#b0b0b0';
      ctx.lineWidth = isHighway ? segment.width / 2 : segment.width;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(segment.r.start.x, segment.r.start.y);
      ctx.lineTo(segment.r.end.x, segment.r.end.y);
      ctx.stroke();
    });

    ctx.restore();
  }, [mapData]);

  const generateMap = useCallback((currentSeed: string) => {
    setIsLoading(true);
    // Use timeout to allow UI to update before blocking thread
    setTimeout(() => {
      try {
        if (window.CityGenReady) {
          const mapgen = window.require('game_modules/mapgen');
          const data: MapData = mapgen.generate(currentSeed || Date.now().toString());
          setMapData(data);
        } else {
          console.error('CityGen script not ready.');
          // Retry logic
          setTimeout(() => generateMap(currentSeed), 100);
        }
      } catch (error) {
        console.error('Failed to generate map:', error);
      } finally {
        setIsLoading(false);
      }
    }, 10);
  }, []);

  useEffect(() => {
    if (!mapData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    mapData.segments.forEach(s => {
      minX = Math.min(minX, s.r.start.x, s.r.end.x);
      maxX = Math.max(maxX, s.r.start.x, s.r.end.x);
      minY = Math.min(minY, s.r.start.y, s.r.end.y);
      maxY = Math.max(maxY, s.r.start.y, s.r.end.y);
    });

    const mapWidth = maxX - minX;
    const mapHeight = maxY - minY;
    
    if(mapWidth === 0 || mapHeight === 0) {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = requestAnimationFrame(drawMap);
        return;
    };

    const scaleX = canvas.width / (mapWidth * 1.1);
    const scaleY = canvas.height / (mapHeight * 1.1);
    const newZoom = Math.min(scaleX, scaleY);
    zoom.current = newZoom;

    pan.current.x = (canvas.width / 2) - ((minX + mapWidth / 2) * newZoom);
    pan.current.y = (canvas.height / 2) - ((minY + mapHeight / 2) * newZoom);

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    animationFrameId.current = requestAnimationFrame(drawMap);
  }, [mapData, drawMap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;
        if (mapData) { // Recalculate zoom/pan to fit new size
            const event = new Event('recalculate-view');
            canvas.dispatchEvent(event);
        }
    });
    resizeObserver.observe(canvas);
    
    const recalculateView = () => {
        if(mapData) {
            setMapData(d => ({ ...d! })); // Trigger useEffect for zoom/pan
        }
    }
    canvas.addEventListener('recalculate-view', recalculateView);

    const handleMouseDown = (e: MouseEvent) => {
        isDragging.current = true;
        lastDragPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastDragPos.current.x;
        const dy = e.clientY - lastDragPos.current.y;
        pan.current.x += dx;
        pan.current.y += dy;
        lastDragPos.current = { x: e.clientX, y: e.clientY };
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = requestAnimationFrame(drawMap);
    };

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const scaleFactor = 1.1;
        const scaleAmount = e.deltaY < 0 ? scaleFactor : 1 / scaleFactor;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - pan.current.x) / zoom.current;
        const worldY = (mouseY - pan.current.y) / zoom.current;

        const newZoom = Math.max(0.01, Math.min(50, zoom.current * scaleAmount));
        zoom.current = newZoom;
        
        pan.current.x = mouseX - worldX * zoom.current;
        pan.current.y = mouseY - worldY * zoom.current;

        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = requestAnimationFrame(drawMap);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel);

    generateMap(seed);

    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener('recalculate-view', recalculateView)
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('wheel', handleWheel);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateMap, drawMap]);

  const handleGenerateClick = () => {
    generateMap(seed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerateClick();
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Procedural City Generator</h1>
      </header>
      <div className="controls">
        <input
          type="text"
          className="seed-input"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter seed or leave blank for random"
          aria-label="Map generation seed"
        />
        <button
          className="generate-button"
          onClick={handleGenerateClick}
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Map'}
        </button>
      </div>
      <div className="canvas-container">
        <canvas ref={canvasRef} aria-label="Generated city map"></canvas>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}