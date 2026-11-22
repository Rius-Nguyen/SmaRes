import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn<() => Promise<void>>(),
  menuItemFindById: vi.fn(),
  tableFindById: vi.fn(),
  tableFindOne: vi.fn(),
  reservationFindById: vi.fn(),
  orderFind: vi.fn(),
  orderFindById: vi.fn(),
  orderFindOne: vi.fn(),
  orderCreate: vi.fn(),
}));

vi.mock('@/app/lib/db', () => ({
  default: mocks.connectDB,
  connectDB: mocks.connectDB,
}));

vi.mock('@/app/models/MenuItem', () => ({
  default: {
    findById: mocks.menuItemFindById,
  },
}));

vi.mock('@/app/models/Table', () => ({
  default: {
    findById: mocks.tableFindById,
    findOne: mocks.tableFindOne,
  },
}));

vi.mock('@/app/models/Reservation', () => ({
  default: {
    findById: mocks.reservationFindById,
  },
}));

vi.mock('@/app/models/Order', () => ({
  OrderStatus: {
    PENDING: 'PENDING',
    COOKING: 'COOKING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  } as const,
  SpicyLevel: {
    NONE: 'NONE',
    MILD: 'MILD',
    MEDIUM: 'MEDIUM',
    HOT: 'HOT',
  } as const,
  DrinkLevel: {
    ZERO: '0%',
    HALF: '50%',
    FULL: '100%',
  } as const,
  default: {
    find: mocks.orderFind,
    findById: mocks.orderFindById,
    findOne: mocks.orderFindOne,
    create: mocks.orderCreate,
  },
}));

vi.mock('@/app/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/app/lib/auth')>('@/app/lib/auth');
  return {
    ...actual,
    getAuthUser: vi.fn(actual.getAuthUser),
    requireAuth: vi.fn(actual.requireAuth),
    requireRole: vi.fn(actual.requireRole),
  };
});

vi.mock('@/app/lib/realtimeBus', async () => {
  const actual = await vi.importActual<typeof import('@/app/lib/realtimeBus')>(
    '@/app/lib/realtimeBus'
  );
  return {
    ...actual,
    emitRealtimeEvent: vi.fn(actual.emitRealtimeEvent),
  };
});

import { POST, PATCH } from '@/app/api/orders/route';
import { signAuthToken, requireRole } from '@/app/lib/auth';
import { emitRealtimeEvent, REALTIME_EVENT_TYPES } from '@/app/lib/realtimeBus';

const PHO_ID = '6717a01a1e0011a100000004';
const TEA_ID = '6717a01a1e0011a100000010';
const SOLDOUT_ID = '6717a01a1e0011a100000007';
const TABLE_ID = '6717a01a1e0011a100000101';
const ORDER_ID = '6717a01a1e0011a100000401';

function mockMenuLookup(records: Record<string, unknown>) {
  mocks.menuItemFindById.mockImplementation((id: string) => ({
    lean: vi.fn().mockResolvedValue(records[id] ?? null),
  }));
}

function mockTableLookup(tableDoc: unknown) {
  const lean = vi.fn().mockResolvedValue(tableDoc);
  const select = vi.fn().mockReturnValue({ lean });
  mocks.tableFindOne.mockReturnValue({ select });
  mocks.tableFindById.mockReturnValue({ select });
}

describe('Orders API server-side pricing, availability, SSE & RBAC', () => {
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'vitest-smares-secret-key';
    mocks.connectDB.mockResolvedValue(undefined);
    mockTableLookup({ _id: TABLE_ID, tableNumber: 'B04' });
  });

  afterEach(() => {
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  it('POST /api/orders recalculates prices strictly from MenuItem DB and ignores client-tampered prices & totals', async () => {
    mockMenuLookup({
      [PHO_ID]: {
        _id: PHO_ID,
        name: 'Phở Bò Wagyu A5',
        price: 380000,
        isAvailable: true,
      },
      [TEA_ID]: {
        _id: TEA_ID,
        name: 'Trà Sen Vàng',
        price: 55000,
        isAvailable: true,
      },
    });

    interface CreatedOrderPayload {
      orderCode: string;
      tableNumber: string;
      items: Array<{ menuItemId: string; name: string; price: number; quantity: number }>;
      totalAmount: number;
      status: string;
    }

    mocks.orderCreate.mockImplementation(async (payload: CreatedOrderPayload) => ({
      _id: ORDER_ID,
      ...payload,
    }));

    const request = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        tableNumber: 'b04',
        orderCode: 'ord-tamper-01',
        totalAmount: 1,
        totalPrice: 2,
        items: [
          {
            menuItemId: PHO_ID,
            price: 1,
            quantity: 2,
            customizations: { spicy_level: 'hot', allergy_notes: 'Không hành' },
          },
          {
            foodId: TEA_ID,
            price: 0,
            quantity: 3,
            customizations: { iceLevel: '50%', sweetnessLevel: '0%' },
          },
        ],
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as {
      success: boolean;
      orderId: string;
      orderCode: string;
      totalAmount: number;
      totalPrice: number;
      order: CreatedOrderPayload;
    };

    const expectedTotal = 380000 * 2 + 55000 * 3; // 925,000

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.orderId).toBe(ORDER_ID);
    expect(body.orderCode).toBe('ORD-TAMPER-01');
    expect(body.totalAmount).toBe(expectedTotal);
    expect(body.totalPrice).toBe(expectedTotal);

    expect(mocks.orderCreate).toHaveBeenCalledTimes(1);
    const createdArg = mocks.orderCreate.mock.calls[0][0] as CreatedOrderPayload;
    expect(createdArg.totalAmount).toBe(expectedTotal);
    expect(createdArg.items[0].price).toBe(380000);
    expect(createdArg.items[1].price).toBe(55000);
    expect(createdArg.status).toBe('PENDING');

    expect(emitRealtimeEvent).toHaveBeenCalledTimes(1);
    expect(emitRealtimeEvent).toHaveBeenCalledWith({
      type: REALTIME_EVENT_TYPES.ORDER_CREATED,
      orderId: ORDER_ID,
      orderCode: 'ORD-TAMPER-01',
      tableNumber: 'B04',
      status: 'PENDING',
      totalAmount: expectedTotal,
    });
  });

  it('POST /api/orders rejects unavailable dishes (isAvailable === false) with 400 and skips Order.create & SSE', async () => {
    mockMenuLookup({
      [SOLDOUT_ID]: {
        _id: SOLDOUT_ID,
        name: 'Chè Sen Hạt Long Nhãn',
        price: 65000,
        isAvailable: false,
      },
    });

    const request = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        tableNumber: 'B01',
        items: [{ menuItemId: SOLDOUT_ID, quantity: 1 }],
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { success: boolean; message: string };

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Món Chè Sen Hạt Long Nhãn hiện đang tạm hết');
    expect(mocks.orderCreate).not.toHaveBeenCalled();
    expect(emitRealtimeEvent).not.toHaveBeenCalled();
  });

  it('POST /api/orders returns 404 when a requested menuItem does not exist', async () => {
    mockMenuLookup({});

    const request = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        tableNumber: 'B01',
        items: [{ menuItemId: PHO_ID, quantity: 1 }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    expect(mocks.orderCreate).not.toHaveBeenCalled();
  });

  it('PATCH /api/orders enforces requireRole(["staff", "admin"]) returning 401/403 and updates status with SSE for staff and admin', async () => {
    // 1. Unauthenticated -> 401
    const unauthReq = new NextRequest('http://localhost/api/orders', {
      method: 'PATCH',
      body: JSON.stringify({ orderId: ORDER_ID, status: 'COOKING' }),
    });
    const unauthRes = await PATCH(unauthReq);
    expect(unauthRes.status).toBe(401);
    expect(requireRole).toHaveBeenCalledWith(unauthReq, ['staff', 'admin']);

    // 2. Customer token -> 403 Forbidden
    const customerToken = signAuthToken({
      userId: 'cust-1',
      email: 'customer@smares.vn',
      role: 'customer',
    });
    const customerReq = new NextRequest('http://localhost/api/orders', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ orderId: ORDER_ID, status: 'COOKING' }),
    });
    const customerRes = await PATCH(customerReq);
    expect(customerRes.status).toBe(403);
    expect(mocks.orderFindById).not.toHaveBeenCalled();

    // 3. Staff token -> 200 and emits ORDER_STATUS_UPDATED SSE event
    const save = vi.fn().mockResolvedValue(undefined);
    const existingOrder = {
      _id: ORDER_ID,
      orderCode: 'ORD-STAFF-01',
      tableNumber: 'B04',
      status: 'PENDING',
      save,
    };
    mocks.orderFindById.mockResolvedValueOnce(existingOrder);

    const staffToken = signAuthToken({
      userId: 'staff-1',
      email: 'staff@smares.vn',
      role: 'staff',
    });
    const staffReq = new NextRequest('http://localhost/api/orders', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ orderId: ORDER_ID, status: 'COOKING' }),
    });
    const staffRes = await PATCH(staffReq);
    const staffBody = (await staffRes.json()) as {
      success: boolean;
      order: { status: string };
    };

    expect(staffRes.status).toBe(200);
    expect(staffBody.success).toBe(true);
    expect(existingOrder.status).toBe('COOKING');
    expect(save).toHaveBeenCalledTimes(1);
    expect(emitRealtimeEvent).toHaveBeenCalledWith({
      type: REALTIME_EVENT_TYPES.ORDER_STATUS_UPDATED,
      orderId: ORDER_ID,
      orderCode: 'ORD-STAFF-01',
      tableNumber: 'B04',
      status: 'COOKING',
    });

    // 4. Admin token -> 200 COMPLETED, invalid status -> 400
    const adminToken = signAuthToken({
      userId: 'admin-1',
      email: 'admin@smares.vn',
      role: 'admin',
    });
    const invalidStatusReq = new NextRequest('http://localhost/api/orders', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ orderId: ORDER_ID, status: 'INVALID_STATUS' }),
    });
    const invalidStatusRes = await PATCH(invalidStatusReq);
    expect(invalidStatusRes.status).toBe(400);

    mocks.orderFindById.mockResolvedValueOnce(existingOrder);
    const adminReq = new NextRequest('http://localhost/api/orders', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ orderId: ORDER_ID, status: 'COMPLETED' }),
    });
    const adminRes = await PATCH(adminReq);
    expect(adminRes.status).toBe(200);
    expect(existingOrder.status).toBe('COMPLETED');
  });

  it('POST /api/orders enforces >= 5h advance booking lead time for isPreOrderOnly dishes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-22T07:00:00.000Z')); // 14:00 GMT+7

    try {
      mockMenuLookup({
        [PHO_ID]: {
          _id: PHO_ID,
          name: 'Phở Bò Wagyu A5 Thượng Hạng',
          price: 380000,
          isAvailable: true,
          isPreOrderOnly: true,
        },
      });

      const RESERVATION_ID = '6717a01a1e0011a100000301';

      // 1. Booking 3 hours away (17:00) -> 400 SPECIAL_PREORDER_LEAD_TIME_TOO_SHORT
      mocks.reservationFindById.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ date: '2026-11-22', time: '17:00' }),
        }),
      });
      const tooSoonRes = await POST(
        new NextRequest('http://localhost/api/orders', {
          method: 'POST',
          body: JSON.stringify({
            reservationId: RESERVATION_ID,
            tableNumber: 'B04',
            items: [{ menuItemId: PHO_ID, quantity: 1 }],
          }),
        })
      );
      const tooSoonBody = (await tooSoonRes.json()) as {
        success: boolean;
        error?: string;
      };
      expect(tooSoonRes.status).toBe(400);
      expect(tooSoonBody.success).toBe(false);
      expect(tooSoonBody.error).toBe('SPECIAL_PREORDER_LEAD_TIME_TOO_SHORT');
      expect(mocks.orderCreate).not.toHaveBeenCalled();

      // 2. No reservation lead time at all -> 400
      const noBookingRes = await POST(
        new NextRequest('http://localhost/api/orders', {
          method: 'POST',
          body: JSON.stringify({
            tableNumber: 'B04',
            items: [{ menuItemId: PHO_ID, quantity: 1 }],
          }),
        })
      );
      expect(noBookingRes.status).toBe(400);
      expect(mocks.orderCreate).not.toHaveBeenCalled();

      // 3. Booking >= 5 hours away (19:00) -> 201 Created
      mocks.reservationFindById.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ date: '2026-11-22', time: '19:00' }),
        }),
      });
      mocks.orderCreate.mockResolvedValueOnce({
        _id: ORDER_ID,
        orderCode: 'ORD-SPECIAL-OK',
        tableNumber: 'B04',
        totalAmount: 380000,
        status: 'PENDING',
      });

      const okRes = await POST(
        new NextRequest('http://localhost/api/orders', {
          method: 'POST',
          body: JSON.stringify({
            reservationId: RESERVATION_ID,
            tableNumber: 'B04',
            items: [{ menuItemId: PHO_ID, quantity: 1 }],
          }),
        })
      );
      expect(okRes.status).toBe(201);
      expect(mocks.orderCreate).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
