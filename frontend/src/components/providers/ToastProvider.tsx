import React from 'react';
import { ToastContainer } from '@/components/ui/Toast';
import { useUIStore } from '@/store/uiStore';

/**
 * Toast Provider Component
 *
 * Connects ToastContainer with the global UI store
 */
export const ToastProvider: React.FC = () => {
  const toasts = useUIStore((state) => state.toasts);
  const hideToast = useUIStore((state) => state.hideToast);

  return <ToastContainer toasts={toasts} onClose={hideToast} />;
};

ToastProvider.displayName = 'ToastProvider';
