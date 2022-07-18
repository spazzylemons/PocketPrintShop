/**
 * Game boy printer emulator for Arduino - part of the Pocket Print Shop
 */

#include "SoftwareSerial.h"

static SoftwareSerial bluetooth(2, 3);

void setup() {
  bluetooth.begin(112500);
}

static const char b64Table[64] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

static void sendBase64(const char *message, size_t len) {
  const char *messageEnd = &message[len];
  uint8_t b, acc;
  while (message != messageEnd) {
    b = *message++;
    bluetooth.write(b64Table[b >> 2]);
    acc = (b & 3) << 4;
    if (message != messageEnd) {
      b = *message++;
      bluetooth.write(b64Table[acc | (b >> 4)]);
      acc = (b & 0x0f) << 2;
      if (message != messageEnd) {
        b = *message++;
        bluetooth.write(b64Table[acc | (b >> 6)]);
        bluetooth.write(b64Table[b & 0x3f]);
      } else {
        bluetooth.write(b64Table[acc]);
        bluetooth.write('=');
      }
    } else {
      bluetooth.write(b64Table[acc]);
      bluetooth.write("==");
    }
  }
  bluetooth.write('\n');
  bluetooth.flush();
}


void loop() {
  // send some test data
  static char data_to_send_1[3] = {10, 20, 30};
  sendBase64(data_to_send_1, 3);
  delay(1000);
  static char data_to_send_2[4] = {40, 50, 60, 70};
  sendBase64(data_to_send_2, 4);
  delay(1000);
  static char data_to_send_3[5] = {80, 90, 100, 110, 120};
  sendBase64(data_to_send_3, 5);
  delay(5000);
}
