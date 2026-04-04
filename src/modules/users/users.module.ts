import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, AccountService],
  controllers: [UsersController, AccountController],
  exports: [UsersService],
})
export class UsersModule {}
