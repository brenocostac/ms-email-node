import winston from 'winston';
import path from 'path';
import fs from 'fs';

export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug'
}

export interface ILogContext {
    [key: string]: any;
}

export class Logger {
    private static instance: Logger;
    private logger: winston.Logger;
    private logDir: string;

    private constructor() {
        // Definir o diretório de logs fora da pasta src
        this.logDir = path.resolve(process.cwd(), 'logs');
        
        // Criar o diretório de logs se não existir
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            defaultMeta: { service: 'notification-service' },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                new winston.transports.File({ 
                    filename: path.join(this.logDir, 'error.log'), 
                    level: 'error' 
                }),
                new winston.transports.File({ 
                    filename: path.join(this.logDir, 'combined.log') 
                })
            ]
        });
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public error(message: string, context?: ILogContext, error?: Error): void {
        this.logger.error(message, {
            ...context,
            error: error ? {
                message: error.message,
                stack: error.stack,
                ...(error instanceof Error ? error : {})
            } : undefined
        });
    }

    public warn(message: string, context?: ILogContext): void {
        this.logger.warn(message, context);
    }

    public info(message: string, context?: ILogContext): void {
        this.logger.info(message, context);
    }

    public debug(message: string, context?: ILogContext): void {
        this.logger.debug(message, context);
    }
} 