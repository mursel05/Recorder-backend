import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';
import { UsersSeed } from './users.seed';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedModule);
  const seedService = app.get(UsersSeed);
  await seedService.run();
  await app.close();
}

void bootstrap();
