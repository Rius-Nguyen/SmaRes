import type { MenuCategory } from '@/app/models/MenuItem';

export const VALID_MENU_CATEGORIES: readonly MenuCategory[] = [
  'Khai vị',
  'Món chính',
  'Đồ uống',
  'Tráng miệng',
] as const;

export interface ValidatedCreateMenuInput {
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: MenuCategory;
  isAvailable: boolean;
  isPreOrderOnly: boolean;
  preparationNote: string;
}

export type ValidatedUpdateMenuInput = Partial<ValidatedCreateMenuInput>;

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UPDATABLE_MENU_KEYS: readonly string[] = [
  'name',
  'price',
  'description',
  'imageUrl',
  'category',
  'isAvailable',
  'isPreOrderOnly',
  'preparationNote',
];

export function isMenuCategory(value: string): value is MenuCategory {
  return (VALID_MENU_CATEGORIES as readonly string[]).includes(value);
}

export function parseNonNegativePrice(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? raw : null;
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw.trim());
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  return null;
}

export function isValidMenuImageUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return false;
  }

  // Cho phép đường dẫn tương đối nội bộ (/foods/...), từ chối protocol-relative (//...)
  if (trimmed.startsWith('/')) {
    return !trimmed.startsWith('//') && trimmed.length > 1;
  }

  // Cho phép URL http(s) hợp lệ có hostname rõ ràng; từ chối javascript:, vbscript:, data:text/html, v.v.
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        Boolean(parsed.hostname)
      );
    } catch {
      return false;
    }
  }

  return false;
}

export function validateCreateMenuPayload(
  rawBody: unknown
): ValidationResult<ValidatedCreateMenuInput> {
  if (typeof rawBody !== 'object' || rawBody === null || Array.isArray(rawBody)) {
    return { ok: false, message: 'Dữ liệu món ăn không hợp lệ.' };
  }

  const body = rawBody as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const price = parseNonNegativePrice(body.price);
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  const rawCategory = typeof body.category === 'string' ? body.category.trim() : '';

  if (!name) {
    return { ok: false, message: 'Vui lòng nhập tên món ăn.' };
  }

  if (price === null) {
    return {
      ok: false,
      message: 'Giá món ăn phải là số hợp lệ lớn hơn hoặc bằng 0.',
    };
  }

  if (!description) {
    return { ok: false, message: 'Vui lòng nhập mô tả món ăn.' };
  }

  if (!imageUrl) {
    return {
      ok: false,
      message: 'Vui lòng cung cấp đường dẫn hình ảnh món ăn.',
    };
  }

  if (!isValidMenuImageUrl(imageUrl)) {
    return {
      ok: false,
      message:
        'Đường dẫn hình ảnh không hợp lệ (chỉ chấp nhận /... hoặc URL http(s):// hợp lệ).',
    };
  }

  if (!rawCategory || !isMenuCategory(rawCategory)) {
    return {
      ok: false,
      message:
        'Danh mục món ăn không hợp lệ (Khai vị, Món chính, Đồ uống, Tráng miệng).',
    };
  }

  if (body.isAvailable !== undefined && typeof body.isAvailable !== 'boolean') {
    return {
      ok: false,
      message: 'Trạng thái phục vụ (isAvailable) phải là giá trị boolean.',
    };
  }

  if (body.isPreOrderOnly !== undefined && typeof body.isPreOrderOnly !== 'boolean') {
    return {
      ok: false,
      message: 'Cờ đặt trước (isPreOrderOnly) phải là giá trị boolean.',
    };
  }

  if (body.preparationNote !== undefined && typeof body.preparationNote !== 'string') {
    return {
      ok: false,
      message: 'Ghi chú chế biến (preparationNote) phải là chuỗi ký tự.',
    };
  }

  return {
    ok: true,
    data: {
      name,
      price,
      description,
      imageUrl,
      category: rawCategory,
      isAvailable: typeof body.isAvailable === 'boolean' ? body.isAvailable : true,
      isPreOrderOnly: typeof body.isPreOrderOnly === 'boolean' ? body.isPreOrderOnly : false,
      preparationNote: typeof body.preparationNote === 'string' ? body.preparationNote.trim() : '',
    },
  };
}

export function validateUpdateMenuPayload(
  rawBody: unknown
): ValidationResult<ValidatedUpdateMenuInput> {
  if (typeof rawBody !== 'object' || rawBody === null || Array.isArray(rawBody)) {
    return { ok: false, message: 'Dữ liệu cập nhật món ăn không hợp lệ.' };
  }

  const body = rawBody as Record<string, unknown>;
  const hasUpdatableField = UPDATABLE_MENU_KEYS.some((key) => body[key] !== undefined);
  if (!hasUpdatableField) {
    return {
      ok: false,
      message: 'Không có trường dữ liệu hợp lệ để cập nhật.',
    };
  }

  const updates: ValidatedUpdateMenuInput = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return { ok: false, message: 'Tên món ăn không được để trống.' };
    }
    updates.name = name;
  }

  if (body.price !== undefined) {
    const price = parseNonNegativePrice(body.price);
    if (price === null) {
      return {
        ok: false,
        message: 'Giá món ăn phải là số hợp lệ lớn hơn hoặc bằng 0.',
      };
    }
    updates.price = price;
  }

  if (body.description !== undefined) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description) {
      return { ok: false, message: 'Mô tả món ăn không được để trống.' };
    }
    updates.description = description;
  }

  if (body.imageUrl !== undefined) {
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    if (!imageUrl) {
      return { ok: false, message: 'Đường dẫn hình ảnh không được để trống.' };
    }
    if (!isValidMenuImageUrl(imageUrl)) {
      return {
        ok: false,
        message:
          'Đường dẫn hình ảnh không hợp lệ (chỉ chấp nhận /... hoặc URL http(s):// hợp lệ).',
      };
    }
    updates.imageUrl = imageUrl;
  }

  if (body.category !== undefined) {
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    if (!category || !isMenuCategory(category)) {
      return {
        ok: false,
        message:
          'Danh mục món ăn không hợp lệ (Khai vị, Món chính, Đồ uống, Tráng miệng).',
      };
    }
    updates.category = category;
  }

  if (body.isAvailable !== undefined) {
    if (typeof body.isAvailable !== 'boolean') {
      return {
        ok: false,
        message: 'Trạng thái phục vụ (isAvailable) phải là giá trị boolean.',
      };
    }
    updates.isAvailable = body.isAvailable;
  }

  if (body.isPreOrderOnly !== undefined) {
    if (typeof body.isPreOrderOnly !== 'boolean') {
      return {
        ok: false,
        message: 'Cờ đặt trước (isPreOrderOnly) phải là giá trị boolean.',
      };
    }
    updates.isPreOrderOnly = body.isPreOrderOnly;
  }

  if (body.preparationNote !== undefined) {
    if (typeof body.preparationNote !== 'string') {
      return {
        ok: false,
        message: 'Ghi chú chế biến (preparationNote) phải là chuỗi ký tự.',
      };
    }
    updates.preparationNote = body.preparationNote.trim();
  }

  return { ok: true, data: updates };
}
