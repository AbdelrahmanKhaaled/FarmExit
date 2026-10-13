import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

const MAX_BIGINT = 9223372036854775807n;

/**
 * Route `:id` parameters are positive BIGINT ids sent as decimal strings. Anything else (letters, 0, negatives,
 * decimals, hex, whitespace, leading zeros, values above the BIGINT range) is a 400, never a server error.
 */
@Injectable()
export class ParseBigIntIdPipe implements PipeTransform<unknown, bigint> {
  transform(value: unknown): bigint {
    if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value)) throw new BadRequestException('Invalid id');
    const id = BigInt(value);
    if (id > MAX_BIGINT) throw new BadRequestException('Invalid id');
    return id;
  }
}
