import { app } from "./providers/messager-broker-access";
import { logger } from "./providers/logger";
require('dotenv').config();

process.on('uncaughtException', (error) => {
    logger.error('Exceção não tratada', {}, error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Rejeição não tratada', { promise }, reason instanceof Error ? reason : new Error(String(reason)));
});

app.listen(() => {
    logger.info('Serviço de notificações iniciado', {
        environment: process.env.NODE_ENV || 'development'
    });
});