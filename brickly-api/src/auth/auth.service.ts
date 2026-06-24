import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ContactService } from '../contact/contact.service';
import { Role } from './roles.enum';
import { ConflictException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private ContactService: ContactService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException();

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException();

    return {
      access_token: this.jwtService.sign({
        sub: user._id,
        roles: user.roles,
      }),
    };
  }

  async register(data: any, role: Role) {
    const existing = await this.usersService.findByEmail(data.email);

    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const hash = await bcrypt.hash(data.password, 10);
    const registerUs = await this.usersService.create({
      ...data,
      password: hash,
      roles: [role],
    });
    if (registerUs) {

    const newsletter = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Bienvenido a Brickly Homes</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap');
                    @media screen and (max-width: 600px) {
                        .wrapper { width: 100% !important; max-width: 100% !important; }
                        .col-50 { width: 100% !important; max-width: 100% !important; display: block !important; }
                        .col-33 { width: 100% !important; max-width: 100% !important; display: block !important; margin-bottom: 30px !important; }
                        .hide-mobile { display: none !important; }
                        .padding-mobile { padding: 25px 20px !important; }
                        .text-center-mobile { text-align: center !important; }
                        .img-full { width: 100% !important; height: auto !important; margin: 0 auto !important; padding-bottom: 20px !important;}
                    }
                </style>
            </head>
            <body style="margin:0; padding:0; background-color:#ffffff; font-family:'Plus Jakarta Sans', 'system-ui', Helvetica, Arial, sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">

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

                    <!-- 2. BLOQUE BIENVENIDA (Responsivo: Texto arriba, Imagen abajo en móviles) -->
                    <tr>
                        <td style="padding: 0 20px 30px 20px;">
                            <div style="background-color:#f8f9fa; border-radius: 24px; overflow: hidden; font-size: 0; max-width: 560px;">
                                
                                <div class="col-50" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: middle; font-size: 14px;">
                                    <div class="padding-mobile" style="padding: 35px 25px;">
                                        <h1 style="margin: 0 0 15px 0; font-size: 24px; line-height: 30px; color: #111111; font-weight: 700;">¡Bienvenido a Brickly Homes, ${data.name}!</h1>
                                        <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 20px; color: #444444;">Gracias por unirte a nuestra plataforma inmobiliaria.</p>
                                        <p style="margin: 0; font-size: 14px; line-height: 20px; color: #444444;">Estamos aquí para ayudarte a encontrar, comparar y conectar con las mejores propiedades.</p>
                                    </div>
                                </div>
                                
                                <div class="col-50" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: top;">
                                    <img src="https://www.bricklyhomes.com/newsletters/bienvenida/banner.png" alt="Brickly Propiedades" width="280" style="display:block; width:100%; height:auto; border:0;">
                                </div>
                            </div>
                        </td>
                    </tr>

                    <!-- 3. TÍTULO INTERMEDIO -->
                    <tr>
                        <td align="center" style="padding: 20px 20px 30px 20px;">
                            <h2 style="margin: 0; font-size: 26px; line-height: 32px; color: #111111; font-weight: 700; max-width: 400px;">Miles de propiedades en un solo lugar</h2>
                        </td>
                    </tr>

                    <!-- 4. SECCIÓN 3 COLUMNAS (Se apilan en móviles) -->
                    <tr>
                        <td style="padding: 0 20px 20px 20px; font-size: 0; text-align: center;">
                            
                            <!-- Columna 1: Busca -->
                            <div class="col-33" style="display: inline-block; width: 100%; max-width: 180px; vertical-align: top; font-size: 13px;">
                                <img src="https://www.bricklyhomes.com/newsletters/iconos/Buscar.png" alt="Buscar" width="40" height="40" style="display:inline-block; margin-bottom:15px;">
                                <h3 style="margin: 0 0 10px 0; font-size: 15px; line-height: 18px; color: #111111; font-weight: 700;">Busca y compara</h3>
                                <p style="margin: 0; font-size: 13px; line-height: 18px; color: #555555; padding: 0 10px;">Encuentra propiedades que se adaptan a tus necesidades y compara fácilmente.</p>
                            </div>
                            
                            <!-- Columna 2: Favoritas -->
                            <div class="col-33" style="display: inline-block; width: 100%; max-width: 186px; vertical-align: top; font-size: 13px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;" id="middle-col">
                                <img src="https://www.bricklyhomes.com/newsletters/bienvenida/Favoritos.png" alt="Favoritos" width="40" height="40" style="display:inline-block; margin-bottom:15px;">
                                <h3 style="margin: 0 0 10px 0; font-size: 15px; line-height: 18px; color: #111111; font-weight: 700;">Guarda tus favoritas</h3>
                                <p style="margin: 0; font-size: 13px; line-height: 18px; color: #555555; padding: 0 10px;">Guarda las propiedades que te interesan y organízalas en tu cuenta.</p>
                            </div>
                            
                            <!-- Columna 3: Expertos -->
                            <div class="col-33" style="display: inline-block; width: 100%; max-width: 180px; vertical-align: top; font-size: 13px;">
                                <img src="https://www.bricklyhomes.com/newsletters/bienvenida/Conecta.png" alt="Expertos" width="40" height="40" style="display:inline-block; margin-bottom:15px;">
                                <h3 style="margin: 0 0 10px 0; font-size: 15px; line-height: 18px; color: #111111; font-weight: 700;">Conecta con expertos</h3>
                                <p style="margin: 0; font-size: 13px; line-height: 18px; color: #555555; padding: 0 10px;">Contacta directamente a agentes inmobiliarios verificados.</p>
                            </div>
                        </td>
                    </tr>

                    <!-- 5. BLOQUE ¿LISTO PARA EMPEZAR? (Responsivo: Texto arriba, Mockup abajo) -->
                    <tr>
                        <td style="padding: 20px 20px 30px 20px;">
                            <div style="background-color:#f8f9fa; border-radius: 24px; overflow: hidden; font-size: 0; max-width: 560px;">
                                
                                <div class="col-50" style="display: inline-block; width: 100%; max-width: 250px; vertical-align: middle; font-size: 14px;">
                                    <div class="padding-mobile" style="padding: 40px 10px 40px 30px;">
                                        <h2 style="margin: 0 0 15px 0; font-size: 24px; line-height: 28px; color: #111111; font-weight: 700;">¿Listo para empezar?</h2>
                                        <p style="margin: 0 0 25px 0; font-size: 14px; line-height: 20px; color: #444444;">Explora propiedades, guarda tus favoritas y da el siguiente paso hacia tu nuevo hogar o inversión.</p>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td align="center" style="background-color: #000000; border-radius: 20px;">
                                                    <a href="https://blog.brickly.mydesk.digital" target="_blank" style="padding: 12px 25px; display: block; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none;">Ir a Brickly Homes</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                                
                                <!-- CAMBIAR AQUÍ: Imagen de Laptop + Smartphone Mockup -->
                                <div class="col-50" style="display: inline-block; width: 100%; max-width: 310px; vertical-align: middle;">
                                    <img src="https://www.bricklyhomes.com/newsletters/bienvenida/computadora.png" alt="Plataforma Brickly" width="310" class="img-full" style="display:block; width:100%; height:auto; border:0;">
                                </div>
                            </div>
                        </td>
                    </tr>

                    <!-- 6. SECCIÓN DE SOPORTE / CUENTA (Responsivo: se dividen en dos bloques independientes) -->
                    <tr>
                        <td style="padding: 10px 20px 40px 20px; font-size: 0;">
                            
                            <!-- ¿Dudas? -->
                            <div class="col-50" style="display: inline-block; width: 100%; max-width: 270px; vertical-align: top; font-size: 14px; margin-bottom: 20px;">
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
                            <div class="col-50" style="display: inline-block; width: 100%; max-width: 270px; vertical-align: top; font-size: 14px;">
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
                                        
                                        <!--[if mso]></td></tr></table><![endif]-->
                                    </td>
                                </tr>
                                <!-- Fila Inferior (Copyright y Desuscripción) -->
                                <tr>
                                    <td align="center" style="border-top: 1px solid #2d3743; padding-top: 25px; font-size: 12px; color: #a0aec0; line-height: 18px;">
                                        <p style="margin: 0 0 10px 0;">© Brickly. Todos los derechos reservados 2026</p>
                                        <p style="margin: 0;">¿No quieres recibir más correos? <a href="#" style="color:#ffffff; text-decoration:underline;">Darse de baja</a></p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>

            </body>
            </html>
            `;

    try {

      await this.ContactService.sendEmail({
        emailTo: data.email,
        name: data.name,
        subject: 'Tu registro fue completado correctamente',
        html: newsletter,
      });

    } catch (error) {

      // no romper el registro si falla el email
      console.error(
        'Error enviando correo bienvenida',
        error,
      );
    }
  }
    return registerUs;
  }
  async validateGoogleUser(googleUser: any) {
    const { email, name, googleId } = googleUser;

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      user = await this.usersService.create({
        name,
        email,
        googleId,
        provider: 'google',
        roles: ['cliente'],
        verifyAccount: true,
      });

      if (user) {

        const newsletter = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Bienvenido a Brickly Homes</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap');
                        @media screen and (max-width: 600px) {
                            .wrapper { width: 100% !important; max-width: 100% !important; }
                            .col-50 { width: 100% !important; max-width: 100% !important; display: block !important; }
                            .col-33 { width: 100% !important; max-width: 100% !important; display: block !important; margin-bottom: 30px !important; }
                            .hide-mobile { display: none !important; }
                            .padding-mobile { padding: 25px 20px !important; }
                            .text-center-mobile { text-align: center !important; }
                            .img-full { width: 100% !important; height: auto !important; margin: 0 auto !important; padding-bottom: 20px !important;}
                        }
                    </style>
                </head>
                <body style="margin:0; padding:0; background-color:#ffffff; font-family:'Plus Jakarta Sans', 'system-ui', Helvetica, Arial, sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">

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

                        <!-- 2. BLOQUE BIENVENIDA (Responsivo: Texto arriba, Imagen abajo en móviles) -->
                        <tr>
                            <td style="padding: 0 20px 30px 20px;">
                                <div style="background-color:#f8f9fa; border-radius: 24px; overflow: hidden; font-size: 0; max-width: 560px;">
                                    
                                    <div class="col-50" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: middle; font-size: 14px;">
                                        <div class="padding-mobile" style="padding: 35px 25px;">
                                            <h1 style="margin: 0 0 15px 0; font-size: 24px; line-height: 30px; color: #111111; font-weight: 700;">¡Bienvenido a Brickly Homes, ${user.name}!</h1>
                                            <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 20px; color: #444444;">Gracias por unirte a nuestra plataforma inmobiliaria.</p>
                                            <p style="margin: 0; font-size: 14px; line-height: 20px; color: #444444;">Estamos aquí para ayudarte a encontrar, comparar y conectar con las mejores propiedades.</p>
                                        </div>
                                    </div>
                                    
                                    <div class="col-50" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: top;">
                                        <img src="https://www.bricklyhomes.com/newsletters/bienvenida/banner.png" alt="Brickly Propiedades" width="280" style="display:block; width:100%; height:auto; border:0;">
                                    </div>
                                </div>
                            </td>
                        </tr>

                        <!-- 3. TÍTULO INTERMEDIO -->
                        <tr>
                            <td align="center" style="padding: 20px 20px 30px 20px;">
                                <h2 style="margin: 0; font-size: 26px; line-height: 32px; color: #111111; font-weight: 700; max-width: 400px;">Miles de propiedades en un solo lugar</h2>
                            </td>
                        </tr>

                        <!-- 4. SECCIÓN 3 COLUMNAS (Se apilan en móviles) -->
                        <tr>
                            <td style="padding: 0 20px 20px 20px; font-size: 0; text-align: center;">
                                
                                <!-- Columna 1: Busca -->
                                <div class="col-33" style="display: inline-block; width: 100%; max-width: 180px; vertical-align: top; font-size: 13px;">
                                    <img src="https://www.bricklyhomes.com/newsletters/iconos/Buscar.png" alt="Buscar" width="40" height="40" style="display:inline-block; margin-bottom:15px;">
                                    <h3 style="margin: 0 0 10px 0; font-size: 15px; line-height: 18px; color: #111111; font-weight: 700;">Busca y compara</h3>
                                    <p style="margin: 0; font-size: 13px; line-height: 18px; color: #555555; padding: 0 10px;">Encuentra propiedades que se adaptan a tus necesidades y compara fácilmente.</p>
                                </div>
                                
                                <!-- Columna 2: Favoritas -->
                                <div class="col-33" style="display: inline-block; width: 100%; max-width: 186px; vertical-align: top; font-size: 13px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;" id="middle-col">
                                    <img src="https://www.bricklyhomes.com/newsletters/bienvenida/Favoritos.png" alt="Favoritos" width="40" height="40" style="display:inline-block; margin-bottom:15px;">
                                    <h3 style="margin: 0 0 10px 0; font-size: 15px; line-height: 18px; color: #111111; font-weight: 700;">Guarda tus favoritas</h3>
                                    <p style="margin: 0; font-size: 13px; line-height: 18px; color: #555555; padding: 0 10px;">Guarda las propiedades que te interesan y organízalas en tu cuenta.</p>
                                </div>
                                
                                <!-- Columna 3: Expertos -->
                                <div class="col-33" style="display: inline-block; width: 100%; max-width: 180px; vertical-align: top; font-size: 13px;">
                                    <img src="https://www.bricklyhomes.com/newsletters/bienvenida/Conecta.png" alt="Expertos" width="40" height="40" style="display:inline-block; margin-bottom:15px;">
                                    <h3 style="margin: 0 0 10px 0; font-size: 15px; line-height: 18px; color: #111111; font-weight: 700;">Conecta con expertos</h3>
                                    <p style="margin: 0; font-size: 13px; line-height: 18px; color: #555555; padding: 0 10px;">Contacta directamente a agentes inmobiliarios verificados.</p>
                                </div>
                            </td>
                        </tr>

                        <!-- 5. BLOQUE ¿LISTO PARA EMPEZAR? (Responsivo: Texto arriba, Mockup abajo) -->
                        <tr>
                            <td style="padding: 20px 20px 30px 20px;">
                                <div style="background-color:#f8f9fa; border-radius: 24px; overflow: hidden; font-size: 0; max-width: 560px;">
                                    
                                    <div class="col-50" style="display: inline-block; width: 100%; max-width: 250px; vertical-align: middle; font-size: 14px;">
                                        <div class="padding-mobile" style="padding: 40px 10px 40px 30px;">
                                            <h2 style="margin: 0 0 15px 0; font-size: 24px; line-height: 28px; color: #111111; font-weight: 700;">¿Listo para empezar?</h2>
                                            <p style="margin: 0 0 25px 0; font-size: 14px; line-height: 20px; color: #444444;">Explora propiedades, guarda tus favoritas y da el siguiente paso hacia tu nuevo hogar o inversión.</p>
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                <tr>
                                                    <td align="center" style="background-color: #000000; border-radius: 20px;">
                                                        <a href="https://blog.brickly.mydesk.digital" target="_blank" style="padding: 12px 25px; display: block; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none;">Ir a Brickly Homes</a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>
                                    </div>
                                    
                                    <!-- CAMBIAR AQUÍ: Imagen de Laptop + Smartphone Mockup -->
                                    <div class="col-50" style="display: inline-block; width: 100%; max-width: 310px; vertical-align: middle;">
                                        <img src="https://www.bricklyhomes.com/newsletters/bienvenida/computadora.png" alt="Plataforma Brickly" width="310" class="img-full" style="display:block; width:100%; height:auto; border:0;">
                                    </div>
                                </div>
                            </td>
                        </tr>

                        <!-- 6. SECCIÓN DE SOPORTE / CUENTA (Responsivo: se dividen en dos bloques independientes) -->
                        <tr>
                            <td style="padding: 10px 20px 40px 20px; font-size: 0;">
                                
                                <!-- ¿Dudas? -->
                                <div class="col-50" style="display: inline-block; width: 100%; max-width: 270px; vertical-align: top; font-size: 14px; margin-bottom: 20px;">
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
                                <div class="col-50" style="display: inline-block; width: 100%; max-width: 270px; vertical-align: top; font-size: 14px;">
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
                                            
                                            <!--[if mso]></td></tr></table><![endif]-->
                                        </td>
                                    </tr>
                                    <!-- Fila Inferior (Copyright y Desuscripción) -->
                                    <tr>
                                        <td align="center" style="border-top: 1px solid #2d3743; padding-top: 25px; font-size: 12px; color: #a0aec0; line-height: 18px;">
                                            <p style="margin: 0 0 10px 0;">© Brickly. Todos los derechos reservados 2026</p>
                                            <p style="margin: 0;">¿No quieres recibir más correos? <a href="#" style="color:#ffffff; text-decoration:underline;">Darse de baja</a></p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                    </table>

                </body>
                </html>
                `;

        try {

          await this.ContactService.sendEmail({
            emailTo: user.email,
            name: user.name,
            subject: 'Tu registro fue completado correctamente',
            html: newsletter,
          });

        } catch (error) {

          // no romper el registro si falla el email
          console.error(
            'Error enviando correo bienvenida',
            error,
          );
        }
      }

    }

    const payload = {
      sub: user._id,
      roles: user.roles,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.resetPasswordCode) {
      throw new BadRequestException('Código inválido');
    }

    // validar expiración
    if ((user.resetPasswordExpires) && user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Código expirado');
    }

    // comparar código
    const isMatch = await bcrypt.compare(code, user.resetPasswordCode);

    if (!isMatch) {
      throw new BadRequestException('Código incorrecto');
    }

    // actualizar password
    user.password = await bcrypt.hash(newPassword, 10);

    // limpiar campos
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return { message: 'Contraseña actualizada correctamente' };
  }

  async forgotPassword(email: string) {

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return { message: 'Si el correo existe, se enviará un código' };
    }

    const code = this.generateCode();

    user.resetPasswordCode = await bcrypt.hash(code, 10);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await user.save();

    try {
      await this.ContactService.sendResetEmail(user.email, code);
    } catch (error) {

      if (axios.isAxiosError(error)) {
        console.error('Brevo error:', error.response?.data);

        throw new BadRequestException({
          message: 'Error enviando correo',
          brevo: error.response?.data, 
        });
      }

      console.error(error);
      throw new InternalServerErrorException('Error inesperado');
    }

    return { message: 'Código enviado al correo' };
  }
  async sendCodeVerifyEmail(id:string){
        const user = await this.usersService.findById(id);
        if (!user) {
            return { message: 'No se pudo enviar el código de verificación porque no encontro el correo' };
        }

        if(user.verifyAccount !== undefined && user.verifyAccount){
            return { message: 'Su cuenta ya se encuentra verificada' };
        }
        
        const code = this.generateCode();
        user.VerifyAccountCode = await bcrypt.hash(code, 10);
        user.verifyAccountCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

        await user.save();
        try {

                const htmlBody = `
                    <h2>Verificación de cuenta</h2>
                    <p>Tu código es:</p>
                    <h1>${code}</h1>
                    <p>Este código expira en 15 minutos.</p>
                `;

                 await this.ContactService.sendEmail({
                    emailTo: user.email,
                    name: user.name,
                    subject: "Código de verificación Brickly Homes",
                    html: htmlBody
                 });
            } catch (error) {

                if (axios.isAxiosError(error)) {
                    console.error('Brevo error:', error.response?.data);

                    throw new BadRequestException({
                    message: 'Error enviando correo',
                    brevo: error.response?.data, 
                    });
                }

                console.error(error);
                throw new InternalServerErrorException('Error inesperado');
            }
  }
  async checkCodeAccount(id: string, code: string) {
    const user = await this.usersService.findById(id);

    if (!user || !user.VerifyAccountCode) {
      throw new BadRequestException('Código inválido');
    }

    // validar expiración
    if ((user.verifyAccountCodeExpires) && user.verifyAccountCodeExpires < new Date()) {
      throw new BadRequestException('Código expirado');
    }

    // comparar código
    const isMatch = await bcrypt.compare(code, user.VerifyAccountCode);

    if (!isMatch) {
      throw new BadRequestException('Código incorrecto');
    }

    user.verifyAccount = true;

    user.VerifyAccountCode = undefined;
    user.verifyAccountCodeExpires = undefined;

    await user.save();

    return { message: 'Cuenta verificada de forma correcta' };
  }
  
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
  }
}