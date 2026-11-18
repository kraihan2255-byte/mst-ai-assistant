import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ParseCommandDto {
  @IsString({ message: 'Message must be a string' })
  @IsNotEmpty({ message: 'Message must not be empty' })
  @MaxLength(2000, { message: 'Message cannot exceed 2000 characters' })
  message!: string;
}
