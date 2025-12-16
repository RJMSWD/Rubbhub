import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ConfirmState {
  isOpen: boolean;
  message: string;
  resolve: ((value: boolean) => void) | null;
}

interface ConfirmContextType {
  confirm: (message: string) => Promise<boolean>;
  state: ConfirmState;
  handleConfirm: () => void;
  handleCancel: () => void;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    message: '',
    resolve: null
  });

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        message,
        resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ isOpen: false, message: '', resolve: null });
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState({ isOpen: false, message: '', resolve: null });
  }, [state.resolve]);

  return (
    <ConfirmContext.Provider value={{ confirm, state, handleConfirm, handleCancel }}>
      {children}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
