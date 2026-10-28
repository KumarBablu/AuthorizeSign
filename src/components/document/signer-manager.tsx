'use client';

import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, UserPlus, Users } from 'lucide-react';

export interface SignerItem {
  tempId: string;
  name: string;
  email: string;
  orderIndex: number;
  color: string;
}

export const SIGNER_COLORS = [
  { name: 'Blue', bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800', hex: '#3b82f6' },
  { name: 'Purple', bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800', hex: '#a855f7' },
  { name: 'Emerald', bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800', hex: '#10b981' },
  { name: 'Amber', bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-800', hex: '#f59e0b' },
  { name: 'Rose', bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-800', hex: '#f43f5e' },
  { name: 'Cyan', bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-800', hex: '#06b6d4' },
];

interface SignerManagerProps {
  signers: SignerItem[];
  onChange: (signers: SignerItem[]) => void;
  isSequential: boolean;
}

export function SignerManager({ signers, onChange, isSequential }: SignerManagerProps) {
  const handleUpdate = (tempId: string, updates: Partial<SignerItem>) => {
    const updated = signers.map((s) => (s.tempId === tempId ? { ...s, ...updates } : s));
    onChange(updated);
  };

  const handleAddSigner = () => {
    const nextIndex = signers.length;
    const color = SIGNER_COLORS[nextIndex % SIGNER_COLORS.length].hex;
    const newSigner: SignerItem = {
      tempId: crypto.randomUUID(),
      name: '',
      email: '',
      orderIndex: nextIndex,
      color,
    };
    onChange([...signers, newSigner]);
  };

  const handleRemove = (tempId: string) => {
    if (signers.length <= 1) {
      // Keep at least one row, just reset fields
      const updated = signers.map((s) => (s.tempId === tempId ? { ...s, name: '', email: '' } : s));
      onChange(updated);
      return;
    }
    const filtered = signers
      .filter((s) => s.tempId !== tempId)
      .map((s, index) => ({ ...s, orderIndex: index }));
    onChange(filtered);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= signers.length) return;

    const copy = [...signers];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    const reindexed = copy.map((s, idx) => ({ ...s, orderIndex: idx }));
    onChange(reindexed);
  };

  return (
    <div className="space-y-4">
      {/* Signer Cards List */}
      <div className="space-y-3">
        {signers.map((signer, index) => (
          <div
            key={signer.tempId}
            className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3 transition-all hover:border-slate-300"
          >
            {/* Header: Signer Badge + Ordering + Delete */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-xs"
                  style={{ backgroundColor: signer.color }}
                />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  Signatory {index + 1}
                  {isSequential && (
                    <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                      Step {index + 1}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                {isSequential && signers.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-opacity"
                      title="Move earlier in sequence"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === signers.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-opacity"
                      title="Move later in sequence"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </>
                )}

                {signers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemove(signer.tempId)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors ml-1"
                    title="Remove signatory"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Direct Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={signer.name}
                  onChange={(e) => handleUpdate(signer.tempId, { name: e.target.value })}
                  placeholder="e.g. Alice Smith"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={signer.email}
                  onChange={(e) => handleUpdate(signer.tempId, { email: e.target.value.trim().toLowerCase() })}
                  placeholder="e.g. alice@company.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white transition-all"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Signer Button */}
      <button
        type="button"
        onClick={handleAddSigner}
        className="w-full py-2.5 px-4 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-2xs"
      >
        <UserPlus className="w-4 h-4 text-blue-600" />
        <span>+ Add Another Signatory</span>
      </button>
    </div>
  );
}
