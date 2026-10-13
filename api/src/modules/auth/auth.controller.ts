import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Authenticated } from './auth-guards.decorators';
import { Client, CurrentAuth } from './auth.decorators';
import { AuthService } from './auth.service';
import type { AuthContext, ClientContext } from './auth.types';
import {
  AuthUserDto,
  CompleteProfileDto,
  MeResponseDto,
  RefreshTokenDto,
  RequestOtpDto,
  RequestOtpResponseDto,
  TokenPairResponseDto,
  UpdateProfileDto,
  VerifyOtpDto,
  VerifyOtpResponseDto,
} from './dto/auth.dto';
import { RateLimit, RateLimitGuard } from './rate-limit';

const FIFTEEN_MINUTES = 15 * 60;

@ApiTags('auth')
@UseGuards(RateLimitGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 20, windowSeconds: FIFTEEN_MINUTES })
  @ApiOperation({
    summary: 'Send a 6-digit sign-in code by SMS',
    description:
      'Same response whether or not the number is registered. The code is never returned by the API. ' +
      'Limits: resend cooldown, hourly cap per number and per-IP rate limit.',
  })
  @ApiOkResponse({ type: RequestOtpResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid mobile number' })
  @ApiTooManyRequestsResponse({ description: 'Cooldown, hourly cap or rate limit reached (see retryAfterSeconds)' })
  requestOtp(@Body() dto: RequestOtpDto): Promise<RequestOtpResponseDto> {
    return this.auth.requestOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 30, windowSeconds: FIFTEEN_MINUTES })
  @ApiOperation({
    summary: 'Verify the code; sign in, or register on first use',
    description:
      'Creates the account on first verification (fullName required then) and starts a session. ' +
      'A code allows a limited number of attempts and works once.',
  })
  @ApiOkResponse({ type: VerifyOtpResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or expired code' })
  @ApiForbiddenResponse({ description: 'Account suspended or blocked' })
  @ApiUnprocessableEntityResponse({ description: 'fullName missing for a new account (the code stays valid)' })
  @ApiTooManyRequestsResponse({ description: 'Too many incorrect attempts or rate limit reached' })
  verifyOtp(@Body() dto: VerifyOtpDto, @Client() client: ClientContext): Promise<VerifyOtpResponseDto> {
    return this.auth.verifyOtp(dto, client);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 60, windowSeconds: FIFTEEN_MINUTES })
  @ApiOperation({
    summary: 'Rotate the refresh token and get a new access token',
    description: 'The presented refresh token is single use. Reusing an old one revokes the session.',
  })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid, expired, revoked or reused refresh token' })
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPairResponseDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Authenticated()
  @ApiOperation({ summary: 'Revoke the current session' })
  @ApiNoContentResponse({ description: 'Session revoked; its access and refresh tokens stop working' })
  logout(@CurrentAuth() auth: AuthContext): Promise<void> {
    return this.auth.logout(auth.sessionId);
  }

  @Get('me')
  @Authenticated()
  @ApiOperation({ summary: 'The signed-in user (profileCompleted tells whether onboarding is done)' })
  @ApiOkResponse({ type: MeResponseDto })
  me(@CurrentAuth() auth: AuthContext): MeResponseDto {
    return this.auth.toAuthUser(auth.user);
  }

  @Post('profile/complete')
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiOperation({
    summary: 'Complete the profile after the first sign-in',
    description: 'Step 3 of phone -> OTP -> profile. Sets the name (and optionally an email). Allowed once.',
  })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiBadRequestResponse({ description: 'Invalid name or email' })
  @ApiConflictResponse({ description: 'Profile already completed, or email already in use' })
  completeProfile(@CurrentAuth() auth: AuthContext, @Body() dto: CompleteProfileDto): Promise<AuthUserDto> {
    return this.auth.completeProfile(auth.userId, dto);
  }

  @Patch('profile')
  @Authenticated()
  @ApiOperation({ summary: 'Update name or email', description: 'Requires a completed profile.' })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiBadRequestResponse({ description: 'Invalid values or nothing to update' })
  @ApiForbiddenResponse({ description: 'Profile not completed yet (code PROFILE_INCOMPLETE)' })
  @ApiConflictResponse({ description: 'Email already in use' })
  updateProfile(@CurrentAuth() auth: AuthContext, @Body() dto: UpdateProfileDto): Promise<AuthUserDto> {
    return this.auth.updateProfile(auth.user, dto);
  }
}
