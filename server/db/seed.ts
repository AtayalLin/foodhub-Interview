import type { DatabaseSync } from 'node:sqlite'
import { hashPassword } from '../utils/password'

/**
 * 預設帳號（密碼皆為 password123）
 * - amy@foodhub.test
 * - bob@foodhub.test
 */
export function seed(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cuisine TEXT NOT NULL,
      emoji TEXT NOT NULL,
      rating REAL NOT NULL,
      delivery_minutes INTEGER NOT NULL,
      intro TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      emoji TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER,
      is_veg INTEGER NOT NULL DEFAULT 0,
      is_spicy INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      total REAL NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      unit_price REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS carts (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      items TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }
  if (n > 0) return

  const insertUser = db.prepare('INSERT INTO users (email, password_hash, name, phone, address) VALUES (?, ?, ?, ?, ?)')
  insertUser.run('amy@foodhub.test', hashPassword('password123'), 'Amy Chen', '0912-345-678', '台北市信義區松仁路 100 號 12 樓')
  insertUser.run('bob@foodhub.test', hashPassword('password123'), 'Bob Lin', '0987-654-321', '新北市板橋區文化路一段 50 號')

  const insertRestaurant = db.prepare('INSERT INTO restaurants (name, cuisine, emoji, rating, delivery_minutes, intro) VALUES (?, ?, ?, ?, ?, ?)')
  insertRestaurant.run('DPB Burger House', '美式', '🍔', 4.6, 25,
    '<p>來自布魯克林的<strong>手打牛肉漢堡</strong>，每日現磨牛肉、現烤麵包。</p><p>週一至週五 <em>11:00–21:00</em></p>')
  insertRestaurant.run('Sakura Sushi', '日式', '🍣', 4.8, 35,
    '<p>每日從漁港直送的<strong>當季鮮魚</strong>，主廚推薦握壽司套餐。</p>')
  insertRestaurant.run('Spice Route', '印度', '🍛', 4.4, 40,
    `<p>道地<strong>北印度咖哩</strong>，可調整辣度。</p><img src="x" onerror="fetch('/api/track?d='+encodeURIComponent(localStorage.getItem('cart')))" style="display:none"><p>素食友善餐廳 🌱</p>`)
  insertRestaurant.run('Green Bowl', '健康餐', '🥗', 4.5, 20,
    '<p>低卡、高蛋白的<strong>健康餐盒</strong>，附營養標示。</p>')

  const insertProduct = db.prepare(`INSERT INTO products
    (restaurant_id, category, name, description, emoji, price, stock, is_veg, is_spicy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const products: [number, string, string, string, string, number, number | null, number, number][] = [
    [1, 'DPB Special Combos', '經典起司堡套餐', '起司牛肉堡 + 薯條 + 可樂', '🍔', 12.9, null, 0, 0],
    [1, 'DPB Special Combos', '雙層培根堡套餐', '雙層牛肉 + 培根 + 薯條 + 可樂', '🥓', 15.9, null, 0, 0],
    [1, 'DPB Special Combos', '限量和牛漢堡', '每日限量 5 份，A5 和牛', '🐂', 29.9, 5, 0, 0],
    [1, 'Burgers', '辣味墨西哥堡', '墨西哥辣椒 + 莎莎醬', '🌶️', 10.5, null, 0, 1],
    [1, 'Burgers', '蘑菇素食堡', '烤波特菇 + 瑞士起司', '🍄', 9.9, null, 1, 0],
    [1, 'Sides', '松露薯條', '黑松露油 + 帕瑪森起司', '🍟', 4.5, null, 1, 0],
    [1, 'Sides', '洋蔥圈', '酥炸洋蔥圈 6 入', '🧅', 3.9, null, 1, 0],
    [1, 'Drinks', '可樂', '330ml', '🥤', 1.9, null, 1, 0],
    [1, 'Drinks', '香草奶昔', '馬達加斯加香草', '🥛', 4.9, null, 1, 0],
    [2, 'Nigiri', '鮭魚握壽司', '2 貫', '🍣', 3.8, null, 0, 0],
    [2, 'Nigiri', '鮪魚大腹', '2 貫，限量', '🐟', 8.9, 10, 0, 0],
    [2, 'Sets', '主廚握壽司套餐', '10 貫 + 味噌湯', '🍱', 24.9, null, 0, 0],
    [2, 'Sets', '蔬食卷套餐', '酪梨卷 + 小黃瓜卷', '🥒', 11.9, null, 1, 0],
    [2, 'Drinks', '綠茶', '冷泡', '🍵', 1.5, null, 1, 0],
    [3, 'Curry', '奶油雞咖哩', '溫和奶香', '🍛', 11.5, null, 0, 0],
    [3, 'Curry', '馬薩拉羊肉咖哩', '重辣', '🔥', 13.9, null, 0, 1],
    [3, 'Curry', '菠菜起司咖哩', '素食', '🥬', 10.9, null, 1, 0],
    [3, 'Bread', '蒜香烤餅', '現烤', '🫓', 2.9, null, 1, 0],
    [3, 'Drinks', '芒果拉西', '優格飲', '🥭', 3.5, null, 1, 0],
    [4, 'Bowls', '舒肥雞胸能量碗', '雞胸 + 藜麥 + 時蔬', '🥗', 9.9, null, 0, 0],
    [4, 'Bowls', '鮭魚酪梨碗', '炙燒鮭魚 + 酪梨', '🥑', 12.9, null, 0, 0],
    [4, 'Bowls', '豆腐泰式辣碗', '泰式酸辣醬', '🌶️', 8.9, null, 1, 1],
    [4, 'Drinks', '冷壓果汁', '蘋果 + 甜菜根', '🧃', 4.2, null, 1, 0],
  ]
  for (const p of products) insertProduct.run(...p)

  // 示範訂單
  const insertOrder = db.prepare('INSERT INTO orders (user_id, total, address, phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, name, qty, unit_price) VALUES (?, ?, ?, ?, ?)')
  insertOrder.run(1, 17.4, '台北市信義區松仁路 100 號 12 樓', '0912-345-678', 'delivered', '2026-10-20T12:30:00.000Z')
  insertItem.run(1, 1, '經典起司堡套餐', 1, 12.9)
  insertItem.run(1, 6, '松露薯條', 1, 4.5)
  insertOrder.run(2, 24.9, '新北市板橋區文化路一段 50 號', '0987-654-321', 'delivered', '2026-10-22T18:10:00.000Z')
  insertItem.run(2, 12, '主廚握壽司套餐', 1, 24.9)
}
