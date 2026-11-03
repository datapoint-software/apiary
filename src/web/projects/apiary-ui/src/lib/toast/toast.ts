export type ToastTone = 'ok' | 'error' | 'info';

export interface ToastAction {
  readonly label: string;
  readonly run: () => void;
}

export interface Toast {
  readonly id: number;
  readonly text: string;
  readonly tone: ToastTone;
  readonly heading?: string;
  readonly action?: ToastAction;
}
