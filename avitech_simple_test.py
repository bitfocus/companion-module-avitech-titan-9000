#!/usr/bin/env python3
"""
Avitech Titan 9000 Simple Command Sender

This script sends commands to an Avitech Titan 9000 device using the binary protocol
format observed in Wireshark. It doesn't wait for data responses, only TCP ACKs.
"""

import socket
import binascii
import time
import argparse
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("avitech_simple_test.log"), logging.StreamHandler()],
)

class AvitechSimpleTester:
    def __init__(self, host, port=20036, timeout=2):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.socket = None
        self.connected = False
    
    def connect(self):
        """Establish connection to the device"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(self.timeout)
            self.socket.connect((self.host, self.port))
            logging.info(f"Connected to {self.host}:{self.port}")
            self.connected = True
            
            # Wait briefly for handshake
            time.sleep(0.5)
            return True
        except Exception as e:
            logging.error(f"Connection failed: {e}")
            return False
    
    def disconnect(self):
        """Close the connection"""
        if self.socket:
            self.socket.close()
            logging.info("Disconnected")
            self.socket = None
            self.connected = False
    
    def send_command(self, ascii_cmd):
        """Send a command in binary protocol format"""
        if not self.connected:
            logging.error("Not connected")
            return False
        
        # Convert ASCII command to bytes
        cmd_bytes = ascii_cmd.encode('ascii')
        cmd_length = len(cmd_bytes)
        total_length = 14 + cmd_length + 1  # Header + command + checksum
        
        # Create binary command
        buffer = bytearray(total_length)
        
        # Header (bytes 0-3)
        buffer[0:4] = b"\x55\xaa\x5a\xa5"
        
        # Command length (bytes 4-5, little-endian)
        buffer[4] = total_length & 0xFF
        buffer[5] = (total_length >> 8) & 0xFF
        
        # Reserved (byte 6)
        buffer[6] = 0x00
        
        # Command ID (bytes 7-8)
        buffer[7] = 0x02
        buffer[8] = 0x13
        
        # Frame ID (byte 9)
        buffer[9] = 0x00
        
        # Inverse Frame ID (byte 10)
        buffer[10] = 0xFF
        
        # Fixed value (byte 11)
        buffer[11] = 0x01
        
        # Module ID (byte 12)
        buffer[12] = 0xFE
        
        # Fixed value (byte 13)
        buffer[13] = 0x00
        
        # ASCII command (bytes 14+)
        buffer[14:14+cmd_length] = cmd_bytes
        
        # Calculate checksum (sum modulo 256)
        checksum = sum(buffer[:-1]) & 0xFF
        buffer[-1] = checksum
        
        # Log the command
        hex_buffer = binascii.hexlify(buffer).decode('ascii')
        logging.info(f"Sending command: {ascii_cmd}")
        logging.debug(f"Binary format: {hex_buffer}")
        logging.debug(f"Checksum: 0x{checksum:02X}")
        
        # Send the command
        try:
            self.socket.send(buffer)
            logging.info("Command sent successfully")
            
            # Don't wait for data response, just a brief pause
            time.sleep(0.1)
            return True
        except Exception as e:
            logging.error(f"Error sending command: {e}")
            return False
    
    def test_preset_recall(self, preset_num, group_num):
        """Test recalling a specific preset"""
        cmd = f"XP {group_num:03d}000000 L preset{preset_num}.GP{group_num}"
        logging.info(f"Testing preset recall: Preset {preset_num}, Group {group_num}")
        return self.send_command(cmd)
    
    def run_tests(self, presets, groups, delay=1.0):
        """Run a series of preset recall tests"""
        if not self.connect():
            return
        
        try:
            # Test each preset and group combination
            for group_num in groups:
                for preset_num in presets:
                    self.test_preset_recall(preset_num, group_num)
                    time.sleep(delay)  # Add delay between commands
        finally:
            self.disconnect()

def main():
    parser = argparse.ArgumentParser(description='Avitech Titan 9000 Simple Command Sender')
    parser.add_argument('host', help='IP address of the Avitech Titan 9000 device')
    parser.add_argument('--port', type=int, default=20036, help='Port number (default: 20036)')
    parser.add_argument('--presets', type=str, default='1,2,3,10', help='Comma-separated list of preset numbers to test')
    parser.add_argument('--groups', type=str, default='1', help='Comma-separated list of group numbers to test')
    parser.add_argument('--delay', type=float, default=1.0, help='Delay between commands in seconds')
    
    args = parser.parse_args()
    
    # Parse preset and group numbers
    presets = [int(p.strip()) for p in args.presets.split(',') if p.strip().isdigit()]
    groups = [int(g.strip()) for g in args.groups.split(',') if g.strip().isdigit()]
    
    if not presets:
        presets = [1, 2]
    if not groups:
        groups = [1]
    
    logging.info(f"Testing presets: {presets}")
    logging.info(f"Testing groups: {groups}")
    
    tester = AvitechSimpleTester(args.host, args.port)
    tester.run_tests(presets, groups, args.delay)

if __name__ == "__main__":
    main()
