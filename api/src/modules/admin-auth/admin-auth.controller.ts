import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { DashboardAudienceGuard } from './dashboard-audience.guard';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Authenticated } from '../auth/auth-guards.decorators';
import { Client, CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext, ClientContext } from '../auth/auth.types';
import { RefreshTokenDto, TokenPairResponseDto } from '../auth/dto/auth.dto';
import { RateLimit, RateLimitGuard } from '../auth/rate-limit';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto, AdminLoginResponseDto, AdminMeResponseDto } from './dto/admin-auth.dto';

const FIFTEEN_MINUTES = 15 * 60;

@ApiTags('admin-auth')
@UseGuards(RateLimitGuard)
@Controller('admin-auth')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 20, windowSeconds: FIFTEEN_MINUTES })
  @ApiOperation({
    summary: 'Sign in to the admin dashboard with email and password',
    description:
      'Only active staff with admin or super_admin membership and dashboard credentials may sign in. ' +
      'Same generic error for unknown email, wrong password, or insufficient role.',
  })
  @ApiOkResponse({ type: AdminLoginResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid email format' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or not authorized for dashboard access' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit reached' })
  login(@Body() dto: AdminLoginDto, @Client() client: ClientContext): Promise<AdminLoginResponseDto> {
    return this.adminAuth.login(dto.email, dto.password, client);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 60, windowSeconds: FIFTEEN_MINUTES })
  @ApiOperation({ summary: 'Rotate dashboard session refresh token' })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPairResponseDto> {
    return this.adminAuth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(DashboardAudienceGuard)
  @Authenticated()
  @ApiOperation({ summary: 'Revoke the current dashboard session' })
  logout(@CurrentAuth() auth: AuthContext): Promise<void> {
    return this.adminAuth.logout(auth.sessionId);
  }

  @Get('me')
  @UseGuards(DashboardAudienceGuard)
  @Authenticated()
  @ApiOperation({ summary: 'Authenticated dashboard staff identity' })
  @ApiOkResponse({ type: AdminMeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Not signed in or not dashboard staff' })
  me(@CurrentAuth() auth: AuthContext): Promise<AdminMeResponseDto> {
    return this.adminAuth.me(auth.userId);
  }
}
