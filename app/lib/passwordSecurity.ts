export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_DURATION_MS = 10 * 60 * 1000; // 10 phút

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Kiểm tra mật khẩu đăng ký: tối thiểu 8 ký tự, có chữ hoa, chữ thường và chữ số.
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (typeof password !== 'string' || password.length < 8) {
    return {
      valid: false,
      message: 'Mật khẩu phải có tối thiểu 8 ký tự.',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.',
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Mật khẩu phải chứa ít nhất 1 chữ cái viết thường.',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Mật khẩu phải chứa ít nhất 1 chữ số.',
    };
  }

  return { valid: true };
}

export function isAccountLocked(lockUntil?: Date | null, now: Date = new Date()): boolean {
  if (!lockUntil) {
    return false;
  }
  return new Date(lockUntil).getTime() > now.getTime();
}

export function getRemainingLockMinutes(lockUntil: Date, now: Date = new Date()): number {
  const remainingMs = new Date(lockUntil).getTime() - now.getTime();
  return Math.max(1, Math.ceil(remainingMs / 60000));
}