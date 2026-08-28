import { Product, FeaturedCategory } from './index.js';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncOperationState<T = any> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}

export type AsyncAction<T = any> =
  | { type: 'PENDING' }
  | { type: 'SUCCESS'; payload: T }
  | { type: 'ERROR'; payload: string }
  | { type: 'RESET' };

export interface ArrayFieldManager<T> {
  add: (item: T) => void;
  update: (index: number, updates: T) => void;
  remove: (index: number) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
}
