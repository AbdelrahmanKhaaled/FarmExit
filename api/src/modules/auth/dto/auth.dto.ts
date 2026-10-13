import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class RequestOtpDto {
  @ApiProperty({
    example: '01012345678',
    description: 'Mobile number. Normalised to E.164; Egypt (+20) is the default country.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  mobile: string;
}

export class RequestOtpResponseDto {
  @ApiProperty({ example: 300, description: 'Seconds until the code expires.' })
  expiresInSeconds: number;

  @ApiProperty({ example: 60, description: 'Seconds to wait before requesting another code.' })
  resendAfterSeconds: number;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '01012345678' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  mobile: string;

  @ApiProperty({ example: '123456', description: '6-digit code sent by SMS.' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code: string;

  @ApiPropertyOptional({ example: 'Pixel 8', description: 'Label for this device/session.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token from the last sign-in or refresh. It is single use.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  refreshToken: string;
}

export class AuthUserDto {
  @ApiProperty({ example: '12', description: 'User id (decimal string).' })
  id: string;

  @ApiProperty({ example: 'Mona Hassan', nullable: true, type: String, description: 'Null until profile completion.' })
  fullName: string | null;

  @ApiProperty({ example: '+201012345678', description: 'The signed-in userâ€™s own number.' })
  mobileE164: string;

  @ApiProperty({ nullable: true, type: String })
  email: string | null;

  @ApiProperty({ example: true })
  mobileVerified: boolean;

  @ApiProperty({
    example: true,
    description: 'False until the user completes their profile (POST /auth/profile/complete).',
  })
  profileCompleted: boolean;
}

export class TokenPairResponseDto {
  @ApiProperty({ example: 'Bearer' })
  tokenType: 'Bearer';

  @ApiProperty({ description: 'Short-lived JWT. Send as `Authorization: Bearer <token>`.' })
  accessToken: string;

  @ApiProperty({ example: 900 })
  accessTokenExpiresInSeconds: number;

  @ApiProperty({ description: 'Opaque, rotating, single-use refresh token.' })
  refreshToken: string;

  @ApiProperty({ example: '2026-11-12T10:00:00.000Z' })
  refreshTokenExpiresAt: string;
}

export class VerifyOtpResponseDto extends TokenPairResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  @ApiProperty({ description: 'True when this verification created the account (next step: complete the profile).' })
  isNewUser: boolean;
}

export class MeResponseDto extends AuthUserDto {}

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CompleteProfileDto {
  @ApiProperty({ example: 'Mona Hassan' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;

  @ApiPropertyOptional({ example: 'mona@example.com' })
  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Mona Hassan' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ example: 'mona@example.com', nullable: true, description: 'Send null to remove the email.' })
  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(255)
  email?: string | null;
}
