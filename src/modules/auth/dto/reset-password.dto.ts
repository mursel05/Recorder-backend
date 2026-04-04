import { IsNumber, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNumber()
  code: number;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'New password must contain uppercase, lowercase, number and special character',
  })
  newPassword: string;
}
