import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { HomepageCopyDto } from './homepage.controller';

@Injectable()
export class HomepageEditorialService {
  constructor(private readonly prisma: PrismaService) {}
  private locale(value: string) {
    if (!['en', 'ar'].includes(value)) throw new BadRequestException('Unsupported locale');
    return value;
  }
  get(value: string) {
    return this.prisma.homepageContent.findUnique({ where: { locale: this.locale(value) } });
  }
  save(value: string, body: HomepageCopyDto) {
    const locale = this.locale(value);
    const draft = JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue;
    return this.prisma.homepageContent.upsert({ where: { locale }, create: { locale, draft }, update: { draft } });
  }
  async publish(value: string) {
    const locale = this.locale(value);
    const row = await this.prisma.homepageContent.findUnique({ where: { locale } });
    if (!row) throw new BadRequestException('Save a draft first');
    return this.prisma.homepageContent.update({
      where: { locale },
      data: { published: row.draft as Prisma.InputJsonValue, publishedAt: new Date() },
    });
  }
}
