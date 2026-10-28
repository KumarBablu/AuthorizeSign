'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Edit3, Eraser, Type, X } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdopt: (pngBase64: string, method: 'draw' | 'typed', font?: string) => void;
  defaultName?: string;
}

export function SignatureModal({
  isOpen,
  onClose,
  onAdopt,
  defaultName = '',
}: SignatureModalProps) {
  const [tab, setTab] = useState<'draw' | 'typed'>('draw');
  const [typedName, setTypedName] = useState(defaultName);
  const [selectedFont, setSelectedFont] = useState<'Dancing Script' | 'Caveat' | 'Pacifico'>(
    'Dancing Script'
  );
  const [isEmpty, setIsEmpty] = useState(true);

  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen && tab === 'draw') {
      clearDrawCanvas();
    }
  }, [isOpen, tab]);

  if (!isOpen) return null;

  // Clear draw canvas
  const clearDrawCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  // Check if canvas has non-transparent pixels
  const checkCanvasNotEmpty = (canvas: HTMLCanvasElement): boolean => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 10) {
        return true; // found non-transparent pixel
      }
    }
    return false;
  };

  // Pointer event handlers for draw canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    lastPoint.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    lastPoint.current = { x: currentX, y: currentY };
    setIsEmpty(false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Renders typed name into a transparent PNG canvas
  const renderTypedToPng = (): string | null => {
    if (!typedName.trim()) return null;

    const offscreen = document.createElement('canvas');
    offscreen.width = 600;
    offscreen.height = 200;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, offscreen.width, offscreen.height);
    ctx.font = `64px "${selectedFont}", cursive`;
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(typedName.trim(), offscreen.width / 2, offscreen.height / 2);
    return offscreen.toDataURL('image/png');
  };

  const handleAdoptClick = () => {
    if (tab === 'draw') {
      const canvas = drawCanvasRef.current;
      if (!canvas || !checkCanvasNotEmpty(canvas)) {
        alert('Please draw your signature before adopting.');
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      onAdopt(dataUrl, 'draw');
    } else {
      if (!typedName.trim()) {
        alert('Please enter your name for the signature.');
        return;
      }
      const dataUrl = renderTypedToPng();
      if (!dataUrl) return;
      onAdopt(dataUrl, 'typed', selectedFont);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-base">Create Your Signature</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setTab('draw')}
            className={`flex-1 py-3 text-xs font-medium flex items-center justify-center space-x-2 border-b-2 transition-all ${
              tab === 'draw'
                ? 'border-blue-600 text-blue-600 bg-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Draw</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('typed')}
            className={`flex-1 py-3 text-xs font-medium flex items-center justify-center space-x-2 border-b-2 transition-all ${
              tab === 'typed'
                ? 'border-blue-600 text-blue-600 bg-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Type Name</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {tab === 'draw' && (
            <div className="space-y-3">
              <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden">
                <canvas
                  ref={drawCanvasRef}
                  width={500}
                  height={180}
                  className="w-full h-44 cursor-crosshair signature-canvas bg-white"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
                <div className="absolute bottom-2 left-3 text-[11px] text-slate-400 pointer-events-none select-none">
                  Draw signature above with finger, stylus, or mouse
                </div>
                <button
                  type="button"
                  onClick={clearDrawCanvas}
                  className="absolute top-2 right-2 inline-flex items-center px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs shadow-sm"
                >
                  <Eraser className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Clear
                </button>
              </div>
            </div>
          )}

          {tab === 'typed' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Your Full Legal Name
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Font Choice */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Choose Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Dancing Script', 'Caveat', 'Pacifico'] as const).map((font) => (
                    <button
                      key={font}
                      type="button"
                      onClick={() => setSelectedFont(font)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        selectedFont === font
                          ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="text-lg text-slate-900 truncate"
                        style={{ fontFamily: `"${font}", cursive` }}
                      >
                        {typedName.trim() || 'Signature'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">{font}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdoptClick}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Adopt &amp; Sign
          </button>
        </div>
      </div>
    </div>
  );
}
