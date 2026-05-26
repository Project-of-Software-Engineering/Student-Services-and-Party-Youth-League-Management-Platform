import { IsArray, IsOptional, IsString, MaxLength } from "class-validator";

export class SubmitProfileChangeRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  honors?: unknown[];

  @IsOptional()
  @IsArray()
  competitions?: unknown[];

  @IsOptional()
  @IsArray()
  practices?: unknown[];
}

export class ReviewProfileChangeRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
