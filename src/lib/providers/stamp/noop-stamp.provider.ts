import type { StampParty, StampProvider, StampResult } from '../types';

/**
 * NoopStampProvider: Phase 1 placeholder for digital stamping.
 * In Phase 2, this can be swapped with a NeSL/SHCIL StampProvider without modifying core signing logic.
 */
export class NoopStampProvider implements StampProvider {
  async createStamp(state: string, amount: number, parties: StampParty[]): Promise<StampResult> {
    return {
      stampRef: `NOOP-${Date.now()}`,
      stampAmount: amount,
    };
  }
}
