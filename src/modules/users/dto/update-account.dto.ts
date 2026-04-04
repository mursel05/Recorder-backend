import { IsEmail, IsString } from 'class-validator';

export class UpdateAccountDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;
}
