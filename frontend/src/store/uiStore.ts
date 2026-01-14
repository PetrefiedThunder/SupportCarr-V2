import { create } from 'zustand';

/**
 * Toast Notification
 */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

/**
 * Modal
 */
export interface Modal {
  id: string;
  component: React.ComponentType<{ onClose: () => void }>;
  props?: Record<string, unknown>;
}

/**
 * UI Store State
 */
interface UIState {
  // State
  toasts: Toast[];
  modals: Modal[];
  isSidebarOpen: boolean;
  isLoading: boolean;
  loadingMessage: string | null;

  // Actions
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
  showModal: (modal: Omit<Modal, 'id'>) => void;
  hideModal: (id: string) => void;
  clearModals: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * UI Store
 *
 * Manages UI state for toasts, modals, sidebar, and global loading
 */
export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  toasts: [],
  modals: [],
  isSidebarOpen: true,
  isLoading: false,
  loadingMessage: null,

  /**
   * Show toast notification
   */
  showToast: (toast) => {
    const id = generateId();
    const newToast: Toast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-hide after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        get().hideToast(id);
      }, duration);
    }
  },

  /**
   * Hide toast
   */
  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  /**
   * Clear all toasts
   */
  clearToasts: () => {
    set({ toasts: [] });
  },

  /**
   * Show modal
   */
  showModal: (modal) => {
    const id = generateId();
    const newModal: Modal = { ...modal, id };

    set((state) => ({
      modals: [...state.modals, newModal],
    }));
  },

  /**
   * Hide modal
   */
  hideModal: (id) => {
    set((state) => ({
      modals: state.modals.filter((m) => m.id !== id),
    }));
  },

  /**
   * Clear all modals
   */
  clearModals: () => {
    set({ modals: [] });
  },

  /**
   * Toggle sidebar
   */
  toggleSidebar: () => {
    set((state) => ({
      isSidebarOpen: !state.isSidebarOpen,
    }));
  },

  /**
   * Set sidebar open state
   */
  setSidebarOpen: (isOpen) => {
    set({ isSidebarOpen: isOpen });
  },

  /**
   * Set global loading state
   */
  setLoading: (isLoading, message) => {
    set({
      isLoading,
      loadingMessage: message ?? null,
    });
  },
}));

/**
 * Selectors
 */
export const useToasts = () => useUIStore((state) => state.toasts);
export const useModals = () => useUIStore((state) => state.modals);
export const useIsSidebarOpen = () => useUIStore((state) => state.isSidebarOpen);
export const useIsLoading = () => useUIStore((state) => state.isLoading);
