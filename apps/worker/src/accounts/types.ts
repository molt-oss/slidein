export interface Account {
  id: string;
  name: string;
  igAccountId: string;
  igUsername: string | null;
  metaAccessToken: string;
  metaAppSecret: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  name: string;
  igAccountId: string;
  igUsername?: string | null;
  metaAccessToken: string;
  metaAppSecret: string;
  enabled?: boolean;
}

export interface UpdateAccountInput {
  name?: string;
  igAccountId?: string;
  igUsername?: string | null;
  metaAccessToken?: string;
  metaAppSecret?: string;
  enabled?: boolean;
}

export interface AccountCredentials {
  accountId: string;
  igAccountId: string;
  accessToken: string;
  appSecret: string;
}
