import { IsNumber, IsString } from 'class-validator';

export class PayloadTokenDto {
  @IsNumber()
  sub: number;

  @IsString()
  role: string;
}
