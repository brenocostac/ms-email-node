import amqp from "amqplib";
import { v4 as uuidv4 } from 'uuid';
import { IMessagerAccess, IMessagerAccessRequest, IMessagerBrokerAccess, IResponseAccessResponse } from "../imessager-broker-access.interface";
import { logger } from "../../../logger";

export class RabbitMQ implements IMessagerBrokerAccess {

    private url: string = 'amqp://guest:guest@localhost:5672';

    /**
     * Connect with messager broker
     */
    async connect(): Promise<any> {
        try {
            logger.debug('Tentando conectar ao RabbitMQ', { url: this.url });
            const connection = await amqp.connect(this.url);
            const channel = await connection.createChannel();
            logger.info('Conexão com RabbitMQ estabelecida com sucesso');
            return channel;
        } catch (error) {
            logger.error('Falha ao conectar com RabbitMQ', {}, error as Error);
            throw error;
        }
    }

    /**
     * Listen RPC
     * @param queue
     * @param callback
     */
    listenRPC(queue: string, callback: CallableFunction) {
        logger.info(`Iniciando escuta na fila RPC: ${queue}`);
        this.connect()
            .then(channel => this.createQueue(channel, queue))
            .then(ch => {
                logger.info(`Fila ${queue} criada e pronta para receber mensagens`);
                ch.consume(queue, async (msg: any) => {
                    if (msg !== null) {
                        logger.debug(`Mensagem recebida na fila ${queue}`, { 
                            correlationId: msg.properties.correlationId 
                        });
                        try {
                            const request = this.messageConvertRequest(msg);
                            const response = await callback(request);
                            await this.responseCallRPC({
                                queue: queue,
                                replyTo: msg.properties.replyTo,
                                correlationId: msg.properties.correlationId,
                                response: response
                            });
                            ch.ack(msg);
                            logger.info(`Mensagem processada com sucesso na fila ${queue}`, {
                                correlationId: msg.properties.correlationId
                            });
                        } catch (error) {
                            logger.error(`Erro ao processar mensagem na fila ${queue}`, {
                                correlationId: msg.properties.correlationId
                            }, error as Error);
                            ch.nack(msg);
                        }
                    }
                });
            })
            .catch(error => {
                logger.error(`Erro ao configurar fila ${queue}`, {}, error as Error);
            });
    }

    /**
     * Create
     * @param channel
     * @param queue
     */
    async createQueue(channel: any, queue: string): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                logger.debug(`Criando fila: ${queue}`);
                channel.assertQueue(queue, { durable: true });
                resolve(channel);
            } catch (error) {
                logger.error(`Erro ao criar fila ${queue}`, {}, error as Error);
                reject(error);
            }
        });
    }

    /**
     * Send Pub/Sub
     * @param queue
     */
    async sendPubSub(message: IMessagerAccess): Promise<any> {
        try {
            logger.debug('Enviando mensagem via Pub/Sub', { queue: message.queue });
            const channel = await this.connect();
            await this.createQueue(channel, message.queue);
            const result = channel.sendToQueue(message.queue, Buffer.from(JSON.stringify(message.message)));
            logger.info('Mensagem enviada via Pub/Sub com sucesso', { queue: message.queue });
            return result;
        } catch (error) {
            logger.error('Erro ao enviar mensagem via Pub/Sub', { queue: message.queue }, error as Error);
            throw error;
        }
    }

    /**
     * Send RPC
     * @param message
     */
    async sendRPC(message: IMessagerAccess): Promise<IResponseAccessResponse> {
        try {
            logger.debug('Enviando mensagem via RPC', { queue: message.queue });
            const channel = await this.connect();
            const correlationId = uuidv4();
            const replyTo = await this.createQueue(channel, '');
            
            logger.debug('Aguardando resposta RPC', { correlationId, queue: message.queue });
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    logger.error('Timeout ao aguardar resposta RPC', { 
                        correlationId, 
                        queue: message.queue 
                    }, new Error('Timeout'));
                    reject(new Error('Timeout'));
                }, 30000);

                channel.consume(replyTo.queue, (msg: any) => {
                    if (msg.properties.correlationId === correlationId) {
                        clearTimeout(timeout);
                        const response = this.messageConvert(msg);
                        logger.info('Resposta RPC recebida com sucesso', { 
                            correlationId, 
                            queue: message.queue 
                        });
                        resolve(response);
                    }
                });

                channel.sendToQueue(
                    message.queue,
                    Buffer.from(JSON.stringify(message.message)),
                    {
                        correlationId,
                        replyTo: replyTo.queue
                    }
                );
            });
        } catch (error) {
            logger.error('Erro ao enviar mensagem via RPC', { queue: message.queue }, error as Error);
            throw error;
        }
    }

    /**
     * Convert Message
     * @param message
     * @returns
     */
    messageConvert(message: any): IResponseAccessResponse {
        const messageResponse: IResponseAccessResponse = {
            code: 200,
            response: {
                message: 'Ok'
            }
        };
        let result = null;
        try {
            result = JSON.parse(message.content.toString());
            messageResponse.code = result.code;
            messageResponse.response = result;
        } catch (e) {
            result = message.content.toString();
            messageResponse.code = 500;
            messageResponse.response = result;
        }
        return messageResponse;
    }

    /**
     * Message Convert Request
     * @param message
     * @returns
     */
    messageConvertRequest(message: any): IMessagerAccessRequest {
        const messageRequest: IMessagerAccessRequest = {
            body: null,
            message: ''
        };
        let result = null;
        try {
            result = JSON.parse(message.content.toString());
            messageRequest.body = result;
        } catch (e) {
            result = message.content.toString();
            messageRequest.message = result;
        }
        return messageRequest;
    }

    /**
     * Response RPC
     * @param replyTo
     * @param correlationId
     * @param response
     * @returns
     */
    async responseCallRPC(objResponse: {
        queue: string,
        replyTo: string,
        correlationId: string,
        response: IResponseAccessResponse
    }): Promise<void> {
        try {
            logger.debug('Enviando resposta RPC', { 
                queue: objResponse.queue, 
                correlationId: objResponse.correlationId 
            });
            const channel = await this.connect();
            channel.sendToQueue(
                objResponse.replyTo,
                Buffer.from(JSON.stringify(objResponse.response)),
                {
                    correlationId: objResponse.correlationId
                }
            );
            logger.info('Resposta RPC enviada com sucesso', { 
                queue: objResponse.queue, 
                correlationId: objResponse.correlationId 
            });
        } catch (error) {
            logger.error('Erro ao enviar resposta RPC', { 
                queue: objResponse.queue, 
                correlationId: objResponse.correlationId 
            }, error as Error);
            throw error;
        }
    }
}