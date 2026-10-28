import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { StaffRole } from '../../generated/prisma/enums';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { StaffDashboardOnly, StaffRoles } from '../authorization/staff.decorators';
import { AdminCreateFarmDto, ArchiveFarmDto } from './dto/admin-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { FarmResponseDto } from './dto/farm-response.dto';
import { FarmsService } from './farms.service';

@ApiTags('staff-farm-management')
@Controller('staff/admin/farms')
@StaffDashboardOnly()
@StaffRoles(StaffRole.superAdmin)
export class AdminFarmManagementController {
  constructor(private readonly farms: FarmsService) {}
  @Post()
  @ApiOkResponse({ type: FarmResponseDto })
  create(@CurrentAuth() auth: AuthContext, @Body() dto: AdminCreateFarmDto) {
    return this.farms.createByStaff(auth.userId, dto);
  }
  @Get(':id/edit')
  @ApiOkResponse({ type: FarmResponseDto })
  edit(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint) {
    return this.farms.getForStaffEdit(auth.userId, id);
  }
  @Patch(':id')
  @ApiOkResponse({ type: FarmResponseDto })
  update(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint, @Body() dto: UpdateFarmDto) {
    return this.farms.updateByStaff(auth.userId, id, dto);
  }
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint, @Body() dto: ArchiveFarmDto) {
    void dto;
    return this.farms.archiveByStaff(auth.userId, id);
  }
}
