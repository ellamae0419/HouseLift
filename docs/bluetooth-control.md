# Bluetooth control

Raise or lower the unit from a phone or computer standing near it, with no WiFi. It is a remote control for when you are next to the unit. Flood texts, the history and the live dashboard from far away still need WiFi (or a SIM module).

## What is in the project

| File | What it is |
|---|---|
| `arduino/HouseLift-bluetooth/HouseLift-bluetooth.ino` | A copy of `arduino/HouseLift/HouseLift.ino` with the Bluetooth lines added. The original sketch and `main.cpp` are **not changed**, so you can always go back by uploading the old one. |
| `arduino/HouseLift-bluetooth/ble_control.h` | The Bluetooth part. It must stay in the same folder as the `.ino`. |
| Dashboard page **Bluetooth control** (`/bluetooth`) | The page that connects to the unit. It is in the sidebar for admins and in the bottom bar for customers. |

The `.ino` differs from the original sketch only by these changes: the `#include "ble_control.h"` line, the `BLE_CONTROL_PIN` setting, the `handleBleControl()` function, one call to `bleControlBegin()` at the end of `setup()`, one call to `handleBleControl()` in `loop()`, and a new firmware version name.

## Put it on the unit

1. Open the folder `arduino/HouseLift-bluetooth` in the Arduino IDE (open the `.ino`; the IDE needs the folder and the file to have the same name, which they do).
2. In `HouseLift-bluetooth.ino`, copy over what you already use in your working sketch: the WiFi password, `DEVICE_KEY`, and anything else you changed from the defaults.
3. Change `BLE_CONTROL_PIN` (it is `"246810"` as a placeholder) to a PIN of your own. Digits only. Without the right PIN the unit ignores every Bluetooth command.
4. **Tools > Partition Scheme > "Huge APP (3MB No OTA/1MB SPIFFS)".** This is needed. WiFi, TLS and Bluetooth together do not fit the default partition (the sketch was about 1.13 MB before Bluetooth, and the default limit is about 1.31 MB).
5. Upload. In the Serial Monitor you should see `[BLE] Control ready as HydroLift-xxxx`.

> I could not compile or run this on the ESP32 from my computer. It was written for the ESP32 Arduino core 3.x (your README says 3.3.12) and uses the Bluetooth library that comes with that core, but it has not been built. If the Arduino IDE shows an error, send me the full message and I will fix it.

## Use it

1. Open the dashboard and go to **Bluetooth control**.
2. Stand near the unit with its power on. Tap **Connect to my HydroLift** and choose `HydroLift-xxxx` from the list.
3. Enter the PIN. The controls appear: **Lift fully**, **Lower fully**, **Step up**, **Step down**, and **Turn auto lift on/off**. The page also shows the water level, the platform height and whether it is moving.

### Which browser

| Device | Use |
|---|---|
| Android phone | **Chrome** |
| Windows or Mac computer | **Chrome** or **Edge** |
| iPhone | Safari and Chrome on iPhone **cannot** do Bluetooth. Use a browser app that supports Web Bluetooth, such as **Bluefy** (free in the App Store), and open the dashboard in it. |

The page must be opened with **https://** at the start of the address. Browsers block Bluetooth on plain `http://` pages. If the InfinityFree address does not open with https, turn on its free SSL certificate in the InfinityFree panel.

## How it keeps strangers out

- Nothing moves until the PIN has been sent. A phone that disconnects must send it again.
- Five wrong PINs in a row lock Bluetooth control for one minute.
- Commands arrive as plain text (`FULL_UP`, `FULL_DOWN`, `STEP_UP`, `STEP_DOWN`, `AUTO_ON`, `AUTO_OFF`) and are queued. The motor is only started from the sketch's normal loop, with the same "ignore while the motor is busy" rule the dashboard uses. A button pressed twice quickly is ignored (one command per 0.4 seconds).
- Bluetooth only reaches a few meters to about 10 meters, so only someone near the unit can try.

The PIN is a shared secret, not strong encryption. For a demo and for a home unit this is a sensible level of protection. For real customers, give each unit its own PIN and do not reuse the same one.

## Troubleshooting

- **The unit is not in the list:** check that the Serial Monitor printed `[BLE] Control ready`, that you are close, and that you picked the unit and not another device. Bluetooth may need to be on in the phone's settings, and Chrome on Android may need the Location setting on (older Android) or the Nearby devices permission (newer Android).
- **"This browser cannot use Bluetooth":** use Chrome (Android, computer) or Bluefy (iPhone).
- **"Bluetooth only works on a secure page":** open the address with `https://`.
- **Connects, then drops:** the unit is too far away, or its 5 V supply dips when the motor starts. Check the power first.
- **WiFi got worse after adding Bluetooth:** WiFi and Bluetooth share the same radio. Tell me, and we will check memory and timing.
- **Commands do nothing:** the unit ignores commands while the motor is moving. Wait for "Resting".

## Not tested yet

These need the real board and are not covered by my tests: compiling the sketch, advertising and connecting from a real phone, the phone's long read of the status text, and how WiFi and Bluetooth behave together on your unit. The dashboard page was tested in Chrome against a stand-in unit that follows the same PIN rules, commands and status format.
