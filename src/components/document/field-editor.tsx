'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calendar, GripVertical, Move, PenTool, Trash2 } from 'lucide-react';
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

  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  // Make sure activeSignerTempId is valid
  useEffect(() => {
    if (signers.length > 0 && (!activeSignerTempId || !signers.some((s) => s.tempId === activeSignerTempId))) {
      setActiveSignerTempId(signers[0].tempId);
    }
  }, [signers, activeSignerTempId]);

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

    onChange([...fieldsRef.current, newField]);
  };

  const handleFieldPointerDown = (field: DocumentField, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only main button
    if ((e.target as HTMLElement).closest('.delete-field-btn')) return;

    e.preventDefault();
    e.stopPropagation();

    const pageEl = pageRefs.current[field.page];
    if (!pageEl) return;

    const pageRect = pageEl.getBoundingClientRect();
    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const startFieldX = field.x;
    const startFieldY = field.y;
    const fieldWidth = field.width;
    const fieldHeight = field.height;
    const fieldId = field.tempId;

    setDraggingFieldId(fieldId);
    setActiveSignerTempId(field.signerTempId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const deltaX = (moveEvent.clientX - startPointerX) / pageRect.width;
      const deltaY = (moveEvent.clientY - startPointerY) / pageRect.height;

      const newX = Math.max(0, Math.min(1 - fieldWidth, startFieldX + deltaX));
      const newY = Math.max(0, Math.min(1 - fieldHeight, startFieldY + deltaY));

      const updated = fieldsRef.current.map((f) =>
        f.tempId === fieldId
          ? { ...f, x: Number(newX.toFixed(5)), y: Number(newY.toFixed(5)) }
          : f
      );
      onChange(updated);
    };

    const onPointerUp = () => {
      setDraggingFieldId(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleRemoveField = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(fieldsRef.current.filter((f) => f.tempId !== fieldId));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-72 flex-shrink-0 space-y-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit sticky top-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            1. Select Active Signer
          </label>
          <div className="space-y-2">
            {signers.map((s, idx) => {
              const signerFields = fields.filter((f) => f.signerTempId === s.tempId);
              const hasSig = signerFields.some((f) => f.type === 'signature');
              const isSelected = activeSigner?.tempId === s.tempId;

              return (
                <button
                  key={s.tempId}
                  type="button"
                  onClick={() => setActiveSignerTempId(s.tempId)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs transition-all border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-xs"
                      style={{ backgroundColor: s.color }}
                    />
                    <div className="truncate">
                      <div className="font-semibold truncate">
                        {idx + 1}. {s.name || `Signatory ${idx + 1}`}
                      </div>
                      <div className={`text-[11px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {s.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end flex-shrink-0 ml-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}>
                      {signerFields.length} {signerFields.length === 1 ? 'field' : 'fields'}
                    </span>
                    {!hasSig && (
                      <span className="text-[9px] text-amber-500 font-semibold mt-1">
                        Needs signature
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
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
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                selectedTool === 'signature'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/20 shadow-xs'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <PenTool className="w-4 h-4 mb-1 text-blue-600" />
              Signature
            </button>
            <button
              type="button"
              onClick={() => setSelectedTool('date')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                selectedTool === 'date'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20 shadow-xs'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4 mb-1 text-indigo-600" />
              Date
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
          <p className="font-semibold text-slate-800 flex items-center">
            <Move className="w-3 h-3 mr-1 text-blue-600" />
            Field Placement &amp; Moving:
          </p>
          <ul className="space-y-1 list-disc list-inside text-slate-500">
            <li><strong>Click anywhere</strong> on the page to drop a field for the active signer.</li>
            <li><strong>Click &amp; drag</strong> any placed field to freely adjust its position.</li>
          </ul>
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
              className="relative w-full max-w-2xl aspect-[1/1.414] bg-white rounded-xl border border-slate-300 shadow-md cursor-crosshair overflow-hidden select-none"
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
                  const isDragging = draggingFieldId === field.tempId;

                  return (
                    <div
                      key={field.tempId}
                      onPointerDown={(e) => handleFieldPointerDown(field, e)}
                      className={`field-box absolute rounded-lg border-2 flex items-center justify-between px-2.5 shadow-sm group select-none transition-shadow ${
                        isDragging
                          ? 'cursor-grabbing z-30 ring-2 ring-blue-500 shadow-lg scale-[1.02]'
                          : 'cursor-grab hover:shadow-md'
                      }`}
                      style={{
                        left: `${field.x * 100}%`,
                        top: `${field.y * 100}%`,
                        width: `${field.width * 100}%`,
                        height: `${field.height * 100}%`,
                        borderColor: signerColor,
                        backgroundColor: `${signerColor}18`,
                      }}
                    >
                      <div className="flex items-center space-x-1.5 truncate pointer-events-none">
                        <GripVertical className="w-3.5 h-3.5 text-slate-400 opacity-60 flex-shrink-0" />
                        {field.type === 'signature' ? (
                          <PenTool className="w-3.5 h-3.5 flex-shrink-0" style={{ color: signerColor }} />
                        ) : (
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: signerColor }} />
                        )}
                        <span
                          className="text-[11px] font-bold truncate uppercase tracking-tight"
                          style={{ color: signerColor }}
                        >
                          {signer?.name || 'Signer'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        {isDragging && (
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/75 text-white">
                            {Math.round(field.x * 100)}%, {Math.round(field.y * 100)}%
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleRemoveField(field.tempId, e)}
                          className="delete-field-btn p-1 hover:bg-white/80 rounded-md text-red-500 hover:text-red-700 transition-colors"
                          title="Remove field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
