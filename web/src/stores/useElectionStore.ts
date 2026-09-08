/**
 * 选举活动上下文 Store
 * 保存当前激活的封地活动 ID，用于各模块默认筛选
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ElectionFief, getElectionFief } from '../api/elections';

interface ElectionState {
  currentFiefId: string | null;
  currentFief: ElectionFief | null;
  setFief: (fiefId: string) => Promise<void>;
  clearFief: () => void;
}

export const useElectionStore = create<ElectionState>()(
  persist(
    (set) => ({
      currentFiefId: null,
      currentFief: null,

      setFief: async (fiefId) => {
        const fief = await getElectionFief(fiefId);
        set({ currentFiefId: fiefId, currentFief: fief });
      },

      clearFief: () => set({ currentFiefId: null, currentFief: null }),
    }),
    { name: 'cxq-election' },
  ),
);
