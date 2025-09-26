import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 150 })
  email!: string;

  @Column({ length: 150 })
  passwordHash!: string;

  // เก็บ refresh token เป็น hash (nullable เพราะตอนยังไม่ login หรือ logout แล้ว)
  @Column({ type: 'text', nullable: true })
  refreshTokenHash!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
