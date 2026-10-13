import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { StaffMeResponseDto } from './dto/staff-me-response.dto';
import { CurrentStaff, StaffOnly } from './staff.decorators';
import type { StaffContext } from './staff.types';

/** Read-only. Staff memberships are never created or changed through the API (no self-promotion). */
@ApiTags('staff')
@Controller('staff')
export class StaffController {
  @Get('me')
  @StaffOnly()
  @ApiOperation({
    summary: 'Current FarmExit staff identity and permissions',
    description: '401 when not signed in, 403 when not active FarmExit staff or the profile is incomplete.',
  })
  @ApiOkResponse({ type: StaffMeResponseDto })
  me(@CurrentAuth() auth: AuthContext, @CurrentStaff() staff: StaffContext): StaffMeResponseDto {
    return {
      id: auth.userId.toString(),
      fullName: auth.user.fullName,
      roles: staff.roles,
      permissions: staff.permissions,
    };
  }
}
