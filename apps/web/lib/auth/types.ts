export type SessionUser = {
  id: string;
  email: string | null;
};

const DEV_USER_ID = "00000000-0000-4000-8000-000000000001";

export const getDevUser = (): SessionUser => ({
  id: DEV_USER_ID,
  email: "dev@vehicleos.local",
});
