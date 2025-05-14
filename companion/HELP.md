## Avitech Titan 9000 Module

This module allows you to control Avitech Titan 9000 devices through Companion.

### Configuration
- **IP Address**: The IP address of your Avitech Titan 9000 device
- **Port**: The port number of your Avitech Titan 9000 device (Fixed at 20036)

### Preset Naming Requirements
**IMPORTANT**: For this module to work correctly, you must save presets on your Avitech Titan 9000 device using a specific naming format:

- Preset files must be named: `preset#.GP#`
- Where the first `#` is the preset number (1-14)
- And the second `#` is the group number (1-99)

For example:
- `preset1.GP1` = Preset 1 in Group 1
- `preset2.GP1` = Preset 2 in Group 1
- `preset1.GP2` = Preset 1 in Group 2

When you select a preset in Companion, the module will send a command to load the corresponding preset file with this naming convention.

### Available Actions
- **Preset Recall**: Recall saved presets from the device using the naming format described above

### Feedbacks
- **Preset Loaded**: Indicates which preset is currently loaded

### Variables
- **Preset Number**: The number of the currently loaded preset
- **Group Number**: The group number of the currently loaded preset
- **Connection State**: The current connection state (connected/disconnected)
