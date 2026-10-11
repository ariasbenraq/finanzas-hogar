import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller.js';
import { InfraModule } from './infra.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [ConfigModule.forRoot(), InfraModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
