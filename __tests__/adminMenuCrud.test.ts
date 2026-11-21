import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn<() => Promise<void>>(),
  menuItemCountDocuments: vi.fn(),
  menuItemInsertMany: vi.fn(),
  menuItemFind: vi.fn(),
  menuItemFindById: vi.fn(),
  menuItemFindByIdAndDelete: vi.fn(),
  menuItemCreate: vi.fn(),
}));

vi.mock('@/app/lib/db', () => ({
  default: mocks.connectDB,
  connectDB: mocks.connectDB,
}));

vi.mock('@/app/models/MenuItem', () => ({
  MenuCategory: {
    APPETIZER: 'Khai vị',
    MAIN: 'Món chính',
    DRINK: 'Đồ uống',
    DESSERT: 'Tráng miệng',
  } as const,
  default: {
    countDocuments: mocks.menuItemCountDocuments,
    insertMany: mocks.menuItemInsertMany,
    find: mocks.menuItemFind,
    findById: mocks.menuItemFindById,
    findByIdAndDelete: mocks.menuItemFindByIdAndDelete,
    create: mocks.menuItemCreate,
  },
}));

import { GET as listMenu, POST as createMenu } from '@/app/api/menu/route';
import {
  GET as getMenuById,
  PUT as updateMenu,
  DELETE as deleteMenu,
} from '@/app/api/menu/[id]/route';
import { PATCH as toggleAvailability } from '@/app/api/menu/[id]/toggle-availability/route';
import { signAuthToken } from '@/app/lib/auth';

const VALID_ID = '6717a01a1e0011a100000004';
const INVALID_ID = 'not-a-valid-objectid';

interface RouteParamsContext {
  params: Promise<{ id: string }>;
}

function makeContext(id: string): RouteParamsContext {
  return { params: Promise.resolve({ id }) };
}

describe('Admin Menu CRUD & RBAC API (TK-201)', () => {
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'vitest-smares-menu-secret';
    mocks.connectDB.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  it('GET /api/menu returns menu items and VALID_MENU_CATEGORIES', async () => {
    mocks.menuItemCountDocuments.mockResolvedValueOnce(1);
    const lean = vi.fn().mockResolvedValueOnce([
      {
        _id: VALID_ID,
        name: 'Phở Bò Wagyu A5',
        price: 380000,
        category: 'Món chính',
        description: 'Nước dùng ninh xương 24 giờ',
        imageUrl: '/foods/pho_bo2.jpg',
        isAvailable: true,
      },
    ]);
    const sort = vi.fn().mockReturnValue({ lean });
    mocks.menuItemFind.mockReturnValueOnce({ sort });

    const req = new NextRequest('http://localhost/api/menu?category=M%C3%B3n%20ch%C3%ADnh');
    const res = await listMenu(req);
    const body = (await res.json()) as {
      success: boolean;
      count: number;
      categories: string[];
      data: Array<{ name: string }>;
    };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
    expect(body.categories).toEqual(['Khai vị', 'Món chính', 'Đồ uống', 'Tráng miệng']);
    expect(body.data[0].name).toBe('Phở Bò Wagyu A5');
  });

  describe('POST /api/menu', () => {
    const validPayload = {
      name: 'Bún Chả Hà Nội',
      price: 120000,
      description: 'Thịt nướng than hoa kèm nước mắm chua ngọt.',
      imageUrl: '/foods/pho_bo2.jpg',
      category: 'Món chính',
    };

    it('returns 401 when unauthenticated', async () => {
      const req = new NextRequest('http://localhost/api/menu', {
        method: 'POST',
        body: JSON.stringify(validPayload),
      });

      const res = await createMenu(req);
      expect(res.status).toBe(401);
      expect(mocks.menuItemCreate).not.toHaveBeenCalled();
    });

    it('returns 403 for customer and staff roles', async () => {
      for (const role of ['customer', 'staff'] as const) {
        const token = signAuthToken({
          userId: `${role}-1`,
          email: `${role}@smares.vn`,
          role,
        });
        const req = new NextRequest('http://localhost/api/menu', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(validPayload),
        });

        const res = await createMenu(req);
        expect(res.status).toBe(403);
      }
      expect(mocks.menuItemCreate).not.toHaveBeenCalled();
    });

    it('returns 400 for missing name, negative price, invalid category, or unsafe imageUrl', async () => {
      const adminToken = signAuthToken({
        userId: 'admin-1',
        email: 'admin@smares.vn',
        role: 'admin',
      });

      const invalidPayloads = [
        { ...validPayload, name: '   ' },
        { ...validPayload, price: -5000 },
        { ...validPayload, category: 'Món phụ không tồn tại' },
        { ...validPayload, imageUrl: 'javascript:alert(1)' },
        { ...validPayload, imageUrl: '//evil.example/img.png' },
      ];

      for (const payload of invalidPayloads) {
        const req = new NextRequest('http://localhost/api/menu', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify(payload),
        });

        const res = await createMenu(req);
        const json = (await res.json()) as { success: boolean; message: string };
        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.message).toBeTruthy();
      }
      expect(mocks.menuItemCreate).not.toHaveBeenCalled();
    });

    it('returns 201 and creates MenuItem when admin passes valid payload', async () => {
      const adminToken = signAuthToken({
        userId: 'admin-1',
        email: 'admin@smares.vn',
        role: 'admin',
      });

      mocks.menuItemCreate.mockResolvedValueOnce({
        _id: VALID_ID,
        ...validPayload,
        isAvailable: true,
        isPreOrderOnly: false,
        preparationNote: '',
      });

      const req = new NextRequest('http://localhost/api/menu', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(validPayload),
      });

      const res = await createMenu(req);
      const body = (await res.json()) as {
        success: boolean;
        message: string;
        data: { _id: string; name: string; price: number };
      };

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Bún Chả Hà Nội');
      expect(body.data.price).toBe(120000);
      expect(mocks.menuItemCreate).toHaveBeenCalledWith({
        ...validPayload,
        isAvailable: true,
        isPreOrderOnly: false,
        preparationNote: '',
      });
    });
  });

  describe('GET / PUT / DELETE /api/menu/[id]', () => {
    it('GET /api/menu/[id] validates ObjectId and returns 404 or 200', async () => {
      const badRes = await getMenuById(
        new NextRequest(`http://localhost/api/menu/${INVALID_ID}`),
        makeContext(INVALID_ID)
      );
      expect(badRes.status).toBe(400);

      mocks.menuItemFindById.mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(null),
      });
      const notFoundRes = await getMenuById(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}`),
        makeContext(VALID_ID)
      );
      expect(notFoundRes.status).toBe(404);

      mocks.menuItemFindById.mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce({
          _id: VALID_ID,
          name: 'Gỏi Cuốn Tôm Thịt',
          price: 75000,
        }),
      });
      const okRes = await getMenuById(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}`),
        makeContext(VALID_ID)
      );
      expect(okRes.status).toBe(200);
    });

    it('PUT /api/menu/[id] enforces admin RBAC, validates id/payload, handles 404, and saves updates', async () => {
      const unauthRes = await updateMenu(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}`, {
          method: 'PUT',
          body: JSON.stringify({ price: 90000 }),
        }),
        makeContext(VALID_ID)
      );
      expect(unauthRes.status).toBe(401);

      const staffToken = signAuthToken({
        userId: 'staff-1',
        email: 'staff@smares.vn',
        role: 'staff',
      });
      const staffRes = await updateMenu(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${staffToken}` },
          body: JSON.stringify({ price: 90000 }),
        }),
        makeContext(VALID_ID)
      );
      expect(staffRes.status).toBe(403);

      const adminToken = signAuthToken({
        userId: 'admin-1',
        email: 'admin@smares.vn',
        role: 'admin',
      });

      const invalidIdRes = await updateMenu(
        new NextRequest(`http://localhost/api/menu/${INVALID_ID}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ price: 90000 }),
        }),
        makeContext(INVALID_ID)
      );
      expect(invalidIdRes.status).toBe(400);

      for (const badBody of [{}, { price: -10 }, { imageUrl: 'data:text/html,<script>' }]) {
        const badRes = await updateMenu(
          new NextRequest(`http://localhost/api/menu/${VALID_ID}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify(badBody),
          }),
          makeContext(VALID_ID)
        );
        expect(badRes.status).toBe(400);
      }
      expect(mocks.menuItemFindById).not.toHaveBeenCalled();

      mocks.menuItemFindById.mockResolvedValueOnce(null);
      const notFoundRes = await updateMenu(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ name: 'Món mới' }),
        }),
        makeContext(VALID_ID)
      );
      expect(notFoundRes.status).toBe(404);

      const save = vi.fn().mockResolvedValue(undefined);
      const existingDish = {
        _id: VALID_ID,
        name: 'Phở Bò Wagyu',
        price: 380000,
        category: 'Món chính',
        description: 'Mô tả cũ',
        imageUrl: '/foods/pho_bo2.jpg',
        isAvailable: true,
        isPreOrderOnly: false,
        preparationNote: '',
        save,
      };
      mocks.menuItemFindById.mockResolvedValueOnce(existingDish);

      const okRes = await updateMenu(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            name: 'Phở Bò Wagyu Thượng Hạng',
            price: 420000,
            imageUrl: 'https://cdn.smares.vn/pho.jpg',
          }),
        }),
        makeContext(VALID_ID)
      );
      const okBody = (await okRes.json()) as {
        success: boolean;
        data: { name: string; price: number; imageUrl: string };
      };

      expect(okRes.status).toBe(200);
      expect(okBody.success).toBe(true);
      expect(existingDish.name).toBe('Phở Bò Wagyu Thượng Hạng');
      expect(existingDish.price).toBe(420000);
      expect(existingDish.imageUrl).toBe('https://cdn.smares.vn/pho.jpg');
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('DELETE /api/menu/[id] enforces admin RBAC, validates id, handles 404, and deletes item', async () => {
      const unauthRes = await deleteMenu(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}`, { method: 'DELETE' }),
        makeContext(VALID_ID)
      );
      expect(unauthRes.status).toBe(401);

      const staffToken = signAuthToken({
        userId: 'staff-1',
        email: 'staff@smares.vn',
        role: 'staff',
      });
      const staffRes = await deleteMenu(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${staffToken}` },
        }),
        makeContext(VALID_ID)
      );
      expect(staffRes.status).toBe(403);

      const adminToken = signAuthToken({
        userId: 'admin-1',
        email: 'admin@smares.vn',
        role: 'admin',
      });

      const badIdRes = await deleteMenu(
        new NextRequest(`http://localhost/api/menu/${INVALID_ID}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        makeContext(INVALID_ID)
      );
      expect(badIdRes.status).toBe(400);

      mocks.menuItemFindByIdAndDelete.mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(null),
      });
      const notFoundRes = await deleteMenu(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        makeContext(VALID_ID)
      );
      expect(notFoundRes.status).toBe(404);

      mocks.menuItemFindByIdAndDelete.mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce({
          _id: VALID_ID,
          name: 'Món đã xóa',
        }),
      });
      const okRes = await deleteMenu(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        makeContext(VALID_ID)
      );
      const okBody = (await okRes.json()) as { success: boolean; data: { _id: string } };
      expect(okRes.status).toBe(200);
      expect(okBody.success).toBe(true);
      expect(okBody.data._id).toBe(VALID_ID);
    });
  });

  describe('PATCH /api/menu/[id]/toggle-availability', () => {
    it('enforces staff/admin RBAC, validates boolean isAvailable, and supports both explicit and automatic toggle', async () => {
      const unauthRes = await toggleAvailability(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}/toggle-availability`, {
          method: 'PATCH',
        }),
        makeContext(VALID_ID)
      );
      expect(unauthRes.status).toBe(401);

      const customerToken = signAuthToken({
        userId: 'cust-1',
        email: 'customer@smares.vn',
        role: 'customer',
      });
      const customerRes = await toggleAvailability(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}/toggle-availability`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${customerToken}` },
        }),
        makeContext(VALID_ID)
      );
      expect(customerRes.status).toBe(403);

      const adminToken = signAuthToken({
        userId: 'admin-1',
        email: 'admin@smares.vn',
        role: 'admin',
      });
      const badTypeRes = await toggleAvailability(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}/toggle-availability`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ isAvailable: 'false' }),
        }),
        makeContext(VALID_ID)
      );
      expect(badTypeRes.status).toBe(400);

      const save = vi.fn().mockResolvedValue(undefined);
      const dish = {
        _id: VALID_ID,
        name: 'Chả Giò Hải Sản',
        isAvailable: true,
        save,
      };
      mocks.menuItemFindById.mockResolvedValueOnce(dish);

      const explicitRes = await toggleAvailability(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}/toggle-availability`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ isAvailable: false }),
        }),
        makeContext(VALID_ID)
      );
      const explicitJson = (await explicitRes.json()) as {
        success: boolean;
        data: { isAvailable: boolean };
      };
      expect(explicitRes.status).toBe(200);
      expect(explicitJson.data.isAvailable).toBe(false);
      expect(dish.isAvailable).toBe(false);

      const staffToken = signAuthToken({
        userId: 'staff-1',
        email: 'staff@smares.vn',
        role: 'staff',
      });
      mocks.menuItemFindById.mockResolvedValueOnce(dish);

      const autoToggleRes = await toggleAvailability(
        new NextRequest(`http://localhost/api/menu/${VALID_ID}/toggle-availability`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${staffToken}` },
        }),
        makeContext(VALID_ID)
      );
      const autoToggleJson = (await autoToggleRes.json()) as {
        success: boolean;
        data: { isAvailable: boolean };
      };
      expect(autoToggleRes.status).toBe(200);
      expect(autoToggleJson.data.isAvailable).toBe(true);
      expect(dish.isAvailable).toBe(true);
      expect(save).toHaveBeenCalledTimes(2);
    });
  });
});
