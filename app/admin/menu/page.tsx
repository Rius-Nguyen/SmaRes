"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { INITIAL_MENU_ITEMS, MenuItemData } from '@/app/lib/menuInitialData';
import type { MenuCategory } from '@/app/models/MenuItem';
import {
  VALID_MENU_CATEGORIES,
  isValidMenuImageUrl,
  parseNonNegativePrice,
} from '@/app/lib/menuValidation';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/app/lib/format';

interface MenuApiResponse {
  success?: boolean;
  data?: MenuItemData[];
  message?: string;
}

interface MenuMutationResponse {
  success?: boolean;
  message?: string;
  data?: MenuItemData;
}

interface ToggleAvailabilityResponse {
  success?: boolean;
  message?: string;
  data?: {
    _id?: string;
    name?: string;
    isAvailable?: boolean;
  };
}

interface DishFormState {
  name: string;
  price: string;
  category: MenuCategory;
  imageUrl: string;
  description: string;
  preparationNote: string;
  isAvailable: boolean;
  isPreOrderOnly: boolean;
}

type ValidatedFieldKey = 'name' | 'price' | 'imageUrl' | 'description';

type TouchedFieldMap = Record<ValidatedFieldKey, boolean>;

const INITIAL_TOUCHED_FIELDS: TouchedFieldMap = {
  name: false,
  price: false,
  imageUrl: false,
  description: false,
};

const IMAGE_PRESETS: ReadonlyArray<{ label: string; url: string }> = [
  { label: 'Phở Wagyu', url: '/foods/pho_bo2.jpg' },
  { label: 'Gỏi cuốn', url: '/foods/goi_cuon.jpg' },
  { label: 'Chả giò', url: '/foods/cha_gio.jpg' },
  { label: 'Cá chẽm', url: '/foods/ca_chem_hap.jpg' },
  { label: 'Vịt quay', url: '/foods/vit_quay2.jpg' },
  { label: 'Chè sen', url: '/foods/che_sen.jpg' },
  { label: 'Trà sen', url: '/foods/tra_sen.jpg' },
  { label: 'Vang đỏ', url: '/foods/vang_do.jpg' },
];

const DEFAULT_DISH_IMAGE = '/foods/pho_bo2.jpg';

function createInitialFormState(dish?: MenuItemData | null): DishFormState {
  if (!dish) {
    return {
      name: '',
      price: '95000',
      category: 'Món chính',
      imageUrl: DEFAULT_DISH_IMAGE,
      description: '',
      preparationNote: '',
      isAvailable: true,
      isPreOrderOnly: false,
    };
  }

  return {
    name: dish.name,
    price: String(dish.price),
    category: dish.category,
    imageUrl: dish.imageUrl || DEFAULT_DISH_IMAGE,
    description: dish.description,
    preparationNote: dish.preparationNote ?? '',
    isAvailable: dish.isAvailable !== false,
    isPreOrderOnly: Boolean(dish.isPreOrderOnly),
  };
}

function isUnoptimizedSrc(src: string): boolean {
  return src.startsWith('http://') || src.startsWith('https://');
}

function resolveSafeImageSrc(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (isValidMenuImageUrl(trimmed)) {
    return trimmed;
  }
  return DEFAULT_DISH_IMAGE;
}

function isPointerOutsideDialog(
  event: React.PointerEvent<HTMLDialogElement>,
  dialog: HTMLDialogElement
): boolean {
  const rect = dialog.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
}

function computeDishFieldErrors(formState: DishFormState): Record<ValidatedFieldKey, string> {
  const trimmedName = formState.name.trim();
  const parsedPrice = parseNonNegativePrice(formState.price);
  const trimmedImage = formState.imageUrl.trim();
  const trimmedDesc = formState.description.trim();

  return {
    name: trimmedName ? '' : 'Vui lòng nhập tên món ăn.',
    price:
      parsedPrice !== null
        ? ''
        : 'Giá bán phải là số hợp lệ lớn hơn hoặc bằng 0.',
    imageUrl: !trimmedImage
      ? 'Vui lòng nhập liên kết hình ảnh món ăn.'
      : isValidMenuImageUrl(trimmedImage)
        ? ''
        : 'Liên kết ảnh không hợp lệ (chỉ chấp nhận /... hoặc URL http(s)://...).',
    description: trimmedDesc ? '' : 'Vui lòng nhập mô tả ngắn gọn cho món ăn.',
  };
}

interface FieldErrorMessageProps {
  id: string;
  message: string;
}

function FieldErrorMessage({ id, message }: FieldErrorMessageProps) {
  if (!message) return null;
  return (
    <p
      id={id}
      className="mt-1.5 text-xs font-medium text-rose-700 flex items-center gap-1.5"
    >
      <span role="img" aria-label="Lỗi" className="shrink-0 inline-flex items-center">
        <svg
          className="w-3.5 h-3.5 text-rose-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 8v5" />
          <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span>{message}</span>
    </p>
  );
}

interface MenuDishFormDialogProps {
  editingDish: MenuItemData | null;
  initialFormState: DishFormState;
  serverError: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmitDish: (payload: DishFormState) => Promise<void>;
}

function MenuDishFormDialog({
  editingDish,
  initialFormState,
  serverError,
  isSubmitting,
  onClose,
  onSubmitDish,
}: MenuDishFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef<boolean>(false);
  const closeNotifiedRef = useRef<boolean>(false);

  const titleId = useId();
  const nameInputId = useId();
  const priceInputId = useId();
  const categorySelectId = useId();
  const imageInputId = useId();
  const imageHintId = useId();
  const descriptionInputId = useId();
  const prepNoteInputId = useId();

  const nameErrorId = useId();
  const priceErrorId = useId();
  const imageErrorId = useId();
  const descriptionErrorId = useId();

  const [formState, setFormState] = useState<DishFormState>(initialFormState);
  const [touchedFields, setTouchedFields] = useState<TouchedFieldMap>(INITIAL_TOUCHED_FIELDS);
  const [hasSubmittedOnce, setHasSubmittedOnce] = useState<boolean>(false);

  // Mở native <dialog> top-layer bằng showModal(). Không gọi dialog.close() trong cleanup
  // để tránh React 19 StrictMode double-effect phát sự kiện `close` ngoài ý muốn.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const fieldErrors = useMemo(() => computeDishFieldErrors(formState), [formState]);

  const showErrorFor = (field: ValidatedFieldKey): boolean =>
    (touchedFields[field] || hasSubmittedOnce) && Boolean(fieldErrors[field]);

  const markTouched = (field: ValidatedFieldKey) => {
    setTouchedFields((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const notifyCloseOnce = () => {
    if (isSubmitting || closeNotifiedRef.current) return;
    closeNotifiedRef.current = true;
    onClose();
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmittedOnce(true);

    if (
      fieldErrors.name ||
      fieldErrors.price ||
      fieldErrors.imageUrl ||
      fieldErrors.description
    ) {
      return;
    }

    await onSubmitDish(formState);
  };

  const previewSrc = resolveSafeImageSrc(formState.imageUrl);
  const showNameError = showErrorFor('name');
  const showPriceError = showErrorFor('price');
  const showImageError = showErrorFor('imageUrl');
  const showDescriptionError = showErrorFor('description');

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: isSubmitting ? 'none' : 'any' } as Record<string, string>)}
      onCancel={(e) => {
        if (isSubmitting) {
          e.preventDefault();
        }
      }}
      onClose={notifyCloseOnce}
      onPointerDown={(e) => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        pressedOutsideRef.current = isPointerOutsideDialog(e, dialog);
      }}
      onPointerUp={(e) => {
        const dialog = dialogRef.current;
        if (!dialog || isSubmitting) return;
        if (pressedOutsideRef.current && isPointerOutsideDialog(e, dialog)) {
          notifyCloseOnce();
        }
        pressedOutsideRef.current = false;
      }}
      className="m-auto w-[min(38rem,calc(100vw-2rem))] max-h-[90vh] rounded-3xl border-0 bg-transparent p-0 shadow-2xl backdrop:bg-[#1c1917]/60 backdrop:backdrop-blur-xs"
    >
      <div className="bg-white w-full rounded-3xl border border-[#ebe7df] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scaleUp">
        <div className="px-6 py-4 bg-[#faf8f5] border-b border-[#ebe7df] flex items-center justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-serif font-bold text-[#14532d]">
              {editingDish ? 'Chỉnh Sửa Món Ăn' : 'Thêm Món Mới Vào Thực Đơn'}
            </h2>
            <p className="text-xs text-[#57534e]">
              {editingDish
                ? `Cập nhật thông tin cho "${editingDish.name}"`
                : 'Nhập đầy đủ thông tin để hiển thị ngay trên Menu SmaRes'}
            </p>
          </div>
          <button
            type="button"
            onClick={notifyCloseOnce}
            disabled={isSubmitting}
            aria-label="Đóng hộp thoại"
            className="w-9 h-9 rounded-xl text-[#57534e] hover:text-[#1c1917] hover:bg-[#ebe7df]/70 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleFormSubmit}
          noValidate
          className="smares-validated-form p-6 space-y-4 overflow-y-auto"
        >
          {serverError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
            >
              {serverError}
            </div>
          )}

          <div>
            <label
              htmlFor={nameInputId}
              className="block text-xs font-semibold text-[#1c1917] mb-1.5"
            >
              Tên món ăn *
            </label>
            <input
              id={nameInputId}
              name="name"
              type="text"
              required
              autoFocus
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              onBlur={() => markTouched('name')}
              aria-invalid={showNameError ? 'true' : 'false'}
              aria-describedby={showNameError ? nameErrorId : undefined}
              placeholder="Ví dụ: Bún Chả Hà Nội Đặc Biệt"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-[#d6d0c4] text-[#1c1917]"
            />
            {showNameError && <FieldErrorMessage id={nameErrorId} message={fieldErrors.name} />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={priceInputId}
                className="block text-xs font-semibold text-[#1c1917] mb-1.5"
              >
                Giá bán (VNĐ) *
              </label>
              <input
                id={priceInputId}
                name="price"
                type="number"
                required
                min={0}
                step={1000}
                value={formState.price}
                onChange={(e) => setFormState((prev) => ({ ...prev, price: e.target.value }))}
                onBlur={() => markTouched('price')}
                aria-invalid={showPriceError ? 'true' : 'false'}
                aria-describedby={showPriceError ? priceErrorId : undefined}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-[#d6d0c4] text-[#1c1917]"
              />
              {showPriceError && <FieldErrorMessage id={priceErrorId} message={fieldErrors.price} />}
            </div>

            <div>
              <label
                htmlFor={categorySelectId}
                className="block text-xs font-semibold text-[#1c1917] mb-1.5"
              >
                Danh mục *
              </label>
              <select
                id={categorySelectId}
                name="category"
                value={formState.category}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    category: e.target.value as MenuCategory,
                  }))
                }
                aria-invalid="false"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-[#d6d0c4] text-[#1c1917]"
              >
                {VALID_MENU_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor={imageInputId}
              className="block text-xs font-semibold text-[#1c1917]"
            >
              Đường dẫn hình ảnh *
            </label>
            <p id={imageHintId} className="text-[11px] text-[#78716c] mt-0.5 mb-1.5">
              Chấp nhận ảnh nội bộ (/foods/...) hoặc URL công khai (https://...)
            </p>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#ebe7df] bg-stone-100 shrink-0">
                <Image
                  src={previewSrc}
                  alt="Xem trước ảnh món"
                  fill
                  sizes="48px"
                  unoptimized={isUnoptimizedSrc(previewSrc)}
                  className="object-cover"
                />
              </div>
              <input
                id={imageInputId}
                name="imageUrl"
                type="text"
                required
                value={formState.imageUrl}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, imageUrl: e.target.value }))
                }
                onBlur={() => markTouched('imageUrl')}
                aria-invalid={showImageError ? 'true' : 'false'}
                aria-describedby={showImageError ? `${imageHintId} ${imageErrorId}` : imageHintId}
                placeholder="/foods/pho_bo2.jpg hoặc https://..."
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-[#d6d0c4] text-[#1c1917]"
              />
            </div>
            {showImageError && (
              <FieldErrorMessage id={imageErrorId} message={fieldErrors.imageUrl} />
            )}

            <div className="flex flex-wrap gap-1.5 mt-2">
              {IMAGE_PRESETS.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => {
                    setFormState((prev) => ({ ...prev, imageUrl: preset.url }));
                    markTouched('imageUrl');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    formState.imageUrl === preset.url
                      ? 'bg-[#f0fdf4] text-[#14532d] border-[#bbf7d0]'
                      : 'bg-[#faf8f5] text-[#57534e] border-[#ebe7df] hover:bg-[#f5f2eb]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor={descriptionInputId}
              className="block text-xs font-semibold text-[#1c1917] mb-1.5"
            >
              Mô tả món ăn *
            </label>
            <textarea
              id={descriptionInputId}
              name="description"
              required
              rows={3}
              value={formState.description}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, description: e.target.value }))
              }
              onBlur={() => markTouched('description')}
              aria-invalid={showDescriptionError ? 'true' : 'false'}
              aria-describedby={showDescriptionError ? descriptionErrorId : undefined}
              placeholder="Mô tả hương vị, nguyên liệu nổi bật của món..."
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-[#d6d0c4] text-[#1c1917]"
            />
            {showDescriptionError && (
              <FieldErrorMessage id={descriptionErrorId} message={fieldErrors.description} />
            )}
          </div>

          <div>
            <label
              htmlFor={prepNoteInputId}
              className="block text-xs font-semibold text-[#1c1917] mb-1.5"
            >
              Ghi chú chế biến
            </label>
            <input
              id={prepNoteInputId}
              name="preparationNote"
              type="text"
              value={formState.preparationNote}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, preparationNote: e.target.value }))
              }
              aria-invalid="false"
              placeholder="Ví dụ: Chế biến nóng trong 15 phút"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-[#d6d0c4] text-[#1c1917]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#faf8f5] border border-[#ebe7df] cursor-pointer">
              <input
                type="checkbox"
                checked={formState.isAvailable}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, isAvailable: e.target.checked }))
                }
                className="w-4 h-4 accent-[#14532d]"
              />
              <span className="text-xs font-semibold text-[#1c1917]">
                Đang sẵn sàng phục vụ
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#fffbeb] border border-[#fde68a] cursor-pointer">
              <input
                type="checkbox"
                checked={formState.isPreOrderOnly}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, isPreOrderOnly: e.target.checked }))
                }
                className="w-4 h-4 accent-[#d97706]"
              />
              <span className="text-xs font-semibold text-[#92400e]">
                Món đặc quyền đặt trước
              </span>
            </label>
          </div>

          <div className="pt-3 border-t border-[#ebe7df] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={notifyCloseOnce}
              disabled={isSubmitting}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-white hover:bg-[#f5f2eb] text-[#57534e] border border-[#d6d0c4] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSubmitting
                ? 'Đang lưu...'
                : editingDish
                  ? 'Lưu thay đổi'
                  : 'Tạo món mới'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

interface DeleteDishConfirmDialogProps {
  dish: MenuItemData;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteDishConfirmDialog({
  dish,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteDishConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef<boolean>(false);
  const closeNotifiedRef = useRef<boolean>(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const notifyCancelOnce = () => {
    if (isDeleting || closeNotifiedRef.current) return;
    closeNotifiedRef.current = true;
    onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: isDeleting ? 'none' : 'any' } as Record<string, string>)}
      onCancel={(e) => {
        if (isDeleting) {
          e.preventDefault();
        }
      }}
      onClose={notifyCancelOnce}
      onPointerDown={(e) => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        pressedOutsideRef.current = isPointerOutsideDialog(e, dialog);
      }}
      onPointerUp={(e) => {
        const dialog = dialogRef.current;
        if (!dialog || isDeleting) return;
        if (pressedOutsideRef.current && isPointerOutsideDialog(e, dialog)) {
          notifyCancelOnce();
        }
        pressedOutsideRef.current = false;
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-3xl border-0 bg-transparent p-0 shadow-2xl backdrop:bg-[#1c1917]/60 backdrop:backdrop-blur-xs"
    >
      <div className="bg-white w-full rounded-3xl border border-[#ebe7df] shadow-2xl p-6 space-y-4 animate-scaleUp">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <div>
            <h2 id={titleId} className="text-base font-serif font-bold text-[#1c1917]">
              Xác nhận xóa món ăn
            </h2>
            <p className="text-xs text-[#57534e] mt-1 leading-relaxed">
              Bạn có chắc muốn xóa món{' '}
              <strong className="text-[#1c1917]">{dish.name}</strong> (
              {formatMoney(dish.price)}) khỏi thực đơn không? Thao tác này không thể hoàn tác.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            autoFocus
            onClick={notifyCancelOnce}
            disabled={isDeleting}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-white hover:bg-[#f5f2eb] text-[#57534e] border border-[#d6d0c4] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Giữ lại
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
          >
            {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default function AdminMenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItemData[]>(INITIAL_MENU_ITEMS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Admin CRUD modals
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingDish, setEditingDish] = useState<MenuItemData | null>(null);
  const [formServerError, setFormServerError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [deletingDish, setDeletingDish] = useState<MenuItemData | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const tableCaptionId = useId();
  const { showToast } = useToast();

  // Tải danh sách thực đơn từ API (fetch đường dẫn tương đối /api/menu)
  useEffect(() => {
    let isCancelled = false;

    const loadMenu = async () => {
      try {
        const res = await fetch('/api/menu', { cache: 'no-store' });
        const json = (await res.json()) as MenuApiResponse;
        if (!isCancelled && res.ok && json.success && Array.isArray(json.data)) {
          setMenuItems(json.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải thực đơn:', err);
        if (!isCancelled) {
          showToast(
            'Không thể đồng bộ thực đơn mới nhất từ máy chủ, đang hiển thị dữ liệu mặc định.',
            'warning'
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadMenu();

    return () => {
      isCancelled = true;
    };
  }, [showToast]);

  const openCreateModal = () => {
    setEditingDish(null);
    setFormServerError('');
    setIsFormModalOpen(true);
  };

  const openEditModal = (dish: MenuItemData) => {
    setEditingDish(dish);
    setFormServerError('');
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    if (isSubmitting) return;
    setIsFormModalOpen(false);
    setEditingDish(null);
    setFormServerError('');
  };

  const handleSubmitDish = async (submittedState: DishFormState) => {
    setFormServerError('');

    const trimmedName = submittedState.name.trim();
    const trimmedDesc = submittedState.description.trim();
    const trimmedImage = submittedState.imageUrl.trim();
    const parsedPrice = parseNonNegativePrice(submittedState.price);

    if (!trimmedName || parsedPrice === null || !trimmedDesc || !isValidMenuImageUrl(trimmedImage)) {
      setFormServerError('Thông tin món ăn chưa hợp lệ, vui lòng kiểm tra lại các trường bắt buộc.');
      return;
    }

    setIsSubmitting(true);
    const isEditing = Boolean(editingDish?._id);
    const endpoint = isEditing ? `/api/menu/${editingDish?._id}` : '/api/menu';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          price: parsedPrice,
          category: submittedState.category,
          imageUrl: trimmedImage,
          description: trimmedDesc,
          preparationNote: submittedState.preparationNote.trim(),
          isAvailable: submittedState.isAvailable,
          isPreOrderOnly: submittedState.isPreOrderOnly,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as MenuMutationResponse;

      if (res.status === 401 || res.status === 403) {
        const msg = json.message || 'Bạn cần quyền Quản trị viên (Admin) để chỉnh sửa thực đơn.';
        setFormServerError(msg);
        showToast(msg, 'error');
        return;
      }

      if (!res.ok || !json.success || !json.data) {
        const msg = json.message || 'Không thể lưu thông tin món ăn.';
        setFormServerError(msg);
        showToast(msg, 'error');
        return;
      }

      const savedDish = json.data;
      if (isEditing && editingDish?._id) {
        setMenuItems((prev) =>
          prev.map((item) => (item._id === editingDish._id ? savedDish : item))
        );
        showToast(`Đã cập nhật món "${savedDish.name}".`, 'success');
      } else {
        setMenuItems((prev) => [...prev, savedDish]);
        showToast(`Đã thêm món mới "${savedDish.name}".`, 'success');
      }

      setIsFormModalOpen(false);
      setEditingDish(null);
      setFormServerError('');
    } catch (err) {
      console.error('Lỗi khi lưu món ăn:', err);
      const msg = 'Lỗi kết nối máy chủ khi lưu món ăn.';
      setFormServerError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDish?._id) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/menu/${deletingDish._id}`, {
        method: 'DELETE',
      });
      const json = (await res.json().catch(() => ({}))) as MenuMutationResponse;

      if (res.status === 401 || res.status === 403) {
        showToast(
          json.message || 'Bạn cần quyền Quản trị viên (Admin) để xóa món khỏi thực đơn.',
          'error'
        );
        return;
      }

      if (!res.ok || !json.success) {
        showToast(json.message || 'Không thể xóa món ăn lúc này.', 'error');
        return;
      }

      setMenuItems((prev) => prev.filter((item) => item._id !== deletingDish._id));
      showToast(`Đã xóa món "${deletingDish.name}" khỏi thực đơn.`, 'success');
      setDeletingDish(null);
    } catch (err) {
      console.error('Lỗi khi xóa món ăn:', err);
      showToast('Lỗi kết nối máy chủ khi xóa món ăn.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Công tắc cập nhật isAvailable tức thì (BR-ORD-05)
  const handleToggleAvailability = async (item: MenuItemData) => {
    if (!item._id) return;

    const previousState = item.isAvailable !== false;
    const newState = !previousState;
    setTogglingId(item._id);

    // 1. Optimistic Update ngay lập tức
    setMenuItems((prev) =>
      prev.map((dish) =>
        dish._id === item._id ? { ...dish, isAvailable: newState } : dish
      )
    );

    try {
      const res = await fetch(`/api/menu/${item._id}/toggle-availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newState }),
      });

      const json = (await res.json().catch(() => ({}))) as ToggleAvailabilityResponse;

      if (!res.ok || !json.success) {
        setMenuItems((prev) =>
          prev.map((dish) =>
            dish._id === item._id ? { ...dish, isAvailable: previousState } : dish
          )
        );
        showToast(json.message || 'Không thể cập nhật trạng thái món lúc này.', 'error');
        return;
      }

      const confirmedState =
        typeof json.data?.isAvailable === 'boolean' ? json.data.isAvailable : newState;

      setMenuItems((prev) =>
        prev.map((dish) =>
          dish._id === item._id ? { ...dish, isAvailable: confirmedState } : dish
        )
      );

      showToast(
        `Đã ${confirmedState ? 'BẬT (Còn món)' : 'TẮT (Hết món)'}: "${item.name}"`,
        'success'
      );
    } catch (err) {
      console.error('Lỗi khi gọi API toggle-availability:', err);
      setMenuItems((prev) =>
        prev.map((dish) =>
          dish._id === item._id ? { ...dish, isAvailable: previousState } : dish
        )
      );
      showToast('Mất kết nối máy chủ. Đã hoàn tác trạng thái món ăn.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Thống kê nhanh
  const totalDishes = menuItems.length;
  const availableCount = menuItems.filter((i) => i.isAvailable !== false).length;
  const outOfStockCount = totalDishes - availableCount;

  const categoryCountMap = useMemo(() => {
    const counts: Record<string, number> = { 'Tất cả': menuItems.length };
    for (const cat of VALID_MENU_CATEGORIES) {
      counts[cat] = 0;
    }
    for (const item of menuItems) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesSearch =
        !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery);
      const matchesCategory =
        selectedCategory === 'Tất cả' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  const formDialogKey = editingDish?._id ? `edit-${editingDish._id}` : 'create-new';

  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#1c1917] pb-20">
      {/* Header Quản trị Thực đơn */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#ebe7df] sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-[#14532d] text-white font-serif font-bold flex items-center justify-center text-base shadow-xs hover:bg-[#15803d] transition-colors shrink-0"
              title="Về trang chủ SmaRes"
            >
              S
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-serif font-bold text-[#14532d] leading-tight">
                Quản Lý Thực Đơn &amp; Kho Món (Admin)
              </h1>
              <p className="text-[11px] text-[#57534e]">
                Thêm, chỉnh sửa, xóa món ăn và bật/tắt trạng thái phục vụ 1 chạm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={openCreateModal}
              className="px-3.5 py-2 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Thêm món mới</span>
            </button>

            <Link
              href="/admin/analytics"
              className="px-3 py-2 rounded-xl bg-[#fffbeb] hover:bg-[#fef3c7] text-[#92400e] text-xs font-semibold transition-colors border border-[#fde68a]"
            >
              Thống kê
            </Link>
            <Link
              href="/staff/tables"
              className="px-3 py-2 rounded-xl bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#14532d] text-xs font-semibold transition-colors border border-[#bbf7d0]"
            >
              Sơ đồ bàn
            </Link>
            <Link
              href="/kds"
              className="px-3 py-2 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <svg className="w-4 h-4 text-[#fef3c7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
                <line x1="6" y1="17" x2="18" y2="17" />
              </svg>
              <span>Bếp KDS</span>
            </Link>
            <Link
              href="/staff/orders"
              className="px-3 py-2 rounded-xl bg-[#f5f2eb] hover:bg-[#ebe7df] text-[#1c1917] text-xs font-semibold transition-colors border border-[#d6d0c4]"
            >
              Đơn Staff
            </Link>
            <Link
              href="/"
              className="px-3 py-2 rounded-xl bg-white hover:bg-[#f5f2eb] text-[#57534e] text-xs font-semibold transition-colors border border-[#ebe7df]"
            >
              Trang chủ
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Thanh thống kê nhanh kho món */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)]">
            <p className="text-xs text-[#57534e] font-medium">Tổng thực đơn</p>
            <p className="text-2xl font-serif font-bold text-[#1c1917] mt-1">{totalDishes}</p>
          </div>
          <div className="bg-[#f0fdf4] p-4 rounded-2xl border border-[#bbf7d0] shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#15803d] font-bold">Đang phục vụ</p>
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            </div>
            <p className="text-2xl font-serif font-bold text-[#14532d] mt-1">{availableCount}</p>
          </div>
          <div className="bg-[#fee2e2]/60 p-4 rounded-2xl border border-[#fca5a5] shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#b91c1c] font-bold">Tạm hết món</p>
              <svg className="w-3.5 h-3.5 text-[#b91c1c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-2xl font-serif font-bold text-[#b91c1c] mt-1">{outOfStockCount}</p>
          </div>
        </div>

        {/* Bộ lọc danh mục & tìm kiếm món ăn */}
        <div className="bg-white p-4 rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative w-full lg:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Tìm kiếm món ăn theo tên hoặc mô tả"
                placeholder="Tìm kiếm món ăn theo tên hoặc mô tả..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-[#d6d0c4] focus:bg-white focus:border-[#14532d] focus:ring-2 focus:ring-[#14532d]/20 focus:outline-none transition-all"
              />
              <svg className="w-4 h-4 absolute left-3 top-3 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {['Tất cả', ...VALID_MENU_CATEGORIES].map((cat) => {
                const isActive = selectedCategory === cat;
                const count = categoryCountMap[cat] ?? 0;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#14532d] text-white shadow-xs'
                        : 'text-[#57534e] hover:text-[#1c1917] hover:bg-[#f5f2eb] border border-transparent'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bảng danh sách món ăn & CRUD + Công tắc 1 chạm (BR-ORD-05) */}
        <section className="bg-white rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] overflow-hidden">
          <div className="p-4 border-b border-[#ebe7df] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-serif font-bold text-[#1c1917]">
                Danh sách thực đơn ({filteredItems.length} món)
              </h2>
              {isLoading && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#14532d] bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#14532d] animate-ping" />
                  Đang đồng bộ...
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#57534e] hidden sm:flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                </svg>
                <span>Gạt công tắc để cập nhật trạng thái món ngay lập tức</span>
              </span>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-3 py-1.5 rounded-xl bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#14532d] border border-[#bbf7d0] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Thêm món mới</span>
              </button>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-[#57534e]">
                Không tìm thấy món ăn phù hợp với bộ lọc hiện tại.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Tất cả');
                }}
                className="px-4 py-2 rounded-xl bg-[#14532d] text-white text-xs font-semibold hover:bg-[#0f3d21] transition-colors cursor-pointer"
              >
                Hiển thị tất cả món
              </button>
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-labelledby={tableCaptionId}
              className="admin-menu-table-wrapper focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#14532d]/20"
            >
              <table className="admin-menu-table">
                <caption id={tableCaptionId} className="sr-only">
                  Bảng quản lý danh sách món ăn, giá bán, trạng thái phục vụ và thao tác chỉnh sửa thực đơn SmaRes
                </caption>
                <thead>
                  <tr className="bg-[#faf8f5] border-b border-[#ebe7df] text-[11px] font-bold uppercase tracking-wider text-[#78716c]">
                    <th scope="col" className="py-3 px-4 text-left border-b border-[#ebe7df]">
                      Món ăn
                    </th>
                    <th scope="col" className="py-3 px-4 text-left border-b border-[#ebe7df] whitespace-nowrap">
                      Danh mục
                    </th>
                    <th scope="col" className="py-3 px-4 text-right border-b border-[#ebe7df] whitespace-nowrap">
                      Giá bán
                    </th>
                    <th scope="col" className="py-3 px-4 text-center border-b border-[#ebe7df] whitespace-nowrap">
                      Hiển thị
                    </th>
                    <th scope="col" className="py-3 px-4 text-right border-b border-[#ebe7df] whitespace-nowrap">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebe7df]">
                  {filteredItems.map((dish) => {
                    const isAvailable = dish.isAvailable !== false;
                    const isPending = togglingId === dish._id;
                    const dishImage = resolveSafeImageSrc(dish.imageUrl);
                    const rowSurfaceBg = !isAvailable ? 'bg-[#faf8f5]' : 'bg-white';

                    return (
                      <tr
                        key={dish._id}
                        className={`transition-colors ${
                          !isAvailable
                            ? 'bg-[#faf8f5] opacity-85'
                            : 'bg-white hover:bg-[#faf8f5]/70'
                        }`}
                      >
                        <th
                          scope="row"
                          className={`py-3.5 px-4 border-b border-[#ebe7df] ${rowSurfaceBg}`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#ebe7df] shrink-0 bg-stone-100">
                              <Image
                                src={dishImage}
                                alt={dish.name}
                                fill
                                sizes="48px"
                                unoptimized={isUnoptimizedSrc(dishImage)}
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-serif font-bold text-sm text-[#1c1917] leading-snug">
                                  {dish.name}
                                </span>
                                {dish.isPreOrderOnly && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#fffbeb] text-[#92400e] border border-[#fde68a] inline-flex items-center gap-1">
                                    <svg className="w-2.5 h-2.5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                                    </svg>
                                    <span>Đặt trước</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#57534e] line-clamp-1 mt-0.5 font-normal">
                                {dish.description}
                              </p>
                              {dish.preparationNote && (
                                <p className="text-[11px] text-[#78716c] line-clamp-1 mt-0.5 font-normal">
                                  {dish.preparationNote}
                                </p>
                              )}
                            </div>
                          </div>
                        </th>

                        <td className="py-3.5 px-4 border-b border-[#ebe7df] whitespace-nowrap">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#faf8f5] text-[#57534e] border border-[#ebe7df]">
                            {dish.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 border-b border-[#ebe7df] text-right whitespace-nowrap">
                          <span className="text-sm font-serif font-bold text-[#d97706]">
                            {formatMoney(dish.price)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 border-b border-[#ebe7df] whitespace-nowrap">
                          <div className="flex items-center justify-end lg:justify-center gap-2.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                isAvailable
                                  ? 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]'
                                  : 'bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span>{isAvailable ? 'Còn món' : 'Hết món'}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => void handleToggleAvailability(dish)}
                              disabled={isPending}
                              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#14532d]/30 disabled:opacity-50 ${
                                isAvailable ? 'bg-[#14532d]' : 'bg-stone-300'
                              }`}
                              role="switch"
                              aria-checked={isAvailable}
                              aria-label={`Bật tắt trạng thái hiển thị cho ${dish.name}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  isAvailable ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 border-b border-[#ebe7df] whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(dish)}
                              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#f5f2eb] hover:bg-[#ebe7df] text-[#1c1917] border border-[#d6d0c4] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                              <span>Sửa</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingDish(dish)}
                              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M3 6h18" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              <span>Xóa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Native <dialog> Thêm mới / Chỉnh sửa món ăn */}
      {isFormModalOpen && (
        <MenuDishFormDialog
          key={formDialogKey}
          editingDish={editingDish}
          initialFormState={createInitialFormState(editingDish)}
          serverError={formServerError}
          isSubmitting={isSubmitting}
          onClose={closeFormModal}
          onSubmitDish={handleSubmitDish}
        />
      )}

      {/* Native <dialog> Xác nhận xóa món ăn */}
      {deletingDish && (
        <DeleteDishConfirmDialog
          key={`delete-${deletingDish._id}`}
          dish={deletingDish}
          isDeleting={isDeleting}
          onCancel={() => setDeletingDish(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </main>
  );
}
