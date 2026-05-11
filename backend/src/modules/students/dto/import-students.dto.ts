import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from "class-validator";
import { ImportStudentRowDto } from "./import-student-row.dto";

export class ImportStudentsDto {
  @IsString()
  @IsOptional()
  sourceFileName?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportStudentRowDto)
  rows!: ImportStudentRowDto[];
}
