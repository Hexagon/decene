import { IIdentity } from '../encryption/identity';
import Peer from './peer';
import tls from 'tls';
import EventEmitter from 'events';

class Socket {
  private buffer: string;
  public events: EventEmitter;
  private used: boolean;
  private id: IIdentity;
  private header: string;
  private separator: string;
  private altSeparator: string;
  private maxBuffer: number;
  private reconnects: number;
  private socket?: tls.TLSSocket;
  public remoteAddress?: string;
  public remotePort?: number;
  private node?: Peer;
  private timeout?: NodeJS.Timer;

  constructor(id: IIdentity, remote: Peer | tls.TLSSocket, callback?: any) {
    this.buffer = '';
    this.events = new EventEmitter();
    this.used = false;
    this.id = id;
    this.header = 'DEC-BOM>';
    this.separator = '<DEC-EOM\0';
    this.altSeparator = '<DEC-EOM-ALT>\t\0';
    this.maxBuffer = 15 * 1024 * 1024;

    this.reconnects = 5;

    if (remote instanceof Peer) {
      this.connect(remote);
    } else {
      this.incoming(remote);
    }

    if (this.socket) this.socket.setEncoding('utf8');
  }

  incoming(socket: tls.TLSSocket) {
    socket.setTimeout(3600 * 1000);

    this.socket = socket;

    this.remoteAddress = socket.remoteAddress;

    this.socket.on('data', (data) => this.data(this, data));
    this.socket.on('drain', () => this.drain);
    this.socket.on('timeout', () => this.events.emit('timeout'));
    this.socket.on('end', () => this.events.emit('end'));
    this.socket.on('error', (error) => {
      this.events.emit('error', error);
      if (this.socket) this.socket.end();
    });
    this.socket.on('close', (error) => this.events.emit('close', error));
  }

  setNode(node: Peer) {
    this.node = this.node || node;
  }

  connect(node?: Peer) {
    if (this.reconnects <= 0) {
      this.events.emit('disconnected');
      return;
    } else {
      this.reconnects -= 1;
    }

    this.node = this.node || node;
    if (this.node) {
      this.remotePort = this.node.address.port;

      this.socket = tls.connect({
        host: this.node.address.ip,
        port: this.node.address.port,
        ca: this.id.key.cert,
        rejectUnauthorized: false,
      });

      this.socket.on('data', (data) => this.data(this, data));
      this.socket.on('drain', () => this.drain);

      this.socket.on('error', (error) => {
        this.events.emit('error', error);
        if (this.socket) this.socket.end();
      });

      this.socket.on('timeout', (err) => {
        if (this.socket) this.socket.end();
      });

      this.socket.on('close', (err) => {
        if (this.timeout) clearTimeout(this.timeout);
        setTimeout(() => this.connect(), 1000);
        this.events.emit('reconnecting', err);
      });

      this.socket.on('connect', () => {
        if (this.timeout) clearTimeout(this.timeout);
        if (this.socket && this.node) {
          this.reconnects = 5;
          this.remoteAddress = this.socket.remoteAddress;
          this.remotePort = this.node.address.port;
          this.events.emit('connected');
        }
      });

      this.timeout = setTimeout(() => {
        if (this.socket) {
          this.socket.end();
          setTimeout(() => this.connect(), 1000);
          this.events.emit('reconnecting', new Error('Timeout'));
        }
      }, 1000);
    }
  }

  send(data: any, close?: boolean) {
    // Stringify data
    let prepData = JSON.stringify(data);

    // Make sure that data never contains separator
    if (prepData.indexOf(this.separator) !== -1) {
      prepData.replace(this.separator, this.altSeparator);
    }

    prepData = this.header + prepData + this.separator;

    this.used = true;

    if (this.socket) {
      const isKernelBufferFull = this.socket.write(prepData);
      if (isKernelBufferFull) {
        if (close) {
          this.end();
        }
      } else {
        this.socket.pause();
      }
      return true;
    } else {
      return false;
    }
  }

  end() {
    if (this.socket) this.socket.end();
    this.events.emit('disconnected', this.node);
  }

  drain() {
    if (this.socket) this.socket.resume();
  }

  // When receive client data.
  data(_: this, data: string) {
    this.used = true;

    this.buffer += data;

    // Silently prevent buffer overflow
    if (this.buffer.length > this.maxBuffer) {
      this.buffer = this.buffer.slice(this.buffer.length - this.maxBuffer, this.buffer.length);
    }

    while (this.buffer.indexOf(this.separator) !== -1) {
      const sPos = this.buffer.indexOf(this.separator);

      // Extract and remove message from buffer
      let message = this.buffer.slice(0, sPos);
      const hPos = message.indexOf(this.header);

      this.buffer = this.buffer.slice(sPos + this.separator.length, this.buffer.length);

      // Find header
      if (hPos === -1) {
        // No header == throw message
      } else {
        // Header verified, throw away
        message = message.slice(hPos + this.header.length, message.length);

        if (message.indexOf(this.altSeparator) !== -1) {
          message.replace(this.altSeparator, this.separator);
        }

        try {
          message = JSON.parse(message);
          this.events.emit('message', message);
        } catch (ex) {
          this.events.emit('error', ex);
        }
      }
    }
  }
}

export default Socket;
