import { beforeEach, describe, expect, it, vi } from "vitest";

const researchAdmin = vi.hoisted(() => ({
  from: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../supabase/admin", () => ({
  createAdminClient: () => ({
    from: researchAdmin.from,
    storage: {
      from: () => ({ remove: researchAdmin.remove }),
    },
  }),
}));

import { deleteResearchParticipantData } from "./repository.js";

describe("deleteResearchParticipantData", () => {
  beforeEach(() => {
    researchAdmin.from.mockReset();
    researchAdmin.remove.mockReset();
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
});
