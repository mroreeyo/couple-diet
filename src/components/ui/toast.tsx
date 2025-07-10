'use client';

import { ReactNode, useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Clock, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastProps {
  id?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'time-restriction' | 'duplicate';
  title?: string;
  message: string;
  duration?: number; // 자동 닫힘 시간 (밀리초), 0이면 수동으로만 닫힘
  onClose?: () => void;
  className?: string;
  children?: ReactNode;
  actionButton?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
}

export function Toast({
  id,
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  className,
  children,
  actionButton
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isEntering, setIsEntering] = useState(true);

  useEffect(() => {
    // 등장 애니메이션
    const enterTimer = setTimeout(() => setIsEntering(false), 100);
    
    // 자동 닫힘
    let closeTimer: NodeJS.Timeout;
    if (duration > 0) {
      closeTimer = setTimeout(() => {
        handleClose();
      }, duration);
    }

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(closeTimer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300); // 퇴장 애니메이션 시간
  };

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    'time-restriction': Clock,
    'duplicate': Ban
  };

  const Icon = icons[type];

  const typeClasses = {
    success: "bg-green-50 border-green-200 text-green-800 shadow-green-100",
    error: "bg-red-50 border-red-200 text-red-800 shadow-red-100",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800 shadow-yellow-100",
    info: "bg-blue-50 border-blue-200 text-blue-800 shadow-blue-100",
    'time-restriction': "bg-orange-50 border-orange-200 text-orange-800 shadow-orange-100",
    'duplicate': "bg-purple-50 border-purple-200 text-purple-800 shadow-purple-100"
  };

  const iconClasses = {
    success: "text-green-500",
    error: "text-red-500",
    warning: "text-yellow-500",
    info: "text-blue-500",
    'time-restriction': "text-orange-500",
    'duplicate': "text-purple-500"
  };

  const buttonClasses = {
    success: "text-green-600 hover:bg-green-100 focus:ring-green-600",
    error: "text-red-600 hover:bg-red-100 focus:ring-red-600",
    warning: "text-yellow-600 hover:bg-yellow-100 focus:ring-yellow-600",
    info: "text-blue-600 hover:bg-blue-100 focus:ring-blue-600",
    'time-restriction': "text-orange-600 hover:bg-orange-100 focus:ring-orange-600",
    'duplicate': "text-purple-600 hover:bg-purple-100 focus:ring-purple-600"
  };

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "rounded-lg border shadow-lg p-4 mb-3 transition-all duration-300 ease-in-out max-w-md",
        typeClasses[type],
        isEntering ? "transform translate-x-full opacity-0" : "transform translate-x-0 opacity-100",
        !isVisible && "transform translate-x-full opacity-0",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn("h-5 w-5", iconClasses[type])} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-semibold mb-1">
              {title}
            </h3>
          )}
          <p className="text-sm leading-relaxed">
            {message}
          </p>
          {children && (
            <div className="mt-2">
              {children}
            </div>
          )}
          {actionButton && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={actionButton.onClick}
                className={cn(
                  "text-xs font-medium px-3 py-1 rounded-md transition-colors",
                  actionButton.variant === 'primary' ? 
                    "bg-white bg-opacity-80 hover:bg-opacity-100" :
                    "bg-transparent hover:bg-white hover:bg-opacity-20"
                )}
              >
                {actionButton.label}
              </button>
            </div>
          )}
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                "inline-flex rounded-md p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
                buttonClasses[type]
              )}
              aria-label="알림 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Progress bar for auto-close */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-white bg-opacity-30 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-white bg-opacity-60"
            style={{
              width: '100%',
              animation: `toast-progress ${duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
}

export default Toast; 