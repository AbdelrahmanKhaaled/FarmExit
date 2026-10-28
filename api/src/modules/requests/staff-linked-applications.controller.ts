import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { StaffOnly, StaffPermissions } from '../authorization/staff.decorators';
import { StaffPermission } from '../authorization/staff-permissions';
import { LinkedApplicationsQueryDto, LinkedApplicationsResponseDto } from './dto/linked-applications.dto';
import { LinkedRequestApplicationsService } from './linked-request-applications.service';

@ApiTags('staff requests')
@Controller('staff/requests')
@StaffOnly()
@StaffPermissions(StaffPermission.RequestsRead)
export class StaffLinkedApplicationsController {
  constructor(private readonly applications: LinkedRequestApplicationsService) {}

  @Get(':id/applications')
  @ApiOperation({
    summary: 'Submitted partnership applications linked by parent request ID, within caller assignment scope',
  })
  @ApiOkResponse({ type: LinkedApplicationsResponseDto })
  list(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Query() query: LinkedApplicationsQueryDto,
  ) {
    return this.applications.list(auth.userId, id, query);
  }
}
