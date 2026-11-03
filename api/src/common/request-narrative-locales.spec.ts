import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateProfessionalVerificationRequestDto } from '../modules/professional-verification-requests/dto/professional-verification-request.dto';
import { CreateProposalDto } from '../modules/offers/dto/offers.dto';
import { UpdatePartnershipApplicationDto } from '../modules/partnership-applications/dto/partnership-application.dto';

describe('additional request narrative locales', () => {
  it.each(['en', 'ar'])('accepts %s-only verification summaries', (locale) => {
    const dto = plainToInstance(UpdateProfessionalVerificationRequestDto, {
      localizedContent: { [locale]: { verificationSummary: 'Original text' } },
    });
    expect(validateSync(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
  });
  it('validates both application answer languages', () => {
    const dto = plainToInstance(UpdatePartnershipApplicationDto, {
      localizedContent: { en: { whyGoodFit: 'Experience' }, ar: { whyGoodFit: 'خبرة' } },
    });
    expect(validateSync(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
  });
  it('accepts proposal translations without changing financial fields', () => {
    const dto = plainToInstance(CreateProposalDto, {
      proposalKind: 'cash',
      components: [{ componentType: 'cash', proposedValue: 100 }],
      localizedContent: { ar: { proposalNotes: 'ملاحظات' }, en: { proposalNotes: 'Notes' } },
    });
    expect(validateSync(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
    expect(dto.components[0]?.proposedValue).toBe(100);
  });
  it('rejects translations beyond the verification summary limit', () => {
    const dto = plainToInstance(UpdateProfessionalVerificationRequestDto, {
      localizedContent: { ar: { verificationSummary: 'x'.repeat(8001) } },
    });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });
});
