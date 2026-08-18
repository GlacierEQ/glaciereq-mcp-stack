export type RecoveryResult<T> = {
  provider: string;
  operation: string;
  data?: T;
  status: 'observed' | 'blocked' | 'unverified';
  receiptId: string;
};

export function observed<T>(provider: string, operation: string, data: T, receiptId: string): RecoveryResult<T> {
  return { provider, operation, data, status: 'observed', receiptId };
}
