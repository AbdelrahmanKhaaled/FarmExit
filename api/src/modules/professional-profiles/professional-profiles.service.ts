import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ProfessionalCapability, ProfessionalProfile } from '../../generated/prisma/client';
import { VerificationStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateProfessionalCapabilityDto,
  ProfessionalCapabilityResponseDto,
  ProfessionalProfileResponseDto,
  UpdateProfessionalCapabilityDto,
  UpdateProfessionalProfileDto,
} from './dto/professional-profile.dto';

const notFound = (): NotFoundException => new NotFoundException('Professional profile not found');

@Injectable()
export class ProfessionalProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(userId: bigint): Promise<ProfessionalProfileResponseDto> {
    const profile = await this.prisma.professionalProfile.findUnique({ where: { userId } });
    if (!profile) throw notFound();
    return this.present(profile.id);
  }

  async upsertMine(userId: bigint, dto: UpdateProfessionalProfileDto): Promise<ProfessionalProfileResponseDto> {
    const existing = await this.prisma.professionalProfile.findUnique({ where: { userId } });
    if (!existing) {
      await this.prisma.professionalProfile.create({
        data: {
          userId,
          headline: dto.headline ?? null,
          bio: dto.bio ?? null,
          baseGovernorate: dto.baseGovernorate ?? null,
          yearsExperience: dto.yearsExperience ?? null,
          experienceSummary: dto.experienceSummary ?? null,
        },
      });
    } else {
      await this.prisma.professionalProfile.update({
        where: { id: existing.id },
        data: {
          ...(dto.headline !== undefined ? { headline: dto.headline ?? null } : {}),
          ...(dto.bio !== undefined ? { bio: dto.bio ?? null } : {}),
          ...(dto.baseGovernorate !== undefined ? { baseGovernorate: dto.baseGovernorate ?? null } : {}),
          ...(dto.yearsExperience !== undefined ? { yearsExperience: dto.yearsExperience ?? null } : {}),
          ...(dto.experienceSummary !== undefined ? { experienceSummary: dto.experienceSummary ?? null } : {}),
        },
      });
    }
    const profile = await this.prisma.professionalProfile.findUniqueOrThrow({ where: { userId } });
    return this.present(profile.id);
  }

  async addCapability(userId: bigint, dto: CreateProfessionalCapabilityDto): Promise<ProfessionalProfileResponseDto> {
    const profile = await this.ensureProfile(userId);
    try {
      await this.prisma.professionalCapability.create({
        data: {
          professionalProfileId: profile.id,
          professionalType: dto.professionalType,
          verificationStatus: VerificationStatus.verificationRequired,
        },
      });
    } catch (error) {
      if (isUnique(error)) throw new ConflictException('This professional type is already registered on your profile');
      throw error;
    }
    return this.present(profile.id);
  }

  async updateCapability(
    userId: bigint,
    capabilityId: bigint,
    dto: UpdateProfessionalCapabilityDto,
  ): Promise<ProfessionalProfileResponseDto> {
    const profile = await this.ensureProfile(userId);
    const capability = await this.prisma.professionalCapability.findFirst({
      where: { id: capabilityId, professionalProfileId: profile.id },
    });
    if (!capability) throw notFound();
    if (capability.verificationStatus === VerificationStatus.verified) {
      throw new ConflictException('Verified capabilities cannot be edited here');
    }

    if (dto.expertise) {
      await this.prisma.$transaction(async (tx) => {
        await tx.professionalExpertise.deleteMany({ where: { professionalCapabilityId: capabilityId } });
        if (dto.expertise!.length > 0) {
          await tx.professionalExpertise.createMany({
            data: dto.expertise!.map((row) => ({
              professionalCapabilityId: capabilityId,
              expertiseType: row.expertiseType,
              expertiseValue: row.expertiseValue,
            })),
          });
        }
      });
    }
    if (dto.serviceAreas) {
      await this.prisma.$transaction(async (tx) => {
        await tx.professionalServiceArea.deleteMany({ where: { professionalCapabilityId: capabilityId } });
        if (dto.serviceAreas!.length > 0) {
          await tx.professionalServiceArea.createMany({
            data: dto.serviceAreas!.map((governorate) => ({
              professionalCapabilityId: capabilityId,
              governorate,
            })),
          });
        }
      });
    }
    return this.present(profile.id);
  }

  async buildSnapshot(capabilityId: bigint): Promise<Record<string, unknown>> {
    const capability = await this.prisma.professionalCapability.findUnique({
      where: { id: capabilityId },
      include: {
        profile: true,
        expertise: true,
        serviceAreas: true,
      },
    });
    if (!capability) throw notFound();
    return {
      profile: {
        headline: capability.profile.headline,
        bio: capability.profile.bio,
        baseGovernorate: capability.profile.baseGovernorate,
        yearsExperience: capability.profile.yearsExperience,
        experienceSummary: capability.profile.experienceSummary,
      },
      capability: {
        id: capability.id.toString(),
        professionalType: capability.professionalType,
        verificationStatus: capability.verificationStatus,
      },
      expertise: capability.expertise.map((row) => ({
        expertiseType: row.expertiseType,
        expertiseValue: row.expertiseValue,
      })),
      serviceAreas: capability.serviceAreas.map((row) => row.governorate),
    };
  }

  private async ensureProfile(userId: bigint): Promise<ProfessionalProfile> {
    const profile = await this.prisma.professionalProfile.findUnique({ where: { userId } });
    if (!profile) throw notFound();
    return profile;
  }

  private async present(profileId: bigint): Promise<ProfessionalProfileResponseDto> {
    const profile = await this.prisma.professionalProfile.findUniqueOrThrow({
      where: { id: profileId },
      include: {
        capabilities: {
          include: { expertise: true, serviceAreas: true },
          orderBy: { professionalType: 'asc' },
        },
      },
    });
    return {
      id: profile.id.toString(),
      headline: profile.headline,
      bio: profile.bio,
      baseGovernorate: profile.baseGovernorate,
      yearsExperience: profile.yearsExperience,
      experienceSummary: profile.experienceSummary,
      updatedAt: profile.updatedAt?.toISOString() ?? null,
      capabilities: profile.capabilities.map(capabilityToDto),
    };
  }
}

function capabilityToDto(row: ProfessionalCapability & { expertise: { expertiseType: string; expertiseValue: string }[]; serviceAreas: { governorate: string }[] }): ProfessionalCapabilityResponseDto {
  return {
    id: row.id.toString(),
    professionalType: row.professionalType,
    verificationStatus: row.verificationStatus,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    notApprovedReason: row.notApprovedReason,
    expertise: row.expertise.map((e) => ({ expertiseType: e.expertiseType, expertiseValue: e.expertiseValue })),
    serviceAreas: row.serviceAreas.map((a) => a.governorate),
  };
}

function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
