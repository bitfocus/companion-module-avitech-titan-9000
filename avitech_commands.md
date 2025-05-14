# Avitech ASCII Protocol (AAP) Command Reference

This document provides a reference for the commands used to control the Avitech Titan 9000 device.

## 1. ASCII X Command

The Rainier 3G Plus/Quad / Titan 9000 supports the ASCII X command prompt interface through Ethernet port (IP) only.

### 1.1 ASCII X Command Format

The ASCII X command is comprised of the following parts:

```
Header Group/Module/Window Assignment Parameter 1 Parameter 2 …
```

The following is a list of rules to follow when entering the ASCII X command:

- It is acceptable to enter commands in small or capital letters and the five columns are separated by a space.
- Header = x + command character.
- Group/Module/Window assignment (GGGMMMPPP) =
  - Group = is comprised of the first three digits (001~099), "000" is used to pertain to all groups.
  - Module = is comprised of the middle three digits (001~099), "000" is used to pertain to all modules.
  - Window Assignment = is comprised of the last three digits (001~097), "000" is used to pertain to all window assignments, "098" is used to pertain to logo and "099" is used to pertain to clock.
- Parameter 1 = for advance setting of each X command.

## 2. Command Reference

### XP Command

**Function**: Load a previously saved preset or save current layout to a preset. Load or save latest configuration to system files ("Latest" and "Module.sys"). If the filename is not specified when saving the file, system will not backup the file into flash memory.

**Format**: 
```
XP GGGMMMPPP L[oad] / S[ave] filename.GP# / Latest / LatestAll
```

Where:
- `GGGMMMPPP` is the group/module/window assignment
- `L[oad]` or `S[ave]` specifies the operation
- `filename.GP#` is the preset file name
- `Latest` refers to the "Latest" system file
- `LatestAll` refers to both "Latest" and "Module.sys" system files

**Examples**:

```
XP 001000000 L Group 1.GP1
```
Set all the modules in group 1 to load the previously saved Group 1.GP1 preset file.

*Note: Input of filename is not case-sensitive.*

```
XP 002000000 S Group 2.GP2
```
Save the current layout of all modules in group 2 to a preset file Group 2.GP2.

```
XP 001000000 S LatestAll
```
Save the current layout of all modules in group 1 into "Latest" and "Module.sys" system files.

```
XP 001000000 S Latest
```
Save the current layout of all modules in group 1 into "Latest" system file.

## Appendix B: ASCII X Command Through TCP/IP Programming

### B.1 Starting TCP Connection

**Step 1.** Obtain IP address of device to connect to.

**Step 2.** Use this IP address to effect TCP connection with device. Upon establishing connection, device will send out a successful connection message. Message will include Frame ID.

- During PC software communication with control board firmware via TCP, control board firmware functions as TCP server while PC software functions as TCP client.

Take note of the following TCP communication properties:
- TCP port number is fixed at 20036.
- TCP server's control board firmware can allow simultaneous connection to 3 TCP client (maximum).

- Initially upon establishing connection between TCP server's control board firmware and TCP client, TCP server will acknowledge successful connection or failure. TCP client must then make the appropriate response.

### B.2 Connection is Successful

Control board will reply to TCP client using below 17-bytes message:

```
0xA5 0x5A 0xAA 0x55 0x11 0x00 0x00 0x01 0x80 0x01 0x00 0x00 (FrameID) (~FrameID) Machine_Type MB_Exist_Flag SocketID
```

Above message is comprised of the following parts:
- Byte 0~3: Header is fixed at 0xA5 0x5A 0xAA 0x55.
- Byte 4~5: Return message length is 0x11 0x00 (use "little-endian" expression), this means that length of message is 17 bytes.
- Byte 6: field is reserved for control board firmware use only, TCP client should ignore this field.
- Byte 7~8: is Command ID, it is fixed at 0x01 0x80.
- Byte 9: is "Ack" field, when fixed at 0x01 this means that TCP connection is successfully established.
- Byte 10~11: is fixed at 0x0000.
- Byte 12: Frame ID.
- Byte 13: bit inverse of Frame ID.
- Byte 14: Machine type: 1 = Rainier 3G Quad 2 = Rainier 3G Plus / Titan 9000
- Byte 15: MB existence flag: 0 = MB does not exist 1 = MB do exist
  - bit[0:3]: MB1 ~ MB4 existence flag
- Byte 16: Socket ID – TCP socket ID used by control board to effect present connection.

### B.3 Connection is Not Successful

Due to the fact that only 3 TCP connections is simultaneously allowed on TCP server's control board, when a fourth TCP client tries to request for connection, then TCP server's control board will reply with the following 14-bytes message to TCP client, informing client that number of allowed connection is inadequate and so is unable to establish connection:

```
0xA5 0x5A 0xAA 0x55 0x0E 0x00 0x00 0x01 0x80 0x00 0x11 0x00 (FrameID) (~FrameID)
```

After PC's TCP client has received this return message, existing connection to TCP socket in PC's software should be closed.

### B.4 Maintaining TCP Connection

Because control board's TCP Server connection has an 8-minute timeout limit, if during this duration and no (any) TCP message packet is transmitted to control board, then control board will automatically disconnect the TCP connection. Therefore, in order to avoid lengthy period of "TCP idle" state, PC should periodically transmit TCP/IP packet (within 8-minute time interval). Packet can be a typical control board command, or a TCP Ping command, or a simple "keep alive" packet (PC Windows system's TCP "Keep Alive" function can be activated to be able to automatically transmit periodic "keep alive" packet).

### B.5 Command Protocol

Format of command protocol used by PC's software to transmit command to Rainier 3G Plus' control board is as follows:

#### Table B-1: Command Protocol Format

| Byte Size | Field Name           | Description                                   |
|-----------|----------------------|-----------------------------------------------|
| 4         | Header               | 0x55 0xAA 0x5A 0xA5 (Fixed Header)            |
| 2         | Command Length       | Total command length (little-endian format). Includes all bytes from header to last parameter and checksum. |
| 1         | Reserved             | Default value is 0x00, used by control board firmware |
| 1         | Command ID Category  | Class/category of the command                 |
| 1         | Command ID (Number)  | Specific command number                       |
| 1         | Frame ID             | Identifies the rear panel rotary ID. Cannot be 0x0F unless in factory default mode |
| 1         | Inverse Frame ID     | Bitwise inverse of Frame ID (FrameID ^ 0xFF)  |
| 1         | Module ID Byte Length | Always 0x01                                   |
| 1         | Module ID            | Identifies module receiving the command       |
| 1         | Processor Number (Window) | Defaults to 0x00 if unused               |
| N (opt)   | Parameter            | Optional parameters based on command          |
| 1         | Checksum             | Sum of all bytes (excluding this byte) modulo 256 |

#### Table B-2: Description of Fields

| Byte Order | Length (Bytes) | Field                  | Description |
|------------|----------------|------------------------|-------------|
| 0          | 1              | 0x55                   | Fixed Header |
| 1          | 1              | 0xAA                   | Fixed Header |
| 2          | 1              | 0x5A                   | Fixed Header |
| 3          | 1              | 0xA5                   | Fixed Header |
| 4–5        | 2              | Command Length         | Total command length (includes header and checksum) |
| 6          | 1              | Reserved               | Always 0x00 |
| 7          | 1              | Command ID Category    | Class of command |
| 8          | 1              | Command ID (Number)    | Specific command |
| 9          | 1              | Frame ID               | Device ID from rotary dial |
| 10         | 1              | Inverse Frame ID       | Bitwise inverse of Frame ID |
| 11         | 1              | Module ID Byte Length  | Fixed at 0x01 |
| 12         | 1              | Module ID              | Target module number |
| 13         | 1              | Processor Number       | Window/Processor ID (0x00 if unused) |
| 14+        | —              | Parameter              | Optional per-command field |
| —          | 1              | Checksum               | Sum from 0x55 to last byte before checksum |

### B.6 Error Codes

Any error that occurs after binary command execution will cause firmware to transmit a 2-byte error code to PC software. The second byte is always fixed at `0x00`.

#### Table B-3: Error Codes

| Error Code | Description |
|------------|-------------|
| 0x01       | Command parsing error or command format error |
| 0x02       | Command checksum error |
| 0x03       | Frame_ID does not match |
| 0x04       | Module_ID / Module ID length does not match |
| 0x05       | Module style or sub-module style does not match real device |
| 0x06       | No such module – module specified in command does not exist |
| 0x07       | No such sub-module – sub-module specified does not exist |
| 0x08       | No such processor – processor specified does not exist |
| 0x09       | Command received is incomplete |
| 0x0A       | Device (module or sub-module) does not support this command |
| 0x0B       | This command does not support Multicast/Broadcast type |
| 0x0C       | Cannot execute command in this module state |
| 0x0D       | Command execution failed |
| 0x0E       | File already exists (filename already in use) |
| 0x0F       | File does not exist (used with write/continue_write/end_write) |
| 0x10       | Reserved |
| 0x11       | Too many TCP connections (limit: 3) |
| 0x12       | Inadequate flash memory space |
| 0x13       | Data already exists at flash address; overwrite not allowed |
| 0x14       | File CRC-16 check error |
| 0x15       | Already in read state; must terminate to proceed |
| 0x16       | Writing size too large (over 65535 bytes) |
| 0x17       | File size exceeds 8192 bytes |
| 0x18       | Invalid preset file format or structure |
| 0x19       | File size exceeds limit (e.g., 1.5MB for SLB668 firmware) |
| 0x1A       | Invalid input parameter |
| 0x1B       | Display Group ID invalid |
| 0x1C       | Display Module ID invalid |
| 0xFF       | Undefined or unknown error |

### B.7 Packing ASCII X Command to Binary Command Format

Function: to send ASCII X command via TCP/IP. Command format is comprised of the following parts:

- Byte 0~3: 0x55 0xAA 0x5A 0xA5 – header pattern is fixed.
- Byte 4~5: Command total length (use "little-endian" expression).
- Byte 6: 0x00 – fix value to 0x00 (reserved field.)
- Byte 7~8: 0x02 0x13 – fix value to 0x02 0x13 (Command ID field)
- Byte 9: 0x00 – fix value to 0x00 (no need to assign a Frame ID)
- Byte 10: 0xFF – fix value to 0xFF (inverse of Frame ID field)
- Byte 11: 0x01 – fix value to 0x01.
- Byte 12: 0xFE – fix value to 0xFE (Module ID of ALL_MB_MODULE.)
- Byte 13: 0x00 – fix value to 0x00.
- Byte 14~ :ASCII command string (N bytes)
- Byte (14+N-1): Checksum byte.

This command does not return any message to PC software.

#### B.7.1 Example

Original ASCII X command string = XN 001003001 E 1
(set chassis/frame "1" card/module "3" window "1" label outside the image)

After packing the ASCII X command into binary format:
```
55 AA 5A A5 1F 00 00 02 13 00 FF 01 FE 00 58 4E 20 30 30 31 30 30 33 30 30 31 20 45 20 31 61
```

The last byte "0x61" in the above binary stream is the Checksum byte.

## Additional Findings and Implementation Notes

The following information was discovered through testing and packet analysis, and may be helpful when implementing communication with the Avitech Titan 9000:

### Response Behavior

- The device does **not** send data responses for successful commands
- Successful commands are acknowledged only with TCP ACKs
- Only error conditions generate data responses from the device
- When implementing a client, do not wait for data responses after sending commands

### Command Format

- Commands do not require CRLF (`\r\n`) at the end
- If CRLF is included, it should be removed before calculating the checksum
- The device accepts commands with or without spaces between parameters

### Module ID

- The correct Module ID to use is `0xFE`, not `0xFC` as mentioned in some documentation
- Using `0xFC` may result in commands being ignored or rejected

### Checksum Calculation

The checksum is calculated as the sum of all preceding bytes modulo 256:

```javascript
let checksum = 0;
for (let i = 0; i < totalLength - 1; i++) {
    checksum = (checksum + buffer[i]) & 0xFF; // Sum modulo 256
}
```

### Preset Recall Examples

For recalling preset 1 from group 1:
```
XP 001000000 L preset1.GP1
```

Binary format:
```
55 AA 5A A5 29 00 00 02 13 00 FF 01 FE 00 58 50 20 30 30 31 30 30 30 30 30 30 20 4C 20 70 72 65 73 65 74 31 2E 47 50 31 F9
```

For recalling preset 2 from group 1:
```
XP 001000000 L preset2.GP1
```

Binary format:
```
55 AA 5A A5 29 00 00 02 13 00 FF 01 FE 00 58 50 20 30 30 31 30 30 30 30 30 30 20 4C 20 70 72 65 73 65 74 32 2E 47 50 31 FA
```

For recalling preset 10 from group 1 (note the different length):
```
XP 001000000 L preset10.GP1
```

Binary format:
```
55 AA 5A A5 2A 00 00 02 13 00 FF 01 FE 00 58 50 20 30 30 31 30 30 30 30 30 30 20 4C 20 70 72 65 73 65 74 31 30 2E 47 50 31 2A
```

### Keep-Alive Implementation

To prevent the 8-minute timeout, send a simple command periodically:

```
XP 000000000 L Latest
```

This command can be sent every 7 minutes to maintain the connection without affecting the device's state.