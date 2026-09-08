import { IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class CreateSaleItemDto {
    @IsString()
    @IsOptional()
    productId?: string;

    @IsString()
    @IsOptional()
    serviceId?: string;

    @IsInt()
    @IsNotEmpty()
    quantity: number;

    @IsNumber()
    @IsNotEmpty()
    price: number;
}

export class CreateSaleDto {
    @IsNumber()
    @IsNotEmpty()
    total: number;

    @IsString()
    @IsOptional()
    clientId?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSaleItemDto)
    items: CreateSaleItemDto[];
}
