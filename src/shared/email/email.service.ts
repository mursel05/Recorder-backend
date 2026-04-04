import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { SentMessageInfo } from 'nodemailer';
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: Number(this.configService.get<number>('email.port')),
      secure: Boolean(this.configService.get('email.secure')),
      auth: {
        user: this.configService.get('email.user'),
        pass: this.configService.get('email.pass'),
      },
    });

    // Handlebars.registerHelper(
    //   't',
    //   (key: string, options: Handlebars.HelperOptions) => {
    //     const lang = I18nContext.current()?.lang;
    //     return this.i18nService.t(key, {
    //       lang,
    //       args: (options?.hash as Record<string, unknown>) || {},
    //     });
    //   },
    // );

    // Handlebars.registerHelper('translate', (obj: Record<string, string>) => {
    //   const lang = I18nContext.current()?.lang || 'en';
    //   return obj?.[lang] || obj?.en || '';
    // });
  }

  private getTemplate(templateName: string): HandlebarsTemplateDelegate {
    if (!this.templates.has(templateName)) {
      const templatePath = path.join(
        __dirname,
        'templates',
        `${templateName}.hbs`,
      );
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      this.templates.set(templateName, Handlebars.compile(templateContent));
    }
    return this.templates.get(templateName)!;
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<SentMessageInfo> {
    try {
      const info: unknown = await this.transporter.sendMail({
        from: `"Constant In" <${this.configService.get('email.user')}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to} with subject "${subject}"`);
      return info;
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to} with subject "${subject}": ${error}`,
      );
    }
  }

  async sendResetCode(email: string, code: number): Promise<void> {
    try {
      const template = this.getTemplate('password-reset');
      const html = template({
        code,
        currentYear: new Date().getFullYear(),
        // t: (key: string) => this.i18nService.t(key),
      });
      await this.sendEmail(email, 'Password Reset Code', html);
      this.logger.log(`Password reset code sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset code to ${email}: ${error}`,
      );
    }
  }

  async sendAccountLockedEmail(email: string, name: string): Promise<void> {
    try {
      const template = this.getTemplate('account-locked');
      const html = template({
        name,
        clientUrl: this.configService.get<string>('app.clientUrl'),
        currentYear: new Date().getFullYear(),
        currentDate: new Date().toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'short',
        }),
        // t: (key: string) => this.i18nService.t(key),
      });
      await this.sendEmail(email, 'Account Locked', html);
      this.logger.log(`Account locked email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send account locked email to ${email}: ${error}`,
      );
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      const template = this.getTemplate('welcome');

      const html = template({
        name,
        clientUrl: this.configService.get<string>('app.clientUrl'),
        currentYear: new Date().getFullYear(),
        // t: (key: string) => this.i18nService.t(key),
      });

      await this.sendEmail(email, 'Welcome', html);
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}: ${error}`);
    }
  }
}
