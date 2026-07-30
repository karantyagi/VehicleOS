export type JsonResponse<TBody = unknown> = {
  status: number;
  body: TBody;
};

export const jsonResponse = <TBody>(status: number, body: TBody): JsonResponse<TBody> => ({
  status,
  body,
});
