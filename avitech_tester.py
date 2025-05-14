#!/usr/bin/env python3
"""
Avitech Titan 9000 Communication Tester

This script connects to an Avitech Titan 9000 device and tests various command formats
to help diagnose communication issues.
"""

import socket
import time
import binascii
import argparse
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("avitech_test.log"), logging.StreamHandler()],
)


class AvitechTester:
    def __init__(self, host, port=20036, timeout=5):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.socket = None
        self.connected = False
        self.socket_id = None
        self.machine_type = None

    def connect(self):
        """Establish connection to the device"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(self.timeout)
            self.socket.connect((self.host, self.port))
            logging.info(f"Connected to {self.host}:{self.port}")

            # Wait for handshake response
            response = self.receive_data()
            if response:
                self.parse_handshake(response)
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

    def receive_data(self, timeout=2):
        """Receive data from the device"""
        if not self.socket:
            return None

        self.socket.settimeout(timeout)
        try:
            data = self.socket.recv(1024)
            if data:
                hex_data = binascii.hexlify(data).decode("ascii")
                logging.debug(f"Received: {hex_data}")
                return data
            return None
        except socket.timeout:
            logging.debug("No data received (timeout)")
            return None
        except Exception as e:
            logging.error(f"Error receiving data: {e}")
            return None

    def parse_handshake(self, data):
        """Parse the handshake response"""
        if len(data) >= 17 and data[0:4] == b"\xa5\x5a\xaa\x55":
            if data[9] == 0x01:
                self.socket_id = data[16]
                self.machine_type = (
                    "Titan 9000" if data[14] == 0x02 else "Rainier 3G Quad"
                )
                self.connected = True
                logging.info(
                    f"Handshake successful. Socket ID: {self.socket_id}, Machine Type: {self.machine_type}"
                )
            else:
                logging.error("Connection rejected by device")
        else:
            logging.warning("Invalid handshake response")

    def calculate_checksum_xor(self, data):
        """Calculate XOR checksum of all bytes"""
        checksum = 0
        for b in data:
            checksum ^= b
        return checksum

    def calculate_checksum_sum(self, data):
        """Calculate sum checksum (modulo 256)"""
        return sum(data) & 0xFF

    def calculate_checksum_crc8(self, data):
        """Calculate CRC-8 checksum"""
        crc = 0
        for b in data:
            crc ^= b
            for _ in range(8):
                if crc & 0x80:
                    crc = (crc << 1) ^ 0x07
                else:
                    crc <<= 1
                crc &= 0xFF
        return crc

    def calculate_checksum_complement(self, data):
        """Calculate complement of XOR checksum"""
        return 0xFF - self.calculate_checksum_xor(data)

    def calculate_checksum_cmd_only(self, data, cmd_start=14):
        """Calculate XOR checksum of command part only"""
        return self.calculate_checksum_xor(data[cmd_start:])

    def calculate_checksum_no_header(self, data):
        """Calculate XOR checksum excluding header"""
        return self.calculate_checksum_xor(data[4:])

    def send_binary_command(
        self,
        ascii_cmd,
        module_id=0xFE,
        with_crlf=False,
        checksum_method="xor",
        reserved_byte=0x00,
        cmd_id_1=0x02,
        cmd_id_2=0x13,
        frame_id=0x00,
        inverse_frame_id=0xFF,
        fixed_value_1=0x01,
        fixed_value_2=0x00,
    ):
        """Send a command in binary format according to the protocol"""
        if not self.connected:
            logging.error("Not connected")
            return False

        # Add CRLF if requested
        if with_crlf:
            ascii_cmd = ascii_cmd + "\r\n"

        # Convert ASCII command to bytes
        cmd_bytes = ascii_cmd.encode("ascii")
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
        buffer[6] = reserved_byte

        # Command ID (bytes 7-8)
        buffer[7] = cmd_id_1
        buffer[8] = cmd_id_2

        # Frame ID (byte 9)
        buffer[9] = frame_id

        # Inverse Frame ID (byte 10)
        buffer[10] = inverse_frame_id

        # Fixed value (byte 11)
        buffer[11] = fixed_value_1

        # Module ID (byte 12)
        buffer[12] = module_id

        # Fixed value (byte 13)
        buffer[13] = fixed_value_2

        # ASCII command (bytes 14+)
        buffer[14 : 14 + cmd_length] = cmd_bytes

        # Calculate checksum (last byte) using specified method
        if checksum_method == "xor":
            checksum = self.calculate_checksum_xor(buffer[:-1])
        elif checksum_method == "sum":
            checksum = self.calculate_checksum_sum(buffer[:-1])
        elif checksum_method == "crc8":
            checksum = self.calculate_checksum_crc8(buffer[:-1])
        elif checksum_method == "complement":
            checksum = self.calculate_checksum_complement(buffer[:-1])
        elif checksum_method == "cmd_only":
            checksum = self.calculate_checksum_cmd_only(buffer[:-1])
        elif checksum_method == "no_header":
            checksum = self.calculate_checksum_no_header(buffer[:-1])
        elif checksum_method == "doc_example":
            # For the example in documentation: XN 001003001 E 1
            if ascii_cmd == "XN 001003001 E 1":
                checksum = 0x61  # Use the exact checksum from documentation
            else:
                checksum = self.calculate_checksum_xor(buffer[:-1])
        else:
            checksum = self.calculate_checksum_xor(buffer[:-1])

        buffer[-1] = checksum

        # Log the command
        hex_buffer = binascii.hexlify(buffer).decode("ascii")
        logging.info(f"Sending command: {ascii_cmd}")
        logging.debug(f"Binary format: {hex_buffer}")
        logging.debug(f"Checksum method: {checksum_method}, value: 0x{checksum:02X}")

        # Send the command
        try:
            self.socket.send(buffer)
            return True
        except Exception as e:
            logging.error(f"Error sending command: {e}")
            return False

    def test_preset_recall(self, preset_num, group_num, variations=True):
        """Test preset recall with various formats"""
        logging.info(f"Testing preset recall: Preset {preset_num}, Group {group_num}")

        # Base command
        base_cmd = f"XP {group_num:03d}000000 L preset{preset_num}.GP{group_num}"

        # Test with different checksum methods
        checksum_methods = [
            "xor",
            "sum",
            "crc8",
            "complement",
            "cmd_only",
            "no_header",
            "doc_example",
        ]
        for method in checksum_methods:
            logging.info(f"Testing with checksum method: {method}")
            self.send_binary_command(base_cmd, checksum_method=method)
            response = self.receive_data()

        if variations:
            # Test with/without CRLF
            logging.info("Testing with CRLF")
            self.send_binary_command(base_cmd, with_crlf=True)
            response = self.receive_data()

            # Test with different module IDs
            for module_id in [0xFC, 0xFE, 0xFD, 0xFF]:
                logging.info(f"Testing with Module ID: 0x{module_id:02X}")
                self.send_binary_command(base_cmd, module_id=module_id)
                response = self.receive_data()

            # Test with lowercase extension
            logging.info("Testing with lowercase extension")
            lowercase_cmd = (
                f"XP {group_num:03d}000000 L preset{preset_num}.gp{group_num}"
            )
            self.send_binary_command(lowercase_cmd)
            response = self.receive_data()

            # Test with different command formats
            logging.info("Testing with no spaces in command")
            no_spaces_cmd = f"XP{group_num:03d}000000Lpreset{preset_num}.GP{group_num}"
            self.send_binary_command(no_spaces_cmd)
            response = self.receive_data()

            # Test with different reserved byte values
            for reserved in [0x00, 0x01]:
                logging.info(f"Testing with reserved byte: 0x{reserved:02X}")
                self.send_binary_command(base_cmd, reserved_byte=reserved)
                response = self.receive_data()

            # Test with different command ID values
            cmd_id_pairs = [(0x02, 0x13), (0x01, 0x13), (0x02, 0x12)]
            for cmd_id_1, cmd_id_2 in cmd_id_pairs:
                if cmd_id_1 == 0x02 and cmd_id_2 == 0x13:
                    continue  # Skip the default pair
                logging.info(
                    f"Testing with Command ID: 0x{cmd_id_1:02X} 0x{cmd_id_2:02X}"
                )
                self.send_binary_command(base_cmd, cmd_id_1=cmd_id_1, cmd_id_2=cmd_id_2)
                response = self.receive_data()

    def analyze_response(self, data):
        """Analyze response data in detail"""
        if not data or len(data) < 10:
            logging.warning("Response too short to analyze")
            return

        try:
            # Check header
            if data[0:4] != b"\xa5\x5a\xaa\x55":
                logging.warning("Invalid header in response")

            # Check length
            length = data[4] + (data[5] << 8)
            if length != len(data):
                logging.warning(f"Length mismatch: stated {length}, actual {len(data)}")

            # Check command ID
            cmd_id = f"0x{data[7]:02X} 0x{data[8]:02X}"
            logging.debug(f"Command ID in response: {cmd_id}")

            # Check error code
            if len(data) > 10:
                error_code = data[10]
                error_messages = {
                    0x00: "No error",
                    0x01: "Command parsing error or command format error",
                    0x02: "Command checksum error",
                    0x03: "Frame_ID does not match",
                    0x04: "Module_ID/Module ID length does not match",
                    0x10: "Number of TCP connection has exceeded system limit",
                }
                error_msg = error_messages.get(
                    error_code, f"Unknown error code: 0x{error_code:02X}"
                )
                logging.debug(f"Error code: 0x{error_code:02X} - {error_msg}")
        except Exception as e:
            logging.error(f"Error analyzing response: {e}")

    def test_doc_example(self):
        """Test the example from documentation with various checksums"""
        logging.info("Testing example from documentation with various checksums")
        example_cmd = "XN 001003001 E 1"

        # Test with all checksum methods
        checksum_methods = [
            "xor",
            "sum",
            "crc8",
            "complement",
            "cmd_only",
            "no_header",
            "doc_example",
        ]
        for method in checksum_methods:
            logging.info(f"Testing example with checksum method: {method}")
            self.send_binary_command(example_cmd, checksum_method=method)
            response = self.receive_data()
            if response:
                self.analyze_response(response)

        # Test with exact binary format from documentation
        logging.info("Testing with exact binary format from documentation")
        # From documentation: 55 AA 5A A5 1F 00 00 02 13 00 FF 01 FE 00 58 4E 20 30 30 31 30 30 33 30 30 31 20 45 20 31 61
        exact_buffer = bytearray.fromhex(
            "55AA5AA51F0000021300FF01FE00584E20303031303033303031204520316100"
        )
        exact_buffer = exact_buffer[:-1]  # Remove the extra 00 at the end

        hex_buffer = binascii.hexlify(exact_buffer).decode("ascii")
        logging.info(f"Sending exact binary format from documentation")
        logging.debug(f"Binary format: {hex_buffer}")

        try:
            self.socket.send(exact_buffer)
            response = self.receive_data()
            if response:
                self.analyze_response(response)
        except Exception as e:
            logging.error(f"Error sending command: {e}")

        # Also try with manually constructed buffer and exact checksum
        logging.info("Testing with manually constructed buffer and exact checksum")
        cmd_bytes = example_cmd.encode("ascii")
        cmd_length = len(cmd_bytes)
        total_length = 14 + cmd_length + 1

        manual_buffer = bytearray(total_length)
        manual_buffer[0:4] = b"\x55\xaa\x5a\xa5"
        manual_buffer[4] = total_length & 0xFF
        manual_buffer[5] = (total_length >> 8) & 0xFF
        manual_buffer[6] = 0x00
        manual_buffer[7] = 0x02
        manual_buffer[8] = 0x13
        manual_buffer[9] = 0x00
        manual_buffer[10] = 0xFF
        manual_buffer[11] = 0x01
        manual_buffer[12] = 0xFE
        manual_buffer[13] = 0x00
        manual_buffer[14 : 14 + cmd_length] = cmd_bytes
        manual_buffer[-1] = 0x61  # Exact checksum from documentation

        hex_buffer = binascii.hexlify(manual_buffer).decode("ascii")
        logging.info(f"Sending command: {example_cmd}")
        logging.debug(f"Binary format: {hex_buffer}")
        logging.debug(f"Using exact checksum from documentation: 0x61")

        try:
            self.socket.send(manual_buffer)
            response = self.receive_data()
            if response:
                self.analyze_response(response)
        except Exception as e:
            logging.error(f"Error sending command: {e}")

    def run_diagnostics(self):
        """Run a series of diagnostic tests"""
        if not self.connect():
            return

        try:
            # Test basic connectivity
            logging.info("Running diagnostics...")

            # Test the example from documentation first
            self.test_doc_example()

            # Test preset recall with different formats
            self.test_preset_recall(1, 1)
            self.test_preset_recall(2, 1)

            # Try some simple commands with various checksum methods
            simple_commands = [
                "XP 001000000 L",
                "XP 001000000",
                "XN 001000000 E 1",
                "XP",
            ]

            for cmd in simple_commands:
                logging.info(f"Testing simple command: {cmd}")
                for method in ["xor", "sum", "crc8", "doc_example"]:
                    self.send_binary_command(cmd, checksum_method=method)
                    response = self.receive_data()
                    if response:
                        self.analyze_response(response)

        finally:
            self.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Avitech Titan 9000 Communication Tester"
    )
    parser.add_argument("host", help="IP address of the Avitech Titan 9000 device")
    parser.add_argument(
        "--port", type=int, default=20036, help="Port number (default: 20036)"
    )
    args = parser.parse_args()

    tester = AvitechTester(args.host, args.port)
    tester.run_diagnostics()
