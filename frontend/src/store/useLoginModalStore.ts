import { create } from 'zustand';

interface LoginModalState {
  isOpen: boolean;
  redirectPath: string | null;
  openLoginModal: (redirectPath?: string) => void;
  closeLoginModal: () => void;
}

export const useLoginModalStore = create<LoginModalState>((set) => ({
  isOpen: false,
  redirectPath: null,

  openLoginModal: (redirectPath?: string) => {
    set({ isOpen: true, redirectPath: redirectPath || null });
  },

  closeLoginModal: () => {
    set({ isOpen: false, redirectPath: null });
  },
}));
