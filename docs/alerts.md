# HydroLift alerts and text messages

Every alert is saved on the owner's **Alerts** page and, except the heartbeat, texted to the mobile number the owner registered with. The alerts follow the stages in the Flood-Adaptive Pethouse design (Rev D).

## The alerts

| Alert | Design stage | When it is raised | The text the owner gets | How often |
|---|---|---|---|---|
| **Flood warning** | Stage 1, WARNING | The unit lifts the house by itself because water reached the warning level | "HydroLift WARNING: Hi Ana, water has reached the warning level at your house. Your platform was raised automatically." | Once, then not again for 10 minutes |
| **House is floating** | Stage 2, FLOATING | The unit sends a `floating` alert (see below) | "...the water at your house is still rising and your house is floating on it. It is protected for now. Please stay alert." | Once per 10 minutes |
| **CRITICAL flood level** | Stage 3, CRITICAL | A reading reaches the critical level (see settings) | "HydroLift CRITICAL: Hi Ana, floodwater at your house is at the critical level. Please get your pet to safety now." | Straight away, then **every 5 minutes** while the water stays that high |
| **All clear** | Recovery | The unit lowers the house by itself, and there was a flood warning in the last 24 hours | "HydroLift: ALL CLEAR. Hi Ana, the water at your house has gone down and your platform was lowered." | Once per 10 minutes |
| **Unit fault** | FAULT | The unit sends a `fault` alert | "HydroLift FAULT: Hi Ana, your unit reported a problem (actuator timeout). Please check it." | Once per 30 minutes |
| **Battery low** | Low battery | The unit sends a `battery-low` alert | "...the battery in your unit is low. Please charge or replace it..." | Once per 6 hours |
| **HydroLift is online** | Daily heartbeat | The unit sends a `heartbeat` alert | Not texted. Dashboard only | Once per 12 hours |

A lift or lowering the owner does by hand, or from the dashboard, is never an alert: they already know.

## What the server works out, and what the unit has to send

The unit as it is today already sends water readings and its automatic lifts and lowerings. From these the server raises **Flood warning**, **CRITICAL flood level** and **All clear** with no firmware change.

Things only the unit knows (a fault, a low battery, "I am floating", the daily heartbeat) arrive as a `device-alert` message over the same WebSocket the unit already uses. Nothing is raised until the firmware sends one.

```cpp
// Example: the firmware reporting an actuator timeout. Use the same WebSocket and
// document style as the "sensor-reading" and "lift-status" messages.
JsonDocument alertDoc;
alertDoc["type"] = "device-alert";
alertDoc["kind"] = "fault";            // fault | battery-low | floating | heartbeat
alertDoc["detail"] = "actuator timeout"; // optional, short plain words, 100 characters at most
String payload;
serializeJson(alertDoc, payload);
webSocket.sendTXT(payload);
```

Only a unit that logged in with its own device key can raise an alert, and only for its own house. A message with any other `kind` is ignored. Odd characters in `detail` are removed.

## Settings (in Render)

| Setting | What it does | If left empty |
|---|---|---|
| `CRITICAL_WATER_LEVEL` | The reading, on the sensor's 0 to 4 scale, at which the critical alert starts | 3.5 |
| `CRITICAL_REPEAT_MINUTES` | How often the critical alert repeats while the water stays that high | 5 |
| `SMS_GATEWAY_USER`, `SMS_GATEWAY_PASSWORD` | The free route: the login shown in the SMS Gateway for Android app on your phone | Nothing is texted (alerts still show on the dashboard) |

The design raises the critical alarm well above the warning level, where the lift has no more height to give. How far that is on the prototype's 0 to 4 sensor scale has to be worked out on the bench, so set `CRITICAL_WATER_LEVEL` once you know it.

## Checking it works

Sign in as admin, open **User management** and click **Send test text**. It says whether text sending is set up. Pick a user from the list and it sends one test text to the mobile number that user registered with.

If the list is empty, nobody has a registered mobile number yet, so nobody can be texted. Click **Edit** on a user and add their mobile number. If the window says it could not ask the server, the server on Render is still an older version without the text feature.

## Who gets the texts

Only the mobile number a user registered with. The system never asks anyone to type a number, and it cannot text a number that is not on an account. An alert goes to the owner of the device that raised it, and the number is looked up automatically when the alert happens. The test button works the same way: you pick a registered user, you do not type a number.
