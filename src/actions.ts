import { CompanionActionDefinition } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

export function UpdateActions(self: ModuleInstance): void {
	const actions: { [id: string]: CompanionActionDefinition } = {}

	actions.preset_recall = {
		name: 'Preset Recall',
		options: [
			{
				id: 'group',
				type: 'number',
				label: 'Group Number',
				default: 1,
				min: 1,
				max: 99,
			},
			{
				id: 'preset',
				type: 'number',
				label: 'Preset Number',
				default: 1,
				min: 1,
				max: 14, // Documentation states up to 14 presets can be saved and recalled per card
			},
		],
		callback: async (event) => {
			const groupNumber = event.options.group as number
			const presetNumber = event.options.preset as number

			// Format the group number with leading zeros to make it 3 digits
			const groupStr = groupNumber.toString().padStart(3, '0')

			// Create the command according to the protocol
			// XP GGGMMMPPP L presetX.gpY
			// Where GGG is the group (001-099), MMM is the module (000 for all), PPP is the window (000 for all)
			// L is the load command, and presetX.gpY is the preset file name
			// X is the preset number, Y is the group number
			const command = `XP ${groupStr}000000 L preset${presetNumber}.GP${groupNumber}\r\n`

			self.log('debug', `Recalling preset: preset${presetNumber}.GP${groupNumber}`)
			self.log('debug', `Command: ${command}`)

			try {
				// Send the command to the device
				self.sendCommand(command)

				// Update variables
				self.setVariableValues({
					preset_number: presetNumber,
					group_number: groupNumber,
				})

				// Check feedbacks to update button states
				self.checkFeedbacks('preset_loaded')
			} catch (error) {
				self.log('error', `Failed to recall preset: ${error}`)
			}
		},
	}

	self.setActionDefinitions(actions)
}
