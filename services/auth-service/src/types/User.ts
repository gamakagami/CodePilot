export interface IUser {
  id: string;
  githubId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  githubAccessToken?: string;
  createdAt: Date;
  updatedAt: Date;
}
