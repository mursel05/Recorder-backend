import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRoleType } from '../entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  name: string;

  @ApiProperty({ enum: UserRoleType })
  @IsEnum(UserRoleType)
  role: UserRoleType;

  @IsBoolean()
  @IsOptional()
  isBanned: boolean;
}
