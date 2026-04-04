import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateAccountDto } from './dto/update-account.dto';
import * as bcrypt from 'bcrypt';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async getProfile(userId: number) {
    try {
      const user = await this.usersRepo.findOne({
        where: { id: userId },
        select: ['email', 'name', 'id', 'isBanned'],
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch profile for user with id ${userId}`,
        error,
      );
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async updateProfile(
    userId: number,
    updateAccountDto: UpdateAccountDto,
  ): Promise<void> {
    try {
      const user = await this.usersRepo.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      await this.usersRepo.save({ ...user, ...updateAccountDto });
      this.logger.log(`Updated profile for user with id ${userId}`);
      return;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update profile for user with id ${userId}`,
        error,
      );
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async changePassword(
    userId: number,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    try {
      const user = await this.usersRepo.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const isPasswordValid = await bcrypt.compare(
        updatePasswordDto.currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }
      const hashedPassword: string = await bcrypt.hash(
        updatePasswordDto.newPassword,
        10,
      );
      user.password = hashedPassword;
      await this.usersRepo.save(user);
      this.logger.log(`Changed password for user with id ${userId}`);
      return;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to change password for user with id ${userId}`,
        error,
      );
      throw new InternalServerErrorException('Something went wrong');
    }
  }
}
