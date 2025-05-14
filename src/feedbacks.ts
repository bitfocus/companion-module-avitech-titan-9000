import { combineRgb, CompanionFeedbackDefinitions } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

export function UpdateFeedbacks(self: ModuleInstance): void {
	const feedbacks: CompanionFeedbackDefinitions = {}

	feedbacks.preset_loaded = {
		type: 'boolean',
		name: 'Preset Loaded',
		description: 'Indicates if the specified preset is currently loaded',
		defaultStyle: {
			bgcolor: combineRgb(0, 255, 0),
			color: combineRgb(0, 0, 0),
		},
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
				max: 14,
			},
		],
		callback: (feedback) => {
			const currentPreset = self.getVariableValue('preset_number')
			const currentGroup = self.getVariableValue('group_number')
			const targetPreset = Number(feedback.options.preset)
			const targetGroup = Number(feedback.options.group)

			// Return true if both the current preset and group match the target
			// Note: This is a simplified implementation since we don't have a way to know
			// which preset is actually loaded on the device without bidirectional communication
			return currentPreset === targetPreset && currentGroup === targetGroup
		},
	}

	self.setFeedbackDefinitions(feedbacks)
}
