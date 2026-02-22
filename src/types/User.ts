import { z } from 'zod';

export const UserSchema = z
  .object({
    appId: z.string(),
    nickName: z.string(),
    appEmail: z.email(),
  })
  .transform(({ appId, nickName, appEmail }) => ({
    id: appId,
    username: nickName,
    email: appEmail,
  }));

export type User = z.infer<typeof UserSchema>;
