'use client';

import React, { useRef, useState } from 'react';
import { Calendar, PenTool, Trash2 } from 'lucide-react';
import type { SignerItem } from './signer-manager';

export interface DocumentField {
  tempId: string;
  signerTempId: string;
  type: 'signature' | 'date';
  page: number;
  x: number; // 0..1
  y: number; // 0..1
  width: number; // 0..1
  height: number; // 0..1
}

interface FieldEditorProps {
  totalPages: number;
  signers: SignerItem[];
  fields: DocumentField[];
  onChange: (fields: DocumentField[]) => void;
  pdfUrl?: string;
}

export function FieldEditor({
  totalPages = 1,
  signers,
  fields,
  onChange,
}: FieldEditorProps) {
  const [activeSignerTempId, setActiveSignerTempId] = useState<string>(
    signers[0]?.tempId || ''
  );
  const [selectedTool, setSelectedTool] = useState<'signature' | 'date'>('signature');
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const activeSigner = signers.find((s) => s.tempId === activeSignerTempId) || signers[0];

  const handlePageClick = (pageNumber: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeSigner) return;
    if ((e.target as HTMLElement).closest('.field-box')) return;

    const pageEl = pageRefs.current[pageNumber];
    if (!pageEl) return;

    const rect = pageEl.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / rect.width;
    const rawY = (e.clientY - rect.top) / rect.height;

    const width = selectedTool === 'signature' ? 0.24 : 0.18;
    const height = selectedTool === 'signature' ? 0.06 : 0.04;

    // Clamp coordinates within page boundaries
    const clampedX = Math.min(Math.max(0, rawX), 1 - width);
    const clampedY = Math.min(Math.max(0, rawY), 1 - height);

    const newField: DocumentField = {
      tempId: crypto.randomUUID(),
      signerTempId: activeSigner.tempId,
      type: selectedTool,
      page: pageNumber,
      x: Number(clampedX.toFixed(5)),
      y: Number(clampedY.toFixed(5)),
      width: Number(width.toFixed(5)),
      height: Number(height.toFixed(5)),
    };

    onChange([...fields, newField]);
  };

  const handleRemoveField = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(fields.filter((f) => f.tempId !== fieldId));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-72 flex-shrink-0 space-y-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit sticky top-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            1. Select Signer
          </label>
          <div className="space-y-1.5">
            {signers.map((s) => (
              <button
                key={s.tempId}
                type="button"
                onClick={() => setActiveSignerTempId(s.tempId)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-all ${
                  activeSigner?.tempId === s.tempId
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-medium truncate">{s.name}</span>
                </div>
                <span className="text-[10px] opacity-75">
                  {fields.filter((f) => f.signerTempId === s.tempId).length} fields
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            2. Choose Field Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedTool('signature')}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                selectedTool === 'signature'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <PenTool className="w-4 h-4 mb-1 text-blue-600" />
              Signature
            </button>
            <button
              type="button"
              onClick={() => setSelectedTool('date')}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                selectedTool === 'date'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4 mb-1 text-indigo-600" />
              Date
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
          <p className="font-medium text-slate-700">How to place fields:</p>
          <p>Click anywhere on the document pages to place the selected field for the active signer.</p>
        </div>
      </div>

      {/* Document Pages Container */}
      <div className="flex-1 space-y-6">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <div key={pageNum} className="flex flex-col items-center">
            <div className="text-xs font-medium text-slate-400 mb-2">Page {pageNum}</div>

            {/* Document Page Canvas Overlay */}
            <div
              ref={(el) => {
                pageRefs.current[pageNum] = el;
              }}
              onClick={(e) => handlePageClick(pageNum, e)}
              className="relative w-full max-w-2xl aspect-[1/1.414] bg-white rounded-lg border border-slate-300 shadow-md cursor-crosshair overflow-hidden select-none"
            >
              {/* Simulated PDF background lines/grid */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="space-y-3">
                  <div className="h-4 bg-slate-400 rounded w-1/3" />
                  <div className="h-2 bg-slate-300 rounded w-full" />
                  <div className="h-2 bg-slate-300 rounded w-5/6" />
                  <div className="h-2 bg-slate-300 rounded w-4/6" />
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-slate-300 rounded w-full" />
                  <div className="h-2 bg-slate-300 rounded w-11/12" />
                  <div className="h-2 bg-slate-300 rounded w-3/4" />
                </div>
              </div>

              {/* Placed Fields on this Page */}
              {fields
                .filter((f) => f.page === pageNum)
                .map((field) => {
                  const signer = signers.find((s) => s.tempId === field.signerTempId);
                  const signerColor = signer?.color || '#3b82f6';

                  return (
                    <div
                      key={field.tempId}
                      className="field-box absolute rounded border-2 flex items-center justify-between px-2 cursor-move transition-transform duration-75 shadow-sm group"
                      style={{
                        left: `${field.x * 100}%`,
                        top: `${field.y * 100}%`,
                        width: `${field.width * 100}%`,
                        height: `${field.height * 100}%`,
                        borderColor: signerColor,
                        backgroundColor: `${signerColor}15`,
                      }}
                    >
                      <div className="flex items-center space-x-1 truncate pointer-events-none">
                        {field.type === 'signature' ? (
                          <PenTool className="w-3 h-3 flex-shrink-0" style={{ color: signerColor }} />
                        ) : (
                          <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: signerColor }} />
                        )}
                        <span
                          className="text-[10px] font-semibold truncate uppercase"
                          style={{ color: signerColor }}
                        >
                          {signer?.name || 'Signer'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleRemoveField(field.tempId, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/80 rounded transition-opacity"
                        title="Remove field"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
