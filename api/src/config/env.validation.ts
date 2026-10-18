import 'reflect-metadata';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import { assertDevFixedOtpEnvironment } from '../modules/auth/dev-fixed-otp';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export enum SmsProviderName {
  Development = 'development',
}

export enum StorageProviderName {
  Local = 'local',
}

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

const toList = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    : value;

/** Every variable the API reads. Validated once at startup; the process exits on an invalid value. */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 4000;

  @IsString()
  @Matches(/^mysql:\/\/.+/, { message: 'DATABASE_URL must be a mysql:// connection URL' })
  DATABASE_URL: string;

  /** HMAC secret for access tokens (JWT HS256). No default: generate with `openssl rand -base64 48`. */
  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
  JWT_ACCESS_SECRET: string;

  /** HMAC secret (pepper) for OTP code hashes. Separate from the JWT secret. */
  @IsString()
  @MinLength(32, { message: 'OTP_HASH_SECRET must be at least 32 characters' })
  OTP_HASH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_ISSUER = 'farmexit-api';

  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(3600)
  ACCESS_TOKEN_TTL_SECONDS = 900;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  REFRESH_TOKEN_TTL_DAYS = 30;

  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(900)
  OTP_TTL_SECONDS = 300;

  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(600)
  OTP_RESEND_COOLDOWN_SECONDS = 60;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  OTP_MAX_ATTEMPTS = 5;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  OTP_MAX_REQUESTS_PER_HOUR = 5;

  /** SMS delivery adapter. `development` only logs the code outside production and is refused in production. */
  @IsEnum(SmsProviderName)
  SMS_PROVIDER: SmsProviderName = SmsProviderName.Development;

  /** Private object storage for uploaded images. local (dev/test only) is refused in production. */
  @IsEnum(StorageProviderName)
  MEDIA_STORAGE_PROVIDER: StorageProviderName = StorageProviderName.Local;

  /** Root directory of the local adapter (never served statically). */
  @IsString()
  @IsNotEmpty()
  MEDIA_STORAGE_DIR = './storage/uploads';

  /** Maximum size of one uploaded image in bytes (default 5 MB, hard cap 10 MB). */
  @Type(() => Number)
  @IsInt()
  @Min(1024)
  @Max(10_485_760)
  MEDIA_MAX_IMAGE_BYTES = 5_242_880;

  @Transform(toList)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  CORS_ORIGINS: string[] = ['http://localhost:3000', 'http://localhost:3002'];

  /** Development-only fixed OTP for allowlisted mobiles (never in production). */
  @Transform(toBoolean)
  @IsBoolean()
  DEV_FIXED_OTP_ENABLED = false;

  @IsOptional()
  @IsString()
  DEV_FIXED_OTP_CODE = '';

  @Transform(toList)
  @IsString({ each: true })
  DEV_FIXED_OTP_ALLOWED_MOBILES: string[] = [];

  /** Swagger UI. Unset: enabled outside production, disabled in production. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  SWAGGER_ENABLED?: boolean;
}

export type Env = Required<EnvironmentVariables>;

export function validateEnv(config: Record<string, unknown>): Env {
  const env = plainToInstance(EnvironmentVariables, config, { excludeExtraneousValues: false });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors.map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  if (env.JWT_ACCESS_SECRET === env.OTP_HASH_SECRET) {
    throw new Error(
      'Invalid environment configuration:\n  - OTP_HASH_SECRET: must be different from JWT_ACCESS_SECRET',
    );
  }
  assertDevFixedOtpEnvironment(env);
  return { ...env, SWAGGER_ENABLED: env.SWAGGER_ENABLED ?? env.NODE_ENV !== NodeEnv.Production };
}
