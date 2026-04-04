import { BaseEntity } from 'src/common/entities/base.entity';
import { Entity, Column } from 'typeorm';

export enum UserRoleType {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int', nullable: true })
  resetCode: number | null;

  @Column({ type: 'timestamp', nullable: true })
  resetCodeExpiry: Date | null;

  @Column({ type: 'int', default: 0 })
  loginAttempts: number;

  @Column({ type: 'boolean', default: false })
  isBanned: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastLogin: Date;

  @Column({ type: 'enum', enum: UserRoleType, default: UserRoleType.USER })
  role: UserRoleType;
}
