import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRoleType } from 'src/modules/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersSeed {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async run() {
    const users = [
      {
        name: 'Admin',
        surname: 'User',
        email: 'mursal.haqverdiyev05@gmail.com',
        password:
          '$2b$10$t9kkVFHQEDK.wzauIPBt3eE9HwIPVdLvz6dU8lPr/PJa9Jsr1AKeW',
        role: UserRoleType.ADMIN,
      },
    ];

    await this.userRepository.save(users);
  }
}
