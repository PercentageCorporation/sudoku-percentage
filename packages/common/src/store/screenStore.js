import { create } from 'zustand';

export const useScreenStore = create((set) => ({
    screen: 'game',
    refresh: 0,

    setScreen: (screen) => set({ screen }),

    refreshScreen: () => set((state) => ({
        refresh: state.refresh + 1
    }))

}));
