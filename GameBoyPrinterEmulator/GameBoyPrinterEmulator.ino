/*************************************************************************
 *
 * GAMEBOY PRINTER EMULATION PROJECT V3.2.1 (Arduino)
 * Copyright (C) 2022 Brian Khuu
 *
 * PURPOSE: To capture gameboy printer images without a gameboy printer
 *          via the arduino platform. (Tested on the arduino nano)
 *          This version is to investigate gameboy behaviour.
 *          This was originally started on 2017-4-6 but updated on 2020-08-16
 * LICENCE:
 *   This file is part of Arduino Gameboy Printer Emulator.
 *
 *   Arduino Gameboy Printer Emulator is free software:
 *   you can redistribute it and/or modify it under the terms of the
 *   GNU General Public License as published by the Free Software Foundation,
 *   either version 3 of the License, or (at your option) any later version.
 *
 *   Arduino Gameboy Printer Emulator is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with Arduino Gameboy Printer Emulator.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

#include <stdint.h> // uint8_t
#include <stddef.h> // size_t

#include "gameboy_printer_protocol.h"
#include "gbp_serial_io.h"

#include "gbp_pkt.h"




/* Gameboy Link Cable Mapping to Arduino Pin */
// Note: Serial Clock Pin must be attached to an interrupt pin of the arduino
//  ___________
// |  6  4  2  |
//  \_5__3__1_/   (at cable)
//

#ifdef ESP8266
// Pin Setup for ESP8266 Devices
//                  | Arduino Pin | Gameboy Link Pin  |
#define GBP_VCC_PIN               // Pin 1            : 5.0V (Unused)
#define GBP_SO_PIN       13       // Pin 2            : ESP-pin 7 MOSI (Serial OUTPUT) -> Arduino 13
#define GBP_SI_PIN       12       // Pin 3            : ESP-pin 6 MISO (Serial INPUT)  -> Arduino 12
#define GBP_SD_PIN                // Pin 4            : Serial Data  (Unused)
#define GBP_SC_PIN       14       // Pin 5            : ESP-pin 5 CLK  (Serial Clock)  -> Arduino 14
#define GBP_GND_PIN               // Pin 6            : GND (Attach to GND Pin)
#define LED_STATUS_PIN    2       // Internal LED blink on packet reception
#else
// Pin Setup for Arduinos
//                  | Arduino Pin | Gameboy Link Pin  |
#define GBP_VCC_PIN               // Pin 1            : 5.0V (Unused)
#define GBP_SO_PIN        4       // Pin 2            : Serial OUTPUT
#define GBP_SI_PIN        3       // Pin 3            : Serial INPUT
#define GBP_SD_PIN                // Pin 4            : Serial Data  (Unused)
#define GBP_SC_PIN        2       // Pin 5            : Serial Clock (Interrupt)
#define GBP_GND_PIN               // Pin 6            : GND (Attach to GND Pin)
#define LED_STATUS_PIN   13       // Internal LED blink on packet reception
#endif

/*******************************************************************************
*******************************************************************************/

// Dev Note: Gamboy camera sends data payload of 640 bytes usually

#define GBP_BUFFER_SIZE 400

/* Serial IO */
// This circular buffer contains a stream of raw packets from the gameboy
uint8_t gbp_serialIO_raw_buffer[GBP_BUFFER_SIZE] = {0};

/* Packet Buffer */
gbp_pkt_t gbp_pktState = {GBP_REC_NONE, 0};
uint8_t gbp_pktbuff[GBP_PKT_PAYLOAD_BUFF_SIZE_IN_BYTE] = {0};
uint8_t gbp_pktbuffSize = 0;

inline void gbp_parse_packet_loop();

/*******************************************************************************
  Utility Functions
*******************************************************************************/

const char *gbpCommand_toStr(int val)
{
  switch (val)
  {
    case GBP_COMMAND_INIT    : return "init";
    case GBP_COMMAND_PRINT   : return "print";
    case GBP_COMMAND_DATA    : return "fill";
    case GBP_COMMAND_BREAK   : return "break";
    case GBP_COMMAND_INQUIRY : return "status";
    default: return "unknown";
  }
}

/*******************************************************************************
  Interrupt Service Routine
*******************************************************************************/

#ifdef ESP8266
void ICACHE_RAM_ATTR serialClock_ISR(void)
#else
void serialClock_ISR(void)
#endif
{
  // Serial Clock (1 = Rising Edge) (0 = Falling Edge); Master Output Slave Input (This device is slave)
#ifdef GBP_FEATURE_USING_RISING_CLOCK_ONLY_ISR
  const bool txBit = gpb_serial_io_OnRising_ISR(digitalRead(GBP_SO_PIN));
#else
  const bool txBit = gpb_serial_io_OnChange_ISR(digitalRead(GBP_SC_PIN), digitalRead(GBP_SO_PIN));
#endif
  digitalWrite(GBP_SI_PIN, txBit ? HIGH : LOW);
}


/*******************************************************************************
  Main Setup and Loop
*******************************************************************************/

void setup(void)
{
  // Config Serial
  // Has to be fast or it will not transfer the image fast enough to the computer
  Serial.begin(115200);

  // Wait for Serial to be ready
  while (!Serial) {;}

  /* Pins from gameboy link cable */
  pinMode(GBP_SC_PIN, INPUT);
  pinMode(GBP_SO_PIN, INPUT);
  pinMode(GBP_SI_PIN, OUTPUT);

  /* Default link serial out pin state */
  digitalWrite(GBP_SI_PIN, LOW);

  /* LED Indicator */
  pinMode(LED_STATUS_PIN, OUTPUT);
  digitalWrite(LED_STATUS_PIN, LOW);

  /* Setup */
  gpb_serial_io_init(sizeof(gbp_serialIO_raw_buffer), gbp_serialIO_raw_buffer);

  /* Attach ISR */
#ifdef GBP_FEATURE_USING_RISING_CLOCK_ONLY_ISR
  attachInterrupt( digitalPinToInterrupt(GBP_SC_PIN), serialClock_ISR, RISING);  // attach interrupt handler
#else
  attachInterrupt( digitalPinToInterrupt(GBP_SC_PIN), serialClock_ISR, CHANGE);  // attach interrupt handler
#endif

  /* Packet Parser */
  gbp_pkt_init(&gbp_pktState);

#define VERSION_STRING "V3.2.1 (Copyright (C) 2022 Brian Khuu)"

  /* Welcome Message */
  Serial.println(F("Pocket Print Shop by spazzylemons"));
  Serial.println(F("based on Game Boy Printer Emulator " VERSION_STRING));
  Serial.println(F("--- GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007 ---"));
  Serial.println(F("This program comes with ABSOLUTELY NO WARRANTY;"));
  Serial.println(F("This is free software, and you are welcome to redistribute it"));
  Serial.println(F("under certain conditions. Refer to LICENSE file for detail."));
  Serial.println(F("---"));

  Serial.flush();
} // setup()

void loop()
{
  static uint16_t sioWaterline = 0;

  gbp_parse_packet_loop();

  // Trigger Timeout and reset the printer if byte stopped being received.
  static uint32_t last_millis = 0;
  uint32_t curr_millis = millis();
  if (curr_millis > last_millis)
  {
    uint32_t elapsed_ms = curr_millis - last_millis;
    if (gbp_serial_io_timeout_handler(elapsed_ms))
    {
      Serial.println("");
      Serial.print("// Completed ");
      Serial.print("(Memory Waterline: ");
      Serial.print(gbp_serial_io_dataBuff_waterline(false));
      Serial.print("B out of ");
      Serial.print(gbp_serial_io_dataBuff_max());
      Serial.println("B)");
      Serial.flush();
      digitalWrite(LED_STATUS_PIN, LOW);

      gbp_pkt_reset(&gbp_pktState);
    }
  }
  last_millis = curr_millis;

  // Diagnostics Console
  while (Serial.available() > 0)
  {
    switch (Serial.read())
    {
      case '?':
        Serial.println("d=debug, ?=help");
        break;

      case 'd':
        Serial.print("waterline: ");
        Serial.print(gbp_serial_io_dataBuff_waterline(false));
        Serial.print("B out of ");
        Serial.print(gbp_serial_io_dataBuff_max());
        Serial.println("B");
        break;
    }
  };
} // loop()

/******************************************************************************/

static const char b64Table[64] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

static void sendBase64(const uint8_t *message, size_t len) {
  const char *messageEnd = &message[len];
  uint8_t b, acc;
  while (message != messageEnd) {
    b = *message++;
    Serial.write(b64Table[b >> 2]);
    acc = (b & 3) << 4;
    if (message != messageEnd) {
      b = *message++;
      Serial.write(b64Table[acc | (b >> 4)]);
      acc = (b & 0x0f) << 2;
      if (message != messageEnd) {
        b = *message++;
        Serial.write(b64Table[acc | (b >> 6)]);
        Serial.write(b64Table[b & 0x3f]);
      } else {
        Serial.write(b64Table[acc]);
        Serial.write('=');
      }
    } else {
      Serial.write(b64Table[acc]);
      Serial.write("==");
    }
  }
}

inline void gbp_parse_packet_loop(void)
{
  for (int i = 0 ; i < gbp_serial_io_dataBuff_getByteCount() ; i++)
  {
    if (gbp_pkt_processByte(&gbp_pktState, (const uint8_t) gbp_serial_io_dataBuff_getByte(), gbp_pktbuff, &gbp_pktbuffSize, sizeof(gbp_pktbuff)))
    {
      if (gbp_pktState.received == GBP_REC_GOT_PACKET)
      {
          digitalWrite(LED_STATUS_PIN, HIGH);
          Serial.print((char)'{');
          Serial.print("\"type\":\"");
          Serial.print(gbpCommand_toStr(gbp_pktState.command));
          Serial.print("\"");
          if (gbp_pktState.command == GBP_COMMAND_INQUIRY) {
            Serial.print(",\"status\":{");
            Serial.print(",\"unprocessed\":");
            Serial.print(gpb_status_bit_getbit_unprocessed_data(gbp_pktState.status) ? '1' : '0');
            Serial.print(",\"full\":");
            Serial.print(gpb_status_bit_getbit_print_buffer_full(gbp_pktState.status)? '1' : '0');
            Serial.print(",\"busy\":");
            Serial.print(gpb_status_bit_getbit_printer_busy(gbp_pktState.status)     ? '1' : '0');
            Serial.print(",\"checksum\":");
            Serial.print(gpb_status_bit_getbit_checksum_error(gbp_pktState.status)   ? '1' : '0');
            Serial.print((char)'}');
          } else if (gbp_pktState.command == GBP_COMMAND_PRINT) {
            Serial.print(",\"sheets\":");
            Serial.print(gbp_pkt_printInstruction_num_of_sheets(gbp_pktbuff));
            Serial.print(",\"marginUpper\":");
            Serial.print(gbp_pkt_printInstruction_num_of_linefeed_before_print(gbp_pktbuff));
            Serial.print(",\"marginLower\":");
            Serial.print(gbp_pkt_printInstruction_num_of_linefeed_after_print(gbp_pktbuff));
            Serial.print(",\"pallet\":");
            Serial.print(gbp_pkt_printInstruction_palette_value(gbp_pktbuff));
            Serial.print(",\"density\":");
            Serial.print(gbp_pkt_printInstruction_print_density(gbp_pktbuff));
          } else if (gbp_pktState.command == GBP_COMMAND_DATA) {
            Serial.print(",\"compressed\":");
            Serial.print(gbp_pktState.compression);
            Serial.print(",\"more\":");
            Serial.print((gbp_pktState.dataLength != 0)?'1':'0');
          }
          Serial.println((char)'}');
          Serial.flush();
      }
      else
      {
        // Simplified support for gameboy camera only application
        // Dev Note: Good for checking if everything above decompressor is working
        if (gbp_pktbuffSize > 0)
        {
          Serial.print("{\"type\":\"data\",\"data\":\"");
          sendBase64(gbp_pktbuff, gbp_pktbuffSize);
          Serial.println("\"}");
          Serial.flush();
        }
      }
    }
  }
}