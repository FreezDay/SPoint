import { IsNotEmpty, IsString, IsNumber, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateProductDto {
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

    @IsInt()
    @IsNotEmpty()
    stock: number;

    @IsString()
    @IsOptional()
    sku?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;
}
