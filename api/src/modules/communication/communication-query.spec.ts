import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListStaffMessagesQueryDto } from './dto/list-staff-messages-query.dto';

describe('Staff conversation message query', () => {
  it('accepts the real Dashboard pagination and conversation filter', () => {
    const dto = plainToInstance(ListStaffMessagesQueryDto, { page: '1', pageSize: '50', conversationId: '25' });
    expect(validateSync(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
    expect(dto).toMatchObject({ page: 1, pageSize: 50, conversationId: '25' });
  });

  it.each(['0', '-1', 'abc', '', '12345678901234567890'])(
    'rejects invalid conversation id %s before BigInt parsing',
    (conversationId) => {
      const dto = plainToInstance(ListStaffMessagesQueryDto, { conversationId });
      expect(validateSync(dto)).not.toHaveLength(0);
    },
  );

  it('continues rejecting unknown query fields', () => {
    const dto = plainToInstance(ListStaffMessagesQueryDto, { targetUserId: '99' });
    expect(validateSync(dto, { whitelist: true, forbidNonWhitelisted: true })).not.toHaveLength(0);
  });
});
