'use client';

import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, UserCheck } from 'lucide-react';

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
];

interface SignerManagerProps {
  signers: SignerItem[];
  onChange: (signers: SignerItem[]) => void;
  isSequential: boolean;
}

export function SignerManager({ signers, onChange, isSequential }: SignerManagerProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddSigner = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter signer name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (signers.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
      setError('A signer with this email address has already been added.');
      return;
    }

    const color = SIGNER_COLORS[signers.length % SIGNER_COLORS.length].hex;
    const newSigner: SignerItem = {
      tempId: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      orderIndex: signers.length,
      color,
    };

    onChange([...signers, newSigner]);
    setName('');
    setEmail('');
  };

  const handleRemove = (tempId: string) => {
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
      {/* List of existing signers */}
      <div className="space-y-2">
        {signers.map((signer, index) => (
          <div
            key={signer.tempId}
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm"
          >
            <div className="flex items-center space-x-3">
              <span
                className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: signer.color }}
              />
              {isSequential && (
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                  {index + 1}
                </span>
              )}
              <div>
                <div className="text-sm font-medium text-slate-800">{signer.name}</div>
                <div className="text-xs text-slate-500">{signer.email}</div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {isSequential && (
                <>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    title="Move up in sequence"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === signers.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    title="Move down in sequence"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => handleRemove(signer.tempId)}
                className="p-1 text-red-500 hover:text-red-700"
                title="Remove signer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {signers.length === 0 && (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
            <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No signers added yet. Add at least one signer below.
          </div>
        )}
      </div>

      {/* Add Signer Form */}
      <form onSubmit={handleAddSigner} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Add Signer
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@example.com"
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          className="inline-flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Signer
        </button>
      </form>
    </div>
  );
}
