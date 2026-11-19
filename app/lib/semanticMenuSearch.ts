import type { MenuItemData } from '@/app/lib/menuInitialData';

export interface SemanticDishResult {
  dish: MenuItemData;
  badge_reason?: string;
}

const NEGATED_SPICY_REGEX = /không\s*cay|khong\s*cay|ko\s*cay|ít\s*cay|it\s*cay/;

const SPICY_EMPHASIS_REGEX =
  /(?:^|[^\p{L}])(cay|cay nồng|siêu cay|cay xé|chua cay|sa tế|ớt|ớt hiểm|ớt xiêm|sốt tiêu|tiêu xanh|tiêu đen|nồng đậm)(?:$|[^\p{L}])/u;

function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

function isDishExplicitlySpicy(combinedText: string): boolean {
  const withoutNegations = combinedText.replace(
    /không\s*cay|khong\s*cay|ko\s*cay|ít\s*cay|it\s*cay/g,
    ' '
  );
  const hasExplicitNonSpicy = /không\s*cay|khong\s*cay|ko\s*cay/.test(combinedText);
  return SPICY_EMPHASIS_REGEX.test(withoutNegations) && !hasExplicitNonSpicy;
}

/**
 * Filters menu dishes using negation-first semantic intent matching.
 * Pure TypeScript module with no React dependencies.
 */
export function filterDishesBySemanticIntent(
  menuList: MenuItemData[],
  query: string,
  activeFilterChip: string | null,
  activeCategory: string
): SemanticDishResult[] {
  const rawQuery = (query ?? '').trim();
  const queryNormalized = normalizeText(rawQuery);
  const chipNormalized = normalizeText(activeFilterChip ?? '');

  // Evaluate negation BEFORE positive spicy matching so negated queries never trigger spicy intent.
  const hasNegatedSpicy = NEGATED_SPICY_REGEX.test(queryNormalized);

  const isLightChip =
    chipNormalized.includes('thanh đạm') ||
    chipNormalized.includes('thanh dam') ||
    chipNormalized === 'thanh-dam';
  const isSpicyChip =
    chipNormalized.includes('cay đậm') ||
    chipNormalized.includes('cay nong') ||
    chipNormalized === 'cay-nong';
  const isBestSellerChip =
    chipNormalized.includes('best seller') ||
    chipNormalized.includes('bestseller') ||
    chipNormalized === 'best-seller';
  const isRefreshChip =
    chipNormalized.includes('tráng miệng') ||
    chipNormalized.includes('mát mẻ') ||
    chipNormalized.includes('giai nhiet') ||
    chipNormalized === 'giai-nhiet';

  const hasNonLightChipOverride = isBestSellerChip || isRefreshChip;

  const hasLightQuery =
    queryNormalized.includes('thanh đạm') ||
    queryNormalized.includes('thanh dam') ||
    queryNormalized.includes('ít dầu') ||
    queryNormalized.includes('it dau') ||
    queryNormalized.includes('thanh mát') ||
    queryNormalized.includes('thanh mat') ||
    queryNormalized.includes('nhẹ nhàng') ||
    queryNormalized.includes('healthy') ||
    queryNormalized.includes('chay');

  const isLightHealthyIntent =
    isLightChip || hasLightQuery || (hasNegatedSpicy && !hasNonLightChipOverride);

  const hasSpicyQuery =
    queryNormalized.includes('cay') ||
    queryNormalized.includes('đậm đà') ||
    queryNormalized.includes('dam da') ||
    queryNormalized.includes('nồng') ||
    queryNormalized.includes('chua cay') ||
    queryNormalized.includes('đậm vị') ||
    queryNormalized.includes('sốt tiêu') ||
    queryNormalized.includes('tiêu') ||
    queryNormalized.includes('ớt');

  const isSpicyBoldIntent = hasNegatedSpicy
    ? false
    : isSpicyChip || hasSpicyQuery;

  const isBestSellerIntent =
    isBestSellerChip ||
    queryNormalized.includes('best seller') ||
    queryNormalized.includes('bestseller') ||
    queryNormalized.includes('bán chạy') ||
    queryNormalized.includes('ban chay') ||
    queryNormalized.includes('nổi bật') ||
    queryNormalized.includes('ngon nhất') ||
    queryNormalized.includes('đặc sắc') ||
    queryNormalized.includes('đặc quyền') ||
    queryNormalized.includes('thượng hạng') ||
    queryNormalized.includes('dát vàng') ||
    queryNormalized.includes('signature');

  const isRefreshingDessertIntent =
    isRefreshChip ||
    queryNormalized.includes('giải nhiệt') ||
    queryNormalized.includes('giai nhiet') ||
    queryNormalized.includes('nước ép') ||
    queryNormalized.includes('nuoc ep') ||
    queryNormalized.includes('đồ uống') ||
    queryNormalized.includes('do uong') ||
    queryNormalized.includes('tráng miệng') ||
    queryNormalized.includes('trang mieng') ||
    queryNormalized.includes('mát mẻ') ||
    queryNormalized.includes('mat me') ||
    queryNormalized.includes('chè') ||
    queryNormalized.includes('trà') ||
    queryNormalized.includes('sữa chua') ||
    queryNormalized.includes('bánh');

  const isSemanticFiltering =
    chipNormalized !== '' ||
    isLightHealthyIntent ||
    isSpicyBoldIntent ||
    isBestSellerIntent ||
    isRefreshingDessertIntent;

  return menuList
    .map((dish): { dish: MenuItemData; isMatched: boolean; badgeReason?: string } => {
      const dishNameLower = dish.name.toLowerCase();
      const dishDescLower = dish.description.toLowerCase();
      const dishPrepLower = (dish.preparationNote || '').toLowerCase();
      const combinedText = `${dishNameLower} ${dishDescLower} ${dishPrepLower} ${dish.category.toLowerCase()}`;

      // When user explicitly asks for non-spicy / mild, exclude dishes emphasizing spice.
      if (hasNegatedSpicy && isDishExplicitlySpicy(combinedText)) {
        return { dish, isMatched: false };
      }

      let isMatched = false;
      let badgeReason: string | undefined;

      if (isLightHealthyIntent) {
        const hasNonSpicyMention = /không\s*cay|khong\s*cay|ko\s*cay/.test(combinedText);
        const isLight =
          combinedText.includes('thanh mát') ||
          combinedText.includes('thanh đạm') ||
          combinedText.includes('gỏi cuốn') ||
          combinedText.includes('hoa chuối') ||
          combinedText.includes('hấp') ||
          combinedText.includes('sen') ||
          dish.category === 'Khai vị' ||
          dishNameLower.includes('cá chẽm') ||
          (hasNegatedSpicy && hasNonSpicyMention);

        if (isLight) {
          isMatched = true;
          badgeReason = 'Phù hợp với khẩu vị thanh đạm, thanh nhẹ';
        }
      }

      if (isSpicyBoldIntent) {
        const isSpicy =
          isDishExplicitlySpicy(combinedText) ||
          combinedText.includes('nướng than') ||
          combinedText.includes('món chính') ||
          combinedText.includes('bò') ||
          dishNameLower.includes('bò wagyu') ||
          dishNameLower.includes('heo');

        if (isSpicy) {
          isMatched = true;
          badgeReason = 'Hương vị đậm đà, dậy vị cay nồng chuẩn vị';
        }
      }

      if (isBestSellerIntent) {
        const isPopular =
          Boolean(dish.isPreOrderOnly) ||
          dish.price >= 150000 ||
          combinedText.includes('thượng hạng') ||
          dishNameLower.includes('wagyu') ||
          dishNameLower.includes('nem') ||
          dishNameLower.includes('cá');

        if (isPopular) {
          isMatched = true;
          badgeReason = 'Món bán chạy nhất & được thực khách yêu thích';
        }
      }

      if (isRefreshingDessertIntent) {
        const isRefresh =
          dish.category === 'Đồ uống' ||
          dish.category === 'Tráng miệng' ||
          combinedText.includes('mát') ||
          combinedText.includes('chè') ||
          combinedText.includes('trà') ||
          combinedText.includes('sen');

        if (isRefresh) {
          isMatched = true;
          badgeReason = 'Món ngọt thanh mát giải nhiệt hoàn hảo';
        }
      }

      if (!isSemanticFiltering && queryNormalized !== '') {
        if (combinedText.includes(queryNormalized)) {
          isMatched = true;
          badgeReason = `Khớp từ khóa "${rawQuery}"`;
        }
      }

      if (!isSemanticFiltering && queryNormalized === '') {
        isMatched = true;
      }

      return { dish, isMatched, badgeReason };
    })
    .filter((entry) => {
      if (!entry.isMatched) return false;
      if (activeCategory === 'Tất cả' || activeCategory === '') return true;
      if (activeCategory === 'Món đặc biệt') return Boolean(entry.dish.isPreOrderOnly);
      return entry.dish.category === activeCategory;
    })
    .map((entry) => ({
      dish: entry.dish,
      badge_reason: entry.badgeReason,
    }));
}
