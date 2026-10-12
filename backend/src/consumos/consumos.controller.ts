import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { ConsumosService } from './consumos.service.js';

@UseGuards(AuthGuard)
@Controller()
export class ConsumosController {
  constructor(private svc: ConsumosService) {}

  @Get('periodos')
  periodos() {
    return this.svc.periodos();
  }

  @Get('resumen')
  async resumen(@Query('periodo') periodo?: string) {
    const p = periodo ?? (await this.svc.periodoActual());
    if (!/^\d{4}-\d{2}-25$/.test(p)) {
      throw new BadRequestException('periodo inválido (usa AAAA-MM-25)');
    }
    return this.svc.resumen(p);
  }
}
