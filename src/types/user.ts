export interface IUser {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  createdAt: string;
}

export interface AuthSession {
  user: IUser | null;
  token?: string;
}
