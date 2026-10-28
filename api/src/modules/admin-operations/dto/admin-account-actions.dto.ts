import { Transform } from 'class-transformer';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePlatformUserStatusDto {
  @IsIn(['active', 'suspended'])
  accountStatus!: 'active' | 'suspended';
}

export class CreateDashboardStaffDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(2)
  @MaxLength(150)
  fullName!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MaxLength(30)
  mobile!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(['admin', 'reviewer', 'caseAgent'], { each: true })
  roles!: ('admin' | 'reviewer' | 'caseAgent')[];
}
