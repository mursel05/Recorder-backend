import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AccountService } from './account.service';
import { User } from './entities/user.entity';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UpdatePasswordDto } from './dto/update-password.dto';

@ApiTags('Account')
@Controller('account')
@UseGuards(AuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('/')
  getProfile(@CurrentUser() user: User) {
    return this.accountService.getProfile(user.id);
  }

  @Put('/')
  @ApiBody({ type: UpdateAccountDto })
  updateProfile(@CurrentUser() user: User, @Body() body: UpdateAccountDto) {
    return this.accountService.updateProfile(user.id, body);
  }

  @Post('/change-password')
  @ApiBody({ type: UpdatePasswordDto })
  changePassword(@CurrentUser() user: User, @Body() body: UpdatePasswordDto) {
    return this.accountService.changePassword(user.id, body);
  }
}
