export type SpicyLevelOption = 'NONE' | 'MILD' | 'MEDIUM' | 'HOT';
export type DrinkLevelOption = '0%' | '50%' | '100%';

export interface ItemCustomizations {
  spicyLevel?: SpicyLevelOption;
  iceLevel?: DrinkLevelOption;
  sweetnessLevel?: DrinkLevelOption;
  allergyNotes?: string;
  spicy_level?: SpicyLevelOption;
  ice_level?: DrinkLevelOption;
  sweetness_level?: DrinkLevelOption;
  allergy_notes?: string;
}

export interface CartItem {
  _id: string;
  cartKey: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  isPreOrderOnly?: boolean;
  quantity: number;
  customizations?: ItemCustomizations;
}

export type AddCartItemInput = Omit<CartItem, 'quantity' | 'cartKey'> & {
  cartKey?: string;
};

const VALID_SPICY_LEVELS: ReadonlySet<string> = new Set(['NONE', 'MILD', 'MEDIUM', 'HOT']);

function pickTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalize camelCase or legacy snake_case dish customizations into a deterministic,
 * fixed-key object suitable for canonical `cartKey` serialization.
 */
export function normalizeCustomizations(c?: ItemCustomizations): Record<string, string> {
  const rawSpicy = c ? (c.spicyLevel ?? c.spicy_level) : undefined;
  const rawIce = c ? (c.iceLevel ?? c.ice_level) : undefined;
  const rawSweetness = c ? (c.sweetnessLevel ?? c.sweetness_level) : undefined;
  const rawAllergy = c ? (c.allergyNotes ?? c.allergy_notes) : undefined;

  const spicyCandidate = pickTrimmedString(rawSpicy).toUpperCase();
  const spicyLevel = VALID_SPICY_LEVELS.has(spicyCandidate) ? spicyCandidate : 'NONE';
  const iceLevel = pickTrimmedString(rawIce);
  const sweetnessLevel = pickTrimmedString(rawSweetness);
  const allergyNotes = pickTrimmedString(rawAllergy);

  return {
    spicyLevel,
    iceLevel,
    sweetnessLevel,
    allergyNotes,
  };
}

/**
 * Build a deterministic cart line-item key combining item ID and canonical customizations.
 */
export function buildCartKey(itemId: string, customizations?: ItemCustomizations): string {
  const normalizedId = pickTrimmedString(itemId);
  return `${normalizedId}::${JSON.stringify(normalizeCustomizations(customizations))}`;
}

function sanitizeCustomizationsInput(raw: unknown): ItemCustomizations | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const out: ItemCustomizations = {};
  const copyOptional = (key: keyof ItemCustomizations, value: unknown) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (key === 'spicyLevel' || key === 'spicy_level') {
        const upper = trimmed.toUpperCase();
        if (VALID_SPICY_LEVELS.has(upper)) {
          out[key] = upper as SpicyLevelOption;
        }
      } else if (
        key === 'iceLevel' ||
        key === 'ice_level' ||
        key === 'sweetnessLevel' ||
        key === 'sweetness_level'
      ) {
        if (trimmed === '0%' || trimmed === '50%' || trimmed === '100%') {
          out[key] = trimmed;
        }
      } else {
        out[key] = trimmed;
      }
    }
  };

  copyOptional('spicyLevel', raw.spicyLevel);
  copyOptional('iceLevel', raw.iceLevel);
  copyOptional('sweetnessLevel', raw.sweetnessLevel);
  copyOptional('allergyNotes', raw.allergyNotes);
  copyOptional('spicy_level', raw.spicy_level);
  copyOptional('ice_level', raw.ice_level);
  copyOptional('sweetness_level', raw.sweetness_level);
  copyOptional('allergy_notes', raw.allergy_notes);

  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Hydrate and migrate persisted cart items (including legacy localStorage entries without `cartKey`),
 * discarding corrupt records and merging equivalent variants.
 */
export function migrateCartItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const migrated: CartItem[] = [];
  const keyToIndex = new Map<string, number>();

  for (const rawItem of items) {
    if (!isRecord(rawItem)) {
      continue;
    }

    const id = pickTrimmedString(rawItem._id);
    const name = pickTrimmedString(rawItem.name);
    if (!id || !name) {
      continue;
    }

    const rawQty = Number(rawItem.quantity);
    const quantity = Number.isFinite(rawQty) ? Math.floor(rawQty) : 0;
    if (quantity <= 0) {
      continue;
    }

    const rawPrice = Number(rawItem.price);
    const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0;

    const imageUrl = pickTrimmedString(rawItem.imageUrl);
    const category = pickTrimmedString(rawItem.category);
    const customizations = sanitizeCustomizationsInput(rawItem.customizations);
    const rawKey = pickTrimmedString(rawItem.cartKey);
    const cartKey =
      !customizations && rawKey.startsWith(`${id}::`)
        ? rawKey
        : buildCartKey(id, customizations);

    const existingIndex = keyToIndex.get(cartKey);
    if (existingIndex !== undefined) {
      const existing = migrated[existingIndex];
      migrated[existingIndex] = {
        ...existing,
        quantity: existing.quantity + quantity,
      };
      continue;
    }

    const nextItem: CartItem = {
      _id: id,
      cartKey,
      name,
      price,
      imageUrl,
      category,
      quantity,
    };

    if (typeof rawItem.isPreOrderOnly === 'boolean') {
      nextItem.isPreOrderOnly = rawItem.isPreOrderOnly;
    }
    if (customizations) {
      nextItem.customizations = customizations;
    }

    keyToIndex.set(cartKey, migrated.length);
    migrated.push(nextItem);
  }

  return migrated;
}

/**
 * Add an item variant to a cart list, incrementing quantity when an identical `cartKey` exists.
 */
export function addItemToCartList(
  list: readonly CartItem[],
  item: AddCartItemInput,
  qty: number = 1
): CartItem[] {
  const addQty = Number.isFinite(qty) ? Math.floor(qty) : 0;
  if (addQty <= 0) {
    return [...list];
  }

  const explicitKey = pickTrimmedString(item.cartKey);
  const cartKey = explicitKey || buildCartKey(item._id, item.customizations);
  const existingIndex = list.findIndex((entry) => entry.cartKey === cartKey);

  if (existingIndex > -1) {
    const next = [...list];
    const current = next[existingIndex];
    next[existingIndex] = {
      ...current,
      quantity: current.quantity + addQty,
    };
    return next;
  }

  const nextItem: CartItem = {
    _id: item._id,
    cartKey,
    name: item.name,
    price: item.price,
    imageUrl: item.imageUrl,
    category: item.category,
    quantity: addQty,
  };

  if (item.isPreOrderOnly !== undefined) {
    nextItem.isPreOrderOnly = item.isPreOrderOnly;
  }
  if (item.customizations !== undefined) {
    nextItem.customizations = item.customizations;
  }

  return [...list, nextItem];
}

/**
 * Remove an item by exact `cartKey` (when containing `'::'`) or by legacy `_id`.
 */
export function removeItemFromCartList(
  list: readonly CartItem[],
  cartKeyOrId: string
): CartItem[] {
  const target = pickTrimmedString(cartKeyOrId);
  if (!target) {
    return [...list];
  }

  if (target.includes('::')) {
    return list.filter((item) => item.cartKey !== target);
  }

  return list.filter((item) => item.cartKey !== target && item._id !== target);
}

/**
 * Update quantity for a specific variant (`cartKey` containing `'::'`) or legacy `_id`.
 * Removes the matching entry when `qty <= 0`.
 */
export function updateItemQuantityInCartList(
  list: readonly CartItem[],
  cartKeyOrId: string,
  qty: number
): CartItem[] {
  if (!Number.isFinite(qty)) {
    return [...list];
  }

  const nextQty = Math.floor(qty);
  if (nextQty <= 0) {
    return removeItemFromCartList(list, cartKeyOrId);
  }

  const target = pickTrimmedString(cartKeyOrId);
  if (!target) {
    return [...list];
  }

  if (target.includes('::')) {
    return list.map((item) =>
      item.cartKey === target ? { ...item, quantity: nextQty } : item
    );
  }

  return list.map((item) =>
    item.cartKey === target || item._id === target
      ? { ...item, quantity: nextQty }
      : item
  );
}
