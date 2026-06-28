// Static reference catalog of the components CircuitVision deals in — name +
// basic specs for each known board, grouped by the three listing categories.
//
// This is pure reference data (no DB, no inference). The scanner uses it to turn
// a recognized *category* (from Roboflow) into a concrete component the user can
// pick, then shows real specs from here rather than guessing. `aliases` are the
// names/part numbers printed on the board — unused today, but ready to back a
// future OCR/vision "name the exact board" pass.

export const COMPONENTS = [
  // ----- ESP32 family -----
  {
    key: 'esp32-devkit-v1',
    category: 'esp32',
    name: 'ESP32 DevKit V1',
    summary: 'The standard ESP32 dev board — Wi-Fi + Bluetooth, breadboard-friendly.',
    specs: {
      Chip: 'ESP32-WROOM-32',
      Cores: 'Dual-core, 240 MHz',
      Flash: '4 MB',
      Wireless: 'Wi-Fi + Bluetooth',
      'GPIO pins': '38',
      'Logic level': '3.3 V',
    },
    aliases: ['ESP32-WROOM-32', 'ESP32 DevKit', 'ESP-WROOM-32'],
  },
  {
    key: 'esp32-cam',
    category: 'esp32',
    name: 'ESP32-CAM',
    summary: 'ESP32 with an onboard camera and microSD slot — great for vision projects.',
    specs: {
      Chip: 'ESP32-S',
      Camera: 'OV2640, 2 MP',
      Memory: '4 MB PSRAM',
      Wireless: 'Wi-Fi + Bluetooth',
      Storage: 'microSD slot',
    },
    aliases: ['ESP32-CAM', 'OV2640'],
  },
  {
    key: 'esp8266-nodemcu',
    category: 'esp32',
    name: 'NodeMCU ESP8266',
    summary: 'Budget Wi-Fi microcontroller — the classic IoT starter board.',
    specs: {
      Chip: 'ESP8266',
      Cores: 'Single-core, 80 MHz',
      Flash: '4 MB',
      Wireless: 'Wi-Fi',
      USB: 'CH340',
      'Logic level': '3.3 V',
    },
    aliases: ['NodeMCU', 'ESP8266', 'Lolin V3'],
  },
  {
    key: 'esp32-wroom-u',
    category: 'esp32',
    name: 'ESP32-WROOM-32U',
    summary: 'WROOM-32 variant with a U.FL connector for an external antenna.',
    specs: {
      Chip: 'ESP32-WROOM-32U',
      Antenna: 'U.FL external',
      Wireless: 'Wi-Fi + Bluetooth',
      'GPIO pins': '38',
      'Logic level': '3.3 V',
    },
    aliases: ['WROOM-32U', 'ESP32-WROOM-32U'],
  },
  {
    key: 'esp32-c3-supermini',
    category: 'esp32',
    name: 'ESP32-C3 SuperMini',
    summary: 'Tiny RISC-V ESP32 with BLE 5 — fits in the smallest builds.',
    specs: {
      Chip: 'ESP32-C3 (RISC-V)',
      Cores: 'Single-core, 160 MHz',
      Wireless: 'Wi-Fi + BLE 5',
      'GPIO pins': '11',
      'Logic level': '3.3 V',
    },
    aliases: ['ESP32-C3', 'C3 SuperMini'],
  },

  // ----- Raspberry Pi family -----
  {
    key: 'pi4-model-b',
    category: 'raspi',
    name: 'Raspberry Pi 4 Model B',
    summary: 'Quad-core single-board computer — runs a full desktop Linux.',
    specs: {
      SoC: 'Broadcom BCM2711',
      CPU: 'Quad-core Cortex-A72',
      RAM: '2 / 4 / 8 GB',
      USB: '2× USB 3.0, 2× USB 2.0',
      Video: '2× micro-HDMI (4K)',
      Network: 'Gigabit Ethernet, Wi-Fi, BT',
    },
    aliases: ['Raspberry Pi 4', 'Pi 4', 'BCM2711'],
  },
  {
    key: 'pi-pico-w',
    category: 'raspi',
    name: 'Raspberry Pi Pico W',
    summary: 'RP2040 microcontroller board with onboard Wi-Fi.',
    specs: {
      MCU: 'RP2040',
      Cores: 'Dual-core Cortex-M0+, 133 MHz',
      Wireless: 'Wi-Fi 802.11n',
      'GPIO pins': '26',
      'Logic level': '3.3 V',
    },
    aliases: ['Pico W', 'RP2040'],
  },
  {
    key: 'pi-zero-2w',
    category: 'raspi',
    name: 'Raspberry Pi Zero 2 W',
    summary: 'Tiny quad-core Pi with Wi-Fi + Bluetooth — for compact builds.',
    specs: {
      SoC: 'RP3A0 (BCM2710A1)',
      CPU: 'Quad-core Cortex-A53, 1 GHz',
      RAM: '512 MB',
      Wireless: 'Wi-Fi + Bluetooth',
    },
    aliases: ['Pi Zero 2', 'Zero 2 W'],
  },
  {
    key: 'pi-cam-3',
    category: 'raspi',
    name: 'Raspberry Pi Camera Module 3',
    summary: '12 MP autofocus camera for the Pi — Sony IMX708 sensor.',
    specs: {
      Sensor: 'Sony IMX708',
      Resolution: '11.9 MP',
      Focus: 'Autofocus',
      Video: '1080p50',
    },
    aliases: ['Camera Module 3', 'IMX708'],
  },
  {
    key: 'pi5',
    category: 'raspi',
    name: 'Raspberry Pi 5',
    summary: 'The fastest Pi — adds PCIe and a much quicker CPU over the Pi 4.',
    specs: {
      SoC: 'Broadcom BCM2712',
      CPU: 'Quad-core Cortex-A76, 2.4 GHz',
      RAM: '4 / 8 GB',
      PCIe: 'Single-lane PCIe 2.0',
      Video: '2× micro-HDMI (4Kp60)',
    },
    aliases: ['Raspberry Pi 5', 'Pi 5', 'BCM2712'],
  },

  // ----- Arduino family -----
  {
    key: 'uno-r3',
    category: 'arduino',
    name: 'Arduino Uno R3',
    summary: 'The classic starting point for makers — ATmega328P, 5 V logic.',
    specs: {
      MCU: 'ATmega328P',
      Clock: '16 MHz',
      'Digital I/O': '14 (6 PWM)',
      'Analog in': '6',
      Flash: '32 KB',
      'Logic level': '5 V',
    },
    aliases: ['Uno', 'Uno R3', 'ATmega328P'],
  },
  {
    key: 'nano',
    category: 'arduino',
    name: 'Arduino Nano',
    summary: 'Breadboard-friendly Uno equivalent in a tiny footprint.',
    specs: {
      MCU: 'ATmega328P',
      Clock: '16 MHz',
      'Digital I/O': '14',
      'Analog in': '8',
      USB: 'CH340 / FTDI',
      'Logic level': '5 V',
    },
    aliases: ['Nano', 'ATmega328P'],
  },
  {
    key: 'mega-2560',
    category: 'arduino',
    name: 'Arduino Mega 2560',
    summary: 'High pin-count board for projects that outgrow the Uno.',
    specs: {
      MCU: 'ATmega2560',
      Clock: '16 MHz',
      'Digital I/O': '54 (15 PWM)',
      'Analog in': '16',
      Flash: '256 KB',
      'Logic level': '5 V',
    },
    aliases: ['Mega', 'Mega 2560', 'ATmega2560'],
  },
  {
    key: 'pro-mini',
    category: 'arduino',
    name: 'Arduino Pro Mini',
    summary: 'Stripped-down board for embedded builds — needs an external FTDI to program.',
    specs: {
      MCU: 'ATmega328P',
      Clock: '16 MHz',
      Voltage: '5 V',
      Programming: 'External FTDI',
      Footprint: 'Breadboard',
    },
    aliases: ['Pro Mini'],
  },
  {
    key: 'leonardo',
    category: 'arduino',
    name: 'Arduino Leonardo',
    summary: 'Uno-sized board with native USB — can act as a keyboard or mouse.',
    specs: {
      MCU: 'ATmega32u4',
      Clock: '16 MHz',
      'Digital I/O': '20',
      USB: 'Native HID',
      'Logic level': '5 V',
    },
    aliases: ['Leonardo', 'ATmega32u4'],
  },
];
