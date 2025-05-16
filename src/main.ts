// Declare Buffer for TypeScript
declare const Buffer: any

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
				
				// According to section B.4 of the documentation, any TCP message will prevent timeout
				// We'll send a minimal packet that won't affect the device state
				if (this.tcp) {
					// Create a minimal valid packet with proper header but no command
					// This is just to keep the connection alive without changing device state
					const totalLength = 15 // Header (4) + fixed fields (10) + checksum (1)
					const buffer = Buffer.alloc(totalLength)
					
					// Header (bytes 0-3)
					buffer[0] = 0x55
					buffer[1] = 0xaa
					buffer[2] = 0x5a
					buffer[3] = 0xa5
					
					// Command length (bytes 4-5, little-endian)
					buffer.writeUInt16LE(totalLength, 4)
					
					// Reserved (byte 6)
					buffer[6] = 0x00
					
					// Command ID (bytes 7-8) - using 0x00 0x00 for a no-op
					buffer[7] = 0x00
					buffer[8] = 0x00
					
					// Frame ID (byte 9)
					buffer[9] = 0x00
					
					// Inverse Frame ID (byte 10)
					buffer[10] = 0xff
					
					// Fixed value (byte 11)
					buffer[11] = 0x01
					
					// Module ID (byte 12)
					buffer[12] = 0xfe
					
					// Fixed value (byte 13)
					buffer[13] = 0x00
					
					// Calculate checksum (last byte)
					let checksum = 0
					for (let i = 0; i < totalLength - 1; i++) {
						checksum = (checksum + buffer[i]) & 0xff
					}
					buffer[totalLength - 1] = checksum
					
					void this.tcp.send(buffer)
					this.log('debug', 'Keep-alive packet sent')
				}
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
	processIncomingData(data: Buffer): void {
		this.log('debug', `Received data: ${data.toString('hex')}`)

		// Check for valid header pattern
		if (data.length >= 14 && data[0] === 0xa5 && data[1] === 0x5a && data[2] === 0xaa && data[3] === 0x55) {
			// Check if this is a connection response (based on Command ID 0x01 0x80)
			if (data[7] === 0x01 && data[8] === 0x80) {
				// This is a connection response
				if (data[9] === 0x01 && data.length >= 17) {
					// Connection successful - 17-byte message
					// Byte 14: Machine type: 1 = Rainier 3G Quad 2 = Rainier 3G Plus / Titan 9000
					// Byte 15: MB existence flag
					// Byte 16: Socket ID
					const machineType = data[14] === 0x02 ? 'Titan 9000' : 'Rainier 3G Quad'
					this.socketId = data[16] // Store the Socket ID
					this.connectionEstablished = true
					this.updateStatus(InstanceStatus.Ok)
					this.setVariableValues({ connection_state: 'Connected' })
					this.log('info', `Connected to Avitech ${machineType} at ${this.config.host}:${this.config.port}`)
					this.log('debug', `Socket ID: ${this.socketId}, Machine Type: ${machineType}`)

					// Start the keep-alive mechanism to prevent the 8-minute timeout
					this.startKeepAlive()
				} else if (data[9] === 0x00 && data.length >= 14) {
					// Connection failed - 14-byte message
					// "Connection is Not Successful" from section B.3
					this.updateStatus(InstanceStatus.ConnectionFailure)
					this.setVariableValues({ connection_state: 'Error' })
					this.log('error', 'Connection failed: Maximum number of connections reached (limit is 3)')
					this.destroyTCP()
				}
			} else {
				// This is likely a command response
				this.log('debug', 'Received command response')

				// Check for error codes according to Table B-6
				if (data.length >= 11 && data[10] !== 0x00) {
					// This is an error response
					let errorMessage = 'Unknown error'

					// Interpret error code according to Table B-6
					switch (data[10]) {
						case 0x01:
							errorMessage = 'Command parsing error or command format error'
							break
						case 0x02:
							errorMessage = 'Command checksum error'
							break
						case 0x03:
							errorMessage = 'Frame_ID does not match'
							break
						case 0x04:
							errorMessage = 'Module_ID/Module ID length does not match'
							break
						case 0x05:
							errorMessage = 'Module style or sub-module style does not match real device'
							break
						case 0x06:
							errorMessage = 'No such module - module specified in the command does not exist'
							break
						case 0x07:
							errorMessage = 'No such sub-module - sub-module specified in the command does not exist'
							break
						case 0x08:
							errorMessage = 'No such processor - processor specified in the command does not exist'
							break
						case 0x09:
							errorMessage = 'Command received is incomplete'
							break
						case 0x0a:
							errorMessage = 'Device (module or sub-module) does not support this command'
							break
						case 0x0b:
							errorMessage = 'This command does not support MulticastBroadcast command type'
							break
						case 0x0c:
							errorMessage = 'Cannot execute command in this module'
							break
						case 0x0d:
							errorMessage = 'Command execution failed'
							break
						case 0x0e:
							errorMessage = 'File already exist (filename already in use)'
							break
						case 0x0f:
							errorMessage = 'File does not exist or was not created properly'
							break
						case 0x10:
							errorMessage = 'Number of TCP connection has exceeded system limit'
							break
					}

					this.log('error', `Command error: ${errorMessage} (0x${data[10].toString(16).padStart(2, '0')})`)
				}
			}
		}
	}

	/**
	 * Send a command to the Avitech Titan 9000 device
	 *
	 * This method converts ASCII commands to the binary format required by the device
	 * according to section B.7 of the Avitech Titan 9000 documentation.
	 *
	 * The binary format consists of:
	 * - Header (4 bytes): 0x55 0xAA 0x5A 0xA5
	 * - Command length (2 bytes, little-endian)
	 * - Reserved byte (1 byte): 0x00
	 * - Command ID (2 bytes): 0x02 0x13
	 * - Frame ID (1 byte): 0x00
	 * - Inverse Frame ID (1 byte): 0xFF
	 * - Fixed value (1 byte): 0x01
	 * - Module ID (1 byte): 0xFE
	 * - Fixed value (1 byte): 0x00
	 * - ASCII command (variable length)
	 * - Checksum (1 byte): Sum modulo 256 of all previous bytes
	 *
	 * @param asciiCmd The ASCII command to send
	 */
	sendCommand(asciiCmd: string): void {
		if (this.tcp && this.tcp.isConnected && this.connectionEstablished) {
			// Remove any trailing CRLF if present
			const cleanCmd = asciiCmd.replace(/\r\n$/, '')

			// Convert ASCII command to binary format according to section B.7 of the documentation
			const cmdBytes = Buffer.from(cleanCmd, 'ascii')
			const cmdLength = cmdBytes.length
			const totalLength = 14 + cmdLength + 1 // Header (4) + fixed fields (10) + command + checksum (1)

			// Create buffer for the entire command
			const buffer = Buffer.alloc(totalLength)

			// Header (bytes 0-3)
			buffer[0] = 0x55
			buffer[1] = 0xaa
			buffer[2] = 0x5a
			buffer[3] = 0xa5

			// Command length (bytes 4-5, little-endian)
			buffer.writeUInt16LE(totalLength, 4)

			// Reserved (byte 6)
			buffer[6] = 0x00

			// Command ID (bytes 7-8)
			buffer[7] = 0x02
			buffer[8] = 0x13

			// Frame ID (byte 9)
			buffer[9] = 0x00

			// Inverse Frame ID (byte 10)
			buffer[10] = 0xff

			// Fixed value (byte 11)
			buffer[11] = 0x01

			// Module ID (byte 12)
			buffer[12] = 0xfe

			// Fixed value (byte 13)
			buffer[13] = 0x00

			// ASCII command (bytes 14+)
			cmdBytes.copy(buffer, 14)

			// Calculate checksum (last byte) using sum modulo 256
			let checksum = 0
			for (let i = 0; i < totalLength - 1; i++) {
				checksum = (checksum + buffer[i]) & 0xff // Sum modulo 256
			}
			buffer[totalLength - 1] = checksum

			this.log('debug', `Sending command: ${cleanCmd}`)
			this.log('debug', `Binary format: ${buffer.toString('hex')}`)
			this.log('debug', `Checksum: 0x${checksum.toString(16).toUpperCase()}`)

			// Send the command and consider it successful without waiting for response
			void this.tcp.send(buffer)
			this.log('debug', 'Command sent successfully')
		} else {
			this.log('warn', 'Cannot send command, not connected to device')
		}
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
