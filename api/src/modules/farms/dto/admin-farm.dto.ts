import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean, IsString, Matches } from 'class-validator';
import { CreateFarmDto } from './create-farm.dto';

/** Explicit declared owner, never inferred from the staff actor. */
export class AdminCreateFarmDto extends CreateFarmDto {
  @ApiProperty({ description: 'Existing active owner user ID (decimal string)' })
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  ownerUserId!: string;
}

export class ArchiveFarmDto {
  @ApiProperty({ enum: [true], description: 'Explicit confirmation of conservative soft archive' })
  @IsBoolean()
  @Equals(true)
  confirmed!: true;
}
