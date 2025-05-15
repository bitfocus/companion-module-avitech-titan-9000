# Companion Module for Avitech Titan 9000

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node: v22](https://img.shields.io/badge/Node-v22-blue)](https://nodejs.org)
[![Companion: Compatible](https://img.shields.io/badge/Companion-Compatible-green)](https://bitfocus.io/companion/)

This module integrates the Avitech Titan 9000 multiviewer with [Bitfocus Companion](https://bitfocus.io/companion/), allowing you to control and monitor your Avitech Titan 9000 device directly from your Companion interface.

## Features

- **Preset Management**: Recall saved presets from the Avitech Titan 9000 device
- **Status Monitoring**: Track connection status in real-time
- **Preset Tracking**: Monitor currently loaded preset and group
- **Reliable Communication**: Robust TCP/IP implementation with automatic reconnection

## Requirements

- Bitfocus Companion
- Avitech Titan 9000 device
- Network connectivity between Companion and the Avitech Titan 9000 device

## Installation

1. In Companion, navigate to "Connections" and click "Add Connection"
2. Search for "Avitech" and select "Avitech Titan 9000"
3. Enter the IP address of your Avitech Titan 9000 device
4. The default port is 20036 (this is fixed by the device)
5. Click "Save" to establish the connection

## Configuration

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

## Available Actions

- **Recall Preset**: Load a specific preset from a specific group

## Available Feedbacks

- **Preset Loaded**: Changes button color when a specific preset is loaded

## Available Variables

- **Preset Number**: The number of the currently loaded preset
- **Group Number**: The group number of the currently loaded preset
- **Connection State**: The current connection state (connected/disconnected)

## Development

### Setup Development Environment

1. Clone the repository

   ```bash
   git clone https://github.com/danielbrodie/companion-module-avitech-titan-9000.git
   cd companion-module-avitech-titan-9000
   ```

2. Install dependencies

   ```bash
   yarn
   ```

3. Start development with automatic recompilation

   ```bash
   yarn dev
   ```

4. Build the module
   ```bash
   yarn build
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

For detailed usage instructions, see [HELP.md](./companion/HELP.md).

If you encounter any issues or have questions, please [open an issue](https://github.com/danielbrodie/companion-module-avitech-titan-9000/issues) on GitHub.

## Additional Resources

- [Bitfocus Companion](https://bitfocus.io/companion/)
- [Avitech Titan 9000](https://www.avitechvideo.com/products/titan-9000)
- [Avitech Command Reference](./avitech_commands.md) - Detailed documentation of the Avitech ASCII Protocol (AAP) commands and implementation notes
