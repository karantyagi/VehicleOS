import { beforeEach, describe, expect, it, vi } from "vitest";

const researchAdmin = vi.hoisted(() => ({
  from: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock("../supabase/admin", () => ({
  createAdminClient: () => ({
    from: researchAdmin.from,
    storage: {
      from: () => ({ remove: researchAdmin.remove, createSignedUrl: researchAdmin.createSignedUrl }),
    },
  }),
}));

import { deleteResearchParticipantData, getResearchParticipantPdfUrl } from "./repository.js";

describe("deleteResearchParticipantData", () => {
  beforeEach(() => {
    researchAdmin.from.mockReset();
    researchAdmin.remove.mockReset();
    researchAdmin.createSignedUrl.mockReset();
  });

  it("removes every stored PDF before deleting the participant's research runs", async () => {
    const select = vi.fn(() => ({
      eq: vi.fn(async () => ({ data: [{ storage_key: "user-1/one.pdf" }, { storage_key: "user-1/two.pdf" }], error: null })),
    }));
    const remove = researchAdmin.remove.mockResolvedValue({ error: null });
    const deleteRuns = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
    researchAdmin.from.mockImplementationOnce(() => ({ select }));
    researchAdmin.from.mockImplementationOnce(() => ({ delete: deleteRuns }));

    await deleteResearchParticipantData("user-1");

    expect(remove).toHaveBeenCalledWith(["user-1/one.pdf", "user-1/two.pdf"]);
    expect(deleteRuns).toHaveBeenCalledOnce();
  });

  it("signs only the requesting participant's original PDF", async () => {
    const maybeSingle = vi.fn(async () => ({ data: { storage_key: "user-1/carfax.pdf" }, error: null }));
    const byUser = vi.fn(() => ({ maybeSingle }));
    const byRun = vi.fn(() => ({ eq: byUser }));
    const select = vi.fn(() => ({ eq: byRun }));
    researchAdmin.from.mockReturnValue({ select });
    researchAdmin.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://storage.example/signed" }, error: null });

    await expect(getResearchParticipantPdfUrl({ id: "run-1", userId: "user-1" })).resolves.toBe("https://storage.example/signed");

    expect(byRun).toHaveBeenCalledWith("id", "run-1");
    expect(byUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(researchAdmin.createSignedUrl).toHaveBeenCalledWith("user-1/carfax.pdf", 300);
  });
});
