import { Body, Controller, Get, Header, Param, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { PrivateLocationResponseDto, UpdatePrivateLocationDto } from './dto/private-location.dto';
import { PrivateLocationService } from './private-location.service';

@ApiTags('farms')
@Controller('farms/:id/private-location')
@RequireCompletedProfile()
export class PrivateLocationController {
  constructor(private readonly locations: PrivateLocationService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Private location: active owner or explicitly authorized FarmExit staff only' })
  @ApiOkResponse({ type: PrivateLocationResponseDto })
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint) {
    return this.locations.get(auth.userId, id);
  }

  @Patch()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Update private coordinates and road fields (active owner only)' })
  @ApiOkResponse({ type: PrivateLocationResponseDto })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: UpdatePrivateLocationDto,
  ) {
    return this.locations.update(auth.userId, id, dto);
  }
}
