import { IsNotEmpty, IsString } from 'class-validator';

export class PinLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Passcode PIN is required' })
  pin!: string;
}
