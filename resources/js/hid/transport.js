/**
 * WebHID transport for the Nexus 61S.
 *
 * Framing, byte order and the queueing discipline are taken verbatim from the
 * vendor driver so the board sees exactly the traffic it expects:
 *
 *   - 65-byte report buffer, `[0, cmd, ...args]`, zero padded. The leading zero
 *     is the HID report id and is stripped before `sendReport(0, ...)`.
 *   - 16-bit fields are little-endian.
 *   - Every command is serialised: one in flight, response matched by arrival
 *     order. There is no request id in the protocol, so concurrency would
 *     scramble responses.
 *   - `0xA0`-prefixed reports are the asynchronous key-travel feed and must not
 *     resolve a pending command. They are routed to subscribers instead.
 */

export const NEXUS_FILTERS = [
  { vendorId: 0xfeed, productId: 0x5eea, usagePage: 0x0001, usage: 0x00 },
  { vendorId: 0xfeed, productId: 0x0eea, usagePage: 0xff00, usage: 0x01 },
]

export const BOOTLOADER_FILTERS = [{ vendorId: 0x0c45, productId: 0x0500 }]

export const CMD = {
  MEMORY: 0x55,
  BOOT_MODE: 0x5f,
  ROM_WRITE: 0x80,
  ROM_ERASE: 0x81,
  ROM_VERIFY: 0x82,
  ROM_END: 0x83,
  ROM_OK: 0x84,
}

/** Low byte of the arithmetic sum. The protocol does not use XOR or CRC. */
export const checksum = (bytes) => {
  let sum = 0
  for (let i = 0; i < bytes.length; i++) sum += bytes[i]
  return sum & 0xff
}

/** Little-endian 16-bit pair helpers, mirroring the vendor's `_` and `k`. */
export const lo = (v) => v & 0xff
export const hi = (v) => (v >> 8) & 0xff
export const le16 = (loByte, hiByte) => ((hiByte & 0xff) << 8) | (loByte & 0xff)

export class HidError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'HidError'
    this.code = code
  }
}

/** Raised when the browser has no WebHID at all (Firefox, Safari). */
export class UnsupportedError extends HidError {
  constructor() {
    super('This browser does not support WebHID.', 'unsupported')
    this.name = 'UnsupportedError'
  }
}

export class NotConnectedError extends HidError {
  constructor() {
    super('No keyboard connected.', 'not-connected')
    this.name = 'NotConnectedError'
  }
}

export class Transport {
  constructor({ timeout = 3000 } = {}) {
    this.device = null
    this.timeout = timeout
    /** @type {Array<{resolve:Function, reject:Function}>} */
    this.pending = []
    /** Buffered responses that arrived with no waiter (polling reads). */
    this.buffer = []
    this.chain = Promise.resolve()
    this.events = new Map()
    this._onReport = this._onReport.bind(this)
  }

  static get supported() {
    return typeof navigator !== 'undefined' && 'hid' in navigator
  }

  /** Devices already granted to this origin, without prompting. */
  static async granted() {
    if (!Transport.supported) return []
    const devices = await navigator.hid.getDevices()
    return devices.filter((d) => Transport._matches(d))
  }

  static _matches(device) {
    return NEXUS_FILTERS.some(
      (f) => device.vendorId === f.vendorId && device.productId === f.productId,
    )
  }

  /** Prompts the user once; must be called from a user gesture. */
  static async request() {
    if (!Transport.supported) throw new UnsupportedError()
    const devices = await navigator.hid.requestDevice({ filters: NEXUS_FILTERS })
    if (!devices.length) return null
    return devices[0]
  }

  async open(device) {
    this.device = device
    await device.open()
    device.addEventListener('inputreport', this._onReport)
    return this
  }

  close() {
    if (this.device) {
      this.device.removeEventListener('inputreport', this._onReport)
      this.device.close().catch(() => {})
    }
    this.device = null
    this._rejectAll(new NotConnectedError())
  }

  get connected() {
    return Boolean(this.device && this.device.opened)
  }

  get info() {
    if (!this.device) return null
    return {
      vendorId: this.device.vendorId,
      productId: this.device.productId,
      productName: this.device.productName || 'Nexus 61S',
    }
  }

  /**
   * Subscribe to an asynchronous device event stream.
   * Currently only 'travel' (0xA0) exists.
   */
  on(name, fn) {
    if (!this.events.has(name)) this.events.set(name, new Set())
    this.events.get(name).add(fn)
    return () => this.events.get(name).delete(fn)
  }

  _emit(name, payload) {
    const subs = this.events.get(name)
    if (!subs) return
    for (const fn of subs) {
      try {
        fn(payload)
      } catch (err) {
        // A bad subscriber must not break the device pipeline.
        console.error('[mewxus] event subscriber failed', err)
      }
    }
  }

  _onReport(event) {
    const data = new Uint8Array(event.data.buffer)

    if (data[0] === 0xa0) {
      this._emit('travel', data)
      return
    }

    const waiter = this.pending.shift()
    if (waiter) waiter.resolve(data)
    else this.buffer.push({ at: Date.now(), data })
  }

  /**
   * Send one command and await its response.
   * Serialised through `this.chain` so two callers can never interleave frames.
   */
  send(cmd, args = []) {
    const run = () => this._sendNow(cmd, args)
    const result = this.chain.then(run, run)
    // Keep the chain alive even when a command rejects.
    this.chain = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  async _sendNow(cmd, args) {
    if (!this.connected) throw new NotConnectedError()

    const frame = new Uint8Array(65)
    frame[0] = 0
    frame[1] = cmd
    for (let i = 0; i < args.length && i < 63; i++) frame[2 + i] = args[i] & 0xff

    this._fastForward()

    const response = new Promise((resolve, reject) => {
      const entry = { resolve, reject }
      entry.timer = setTimeout(() => {
        const idx = this.pending.indexOf(entry)
        if (idx !== -1) this.pending.splice(idx, 1)
        reject(new HidError(`Command 0x${cmd.toString(16)} timed out.`, 'timeout'))
      }, this.timeout)
      const originalResolve = entry.resolve
      entry.resolve = (value) => {
        clearTimeout(entry.timer)
        originalResolve(value)
      }
      this.pending.push(entry)
    })

    try {
      // Strip the report id: sendReport(0, payload) prepends it again.
      await this.device.sendReport(0, frame.slice(1))
    } catch (err) {
      const waiter = this.pending.pop()
      if (waiter) clearTimeout(waiter.timer)
      throw new HidError(`Write failed: ${err.message}`, 'write-failed')
    }

    return response
  }

  /**
   * Drop stale buffered responses before a new write. Without this a response
   * lost to a timeout would be handed to the *next* command, silently shifting
   * every subsequent read by one frame.
   */
  _fastForward() {
    const cutoff = Date.now() - 1000
    while (this.buffer.length && this.buffer[0].at < cutoff) this.buffer.shift()
    this.buffer.length = 0
  }

  _rejectAll(error) {
    for (const entry of this.pending) {
      clearTimeout(entry.timer)
      entry.reject(error)
    }
    this.pending.length = 0
    this.buffer.length = 0
  }
}
