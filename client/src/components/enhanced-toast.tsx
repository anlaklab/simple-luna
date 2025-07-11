/**
 * Enhanced Toast System
 * 🎯 RESPONSIBILITY: Advanced notification system with actions and persistence
 * 📋 SCOPE: Success, error, warning, info notifications with custom actions
 * ⚡ FEATURES: Action buttons, persistence, grouping, auto-dismiss
 */

import React from 'react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X, 
  ExternalLink,
  RotateCcw,
  Download,
  Eye,
  Settings,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  icon?: React.ReactNode;
  external?: boolean;
}

export interface EnhancedToastOptions {
  type?: ToastType;
  title: string;
  description?: string;
  duration?: number;
  persistent?: boolean;
  actions?: ToastAction[];
  data?: any;
  groupId?: string;
  showProgress?: boolean;
  variant?: 'default' | 'destructive';
}

const getToastIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'info':
      return <Info className="w-5 h-5 text-blue-500" />;
    case 'loading':
      return <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />;
    default:
      return null;
  }
};

const getToastVariant = (type: ToastType): 'default' | 'destructive' => {
  return type === 'error' ? 'destructive' : 'default';
};

export class EnhancedToastManager {
  private activeToasts = new Map<string, any>();
  private groupedToasts = new Map<string, string[]>();

  showToast(options: EnhancedToastOptions) {
    const {
      type = 'info',
      title,
      description,
      duration,
      persistent = false,
      actions = [],
      data,
      groupId,
      showProgress = false,
      variant,
    } = options;

    const toastId = Math.random().toString(36).substr(2, 9);
    const icon = getToastIcon(type);
    const toastVariant = variant || getToastVariant(type);

    // Handle grouping
    if (groupId) {
      this.handleGroupedToast(groupId, toastId, title);
    }

    const toastData = {
      id: toastId,
      title: title, // Changed to string instead of JSX element
      description: description && (
        <div className="mt-1">
          <div className="flex items-center space-x-2 mb-2">
            {icon}
            <span className="text-sm text-muted-foreground">{description}</span>
            {groupId && this.getGroupBadge(groupId)}
          </div>
          {actions.length > 0 && (
            <div className="flex items-center space-x-2 mt-3">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.variant || 'outline'}
                  onClick={() => {
                    action.action();
                    if (!persistent) {
                      this.dismissToast(toastId);
                    }
                  }}
                  className="h-7 text-xs"
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {action.label}
                  {action.external && <ExternalLink className="w-3 h-3 ml-1" />}
                </Button>
              ))}
            </div>
          )}
          {showProgress && (
            <div className="mt-2">
              <div className="w-full bg-muted rounded-full h-1">
                <div className="bg-primary h-1 rounded-full transition-all duration-1000" 
                     style={{ width: '0%' }} 
                />
              </div>
            </div>
          )}
        </div>
      ),
      variant: toastVariant,
      duration: persistent ? Infinity : (duration || 5000),
    };

    this.activeToasts.set(toastId, toastData);
    
    toast(toastData);

    return toastId;
  }

  private handleGroupedToast(groupId: string, toastId: string, title: string) {
    if (!this.groupedToasts.has(groupId)) {
      this.groupedToasts.set(groupId, []);
    }
    
    const group = this.groupedToasts.get(groupId)!;
    group.push(toastId);
    
    // Dismiss older toasts in the same group if there are too many
    if (group.length > 3) {
      const oldToastId = group.shift()!;
      this.dismissToast(oldToastId);
    }
  }

  private getGroupBadge(groupId: string) {
    const group = this.groupedToasts.get(groupId);
    if (!group || group.length <= 1) return null;
    
    return (
      <Badge variant="secondary" className="text-xs">
        {group.length}
      </Badge>
    );
  }

  dismissToast(toastId: string) {
    this.activeToasts.delete(toastId);
    // The actual toast dismissal is handled by the shadcn toast system
  }

  dismissGroup(groupId: string) {
    const group = this.groupedToasts.get(groupId);
    if (group) {
      group.forEach(toastId => this.dismissToast(toastId));
      this.groupedToasts.delete(groupId);
    }
  }

  dismissAll() {
    this.activeToasts.clear();
    this.groupedToasts.clear();
  }

  updateToast(toastId: string, updates: Partial<EnhancedToastOptions>) {
    const existingToast = this.activeToasts.get(toastId);
    if (existingToast) {
      // Update the toast content
      this.dismissToast(toastId);
      this.showToast({ ...existingToast, ...updates });
    }
  }
}

// Global instance
export const enhancedToast = new EnhancedToastManager();

// Convenient methods
export const showSuccessToast = (
  title: string, 
  options?: Omit<EnhancedToastOptions, 'type' | 'title'>
) => {
  return enhancedToast.showToast({ type: 'success', title, ...options });
};

export const showErrorToast = (
  title: string, 
  options?: Omit<EnhancedToastOptions, 'type' | 'title'>
) => {
  return enhancedToast.showToast({ type: 'error', title, ...options });
};

export const showWarningToast = (
  title: string, 
  options?: Omit<EnhancedToastOptions, 'type' | 'title'>
) => {
  return enhancedToast.showToast({ type: 'warning', title, ...options });
};

export const showInfoToast = (
  title: string, 
  options?: Omit<EnhancedToastOptions, 'type' | 'title'>
) => {
  return enhancedToast.showToast({ type: 'info', title, ...options });
};

export const showLoadingToast = (
  title: string, 
  options?: Omit<EnhancedToastOptions, 'type' | 'title'>
) => {
  return enhancedToast.showToast({ 
    type: 'loading', 
    title, 
    persistent: true,
    ...options 
  });
};

// Specific use case helpers
export const showOperationToast = {
  start: (operation: string, options?: { groupId?: string }) => {
    return showLoadingToast(`${operation}...`, {
      description: 'This may take a few moments',
      groupId: options?.groupId || operation.toLowerCase(),
    });
  },

  success: (operation: string, options?: { 
    actions?: ToastAction[]; 
    groupId?: string;
    data?: any;
  }) => {
    return showSuccessToast(`${operation} completed`, {
      description: 'Operation finished successfully',
      actions: options?.actions,
      groupId: options?.groupId || operation.toLowerCase(),
      data: options?.data,
    });
  },

  error: (operation: string, error: string, options?: { 
    retry?: () => void; 
    groupId?: string;
  }) => {
    const actions: ToastAction[] = [];
    
    if (options?.retry) {
      actions.push({
        label: 'Retry',
        action: options.retry,
        icon: <RotateCcw className="w-3 h-3" />,
        variant: 'outline',
      });
    }

    return showErrorToast(`${operation} failed`, {
      description: error,
      actions,
      persistent: true,
      groupId: options?.groupId || operation.toLowerCase(),
    });
  },
};

// File operation helpers
export const showFileToast = {
  uploading: (filename: string, progress?: number) => {
    return showLoadingToast('Uploading file', {
      description: `${filename} • ${progress ? `${progress}%` : 'Processing...'}`,
      groupId: 'file-upload',
      showProgress: true,
    });
  },

  uploaded: (filename: string, options?: { 
    viewAction?: () => void; 
    downloadAction?: () => void;
  }) => {
    const actions: ToastAction[] = [];
    
    if (options?.viewAction) {
      actions.push({
        label: 'View',
        action: options.viewAction,
        icon: <Eye className="w-3 h-3" />,
      });
    }
    
    if (options?.downloadAction) {
      actions.push({
        label: 'Download',
        action: options.downloadAction,
        icon: <Download className="w-3 h-3" />,
        variant: 'outline',
      });
    }

    return showSuccessToast('Upload completed', {
      description: `${filename} has been uploaded successfully`,
      actions,
      groupId: 'file-upload',
    });
  },

  uploadError: (filename: string, error: string, retry?: () => void) => {
    return showOperationToast.error('Upload', `${filename}: ${error}`, {
      retry,
      groupId: 'file-upload',
    });
  },
};

// Hook for React components
export const useEnhancedToast = () => {
  return {
    showToast: enhancedToast.showToast.bind(enhancedToast),
    showSuccess: showSuccessToast,
    showError: showErrorToast,
    showWarning: showWarningToast,
    showInfo: showInfoToast,
    showLoading: showLoadingToast,
    operation: showOperationToast,
    file: showFileToast,
    dismiss: enhancedToast.dismissToast.bind(enhancedToast),
    dismissGroup: enhancedToast.dismissGroup.bind(enhancedToast),
    dismissAll: enhancedToast.dismissAll.bind(enhancedToast),
    update: enhancedToast.updateToast.bind(enhancedToast),
  };
};

export default enhancedToast; 