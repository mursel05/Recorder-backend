import { BaseEntity } from 'src/common/entities/base.entity';
import { Entity, Column } from 'typeorm';

@Entity('tokens')
export class Token extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 255 })
  token: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}
