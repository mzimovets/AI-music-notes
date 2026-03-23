const HID = require("node-hid");
const robot = require("@jitsi/robotjs");

const all = HID.devices().filter((d) => d.vendorId === 1452 && d.productId === 556);

let device = null;
for (const d of all) {
  try {
    device = new HID.HID(d.path);
    console.log(`Открыто: usage=${d.usage}`);
    break;
  } catch (e) {}
}

if (!device) {
  console.log("Устройство не найдено");
  process.exit(1);
}

console.log("Кликер активен! Вверх = PageUp, Вниз = PageDown\n");

device.on("data", (data) => {
  if (data[0] !== 0x03) return; // фильтруем только нужные пакеты

  const btn = data[2];
  if (btn === 0x01) {
    robot.keyTap("pageup");
    console.log("↑ PageUp");
  } else if (btn === 0x02) {
    robot.keyTap("pagedown");
    console.log("↓ PageDown");
  }
});

