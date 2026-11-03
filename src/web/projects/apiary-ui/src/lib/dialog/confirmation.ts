export interface Confirmation {
  readonly heading: string;
  readonly text: string;
  readonly confirm: string;
  readonly busy?: string;
  readonly tone?: 'danger' | 'primary';
  readonly typeToConfirm?: string;
  readonly action: () => Promise<void>;
}
