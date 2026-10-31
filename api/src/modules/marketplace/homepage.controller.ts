import { Body, Controller, Get, Param, Put, Post } from '@nestjs/common';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  Equals,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StaffRole } from '../../generated/prisma/enums';
import { StaffDashboardOnly, StaffRoles } from '../authorization/staff.decorators';
import { HomepageEditorialService } from './homepage-editorial.service';
import { HomepageService } from './homepage.service';
class TestimonialDto {
  @IsString() @MaxLength(200) author: string;
  @IsString() @MaxLength(1500) quote: string;
  @IsBoolean() @Equals(true) authorized: boolean;
}
export class HomepageCopyDto {
  @IsOptional() @IsString() @MaxLength(500) heroHeadline?: string;
  @IsOptional() @IsString() @MaxLength(1000) heroSubhead?: string;
  @IsOptional() @IsString() @MaxLength(500) aboutStatement?: string;
  @IsOptional() @IsString() @MaxLength(5000) aboutLead?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => TestimonialDto)
  testimonials?: TestimonialDto[];
}
@Controller('marketplace')
export class HomepageController {
  constructor(private readonly home: HomepageService) {}
  @Get('home/:locale') get(@Param('locale') locale: string) {
    return this.home.get(locale);
  }
}
@Controller('staff/admin/homepage')
@StaffDashboardOnly()
@StaffRoles(StaffRole.superAdmin)
export class HomepageAdminController {
  constructor(private readonly editorial: HomepageEditorialService) {}
  @Get(':locale') get(@Param('locale') locale: string) {
    return this.editorial.get(locale);
  }
  @Put(':locale/draft') save(@Param('locale') locale: string, @Body() body: HomepageCopyDto) {
    return this.editorial.save(locale, body);
  }
  @Post(':locale/publish') publish(@Param('locale') locale: string) {
    return this.editorial.publish(locale);
  }
}
