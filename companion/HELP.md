# Avitech Titan 9000 Module for Companion

## Overview

This module enables integration between [Bitfocus Companion](https://bitfocus.io/companion/) and Avitech Titan 9000 multiviewer devices. It allows you to control and monitor your Avitech Titan 9000 device directly from your Companion interface, providing a seamless workflow for broadcast and production environments.

## Module Features

- Recall presets from the Avitech Titan 9000 device
- Monitor connection status in real-time
- Track currently loaded preset and group
- Reliable TCP/IP communication with automatic reconnection

## Requirements

- Bitfocus Companion
- Avitech Titan 9000 device
- Network connectivity between Companion and the Avitech Titan 9000 device

## Configuration

### Connection Settings

| Setting        | Description                                      |
| -------------- | ------------------------------------------------ |
| **IP Address** | The IP address of your Avitech Titan 9000 device |
| **Port**       | The port number (fixed at 20036 by the device)   |

### Device Setup

Before using this module, ensure your Avitech Titan 9000 device:

1. Has a static IP address or reserved DHCP address
2. Is accessible from the computer running Companion
3. Has presets saved with the correct naming format (see below)

### Preset Naming Requirements

**IMPORTANT**: For this module to work correctly, you must save presets on your Avitech Titan 9000 device using a specific naming format:

- Preset files must be named: `preset#.GP#`
- Where the first `#` is the preset number (1-14)
- And the second `#` is the group number (1-99)

For example:

- `preset1.GP1` = Preset 1 in Group 1
- `preset2.GP1` = Preset 2 in Group 1
- `preset1.GP2` = Preset 1 in Group 2

**NOTE**: You must use the Avitech utility "Phoenix-Q V1.06" (available on the Avitech website) to create presets with the proper naming format. This utility allows you to save and manage presets on your Avitech Titan 9000 device.

When you select a preset in Companion, the module will send a command to load the corresponding preset file with this naming convention.

## Available Actions

| Action            | Description                           | Parameters                                                |
| ----------------- | ------------------------------------- | --------------------------------------------------------- |
| **Preset Recall** | Recall a saved preset from the device | - **Group Number**: (1-99)<br>- **Preset Number**: (1-14) |

### Example Usage

1. Add a button to your Companion interface
2. Add the "Preset Recall" action to the button
3. Configure the Group Number (e.g., 1) and Preset Number (e.g., 2)
4. When pressed, this button will recall Preset 2 from Group 1 on your Avitech Titan 9000 device

## Available Feedbacks

| Feedback          | Description                                           | Parameters                                                                                                                                          |
| ----------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Preset Loaded** | Changes button color when a specific preset is loaded | - **Group Number**: (1-99)<br>- **Preset Number**: (1-14)<br>- **Foreground Color**: Color when active<br>- **Background Color**: Color when active |

### Example Usage

1. Add the "Preset Loaded" feedback to a button with the "Preset Recall" action
2. Configure the same Group Number and Preset Number as the action
3. Set the desired colors for when the preset is active
4. The button will now change color when the specified preset is loaded

## Available Variables

| Variable                         | Description                                                 |
| -------------------------------- | ----------------------------------------------------------- |
| **$(instance:preset_number)**    | The number of the currently loaded preset                   |
| **$(instance:group_number)**     | The group number of the currently loaded preset             |
| **$(instance:connection_state)** | The current connection state (Connected/Disconnected/Error) |

### Example Usage

1. Add a text field to your Companion interface
2. Use the text: "Current Preset: $(instance:preset_number) in Group $(instance:group_number)"
3. The text will dynamically update when presets are changed

## Troubleshooting

### Connection Issues

- Verify the IP address and port settings
- Ensure the device is powered on and connected to the network
- Check network connectivity with a ping test
- Verify no firewall is blocking the connection

### Preset Recall Problems

- Confirm presets are saved on the device with the correct naming format
- Check the connection state variable to ensure the module is connected
- Verify the group and preset numbers are within the valid ranges

## Additional Resources

- [Avitech Titan 9000](https://www.avitechvideo.com/products/titan-9000)
- [Bitfocus Companion](https://bitfocus.io/companion/)
- [Avitech Command Reference](../avitech_commands.md) - Detailed documentation of the Avitech ASCII Protocol (AAP) commands and implementation notes
