import { create } from 'zustand'
import type { PageKey } from '../types'

interface AppState {
  page: PageKey
  uploadOpen: boolean
  setPage: (page: PageKey) => void
  setUploadOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  page: 'assets',
  uploadOpen: false,
  setPage: (page) => set({ page }),
  setUploadOpen: (uploadOpen) => set({ uploadOpen }),
}))
