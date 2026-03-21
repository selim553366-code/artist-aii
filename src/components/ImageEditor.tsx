import React, { useRef, useState, useEffect } from 'react';
import { Eraser, PenTool, Undo } from 'lucide-react';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedBase64: string) => void;
  onCancel: () => void;
}

export default function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [history, setHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Set canvas dimensions to match image aspect ratio, max width 512
      const maxWidth = 512;
      const scale = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      setHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // Semi-transparent red for marking

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/jpeg', 0.9));
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <PenTool size={16} className="text-zinc-400" />
            <input 
              type="range" 
              min="5" 
              max="50" 
              value={brushSize} 
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-24 accent-indigo-500"
            />
          </div>
          <button onClick={undo} disabled={history.length <= 1} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-50 text-white">
            <Undo size={16} />
          </button>
        </div>
        <p className="text-xs text-zinc-400">Değiştirmek istediğiniz yeri işaretleyin</p>
      </div>

      <div className="relative border border-zinc-700 rounded-xl overflow-hidden bg-zinc-950 touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="max-w-full h-auto cursor-crosshair"
        />
      </div>

      <div className="flex gap-2 w-full mt-2">
        <button onClick={onCancel} className="flex-1 py-2 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors font-medium">
          İptal
        </button>
        <button onClick={handleSave} className="flex-1 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors font-medium">
          İşaretlemeyi Bitir
        </button>
      </div>
    </div>
  );
}
