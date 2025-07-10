'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Toast, ToastProps } from './toast';

interface ToastContextType {
  addToast: (toast: Omit<ToastProps, 'onClose' | 'id'>) => string;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastWithId extends ToastProps {
  id: string;
}

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastProvider({ 
  children, 
  maxToasts = 5,
  position = 'top-right' 
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastWithId[]>([]);

  const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addToast = useCallback((toastProps: Omit<ToastProps, 'onClose' | 'id'>) => {
    const id = generateId();
    const newToast: ToastWithId = {
      ...toastProps,
      id,
      onClose: () => removeToast(id)
    };

    setToasts(prevToasts => {
      const updatedToasts = [newToast, ...prevToasts];
      // 최대 개수 제한
      return updatedToasts.slice(0, maxToasts);
    });

    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, removeAllToasts }}>
      {children}
      
      {/* Toast Container */}
      <div
        className={`fixed z-50 ${getPositionClasses()} max-h-screen overflow-hidden`}
        aria-live="polite"
        aria-label="알림"
      >
        <div className="flex flex-col-reverse gap-2">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              {...toast}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

// 편의 함수들
export function useToastHelpers() {
  const { addToast } = useToast();

  const showSuccess = useCallback((message: string, options?: Partial<ToastProps>) => {
    return addToast({
      type: 'success',
      message,
      ...options
    });
  }, [addToast]);

  const showError = useCallback((message: string, options?: Partial<ToastProps>) => {
    return addToast({
      type: 'error',
      message,
      duration: 8000, // 에러는 조금 더 오래 표시
      ...options
    });
  }, [addToast]);

  const showWarning = useCallback((message: string, options?: Partial<ToastProps>) => {
    return addToast({
      type: 'warning',
      message,
      duration: 6000,
      ...options
    });
  }, [addToast]);

  const showInfo = useCallback((message: string, options?: Partial<ToastProps>) => {
    return addToast({
      type: 'info',
      message,
      ...options
    });
  }, [addToast]);

  const showTimeRestriction = useCallback((message: string, options?: Partial<ToastProps>) => {
    return addToast({
      type: 'time-restriction',
      title: '시간대 제한',
      message,
      duration: 7000,
      ...options
    });
  }, [addToast]);

  const showDuplicateWarning = useCallback((message: string, options?: Partial<ToastProps>) => {
    return addToast({
      type: 'duplicate',
      title: '중복 업로드',
      message,
      duration: 7000,
      ...options
    });
  }, [addToast]);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showTimeRestriction,
    showDuplicateWarning,
    addToast
  };
}

export default ToastProvider; 