import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH } from '../password-policy';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@farmexit.test' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}

export class AdminAuthStaffDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  fullName!: string | null;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ type: [String] })
  permissions!: string[];
}

export class AdminLoginResponseDto {
  @ApiProperty()
  tokenType!: 'Bearer';

  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  accessTokenExpiresInSeconds!: number;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  refreshTokenExpiresAt!: string;

  @ApiProperty({ type: AdminAuthStaffDto })
  staff!: AdminAuthStaffDto;
}

export class AdminMeResponseDto {
  @ApiProperty({ type: AdminAuthStaffDto })
  staff!: AdminAuthStaffDto;
}
