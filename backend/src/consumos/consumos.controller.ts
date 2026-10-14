import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { ConsumosService } from './consumos.service.js';

@UseGuards(AuthGuard)
@Controller()
export class ConsumosController {
  constructor(private svc: ConsumosService) {}

  private async periodoValido(periodo?: string): Promise<string> {
    const p = periodo ?? (await this.svc.periodoActual());
    if (!/^\d{4}-\d{2}-25$/.test(p)) {
      throw new BadRequestException('periodo inválido (usa AAAA-MM-25)');
    }
    return p;
  }

  @Get('periodos')
  periodos() {
    return this.svc.periodos();
  }

  @Get('resumen')
  async resumen(@Query('periodo') periodo?: string) {
    return this.svc.resumen(await this.periodoValido(periodo));
  }

  @Get('diario')
  async diario(@Query('periodo') periodo?: string) {
    return this.svc.diario(await this.periodoValido(periodo));
  }

  @Get('movimientos')
  async movimientos(
    @Query('periodo') periodo?: string,
    @Query('categoria') categoria?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (categoria && categoria !== 'tarjeta' && categoria !== 'efectivo') {
      throw new BadRequestException('categoria debe ser tarjeta o efectivo');
    }
    const lim = Math.min(Math.max(parseInt(limit ?? '50', 10) || 50, 1), 200);
    const off = Math.max(parseInt(offset ?? '0', 10) || 0, 0);
    return this.svc.movimientos(await this.periodoValido(periodo), categoria ?? null, lim, off);
  }
}
