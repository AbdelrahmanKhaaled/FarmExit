import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { RequestStaffAssignmentType } from '../../../generated/prisma/enums';

export class AssignRequestStaffDto {
  @ApiProperty({
    enum: RequestStaffAssignmentType,
    example: RequestStaffAssignmentType.reviewer,
    description: 'Staff role slot: reviewer or caseAgent',
  })
  @IsNotEmpty()
  @IsEnum(RequestStaffAssignmentType)
  assignmentType!: RequestStaffAssignmentType;

  @ApiProperty({
    example: '2',
    description: 'User ID of the staff member to assign (must have an active membership for that role)',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+$/, { message: 'assignedStaffId must be a numeric ID string' })
  assignedStaffId!: string;
}
