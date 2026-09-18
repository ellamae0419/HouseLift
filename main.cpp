#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

#define SERVER_URL "ws://192.168.56.1:3001"
#define API_URL "http://192.168.56.1:3001"
const int ESP32_ID = 1;

#define WL_SENSOR 33
#define WL_POWER 32
#define SWITCH_PIN 4

#define ENA 26
#define ENB 27
#define IN1 14
#define IN2 18
#define IN3 19
#define IN4 25

#define WL_DRY 0
#define WL_WET 1500

String wifi_ssid = "Niervs";
String wifi_pass = "12345678";

WebSocketsClient webSocket;
bool wsConnected = false;

enum MotorState
{
  MOTOR_IDLE,
  MOTOR_MOVING
};
MotorState motorState = MOTOR_IDLE;
unsigned long motorStartTime = 0;

bool isLifted = false;
int motorSpeed = 255;
int motorDelay = 1000;

int wlValue = 0;
int highestRaw = 0;
int wlThreshold = 2;
unsigned long wlPrevMs = 0;

bool lastSwitchState = HIGH;

bool autoLiftEnabled = true;
bool enableNetworkStack = true;
bool runMotorSelfTest = false;

unsigned long debugPrevMs = 0;
const unsigned long debugInterval = 2000;

void stopMotor();
void startLift();
void connectToWiFi();
void connectWebSocket();
void fetchConfigFromServer();

void stopMotor()
{
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  Serial.println("[Motor] Stopped");
}

void startLift()
{
  if (motorState != MOTOR_IDLE)
  {
    Serial.println("[Motor] Busy — ignoring command");
    return;
  }

  if (!isLifted)
  {
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, HIGH);
    digitalWrite(IN3, HIGH);
    digitalWrite(IN4, LOW);
    Serial.println("[Motor] Moving UP");
  }
  else
  {
    digitalWrite(IN1, HIGH);
    digitalWrite(IN2, LOW);
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, HIGH);
    Serial.println("[Motor] Moving DOWN");
  }

  motorState = MOTOR_MOVING;
  motorStartTime = millis();
}

void updateMotor()
{
  if (motorState == MOTOR_IDLE)
    return;

  if (millis() - motorStartTime >= (unsigned long)motorDelay)
  {
    stopMotor();
    isLifted = !isLifted;
    motorState = MOTOR_IDLE;

    Serial.print("[Motor] Done. isLifted=");
    Serial.println(isLifted);

    if (enableNetworkStack && wsConnected)
    {
      DynamicJsonDocument doc(256);
      doc["type"] = "lift-status";
      doc["esp32_id"] = ESP32_ID;
      doc["isLifted"] = isLifted;
      String msg;
      serializeJson(doc, msg);
      webSocket.sendTXT(msg);
      Serial.print("[WS] Sent lift-status: ");
      Serial.println(msg);
    }
  }
}

float wlRead()
{
  unsigned long now = millis();
  if (now - wlPrevMs >= 1000)
  {
    wlPrevMs = now;

    digitalWrite(WL_POWER, HIGH);
    delay(10);
    wlValue = analogRead(WL_SENSOR);
    digitalWrite(WL_POWER, LOW);

    if (wlValue > highestRaw)
      highestRaw = wlValue;

    Serial.print("[WL] raw=");
    Serial.print(wlValue);
    Serial.print(" highest=");
    Serial.println(highestRaw);
  }
  return wlValue;
}

void connectToWiFi()
{
 void connectToWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(wifi_ssid);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(100);
  WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 60) { 
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.print("\n[WiFi] Connected! IP: ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println("\n[WiFi] Failed to connect.");
    int n = WiFi.scanNetworks();
    Serial.print("[WiFi] Nearby networks found: ");
    Serial.println(n);
    for (int i = 0; i < n; i++)
    {
      Serial.print("  ");
      Serial.print(WiFi.SSID(i));
      Serial.print(" (RSSI ");
      Serial.print(WiFi.RSSI(i));
      Serial.println(")");
    }
  }
}

void fetchConfigFromServer()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("[Config] WiFi not connected, skipping");
    return;
  }

  HTTPClient http;
  String url = String(API_URL) + "/esp32/config";
  Serial.print("[Config] Fetching from: ");
  Serial.println(url);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  String payload = "{\"esp32_id\":\"" + String(ESP32_ID) + "\"}";
  int httpCode = http.POST(payload);

  if (httpCode == 200)
  {
    String response = http.getString();
    DynamicJsonDocument doc(1024);
    DeserializationError err = deserializeJson(doc, response);
    if (!err)
    {
      wlThreshold = doc["threshold"] | wlThreshold;
      if (doc.containsKey("wifi_ssid"))
        wifi_ssid = doc["wifi_ssid"].as<String>();
      if (doc.containsKey("wifi_pass"))
        wifi_pass = doc["wifi_pass"].as<String>();
      Serial.print("[Config] Loaded. Threshold=");
      Serial.println(wlThreshold);
    }
    else
    {
      Serial.print("[Config] JSON parse error: ");
      Serial.println(err.c_str());
    }
  }
  else
  {
    Serial.print("[Config] HTTP error: ");
    Serial.println(httpCode);
  }
  http.end();
}

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {

  case WStype_CONNECTED:
    Serial.println("[WS] Connected!");
    wsConnected = true;
    break;

  case WStype_TEXT:
  {
    DynamicJsonDocument doc(1024);
    DeserializationError err = deserializeJson(doc, (const char *)payload, length);
    if (err)
    {
      Serial.print("[WS] JSON parse error: ");
      Serial.println(err.c_str());
      break;
    }

    const char *msgType = doc["type"] | "";
    Serial.print("[WS] Received type: ");
    Serial.println(msgType);

    if (String(msgType) == "threshold-update")
    {
      wlThreshold = doc["threshold"] | wlThreshold;
      Serial.print("[WS] Threshold updated: ");
      Serial.println(wlThreshold);
    }
    else if (String(msgType) == "lift-command")
    {
      if (motorState == MOTOR_IDLE)
      {
        Serial.println("[WS] Lift command received from dashboard");
        startLift();
      }
      else
      {
        Serial.println("[WS] Lift command ignored — motor busy");
      }
    }
    else if (String(msgType) == "auto-lift-toggle")
    {
      autoLiftEnabled = doc["enabled"] | autoLiftEnabled;
      Serial.print("[WS] Auto lift: ");
      Serial.println(autoLiftEnabled ? "ENABLED" : "DISABLED");
    }
    break;
  }

  case WStype_DISCONNECTED:
    Serial.println("[WS] Disconnected — will retry...");
    wsConnected = false;
    break;

  case WStype_ERROR:
    Serial.println("[WS] Error");
    break;
  }
}

void connectWebSocket()
{
  if (WiFi.status() != WL_CONNECTED)
    return;

  String wsUrl = String(SERVER_URL);
  wsUrl.replace("ws://", "");
  int colonIdx = wsUrl.indexOf(':');
  String host;
  int port = 80;
  if (colonIdx >= 0)
  {
    host = wsUrl.substring(0, colonIdx);
    port = wsUrl.substring(colonIdx + 1).toInt();
  }
  else
  {
    host = wsUrl;
  }

  Serial.print("[WS] Connecting to ");
  Serial.print(host);
  Serial.print(":");
  Serial.println(port);

  webSocket.begin(host.c_str(), port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void setup()
{
  Serial.begin(115200);
  Serial.println("\n--- Startup ---");
  Serial.print("ESP32 ID: ");
  Serial.println(ESP32_ID);

  pinMode(WL_POWER, OUTPUT);
  pinMode(SWITCH_PIN, INPUT_PULLUP);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);

  ledcAttach(ENA, 5000, 8);
  ledcAttach(ENB, 5000, 8);
  ledcWrite(ENA, motorSpeed);
  ledcWrite(ENB, motorSpeed);

  digitalWrite(WL_POWER, LOW);
  stopMotor();

  if (runMotorSelfTest)
  {
    Serial.println("[Test] Running motor self-test...");
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, HIGH);
    digitalWrite(IN3, HIGH);
    digitalWrite(IN4, LOW);
    delay(motorDelay);
    stopMotor();
    isLifted = true;
    Serial.println("[Test] Done. isLifted=true");
  }

  if (enableNetworkStack)
  {
    connectToWiFi();
    delay(1000);
    fetchConfigFromServer();
    delay(1000);
    connectWebSocket();
  }

  Serial.println("--- Setup complete ---");
}

void loop()
{
  if (enableNetworkStack)
    webSocket.loop();

  updateMotor();

  float raw = wlRead();
  float wl_value = (float)(raw - WL_DRY) / (float)(WL_WET - WL_DRY) * 4.0f;
  wl_value = constrain(wl_value, 0.0f, 4.0f);

  bool switchState = digitalRead(SWITCH_PIN);
  bool switchPressed = (lastSwitchState == HIGH && switchState == LOW);
  lastSwitchState = switchState;

  if (switchPressed && motorState == MOTOR_IDLE)
  {
    Serial.println("[Switch] Pressed — toggling lift");
    startLift();
  }

  if (autoLiftEnabled && motorState == MOTOR_IDLE)
  {
    if (wl_value >= wlThreshold && !isLifted)
    {
      Serial.println("[Auto] Water at/above threshold — lifting");
      startLift();
    }
  }

  unsigned long now = millis();
  if (now - debugPrevMs >= debugInterval)
  {
    debugPrevMs = now;

    Serial.print("[Loop] WL=");
    Serial.print(wl_value);
    Serial.print(" raw=");
    Serial.print(raw);
    Serial.print(" threshold=");
    Serial.print(wlThreshold);
    Serial.print(" isLifted=");
    Serial.print(isLifted);
    Serial.print(" motor=");
    Serial.print(motorState == MOTOR_IDLE ? "IDLE" : "MOVING");
    Serial.print(" switch=");
    Serial.println(switchState);

    if (enableNetworkStack && wsConnected)
    {
      DynamicJsonDocument sendDoc(256);
      sendDoc["type"] = "sensor-reading";
      sendDoc["esp32_id"] = ESP32_ID;
      sendDoc["wlValue"] = wlValue;
      sendDoc["wl_value"] = wl_value;
      sendDoc["isLifted"] = isLifted;
      sendDoc["threshold"] = wlThreshold;
      sendDoc["motorRunning"] = (motorState != MOTOR_IDLE);
      String outMsg;
      serializeJson(sendDoc, outMsg);
      webSocket.sendTXT(outMsg);
      Serial.print("[WS] Sent: ");
      Serial.println(outMsg);
    }
    else if (enableNetworkStack)
    {
      Serial.println("[WS] Not connected — skipping sensor send");
    }
  }
}
