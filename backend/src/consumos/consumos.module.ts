import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ConsumosController } from './consumos.controller.js';
import { ConsumosService } from './consumos.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ConsumosController],
  providers: [ConsumosService],
})
export class ConsumosModule {}
