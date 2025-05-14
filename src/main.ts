import {
	InstanceBase,
	runEntrypoint,
	InstanceStatus,
	SomeCompanionConfigField,
	TCPHelper,
} from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	tcp: TCPHelper | null = null
	currentPreset: number = 1
	currentGroup: number = 1
	keepAliveInterval: any = null
	connectionEstablished: boolean = false
	socketId: number | null = null

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		// Initialize variables with default values
		this.setVariableValues({
			preset_number: this.currentPreset,
			group_number: this.currentGroup,
			connection_state: 'Disconnected',
		})

		// Initialize TCP connection
		this.initTCP()

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
	}

	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'destroy')
		this.destroyTCP()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		const oldConfig = this.config
		this.config = config

		// If IP changed, reinitialize connection
		if (oldConfig.host !== config.host) {
			this.destroyTCP()
			this.initTCP()
		}
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	// Initialize TCP connection to the device
	initTCP(): void {
		if (this.tcp !== null) {
			this.destroyTCP()
		}

		this.updateStatus(InstanceStatus.Connecting)
		this.connectionEstablished = false
		this.socketId = null

		// Use the port from the config (which is set to 20036 by default)
		this.tcp = new TCPHelper(this.config.host, this.config.port)

		this.tcp.on('connect', () => {
			this.log('info', `TCP socket connected to ${this.config.host}:${this.config.port}`)
			// Connection is established, but we need to wait for the handshake response
			// The device will send a handshake message upon connection
		})

		this.tcp.on('error', (err) => {
			this.updateStatus(InstanceStatus.ConnectionFailure)
			this.setVariableValues({ connection_state: 'Error' })
			this.log('error', `TCP error: ${err.message}`)
			this.stopKeepAlive()
		})

		this.tcp.on('data', (data) => {
			this.processIncomingData(data)
		})
	}

	// Start the keep-alive mechanism to prevent the 8-minute timeout
	startKeepAlive(): void {
		// Clear any existing interval
		this.stopKeepAlive()

		// Set up a new interval to send a keep-alive packet every 7 minutes (420000 ms)
		// This is less than the 8-minute timeout mentioned in the documentation
		this.keepAliveInterval = setInterval(() => {
			if (this.tcp && this.tcp.isConnected && this.connectionEstablished) {
				this.log('debug', 'Sending keep-alive packet')
				// Send a simple command as a keep-alive
				// This could be a query command or any valid command that doesn't affect the system
				this.sendCommand('XP 000000000 L Latest\r\n')
			}
		}, 420000) // 7 minutes
	}

	// Stop the keep-alive mechanism
	stopKeepAlive(): void {
		if (this.keepAliveInterval) {
			clearInterval(this.keepAliveInterval)
			this.keepAliveInterval = null
		}
	}

	// Clean up TCP connection
	destroyTCP(): void {
		this.stopKeepAlive()

		if (this.tcp !== null) {
			this.tcp.destroy()
			this.tcp = null
		}

		this.connectionEstablished = false
		this.socketId = null
		this.setVariableValues({ connection_state: 'Disconnected' })
	}

	// Process incoming data from the device
	processIncomingData(data: any): void {
		this.log('debug', `Received data: ${data.toString('hex')}`)

		// Check if this is the handshake response
		if (data.length >= 17 && data[0] === 0xa5 && data[1] === 0x5a && data[2] === 0xaa && data[3] === 0x55) {
			// Check if connection is successful (Ack field = 0x01)
			if (data[9] === 0x01) {
				this.socketId = data[16] // Store the Socket ID
				this.connectionEstablished = true
				this.updateStatus(InstanceStatus.Ok)
				this.setVariableValues({ connection_state: 'Connected' })
				this.log('info', `Connected to Avitech Titan 9000 at ${this.config.host}:${this.config.port}`)

				// Start the keep-alive mechanism
				this.startKeepAlive()
			} else if (data[9] === 0x00) {
				// Connection failed (probably too many connections)
				this.updateStatus(InstanceStatus.ConnectionFailure)
				this.setVariableValues({ connection_state: 'Error' })
				this.log('error', 'Connection failed: Maximum number of connections reached')
				this.destroyTCP()
			}
		} else if (data.length >= 17) {
			// This is likely a command response
			this.log('debug', 'Received command response')
		}
	}

	// Send a command to the device
	sendCommand(asciiCmd: string): void {
		if (this.tcp && this.tcp.isConnected && this.connectionEstablished) {
			// Create binary command according to section B.7 of the documentation
			// Use a more compatible approach for Buffer
			const cmdBytes = new Uint8Array([...asciiCmd].map(c => c.charCodeAt(0)))
			const cmdLength = cmdBytes.length
			const totalLength = 14 + cmdLength + 1 // Header + command + checksum
			
			// Create buffer for the entire command
			const buffer = new Uint8Array(totalLength)
			
			// Header (bytes 0-3)
			buffer[0] = 0x55
			buffer[1] = 0xAA
			buffer[2] = 0x5A
			buffer[3] = 0xA5
			
			// Command length (bytes 4-5, little-endian)
			buffer[4] = totalLength & 0xFF
			buffer[5] = (totalLength >> 8) & 0xFF
			
			// Reserved (byte 6)
			buffer[6] = 0x00
			
			// Command ID (bytes 7-8)
			buffer[7] = 0x02
			buffer[8] = 0x13
			
			// Frame ID (byte 9)
			buffer[9] = 0x00
			
			// Inverse Frame ID (byte 10)
			buffer[10] = 0xFF
			
			// Fixed value (byte 11)
			buffer[11] = 0x01
			
			// Module ID (byte 12)
			buffer[12] = 0xFC
			
			// Fixed value (byte 13)
			buffer[13] = 0x00
			
			// ASCII command (bytes 14+)
			for (let i = 0; i < cmdBytes.length; i++) {
				buffer[14 + i] = cmdBytes[i]
			}
			
			// Calculate checksum (last byte)
			let checksum = 0
			for (let i = 0; i < totalLength - 1; i++) {
				checksum ^= buffer[i] // XOR checksum
			}
			buffer[totalLength - 1] = checksum
			
			this.log('debug', `Sending command: ${asciiCmd}`)
			this.log('debug', `Binary format: ${Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('')}`)
			this.tcp.send(buffer)
		} else {
			this.log('warn', 'Cannot send command, not connected to device')
		}
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
