import { ApiProperty } from '@nestjs/swagger';

export class StaffMeResponseDto {
  @ApiProperty({ example: '12', description: 'User id (decimal string).' })
  id: string;

  @ApiProperty({ example: 'Mona Hassan', nullable: true, type: String })
  fullName: string | null;

  @ApiProperty({ example: ['reviewer'], description: 'Active FarmExit staff roles: admin, caseAgent, reviewer.' })
  roles: string[];

  @ApiProperty({
    example: ['evaluations.manage', 'requests.read', 'requests.review'],
    description: 'Permissions granted by those roles (server-side matrix).',
  })
  permissions: string[];
}
