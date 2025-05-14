import { CompanionVariableDefinition } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const variables: CompanionVariableDefinition[] = [
		{
			variableId: 'preset_number',
			name: 'Preset Number',
		},
		{
			variableId: 'group_number',
			name: 'Group Number',
		},
		{
			variableId: 'connection_state',
			name: 'Connection State',
		},
	]

	self.setVariableDefinitions(variables)
}
