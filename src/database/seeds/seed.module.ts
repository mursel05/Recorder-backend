import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersSeed } from './users.seed';
import { User } from 'src/modules/users/entities/user.entity';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([User])],
  providers: [UsersSeed],
})
export class SeedModule {}
