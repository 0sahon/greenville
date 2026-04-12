import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Palette, Brush, Eraser, Download, RotateCcw, Star, Heart, Sparkles } from 'lucide-react';
import { useSounds } from '../../../hooks/useSounds';

interface ArtStudioProps {
  onBack: () => void;
  onArtworkSaved?: () => void;
}

export default function ArtStudio({ onBack, onArtworkSaved }: ArtStudioProps) {
  const { brush, eraser, save } = useSounds();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ff6b6b');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [showCelebration, setShowCelebration] = useState(false);

  const colors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
    '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce', '#f8c471'
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Set initial background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    brush();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? brushSize * 2 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.beginPath(); // Reset path
        }
      }
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  };

  const downloadArtwork = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'my-masterpiece.png';
    link.href = canvas.toDataURL();
    link.click();

    save();
    onArtworkSaved?.();
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-pink-200 to-yellow-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <ArrowLeft className="w-6 h-6 text-purple-600" />
          <span className="text-purple-600 font-bold text-lg">Back</span>
        </button>

        <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg">
          <Palette className="w-6 h-6 text-purple-500" />
          <span className="text-xl font-bold text-gray-800">Art Studio</span>
        </div>
      </div>

      {/* Tools Panel */}
      <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6">
        <h1 className="text-4xl font-black text-gray-800 mb-6 text-center">
          🎨 Art Studio! 🎨
        </h1>

        {/* Color Palette */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-700 mb-3">Choose Your Colors! 🌈</h3>
          <div className="flex flex-wrap gap-3 justify-center">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setTool('brush');
                }}
                className={`w-12 h-12 rounded-full border-4 transition-all duration-200 transform hover:scale-110 ${
                  color === c && tool === 'brush' ? 'border-purple-500 scale-110' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
          <button
            onClick={() => setTool('brush')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-200 transform hover:scale-105 ${
              tool === 'brush' ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <Brush className="w-5 h-5" />
            Brush
          </button>

          <button
            onClick={() => { setTool('eraser'); eraser(); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-200 transform hover:scale-105 ${
              tool === 'eraser' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <Eraser className="w-5 h-5" />
            Eraser
          </button>

          <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
            <span className="text-gray-700 font-bold">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-20"
            />
            <span className="text-gray-700 font-bold min-w-[2rem]">{brushSize}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-2 bg-red-400 hover:bg-red-500 text-white px-6 py-3 rounded-full font-bold transition-all duration-200 transform hover:scale-105"
          >
            <RotateCcw className="w-5 h-5" />
            Clear Canvas
          </button>

          <button
            onClick={downloadArtwork}
            className="flex items-center gap-2 bg-green-400 hover:bg-green-500 text-white px-6 py-3 rounded-full font-bold transition-all duration-200 transform hover:scale-105"
          >
            <Download className="w-5 h-5" />
            Save Artwork
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="bg-white rounded-3xl shadow-2xl p-6">
        <div className="text-center mb-4">
          <p className="text-lg text-gray-600 font-medium">
            🎨 Draw something amazing! Let your creativity shine! ✨
          </p>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="w-full h-[500px] border-4 border-dashed border-gray-300 rounded-2xl cursor-crosshair bg-white"
            style={{ touchAction: 'none' }}
          />

          {/* Canvas Instructions */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <p className="text-sm text-gray-700 font-medium">
              💡 Tip: Click and drag to draw!
            </p>
          </div>
        </div>
      </div>

      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-center">
            <div className="text-8xl animate-bounce">🎨</div>
            <div className="text-4xl font-black text-white drop-shadow-lg animate-pulse">
              MASTERPIECE SAVED!
            </div>
            {/* Floating elements */}
            <div className="absolute inset-0">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-ping"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.1}s`
                  }}
                >
                  {i % 3 === 0 ? (
                    <Star className="w-6 h-6 text-yellow-400 fill-current" />
                  ) : i % 3 === 1 ? (
                    <Heart className="w-6 h-6 text-pink-400 fill-current" />
                  ) : (
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}