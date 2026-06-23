/**
 * Seeds the database with demo accounts and component listings.
 *
 *   npm run seed
 *
 * WARNING: this wipes the users, listings, orders, and walletTransactions
 * collections, then recreates a known demo dataset. Intended for development.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import { User } from './models/User.js';
import { Listing } from './models/Listing.js';
import { Order } from './models/Order.js';
import { WalletTransaction } from './models/WalletTransaction.js';

const img = (slug) => `https://picsum.photos/seed/cv-${slug}/800/600`;

const DEMO_PASSWORD = 'Password123';

const USERS = [
  { name: 'CircuitVision Admin', email: 'admin@circuitvision.test', role: 'admin', walletBalance: 100000 },
  { name: 'TechParts PH', email: 'seller@circuitvision.test', role: 'seller', walletBalance: 1500 },
  { name: 'MakerHub Manila', email: 'maker@circuitvision.test', role: 'seller', walletBalance: 1500 },
  { name: 'Juan Dela Cruz', email: 'customer@circuitvision.test', role: 'customer', walletBalance: 5000 },
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

async function run() {
  await connectDb();

  console.log('[seed] clearing collections…');
  await Promise.all([
    User.deleteMany({}),
    Listing.deleteMany({}),
    Order.deleteMany({}),
    WalletTransaction.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const createdUsers = await User.create(
    USERS.map((u) => ({ ...u, passwordHash, isVerified: true }))
  );
  console.log(`[seed] created ${createdUsers.length} users`);

  const sellers = createdUsers.filter((u) => u.role === 'seller');

  const listings = LISTINGS.map((l) => ({
    sellerId: sellers[l.sellerKey]._id,
    title: l.title,
    description: l.description,
    category: l.category,
    price: l.price,
    condition: l.condition,
    quantity: l.quantity,
    status: 'available', // pre-approved so they show up in Browse immediately
    cloudinaryUrl: [img(l.slug), img(`${l.slug}-2`)],
    specs: l.specs,
    viewCount: Math.floor(Math.random() * 120),
  }));
  // Leave one as pending so the admin moderation queue has something to review.
  listings[2].status = 'pending';

  const created = await Listing.create(listings);
  console.log(`[seed] created ${created.length} listings (1 pending for moderation)`);

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
