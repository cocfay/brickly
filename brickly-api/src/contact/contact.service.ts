import { Injectable, BadRequestException  } from '@nestjs/common';
import axios from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscriber } from './schemas/subscriber.schema';
import { Leadform } from './schemas/leadform.schema';
import { Contactsite } from './schemas/contactsite.schema';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.schema';

@Injectable()
export class ContactService {
  private API_URL = 'https://api.brevo.com/v3/smtp/email';
  private EMAIL_SENDER = 'no-reply@brickly.mydesk.digital';
  private EMAIL_INTERNAL_RECEIVE = 'info@bricklyhomes.com';

  constructor(
    @InjectModel(Subscriber.name)
    private subscriberModel: Model<Subscriber>,
    @InjectModel(Leadform.name)
    private leadformModel: Model<Leadform>,
    @InjectModel(Contactsite.name)
    private ContactsiteModel: Model<Contactsite>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    private usersService: UsersService,
  ) {}

  findLead(query: any) {
    return this.leadformModel.find(query).sort({ createdAt: -1 });
  }

  findContactsite(query: any) {
        const filters = { ...query };
        var orderByReg = {};
        
        if(filters.orderby || filters['orderby[]']){
          const hasCustomOrder = filters.orderby || filters['orderby[]'];
          const orderbyArray = Array.isArray(hasCustomOrder) ? hasCustomOrder : [hasCustomOrder];
            orderbyArray.forEach((e, i) => {
              var [attrEntry, orderEntry] = e.split(':');
              if(!orderEntry){
                orderEntry = -1;
              }else if(orderEntry.toLowerCase() == "asc"){
                orderEntry = 1;
              }else if( orderEntry.toLowerCase() == "desc"){
                orderEntry = -1;
              }else{
                orderEntry = -1;
              }
              orderByReg[attrEntry] = orderEntry;
            });

        }else{
          orderByReg = {
                  createdAt: -1,
                };
        }
        delete filters.orderby;
    return this.ContactsiteModel.find(filters).sort(orderByReg);
  }

  async updateLeadStatus(ids: string[], status: string) {
    const normalizedIds = this.normalizeLeadIds(ids);
    this.validateLeadStatus(status);

    const result = await this.leadformModel.updateMany(
      { _id: { $in: normalizedIds } },
      { $set: { status } },
    );

    return {
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      status,
    };
  }

  async updateContactsiteStatus(ids: string[], status: string) {
    const normalizedIds = this.normalizeLeadIds(ids);
    this.validateLeadStatus(status);

    const result = await this.ContactsiteModel.updateMany(
      { _id: { $in: normalizedIds } },
      { $set: { status } },
    );

    return {
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      status,
    };
  }

  private normalizeLeadIds(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('Debe enviar al menos un lead');
    }

    const normalizedIds = [...new Set(ids)].filter(Boolean);
    const hasInvalidId = normalizedIds.some(id => !Types.ObjectId.isValid(id));

    if (hasInvalidId) {
      throw new BadRequestException('ID de lead invalido');
    }

    return normalizedIds;
  }

  private validateLeadStatus(status: string) {
    if (!['pendiente', 'revisado'].includes(status)) {
      throw new BadRequestException('Status de lead invalido');
    }
  }

  async subscribe(email: string) {
    // validar básico
    if (!email) {
      throw new BadRequestException('Email requerido');
    }

    // verificar duplicado
    const exists = await this.subscriberModel.findOne({ email });

    if (exists) {
      throw new BadRequestException('Este correo ya está suscrito');
    }

    // guardar en DB
    try {
        await this.subscriberModel.create({ email });
    } catch (error:any) {
        if (error.code === 11000) {
            throw new BadRequestException('Email ya registrado');
        }
    }

    // enviar correo
    await this.sendSubscriptionEmail(email);

    return {
      message: 'Suscripción exitosa',
    };
  }

  private async sendSubscriptionEmail(email: string) {
    try {
      await axios.post(
        this.API_URL,
        {
          sender: {
            email: this.EMAIL_SENDER,
            name: 'Brickly Homes',
          },
          to: [{ email }],
          subject: 'Suscripción confirmada',
          htmlContent: `
            <!DOCTYPE html>
              <html lang="es">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>¡Gracias por suscribirte! - Brickly Homes</title>
                  <style>
                      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap');

                      @media screen and (max-width: 600px) {
                          .wrapper { width: 100% !important; max-width: 100% !important; }
                          .col-50 { width: 100% !important; max-width: 100% !important; display: block !important; }
                          .col-33 { width: 100% !important; max-width: 100% !important; display: block !important; margin-bottom: 30px !important; }
                          .hide-mobile { display: none !important; }
                          .padding-mobile { padding: 25px 20px !important; }
                          .text-center-mobile { text-align: center !important; }
                          .img-full { width: 100% !important; height: auto !important; }
                          .no-border-mobile { border: none !important; }
                      }
                  </style>
                  </head>
              <body style="margin:0; padding:0; background-color:#ffffff; font-family:'Plus Jakarta Sans', system-ui, Arial, sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">

                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="600" class="wrapper" style="margin:0 auto; background-color:#ffffff; width:600px; max-width:600px;">
                      
                      <tr>
                          <td style="padding: 25px 20px;">
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tr>
                                      <td align="left">
                                          <a href="https://www.bricklyhomes.com" target="_blank">
                                              <img src="https://www.bricklyhomes.com/newsletters/iconos/logo_negro.png" alt="Brickly Homes" width="150" style="display:block; border:0; font-family:sans-serif; font-size:18px; line-height:20px; color:#111111; font-weight:bold;">
                                          </a>
                                      </td>
                                      <td align="right" style="vertical-align: middle;">
                                          <img src="https://www.bricklyhomes.com/newsletters/iconos/newsletter.png" alt="Contacto" width="24" height="24" style="display:block; border:0;">
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>

                      <tr>
                          <td style="padding: 0 20px 35px 20px;">
                              <div style="background-color:#f8f9fa; border-radius: 24px; overflow: hidden; font-size: 0; max-width: 560px;">
                                  
                                  <div class="col-50" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: middle; font-size: 14px;">
                                      <div class="padding-mobile" style="padding: 40px 25px;">
                                          <h1 style="margin: 0 0 15px 0; font-size: 26px; line-height: 32px; color: #111111; font-weight: 700;">¡Gracias por suscribirte!</h1>
                                          <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 22px; color: #444444;">Tu suscripción se ha realizado correctamente.</p>
                                          <p style="margin: 0; font-size: 14px; line-height: 22px; color: #444444;">Recibirás novedades de nuestra plataforma.</p>
                                      </div>
                                  </div>
                                  
                                  <div class="col-50" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: top;">
                                      <img src="https://www.bricklyhomes.com/newsletters/suscripcion/banner.png" alt="Suscripción Exitosa" width="280" class="img-full" style="display:block; width:100%; height:auto; border:0;">
                                  </div>
                              </div>
                              </td>
                      </tr>

                      <tr>
                          <td align="center" style="padding: 15px 20px 30px 20px;">
                              <h2 style="margin: 0; font-size: 24px; line-height: 30px; color: #111111; font-weight: 700;">¿Qué puedes esperar?</h2>
                          </td>
                      </tr>

                      <tr>
                          <td style="padding: 0 20px 40px 20px; font-size: 0; text-align: center;">
                              <div class="col-33" style="display: inline-block; width: 100%; max-width: 180px; vertical-align: top; font-size: 13px;">
                                  <img src="https://www.bricklyhomes.com/newsletters/suscripcion/Propiedades.png" alt="Propiedades" width="40" height="40" style="display:inline-block; margin-bottom:15px;">
                                  <h3 style="margin: 0 0 10px 0; font-size: 15px; line-height: 18px; color: #111111; font-weight: 700;">Nuevas propiedades</h3>
                                  <p style="margin: 0; font-size: 13px; line-height: 18px; color: #555555; padding: 0 10px;">Entérate de nuestras nuevas oportunidades antes que nadie.</p>
                              </div>
                              
                              <div class="col-33 no-border-mobile" style="display: inline-block; width: 100%; max-width: 186px; vertical-align: top; font-size: 13px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">
                                  <img src="https://www.bricklyhomes.com/newsletters/suscripcion/Tendencias.png" alt="Tendencias" width="40" height="40" style="display:inline-block; margin-bottom:15px;">
                                  <h3 style="margin: 0 0 10px 0; font-size: 15px; line-height: 18px; color: #111111; font-weight: 700;">Tendencias</h3>
                                  <p style="margin: 0; font-size: 13px; line-height: 18px; color: #555555; padding: 0 10px;">Recibe información actualizada para tomar mejores decisiones.</p>
                              </div>
                              
                              <div class="col-33" style="display: inline-block; width: 100%; max-width: 180px; vertical-align: top; font-size: 13px;">
                                  <img src="https://www.bricklyhomes.com/newsletters/suscripcion/Novedades.png" alt="Novedades" width="40" height="40" style="display:inline-block; margin-bottom:15px;">
                                  <h3 style="margin: 0 0 10px 0; font-size: 15px; line-height: 18px; color: #111111; font-weight: 700;">Novedades</h3>
                                  <p style="margin: 0; font-size: 13px; line-height: 18px; color: #555555; padding: 0 10px;">Avisos importantes, mejoras en la plataforma y más, directo a tu correo.</p>
                              </div>
                              
                              </td>
                      </tr>

                      <tr>
                          <td align="center" style="padding: 10px 20px 45px 20px; border-bottom: 1px solid #eeeeee;">
                              <h2 style="margin: 0 0 10px 0; font-size: 24px; line-height: 28px; color: #111111; font-weight: 700;">Explora propiedades ahora</h2>
                              <p style="margin: 0 0 25px 0; font-size: 14px; line-height: 20px; color: #555555; max-width: 440px;">Descubre opciones que se ajustan a ti desde nuestra plataforma.</p>
                              
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                      <td align="center" style="background-color: #000000; border-radius: 20px;">
                                          <a href="https://www.bricklyhomes.com" target="_blank" style="padding: 12px 35px; display: block; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none;">Ir a Brickly Homes</a>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>

                      <tr>
                          <td style="padding: 10px 20px 40px 20px; font-size: 0;">
                              <div class="col-50" style="display: inline-block; width: 100%; max-width: 270px; vertical-align: top; font-size: 14px; margin-bottom: 20px; padding-top: 20px;">
                                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                      <tr>
                                          <td style="vertical-align: top; padding-right: 12px;">
                                              <img src="https://www.bricklyhomes.com/newsletters/iconos/Buscar.png" alt="Dudas" width="32" height="32" style="display:block;">
                                          </td>
                                          <td style="vertical-align: top;">
                                              <p style="margin:0; font-size:14px; font-weight:bold; color:#111111;">¿Dudas?</p>
                                              <p style="margin:2px 0 0 0; font-size:13px; color:#555555; line-height:16px;">Estamos aquí para ayudarte. <br /> <a href="https://wa.me/50237649719?text=%C2%A1Hola!%20Deseo%20contactar%20a%20un%20asesor." target="_blank" style="color:#111111; font-weight:bold; text-decoration:underline;">Contáctanos</a></p>
                                          </td>
                                      </tr>
                                  </table>
                              </div>
                              
                              <div class="col-50" style="display: inline-block; width: 100%; max-width: 270px; vertical-align: top; font-size: 14px; padding-top: 20px;">
                                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                      <tr>
                                          <td style="vertical-align: top; padding-right: 12px;">
                                              <img src="https://www.bricklyhomes.com/newsletters/iconos/Cuenta.png" alt="Cuenta" width="32" height="32" style="display:block;">
                                          </td>
                                          <td style="vertical-align: top;">
                                              <p style="margin:0; font-size:14px; font-weight:bold; color:#111111;">Tu cuenta</p>
                                              <p style="margin:2px 0 0 0; font-size:13px; color:#555555; line-height:16px;">Inicia sesión para gestionar tus preferencias. <br /> <a href="https://www.bricklyhomes.com/login" target="_blank" style="color:#111111; font-weight:bold; text-decoration:underline;">Inicia sesión</a></p>
                                          </td>
                                      </tr>
                                  </table>
                              </div>
                              
                              </td>
                      </tr>

                      <tr>
                          <td style="background-color: #1a2129; padding: 40px 20px;">
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tr>
                                      <td style="font-size: 0;">
                                          <div class="col-50 text-center-mobile" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: middle; margin-bottom: 20px;">
                                              <a href="https://www.bricklyhomes.com" target="_blank">
                                                  <img src="https://www.bricklyhomes.com/newsletters/iconos/logo_blanco.png" alt="Brickly Homes" width="130" style="border:0; display: inline-block;">
                                              </a>
                                          </div>
                                          
                                          <div class="col-50 text-center-mobile" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: middle; text-align: right; margin-bottom: 20px;">
                                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display:inline-block;">
                                                  <tr>
                                                      <td style="padding: 0 10px;"><a href="https://www.facebook.com/profile.php?id=61588999228778" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/FB.png" alt="Facebook" width="20" height="20"></a></td>
                                                      <td style="padding: 0 10px;"><a href="https://wa.me/50237649719?text=%C2%A1Hola!%20Deseo%20contactar%20a%20un%20asesor." target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/WS.png" alt="WhatsApp" width="20" height="20"></a></td>
                                                      <td style="padding: 0 10px;"><a href="https://www.instagram.com/bricklyoficial/" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/IG.png" alt="Instagram" width="20" height="20"></a></td>
                                                      <td style="padding: 0 10px;"><a href="https://www.linkedin.com/company/bricklygt/" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/IN.png" alt="LinkedIn" width="20" height="20"></a></td>
                                                      <td style="padding: 0 10px;"><a href="https://www.tiktok.com/@bricklyhomes?_r=1&_t=ZP-95NIrCBiYAQ" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/TT.png" alt="TikTok" width="20" height="20"></a></td>
                                                  </tr>
                                              </table>
                                          </div>
                                          
                                          </td>
                                  </tr>
                                  <tr>
                                      <td align="center" style="border-top: 1px solid #2d3743; padding-top: 25px; font-size: 12px; color: #a0aec0; line-height: 18px;">
                                          <p style="margin: 0 0 10px 0;">© Brickly. Todos los derechos reservados</p>
                                          <p style="margin: 0;">¿No quieres recibir más correos? <a href="#" style="color:#ffffff; text-decoration:underline;">Darse de baja</a></p>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>

                  </table>

              </body>
              </html>
          `,
        },
        {
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(error.response?.data);
        } else {
            console.error(error);
        }
    }
  }

  async handleContact(data: {
    name: string;
    lastname: string;
    phone: string;
    email: string;
    message: string;
    type: string;
  }) {

    try{
      await this.ContactsiteModel.create(data);

       await Promise.allSettled([
        await this.sendAutoReply(data),
        await this.sendInternalNotification(data),
      ]);

    } catch (error:any) {
      
        throw new BadRequestException('Error al guardar la informacion');
        
    }

    return {
      message: 'Mensaje enviado correctamente',
    };
  }

  async handleContactAgent(data: {
    name: string;
    lastname: string;
    phone: string;
    email: string;
    message: string;
    agentId: string;
  }) {
    
   
    try{
      await this.leadformModel.create(data);

       await Promise.allSettled([
        this.sendAutoReply(data),
        this.sendInternalNotification(data),
        this.sendAgentNotification(data),
      ]);

    } catch (error:any) {
      
        throw new BadRequestException('Error al guardar la informacion');
        
    }

    return {
      message: 'Mensaje enviado correctamente',
    };
  }

  private async sendAutoReply(data: any) {
    try{
        return axios.post(
        this.API_URL,
        {
            sender: {
            email: this.EMAIL_SENDER,
            name: 'Brickly Homes',
            },
            to: [
            {
                email: data.email,
                name: `${data.name} ${data.lastname}`,
            },
            ],
            subject: 'Hemos recibido tu mensaje',
            htmlContent: `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Hemos recibido tu solicitud - Brickly Homes</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap');

                    @media screen and (max-width: 600px) {
                        .wrapper { width: 100% !important; max-width: 100% !important; }
                        .col-50 { width: 100% !important; max-width: 100% !important; display: block !important; }
                        .hide-mobile { display: none !important; }
                        .padding-mobile { padding: 25px 20px !important; }
                        .text-center-mobile { text-align: center !important; }
                        .img-full { width: 100% !important; height: auto !important; }
                        .table-data-padding { padding-left: 10px !important; padding-right: 10px !important; }
                    }
                </style>
            </head>
            <body style="margin:0; padding:0; background-color:#ffffff; font-family:'Plus Jakarta Sans', system-ui, Arial, sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">

                <!-- CONTENEDOR PRINCIPAL -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="600" class="wrapper" style="margin:0 auto; background-color:#ffffff; width:600px; max-width:600px;">
                    
                    <!-- 1. HEADER (LOGOTIPO) -->
                    <tr>
                        <td style="padding: 25px 20px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="left">
                                        <a href="https://www.bricklyhomes.com" target="_blank">
                                            <img src="https://www.bricklyhomes.com/newsletters/iconos/logo_negro.png" alt="Brickly Homes" width="150" style="display:block; border:0; font-family:sans-serif; font-size:18px; line-height:20px; color:#111111; font-weight:bold;">
                                        </a>
                                    </td>
                                    <td align="right" style="vertical-align: middle;">
                                        <img src="https://www.bricklyhomes.com/newsletters/iconos/newsletter.png" alt="Contacto" width="24" height="24" style="display:block; border:0;">
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- 2. BLOQUE BIENVENIDA (Texto izquierda, Foto agente derecha) -->
                    <tr>
                        <td style="padding: 0 20px 35px 20px;">
                            <div style="background-color:#f8f9fa; border-radius: 24px; overflow: hidden; font-size: 0; max-width: 560px;">
                                
                                <!-- Columna Texto -->
                                <div class="col-50" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: middle; font-size: 14px;">
                                    <div class="padding-mobile" style="padding: 40px 25px;">
                                        <h1 style="margin: 0 0 20px 0; font-size: 26px; line-height: 32px; color: #111111; font-weight: 700;">¡Hola<br>${data.name}!</h1>
                                        <p style="margin: 0; font-size: 14px; line-height: 22px; color: #444444;">Gracias por contactarnos, un agente se estará comunicando contigo pronto.</p>
                                    </div>
                                </div>
                            
                                <div class="col-50" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: top;">
                                    <img src="https://www.bricklyhomes.com/newsletters/solicitar/banner.png" alt="Tu Agente Brickly" width="280" class="img-full" style="display:block; width:100%; height:auto; border:0;">
                                </div>
                            </div>
                        </td>
                    </tr>

                    <!-- 3. TÍTULO INTERMEDIO Y SUBTÍTULO -->
                    <tr>
                        <td align="center" style="padding: 10px 20px 25px 20px;">
                            <h2 style="margin: 0 0 10px 0; font-size: 24px; line-height: 30px; color: #111111; font-weight: 700;">Hemos recibido tu solicitud</h2>
                            <p style="margin: 0; font-size: 14px; line-height: 20px; color: #555555; max-width: 420px;">A continuación encontrarás un resumen de la información que nos has compartido.</p>
                        </td>
                    </tr>

                    <!-- 4. TABLA DE RESUMEN DE DATOS -->
                    <tr>
                        <td class="table-data-padding" style="padding: 0 45px 35px 45px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
                                
                                <!-- Fila 1: Nombre -->
                                <tr style="border-bottom: 1px solid #eeeeee;">
                                    <td width="40" style="padding: 15px 0; vertical-align: middle;">
                                        <img src="https://www.bricklyhomes.com/newsletters/solicitar/Nombre.png" alt="Nombre" width="24" height="24" style="display:block;">
                                    </td>
                                    <td style="padding: 15px 10px; vertical-align: middle;">
                                        <p style="margin: 0; font-size: 14px; font-weight: bold; color: #111111;">Nombre</p>
                                        <p style="margin: 2px 0 0 0; font-size: 14px; color: #555555;">${data.name} ${data.lastname}</p>
                                    </td>
                                </tr>

                                <!-- Fila 2: Correo -->
                                <tr style="border-bottom: 1px solid #eeeeee;">
                                    <td width="40" style="padding: 15px 0; vertical-align: middle;">
                                        <img src="https://www.bricklyhomes.com/newsletters/solicitar/Correo.png" alt="Correo" width="24" height="24" style="display:block;">
                                    </td>
                                    <td style="padding: 15px 10px; vertical-align: middle;">
                                        <p style="margin: 0; font-size: 14px; font-weight: bold; color: #111111;">Correo</p>
                                        <p style="margin: 2px 0 0 0; font-size: 14px; color: #555555;">${data.email}</p>
                                    </td>
                                </tr>

                                <!-- Fila 3: Teléfono -->
                                <tr style="border-bottom: 1px solid #eeeeee;">
                                    <td width="40" style="padding: 15px 0; vertical-align: middle;">
                                        <img src="https://www.bricklyhomes.com/newsletters/solicitar/Telefono.png" alt="Teléfono" width="24" height="24" style="display:block;">
                                    </td>
                                    <td style="padding: 15px 10px; vertical-align: middle;">
                                        <p style="margin: 0; font-size: 14px; font-weight: bold; color: #111111;">Teléfono</p>
                                        <p style="margin: 2px 0 0 0; font-size: 14px; color: #555555;">${data.phone}</p>
                                    </td>
                                </tr>

                                <!-- Fila 4: Mensaje -->
                                <tr style="border-bottom: 1px solid #eeeeee;">
                                    <td width="40" style="padding: 15px 0; vertical-align: middle;">
                                        <img src="https://www.bricklyhomes.com/newsletters/solicitar/Mensaje.png" alt="Mensaje" width="24" height="24" style="display:block;">
                                    </td>
                                    <td style="padding: 15px 10px; vertical-align: middle;">
                                        <p style="margin: 0; font-size: 14px; font-weight: bold; color: #111111;">Mensaje</p>
                                        <p style="margin: 2px 0 0 0; font-size: 14px; color: #555555; line-height: 20px;">${data.message}</p>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>

                    <!-- 5. SECCIÓN LLAMADA A LA ACCIÓN (Explora propiedades destacadas) -->
                    <tr>
                        <td align="center" style="padding: 15px 20px 40px 20px;">
                            <h2 style="margin: 0 0 10px 0; font-size: 24px; line-height: 28px; color: #111111; font-weight: 700;">Explora propiedades destacadas</h2>
                            <p style="margin: 0 0 25px 0; font-size: 14px; line-height: 20px; color: #555555; max-width: 440px;">Accede a las mejores oportunidades disponibles y comienza a explorar opciones en minutos.</p>
                            
                            <!-- Botón Negro -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="background-color: #000000; border-radius: 20px;">
                                        <a href="https://www.bricklyhomes.com" target="_blank" style="padding: 12px 35px; display: block; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none;">Ir a Brickly Homes</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- 6. SECCIÓN DE SOPORTE / CUENTA (Dos columnas fluidas) -->
                    <tr>
                        <td style="padding: 10px 20px 40px 20px; font-size: 0; border-top: 1px solid #eeeeee;">
                            
                            <!-- ¿Dudas? -->
                            <div class="col-50" style="display: inline-block; width: 100%; max-width: 270px; vertical-align: top; font-size: 14px; margin-bottom: 20px; padding-top: 20px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                        <td style="vertical-align: top; padding-right: 12px;">
                                            <img src="https://www.bricklyhomes.com/newsletters/iconos/Ayuda.png" alt="Dudas" width="32" height="32" style="display:block;">
                                        </td>
                                        <td style="vertical-align: top;">
                                            <p style="margin:0; font-size:14px; font-weight:bold; color:#111111;">¿Dudas?</p>
                                            <p style="margin:2px 0 0 0; font-size:13px; color:#555555; line-height:16px;">Estamos aquí para ayudarte. <br /> <a href="https://wa.me/50237649719?text=%C2%A1Hola!%20Deseo%20contactar%20a%20un%20asesor." target="_blank" style="color:#111111; font-weight:bold; text-decoration:underline;">Contáctanos</a></p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Tu cuenta -->
                            <div class="col-50" style="display: inline-block; width: 100%; max-width: 270px; vertical-align: top; font-size: 14px; padding-top: 20px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                        <td style="vertical-align: top; padding-right: 12px;">
                                            <img src="https://www.bricklyhomes.com/newsletters/iconos/Cuenta.png" alt="Cuenta" width="32" height="32" style="display:block;">
                                        </td>
                                        <td style="vertical-align: top;">
                                            <p style="margin:0; font-size:14px; font-weight:bold; color:#111111;">Tu cuenta</p>
                                            <p style="margin:2px 0 0 0; font-size:13px; color:#555555; line-height:16px;">Inicia sesión para gestionar tus preferencias. <br /><a href="https://www.bricklyhomes.com/login" target="_blank" style="color:#111111; font-weight:bold; text-decoration:underline;">Inicia sesión</a></p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                        </td>
                    </tr>

                    <!-- 7. FOOTER OSCURO -->
                    <tr>
                        <td style="background-color: #1a2129; padding: 40px 20px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="font-size: 0;">
                                        
                                        <!-- Logo Blanco -->
                                        <div class="col-50 text-center-mobile" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: middle; margin-bottom: 20px;">
                                            <a href="https://www.bricklyhomes.com" target="_blank">
                                                <img src="https://www.bricklyhomes.com/newsletters/iconos/logo_blanco.png" alt="Brickly Homes" width="130" style="border:0; display: inline-block;">
                                            </a>
                                        </div>
                                    
                                        <!-- Redes Sociales -->
                                        <div class="col-50 text-center-mobile" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: middle; text-align: right; margin-bottom: 20px;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display:inline-block;">
                                                <tr>
                                                    <td style="padding: 0 10px;"><a href="https://www.facebook.com/profile.php?id=61588999228778" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/FB.png" alt="Facebook" width="20" height="20"></a></td>
                                                    <td style="padding: 0 10px;"><a href="https://wa.me/50237649719?text=%C2%A1Hola!%20Deseo%20contactar%20a%20un%20asesor." target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/WS.png" alt="WhatsApp" width="20" height="20"></a></td>
                                                    <td style="padding: 0 10px;"><a href="https://www.instagram.com/bricklyoficial/" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/IG.png" alt="Instagram" width="20" height="20"></a></td>
                                                    <td style="padding: 0 10px;"><a href="https://www.linkedin.com/company/bricklygt/" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/IN.png" alt="LinkedIn" width="20" height="20"></a></td>
                                                    <td style="padding: 0 10px;"><a href="https://www.tiktok.com/@bricklyhomes?_r=1&_t=ZP-95NIrCBiYAQ" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/TT.png" alt="TikTok" width="20" height="20"></a></td>
                                                </tr>
                                            </table>
                                        </div>
                                        
                                    </td>
                                </tr>

                                <tr>
                                    <td align="center" style="border-top: 1px solid #2d3743; padding-top: 25px; font-size: 12px; color: #a0aec0; line-height: 18px;">
                                        <p style="margin: 0 0 10px 0;">© Brickly. Todos los derechos reservados</p>
                                        <p style="margin: 0;">¿No quieres recibir más correos? <a href="#" style="color:#ffffff; text-decoration:underline;">Darse de baja</a></p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>

            </body>
            </html>
            `,
        },
        {
            headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
            },
        },
        );
    }catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(error.response?.data);
        } else {
            console.error(error);
        }
    }
  }

  private async sendInternalNotification(data: any) {
    try{

        let intHtml = ``;
          if(data.agentId){

            let user = await this.usersService.findById(data.agentId);
            if(!user){
              throw new BadRequestException('Agente inválido');
            }
            intHtml += `
              <!-- CARD 2: AGENTE ASIGNADO -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F8FAFC" style="border-radius: 8px; border: 1px solid #F1F5F9; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 24px;">
                        <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 20px 0;">Agente asignado</h2>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #E2E8F0; margin-bottom: 12px;">
                            <tr>
                                <td width="40" valign="middle" style="padding-bottom: 12px;"><img src="https://www.bricklyhomes.com/newsletters/solicitar/Nombre.png" alt="Agente" width="30" height="30" style="display: block;"></td>
                                <td class="lbl-target" width="90" valign="middle" style="font-size: 14px; font-weight: 700; color: #0F172A; padding-bottom: 12px;">Nombre:</td>
                                <td valign="middle" style="font-size: 14px; color: #334155; padding-bottom: 12px;">${user.name}</td>
                            </tr>
                        </table>

                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td width="40" class="right-space" valign="middle"><img src="https://www.bricklyhomes.com/newsletters/solicitar/Correo.png" alt="Correo" width="30" height="30" style="display: block;"></td>
                                <td class="lbl-target" width="90" valign="middle" style="font-size: 14px; font-weight: 700; color: #0F172A;">Correo:</td>
                                <td valign="middle" style="font-size: 14px;"><a href="mailto:${user.email}" style="color: #3B82F6; text-decoration: underline;">${user.email}</a></td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            `;
          }

          let bodyHtml = `
            <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Nuevo Lead Interesado - Brickly</title>
                    <style>
                        /* Estilos generales de reset */
                        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap');

                        body {
                            margin: 0;
                            padding: 0;
                            background-color: #F8F9FA;
                            font-family: 'Plus Jakarta Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                            -webkit-font-smoothing: antialiased;
                        }
                        table {
                            border-collapse: collapse;
                            mso-table-lspace: 0pt;
                            mso-table-rspace: 0pt;
                        }
                        img {
                            border: 0;
                            height: auto;
                            line-height: 100%;
                            outline: none;
                            text-decoration: none;
                            display: block;
                        }
                        
                        /* Enlaces globales */
                        a {
                            color: #0056b3;
                            text-decoration: underline;
                        }

                        /* Responsividad básica */
                        @media screen and (max-width: 620px) {
                            .container {
                                width: 100% !important;
                                padding: 10px !important;
                            }
                            .content-padding {
                                padding-left: 20px !important;
                                padding-right: 20px !important;
                            }
                            .footer-social {
                                text-align: center !important;
                                margin-top: 20px !important;
                            }
                            .footer-logo {
                                text-align: center !important;
                            }
                            /* Ajuste sutil para móviles en las etiquetas fijas si fuera necesario */
                            .lbl-target {
                                width: 80px !important;
                            }
                            .right-space {
                                padding-right: 10px !important;
                            }
                        }
                    </style>
                </head>
                <body>

                    <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F8F9FA" style="table-layout: fixed;">
                        <tr>
                            <td align="center" style="padding: 20px 0;">
                                
                                <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                                    
                                    <!-- 1. HEADER (Logo y Icono de sobre) -->
                                    <tr>
                                        <td class="content-padding" style="padding: 30px 40px 20px 40px; border-bottom: 1px solid #F0F0F0;">
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="left" valign="middle">
                                                        <a href="https://www.bricklyhomes.com" target="_blank">
                                                            <img src="https://www.bricklyhomes.com/newsletters/iconos/logo_negro.png" alt="Brickly Homes" width="150" style="display:block; border:0; font-family:sans-serif; font-size:18px; line-height:20px; color:#111111; font-weight:bold;">
                                                        </a>
                                                    </td>
                                                    <td align="right" valign="middle">
                                                        <img src="https://www.bricklyhomes.com/newsletters/iconos/newsletter.png" alt="Icono Mensaje" width="24" height="24" style="display: block;">
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- 2. CUERPO DEL MENSAJE -->
                                    <tr>
                                        <td class="content-padding" style="padding: 40px 40px 30px 40px;" align="center">
                                            
                                            <table border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="center" bgcolor="#0F172A" style="border-radius: 50%; padding: 2px;">
                                                        <img src="https://www.bricklyhomes.com/newsletters/iconos/Cuenta.png" alt="User" width="50" height="50" style="display: block; filter: invert(1);">
                                                    </td>
                                                </tr>
                                            </table>

                                            <h1 style="font-size: 28px; font-weight: 700; color: #0F172A; margin: 25px 0 15px 0; font-family: Arial, sans-serif;">Nuevo lead interesado</h1>
                                            
                                            <div style="width: 50px; height: 2px; background-color: #CBD5E1; margin: 0 auto 25px auto;"></div>

                                            <p style="font-size: 16px; color: #334155; line-height: 1.5; margin: 0 0 35px 0;">
                                                Un cliente ha solicitado información sobre una propiedad en <br> <strong style="color: #0F172A;">Brickly Homes</strong>.
                                            </p>

                                            <!-- CARD 1: INFORMACIÓN DEL LEAD -->
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F8FAFC" style="border-radius: 8px; border: 1px solid #F1F5F9; margin-bottom: 20px;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 20px 0;">Información del lead</h2>
                                                        
                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #E2E8F0; margin-bottom: 12px;">
                                                            <tr>
                                                                <td width="40" valign="middle" style="padding-bottom: 12px;"><img src="https://www.bricklyhomes.com/newsletters/solicitar/Nombre.png" alt="Nombre" width="30" height="30" style="display: block;"></td>
                                                                <td class="lbl-target" width="90" valign="middle" style="font-size: 14px; font-weight: 700; color: #0F172A; padding-bottom: 12px;">Nombre:</td>
                                                                <td valign="middle" style="font-size: 14px; color: #334155; padding-bottom: 12px;">${data.name} ${data.lastname}</td>
                                                            </tr>
                                                        </table>

                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #E2E8F0; margin-bottom: 12px;">
                                                            <tr>
                                                                <td width="40" valign="middle" style="padding-bottom: 12px;"><img src="https://www.bricklyhomes.com/newsletters/solicitar/Correo.png" alt="Correo" width="30" height="30" style="display: block;"></td>
                                                                <td class="lbl-target" width="90" valign="middle" style="font-size: 14px; font-weight: 700; color: #0F172A; padding-bottom: 12px;">Correo:</td>
                                                                <td valign="middle" style="font-size: 14px; padding-bottom: 12px;"><a href="mailto:${data.message}" style="color: #3B82F6; text-decoration: underline;">${data.email}</a></td>
                                                            </tr>
                                                        </table>

                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #E2E8F0; margin-bottom: 12px;">
                                                            <tr>
                                                                <td width="40" valign="middle" style="padding-bottom: 12px;"><img src="https://www.bricklyhomes.com/newsletters/solicitar/Telefono.png" alt="Teléfono" width="30" height="30" style="display: block;"></td>
                                                                <td class="lbl-target" width="90" valign="middle" style="font-size: 14px; font-weight: 700; color: #0F172A; padding-bottom: 12px;">Teléfono:</td>
                                                                <td valign="middle" style="font-size: 14px; color: #334155; padding-bottom: 12px;">${data.phone}</td>
                                                            </tr>
                                                        </table>

                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td width="40" valign="top" style="padding-top: 2px;"><img src="https://www.bricklyhomes.com/newsletters/solicitar/Mensaje.png" alt="Mensaje" width="30" height="30" style="display: block;"></td>
                                                                <td class="lbl-target" width="90" valign="top" style="font-size: 14px; font-weight: 700; color: #0F172A; padding-top: 8px;">Mensaje:</td>
                                                                <td valign="top" style="font-size: 14px; color: #334155; line-height: 1.4; padding-top: 8px;">${data.message}</td>
                                                            </tr>
                                                        </table>

                                                    </td>
                                                </tr>
                                            </table>
                                            ${intHtml}
                                            <!-- CARD 3: SIGUIENTE PASO -->
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="border-radius: 8px;">
                                                <tr>
                                                    <td style="padding: 20px;">
                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td width="55" valign="middle">
                                                                    <table border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="border-radius: 50%; border: 1px solid #E2E8F0;">
                                                                        <tr>
                                                                            <td style="padding: 4px;"><img src="https://www.bricklyhomes.com/newsletters/suscripcion/Propiedades.png" alt="Siguiente paso" width="45" height="45" style="display: block;"></td>
                                                                        </tr>
                                                                    </table>
                                                                </td>

                                                                <td valign="middle" style="padding-left: 15px; text-align: left;">
                                                                    <h3 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 4px 0;">Siguiente paso</h3>
                                                                    <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.4;">Te recomendamos contactar al lead a la brevedad para brindarle la mejor atención.</p>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>

                                        </td>
                                    </tr>

                                    <!-- 3. FOOTER (Fondo Oscuro) -->
                                    <tr>
                                        <td class="content-padding" bgcolor="#000000" style="padding: 40px 40px 30px 40px; border-radius: 0 0 8px 8px;">
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td>
                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td class="footer-logo" align="left" valign="middle">
                                                                    <a href="https://www.bricklyhomes.com" target="_blank">
                                                                        <img src="https://www.bricklyhomes.com/newsletters/iconos/logo_blanco.png" alt="Brickly Homes" width="130" style="border:0; display: inline-block;">
                                                                    </a>
                                                                </td>

                                                                <td class="footer-social" align="right" valign="middle">
                                                                    <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                                                                        <tr>
                                                                            <td style="padding: 0 10px;"><a href="https://www.facebook.com/profile.php?id=61588999228778" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/FB.png" alt="Facebook" width="20" height="20" style="display: block;"></a></td>
                                                                            <td style="padding: 0 10px;"><a href="https://wa.me/50237649719?text=%C2%A1Hola!%20Deseo%20contactar%20a%20un%20asesor." target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/WS.png" alt="WhatsApp" width="20" height="20" style="display: block;"></a></td>
                                                                            <td style="padding: 0 10px;"><a href="https://www.instagram.com/bricklyoficial/" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/IG.png" alt="Instagram" width="20" height="20" style="display: block;"></a></td>
                                                                            <td style="padding: 0 10px;"><a href="https://www.linkedin.com/company/bricklygt/" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/IN.png" alt="LinkedIn" width="20" height="20" style="display: block;"></a></td>
                                                                            <td style="padding: 0 10px;"><a href="https://www.tiktok.com/@bricklyhomes?_r=1&_t=ZP-95NIrCBiYAQ" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/TT.png" alt="TikTok" width="20" height="20" style="display: block;"></a></td>
                                                                        </tr>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td align="left" style="padding-top: 30px; border-top: 1px solid #1F2937; margin-top: 25px;">
                                                        <p style="font-size: 11px; color: #FFFFFF; margin: 0 0 10px 0; line-height: 1.4;">
                                                            &copy; Brickly, todos los derechos reservados 2025.
                                                        </p>
                                                        <p style="font-size: 11px; color: #FFFFFF; margin: 0; line-height: 1.4;">
                                                            ¿No quieres recibir más correos? <a href="#" style="color: #FFFFFF; text-decoration: underline;">Cancelar suscripción</a>
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                </table>

                            </td>
                        </tr>
                    </table>

                </body>
                </html>
            `;


        return axios.post(
        this.API_URL,
        {
            sender: {
            email: this.EMAIL_SENDER,
            name: 'Brickly Homes',
            },
            to: [
            {
                email: this.EMAIL_INTERNAL_RECEIVE,
                name: 'Admin',
            },
            ],
            subject: 'Nuevo contacto recibido',
            htmlContent: bodyHtml,
        },
        {
            headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
            },
        },
        );
    }catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(error.response?.data);
        } else {
            console.error(error);
        }
    }
  }

  private async sendAgentNotification(data: any) {
    try{
        const userAgent = await this.usersService.findById(data.agentId);
    
        if(!userAgent){
          throw new BadRequestException('Agente inválido');
        }
       
        return axios.post(
        this.API_URL,
        {
            sender: {
            email: this.EMAIL_SENDER,
            name: 'Brickly Homes',
            },
            to: [
            {
                email: userAgent.email,
                name: userAgent.name,
            },
            ],
            subject: 'Nuevo contacto recibido',
            htmlContent: `
            <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Nuevo Lead Interesado - Brickly</title>
                    <style>
                        /* Estilos generales de reset */
                        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap');

                        body {
                            margin: 0;
                            padding: 0;
                            background-color: #F8F9FA;
                            font-family: 'Plus Jakarta Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                            -webkit-font-smoothing: antialiased;
                        }
                        table {
                            border-collapse: collapse;
                            mso-table-lspace: 0pt;
                            mso-table-rspace: 0pt;
                        }
                        img {
                            border: 0;
                            height: auto;
                            line-height: 100%;
                            outline: none;
                            text-decoration: none;
                            display: block;
                        }
                        
                        /* Enlaces globales */
                        a {
                            color: #0056b3;
                            text-decoration: underline;
                        }

                        /* Responsividad básica */
                        @media screen and (max-width: 620px) {
                            .container {
                                width: 100% !important;
                                padding: 10px !important;
                            }
                            .content-padding {
                                padding-left: 20px !important;
                                padding-right: 20px !important;
                            }
                            .footer-social {
                                text-align: center !important;
                                margin-top: 20px !important;
                            }
                            .footer-logo {
                                text-align: center !important;
                            }
                            /* Ajuste sutil para móviles en las etiquetas fijas si fuera necesario */
                            .lbl-target {
                                width: 80px !important;
                            }
                            .right-space {
                                padding-right: 10px !important;
                            }
                        }
                    </style>
                </head>
                <body>

                    <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F8F9FA" style="table-layout: fixed;">
                        <tr>
                            <td align="center" style="padding: 20px 0;">
                                
                                <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                                    
                                    <!-- 1. HEADER (Logo y Icono de sobre) -->
                                    <tr>
                                        <td class="content-padding" style="padding: 30px 40px 20px 40px; border-bottom: 1px solid #F0F0F0;">
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="left" valign="middle">
                                                        <a href="https://www.bricklyhomes.com" target="_blank">
                                                            <img src="https://www.bricklyhomes.com/newsletters/iconos/logo_negro.png" alt="Brickly Homes" width="150" style="display:block; border:0; font-family:sans-serif; font-size:18px; line-height:20px; color:#111111; font-weight:bold;">
                                                        </a>
                                                    </td>
                                                    <td align="right" valign="middle">
                                                        <img src="https://www.bricklyhomes.com/newsletters/iconos/newsletter.png" alt="Icono Mensaje" width="24" height="24" style="display: block;">
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- 2. CUERPO DEL MENSAJE -->
                                    <tr>
                                        <td class="content-padding" style="padding: 40px 40px 30px 40px;" align="center">
                                            
                                            <table border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="center" bgcolor="#0F172A" style="border-radius: 50%; padding: 2px;">
                                                        <img src="https://www.bricklyhomes.com/newsletters/iconos/Cuenta.png" alt="User" width="50" height="50" style="display: block; filter: invert(1);">
                                                    </td>
                                                </tr>
                                            </table>

                                            <h1 style="font-size: 28px; font-weight: 700; color: #0F172A; margin: 25px 0 15px 0; font-family: Arial, sans-serif;">Nuevo lead interesado</h1>
                                            
                                            <div style="width: 50px; height: 2px; background-color: #CBD5E1; margin: 0 auto 25px auto;"></div>

                                            <p style="font-size: 16px; color: #334155; line-height: 1.5; margin: 0 0 35px 0;">
                                                Un cliente ha solicitado información sobre una propiedad en <br> <strong style="color: #0F172A;">Brickly Homes</strong>.
                                            </p>

                                            <!-- CARD 1: INFORMACIÓN DEL LEAD -->
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F8FAFC" style="border-radius: 8px; border: 1px solid #F1F5F9; margin-bottom: 20px;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 20px 0;">Información del lead</h2>
                                                        
                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #E2E8F0; margin-bottom: 12px;">
                                                            <tr>
                                                                <td width="40" valign="middle" style="padding-bottom: 12px;"><img src="https://www.bricklyhomes.com/newsletters/solicitar/Nombre.png" alt="Nombre" width="30" height="30" style="display: block;"></td>
                                                                <td class="lbl-target" width="90" valign="middle" style="font-size: 14px; font-weight: 700; color: #0F172A; padding-bottom: 12px;">Nombre:</td>
                                                                <td valign="middle" style="font-size: 14px; color: #334155; padding-bottom: 12px;">${data.name} ${data.lastname}</td>
                                                            </tr>
                                                        </table>

                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #E2E8F0; margin-bottom: 12px;">
                                                            <tr>
                                                                <td width="40" valign="middle" style="padding-bottom: 12px;"><img src="https://www.bricklyhomes.com/newsletters/solicitar/Correo.png" alt="Correo" width="30" height="30" style="display: block;"></td>
                                                                <td class="lbl-target" width="90" valign="middle" style="font-size: 14px; font-weight: 700; color: #0F172A; padding-bottom: 12px;">Correo:</td>
                                                                <td valign="middle" style="font-size: 14px; padding-bottom: 12px;"><a href="mailto:${data.message}" style="color: #3B82F6; text-decoration: underline;">${data.email}</a></td>
                                                            </tr>
                                                        </table>

                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #E2E8F0; margin-bottom: 12px;">
                                                            <tr>
                                                                <td width="40" valign="middle" style="padding-bottom: 12px;"><img src="https://www.bricklyhomes.com/newsletters/solicitar/Telefono.png" alt="Teléfono" width="30" height="30" style="display: block;"></td>
                                                                <td class="lbl-target" width="90" valign="middle" style="font-size: 14px; font-weight: 700; color: #0F172A; padding-bottom: 12px;">Teléfono:</td>
                                                                <td valign="middle" style="font-size: 14px; color: #334155; padding-bottom: 12px;">${data.phone}</td>
                                                            </tr>
                                                        </table>

                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td width="40" valign="top" style="padding-top: 2px;"><img src="https://www.bricklyhomes.com/newsletters/solicitar/Mensaje.png" alt="Mensaje" width="30" height="30" style="display: block;"></td>
                                                                <td class="lbl-target" width="90" valign="top" style="font-size: 14px; font-weight: 700; color: #0F172A; padding-top: 8px;">Mensaje:</td>
                                                                <td valign="top" style="font-size: 14px; color: #334155; line-height: 1.4; padding-top: 8px;">${data.message}</td>
                                                            </tr>
                                                        </table>

                                                    </td>
                                                </tr>
                                            </table>

                                            <!-- CARD 2: AGENTE ASIGNADO -->
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F8FAFC" style="border-radius: 8px; border: 1px solid #F1F5F9; margin-bottom: 20px;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 20px 0;">Agente asignado</h2>
                                                        
                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #E2E8F0; margin-bottom: 12px;">
                                                            <tr>
                                                                <td width="40" valign="middle" style="padding-bottom: 12px;"><img src="https://www.bricklyhomes.com/newsletters/solicitar/Nombre.png" alt="Agente" width="30" height="30" style="display: block;"></td>
                                                                <td class="lbl-target" width="90" valign="middle" style="font-size: 14px; font-weight: 700; color: #0F172A; padding-bottom: 12px;">Nombre:</td>
                                                                <td valign="middle" style="font-size: 14px; color: #334155; padding-bottom: 12px;">${userAgent.name}</td>
                                                            </tr>
                                                        </table>

                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td width="40" class="right-space" valign="middle"><img src="https://www.bricklyhomes.com/newsletters/solicitar/Correo.png" alt="Correo" width="30" height="30" style="display: block;"></td>
                                                                <td class="lbl-target" width="90" valign="middle" style="font-size: 14px; font-weight: 700; color: #0F172A;">Correo:</td>
                                                                <td valign="middle" style="font-size: 14px;"><a href="mailto:cabrerajavier721@gmail.com" style="color: #3B82F6; text-decoration: underline;">${userAgent.email}</a></td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>

                                            <!-- CARD 3: SIGUIENTE PASO -->
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="border-radius: 8px;">
                                                <tr>
                                                    <td style="padding: 20px;">
                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td width="55" valign="middle">
                                                                    <table border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="border-radius: 50%; border: 1px solid #E2E8F0;">
                                                                        <tr>
                                                                            <td style="padding: 4px;"><img src="https://www.bricklyhomes.com/newsletters/suscripcion/Propiedades.png" alt="Siguiente paso" width="45" height="45" style="display: block;"></td>
                                                                        </tr>
                                                                    </table>
                                                                </td>

                                                                <td valign="middle" style="padding-left: 15px; text-align: left;">
                                                                    <h3 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 4px 0;">Siguiente paso</h3>
                                                                    <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.4;">Te recomendamos contactar al lead a la brevedad para brindarle la mejor atención.</p>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>

                                        </td>
                                    </tr>

                                    <!-- 3. FOOTER (Fondo Oscuro) -->
                                    <tr>
                                        <td class="content-padding" bgcolor="#000000" style="padding: 40px 40px 30px 40px; border-radius: 0 0 8px 8px;">
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td>
                                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td class="footer-logo" align="left" valign="middle">
                                                                    <a href="https://www.bricklyhomes.com" target="_blank">
                                                                        <img src="https://www.bricklyhomes.com/newsletters/iconos/logo_blanco.png" alt="Brickly Homes" width="130" style="border:0; display: inline-block;">
                                                                    </a>
                                                                </td>

                                                                <td class="footer-social" align="right" valign="middle">
                                                                    <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                                                                        <tr>
                                                                            <td style="padding: 0 10px;"><a href="https://www.facebook.com/profile.php?id=61588999228778" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/FB.png" alt="Facebook" width="20" height="20" style="display: block;"></a></td>
                                                                            <td style="padding: 0 10px;"><a href="https://wa.me/50237649719?text=%C2%A1Hola!%20Deseo%20contactar%20a%20un%20asesor." target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/WS.png" alt="WhatsApp" width="20" height="20" style="display: block;"></a></td>
                                                                            <td style="padding: 0 10px;"><a href="https://www.instagram.com/bricklyoficial/" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/IG.png" alt="Instagram" width="20" height="20" style="display: block;"></a></td>
                                                                            <td style="padding: 0 10px;"><a href="https://www.linkedin.com/company/bricklygt/" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/IN.png" alt="LinkedIn" width="20" height="20" style="display: block;"></a></td>
                                                                            <td style="padding: 0 10px;"><a href="https://www.tiktok.com/@bricklyhomes?_r=1&_t=ZP-95NIrCBiYAQ" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/TT.png" alt="TikTok" width="20" height="20" style="display: block;"></a></td>
                                                                        </tr>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td align="left" style="padding-top: 30px; border-top: 1px solid #1F2937; margin-top: 25px;">
                                                        <p style="font-size: 11px; color: #FFFFFF; margin: 0 0 10px 0; line-height: 1.4;">
                                                            &copy; Brickly, todos los derechos reservados 2025.
                                                        </p>
                                                        <p style="font-size: 11px; color: #FFFFFF; margin: 0; line-height: 1.4;">
                                                            ¿No quieres recibir más correos? <a href="#" style="color: #FFFFFF; text-decoration: underline;">Cancelar suscripción</a>
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                </table>

                            </td>
                        </tr>
                    </table>

                </body>
                </html>
            `,
        },
        {
            headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
            },
        },
        );
    }catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(error.response?.data);
        } else {
            console.error(error);
        }
    }
  }
  async getTotalLeadsCount(userId: string) {

      const objectId = new Types.ObjectId(userId);

      // obtener agentes hijos
      const childAgents = await this.userModel.find(
        {
          parentId: objectId,
        },
        {
          _id: 1,
        },
      );

      const agentsIds = [
        objectId,
        ...childAgents.map(agent => agent._id),
      ];

      // fechas
      const now = new Date();

      const startCurrentMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );

      const startPreviousMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );

      // total general
      const totalLeads =
        await this.leadformModel.countDocuments({
          agentId: { $in: agentsIds },
        });

      // leads mes actual
      const currentMonthLeads =
        await this.leadformModel.countDocuments({
          agentId: { $in: agentsIds },
          createdAt: {
            $gte: startCurrentMonth,
          },
        });

      // leads mes anterior
      const previousMonthLeads =
        await this.leadformModel.countDocuments({
          agentId: { $in: agentsIds },
          createdAt: {
            $gte: startPreviousMonth,
            $lt: startCurrentMonth,
          },
        });

      // porcentaje
      let growthPercentage = 0;

      if (previousMonthLeads > 0) {
        growthPercentage =
          (
            (
              currentMonthLeads -
              previousMonthLeads
            ) /
            previousMonthLeads
          ) * 100;
      } else if (currentMonthLeads > 0) {
        growthPercentage = 100;
      }

      return {
        totalLeads,

        currentMonthLeads,

        previousMonthLeads,

        growthPercentage: Number(
          growthPercentage.toFixed(2),
        ),
      };
    }

  async getTotalContactSiteCount(){
    // fechas
    const now = new Date();

    const startCurrentMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );

    const startPreviousMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );

    const totalContactSite =
        await this.ContactsiteModel.countDocuments({});

    
      // leads mes actual
      const currentMonthContactSite =
        await this.ContactsiteModel.countDocuments({
          createdAt: {
            $gte: startCurrentMonth,
          },
        });

      // leads mes anterior
      const previousMonthContactSite =
        await this.ContactsiteModel.countDocuments({
          createdAt: {
            $gte: startPreviousMonth,
            $lt: startCurrentMonth,
          },
        });

    // porcentaje
      let growthPercentage = 0;

      if (previousMonthContactSite > 0) {
        growthPercentage =
          (
            (
              currentMonthContactSite -
              previousMonthContactSite
            ) /
            previousMonthContactSite
          ) * 100;
      } else if (currentMonthContactSite > 0) {
        growthPercentage = 100;
      }

      return {
        totalContactSite,
        currentMonthContactSite,
        previousMonthContactSite,
        growthPercentage: Number(
          growthPercentage.toFixed(2),
        ),
      };
  }

  async getAgencyLeadsRanking() {
    const [result] = await this.userModel.aggregate([
        {
        $match: {
            roles: 'agencia',
        },
        },

        {
        $graphLookup: {
            from: 'users',
            startWith: '$_id',
            connectFromField: '_id',
            connectToField: 'parentId',
            as: 'descendants',
        },
        },

        {
        $addFields: {
            allUserIds: {
            $concatArrays: [
                ['$_id'],
                '$descendants._id',
            ],
            },
        },
        },

        {
        $lookup: {
            from: 'leadforms',
            let: {
            userIds: '$allUserIds',
            },
            pipeline: [
            {
                $match: {
                $expr: {
                    $in: [
                    '$agentId',
                    '$$userIds',
                    ],
                },
                },
            },
            {
                $count: 'total',
            },
            ],
            as: 'leadStats',
        },
        },

        {
        $addFields: {
            amountLeads: {
            $ifNull: [
                {
                $arrayElemAt: [
                    '$leadStats.total',
                    0,
                ],
                },
                0,
            ],
            },
        },
        },

        {
        $project: {
            _id: 0,
            id: {
            $toString: '$_id',
            },
            name: 1,
            avatar: 1,
            amountLeads: 1,
        },
        },

        {
        $facet: {
            top5Best: [
            {
                $sort: {
                amountLeads: -1,
                },
            },
            {
                $limit: 5,
            },
            ],

            top5Worst: [
            {
                $sort: {
                amountLeads: 1,
                },
            },
            {
                $limit: 5,
            },
            ],
        },
        },
    ]);

    const totalLeads =
        await this.leadformModel.countDocuments({});

    return {
        totalLeads: totalLeads,
        top5Best:
        result?.top5Best?.map(
            (agency, index) => ({
            position: index + 1,
            ...agency,
            }),
        ) || [],

        top5Worst:
        result?.top5Worst?.map(
            (agency, index) => ({
            position: index + 1,
            ...agency,
            }),
        ) || [],
    };
    }

  async getAgencyWhatsappClicksRanking() {
    const [result] = await this.userModel.aggregate([
        {
        $match: {
            roles: 'agencia',
        },
        },

        {
        $graphLookup: {
            from: 'users',
            startWith: '$_id',
            connectFromField: '_id',
            connectToField: 'parentId',
            as: 'descendants',
            maxDepth: 10,
        },
        },

        {
        $addFields: {
            totalWhatsappClicks: {
            $add: [
                {
                $ifNull: [
                    '$clickCounterWs',
                    0,
                ],
                },
                {
                $sum: {
                    $map: {
                    input: '$descendants',
                    as: 'user',
                    in: {
                        $ifNull: [
                        '$$user.clickCounterWs',
                        0,
                        ],
                    },
                    },
                },
                },
            ],
            },
        },
        },

        {
        $project: {
            _id: 0,
            id: {
            $toString: '$_id',
            },
            name: 1,
            avatar: 1,
            amountClicks: '$totalWhatsappClicks',
        },
        },

        {
        $facet: {
            top5Best: [
            {
                $sort: {
                amountClicks: -1,
                },
            },
            {
                $limit: 5,
            },
            ],

            top5Worst: [
            {
                $sort: {
                amountClicks: 1,
                },
            },
            {
                $limit: 5,
            },
            ],
        },
        },
    ]);

    return {
        top5Best:
        result?.top5Best?.map(
            (agency, index) => ({
            position: index + 1,
            ...agency,
            }),
        ) || [],

        top5Worst:
        result?.top5Worst?.map(
            (agency, index) => ({
            position: index + 1,
            ...agency,
            }),
        ) || [],
    };
    }

  async getAgencyClicksRanking() {
    const [result] = await this.userModel.aggregate([
        {
        $match: {
            roles: 'agencia',
        },
        },

        {
        $graphLookup: {
            from: 'users',
            startWith: '$_id',
            connectFromField: '_id',
            connectToField: 'parentId',
            as: 'descendants',
            maxDepth: 10,
        },
        },

        {
        $addFields: {
            totalClicks: {
            $add: [
                {
                $ifNull: [
                    '$clickCounter',
                    0,
                ],
                },
                {
                $sum: {
                    $map: {
                    input: '$descendants',
                    as: 'user',
                    in: {
                        $ifNull: [
                        '$$user.clickCounter',
                        0,
                        ],
                    },
                    },
                },
                },
            ],
            },
        },
        },

        {
        $project: {
            _id: 0,
            id: {
            $toString: '$_id',
            },
            name: 1,
            avatar: 1,
            amountClicks: '$totalClicks',
        },
        },

        {
        $facet: {
            top5Best: [
            {
                $sort: {
                amountClicks: -1,
                },
            },
            {
                $limit: 5,
            },
            ],

            top5Worst: [
            {
                $sort: {
                amountClicks: 1,
                },
            },
            {
                $limit: 5,
            },
            ],
        },
        },
    ]);

    return {
        top5Best:
        result?.top5Best?.map(
            (agency, index) => ({
            position: index + 1,
            ...agency,
            }),
        ) || [],

        top5Worst:
        result?.top5Worst?.map(
            (agency, index) => ({
            position: index + 1,
            ...agency,
            }),
        ) || [],
    };
    }

  async sendResetEmail(email: string, code: string) {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          email: 'no-reply@brickly.mydesk.digital',
          name: 'Brickly',
        },
        to: [{ email }],
        subject: 'Recuperar contraseña',
        htmlContent: `
          <h2>Recuperación de contraseña</h2>
          <p>Tu código es:</p>
          <h1>${code}</h1>
          <p>Este código expira en 15 minutos.</p>
        `,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  public async sendEmail(data: { emailTo:string, name:string, subject:string, html:string }) {
    try {
      await axios.post(
        this.API_URL,
        {
          sender: {
            email: this.EMAIL_SENDER,
            name: 'Brickly Homes',
          },
          to: [{
                email: data.emailTo,
                name: `${data.name}`,
            },],
          subject: `${data.subject}`,
          htmlContent: `${data.html}`,
        },
        {
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(error.response?.data);
        } else {
            console.error(error);
        }
    }
  }

  public async ntfySend(data: {tag:string,message:string,title:string}){
        try{
            if(!data.tag){
                 console.error("no se envio el tag de las notificaciones");
                 return false;
            }
            let FullMessage = data.title + ": "+ data.message;
            await axios.post(`http://noti.weclickdigital.com:2080/${data.tag}`,
                                FullMessage,
                                {headers:{'Content-Type': 'text/plain',}}
                            );
            return true;
        }catch (error) {
            if (axios.isAxiosError(error)) {
                console.error(error.response?.data);
            } else {
                console.error(error);
            }
            return false
        }

  }

  async migrateObjectIds() {

        await this.userModel.collection.updateMany(
            {
            parentId: false,
            },
            {
            $set: {
                parentId: null,
            },
            },
        );

        await this.userModel.collection.updateMany(
            {
            parentId: {
                $type: 'string',
            },
            },
            [
            {
                $set: {
                parentId: {
                    $toObjectId: '$parentId',
                },
                },
            },
            ],
        );

        await this.leadformModel.collection.updateMany(
            {
            agentId: {
                $type: 'string',
            },
            },
            [
            {
                $set: {
                agentId: {
                    $toObjectId: '$agentId',
                },
                },
            },
            ],
        );

        return {
            success: true,
        };
  }
}
