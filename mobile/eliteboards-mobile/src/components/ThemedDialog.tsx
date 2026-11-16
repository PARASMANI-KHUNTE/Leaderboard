import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

export type DialogType = 'info' | 'warning' | 'danger' | 'success';

export interface DialogOptions {
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface DialogContextValue {
  showDialog: (options: DialogOptions) => void;
  showAlert: (title: string, message: string, type?: DialogType) => void;
  showConfirm: (
    title: string, 
    message: string, 
    onConfirm: () => void | Promise<void>, 
    options?: Partial<DialogOptions>
  ) => void;
  hideDialog: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function ThemedDialogProvider({ children }: { children: ReactNode }) {
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const [busy, setBusy] = useState(false);

  const showDialog = (opts: DialogOptions) => {
    setOptions(opts);
    setVisible(true);
    setBusy(false);
  };

  const hideDialog = () => {
    setVisible(false);
    setOptions(null);
    setBusy(false);
  };

  const showAlert = (title: string, message: string, type: DialogType = 'info') => {
    showDialog({
      title,
      message,
      type,
      confirmText: 'OK',
      showCancel: false,
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    extraOpts?: Partial<DialogOptions>
  ) => {
    showDialog({
      title,
      message,
      type: extraOpts?.type || 'warning',
      confirmText: extraOpts?.confirmText || 'Confirm',
      cancelText: extraOpts?.cancelText || 'Cancel',
      showCancel: true,
      onConfirm,
      ...extraOpts,
    });
  };

  const handleConfirm = async () => {
    if (options?.onConfirm) {
      try {
        setBusy(true);
        await options.onConfirm();
      } catch (e) {
        console.warn('Dialog confirm action error', e);
      } finally {
        setBusy(false);
      }
    }
    hideDialog();
  };

  const handleCancel = () => {
    if (options?.onCancel) {
      options.onCancel();
    }
    hideDialog();
  };

  const contextValue = useMemo(
    () => ({ showDialog, showAlert, showConfirm, hideDialog }),
    []
  );

  const dialogType = options?.type || 'info';

  const iconName = useMemo(() => {
    switch (dialogType) {
      case 'danger':
        return 'trash-outline';
      case 'warning':
        return 'alert-circle-outline';
      case 'success':
        return 'checkmark-circle-outline';
      default:
        return 'information-circle-outline';
    }
  }, [dialogType]);

  const iconColor = useMemo(() => {
    switch (dialogType) {
      case 'danger':
        return colors.danger;
      case 'warning':
        return colors.warning;
      case 'success':
        return colors.success;
      default:
        return colors.primaryLight;
    }
  }, [dialogType, colors]);

  const iconBg = useMemo(() => {
    switch (dialogType) {
      case 'danger':
        return colors.dangerBg;
      case 'warning':
        return colors.warningBg;
      case 'success':
        return colors.successBg;
      default:
        return isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.1)';
    }
  }, [dialogType, colors, isDark]);

  const confirmBtnBg = useMemo(() => {
    switch (dialogType) {
      case 'danger':
        return colors.danger;
      case 'warning':
        return colors.warning;
      case 'success':
        return colors.success;
      default:
        return colors.primary;
    }
  }, [dialogType, colors]);

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.backdrop}>
          <Pressable style={styles.scrim} onPress={handleCancel} />
          <View
            style={[
              styles.dialogCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Icon Header */}
            <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
              <Ionicons name={iconName} size={28} color={iconColor} />
            </View>

            {/* Title & Message */}
            <Text style={[styles.title, { color: colors.text }]}>{options?.title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {options?.message}
            </Text>

            {/* Actions */}
            <View style={styles.actionsRow}>
              {options?.showCancel && (
                <Pressable
                  style={[
                    styles.btn,
                    styles.cancelBtn,
                    { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' },
                  ]}
                  onPress={handleCancel}
                  disabled={busy}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                    {options?.cancelText || 'Cancel'}
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={[
                  styles.btn,
                  styles.confirmBtn,
                  { backgroundColor: confirmBtnBg, flex: options?.showCancel ? 1 : undefined, width: options?.showCancel ? undefined : '100%' },
                ]}
                onPress={handleConfirm}
                disabled={busy}
              >
                <Text style={styles.confirmBtnText}>
                  {busy ? 'Processing...' : options?.confirmText || 'OK'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useThemedDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useThemedDialog must be used within ThemedDialogProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogCard: {
    width: Math.min(width - 48, 360),
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 24,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  confirmBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
