import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  send(@Body() body: {
    name: string;
    lastname: string;
    phone: string;
    email: string;
    message: string;
    type: string;
  }) {
    return this.contactService.handleContact(body);
  }

  @Post('agente')
  agent(@Body() body: {
    name: string;
    lastname: string;
    phone: string;
    email: string;
    message: string;
    agentId: string;
    info: string;
    type: string;
  }) {
    return this.contactService.handleContactAgent(body);
  }

  @Post('subscribe')
  subscribe(@Body() body: { email: string }) {
    return this.contactService.subscribe(body.email);
  }

  @Get('agency/top-leads')
  getleadtop() {
    return this.contactService.getAgencyLeadsRanking();
  }
  @Get('migrate-id-db')
  migrateIds() {
    return this.contactService.migrateObjectIds();
  }

  @Get('agency/top-clickws')
  getclickwstop() {
    return this.contactService.getAgencyWhatsappClicksRanking();
  }
  @Get('agency/top-click')
  getclicktop() {
    return this.contactService.getAgencyClicksRanking();
  }

  @Get('leads')
  getlead(@Query() query: any) {
    return this.contactService.findLead(query);
  }

  @Get('site/forms')
  getContactsSite(@Query() query: any) {
    return this.contactService.findContactsite(query);
  }

  @Get('total-contact-site')
  getTotalContactSiteCount() {
    return this.contactService.getTotalContactSiteCount();
  }

  @Get('total-leads-count/:id')
  getTotalLeadsCount(
    @Param('id') id: string,
  ) {
    return this.contactService.getTotalLeadsCount(id);
  }

  
}