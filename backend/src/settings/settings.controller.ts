import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    async getAll() {
        return this.settingsService.getAll();
    }

    @Get(':key')
    async getOne(@Param('key') key: string) {
        return this.settingsService.getOne(key);
    }

    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    @Patch(':key')
    async update(@Param('key') key: string, @Body('value') value: any) {
        return this.settingsService.update(key, value);
    }
}
