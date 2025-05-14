# Companion Module for Avitech Titan 9000

This module integrates the Avitech Titan 9000 multiviewer with Bitfocus Companion.

## Features

- Recall presets from the Avitech Titan 9000 device
- Monitor connection status
- Track currently loaded preset and group

## Installation

- In Companion, navigate to "Connections" and click "Add Connection"
- Search for "Avitech" and select "Avitech Titan 9000"
- Enter the IP address of your Avitech Titan 9000 device
- The default port is 20036 (this is fixed by the device)

## Preset Naming Requirements

**IMPORTANT**: For this module to work correctly, you must save presets on your Avitech Titan 9000 device using a specific naming format:

- Preset files must be named: `preset#.GP#`
- Where the first `#` is the preset number(s) (1-14)
- And the second `#` is the group number(s) (1-99)

For example:
- `preset1.GP1` = Preset 1 in Group 1
- `preset2.GP1` = Preset 2 in Group 1
- `preset1.GP2` = Preset 1 in Group 2

## Development

1. Clone the repository
2. Run `yarn` to install dependencies
3. Run `yarn dev` to start development with automatic recompilation
4. Run `yarn build` to build the module

## License

See [LICENSE](./LICENSE) for details.

## Help

See [HELP.md](./companion/HELP.md) for detailed usage instructions.
