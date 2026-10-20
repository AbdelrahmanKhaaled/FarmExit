import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { trim } from './create-farm.dto';

/** Owner-entered private location. Omission preserves; null clears. Coordinates must be supplied together. */
export class UpdatePrivateLocationDto {
  @ApiPropertyOptional({ type: Number, nullable: true, minimum: -90, maximum: 90 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 8 })
  @Min(-90)
  @Max(90)
  privatePinLatitude?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: -180, maximum: 180 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 8 })
  @Min(-180)
  @Max(180)
  privatePinLongitude?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nearestMainRoad?: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0,
    description: 'Owner-stated distance in kilometres.',
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  roadDistanceKm?: number | null;
}

export class PrivateLocationResponseDto {
  @ApiProperty() farmId: string;
  @ApiProperty({ type: Number, nullable: true }) privatePinLatitude: number | null;
  @ApiProperty({ type: Number, nullable: true }) privatePinLongitude: number | null;
  @ApiProperty({ type: String, nullable: true }) nearestMainRoad: string | null;
  @ApiProperty({ type: Number, nullable: true }) roadDistanceKm: number | null;
}
