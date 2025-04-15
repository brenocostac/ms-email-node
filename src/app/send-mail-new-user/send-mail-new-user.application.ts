import { IMailAccess } from "../../providers/mail/imail-access.interface";
import { ISendMailNewUserDTO } from "./isend-mail-new-user-dto.interface";
import { logger } from "../../providers/logger";

export class SendMailNewUserApplication {
    constructor(private readonly mailAccess: IMailAccess) {}

    /**
     * Handle
     * @param mailReq
     */
    async handle(mailReq: ISendMailNewUserDTO): Promise<void> {
        try {
            logger.debug('Iniciando envio de email para novo usuário', {
                name: mailReq.name,
                email: mailReq.email
            });

            await this.mailAccess.send({
                to: {
                    email: mailReq.email,
                    name: mailReq.name
                },
                from: {
                    email: 'swm@swm.com',
                    name: 'SWM Tecnologia'
                },
                subject: `Seja bem vindo(a) ${mailReq.name}`,
                body: `<p>Seja bem vindo(a) ${mailReq.name}</p>`
            });

            logger.info('Email enviado com sucesso para novo usuário', {
                name: mailReq.name,
                email: mailReq.email
            });
        } catch (error) {
            logger.error('Erro ao enviar email para novo usuário', {
                name: mailReq.name,
                email: mailReq.email
            }, error as Error);
            throw error;
        }
    }
}