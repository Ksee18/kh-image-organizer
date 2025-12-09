import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

class Logger {
  private logFilePath: string;
  private logStream: fs.WriteStream;

  constructor() {
    // Crear carpeta de logs en userData
    const userDataPath = app.getPath('userData');
    const logsDir = path.join(userDataPath, 'logs');
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Crear archivo de log con fecha
    const date = new Date().toISOString().split('T')[0];
    this.logFilePath = path.join(logsDir, `app-${date}.log`);
    
    // Crear stream de escritura
    this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
    
    this.info('=== Logger inicializado ===');
    this.info(`Ruta del log: ${this.logFilePath}`);
    this.info(`Sistema: ${process.platform} ${process.arch}`);
    this.info(`Electron: ${process.versions.electron}`);
    this.info(`Node: ${process.versions.node}`);
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data !== undefined) {
      try {
        logMessage += ` | Data: ${JSON.stringify(data, null, 2)}`;
      } catch (error) {
        logMessage += ` | Data: [Error serializing data]`;
      }
    }
    
    return logMessage;
  }

  private write(level: string, message: string, data?: any) {
    const formattedMessage = this.formatMessage(level, message, data);
    
    // Escribir en archivo
    this.logStream.write(formattedMessage + '\n');
    
    // También escribir en consola
    console.log(formattedMessage);
  }

  info(message: string, data?: any) {
    this.write('INFO', message, data);
  }

  warn(message: string, data?: any) {
    this.write('WARN', message, data);
  }

  error(message: string, error?: any) {
    let errorData = error;
    
    if (error instanceof Error) {
      errorData = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }
    
    this.write('ERROR', message, errorData);
  }

  debug(message: string, data?: any) {
    // No escribir en consola para DEBUG, solo en archivo
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | Data: ${JSON.stringify(data, null, 2)}` : '';
    const formattedMessage = `[${timestamp}] [DEBUG] ${message}${dataStr}`;
    
    // Solo escribir en archivo
    this.logStream.write(formattedMessage + '\n');
  }

  close() {
    this.info('=== Logger cerrado ===');
    this.logStream.end();
  }

  getLogPath(): string {
    return this.logFilePath;
  }
}

export const logger = new Logger();
