import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	host: string
	port: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Device IP Address',
			width: 12,
			regex: Regex.IP,
			tooltip: 'The IP address of your Avitech Titan 9000 device',
		},
		{
			type: 'number',
			id: 'port',
			label: 'Device Port (Fixed at 20036)',
			width: 6,
			min: 20036,
			max: 20036,
			default: 20036,
			tooltip: 'The port number of your Avitech Titan 9000 device (Fixed at 20036)',
		},
	]
}
