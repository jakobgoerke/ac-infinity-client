import { z } from 'zod';

export const UserSchema = z.object({
  appId: z.string(),
  nickName: z.string(),
  appEmail: z.string().email(),
});
export type User = z.infer<typeof UserSchema>;
