import { IMailAccess, IMessageMail } from "../imail-access.interface";
import nodemailer from 'nodemailer'
import Mail from "nodemailer/lib/mailer";
require('dotenv').config();

export class MailTrap implements IMailAccess {
    private transporter: Mail;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: "sandbox.smtp.mailtrap.io", // Servidor SMTP do Mailtrap
            port: 2525, // Porta do Mailtrap
            auth: {
                user: process.env.MAILTRAP_USER, // Usuário do Mailtrap
                pass: process.env.MAILTRAP_PASS, // Senha do Mailtrap
            },
        });
    }

    /**
     * Send Mail
     * @param mail
     */
    async send(mail: IMessageMail): Promise<void> {
        await this.transporter.sendMail({
            to: {
                name: mail.to.name,
                address: mail.to.email,
            },
            from: {
                name: mail.from.name,
                address: mail.from.email,
            },
            subject: mail.subject,
            html: mail.body,
        })
    }
}