import { Request, Response } from 'express';
import { IMessagerAccessRequest, IResponseAccessResponse } from "../../providers/messager-broker-access/implementations/imessager-broker-access.interface";
import { SendMailNewUserApplication } from "./send-mail-new-user.application";
import { logger } from '../../providers/logger';

export class SendMailNewUserController {

    constructor(
        private readonly sendMailNewUserApplication: SendMailNewUserApplication
    ) {}

    /**
     * Handle
     * @param request
     */
    async handle(request: IMessagerAccessRequest): Promise<IResponseAccessResponse> {
        try {
            logger.debug('Recebendo requisição para envio de email de novo usuário', {
                body: request.body
            });

            const { name, email } = request.body;

            await this.sendMailNewUserApplication.handle({
                name,
                email
            });

            logger.info('Email de novo usuário enviado com sucesso', {
                email
            });

            return {
                code: 201,
                response: {
                    message: 'Email enviado com sucesso'
                }
            };
        } catch (error) {
            logger.error('Erro ao enviar email de novo usuário', {
                body: request.body
            }, error as Error);

            return {
                code: 400,
                response: {
                    message: error instanceof Error ? error.message : 'Erro ao enviar email'
                }
            };
        }
    }
}