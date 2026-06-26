/**
 * Seeds the database with demo accounts, listings, completed orders, and
 * reviews so every surface (Browse carousels, the Spotlight, the seller
 * dashboard, ratings, storefronts) has realistic data to render.
 *
 *   npm run seed
 *
 * WARNING: this wipes the users, listings, orders, reviews, and
 * walletTransactions collections, then recreates a known demo dataset.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import { User } from './models/User.js';
import { Listing, listingExpiry } from './models/Listing.js';
import { Order } from './models/Order.js';
import { Review } from './models/Review.js';
import { WalletTransaction } from './models/WalletTransaction.js';

const img = (slug) => `https://picsum.photos/seed/cv-${slug}/800/600`;
const avatar = (email) => `https://i.pravatar.cc/200?u=${encodeURIComponent(email)}`;

const DEMO_PASSWORD = 'Password123';
const DAY = 24 * 60 * 60 * 1000;

const USERS = [
  { name: 'CircuitVision Admin', email: 'admin@circuitvision.test', role: 'admin', walletBalance: 100000 },
  {
    name: 'TechParts PH',
    email: 'seller@circuitvision.test',
    role: 'seller',
    walletBalance: 1500,
    bio: 'Sealed dev boards and genuine modules. Ships from QC, meetups near campus.',
    accentColor: '#3aa0c9',
  },
  {
    name: 'MakerHub Manila',
    email: 'maker@circuitvision.test',
    role: 'seller',
    walletBalance: 1500,
    bio: 'Maker surplus — tested used boards at student-friendly prices.',
    accentColor: '#4caf7d',
  },
  { name: 'Juan Dela Cruz', email: 'customer@circuitvision.test', role: 'customer', walletBalance: 20000 },
  { name: 'Maria Santos', email: 'maria@circuitvision.test', role: 'customer', walletBalance: 20000 },
  { name: 'Paolo Reyes', email: 'paolo@circuitvision.test', role: 'customer', walletBalance: 20000 },
];

// sellerKey maps to one of the two seller emails below.
const LISTINGS = [
  // ESP32
  { sellerKey: 0, title: 'ESP32 DevKit V1 (WiFi + BLE)', category: 'esp32', price: 320, condition: 'new', quantity: 8, slug: 'esp32-devkit', description: 'Dual-core ESP32-WROOM-32, 38-pin dev board. Wi-Fi + Bluetooth. Brand new, sealed.', specs: { chip: 'ESP32-WROOM-32', flash: '4MB', pins: 38 } },
  { sellerKey: 0, title: 'ESP32-CAM with OV2640', category: 'esp32', price: 410, condition: 'new', quantity: 5, slug: 'esp32-cam', description: 'ESP32-CAM module with 2MP OV2640 camera. Great for surveillance and AI projects.', specs: { camera: 'OV2640 2MP', flash: '4MB PSRAM' } },
  { sellerKey: 1, title: 'NodeMCU ESP8266 (Lolin V3)', category: 'esp32', price: 180, condition: 'used', quantity: 3, slug: 'esp8266-nodemcu', description: 'Lightly used ESP8266 NodeMCU. Tested and working. Perfect for IoT starters.', specs: { chip: 'ESP8266', usb: 'CH340' } },
  { sellerKey: 1, title: 'ESP32-WROOM-32U (external antenna)', category: 'esp32', price: 290, condition: 'new', quantity: 6, slug: 'esp32-wroom-u', description: 'WROOM-32U variant with U.FL connector for an external antenna. Better range.', specs: { antenna: 'U.FL external' } },

  // Raspberry Pi
  { sellerKey: 0, title: 'Raspberry Pi 4 Model B (4GB)', category: 'raspi', price: 3200, condition: 'used', quantity: 2, slug: 'pi4-4gb', description: 'Raspberry Pi 4B 4GB RAM. Includes heatsinks. Lightly used in a home server.', specs: { ram: '4GB', usb: '2x USB3, 2x USB2', video: '2x micro-HDMI' } },
  { sellerKey: 0, title: 'Raspberry Pi Pico W', category: 'raspi', price: 350, condition: 'new', quantity: 12, slug: 'pico-w', description: 'RP2040 microcontroller board with onboard Wi-Fi. Pre-soldered headers.', specs: { mcu: 'RP2040', wireless: 'Wi-Fi 802.11n' } },
  { sellerKey: 1, title: 'Raspberry Pi Zero 2 W', category: 'raspi', price: 950, condition: 'new', quantity: 4, slug: 'pi-zero2w', description: 'Tiny quad-core Pi Zero 2 W. Wi-Fi + Bluetooth. Ideal for compact builds.', specs: { cpu: 'Quad-core A53', wireless: 'Wi-Fi + BT' } },
  { sellerKey: 1, title: 'Raspberry Pi Camera Module 3', category: 'raspi', price: 1400, condition: 'new', quantity: 3, slug: 'pi-cam3', description: '12MP autofocus camera module for Raspberry Pi. Sony IMX708 sensor.', specs: { sensor: 'Sony IMX708', mp: 12, autofocus: true } },

  // Arduino
  { sellerKey: 0, title: 'Arduino Uno R3 (genuine)', category: 'arduino', price: 850, condition: 'new', quantity: 7, slug: 'uno-r3', description: 'Genuine Arduino Uno R3. ATmega328P. The classic starting point for makers.', specs: { mcu: 'ATmega328P', digital: 14, analog: 6 } },
  { sellerKey: 0, title: 'Arduino Nano (clone, CH340)', category: 'arduino', price: 220, condition: 'new', quantity: 15, slug: 'nano-clone', description: 'Compatible Arduino Nano with CH340 USB. Breadboard-friendly. Great value.', specs: { mcu: 'ATmega328P', usb: 'CH340' } },
  { sellerKey: 1, title: 'Arduino Mega 2560 R3', category: 'arduino', price: 1100, condition: 'used', quantity: 2, slug: 'mega-2560', description: 'Arduino Mega 2560 with 54 digital pins. Used in a CNC build, fully working.', specs: { mcu: 'ATmega2560', digital: 54, analog: 16 } },
  { sellerKey: 1, title: 'Arduino Pro Mini 5V 16MHz', category: 'arduino', price: 160, condition: 'new', quantity: 10, slug: 'pro-mini', description: 'Compact Pro Mini for embedded projects. Requires FTDI to program.', specs: { mcu: 'ATmega328P', voltage: '5V', clock: '16MHz' } },
];

// Weighted demand: index into LISTINGS repeated so some items sell more (and so
// rise to the top of "Best sellers"). Spread across days so the dashboard's
// 7-day revenue trend has shape.
const SALES = [
  { l: 0, daysAgo: 1 }, { l: 0, daysAgo: 2 }, { l: 0, daysAgo: 5 }, { l: 0, daysAgo: 9 },
  { l: 8, daysAgo: 0 }, { l: 8, daysAgo: 3 }, { l: 8, daysAgo: 6 },
  { l: 9, daysAgo: 1 }, { l: 9, daysAgo: 4 },
  { l: 5, daysAgo: 0 }, { l: 5, daysAgo: 2 }, { l: 5, daysAgo: 11 },
  { l: 1, daysAgo: 3 }, { l: 1, daysAgo: 7 },
  { l: 6, daysAgo: 2 }, { l: 6, daysAgo: 8 },
  { l: 10, daysAgo: 4 },
  { l: 3, daysAgo: 6 },
];

const COMMENTS = [
  'Exactly as described, fast meetup. Highly recommend!',
  'Board works perfectly, well packed. Salamat!',
  'Smooth transaction, legit seller.',
  'Great price and quick to respond. Will buy again.',
  'Tested on arrival, no issues at all.',
  'Item as advertised. Friendly seller.',
  '',
];

const pick = (arr, i) => arr[i % arr.length];
const rand = (n) => Math.floor(Math.random() * n);

async function run() {
  await connectDb();

  console.log('[seed] clearing collections…');
  await Promise.all([
    User.deleteMany({}),
    Listing.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
    WalletTransaction.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const createdUsers = await User.create(
    USERS.map((u) => ({
      ...u,
      passwordHash,
      isVerified: true,
      avatarUrl: u.role === 'admin' ? '' : avatar(u.email),
    }))
  );
  console.log(`[seed] created ${createdUsers.length} users`);

  const sellers = createdUsers.filter((u) => u.role === 'seller');
  const buyers = createdUsers.filter((u) => u.role === 'customer');

  const listingDocs = LISTINGS.map((l) => ({
    sellerId: sellers[l.sellerKey]._id,
    title: l.title,
    description: l.description,
    category: l.category,
    price: l.price,
    condition: l.condition,
    quantity: l.quantity,
    status: 'available', // pre-approved so they show up in Browse immediately
    expiresAt: listingExpiry(),
    cloudinaryUrl: [img(l.slug), img(`${l.slug}-2`), img(`${l.slug}-3`)],
    specs: l.specs,
    viewCount: 20 + rand(160),
  }));
  // Leave one as pending so the admin moderation queue has something to review.
  listingDocs[2].status = 'pending';

  const created = await Listing.create(listingDocs);
  console.log(`[seed] created ${created.length} listings (1 pending for moderation)`);

  // Running wallet balances so audit rows have sane before/after snapshots.
  const balance = new Map(createdUsers.map((u) => [String(u._id), u.walletBalance]));
  const orders = [];
  const reviews = [];
  const txns = [];

  SALES.forEach((sale, i) => {
    const listing = created[sale.l];
    if (listing.status !== 'available') return;
    const seller = sellers.find((s) => String(s._id) === String(listing.sellerId));
    const buyer = buyers[i % buyers.length];
    const amount = listing.price; // qty 1
    const when = new Date(Date.now() - sale.daysAgo * DAY);
    const orderId = new mongoose.Types.ObjectId();

    orders.push({
      _id: orderId,
      buyerId: buyer._id,
      sellerId: seller._id,
      listingId: listing._id,
      titleSnapshot: listing.title,
      imageSnapshot: listing.cloudinaryUrl[0],
      quantity: 1,
      unitPrice: listing.price,
      amountReserved: amount,
      fulfillment: 'pickup',
      status: 'completed',
      paymentVerifiedAt: when,
      statusHistory: [{ status: 'completed', at: when, note: 'Seed: completed sale' }],
      createdAt: when,
      updatedAt: when,
    });

    // Seller earns the proceeds (credit); buyer paid (debit). Track balances.
    const sBefore = balance.get(String(seller._id));
    balance.set(String(seller._id), sBefore + amount);
    txns.push({
      userId: seller._id,
      type: 'credit',
      amount,
      referenceOrderId: orderId,
      description: 'Sale proceeds',
      balanceBefore: sBefore,
      balanceAfter: sBefore + amount,
      createdAt: when,
    });
    const bBefore = balance.get(String(buyer._id));
    balance.set(String(buyer._id), Math.max(0, bBefore - amount));
    txns.push({
      userId: buyer._id,
      type: 'debit',
      amount,
      referenceOrderId: orderId,
      description: 'Payment for order',
      balanceBefore: bBefore,
      balanceAfter: Math.max(0, bBefore - amount),
      createdAt: when,
    });

    // Most completed orders get a review (one per order).
    if (i % 7 !== 6) {
      reviews.push({
        orderId,
        listingId: listing._id,
        sellerId: seller._id,
        buyerId: buyer._id,
        rating: [5, 5, 5, 4, 4, 3][rand(6)], // mostly 4–5, occasional 3
        comment: pick(COMMENTS, i),
        createdAt: when,
      });
    }
  });

  await Order.create(orders);
  await Review.create(reviews);
  await WalletTransaction.create(txns);
  console.log(`[seed] created ${orders.length} completed orders, ${reviews.length} reviews, ${txns.length} wallet txns`);

  // Persist updated wallet balances and recompute each seller's cached rating.
  for (const u of createdUsers) {
    const update = { walletBalance: balance.get(String(u._id)) };
    if (u.role === 'seller') {
      const sellerReviews = reviews.filter((r) => String(r.sellerId) === String(u._id));
      const count = sellerReviews.length;
      update.ratingAvg = count
        ? Math.round((sellerReviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
        : 0;
      update.ratingCount = count;
    }
    await User.updateOne({ _id: u._id }, update);
  }
  console.log('[seed] updated balances + seller ratings');

  console.log('\n=== Demo accounts (password: %s) ===', DEMO_PASSWORD);
  for (const u of createdUsers) {
    console.log(`  ${u.role.padEnd(9)} ${u.email}`);
  }
  console.log('\n[seed] done.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
