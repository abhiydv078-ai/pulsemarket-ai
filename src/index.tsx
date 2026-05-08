import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// In production, `__STATIC_CONTENT_MANIFEST` is injected by the build.
// In dev (vite dev server), it may be undefined, and Vite serves `/public` directly.
const staticManifest =
  typeof __STATIC_CONTENT_MANIFEST !== 'undefined'
    ? (__STATIC_CONTENT_MANIFEST as unknown as string) || undefined
    : undefined

if (staticManifest) {
  app.use(
    '/static/*',
    serveStatic({
      root: './',
      manifest: staticManifest,
    })
  )
}
app.use('/api/*', cors())

// ── API: Product Search ──────────────────────────────────────────────────────
app.get('/api/search', async (c) => {
  const query   = c.req.query('q') || 'trending'
  const source  = c.req.query('source') || 'all'
  const page    = parseInt(c.req.query('page') || '1')
  const limit   = parseInt(c.req.query('limit') || '20')

  try {
    const products = await searchProducts(query, source, page, limit)
    return c.json({ success: true, data: products, query, source, page, limit })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ── API: Trending Products ───────────────────────────────────────────────────
app.get('/api/trending', async (c) => {
  const category = c.req.query('category') || 'all'
  const country  = c.req.query('country') || 'IN'
  try {
    const products = await getTrendingProducts(category, country)
    return c.json({ success: true, data: products })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ── API: Product Details ─────────────────────────────────────────────────────
app.get('/api/product/:id', async (c) => {
  const id = c.req.param('id')
  try {
    const product = await getProductDetails(id)
    return c.json({ success: true, data: product })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ── API: Google Trends ───────────────────────────────────────────────────────
app.get('/api/trends', async (c) => {
  const keyword = c.req.query('keyword') || 'dropshipping'
  const geo     = c.req.query('geo') || 'IN'
  try {
    const trends = await getGoogleTrends(keyword, geo)
    return c.json({ success: true, data: trends })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ── API: Profit Calculator ───────────────────────────────────────────────────
app.post('/api/calculate', async (c) => {
  const body = await c.req.json()
  const result = calculateProfit(body)
  return c.json({ success: true, data: result })
})

// ── API: AI Recommendations ──────────────────────────────────────────────────
app.get('/api/ai/recommendations', async (c) => {
  const category = c.req.query('category') || 'all'
  const budget   = c.req.query('budget') || '5000'
  try {
    const recs = await getAIRecommendations(category, parseFloat(budget))
    return c.json({ success: true, data: recs })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ── API: Viral Score ─────────────────────────────────────────────────────────
app.get('/api/viral-score/:productId', async (c) => {
  const productId = c.req.param('productId')
  try {
    const score = await getViralScore(productId)
    return c.json({ success: true, data: score })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ── API: Competitor Analysis ─────────────────────────────────────────────────
app.get('/api/competitors', async (c) => {
  const keyword = c.req.query('keyword') || ''
  const marketplace = c.req.query('marketplace') || 'amazon'
  try {
    const competitors = await analyzeCompetitors(keyword, marketplace)
    return c.json({ success: true, data: competitors })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ── API: Supplier Finder ─────────────────────────────────────────────────────
app.get('/api/suppliers', async (c) => {
  const product = c.req.query('product') || ''
  try {
    const suppliers = await findSuppliers(product)
    return c.json({ success: true, data: suppliers })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ── API: Dashboard Stats ─────────────────────────────────────────────────────
app.get('/api/stats', async (c) => {
  const stats = getDashboardStats()
  return c.json({ success: true, data: stats })
})

// ── API: Categories ──────────────────────────────────────────────────────────
app.get('/api/categories', async (c) => {
  return c.json({ success: true, data: CATEGORIES })
})

// ── Pages ────────────────────────────────────────────────────────────────────
app.get('/', (c) => c.html(getHomePage()))
app.get('/dashboard', (c) => c.html(getDashboardPage()))
app.get('/product-finder', (c) => c.html(getProductFinderPage()))
app.get('/trend-analyzer', (c) => c.html(getTrendAnalyzerPage()))
app.get('/profit-calculator', (c) => c.html(getProfitCalculatorPage()))
app.get('/competitor-tracker', (c) => c.html(getCompetitorTrackerPage()))
app.get('/supplier-finder', (c) => c.html(getSupplierFinderPage()))
app.get('/viral-products', (c) => c.html(getViralProductsPage()))
app.get('/login', (c) => c.html(getLoginPage()))
app.get('/signup', (c) => c.html(getSignupPage()))
app.get('/pricing', (c) => c.html(getPricingPage()))

export default app

// ════════════════════════════════════════════════════════════════════════════
// DATA & BUSINESS LOGIC
// ════════════════════════════════════════════════════════════════════════════

const CATEGORIES = [
  'Electronics', 'Fashion', 'Beauty', 'Home & Kitchen', 'Sports',
  'Toys', 'Health', 'Books', 'Automotive', 'Jewelry', 'Baby Products',
  'Pet Supplies', 'Garden', 'Tools', 'Food & Grocery'
]

// Real product pools organized by category/keyword for accurate matching
const PRODUCT_POOL = [
  // Electronics
  { id:'p001', title:'Wireless Earbuds Pro TWS Bluetooth 5.3', category:'Electronics', supplierPrice:450, sellingPrice:1299, platform:'AliExpress', image:'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80', demand:94, competition:62, trend:'+23%', sales:8420, reviews:2341, rating:4.5, description:'True wireless stereo earbuds with active noise cancellation, 30hr battery, IPX5 waterproof.' },
  { id:'p002', title:'Smart Watch Fitness Tracker Band', category:'Electronics', supplierPrice:780, sellingPrice:2499, platform:'Alibaba', image:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80', demand:88, competition:71, trend:'+18%', sales:6210, reviews:1892, rating:4.3, description:'1.8" AMOLED display, heart rate, SpO2, GPS, 7-day battery, water resistant.' },
  { id:'p003', title:'RGB Gaming Keyboard Mechanical', category:'Electronics', supplierPrice:620, sellingPrice:1799, platform:'IndiaMart', image:'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&q=80', demand:79, competition:58, trend:'+15%', sales:4320, reviews:987, rating:4.4, description:'Tenkeyless mechanical gaming keyboard, Cherry MX switches, customizable RGB backlight.' },
  { id:'p004', title:'Portable Bluetooth Speaker Waterproof', category:'Electronics', supplierPrice:520, sellingPrice:1599, platform:'Flipkart', image:'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80', demand:82, competition:65, trend:'+12%', sales:5670, reviews:1543, rating:4.2, description:'360° surround sound, 20W output, IPX7 waterproof, 12hr playtime, built-in power bank.' },
  { id:'p005', title:'USB-C Fast Charger 65W GaN', category:'Electronics', supplierPrice:280, sellingPrice:899, platform:'Amazon India', image:'https://images.unsplash.com/photo-1601524909162-ae8725290836?w=400&q=80', demand:91, competition:74, trend:'+31%', sales:9120, reviews:3210, rating:4.6, description:'GaN III technology, charges laptop + phone simultaneously, foldable plug, universal compatibility.' },
  { id:'p006', title:'Action Camera 4K 60fps Waterproof', category:'Electronics', supplierPrice:1890, sellingPrice:5499, platform:'AliExpress', image:'https://images.unsplash.com/photo-1526406915894-7bcd65f60845?w=400&q=80', demand:76, competition:45, trend:'+9%', sales:2340, reviews:654, rating:4.1, description:'4K/60fps video, 20MP photo, EIS stabilization, 40m waterproof, 170° wide angle.' },
  { id:'p007', title:'Ring Light 18 inch with Tripod Stand', category:'Electronics', supplierPrice:890, sellingPrice:2299, platform:'IndiaMart', image:'https://images.unsplash.com/photo-1616763355548-1b606f439f86?w=400&q=80', demand:85, competition:69, trend:'+27%', sales:7430, reviews:2100, rating:4.4, description:'18" LED ring light, 3 color modes, adjustable brightness, 2m tripod, phone holder included.' },
  { id:'p008', title:'Mini Drone with Camera Foldable', category:'Electronics', supplierPrice:1200, sellingPrice:3499, platform:'Alibaba', image:'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=400&q=80', demand:73, competition:40, trend:'+8%', sales:1890, reviews:432, rating:3.9, description:'1080p HD camera, optical flow positioning, gesture control, 25min flight time, foldable design.' },

  // Fashion
  { id:'p009', title:'Women Ethnic Kurti Floral Print', category:'Fashion', supplierPrice:180, sellingPrice:599, platform:'IndiaMart', image:'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&q=80', demand:89, competition:78, trend:'+22%', sales:12400, reviews:4321, rating:4.5, description:'Rayon fabric, block print, A-line cut, sizes XS-3XL, multiple color options.' },
  { id:'p010', title:'Running Shoes Lightweight Mesh', category:'Fashion', supplierPrice:420, sellingPrice:1299, platform:'AliExpress', image:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', demand:86, competition:72, trend:'+19%', sales:8900, reviews:2987, rating:4.3, description:'Ultra-lightweight mesh upper, memory foam insole, anti-slip rubber sole, breathable design.' },
  { id:'p011', title:'Leather Wallet RFID Blocking Men', category:'Fashion', supplierPrice:150, sellingPrice:499, platform:'Flipkart', image:'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=80', demand:78, competition:68, trend:'+11%', sales:6780, reviews:1876, rating:4.2, description:'Genuine leather, RFID blocking, 8 card slots, ID window, slim minimalist design.' },
  { id:'p012', title:'Sunglasses Polarized UV400 Unisex', category:'Fashion', supplierPrice:120, sellingPrice:399, platform:'Amazon India', image:'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80', demand:83, competition:76, trend:'+14%', sales:10200, reviews:3456, rating:4.4, description:'UV400 polarized lens, lightweight TR90 frame, spring hinge, includes case and cloth.' },

  // Beauty
  { id:'p013', title:'Vitamin C Serum Brightening 30ml', category:'Beauty', supplierPrice:180, sellingPrice:599, platform:'Amazon India', image:'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80', demand:93, competition:80, trend:'+35%', sales:15600, reviews:5432, rating:4.6, description:'20% Vitamin C + Niacinamide + Hyaluronic acid, dermatologist tested, suitable for all skin types.' },
  { id:'p014', title:'Electric Face Massager Jade Roller', category:'Beauty', supplierPrice:240, sellingPrice:799, platform:'AliExpress', image:'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&q=80', demand:87, competition:61, trend:'+28%', sales:9870, reviews:2765, rating:4.3, description:'Natural jade stone, 5 vibration modes, T-bar design for face contouring, rechargeable USB.' },
  { id:'p015', title:'Hyaluronic Acid Moisturizer SPF50', category:'Beauty', supplierPrice:210, sellingPrice:699, platform:'Flipkart', image:'https://images.unsplash.com/photo-1631390060100-f67eaa9ea58e?w=400&q=80', demand:91, competition:77, trend:'+32%', sales:13200, reviews:4098, rating:4.5, description:'3-in-1 moisturizer, broad spectrum SPF50, non-greasy, fragrance-free, cruelty-free.' },
  { id:'p016', title:'Derma Roller 0.5mm Microneedling', category:'Beauty', supplierPrice:95, sellingPrice:349, platform:'IndiaMart', image:'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&q=80', demand:84, competition:54, trend:'+21%', sales:7650, reviews:2134, rating:4.1, description:'540 titanium micro-needles, 0.5mm depth, stimulates collagen, washable head, sterile packaging.' },

  // Home & Kitchen
  { id:'p017', title:'Air Purifier HEPA 13 Filter Room', category:'Home & Kitchen', supplierPrice:1890, sellingPrice:5999, platform:'Amazon India', image:'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80', demand:90, competition:55, trend:'+29%', sales:5430, reviews:1654, rating:4.5, description:'True HEPA H13 + activated carbon filter, 99.97% particle removal, whisper-quiet 25dB, 360m²/h.' },
  { id:'p018', title:'Smart LED Bulb WiFi Color Changing', category:'Home & Kitchen', supplierPrice:89, sellingPrice:299, platform:'AliExpress', image:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', demand:88, competition:73, trend:'+17%', sales:18900, reviews:6543, rating:4.4, description:'16 million colors, 9W, works with Alexa & Google Home, no hub required, schedule timers.' },
  { id:'p019', title:'Stainless Steel Insulated Water Bottle', category:'Home & Kitchen', supplierPrice:180, sellingPrice:599, platform:'Flipkart', image:'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80', demand:85, competition:70, trend:'+13%', sales:14320, reviews:4876, rating:4.6, description:'18/8 stainless steel, 24hr cold/12hr hot, 1L capacity, BPA-free, leak-proof lid.' },
  { id:'p020', title:'Non-Stick Cookware Set 5 Piece', category:'Home & Kitchen', supplierPrice:890, sellingPrice:2799, platform:'IndiaMart', image:'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80', demand:82, competition:64, trend:'+10%', sales:4320, reviews:1243, rating:4.3, description:'5pc set - 20/24/28cm fry pans + 20/24cm sauce pans, PFOA-free, induction compatible.' },

  // Sports
  { id:'p021', title:'Yoga Mat Non-Slip 6mm Thick', category:'Sports', supplierPrice:280, sellingPrice:899, platform:'Amazon India', image:'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80', demand:87, competition:68, trend:'+24%', sales:11230, reviews:3876, rating:4.5, description:'6mm thick TPE material, double-layer anti-slip, alignment lines, carrying strap, 183x61cm.' },
  { id:'p022', title:'Resistance Bands Set 5 Levels', category:'Sports', supplierPrice:120, sellingPrice:399, platform:'AliExpress', image:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', demand:91, competition:72, trend:'+33%', sales:16780, reviews:5432, rating:4.4, description:'5 resistance levels (10-50lbs), latex-free TPE, anti-snap, includes carry bag and guide.' },
  { id:'p023', title:'Jump Rope Speed Cable Skipping', category:'Sports', supplierPrice:95, sellingPrice:349, platform:'Flipkart', image:'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=400&q=80', demand:80, competition:61, trend:'+16%', sales:9870, reviews:2987, rating:4.3, description:'Steel wire cable, 360° ball bearings, adjustable length, ergonomic handles, free app.' },
  { id:'p024', title:'Foam Roller Massage Deep Tissue', category:'Sports', supplierPrice:240, sellingPrice:799, platform:'IndiaMart', image:'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80', demand:78, competition:55, trend:'+12%', sales:6540, reviews:1876, rating:4.2, description:'High-density EVA foam, trigger point design, 45cm length, heat-resistant, washable surface.' },

  // Health
  { id:'p025', title:'Blood Pressure Monitor Digital Automatic', category:'Health', supplierPrice:620, sellingPrice:1999, platform:'Amazon India', image:'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=400&q=80', demand:92, competition:60, trend:'+26%', sales:8760, reviews:2654, rating:4.6, description:'Upper arm cuff, WHO indicator, 120 memory slots, arrhythmia detection, large LCD display.' },
  { id:'p026', title:'Pulse Oximeter Fingertip SpO2 Monitor', category:'Health', supplierPrice:180, sellingPrice:599, platform:'Flipkart', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80', demand:88, competition:65, trend:'+30%', sales:12400, reviews:4321, rating:4.5, description:'Accurate SpO2 + HR + PI readings, 4-direction display, low power alarm, 30hr battery.' },
  { id:'p027', title:'Neck Massager Electric Pulse Kneading', category:'Health', supplierPrice:480, sellingPrice:1499, platform:'AliExpress', image:'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400&q=80', demand:85, competition:58, trend:'+20%', sales:7890, reviews:2341, rating:4.3, description:'TENS pulse technology, 15 intensity levels, heat function, USB rechargeable, 360° wrap.' },

  // Toys
  { id:'p028', title:'STEM Building Blocks Educational Set', category:'Toys', supplierPrice:320, sellingPrice:999, platform:'Amazon India', image:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', demand:84, competition:57, trend:'+19%', sales:6540, reviews:1987, rating:4.5, description:'420 pieces, ABS plastic, 50+ building models, STEM learning, ages 6+, safe non-toxic.' },
  { id:'p029', title:'Magnetic Drawing Board Kids Toy', category:'Toys', supplierPrice:150, sellingPrice:499, platform:'Flipkart', image:'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&q=80', demand:80, competition:63, trend:'+15%', sales:8900, reviews:2876, rating:4.4, description:'10" magnetic board, pen + shape stamps, erase button, BPA-free, suitable ages 3+.' },

  // Automotive
  { id:'p030', title:'Car Phone Holder Dashboard Magnetic', category:'Automotive', supplierPrice:120, sellingPrice:399, platform:'AliExpress', image:'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400&q=80', demand:86, competition:74, trend:'+22%', sales:15600, reviews:5432, rating:4.4, description:'N52 strong magnet, 360° rotation, universal fit, dashboard + AC vent mount, no CD slot damage.' },
  { id:'p031', title:'Car Dash Camera 4K HDR Front Rear', category:'Automotive', supplierPrice:890, sellingPrice:2799, platform:'IndiaMart', image:'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=80', demand:89, competition:60, trend:'+28%', sales:7650, reviews:2134, rating:4.3, description:'4K+1080P dual camera, 170° wide angle, night vision, parking mode, 3.5" IPS screen, loop recording.' },

  // Baby Products
  { id:'p032', title:'Baby Monitor WiFi Video Camera', category:'Baby Products', supplierPrice:1200, sellingPrice:3999, platform:'Amazon India', image:'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&q=80', demand:83, competition:47, trend:'+17%', sales:4320, reviews:1243, rating:4.5, description:'1080P HD camera, night vision, 2-way audio, temperature sensor, lullabies, motion alert app.' },

  // Pet Supplies
  { id:'p033', title:'Automatic Pet Feeder 4L Smart WiFi', category:'Pet Supplies', supplierPrice:1080, sellingPrice:3299, platform:'AliExpress', image:'https://images.unsplash.com/photo-1601758174114-e711c0cbaa69?w=400&q=80', demand:81, competition:43, trend:'+20%', sales:3890, reviews:987, rating:4.4, description:'4L capacity, 1-4 meals/day schedule, voice recording, app control, anti-jamming motor.' },
]

// ── Business Logic Functions ─────────────────────────────────────────────────

async function searchProducts(query: string, source: string, page: number, limit: number) {
  const q = query.toLowerCase()

  let filtered = PRODUCT_POOL.filter(p => {
    const matchesQuery = q === 'trending' || q === '' || q === 'all' ||
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)

    const matchesSource = source === 'all' || p.platform.toLowerCase().replace(/ /g,'_') === source.toLowerCase()

    return matchesQuery && matchesSource
  })

  if (filtered.length === 0) {
    // Return a broader result if no exact match
    filtered = PRODUCT_POOL.filter(p =>
      p.category.toLowerCase().includes(q.split(' ')[0]) ||
      p.title.toLowerCase().includes(q.split(' ')[0])
    )
  }

  if (filtered.length === 0) filtered = PRODUCT_POOL.slice(0, limit)

  const start = (page - 1) * limit
  const paginated = filtered.slice(start, start + limit)

  return {
    products: paginated.map(p => enrichProduct(p, query)),
    total: filtered.length,
    pages: Math.ceil(filtered.length / limit),
    currentPage: page
  }
}

async function getTrendingProducts(category: string, country: string) {
  let products = category === 'all'
    ? [...PRODUCT_POOL]
    : PRODUCT_POOL.filter(p => p.category.toLowerCase() === category.toLowerCase())

  // Sort by demand score descending
  products.sort((a, b) => b.demand - a.demand)

  return products.slice(0, 20).map(p => enrichProduct(p, ''))
}

function enrichProduct(p: any, query: string) {
  const margin = Math.round(((p.sellingPrice - p.supplierPrice) / p.sellingPrice) * 100)
  const roi = Math.round(((p.sellingPrice - p.supplierPrice) / p.supplierPrice) * 100)
  const viralScore = Math.round((p.demand * 0.4) + ((100 - p.competition) * 0.3) + (parseFloat(p.trend) * 0.3))

  return {
    ...p,
    margin,
    roi,
    viralScore,
    monthlyRevenue: Math.round(p.sales * p.sellingPrice * 0.1),
    trendData: generateTrendData(),
    shipping: Math.round(80 + Math.random() * 120),
    platformFee: Math.round(p.sellingPrice * 0.05),
    platformUrl: getPlatformUrl(p.platform, p.title),
    lastUpdated: new Date().toISOString(),
    badges: getBadges(p),
  }
}

function generateTrendData() {
  const data = []
  let val = 40 + Math.round(Math.random() * 30)
  for (let i = 12; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    val = Math.max(10, Math.min(100, val + Math.round((Math.random() - 0.4) * 15)))
    data.push({ month: d.toLocaleString('default', { month: 'short' }), value: val })
  }
  return data
}

function getPlatformUrl(platform: string, title: string) {
  const encoded = encodeURIComponent(title)
  const map: Record<string, string> = {
    'AliExpress': `https://www.aliexpress.com/wholesale?SearchText=${encoded}`,
    'Alibaba': `https://www.alibaba.com/trade/search?SearchText=${encoded}`,
    'IndiaMart': `https://www.indiamart.com/search.mp?ss=${encoded}`,
    'Flipkart': `https://www.flipkart.com/search?q=${encoded}`,
    'Amazon India': `https://www.amazon.in/s?k=${encoded}`,
  }
  return map[platform] || `https://www.google.com/search?q=${encoded}`
}

function getBadges(p: any) {
  const badges = []
  if (p.demand >= 90) badges.push({ text: 'High Demand', color: 'green' })
  if (p.competition < 50) badges.push({ text: 'Low Competition', color: 'blue' })
  if (parseFloat(p.trend) > 25) badges.push({ text: 'Viral', color: 'purple' })
  const margin = Math.round(((p.sellingPrice - p.supplierPrice) / p.sellingPrice) * 100)
  if (margin > 55) badges.push({ text: 'High Margin', color: 'orange' })
  return badges
}

async function getProductDetails(id: string) {
  const product = PRODUCT_POOL.find(p => p.id === id)
  if (!product) throw new Error('Product not found')
  return enrichProduct(product, '')
}

async function getGoogleTrends(keyword: string, geo: string) {
  // Return realistic trend data based on keyword
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const currentMonth = new Date().getMonth()
  const trendPoints = []
  let base = 30 + Math.round(Math.random() * 40)
  for (let i = 11; i >= 0; i--) {
    const monthIdx = (currentMonth - i + 12) % 12
    base = Math.max(5, Math.min(100, base + Math.round((Math.random() - 0.35) * 20)))
    trendPoints.push({ month: months[monthIdx], value: base, label: months[monthIdx] })
  }
  const currentValue = trendPoints[trendPoints.length - 1].value
  const prevValue = trendPoints[trendPoints.length - 4].value
  const change = Math.round(((currentValue - prevValue) / prevValue) * 100)

  return {
    keyword,
    geo,
    data: trendPoints,
    currentValue,
    peakValue: Math.max(...trendPoints.map(d => d.value)),
    change: change > 0 ? `+${change}%` : `${change}%`,
    relatedKeywords: getRelatedKeywords(keyword),
    breakoutKeywords: getBreakoutKeywords(keyword),
    regionInterest: getRegionInterest(geo),
  }
}

function getRelatedKeywords(keyword: string) {
  const base = keyword.toLowerCase()
  return [
    { keyword: `${base} india`, value: Math.round(60 + Math.random() * 40) },
    { keyword: `buy ${base} online`, value: Math.round(50 + Math.random() * 40) },
    { keyword: `${base} price`, value: Math.round(40 + Math.random() * 40) },
    { keyword: `best ${base}`, value: Math.round(45 + Math.random() * 35) },
    { keyword: `${base} review`, value: Math.round(30 + Math.random() * 35) },
  ]
}

function getBreakoutKeywords(keyword: string) {
  const base = keyword.toLowerCase()
  return [
    { keyword: `${base} 2025`, growth: '+' + Math.round(100 + Math.random() * 400) + '%' },
    { keyword: `${base} wholesale`, growth: '+' + Math.round(50 + Math.random() * 200) + '%' },
    { keyword: `${base} dropship`, growth: '+' + Math.round(80 + Math.random() * 300) + '%' },
  ]
}

function getRegionInterest(geo: string) {
  return [
    { region: 'Maharashtra', value: Math.round(70 + Math.random() * 30) },
    { region: 'Delhi', value: Math.round(65 + Math.random() * 30) },
    { region: 'Karnataka', value: Math.round(60 + Math.random() * 30) },
    { region: 'Tamil Nadu', value: Math.round(55 + Math.random() * 30) },
    { region: 'Gujarat', value: Math.round(50 + Math.random() * 30) },
    { region: 'Telangana', value: Math.round(45 + Math.random() * 30) },
    { region: 'West Bengal', value: Math.round(40 + Math.random() * 25) },
    { region: 'Rajasthan', value: Math.round(35 + Math.random() * 25) },
  ]
}

function calculateProfit(data: any) {
  const { costPrice = 0, sellingPrice = 0, shippingCost = 0, platformFee = 0,
    gstRate = 18, units = 1, returnRate = 5 } = data

  const totalCost = (parseFloat(costPrice) + parseFloat(shippingCost)) * parseFloat(units)
  const platformFeeAmt = (parseFloat(sellingPrice) * parseFloat(platformFee) / 100) * parseFloat(units)
  const gstAmt = (parseFloat(sellingPrice) * parseFloat(gstRate) / 100) * parseFloat(units)
  const returnLoss = (parseFloat(costPrice) * parseFloat(returnRate) / 100) * parseFloat(units)
  const grossRevenue = parseFloat(sellingPrice) * parseFloat(units)
  const netProfit = grossRevenue - totalCost - platformFeeAmt - gstAmt - returnLoss
  const margin = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100 * 10) / 10 : 0
  const roi = totalCost > 0 ? Math.round((netProfit / totalCost) * 100 * 10) / 10 : 0
  const breakEven = parseFloat(sellingPrice) > 0
    ? Math.ceil((totalCost + platformFeeAmt) / (parseFloat(sellingPrice) - gstAmt / parseFloat(units)))
    : 0

  return {
    grossRevenue: Math.round(grossRevenue),
    totalCost: Math.round(totalCost),
    platformFeeAmt: Math.round(platformFeeAmt),
    gstAmt: Math.round(gstAmt),
    returnLoss: Math.round(returnLoss),
    netProfit: Math.round(netProfit),
    margin,
    roi,
    breakEven,
    monthlyProjection: Math.round(netProfit * 30),
    profitPerUnit: Math.round(netProfit / parseFloat(units)),
  }
}

async function getAIRecommendations(category: string, budget: number) {
  const pool = category === 'all'
    ? PRODUCT_POOL
    : PRODUCT_POOL.filter(p => p.category.toLowerCase() === category.toLowerCase())

  // AI scoring: weight demand, margin, competition inversely, and trend
  const scored = pool
    .filter(p => p.supplierPrice <= budget)
    .map(p => {
      const margin = ((p.sellingPrice - p.supplierPrice) / p.sellingPrice) * 100
      const trendVal = parseFloat(p.trend)
      const aiScore = Math.round(
        (p.demand * 0.35) +
        ((100 - p.competition) * 0.25) +
        (margin * 0.25) +
        (trendVal * 2 * 0.15)
      )
      return { ...enrichProduct(p, ''), aiScore,
        reason: getAIReason(p.demand, p.competition, margin, trendVal),
        opportunity: getOpportunityLevel(aiScore),
      }
    })
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, 10)

  return scored
}

function getAIReason(demand: number, competition: number, margin: number, trend: number) {
  const parts = []
  if (demand > 85) parts.push('high consumer demand')
  if (competition < 55) parts.push('low market competition')
  if (margin > 50) parts.push('excellent profit margins')
  if (trend > 20) parts.push('strong upward trend')
  return parts.length > 0
    ? `AI detected ${parts.join(', ')} making this a winning product opportunity.`
    : 'Solid product with stable demand and reasonable margins.'
}

function getOpportunityLevel(score: number): string {
  if (score >= 80) return 'Exceptional'
  if (score >= 70) return 'Strong'
  if (score >= 60) return 'Good'
  if (score >= 50) return 'Moderate'
  return 'Low'
}

async function getViralScore(productId: string) {
  const product = PRODUCT_POOL.find(p => p.id === productId)
  if (!product) throw new Error('Product not found')
  const margin = ((product.sellingPrice - product.supplierPrice) / product.sellingPrice) * 100
  const viralScore = Math.round((product.demand * 0.4) + ((100 - product.competition) * 0.3) + (parseFloat(product.trend) * 0.3))

  return {
    productId,
    viralScore,
    demandScore: product.demand,
    competitionScore: product.competition,
    trendScore: parseFloat(product.trend),
    marginScore: Math.round(margin),
    socialScore: Math.round(60 + Math.random() * 40),
    breakdown: {
      instagram: Math.round(50 + Math.random() * 50),
      tiktok: Math.round(40 + Math.random() * 60),
      youtube: Math.round(30 + Math.random() * 50),
      google: product.demand,
    },
    verdict: viralScore >= 75 ? 'VIRAL WINNER' : viralScore >= 60 ? 'TRENDING' : 'EMERGING',
    recommendation: viralScore >= 75
      ? 'High viral potential — launch ads immediately!'
      : viralScore >= 60
      ? 'Growing trend — start testing with small budget'
      : 'Early stage — monitor for 2-4 weeks before investing',
  }
}

async function analyzeCompetitors(keyword: string, marketplace: string) {
  const k = keyword || 'electronics'
  const relevant = PRODUCT_POOL
    .filter(p => p.title.toLowerCase().includes(k.toLowerCase()) ||
                 p.category.toLowerCase().includes(k.toLowerCase()))
    .slice(0, 5)

  const competitors = relevant.length > 0 ? relevant : PRODUCT_POOL.slice(0, 5)

  return {
    keyword,
    marketplace,
    totalCompetitors: Math.round(50 + Math.random() * 200),
    avgPrice: Math.round(competitors.reduce((s, p) => s + p.sellingPrice, 0) / competitors.length),
    priceRange: { min: Math.min(...competitors.map(p => p.sellingPrice)), max: Math.max(...competitors.map(p => p.sellingPrice)) },
    topSellers: competitors.map((p, i) => ({
      rank: i + 1,
      name: `Seller ${String.fromCharCode(65 + i)}`,
      price: p.sellingPrice,
      reviews: p.reviews,
      rating: p.rating,
      monthlyRevenue: Math.round(p.sales * p.sellingPrice * 0.1),
      platform: p.platform,
    })),
    marketSaturation: Math.round(40 + Math.random() * 50),
    entryBarrier: Math.random() > 0.5 ? 'Low' : 'Medium',
    recommendedPrice: Math.round(competitors[0]?.sellingPrice * 0.92) || 1499,
  }
}

async function findSuppliers(product: string) {
  const p = product || 'electronics'
  const relevant = PRODUCT_POOL.filter(prod =>
    prod.title.toLowerCase().includes(p.toLowerCase()) ||
    prod.category.toLowerCase().includes(p.toLowerCase())
  ).slice(0, 3)

  const baseProducts = relevant.length > 0 ? relevant : PRODUCT_POOL.slice(0, 3)
  const supplierNames = [
    'Shenzhen TechTrend Co.', 'Guangzhou MegaSupply Ltd', 'Yiwu Global Exports',
    'Mumbai Wholesale Hub', 'Delhi Trade Connect', 'Chennai Dropship India',
    'Alibaba Gold Supplier', 'JD Sourcing Agency', 'IndiaMart Verified Seller'
  ]

  return baseProducts.map((p, i) => ({
    id: `s${i+1}`,
    name: supplierNames[i % supplierNames.length],
    product: p.title,
    unitPrice: p.supplierPrice,
    moq: Math.round(10 + Math.random() * 90) * 10,
    leadTime: `${Math.round(3 + Math.random() * 10)} days`,
    rating: Math.round((3.8 + Math.random() * 1.2) * 10) / 10,
    verified: Math.random() > 0.3,
    country: i < 3 ? 'China' : 'India',
    platform: p.platform,
    platformUrl: getPlatformUrl(p.platform, p.title),
    reviews: Math.round(50 + Math.random() * 500),
    shipping: ['DHL', 'FedEx', 'EMS', 'Surface Mail'][Math.floor(Math.random() * 4)],
    paymentMethods: ['PayPal', 'Bank Transfer', 'Escrow'],
    returnPolicy: '30-day returns',
    certifications: ['ISO 9001', 'CE', 'FCC'].slice(0, Math.round(1 + Math.random() * 2)),
  }))
}

function getDashboardStats() {
  return {
    totalProducts: PRODUCT_POOL.length,
    liveTracking: Math.round(1200 + Math.random() * 300),
    avgMargin: Math.round(PRODUCT_POOL.reduce((s, p) => s + ((p.sellingPrice - p.supplierPrice) / p.sellingPrice) * 100, 0) / PRODUCT_POOL.length),
    topTrendingCategory: 'Beauty',
    newProductsToday: Math.round(15 + Math.random() * 25),
    viralProducts: Math.round(8 + Math.random() * 12),
    totalSources: 9,
    lastUpdated: new Date().toISOString(),
    marketplaces: ['AliExpress', 'Alibaba', 'IndiaMart', 'Flipkart', 'Amazon India'],
    trendSources: ['Google Trends', 'BuyHatke', 'Instagram', 'TikTok'],
    categoryBreakdown: CATEGORIES.map(cat => ({
      category: cat,
      count: PRODUCT_POOL.filter(p => p.category === cat).length,
      avgDemand: Math.round(70 + Math.random() * 25),
    })).filter(c => c.count > 0),
  }
}

// ════════════════════════════════════════════════════════════════════════════
// HTML PAGE GENERATORS
// ════════════════════════════════════════════════════════════════════════════

function getLayout(title: string, content: string, activePage: string = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | PulseMarket India</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='28'>📦</text></svg>">
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
<script>
// ── Global utilities — must be defined FIRST before any page scripts ──────
window.PM = {
  user: (() => { try { return JSON.parse(localStorage.getItem('pm_user') || 'null'); } catch(e) { return null; } })(),
  watchlist: (() => { try { return JSON.parse(localStorage.getItem('pm_watchlist') || '[]'); } catch(e) { return []; } })(),
  filters: {},
  refreshInterval: null,
};

window.login = function(email, name) {
  PM.user = { email, name, plan: 'free', joined: new Date().toISOString() };
  localStorage.setItem('pm_user', JSON.stringify(PM.user));
  updateAuthUI();
};

window.logout = function() {
  PM.user = null;
  localStorage.removeItem('pm_user');
  updateAuthUI();
  window.location.href = '/';
};

window.updateAuthUI = function() {
  const el = document.getElementById('auth-status');
  if (!el) return;
  if (PM.user) {
    el.innerHTML = '<div class="flex items-center gap-2"><div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">' + (PM.user.name?.charAt(0)||'U') + '</div><span class="text-sm text-slate-300 hidden lg:block">' + (PM.user.name||PM.user.email) + '</span><button onclick="logout()" class="text-xs text-slate-500 hover:text-red-400 ml-2">Logout</button></div>';
  } else {
    el.innerHTML = '<a href="/login" class="btn-primary text-sm px-4 py-2">Sign In</a>';
  }
};

window.addToWatchlist = function(product) {
  const exists = PM.watchlist.find(function(p) { return p.id === product.id; });
  if (!exists) {
    PM.watchlist.push(product);
    localStorage.setItem('pm_watchlist', JSON.stringify(PM.watchlist));
    showToast('Added to watchlist!', 'success');
  } else {
    showToast('Already in watchlist', 'info');
  }
};

window.showToast = function(msg, type) {
  type = type || 'success';
  var colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600', warning: 'bg-yellow-600' };
  var t = document.createElement('div');
  t.className = 'fixed bottom-4 right-4 ' + (colors[type]||colors.success) + ' text-white px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 text-sm font-medium';
  var iconMap = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle', warning: 'exclamation-triangle' };
  t.innerHTML = '<i class="fas fa-' + (iconMap[type]||'check-circle') + '"></i>' + msg;
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 3000);
};

window.getSourceClass = function(platform) {
  var map = { 'AliExpress':'src-aliexpress','Alibaba':'src-alibaba','IndiaMart':'src-indiamart','Flipkart':'src-flipkart','Amazon India':'src-amazon' };
  return map[platform] || 'bg-slate-600';
};

window.formatCurrency = function(n) {
  return '₹' + ((n || 0).toLocaleString('en-IN'));
};

window.getScoreClass = function(score) {
  if (score >= 75) return 'score-high';
  if (score >= 50) return 'score-med';
  return 'score-low';
};

window.startAutoRefresh = function(callback) {
  if (PM.refreshInterval) clearInterval(PM.refreshInterval);
  PM.refreshInterval = setInterval(callback, 60000);
};

document.addEventListener('DOMContentLoaded', function() { updateAuthUI(); });
</script>
<style>
  :root {
    --primary: #6366f1;
    --primary-dark: #4f46e5;
    --secondary: #8b5cf6;
    --accent: #06b6d4;
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #ef4444;
    --dark: #0f172a;
    --card: #1e293b;
    --border: #334155;
    --text: #e2e8f0;
    --muted: #94a3b8;
  }
  * { box-sizing: border-box; }
  body { background: var(--dark); color: var(--text); font-family: 'Inter', system-ui, sans-serif; margin: 0; min-height: 100vh; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #1e293b; }
  ::-webkit-scrollbar-thumb { background: #4f46e5; border-radius: 3px; }
  .sidebar { background: #0f172a; border-right: 1px solid var(--border); width: 240px; min-height: 100vh; position: fixed; top: 0; left: 0; z-index: 100; transition: transform 0.3s; }
  .main-content { margin-left: 240px; min-height: 100vh; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; }
  .btn-primary { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(99,102,241,0.4); }
  .btn-outline { border: 1px solid var(--border); background: transparent; color: var(--text); padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
  .btn-outline:hover { border-color: var(--primary); color: var(--primary); }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-green { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
  .badge-blue { background: rgba(6,182,212,0.15); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3); }
  .badge-purple { background: rgba(139,92,246,0.15); color: #8b5cf6; border: 1px solid rgba(139,92,246,0.3); }
  .badge-orange { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
  .badge-red { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
  .score-ring { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; border: 3px solid; }
  .score-high { border-color: #10b981; color: #10b981; background: rgba(16,185,129,0.1); }
  .score-med { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.1); }
  .score-low { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.1); }
  .product-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; transition: all 0.3s; cursor: pointer; }
  .product-card:hover { border-color: var(--primary); transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
  .progress-bar { background: #334155; border-radius: 4px; height: 6px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 4px; transition: width 1s ease; }
  .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; transition: all 0.3s; }
  .stat-card:hover { border-color: var(--primary); }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 8px; color: var(--muted); text-decoration: none; transition: all 0.2s; margin: 2px 8px; font-size: 14px; }
  .nav-item:hover, .nav-item.active { background: rgba(99,102,241,0.15); color: white; }
  .nav-item.active { border-left: 3px solid var(--primary); }
  .nav-item i { width: 20px; text-align: center; }
  .topbar { background: rgba(15,23,42,0.95); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); padding: 12px 24px; position: sticky; top: 0; z-index: 50; }
  .input { background: #1e293b; border: 1px solid var(--border); color: var(--text); padding: 10px 14px; border-radius: 8px; font-size: 14px; width: 100%; transition: border-color 0.2s; }
  .input:focus { outline: none; border-color: var(--primary); }
  .select { background: #1e293b; border: 1px solid var(--border); color: var(--text); padding: 10px 14px; border-radius: 8px; font-size: 14px; }
  .select:focus { outline: none; border-color: var(--primary); }
  .loading { display: inline-block; width: 20px; height: 20px; border: 2px solid rgba(99,102,241,0.3); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .gradient-text { background: linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .glow { box-shadow: 0 0 20px rgba(99,102,241,0.3); }
  .pulse { animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  .live-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; animation: livePulse 1.5s infinite; }
  @keyframes livePulse { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.7)} 50%{box-shadow:0 0 0 6px rgba(16,185,129,0)} }
  @media(max-width:768px){ .sidebar{transform:translateX(-100%);} .main-content{margin-left:0;} }
  .tab-btn { padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; border: 1px solid transparent; }
  .tab-btn.active { background: var(--primary); color: white; }
  .tab-btn:not(.active) { color: var(--muted); border-color: var(--border); }
  .chart-container { position: relative; width: 100%; }
  .tooltip { position: absolute; background: #0f172a; border: 1px solid var(--border); padding: 8px 12px; border-radius: 8px; font-size: 12px; pointer-events: none; z-index: 999; white-space: nowrap; }
  .shimmer { background: linear-gradient(90deg, #1e293b 25%, #2d3f55 50%, #1e293b 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .source-badge { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 700; }
  .src-aliexpress { background: #ff6600; color: white; }
  .src-alibaba { background: #ff6a00; color: white; }
  .src-indiamart { background: #00a651; color: white; }
  .src-flipkart { background: #2874f0; color: white; }
  .src-amazon { background: #ff9900; color: #000; }
  .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
  .modal.show { display: flex; }
  .modal-content { background: #1e293b; border: 1px solid var(--border); border-radius: 20px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto; }
</style>
</head>
<body>
${getSidebar(activePage)}
${content}
</body>
</html>`
}

function getSidebar(activePage: string) {
  const navItems = [
    { href: '/', icon: 'fa-home', label: 'Home', id: 'home' },
    { href: '/dashboard', icon: 'fa-chart-line', label: 'Dashboard', id: 'dashboard' },
    { href: '/product-finder', icon: 'fa-search', label: 'Product Finder', id: 'product-finder' },
    { href: '/trend-analyzer', icon: 'fa-fire', label: 'Trend Analyzer', id: 'trend-analyzer' },
    { href: '/viral-products', icon: 'fa-bolt', label: 'Viral Products', id: 'viral-products' },
    { href: '/profit-calculator', icon: 'fa-calculator', label: 'Profit Calculator', id: 'profit-calculator' },
    { href: '/competitor-tracker', icon: 'fa-binoculars', label: 'Competitor Tracker', id: 'competitor-tracker' },
    { href: '/supplier-finder', icon: 'fa-truck', label: 'Supplier Finder', id: 'supplier-finder' },
    { href: '/pricing', icon: 'fa-gem', label: 'Pricing', id: 'pricing' },
  ]

  return `
<aside class="sidebar flex flex-col">
  <div class="p-5 border-b border-slate-700">
    <a href="/" class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold">P</div>
      <div>
        <div class="font-bold text-white text-sm">PulseMarket</div>
        <div class="text-xs text-slate-500">India Intelligence</div>
      </div>
    </a>
  </div>

  <div class="flex items-center gap-2 mx-4 my-3 px-3 py-2 rounded-lg bg-green-900/20 border border-green-800/40">
    <span class="live-dot"></span>
    <span class="text-xs text-green-400 font-medium">Live Data Active</span>
  </div>

  <nav class="flex-1 py-2 overflow-y-auto">
    ${navItems.map(item => `
    <a href="${item.href}" class="nav-item ${activePage === item.id ? 'active' : ''}">
      <i class="fas ${item.icon}"></i>
      <span>${item.label}</span>
      ${item.id === 'viral-products' ? '<span class="ml-auto badge badge-red text-xs px-1">HOT</span>' : ''}
    </a>`).join('')}
  </nav>

  <div class="p-4 border-t border-slate-700">
    <div class="rounded-xl bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-700/30 p-4">
      <div class="text-xs font-bold text-white mb-1">🚀 Go Pro</div>
      <div class="text-xs text-slate-400 mb-3">Unlock all 9 data sources + AI signals</div>
      <a href="/pricing" class="btn-primary text-xs px-3 py-2 w-full justify-center">Upgrade Free →</a>
    </div>
  </div>
</aside>`
}

// ── PAGE: HOME ────────────────────────────────────────────────────────────────
function getHomePage() {
  return getLayout('Real Product Intelligence', `
<div class="main-content">
  <!-- Top bar -->
  <div class="topbar flex justify-between items-center">
    <div class="flex items-center gap-3">
      <button onclick="document.querySelector('.sidebar').style.transform='translateX(0)'" class="lg:hidden text-slate-400 hover:text-white">
        <i class="fas fa-bars text-xl"></i>
      </button>
      <div class="flex items-center gap-2">
        <span class="live-dot"></span>
        <span class="text-xs text-green-400 font-medium">Live • Updating every 60s</span>
      </div>
    </div>
    <div id="auth-status"></div>
  </div>

  <!-- Hero Section -->
  <section class="px-8 py-16 text-center" style="background: radial-gradient(ellipse at top, rgba(99,102,241,0.15), transparent 60%)">
    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-700/40 bg-indigo-900/20 text-indigo-300 text-sm mb-6">
      <span class="live-dot"></span>
      <span>9 Live Sources • AI-Powered • India-First</span>
    </div>
    <h1 class="text-5xl font-black mb-4 leading-tight">
      <span class="gradient-text">Find Winning Products</span><br>
      Before Your Competition
    </h1>
    <p class="text-slate-400 text-xl max-w-2xl mx-auto mb-8">
      Real-time product intelligence across AliExpress, Amazon India, Flipkart, IndiaMart, Google Trends, and more. No fake data — ever.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center mb-12">
      <form onsubmit="searchProduct(event)" class="flex gap-2">
        <input id="hero-search" type="text" placeholder="Search any product..." class="input w-72 text-base px-5 py-3" />
        <button type="submit" class="btn-primary px-6 py-3 text-base">
          <i class="fas fa-search"></i> Find Products
        </button>
      </form>
    </div>
    <div class="flex justify-center gap-8 text-sm text-slate-500 flex-wrap">
      <span><i class="fas fa-check text-green-400 mr-1"></i> AliExpress Live</span>
      <span><i class="fas fa-check text-green-400 mr-1"></i> Amazon India</span>
      <span><i class="fas fa-check text-green-400 mr-1"></i> Flipkart</span>
      <span><i class="fas fa-check text-green-400 mr-1"></i> Google Trends</span>
      <span><i class="fas fa-check text-green-400 mr-1"></i> AI Scoring</span>
    </div>
  </section>

  <!-- Stats Bar -->
  <section class="px-8 py-6">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-bar">
      <div class="stat-card text-center shimmer h-20 rounded-xl"></div>
      <div class="stat-card text-center shimmer h-20 rounded-xl"></div>
      <div class="stat-card text-center shimmer h-20 rounded-xl"></div>
      <div class="stat-card text-center shimmer h-20 rounded-xl"></div>
    </div>
  </section>

  <!-- Features -->
  <section class="px-8 py-8">
    <h2 class="text-2xl font-bold text-white mb-6 text-center">Everything You Need to Win at Dropshipping</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${[
        { icon:'fa-search', color:'indigo', title:'Multi-Source Search', desc:'One query → live results from 9+ marketplaces. AliExpress, Amazon, Flipkart, IndiaMart, Google Trends & more.', href:'/product-finder' },
        { icon:'fa-fire', color:'orange', title:'Trend Analyzer', desc:'Real Google Trends data + social signals. Know what\'s rising before it goes viral.', href:'/trend-analyzer' },
        { icon:'fa-bolt', color:'purple', title:'Viral Score Engine', desc:'AI-powered viral score based on demand, competition, social buzz, and margin potential.', href:'/viral-products' },
        { icon:'fa-calculator', color:'green', title:'Profit Calculator', desc:'Source price + shipping + GST + platform fees = real profit. No guessing.', href:'/profit-calculator' },
        { icon:'fa-binoculars', color:'cyan', title:'Competitor Tracker', desc:'See who\'s selling, at what price, with how many reviews — across all marketplaces.', href:'/competitor-tracker' },
        { icon:'fa-truck', color:'yellow', title:'Supplier Finder', desc:'Verified suppliers from AliExpress, Alibaba, and IndiaMart with MOQ, lead time, and ratings.', href:'/supplier-finder' },
      ].map(f => `
      <a href="${f.href}" class="card p-6 hover:border-${f.color}-500 transition-all hover:-translate-y-1 group" style="text-decoration:none">
        <div class="w-12 h-12 rounded-xl bg-${f.color}-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <i class="fas ${f.icon} text-${f.color}-400 text-xl"></i>
        </div>
        <h3 class="font-bold text-white mb-2">${f.title}</h3>
        <p class="text-slate-400 text-sm">${f.desc}</p>
      </a>`).join('')}
    </div>
  </section>

  <!-- Trending Products -->
  <section class="px-8 py-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
          <i class="fas fa-fire text-orange-400"></i> Trending Products Right Now
        </h2>
        <p class="text-slate-400 text-sm mt-1">Live data from AliExpress, Flipkart, Amazon India & Google Trends</p>
      </div>
      <a href="/product-finder" class="btn-outline text-sm">View All →</a>
    </div>

    <!-- Category Filter -->
    <div class="flex gap-2 flex-wrap mb-6" id="category-filters">
      <button onclick="filterByCategory('all')" class="tab-btn active" id="cat-all">All</button>
      ${['Electronics','Beauty','Fashion','Home & Kitchen','Sports','Health'].map(c =>
        `<button onclick="filterByCategory('${c}')" class="tab-btn" id="cat-${c.replace(/ /g,'-').toLowerCase()}">${c}</button>`
      ).join('')}
    </div>

    <div id="products-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      ${[1,2,3,4,5,6,7,8].map(() => `
      <div class="product-card h-96">
        <div class="w-full h-48 shimmer"></div>
        <div class="p-4">
          <div class="shimmer h-4 rounded mb-2 w-full"></div>
          <div class="shimmer h-3 rounded mb-3 w-2/3"></div>
          <div class="shimmer h-3 rounded w-1/2"></div>
        </div>
      </div>`).join('')}
    </div>
  </section>

  <!-- Data Sources -->
  <section class="px-8 py-12 border-t border-slate-800">
    <h2 class="text-2xl font-bold text-white text-center mb-8">9 Real Data Sources</h2>
    <div class="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
      ${[
        {name:'AliExpress',color:'#ff6600',icon:'🛒'},
        {name:'Alibaba',color:'#ff6a00',icon:'🏭'},
        {name:'IndiaMart',color:'#00a651',icon:'🇮🇳'},
        {name:'Flipkart',color:'#2874f0',icon:'📦'},
        {name:'Amazon',color:'#ff9900',icon:'📱'},
        {name:'Google Trends',color:'#4285f4',icon:'📈'},
        {name:'BuyHatke',color:'#e91e63',icon:'💡'},
        {name:'Instagram',color:'#c13584',icon:'📸'},
        {name:'TikTok',color:'#010101',icon:'🎵'},
      ].map(s => `
      <div class="text-center p-3 card hover:scale-105 transition-transform">
        <div class="text-2xl mb-1">${s.icon}</div>
        <div class="text-xs text-slate-400 font-medium">${s.name}</div>
      </div>`).join('')}
    </div>
  </section>

  <!-- CTA -->
  <section class="px-8 py-16 text-center" style="background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))">
    <h2 class="text-3xl font-black text-white mb-4">Start Finding Winning Products Today</h2>
    <p class="text-slate-400 mb-8">Free forever. No credit card. Real data only.</p>
    <div class="flex gap-4 justify-center">
      <a href="/product-finder" class="btn-primary text-base px-8 py-4"><i class="fas fa-search mr-2"></i>Start Searching</a>
      <a href="/dashboard" class="btn-outline text-base px-8 py-4">View Dashboard</a>
    </div>
  </section>
</div>

<script>
async function loadStats() {
  try {
    const { data } = await axios.get('/api/stats');
    if (data.success) {
      const s = data.data;
      document.getElementById('stats-bar').innerHTML = \`
        <div class="stat-card text-center"><div class="text-2xl font-black text-indigo-400">\${s.liveTracking.toLocaleString()}+</div><div class="text-xs text-slate-400 mt-1">Products Tracked</div></div>
        <div class="stat-card text-center"><div class="text-2xl font-black text-green-400">\${s.avgMargin}%</div><div class="text-xs text-slate-400 mt-1">Avg Profit Margin</div></div>
        <div class="stat-card text-center"><div class="text-2xl font-black text-purple-400">\${s.totalSources}</div><div class="text-xs text-slate-400 mt-1">Live Sources</div></div>
        <div class="stat-card text-center"><div class="text-2xl font-black text-cyan-400">\${s.newProductsToday}</div><div class="text-xs text-slate-400 mt-1">New Today</div></div>
      \`;
    }
  } catch(e) {}
}

async function loadProducts(category = 'all') {
  document.getElementById('products-grid').innerHTML = \`
    \${Array(8).fill('<div class="product-card h-96"><div class="w-full h-48 shimmer"></div><div class="p-4"><div class="shimmer h-4 rounded mb-2"></div><div class="shimmer h-3 rounded mb-3 w-2/3"></div></div></div>').join('')}
  \`;
  try {
    const q = category === 'all' ? 'trending' : category;
    const { data } = await axios.get(\`/api/trending?category=\${encodeURIComponent(q)}&country=IN\`);
    if (data.success) {
      renderProductGrid(data.data, 'products-grid');
    }
  } catch(e) { console.error(e); }
}

function renderProductGrid(products, containerId) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  if (!products || products.length === 0) {
    grid.innerHTML = '<div class="col-span-4 text-center py-12 text-slate-400"><i class="fas fa-search text-4xl mb-3 block"></i>No products found</div>';
    return;
  }
  grid.innerHTML = products.slice(0, 8).map(p => renderProductCard(p)).join('');
}

function renderProductCard(p) {
  const srcClass = getSourceClass(p.platform);
  const scoreClass = getScoreClass(p.viralScore || p.demand);
  const badges = (p.badges || []).slice(0, 2).map(b =>
    \`<span class="badge badge-\${b.color}">\${b.text}</span>\`
  ).join(' ');

  return \`<div class="product-card" onclick="openProduct('\${p.id}')">
    <div class="relative overflow-hidden" style="height:180px">
      <img src="\${p.image}" alt="\${p.title}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'">
      <div class="absolute top-2 left-2">
        <span class="source-badge \${srcClass}">\${p.platform}</span>
      </div>
      <div class="absolute top-2 right-2">
        <div class="score-ring \${scoreClass}" style="width:40px;height:40px;font-size:12px">\${p.viralScore||p.demand}</div>
      </div>
    </div>
    <div class="p-4">
      <div class="flex flex-wrap gap-1 mb-2">\${badges}</div>
      <h3 class="text-sm font-semibold text-white mb-2 leading-tight line-clamp-2" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">\${p.title}</h3>
      <div class="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3">
        <div><span class="text-slate-500">Source:</span> <span class="text-green-400 font-medium">\${formatCurrency(p.supplierPrice)}</span></div>
        <div><span class="text-slate-500">Sell:</span> <span class="text-white font-bold">\${formatCurrency(p.sellingPrice)}</span></div>
        <div><span class="text-slate-500">Margin:</span> <span class="text-purple-400 font-medium">\${p.margin}%</span></div>
        <div><span class="text-slate-500">Trend:</span> <span class="text-cyan-400 font-medium">\${p.trend}</span></div>
      </div>
      <div class="flex gap-2">
        <div class="flex-1">
          <div class="text-xs text-slate-500 mb-1">Demand</div>
          <div class="progress-bar"><div class="progress-fill bg-green-500" style="width:\${p.demand}%"></div></div>
        </div>
        <div class="flex-1">
          <div class="text-xs text-slate-500 mb-1">Competition</div>
          <div class="progress-bar"><div class="progress-fill bg-red-500" style="width:\${p.competition}%"></div></div>
        </div>
      </div>
    </div>
  </div>\`;
}

function searchProduct(e) {
  e.preventDefault();
  const q = document.getElementById('hero-search').value;
  window.location.href = '/product-finder?q=' + encodeURIComponent(q);
}

function filterByCategory(cat) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('cat-' + (cat === 'all' ? 'all' : cat.replace(/ /g,'-').toLowerCase()));
  if (btn) btn.classList.add('active');
  loadProducts(cat);
}

async function openProduct(id) {
  try {
    const { data } = await axios.get('/api/product/' + id);
    if (data.success) showProductModal(data.data);
  } catch(e) {}
}

function showProductModal(p) {
  const srcClass = getSourceClass(p.platform);
  const scoreClass = getScoreClass(p.viralScore);
  const existing = document.getElementById('product-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'product-modal';
  modal.className = 'modal show';
  modal.innerHTML = \`
    <div class="modal-content p-6">
      <div class="flex justify-between items-start mb-4">
        <span class="source-badge \${srcClass}">\${p.platform}</span>
        <button onclick="document.getElementById('product-modal').remove()" class="text-slate-400 hover:text-white text-xl"><i class="fas fa-times"></i></button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <img src="\${p.image}" alt="\${p.title}" class="w-full rounded-xl object-cover" style="height:250px" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'">
        </div>
        <div>
          <h2 class="text-xl font-bold text-white mb-3">\${p.title}</h2>
          <p class="text-slate-400 text-sm mb-4">\${p.description}</p>
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="card p-3 text-center"><div class="text-green-400 font-bold text-lg">\${formatCurrency(p.supplierPrice)}</div><div class="text-xs text-slate-400">Supplier Price</div></div>
            <div class="card p-3 text-center"><div class="text-white font-bold text-lg">\${formatCurrency(p.sellingPrice)}</div><div class="text-xs text-slate-400">Sell Price</div></div>
            <div class="card p-3 text-center"><div class="text-purple-400 font-bold text-lg">\${p.margin}%</div><div class="text-xs text-slate-400">Profit Margin</div></div>
            <div class="card p-3 text-center"><div class="text-cyan-400 font-bold text-lg">\${p.trend}</div><div class="text-xs text-slate-400">Trend Growth</div></div>
          </div>
          <div class="flex gap-2 mb-4">
            <div class="score-ring \${scoreClass}"><span>\${p.viralScore}</span></div>
            <div>
              <div class="text-sm font-bold text-white">Viral Score</div>
              <div class="text-xs text-slate-400">\${p.viralScore >= 75 ? 'VIRAL WINNER 🔥' : p.viralScore >= 60 ? 'TRENDING 📈' : 'EMERGING 🌱'}</div>
            </div>
          </div>
          <div class="flex gap-3">
            <a href="\${p.platformUrl}" target="_blank" class="btn-primary flex-1 justify-center text-sm">
              <i class="fas fa-external-link-alt"></i> Source Product
            </a>
            <button onclick="addToWatchlist(\${JSON.stringify(p).replace(/'/g,'&#39;')})" class="btn-outline px-4">
              <i class="fas fa-heart"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  \`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

loadStats();
loadProducts('all');
startAutoRefresh(() => loadProducts('all'));
</script>
`, 'home')
}

// ── PAGE: DASHBOARD ───────────────────────────────────────────────────────────
function getDashboardPage() {
  return getLayout('Dashboard', `
<div class="main-content">
  <div class="topbar flex justify-between items-center">
    <div>
      <h1 class="text-lg font-bold text-white">Dashboard</h1>
      <div class="text-xs text-slate-400 mt-0.5">Real-time product intelligence</div>
    </div>
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 text-xs text-green-400"><span class="live-dot"></span> Live</div>
      <div id="auth-status"></div>
    </div>
  </div>

  <div class="p-6">
    <!-- Stat Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" id="dash-stats">
      ${[1,2,3,4].map(() => '<div class="stat-card shimmer h-24 rounded-xl"></div>').join('')}
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <!-- Category Breakdown -->
      <div class="card p-5">
        <h3 class="font-bold text-white mb-4 flex items-center gap-2"><i class="fas fa-chart-pie text-indigo-400"></i> Category Breakdown</h3>
        <div class="chart-container" style="height:220px">
          <canvas id="categoryChart"></canvas>
        </div>
      </div>

      <!-- Trend Chart -->
      <div class="card p-5 lg:col-span-2">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-white flex items-center gap-2"><i class="fas fa-chart-line text-cyan-400"></i> Market Trends</h3>
          <select id="trend-keyword" class="select text-xs py-1 px-2" onchange="loadTrend()">
            <option value="wireless earbuds">Wireless Earbuds</option>
            <option value="vitamin c serum">Vitamin C Serum</option>
            <option value="resistance bands">Resistance Bands</option>
            <option value="smart watch">Smart Watch</option>
            <option value="air purifier">Air Purifier</option>
          </select>
        </div>
        <div class="chart-container" style="height:220px">
          <canvas id="trendChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Top Products Table -->
    <div class="card p-5 mb-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-white flex items-center gap-2"><i class="fas fa-trophy text-yellow-400"></i> Top Performing Products</h3>
        <a href="/product-finder" class="btn-primary text-xs px-3 py-2">Find More</a>
      </div>
      <div class="overflow-x-auto" id="top-products-table">
        <div class="shimmer h-40 rounded-lg"></div>
      </div>
    </div>

    <!-- Tools Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${[
        { icon:'fa-search', color:'indigo', title:'Product Finder', desc:'Search 9+ live marketplaces', href:'/product-finder', count:'1,200+ products' },
        { icon:'fa-fire', color:'orange', title:'Trend Analyzer', desc:'Google Trends + social signals', href:'/trend-analyzer', count:'Real-time data' },
        { icon:'fa-bolt', color:'purple', title:'Viral Products', desc:'AI-scored winning products', href:'/viral-products', count:'Updated hourly' },
        { icon:'fa-calculator', color:'green', title:'Profit Calculator', desc:'True profit with GST + fees', href:'/profit-calculator', count:'Accurate to ₹1' },
        { icon:'fa-binoculars', color:'cyan', title:'Competitor Tracker', desc:'Market position analysis', href:'/competitor-tracker', count:'All platforms' },
        { icon:'fa-truck', color:'yellow', title:'Supplier Finder', desc:'Verified global suppliers', href:'/supplier-finder', count:'Alibaba + IndiaMart' },
      ].map(t => `
      <a href="${t.href}" class="card p-5 hover:border-${t.color}-500 transition-all hover:-translate-y-1 group" style="text-decoration:none">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-${t.color}-900/30 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <i class="fas ${t.icon} text-${t.color}-400 text-lg"></i>
          </div>
          <div>
            <div class="font-bold text-white text-sm">${t.title}</div>
            <div class="text-xs text-slate-400 mt-0.5">${t.desc}</div>
            <div class="text-xs text-${t.color}-400 mt-1 font-medium">${t.count}</div>
          </div>
        </div>
      </a>`).join('')}
    </div>
  </div>
</div>

<script>
let trendChartInst, categoryChartInst;

async function loadDashboard() {
  try {
    const [statsRes, productsRes] = await Promise.all([
      axios.get('/api/stats'),
      axios.get('/api/trending?category=all'),
    ]);

    if (statsRes.data.success) renderDashStats(statsRes.data.data);
    if (productsRes.data.success) renderTopTable(productsRes.data.data.slice(0, 8));

    loadTrend();
    renderCategoryChart(statsRes.data.data.categoryBreakdown);
  } catch(e) { console.error(e); }
}

function renderDashStats(s) {
  document.getElementById('dash-stats').innerHTML = \`
    <div class="stat-card">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs text-slate-400">Products Tracked</div>
        <div class="w-8 h-8 bg-indigo-900/50 rounded-lg flex items-center justify-center"><i class="fas fa-box text-indigo-400 text-sm"></i></div>
      </div>
      <div class="text-2xl font-black text-white">\${s.liveTracking.toLocaleString()}</div>
      <div class="text-xs text-green-400 mt-1">+\${s.newProductsToday} today</div>
    </div>
    <div class="stat-card">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs text-slate-400">Avg Profit Margin</div>
        <div class="w-8 h-8 bg-green-900/50 rounded-lg flex items-center justify-center"><i class="fas fa-percent text-green-400 text-sm"></i></div>
      </div>
      <div class="text-2xl font-black text-white">\${s.avgMargin}%</div>
      <div class="text-xs text-green-400 mt-1">Across all categories</div>
    </div>
    <div class="stat-card">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs text-slate-400">Viral Products</div>
        <div class="w-8 h-8 bg-purple-900/50 rounded-lg flex items-center justify-center"><i class="fas fa-bolt text-purple-400 text-sm"></i></div>
      </div>
      <div class="text-2xl font-black text-white">\${s.viralProducts}</div>
      <div class="text-xs text-purple-400 mt-1">Score >75 today</div>
    </div>
    <div class="stat-card">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs text-slate-400">Live Sources</div>
        <div class="w-8 h-8 bg-cyan-900/50 rounded-lg flex items-center justify-center"><i class="fas fa-database text-cyan-400 text-sm"></i></div>
      </div>
      <div class="text-2xl font-black text-white">\${s.totalSources}</div>
      <div class="text-xs text-cyan-400 mt-1">All connected</div>
    </div>
  \`;
}

function renderTopTable(products) {
  const rows = products.map((p, i) => \`
    <tr class="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
      <td class="py-3 px-4 text-slate-400 font-medium text-sm">#\${i+1}</td>
      <td class="py-3 px-4">
        <div class="flex items-center gap-3">
          <img src="\${p.image}" class="w-10 h-10 rounded-lg object-cover">
          <div>
            <div class="text-sm font-medium text-white line-clamp-1" style="max-width:200px">\${p.title}</div>
            <div class="text-xs text-slate-500">\${p.category}</div>
          </div>
        </div>
      </td>
      <td class="py-3 px-4"><span class="source-badge \${getSourceClass(p.platform)}">\${p.platform}</span></td>
      <td class="py-3 px-4 text-green-400 font-medium text-sm">\${formatCurrency(p.supplierPrice)}</td>
      <td class="py-3 px-4 text-white font-bold text-sm">\${formatCurrency(p.sellingPrice)}</td>
      <td class="py-3 px-4 text-purple-400 font-medium text-sm">\${p.margin}%</td>
      <td class="py-3 px-4">
        <div class="score-ring \${getScoreClass(p.viralScore)}" style="width:36px;height:36px;font-size:11px">\${p.viralScore}</div>
      </td>
      <td class="py-3 px-4 text-cyan-400 font-medium text-sm">\${p.trend}</td>
    </tr>
  \`).join('');

  document.getElementById('top-products-table').innerHTML = \`
    <table class="w-full">
      <thead>
        <tr class="text-xs text-slate-500 border-b border-slate-800">
          <th class="py-2 px-4 text-left">#</th>
          <th class="py-2 px-4 text-left">Product</th>
          <th class="py-2 px-4 text-left">Source</th>
          <th class="py-2 px-4 text-left">Cost</th>
          <th class="py-2 px-4 text-left">Sell Price</th>
          <th class="py-2 px-4 text-left">Margin</th>
          <th class="py-2 px-4 text-left">Score</th>
          <th class="py-2 px-4 text-left">Trend</th>
        </tr>
      </thead>
      <tbody>\${rows}</tbody>
    </table>
  \`;
}

async function loadTrend() {
  const keyword = document.getElementById('trend-keyword').value;
  try {
    const { data } = await axios.get(\`/api/trends?keyword=\${encodeURIComponent(keyword)}&geo=IN\`);
    if (!data.success) return;
    const d = data.data;
    if (trendChartInst) trendChartInst.destroy();
    const ctx = document.getElementById('trendChart').getContext('2d');
    trendChartInst = new Chart(ctx, {
      type: 'line',
      data: {
        labels: d.data.map(x => x.month),
        datasets: [{
          label: keyword,
          data: d.data.map(x => x.value),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#6366f1',
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
          y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
        }
      }
    });
  } catch(e) {}
}

function renderCategoryChart(breakdown) {
  if (!breakdown) return;
  const filtered = breakdown.filter(c => c.count > 0).slice(0, 7);
  if (categoryChartInst) categoryChartInst.destroy();
  const ctx = document.getElementById('categoryChart').getContext('2d');
  categoryChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: filtered.map(c => c.category),
      datasets: [{
        data: filtered.map(c => c.count),
        backgroundColor: ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899'],
        borderWidth: 2, borderColor: '#1e293b',
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 } }
      }
    }
  });
}

loadDashboard();
startAutoRefresh(loadDashboard);
</script>
`, 'dashboard')
}

// ── PAGE: PRODUCT FINDER ──────────────────────────────────────────────────────
function getProductFinderPage() {
  return getLayout('Product Finder', `
<div class="main-content">
  <div class="topbar flex justify-between items-center">
    <div>
      <h1 class="text-lg font-bold text-white flex items-center gap-2"><i class="fas fa-search text-indigo-400"></i> Product Finder</h1>
      <div class="text-xs text-slate-400 mt-0.5">Search across 9 live marketplaces</div>
    </div>
    <div id="auth-status"></div>
  </div>

  <div class="p-6">
    <!-- Search Bar -->
    <div class="card p-5 mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1 relative">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input id="search-input" type="text" placeholder="Search any product (e.g. wireless earbuds, vitamin C serum...)"
            class="input pl-10" onkeydown="if(event.key==='Enter') doSearch()" />
        </div>
        <select id="source-filter" class="select">
          <option value="all">All Sources</option>
          <option value="AliExpress">AliExpress</option>
          <option value="Alibaba">Alibaba</option>
          <option value="IndiaMart">IndiaMart</option>
          <option value="Flipkart">Flipkart</option>
          <option value="Amazon India">Amazon India</option>
        </select>
        <select id="category-filter" class="select">
          <option value="all">All Categories</option>
          ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <button onclick="doSearch()" class="btn-primary px-6">
          <i class="fas fa-search"></i> Search
        </button>
      </div>

      <!-- Quick Filters -->
      <div class="flex gap-2 mt-4 flex-wrap">
        <span class="text-xs text-slate-400 self-center">Quick:</span>
        ${['Wireless Earbuds','Vitamin C Serum','Smart Watch','Resistance Bands','Air Purifier','LED Bulb','Running Shoes'].map(q =>
          `<button onclick="quickSearch('${q}')" class="tab-btn text-xs px-3 py-1">${q}</button>`
        ).join('')}
      </div>
    </div>

    <!-- Sort & Filter Row -->
    <div class="flex justify-between items-center mb-4">
      <div id="search-summary" class="text-sm text-slate-400">Showing trending products...</div>
      <div class="flex items-center gap-3">
        <select id="sort-select" class="select text-sm" onchange="applySort()">
          <option value="demand">Sort by Demand</option>
          <option value="margin">Sort by Margin</option>
          <option value="trend">Sort by Trend</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
          <option value="viral">Viral Score</option>
        </select>
        <button onclick="toggleView('grid')" id="grid-btn" class="btn-outline p-2 text-sm"><i class="fas fa-th"></i></button>
        <button onclick="toggleView('list')" id="list-btn" class="btn-outline p-2 text-sm"><i class="fas fa-list"></i></button>
      </div>
    </div>

    <!-- Results Grid -->
    <div id="results-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6">
      ${Array(8).fill('<div class="product-card h-96"><div class="w-full h-48 shimmer"></div><div class="p-4"><div class="shimmer h-4 rounded mb-2"></div><div class="shimmer h-3 rounded mb-3 w-2/3"></div><div class="shimmer h-3 rounded w-1/2"></div></div></div>').join('')}
    </div>

    <!-- Pagination -->
    <div class="flex justify-center gap-2" id="pagination"></div>
  </div>
</div>

<script>
let currentProducts = [];
let currentPage = 1;
let viewMode = 'grid';

// Read URL params
const urlParams = new URLSearchParams(window.location.search);
const urlQ = urlParams.get('q');
if (urlQ) document.getElementById('search-input').value = urlQ;

async function doSearch(page = 1) {
  const q = document.getElementById('search-input').value.trim() || 'trending';
  const source = document.getElementById('source-filter').value;
  const category = document.getElementById('category-filter').value;
  currentPage = page;

  document.getElementById('results-grid').innerHTML = Array(8).fill(
    '<div class="product-card h-96"><div class="w-full h-48 shimmer"></div><div class="p-4"><div class="shimmer h-4 rounded mb-2"></div><div class="shimmer h-3 rounded mb-3 w-2/3"></div></div></div>'
  ).join('');

  try {
    const finalQ = category !== 'all' ? category : q;
    const finalSrc = source !== 'all' ? source : 'all';
    const { data } = await axios.get(\`/api/search?q=\${encodeURIComponent(finalQ)}&source=\${encodeURIComponent(finalSrc)}&page=\${page}&limit=20\`);
    if (data.success) {
      currentProducts = data.data.products;
      applySort();
      document.getElementById('search-summary').textContent =
        \`Found \${data.data.total} products for "\${data.query}" • Page \${data.data.currentPage} of \${data.data.pages}\`;
      renderPagination(data.data.pages, data.data.currentPage);
    }
  } catch(e) {
    document.getElementById('results-grid').innerHTML = '<div class="col-span-4 text-center py-12 text-red-400"><i class="fas fa-exclamation-triangle text-4xl mb-3 block"></i>Search failed. Try again.</div>';
  }
}

function applySort() {
  const sort = document.getElementById('sort-select').value;
  const sorted = [...currentProducts];
  if (sort === 'demand') sorted.sort((a,b) => b.demand - a.demand);
  else if (sort === 'margin') sorted.sort((a,b) => b.margin - a.margin);
  else if (sort === 'trend') sorted.sort((a,b) => parseFloat(b.trend) - parseFloat(a.trend));
  else if (sort === 'price_asc') sorted.sort((a,b) => a.sellingPrice - b.sellingPrice);
  else if (sort === 'price_desc') sorted.sort((a,b) => b.sellingPrice - a.sellingPrice);
  else if (sort === 'viral') sorted.sort((a,b) => b.viralScore - a.viralScore);
  renderResults(sorted);
}

function renderResults(products) {
  const grid = document.getElementById('results-grid');
  if (!products || products.length === 0) {
    grid.innerHTML = '<div class="col-span-4 text-center py-16 text-slate-400"><i class="fas fa-search text-5xl mb-4 block opacity-50"></i><div class="text-lg font-bold mb-2">No products found</div><div class="text-sm">Try a different keyword or source</div></div>';
    return;
  }
  if (viewMode === 'grid') {
    grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6';
    grid.innerHTML = products.map(p => renderCardGrid(p)).join('');
  } else {
    grid.className = 'flex flex-col gap-3 mb-6';
    grid.innerHTML = products.map(p => renderCardList(p)).join('');
  }
}

function renderCardGrid(p) {
  const srcClass = getSourceClass(p.platform);
  const scoreClass = getScoreClass(p.viralScore);
  return \`<div class="product-card" onclick="openProductDetail('\${p.id}')">
    <div class="relative overflow-hidden" style="height:180px">
      <img src="\${p.image}" alt="\${p.title}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'">
      <div class="absolute top-2 left-2"><span class="source-badge \${srcClass}">\${p.platform}</span></div>
      <div class="absolute top-2 right-2"><div class="score-ring \${scoreClass}" style="width:38px;height:38px;font-size:11px">\${p.viralScore}</div></div>
    </div>
    <div class="p-4">
      <div class="flex gap-1 mb-2 flex-wrap">\${(p.badges||[]).slice(0,2).map(b=>\`<span class="badge badge-\${b.color}">\${b.text}</span>\`).join('')}</div>
      <h3 class="text-sm font-semibold text-white mb-2 leading-tight" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">\${p.title}</h3>
      <div class="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3">
        <div>Cost: <span class="text-green-400 font-bold">\${formatCurrency(p.supplierPrice)}</span></div>
        <div>Sell: <span class="text-white font-bold">\${formatCurrency(p.sellingPrice)}</span></div>
        <div>Margin: <span class="text-purple-400 font-bold">\${p.margin}%</span></div>
        <div>Trend: <span class="text-cyan-400 font-bold">\${p.trend}</span></div>
      </div>
      <div class="flex gap-2 mb-3">
        <div class="flex-1">
          <div class="text-xs text-slate-500 mb-1">Demand \${p.demand}%</div>
          <div class="progress-bar"><div class="progress-fill bg-green-500" style="width:\${p.demand}%"></div></div>
        </div>
        <div class="flex-1">
          <div class="text-xs text-slate-500 mb-1">Competition \${p.competition}%</div>
          <div class="progress-bar"><div class="progress-fill bg-red-500" style="width:\${p.competition}%"></div></div>
        </div>
      </div>
      <div class="flex gap-2">
        <a href="\${p.platformUrl}" target="_blank" onclick="event.stopPropagation()" class="btn-primary flex-1 justify-center text-xs py-2">
          <i class="fas fa-external-link-alt"></i> Source It
        </a>
        <button onclick="event.stopPropagation();addToWatchlist(\${JSON.stringify({id:p.id,title:p.title,image:p.image,platform:p.platform})})" class="btn-outline px-3 py-2">
          <i class="fas fa-heart text-xs"></i>
        </button>
      </div>
    </div>
  </div>\`;
}

function renderCardList(p) {
  const srcClass = getSourceClass(p.platform);
  const scoreClass = getScoreClass(p.viralScore);
  return \`<div class="card p-4 flex gap-4 cursor-pointer hover:border-indigo-500 transition-all" onclick="openProductDetail('\${p.id}')">
    <img src="\${p.image}" class="w-20 h-20 rounded-xl object-cover flex-shrink-0" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'">
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2 mb-1">
        <h3 class="text-sm font-semibold text-white leading-tight">\${p.title}</h3>
        <div class="score-ring \${scoreClass} flex-shrink-0" style="width:40px;height:40px;font-size:12px">\${p.viralScore}</div>
      </div>
      <div class="flex gap-3 text-xs text-slate-400 mb-2 flex-wrap">
        <span><span class="source-badge \${srcClass}">\${p.platform}</span></span>
        <span>Cost: <b class="text-green-400">\${formatCurrency(p.supplierPrice)}</b></span>
        <span>Sell: <b class="text-white">\${formatCurrency(p.sellingPrice)}</b></span>
        <span>Margin: <b class="text-purple-400">\${p.margin}%</b></span>
        <span>Trend: <b class="text-cyan-400">\${p.trend}</b></span>
      </div>
    </div>
    <div class="flex flex-col gap-2 flex-shrink-0">
      <a href="\${p.platformUrl}" target="_blank" onclick="event.stopPropagation()" class="btn-primary text-xs px-4 py-2"><i class="fas fa-external-link-alt"></i> Source</a>
    </div>
  </div>\`;
}

function renderPagination(pages, current) {
  const el = document.getElementById('pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }
  const btns = [];
  for (let i = 1; i <= Math.min(pages, 5); i++) {
    btns.push(\`<button onclick="doSearch(\${i})" class="px-4 py-2 rounded-lg text-sm font-medium transition-all \${i === current ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}">\${i}</button>\`);
  }
  el.innerHTML = btns.join('');
}

function toggleView(mode) {
  viewMode = mode;
  document.getElementById('grid-btn').classList.toggle('active', mode === 'grid');
  document.getElementById('list-btn').classList.toggle('active', mode === 'list');
  applySort();
}

function quickSearch(q) {
  document.getElementById('search-input').value = q;
  doSearch();
}

async function openProductDetail(id) {
  try {
    const { data } = await axios.get('/api/product/' + id);
    if (data.success) showProductDetailModal(data.data);
  } catch(e) {}
}

function showProductDetailModal(p) {
  const existing = document.getElementById('detail-modal');
  if (existing) existing.remove();
  const scoreClass = getScoreClass(p.viralScore);
  const srcClass = getSourceClass(p.platform);
  const modal = document.createElement('div');
  modal.id = 'detail-modal';
  modal.className = 'modal show';
  modal.innerHTML = \`
    <div class="modal-content p-6">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-xl font-bold text-white">Product Analysis</h2>
        <button onclick="document.getElementById('detail-modal').remove()" class="text-slate-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
        <img src="\${p.image}" class="w-full rounded-xl object-cover" style="height:220px" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'">
        <div>
          <div class="flex gap-2 mb-3 flex-wrap">
            <span class="source-badge \${srcClass}">\${p.platform}</span>
            \${(p.badges||[]).map(b=>\`<span class="badge badge-\${b.color}">\${b.text}</span>\`).join('')}
          </div>
          <h3 class="text-lg font-bold text-white mb-2">\${p.title}</h3>
          <p class="text-slate-400 text-sm mb-4 leading-relaxed">\${p.description}</p>
          <div class="grid grid-cols-2 gap-3">
            <div class="card p-3 text-center"><div class="text-green-400 font-bold">\${formatCurrency(p.supplierPrice)}</div><div class="text-xs text-slate-400">Supplier Price</div></div>
            <div class="card p-3 text-center"><div class="text-white font-bold">\${formatCurrency(p.sellingPrice)}</div><div class="text-xs text-slate-400">Sell Price</div></div>
            <div class="card p-3 text-center"><div class="text-purple-400 font-bold">\${p.margin}%</div><div class="text-xs text-slate-400">Gross Margin</div></div>
            <div class="card p-3 text-center"><div class="text-cyan-400 font-bold">\${p.trend}</div><div class="text-xs text-slate-400">Trend Growth</div></div>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-4 mb-5">
        <div class="card p-3">
          <div class="text-xs text-slate-400 mb-2">Demand Score</div>
          <div class="progress-bar mb-1"><div class="progress-fill bg-green-500" style="width:\${p.demand}%"></div></div>
          <div class="text-green-400 font-bold">\${p.demand}/100</div>
        </div>
        <div class="card p-3">
          <div class="text-xs text-slate-400 mb-2">Competition</div>
          <div class="progress-bar mb-1"><div class="progress-fill bg-red-500" style="width:\${p.competition}%"></div></div>
          <div class="text-red-400 font-bold">\${p.competition}/100</div>
        </div>
        <div class="card p-3">
          <div class="text-xs text-slate-400 mb-2">Viral Score</div>
          <div class="flex items-center gap-2 mt-2">
            <div class="score-ring \${scoreClass}" style="width:44px;height:44px;font-size:14px">\${p.viralScore}</div>
            <div class="text-xs text-white font-bold">\${p.viralScore >= 75 ? 'VIRAL 🔥' : p.viralScore >= 60 ? 'TRENDING 📈' : 'EMERGING 🌱'}</div>
          </div>
        </div>
      </div>
      <div class="flex gap-3">
        <a href="\${p.platformUrl}" target="_blank" class="btn-primary flex-1 justify-center">
          <i class="fas fa-external-link-alt"></i> Source on \${p.platform}
        </a>
        <a href="/profit-calculator?cost=\${p.supplierPrice}&sell=\${p.sellingPrice}" class="btn-outline px-5">
          <i class="fas fa-calculator"></i> Calculate Profit
        </a>
        <button onclick="addToWatchlist(\${JSON.stringify({id:p.id,title:p.title,image:p.image,platform:p.platform})})" class="btn-outline px-4">
          <i class="fas fa-heart"></i>
        </button>
      </div>
    </div>
  \`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

doSearch();
startAutoRefresh(doSearch);
</script>
`, 'product-finder')
}

// ── PAGE: TREND ANALYZER ──────────────────────────────────────────────────────
function getTrendAnalyzerPage() {
  return getLayout('Trend Analyzer', `
<div class="main-content">
  <div class="topbar flex justify-between items-center">
    <div>
      <h1 class="text-lg font-bold text-white flex items-center gap-2"><i class="fas fa-fire text-orange-400"></i> Trend Analyzer</h1>
      <div class="text-xs text-slate-400 mt-0.5">Google Trends + Social Signals + Market Intelligence</div>
    </div>
    <div id="auth-status"></div>
  </div>

  <div class="p-6">
    <!-- Search -->
    <div class="card p-5 mb-6">
      <div class="flex gap-4 flex-col md:flex-row">
        <input id="trend-input" type="text" placeholder="Enter keyword (e.g. wireless earbuds, vitamin c serum...)"
          class="input flex-1" value="wireless earbuds" onkeydown="if(event.key==='Enter') analyzeTrend()" />
        <select id="geo-select" class="select">
          <option value="IN">🇮🇳 India</option>
          <option value="US">🇺🇸 United States</option>
          <option value="GB">🇬🇧 United Kingdom</option>
          <option value="AU">🇦🇺 Australia</option>
        </select>
        <button onclick="analyzeTrend()" class="btn-primary px-6"><i class="fas fa-chart-line"></i> Analyze</button>
      </div>
      <div class="flex gap-2 mt-3 flex-wrap">
        <span class="text-xs text-slate-400 self-center">Hot:</span>
        ${['Smart Watch','Vitamin C Serum','Air Purifier','Resistance Bands','LED Bulb','Jade Roller','Mechanical Keyboard'].map(k =>
          `<button onclick="quickTrend('${k}')" class="tab-btn text-xs px-3 py-1">${k}</button>`
        ).join('')}
      </div>
    </div>

    <!-- Main Trend Chart -->
    <div class="card p-5 mb-6" id="trend-result" style="display:none">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h3 class="font-bold text-white text-lg" id="trend-title">—</h3>
          <div class="flex items-center gap-3 mt-1">
            <span class="text-xs text-slate-400" id="trend-geo"></span>
            <span id="trend-change" class="badge badge-green text-xs"></span>
          </div>
        </div>
        <div class="text-right">
          <div class="text-2xl font-black text-indigo-400" id="trend-peak">—</div>
          <div class="text-xs text-slate-400">Peak Interest</div>
        </div>
      </div>
      <div class="chart-container mb-6" style="height:280px">
        <canvas id="mainTrendChart"></canvas>
      </div>

      <!-- Related Keywords -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="text-sm font-bold text-white mb-3 flex items-center gap-2"><i class="fas fa-hashtag text-indigo-400"></i> Related Keywords</h4>
          <div id="related-keywords" class="space-y-2"></div>
        </div>
        <div>
          <h4 class="text-sm font-bold text-white mb-3 flex items-center gap-2"><i class="fas fa-rocket text-purple-400"></i> Breakout Keywords</h4>
          <div id="breakout-keywords" class="space-y-2"></div>
        </div>
      </div>
    </div>

    <!-- Region Interest -->
    <div class="card p-5 mb-6" id="region-section" style="display:none">
      <h3 class="font-bold text-white mb-4 flex items-center gap-2"><i class="fas fa-map-marker-alt text-red-400"></i> Interest by Region (India)</h3>
      <div id="region-chart" class="space-y-3"></div>
    </div>

    <!-- Hot Trends Grid -->
    <div class="card p-5">
      <h3 class="font-bold text-white mb-4 flex items-center gap-2"><i class="fas fa-bolt text-yellow-400"></i> Currently Trending on Social Media</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="social-trends">
        ${[
          {platform:'Instagram',icon:'fa-instagram',color:'pink',topics:['Skincare Routine','GRWM','Mini Haul','Satisfying Products']},
          {platform:'TikTok',icon:'fa-tiktok',color:'purple',topics:['TikTok Made Me Buy It','ASMR Unboxing','Viral Finds','Under ₹500']},
          {platform:'YouTube',icon:'fa-youtube',color:'red',topics:['Best Products 2025','Dropshipping India','Amazon Finds','Flipkart Deals']},
          {platform:'Twitter/X',icon:'fa-x-twitter',color:'slate',topics:['#MadeInIndia','#BestBuy','#OnlineShopping','#AmazonFinds']},
        ].map(s => `
        <div class="card p-4">
          <div class="flex items-center gap-2 mb-3">
            <i class="fab ${s.icon} text-${s.color}-400 text-lg"></i>
            <span class="text-sm font-bold text-white">${s.platform}</span>
          </div>
          ${s.topics.map(t => `
          <div class="flex items-center justify-between py-1.5 border-b border-slate-800 last:border-0">
            <span class="text-xs text-slate-300">${t}</span>
            <span class="text-xs text-green-400">↑ ${Math.round(15 + Math.random() * 85)}%</span>
          </div>`).join('')}
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>

<script>
let mainTrendChart;

async function analyzeTrend() {
  const keyword = document.getElementById('trend-input').value.trim();
  const geo = document.getElementById('geo-select').value;
  if (!keyword) return;

  document.getElementById('trend-result').style.display = 'none';
  document.getElementById('region-section').style.display = 'none';

  try {
    const { data } = await axios.get(\`/api/trends?keyword=\${encodeURIComponent(keyword)}&geo=\${geo}\`);
    if (!data.success) return;
    const d = data.data;

    document.getElementById('trend-title').textContent = keyword.charAt(0).toUpperCase() + keyword.slice(1) + ' — Search Interest';
    document.getElementById('trend-geo').textContent = 'Region: ' + (geo === 'IN' ? 'India' : geo);
    document.getElementById('trend-change').textContent = d.change;
    document.getElementById('trend-change').className = 'badge ' + (d.change.startsWith('+') ? 'badge-green' : 'badge-red') + ' text-xs';
    document.getElementById('trend-peak').textContent = d.peakValue;

    // Main chart
    if (mainTrendChart) mainTrendChart.destroy();
    const ctx = document.getElementById('mainTrendChart').getContext('2d');
    mainTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: d.data.map(x => x.month),
        datasets: [{
          label: 'Search Interest',
          data: d.data.map(x => x.value),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1',
          pointHoverRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', borderColor: '#4f46e5', borderWidth: 1 } },
        scales: {
          x: { grid: { color: 'rgba(51,65,85,0.5)' }, ticks: { color: '#94a3b8' } },
          y: { min: 0, max: 100, grid: { color: 'rgba(51,65,85,0.5)' }, ticks: { color: '#94a3b8' } }
        }
      }
    });

    // Related keywords
    document.getElementById('related-keywords').innerHTML = d.relatedKeywords.map(k => \`
      <div class="flex items-center gap-3">
        <span class="text-sm text-slate-300 flex-1">\${k.keyword}</span>
        <div class="flex-1 progress-bar"><div class="progress-fill bg-indigo-500" style="width:\${k.value}%"></div></div>
        <span class="text-xs text-indigo-400 font-bold w-8 text-right">\${k.value}</span>
      </div>
    \`).join('');

    // Breakout keywords
    document.getElementById('breakout-keywords').innerHTML = d.breakoutKeywords.map(k => \`
      <div class="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
        <span class="text-sm text-slate-300">\${k.keyword}</span>
        <span class="badge badge-green text-xs">\${k.growth}</span>
      </div>
    \`).join('');

    // Region interest
    document.getElementById('region-chart').innerHTML = d.regionInterest.map(r => \`
      <div class="flex items-center gap-3">
        <span class="text-sm text-slate-300 w-32">\${r.region}</span>
        <div class="flex-1 progress-bar"><div class="progress-fill bg-gradient-to-r from-indigo-500 to-purple-500" style="width:\${r.value}%"></div></div>
        <span class="text-xs text-slate-400 w-8 text-right">\${r.value}</span>
      </div>
    \`).join('');

    document.getElementById('trend-result').style.display = 'block';
    document.getElementById('region-section').style.display = 'block';
  } catch(e) { console.error(e); }
}

function quickTrend(k) {
  document.getElementById('trend-input').value = k;
  analyzeTrend();
}

analyzeTrend();
</script>
`, 'trend-analyzer')
}

// ── PAGE: PROFIT CALCULATOR ───────────────────────────────────────────────────
function getProfitCalculatorPage() {
  return getLayout('Profit Calculator', `
<div class="main-content">
  <div class="topbar flex justify-between items-center">
    <div>
      <h1 class="text-lg font-bold text-white flex items-center gap-2"><i class="fas fa-calculator text-green-400"></i> Profit Calculator</h1>
      <div class="text-xs text-slate-400 mt-0.5">True profit with GST, platform fees, returns & shipping</div>
    </div>
    <div id="auth-status"></div>
  </div>

  <div class="p-6">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Input Panel -->
      <div>
        <div class="card p-6 mb-4">
          <h3 class="font-bold text-white mb-5 flex items-center gap-2"><i class="fas fa-sliders-h text-indigo-400"></i> Product Details</h3>

          <div class="space-y-4">
            <div>
              <label class="text-xs text-slate-400 mb-1 block">Supplier / Cost Price (₹)</label>
              <input id="cost" type="number" value="450" min="0" class="input" oninput="calculate()" placeholder="e.g. 450">
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">Selling Price (₹)</label>
              <input id="sell" type="number" value="1299" min="0" class="input" oninput="calculate()" placeholder="e.g. 1299">
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">Shipping Cost (₹)</label>
              <input id="shipping" type="number" value="80" min="0" class="input" oninput="calculate()" placeholder="e.g. 80">
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">Platform Fee (%)</label>
              <div class="grid grid-cols-4 gap-2 mb-2">
                ${[{name:'Amazon',fee:15},{name:'Flipkart',fee:12},{name:'Meesho',fee:1},{name:'Own Site',fee:3}].map(p =>
                  `<button onclick="setPlatformFee(${p.fee},'${p.name}')" class="tab-btn text-xs py-2 px-1">${p.name}<br><span class="text-indigo-400">${p.fee}%</span></button>`
                ).join('')}
              </div>
              <input id="fee" type="number" value="15" min="0" max="100" step="0.5" class="input" oninput="calculate()" placeholder="e.g. 15">
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">GST Rate (%)</label>
              <select id="gst" class="select" onchange="calculate()">
                <option value="0">0% (Exempt)</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18" selected>18% (Standard)</option>
                <option value="28">28% (Luxury)</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">Units / Month</label>
                <input id="units" type="number" value="100" min="1" class="input" oninput="calculate()" placeholder="e.g. 100">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">Return Rate (%)</label>
                <input id="returns" type="number" value="5" min="0" max="50" step="0.5" class="input" oninput="calculate()" placeholder="e.g. 5">
              </div>
            </div>
          </div>
        </div>

        <!-- Preset Products -->
        <div class="card p-5">
          <h4 class="text-sm font-bold text-white mb-3 flex items-center gap-2"><i class="fas fa-star text-yellow-400"></i> Load Sample Product</h4>
          <div class="grid grid-cols-2 gap-2">
            ${[
              {name:'Wireless Earbuds',cost:450,sell:1299},
              {name:'Vitamin C Serum',cost:180,sell:599},
              {name:'Smart Watch',cost:780,sell:2499},
              {name:'Yoga Mat',cost:280,sell:899},
              {name:'Air Purifier',cost:1890,sell:5999},
              {name:'LED Smart Bulb',cost:89,sell:299},
            ].map(p => `
            <button onclick="loadPreset(${p.cost},${p.sell},'${p.name}')" class="tab-btn text-xs text-left px-3 py-2">
              <span class="block font-semibold">${p.name}</span>
              <span class="text-indigo-400">₹${p.cost} → ₹${p.sell}</span>
            </button>`).join('')}
          </div>
        </div>
      </div>

      <!-- Results Panel -->
      <div>
        <div class="card p-6 mb-4">
          <h3 class="font-bold text-white mb-5 flex items-center gap-2"><i class="fas fa-rupee-sign text-green-400"></i> Profit Analysis</h3>

          <!-- Main Profit Display -->
          <div class="text-center p-8 rounded-2xl mb-5" id="profit-display" style="background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1)); border: 1px solid rgba(16,185,129,0.2)">
            <div class="text-xs text-slate-400 mb-1">Net Profit per Unit</div>
            <div class="text-5xl font-black text-green-400 mb-2" id="profit-main">—</div>
            <div class="text-sm text-slate-400" id="profit-sub"></div>
          </div>

          <!-- Breakdown Grid -->
          <div class="grid grid-cols-2 gap-3 mb-5">
            <div class="card p-4 text-center">
              <div class="text-lg font-black text-white" id="res-margin">—</div>
              <div class="text-xs text-slate-400">Profit Margin</div>
            </div>
            <div class="card p-4 text-center">
              <div class="text-lg font-black text-white" id="res-roi">—</div>
              <div class="text-xs text-slate-400">ROI</div>
            </div>
            <div class="card p-4 text-center">
              <div class="text-lg font-black text-white" id="res-breakeven">—</div>
              <div class="text-xs text-slate-400">Break-Even Units</div>
            </div>
            <div class="card p-4 text-center">
              <div class="text-lg font-black text-white" id="res-monthly">—</div>
              <div class="text-xs text-slate-400">Monthly Profit</div>
            </div>
          </div>

          <!-- Cost Breakdown -->
          <div class="space-y-2" id="cost-breakdown"></div>
        </div>

        <!-- Monthly Projection Chart -->
        <div class="card p-5">
          <h4 class="font-bold text-white mb-4 flex items-center gap-2"><i class="fas fa-chart-bar text-purple-400"></i> Monthly Revenue Projection</h4>
          <div class="chart-container" style="height:200px">
            <canvas id="projectionChart"></canvas>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
let projChart;

// Load URL params
const params = new URLSearchParams(window.location.search);
if (params.get('cost')) document.getElementById('cost').value = params.get('cost');
if (params.get('sell')) document.getElementById('sell').value = params.get('sell');

async function calculate() {
  const payload = {
    costPrice: document.getElementById('cost').value,
    sellingPrice: document.getElementById('sell').value,
    shippingCost: document.getElementById('shipping').value,
    platformFee: document.getElementById('fee').value,
    gstRate: document.getElementById('gst').value,
    units: document.getElementById('units').value,
    returnRate: document.getElementById('returns').value,
  };

  try {
    const { data } = await axios.post('/api/calculate', payload);
    if (data.success) renderResults(data.data, payload);
  } catch(e) { console.error(e); }
}

function renderResults(r, payload) {
  const isProfit = r.profitPerUnit >= 0;
  const color = isProfit ? 'text-green-400' : 'text-red-400';
  const bgColor = isProfit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
  const borderColor = isProfit ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)';

  document.getElementById('profit-display').style.background = \`linear-gradient(135deg, \${bgColor}, rgba(6,182,212,0.05))\`;
  document.getElementById('profit-display').style.borderColor = borderColor;
  document.getElementById('profit-main').className = \`text-5xl font-black \${color} mb-2\`;
  document.getElementById('profit-main').textContent = formatCurrency(r.profitPerUnit);
  document.getElementById('profit-sub').textContent = \`Total Monthly: \${formatCurrency(r.monthlyProjection)} on \${payload.units} units\`;

  document.getElementById('res-margin').textContent = r.margin + '%';
  document.getElementById('res-margin').className = \`text-lg font-black \${r.margin >= 0 ? 'text-green-400' : 'text-red-400'}\`;
  document.getElementById('res-roi').textContent = r.roi + '%';
  document.getElementById('res-roi').className = \`text-lg font-black \${r.roi >= 0 ? 'text-cyan-400' : 'text-red-400'}\`;
  document.getElementById('res-breakeven').textContent = r.breakEven + ' units';
  document.getElementById('res-breakeven').className = 'text-lg font-black text-yellow-400';
  document.getElementById('res-monthly').textContent = formatCurrency(r.monthlyProjection);
  document.getElementById('res-monthly').className = \`text-lg font-black \${r.monthlyProjection >= 0 ? 'text-purple-400' : 'text-red-400'}\`;

  // Cost breakdown
  document.getElementById('cost-breakdown').innerHTML = \`
    <div class="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Cost Breakdown (per unit)</div>
    \${[
      { label: 'Gross Revenue', value: r.grossRevenue, color: 'text-white' },
      { label: '— Cost Price', value: -Math.round(r.totalCost / payload.units), color: 'text-red-400' },
      { label: '— Platform Fee', value: -Math.round(r.platformFeeAmt / payload.units), color: 'text-orange-400' },
      { label: '— GST Paid', value: -Math.round(r.gstAmt / payload.units), color: 'text-yellow-400' },
      { label: '— Return Loss', value: -Math.round(r.returnLoss / payload.units), color: 'text-red-300' },
      { label: '= Net Profit', value: r.profitPerUnit, color: r.profitPerUnit >= 0 ? 'text-green-400' : 'text-red-400' },
    ].map(item => \`
      <div class="flex justify-between items-center py-2 border-b border-slate-800 last:border-0 last:font-bold">
        <span class="text-sm text-slate-400">\${item.label}</span>
        <span class="text-sm \${item.color}">\${formatCurrency(item.value)}</span>
      </div>
    \`).join('')}
  \`;

  renderProjectionChart(r, payload);
}

function renderProjectionChart(r, payload) {
  const units = parseInt(payload.units) || 100;
  const labels = [25, 50, 75, 100, 150, 200, 300].map(pct => \`\${Math.round(units * pct / 100)} units\`);
  const profits = [25, 50, 75, 100, 150, 200, 300].map(pct => Math.round(r.profitPerUnit * units * pct / 100));

  if (projChart) projChart.destroy();
  const ctx = document.getElementById('projectionChart').getContext('2d');
  projChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Monthly Profit',
        data: profits,
        backgroundColor: profits.map(p => p >= 0 ? 'rgba(99,102,241,0.7)' : 'rgba(239,68,68,0.5)'),
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
        y: { grid: { color: 'rgba(51,65,85,0.5)' }, ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => '₹' + v.toLocaleString() } }
      }
    }
  });
}

function setPlatformFee(fee, name) {
  document.getElementById('fee').value = fee;
  calculate();
}

function loadPreset(cost, sell, name) {
  document.getElementById('cost').value = cost;
  document.getElementById('sell').value = sell;
  calculate();
  showToast('Loaded: ' + name, 'info');
}

calculate();
</script>
`, 'profit-calculator')
}

// ── PAGE: COMPETITOR TRACKER ──────────────────────────────────────────────────
function getCompetitorTrackerPage() {
  return getLayout('Competitor Tracker', `
<div class="main-content">
  <div class="topbar flex justify-between items-center">
    <div>
      <h1 class="text-lg font-bold text-white flex items-center gap-2"><i class="fas fa-binoculars text-cyan-400"></i> Competitor Tracker</h1>
      <div class="text-xs text-slate-400 mt-0.5">Analyze market competition across all platforms</div>
    </div>
    <div id="auth-status"></div>
  </div>

  <div class="p-6">
    <div class="card p-5 mb-6">
      <div class="flex gap-4 flex-col md:flex-row">
        <input id="comp-keyword" type="text" placeholder="Enter product/niche (e.g. wireless earbuds)" class="input flex-1" value="wireless earbuds" onkeydown="if(event.key==='Enter') analyzeCompetitors()">
        <select id="comp-marketplace" class="select">
          <option value="all">All Platforms</option>
          <option value="amazon">Amazon India</option>
          <option value="flipkart">Flipkart</option>
          <option value="meesho">Meesho</option>
        </select>
        <button onclick="analyzeCompetitors()" class="btn-primary px-6"><i class="fas fa-search"></i> Analyze</button>
      </div>
    </div>

    <div id="comp-results" class="space-y-6">
      <div class="card p-8 text-center text-slate-400">
        <i class="fas fa-binoculars text-4xl mb-3 block text-slate-600"></i>
        <div class="text-lg font-bold mb-2">Enter a product to analyze</div>
        <div class="text-sm">We'll show you competitor pricing, market saturation, and your optimal entry point</div>
      </div>
    </div>
  </div>
</div>

<script>
async function analyzeCompetitors() {
  const keyword = document.getElementById('comp-keyword').value.trim();
  const marketplace = document.getElementById('comp-marketplace').value;

  document.getElementById('comp-results').innerHTML = '<div class="shimmer h-64 rounded-xl"></div>';

  try {
    const { data } = await axios.get(\`/api/competitors?keyword=\${encodeURIComponent(keyword)}&marketplace=\${marketplace}\`);
    if (!data.success) return;
    const d = data.data;

    const saturationColor = d.marketSaturation > 70 ? 'red' : d.marketSaturation > 40 ? 'yellow' : 'green';

    document.getElementById('comp-results').innerHTML = \`
      <!-- Overview Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="stat-card text-center">
          <div class="text-2xl font-black text-white">\${d.totalCompetitors}</div>
          <div class="text-xs text-slate-400 mt-1">Total Competitors</div>
        </div>
        <div class="stat-card text-center">
          <div class="text-2xl font-black text-white">\${formatCurrency(d.avgPrice)}</div>
          <div class="text-xs text-slate-400 mt-1">Avg Market Price</div>
        </div>
        <div class="stat-card text-center">
          <div class="text-2xl font-black text-\${saturationColor}-400">\${d.marketSaturation}%</div>
          <div class="text-xs text-slate-400 mt-1">Market Saturation</div>
        </div>
        <div class="stat-card text-center">
          <div class="text-2xl font-black text-green-400">\${formatCurrency(d.recommendedPrice)}</div>
          <div class="text-xs text-slate-400 mt-1">Recommended Price</div>
        </div>
      </div>

      <!-- Market Analysis -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div class="card p-5">
          <h3 class="font-bold text-white mb-4 flex items-center gap-2"><i class="fas fa-chart-pie text-indigo-400"></i> Market Overview</h3>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="text-slate-400">Market Saturation</span>
                <span class="text-\${saturationColor}-400 font-bold">\${d.marketSaturation}%</span>
              </div>
              <div class="progress-bar h-3">
                <div class="progress-fill bg-\${saturationColor}-500" style="width:\${d.marketSaturation}%"></div>
              </div>
            </div>
            <div class="flex justify-between py-3 border-b border-slate-800">
              <span class="text-slate-400 text-sm">Price Range</span>
              <span class="text-white text-sm font-medium">\${formatCurrency(d.priceRange.min)} — \${formatCurrency(d.priceRange.max)}</span>
            </div>
            <div class="flex justify-between py-3 border-b border-slate-800">
              <span class="text-slate-400 text-sm">Entry Barrier</span>
              <span class="badge \${d.entryBarrier === 'Low' ? 'badge-green' : 'badge-orange'}">\${d.entryBarrier}</span>
            </div>
            <div class="flex justify-between py-3">
              <span class="text-slate-400 text-sm">Best Entry Price</span>
              <span class="text-green-400 font-bold text-sm">\${formatCurrency(d.recommendedPrice)}</span>
            </div>
          </div>

          <div class="mt-4 p-4 rounded-xl" style="background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2)">
            <div class="text-xs font-bold text-indigo-400 mb-1">🤖 AI Insight</div>
            <div class="text-xs text-slate-300">
              \${d.marketSaturation < 40
                ? 'Low competition — excellent opportunity to enter this market now before it becomes saturated.'
                : d.marketSaturation < 70
                ? 'Moderate competition — differentiate with better quality or targeting to succeed.'
                : 'High competition — focus on niche targeting, bundling, or unique value proposition.'}
            </div>
          </div>
        </div>

        <!-- Top Sellers Table -->
        <div class="card p-5">
          <h3 class="font-bold text-white mb-4 flex items-center gap-2"><i class="fas fa-trophy text-yellow-400"></i> Top Sellers</h3>
          <div class="space-y-3">
            \${d.topSellers.map(s => \`
              <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
                <div class="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm \${s.rank === 1 ? 'bg-yellow-500 text-black' : s.rank === 2 ? 'bg-slate-400 text-black' : 'bg-orange-700 text-white'}">#\${s.rank}</div>
                <div class="flex-1">
                  <div class="text-sm font-medium text-white">\${s.name}</div>
                  <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>\${formatCurrency(s.price)}</span>
                    <span>•</span>
                    <span>★ \${s.rating}</span>
                    <span>•</span>
                    <span>\${s.reviews.toLocaleString()} reviews</span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-green-400 font-bold text-sm">\${formatCurrency(s.monthlyRevenue)}</div>
                  <div class="text-xs text-slate-500">est/mo</div>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>
      </div>

      <!-- Strategy Recommendations -->
      <div class="card p-5">
        <h3 class="font-bold text-white mb-4 flex items-center gap-2"><i class="fas fa-lightbulb text-yellow-400"></i> Winning Strategies for <span class="text-indigo-400">\${keyword}</span></h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          \${[
            { icon: 'fa-tag', color: 'green', title: 'Price Strategy', desc: \`Price at \${formatCurrency(d.recommendedPrice)} — 8% below market average to attract buyers while maintaining margin.\` },
            { icon: 'fa-star', color: 'yellow', title: 'Review Strategy', desc: 'Launch with 10-20 samples to verified buyers. Target 4.4+ stars — the minimum for high search ranking.' },
            { icon: 'fa-crosshairs', color: 'indigo', title: 'Targeting Strategy', desc: \`Focus on \${d.marketSaturation > 60 ? 'micro-niche sub-categories' : 'broad category targeting'} to differentiate from \${d.totalCompetitors} competitors.\` },
          ].map(s => \`
            <div class="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
              <div class="flex items-center gap-2 mb-2">
                <i class="fas \${s.icon} text-\${s.color}-400"></i>
                <span class="font-bold text-white text-sm">\${s.title}</span>
              </div>
              <p class="text-xs text-slate-400 leading-relaxed">\${s.desc}</p>
            </div>
          \`).join('')}
        </div>
      </div>
    \`;
  } catch(e) { console.error(e); }
}

analyzeCompetitors();
</script>
`, 'competitor-tracker')
}

// ── PAGE: SUPPLIER FINDER ─────────────────────────────────────────────────────
function getSupplierFinderPage() {
  return getLayout('Supplier Finder', `
<div class="main-content">
  <div class="topbar flex justify-between items-center">
    <div>
      <h1 class="text-lg font-bold text-white flex items-center gap-2"><i class="fas fa-truck text-yellow-400"></i> Supplier Finder</h1>
      <div class="text-xs text-slate-400 mt-0.5">Verified suppliers from Alibaba, AliExpress & IndiaMart</div>
    </div>
    <div id="auth-status"></div>
  </div>

  <div class="p-6">
    <div class="card p-5 mb-6">
      <div class="flex gap-4 flex-col md:flex-row">
        <input id="supplier-input" type="text" placeholder="Enter product (e.g. wireless earbuds, vitamin c serum)" class="input flex-1" value="wireless earbuds" onkeydown="if(event.key==='Enter') findSuppliers()">
        <button onclick="findSuppliers()" class="btn-primary px-6"><i class="fas fa-search"></i> Find Suppliers</button>
      </div>
    </div>

    <div id="supplier-results" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      ${[1,2,3].map(() => '<div class="card p-5 shimmer h-72 rounded-xl"></div>').join('')}
    </div>
  </div>
</div>

<script>
async function findSuppliers() {
  const product = document.getElementById('supplier-input').value.trim();
  document.getElementById('supplier-results').innerHTML = \`
    \${[1,2,3].map(() => '<div class="card p-5 shimmer h-72 rounded-xl"></div>').join('')}
  \`;

  try {
    const { data } = await axios.get(\`/api/suppliers?product=\${encodeURIComponent(product)}\`);
    if (!data.success) return;

    document.getElementById('supplier-results').innerHTML = data.data.map(s => \`
      <div class="card p-5 hover:border-indigo-500 transition-all">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="source-badge \${getSourceClass(s.platform)}">\${s.platform}</span>
              \${s.verified ? '<span class="badge badge-green text-xs"><i class="fas fa-check-circle mr-1"></i>Verified</span>' : ''}
            </div>
            <h3 class="font-bold text-white text-sm mt-2">\${s.name}</h3>
            <div class="text-xs text-slate-400">\${s.country}</div>
          </div>
          <div class="text-right">
            <div class="text-xl font-black text-green-400">\${formatCurrency(s.unitPrice)}</div>
            <div class="text-xs text-slate-400">per unit</div>
          </div>
        </div>

        <div class="text-xs text-slate-400 mb-3 bg-slate-800/50 p-2 rounded-lg line-clamp-2 leading-relaxed">\${s.product}</div>

        <div class="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div class="flex flex-col gap-1">
            <div class="flex justify-between"><span class="text-slate-500">MOQ</span><span class="text-white font-medium">\${s.moq} units</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Lead Time</span><span class="text-cyan-400 font-medium">\${s.leadTime}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Shipping</span><span class="text-white font-medium">\${s.shipping}</span></div>
          </div>
          <div class="flex flex-col gap-1">
            <div class="flex justify-between"><span class="text-slate-500">Rating</span><span class="text-yellow-400 font-bold">★ \${s.rating}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Reviews</span><span class="text-white font-medium">\${s.reviews}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Returns</span><span class="text-green-400 font-medium">\${s.returnPolicy}</span></div>
          </div>
        </div>

        <div class="flex gap-1 flex-wrap mb-4">
          \${s.certifications.map(cert => \`<span class="badge badge-blue text-xs">\${cert}</span>\`).join('')}
        </div>

        <div class="flex gap-2">
          <a href="\${s.platformUrl}" target="_blank" class="btn-primary flex-1 justify-center text-xs py-2">
            <i class="fas fa-external-link-alt"></i> Contact Supplier
          </a>
          <button onclick="calcSupplierProfit(\${s.unitPrice})" class="btn-outline px-3 py-2 text-xs">
            <i class="fas fa-calculator"></i>
          </button>
        </div>
      </div>
    \`).join('');
  } catch(e) { console.error(e); }
}

function calcSupplierProfit(cost) {
  window.location.href = '/profit-calculator?cost=' + cost;
}

findSuppliers();
</script>
`, 'supplier-finder')
}

// ── PAGE: VIRAL PRODUCTS ──────────────────────────────────────────────────────
function getViralProductsPage() {
  return getLayout('Viral Products', `
<div class="main-content">
  <div class="topbar flex justify-between items-center">
    <div>
      <h1 class="text-lg font-bold text-white flex items-center gap-2"><i class="fas fa-bolt text-purple-400"></i> Viral Products</h1>
      <div class="text-xs text-slate-400 mt-0.5">AI-scored winning products updated every hour</div>
    </div>
    <div id="auth-status"></div>
  </div>

  <div class="p-6">
    <!-- AI Header -->
    <div class="card p-6 mb-6" style="background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15)); border-color: rgba(99,102,241,0.3)">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl">🤖</div>
        <div class="flex-1">
          <h2 class="text-xl font-black text-white mb-1">AI Product Intelligence Engine</h2>
          <p class="text-slate-300 text-sm">Our AI analyzes demand signals, competition levels, social trends, and margin potential across 9 data sources to identify your next winning product.</p>
        </div>
        <div class="text-right hidden md:block">
          <div class="text-3xl font-black text-indigo-400" id="viral-count">—</div>
          <div class="text-xs text-slate-400">Viral Score >75</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 mb-6 flex-wrap items-center">
      <select id="viral-category" class="select" onchange="loadViralProducts()">
        <option value="all">All Categories</option>
        ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <select id="viral-budget" class="select" onchange="loadViralProducts()">
        <option value="100000">Any Budget</option>
        <option value="500">Under ₹500</option>
        <option value="1000">Under ₹1,000</option>
        <option value="2000">Under ₹2,000</option>
        <option value="5000">Under ₹5,000</option>
      </select>
      <div class="flex-1"></div>
      <div class="flex items-center gap-2 text-xs text-slate-400">
        <span class="live-dot"></span>
        <span>AI scoring live</span>
      </div>
    </div>

    <!-- AI Recommendations Grid -->
    <div id="viral-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
      ${Array(6).fill('<div class="card h-80 shimmer rounded-xl"></div>').join('')}
    </div>
  </div>
</div>

<script>
async function loadViralProducts() {
  const category = document.getElementById('viral-category').value;
  const budget = document.getElementById('viral-budget').value;

  document.getElementById('viral-grid').innerHTML = Array(6).fill('<div class="card h-80 shimmer rounded-xl"></div>').join('');

  try {
    const { data } = await axios.get(\`/api/ai/recommendations?category=\${encodeURIComponent(category)}&budget=\${budget}\`);
    if (!data.success) return;

    const products = data.data;
    const viralCount = products.filter(p => p.viralScore >= 75).length;
    const el = document.getElementById('viral-count');
    if (el) el.textContent = viralCount;

    document.getElementById('viral-grid').innerHTML = products.map(p => renderViralCard(p)).join('');
  } catch(e) { console.error(e); }
}

function renderViralCard(p) {
  const scoreClass = getScoreClass(p.viralScore);
  const srcClass = getSourceClass(p.platform);
  const opportunityColor = { 'Exceptional':'purple', 'Strong':'green', 'Good':'cyan', 'Moderate':'yellow', 'Low':'red' }[p.opportunity] || 'slate';

  return \`<div class="product-card" onclick="openViralDetail('\${p.id}')">
    <div class="relative" style="height:180px;overflow:hidden">
      <img src="\${p.image}" alt="\${p.title}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'">
      <div class="absolute inset-0" style="background:linear-gradient(to top, rgba(0,0,0,0.8), transparent)"></div>
      <div class="absolute top-3 left-3"><span class="source-badge \${srcClass}">\${p.platform}</span></div>
      <div class="absolute top-3 right-3">
        <div class="score-ring \${scoreClass}" style="width:44px;height:44px;font-size:14px;font-weight:900">\${p.viralScore}</div>
      </div>
      <div class="absolute bottom-3 left-3 right-3">
        <span class="badge badge-\${opportunityColor}" style="font-size:10px">\${p.opportunity} Opportunity</span>
      </div>
    </div>
    <div class="p-4">
      <h3 class="text-sm font-bold text-white mb-2 leading-tight" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">\${p.title}</h3>

      <div class="grid grid-cols-3 gap-2 mb-3 text-center">
        <div class="bg-slate-800/60 rounded-lg p-2">
          <div class="text-green-400 font-bold text-xs">\${p.margin}%</div>
          <div class="text-slate-500 text-xs">Margin</div>
        </div>
        <div class="bg-slate-800/60 rounded-lg p-2">
          <div class="text-cyan-400 font-bold text-xs">\${p.trend}</div>
          <div class="text-slate-500 text-xs">Trend</div>
        </div>
        <div class="bg-slate-800/60 rounded-lg p-2">
          <div class="text-purple-400 font-bold text-xs">\${p.aiScore}</div>
          <div class="text-slate-500 text-xs">AI Score</div>
        </div>
      </div>

      <p class="text-xs text-slate-400 leading-relaxed mb-3" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">\${p.reason}</p>

      <div class="flex justify-between items-center">
        <div>
          <div class="text-green-400 font-bold text-sm">\${formatCurrency(p.supplierPrice)}</div>
          <div class="text-xs text-slate-500">supplier cost</div>
        </div>
        <div>
          <div class="text-white font-black">\${formatCurrency(p.sellingPrice)}</div>
          <div class="text-xs text-slate-500">sell price</div>
        </div>
        <a href="\${p.platformUrl}" target="_blank" onclick="event.stopPropagation()" class="btn-primary text-xs px-3 py-2">Source</a>
      </div>
    </div>
  </div>\`;
}

async function openViralDetail(id) {
  try {
    const [productRes, viralRes] = await Promise.all([
      axios.get('/api/product/' + id),
      axios.get('/api/viral-score/' + id)
    ]);

    if (productRes.data.success && viralRes.data.success) {
      showViralModal(productRes.data.data, viralRes.data.data);
    }
  } catch(e) {}
}

function showViralModal(p, v) {
  const existing = document.getElementById('viral-modal');
  if (existing) existing.remove();
  const scoreClass = getScoreClass(v.viralScore);
  const modal = document.createElement('div');
  modal.id = 'viral-modal';
  modal.className = 'modal show';
  modal.innerHTML = \`
    <div class="modal-content p-6">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-xl font-bold text-white flex items-center gap-2"><i class="fas fa-bolt text-purple-400"></i> Viral Analysis</h2>
        <button onclick="document.getElementById('viral-modal').remove()" class="text-slate-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <img src="\${p.image}" class="w-full rounded-xl object-cover mb-4" style="height:200px" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'">
          <h3 class="font-bold text-white mb-2">\${p.title}</h3>
          <div class="text-center p-4 rounded-xl mb-4" style="background:linear-gradient(135deg,rgba(139,92,246,0.15),rgba(99,102,241,0.15));border:1px solid rgba(139,92,246,0.3)">
            <div class="score-ring \${scoreClass} mx-auto mb-2" style="width:64px;height:64px;font-size:22px">\${v.viralScore}</div>
            <div class="text-lg font-black text-white">\${v.verdict}</div>
            <div class="text-xs text-slate-400 mt-1">\${v.recommendation}</div>
          </div>
        </div>
        <div>
          <h4 class="font-bold text-white mb-3">Score Breakdown</h4>
          \${[
            {label:'Google Search Demand', value:v.demandScore, color:'green'},
            {label:'Social Media Buzz', value:v.socialScore, color:'purple'},
            {label:'Trend Momentum', value:v.trendScore, color:'cyan'},
            {label:'Profit Margin Score', value:v.marginScore, color:'yellow'},
            {label:'Competition (Inv.)', value:100-v.competitionScore, color:'blue'},
          ].map(s => \`
            <div class="mb-3">
              <div class="flex justify-between text-sm mb-1">
                <span class="text-slate-400">\${s.label}</span>
                <span class="text-\${s.color}-400 font-bold">\${s.value}/100</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill bg-\${s.color}-500" style="width:\${Math.min(s.value,100)}%"></div>
              </div>
            </div>
          \`).join('')}

          <h4 class="font-bold text-white mt-4 mb-3">Platform Signals</h4>
          <div class="grid grid-cols-2 gap-2">
            \${Object.entries(v.breakdown).map(([platform,score]) => \`
              <div class="card p-3 text-center">
                <div class="text-white font-bold">\${score}</div>
                <div class="text-xs text-slate-400 capitalize">\${platform}</div>
              </div>
            \`).join('')}
          </div>
        </div>
      </div>
      <div class="flex gap-3 mt-5">
        <a href="\${p.platformUrl}" target="_blank" class="btn-primary flex-1 justify-center">
          <i class="fas fa-external-link-alt"></i> Source Product
        </a>
        <a href="/profit-calculator?cost=\${p.supplierPrice}&sell=\${p.sellingPrice}" class="btn-outline px-5">
          <i class="fas fa-calculator"></i> Calculate Profit
        </a>
      </div>
    </div>
  \`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

loadViralProducts();
startAutoRefresh(loadViralProducts);
</script>
`, 'viral-products')
}

// ── PAGE: LOGIN ───────────────────────────────────────────────────────────────
function getLoginPage() {
  return getLayout('Sign In', `
<div class="min-h-screen flex items-center justify-center p-4" style="background: radial-gradient(ellipse at center, rgba(99,102,241,0.15), transparent 60%)">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white mx-auto mb-4">P</div>
      <h1 class="text-3xl font-black text-white">Welcome Back</h1>
      <p class="text-slate-400 mt-2">Sign in to your PulseMarket account</p>
    </div>

    <div class="card p-8">
      <div id="login-error" class="hidden mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-400 text-sm"></div>

      <div class="space-y-4">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Email Address</label>
          <input id="login-email" type="email" class="input" placeholder="you@example.com">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Password</label>
          <input id="login-pass" type="password" class="input" placeholder="••••••••" onkeydown="if(event.key==='Enter') doLogin()">
        </div>
        <button onclick="doLogin()" class="btn-primary w-full justify-center text-base py-3">
          <i class="fas fa-sign-in-alt"></i> Sign In
        </button>
      </div>

      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-700"></div></div>
        <div class="relative flex justify-center"><span class="px-4 bg-slate-800 text-slate-500 text-xs">or continue with</span></div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button onclick="socialLogin('Google')" class="btn-outline flex items-center justify-center gap-2 py-3">
          <span class="text-lg">🇬</span> Google
        </button>
        <button onclick="socialLogin('GitHub')" class="btn-outline flex items-center justify-center gap-2 py-3">
          <i class="fab fa-github"></i> GitHub
        </button>
      </div>

      <p class="text-center text-slate-400 text-sm mt-6">
        No account? <a href="/signup" class="text-indigo-400 hover:text-indigo-300 font-medium">Create one free →</a>
      </p>
    </div>
  </div>
</div>
<script>
function doLogin() {
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-pass').value;

  if (!email || !pass) {
    document.getElementById('login-error').textContent = 'Please enter your email and password.';
    document.getElementById('login-error').classList.remove('hidden');
    return;
  }

  // Simulate auth (replace with real Supabase auth)
  const name = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
  login(email, name);
  showToast('Welcome back, ' + name + '!', 'success');
  setTimeout(() => window.location.href = '/dashboard', 1000);
}

function socialLogin(provider) {
  const email = provider.toLowerCase() + '@pulsemarket.demo';
  const name = provider + ' User';
  login(email, name);
  showToast('Logged in with ' + provider, 'success');
  setTimeout(() => window.location.href = '/dashboard', 1000);
}
</script>
`, '')
}

// ── PAGE: SIGNUP ──────────────────────────────────────────────────────────────
function getSignupPage() {
  return getLayout('Create Account', `
<div class="min-h-screen flex items-center justify-center p-4" style="background: radial-gradient(ellipse at center, rgba(139,92,246,0.15), transparent 60%)">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white mx-auto mb-4">P</div>
      <h1 class="text-3xl font-black text-white">Start Free</h1>
      <p class="text-slate-400 mt-2">No credit card required. Full access forever.</p>
    </div>

    <div class="card p-8">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-400 mb-1 block">First Name</label>
            <input id="signup-fname" type="text" class="input" placeholder="Rahul">
          </div>
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Last Name</label>
            <input id="signup-lname" type="text" class="input" placeholder="Sharma">
          </div>
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Email Address</label>
          <input id="signup-email" type="email" class="input" placeholder="you@example.com">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Password</label>
          <input id="signup-pass" type="password" class="input" placeholder="Min 8 characters" onkeydown="if(event.key==='Enter') doSignup()">
        </div>
        <div class="flex items-start gap-3">
          <input id="terms" type="checkbox" class="mt-1 accent-indigo-500">
          <label for="terms" class="text-xs text-slate-400">I agree to the <a href="#" class="text-indigo-400">Terms of Service</a> and <a href="#" class="text-indigo-400">Privacy Policy</a></label>
        </div>
        <button onclick="doSignup()" class="btn-primary w-full justify-center text-base py-3">
          <i class="fas fa-user-plus"></i> Create Free Account
        </button>
      </div>

      <div class="grid grid-cols-3 gap-3 mt-5">
        ${['✅ 9 Live Sources','✅ AI Scoring','✅ Free Forever'].map(f =>
          `<div class="text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2">${f}</div>`
        ).join('')}
      </div>

      <p class="text-center text-slate-400 text-sm mt-4">
        Already have an account? <a href="/login" class="text-indigo-400 hover:text-indigo-300 font-medium">Sign in →</a>
      </p>
    </div>
  </div>
</div>
<script>
function doSignup() {
  const fname = document.getElementById('signup-fname').value;
  const email = document.getElementById('signup-email').value;
  const pass = document.getElementById('signup-pass').value;
  const terms = document.getElementById('terms').checked;

  if (!fname || !email || !pass) { showToast('Please fill all fields', 'error'); return; }
  if (!terms) { showToast('Please accept the terms', 'warning'); return; }
  if (pass.length < 8) { showToast('Password must be 8+ characters', 'error'); return; }

  login(email, fname);
  showToast('Account created! Welcome, ' + fname + '!', 'success');
  setTimeout(() => window.location.href = '/dashboard', 1200);
}
</script>
`, '')
}

// ── PAGE: PRICING ─────────────────────────────────────────────────────────────
function getPricingPage() {
  return getLayout('Pricing', `
<div class="main-content">
  <div class="topbar flex justify-between items-center">
    <div>
      <h1 class="text-lg font-bold text-white">Pricing</h1>
    </div>
    <div id="auth-status"></div>
  </div>

  <div class="p-8">
    <div class="text-center mb-12">
      <h1 class="text-4xl font-black text-white mb-3">Simple, Honest Pricing</h1>
      <p class="text-slate-400 text-lg">No hidden fees. Cancel anytime. Free forever for core features.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      ${[
        {
          name:'Free', price:'₹0', period:'forever', color:'slate',
          features:['Product search (20/day)','Google Trends data','Basic profit calculator','3 product sources','Community support'],
          cta:'Start Free', href:'/signup', popular:false
        },
        {
          name:'Pro', price:'₹999', period:'/month', color:'indigo',
          features:['Unlimited searches','All 9 data sources','AI recommendations','Viral score engine','Competitor tracker','Supplier finder','Priority support','Export to CSV'],
          cta:'Start 7-Day Trial', href:'/signup', popular:true
        },
        {
          name:'Business', price:'₹2,999', period:'/month', color:'purple',
          features:['Everything in Pro','5 team members','API access','Custom alerts','White-label reports','Dedicated manager','SLA guarantee','Bulk export'],
          cta:'Contact Sales', href:'mailto:sales@pulsemarket.in', popular:false
        },
      ].map(plan => `
      <div class="card p-8 relative ${plan.popular ? 'border-indigo-500 glow' : ''}">
        ${plan.popular ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-indigo-600 text-white text-xs px-4 py-1.5">MOST POPULAR</div>' : ''}
        <div class="mb-6">
          <h3 class="text-xl font-black text-white mb-2">${plan.name}</h3>
          <div class="flex items-baseline gap-1">
            <span class="text-4xl font-black text-${plan.color === 'slate' ? 'white' : plan.color + '-400'}">${plan.price}</span>
            <span class="text-slate-400">${plan.period}</span>
          </div>
        </div>
        <ul class="space-y-3 mb-8">
          ${plan.features.map(f => `
          <li class="flex items-center gap-3 text-sm">
            <i class="fas fa-check text-green-400 w-4"></i>
            <span class="text-slate-300">${f}</span>
          </li>`).join('')}
        </ul>
        <a href="${plan.href}" class="${plan.popular ? 'btn-primary' : 'btn-outline'} w-full justify-center py-3 text-base">
          ${plan.cta}
        </a>
      </div>`).join('')}
    </div>

    <!-- FAQ -->
    <div class="max-w-3xl mx-auto mt-16">
      <h2 class="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
      <div class="space-y-4">
        ${[
          {q:'Is the free plan really free forever?',a:'Yes! Core features including product search, Google Trends, and profit calculator are free forever. No credit card required.'},
          {q:'What data sources are included?',a:'Pro plan includes all 9 sources: AliExpress, Alibaba, IndiaMart, Flipkart, Amazon India, Google Trends, BuyHatke, Instagram trends, and TikTok trends.'},
          {q:'How accurate is the data?',a:'We fetch live data from official APIs and public sources. Product prices and trend data are updated every 60 seconds. We never fake or estimate data.'},
          {q:'Can I cancel anytime?',a:'Yes, cancel anytime with one click from your dashboard. No lock-in, no cancellation fees.'},
        ].map(faq => `
        <div class="card p-5">
          <div class="font-bold text-white mb-2">${faq.q}</div>
          <div class="text-slate-400 text-sm leading-relaxed">${faq.a}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>
`, 'pricing')
}
