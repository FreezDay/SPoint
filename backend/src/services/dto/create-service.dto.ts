import { IsNotEmpty, IsString, IsNumber, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class CreateServiceDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    name_en?: string;

    @IsString()
    @IsOptional()
    name_pt?: string;

    @IsString()
    @IsOptional()
    name_uk?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    description_en?: string;

    @IsString()
    @IsOptional()
    description_pt?: string;

    @IsString()
    @IsOptional()
    description_uk?: string;

    @IsNumber()
    @IsNotEmpty()
    price: number;

    @IsNumber()
    @IsNotEmpty()
    duration: number;

    @IsUUID()
    @IsOptional()
    categoryId?: string;

    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;
}
