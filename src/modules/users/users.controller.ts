import { Controller, Get, Body, Put, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Roles, UserRole } from 'src/common/decorators/roles.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiBody({ type: UpdateUserDto })
  update(
    @Param('id') id: number,
    @Body()
    body: UpdateUserDto,
  ) {
    return this.usersService.update(id, body);
  }
}
