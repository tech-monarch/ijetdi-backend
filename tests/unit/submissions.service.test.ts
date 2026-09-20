import { describe, expect, it, vi, beforeEach } from "vitest";

const { prisma, uploadToR2, sendEmail, createArticle } = vi.hoisted(() => ({
  prisma: {
    publication: { findUnique: vi.fn() },
    author: { findFirst: vi.fn(), create: vi.fn() },
    article: { findUnique: vi.fn() },
  },
  uploadToR2: vi.fn(),
  sendEmail: vi.fn(),
  createArticle: vi.fn(),
}));
vi.mock("../../src/config/db.js", () => ({ prisma }));
vi.mock("../../src/config/r2.js", () => ({ uploadToR2 }));
vi.mock("../../src/lib/email/sendEmail.js", () => ({ sendEmail }));
vi.mock("../../src/modules/articles/articles.service.js", () => ({ createArticle }));

const { createSubmission } = await import("../../src/modules/submissions/submissions.service.js");

// A real minimal PDF (magic bytes + structure), same construction as the
// Document Import Pipeline's own fixtures — detectImportFileKind does
// real magic-byte detection, so a fake buffer wouldn't pass it.
const REAL_PDF_BUFFER = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
  "ascii",
);

function baseParams(overrides: Partial<Parameters<typeof createSubmission>[0]["data"]> = {}) {
  return {
    data: {
      title: "A Study of Something",
      abstract: "This is the abstract.",
      articleType: "Research Article",
      area: undefined,
      publicationId: "pub-1",
      correspondingAuthor: { name: "Jane Doe", email: "jane@example.com", institution: "Some University" },
      additionalAuthors: [],
      ...overrides,
    },
    manuscript: { buffer: REAL_PDF_BUFFER, mimetype: "application/pdf", originalFilename: "manuscript.pdf" },
  };
}

describe("createSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.publication.findUnique.mockResolvedValue({ id: "pub-1", name: "IJETDI" });
    prisma.author.findFirst.mockResolvedValue(null);
    prisma.author.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: `author-${data.email ?? data.fullName}`, ...data }),
    );
    prisma.article.findUnique.mockResolvedValue(null); // slug never collides
    uploadToR2.mockResolvedValue({ key: "manuscript-submissions/x.pdf", url: "https://r2.example/x.pdf" });
    createArticle.mockResolvedValue({ id: "article-1", title: "A Study of Something" });
  });

  it("rejects a submission for a publication that doesn't exist", async () => {
    prisma.publication.findUnique.mockResolvedValue(null);
    await expect(createSubmission(baseParams())).rejects.toMatchObject({ code: "PUBLICATION_NOT_FOUND" });
    expect(uploadToR2).not.toHaveBeenCalled();
  });

  it("rejects a manuscript that isn't a real PDF/DOCX by magic bytes", async () => {
    const params = baseParams();
    params.manuscript.buffer = Buffer.from("just some plain text, not a real document", "ascii");
    await expect(createSubmission(params)).rejects.toMatchObject({ code: "UNSUPPORTED_FILE_TYPE" });
    expect(uploadToR2).not.toHaveBeenCalled();
  });

  it("uploads the manuscript, creates the article as 'submitted', and orders authors correctly", async () => {
    await createSubmission(
      baseParams({
        additionalAuthors: [{ name: "Second Author", email: "second@example.com" }],
      }),
    );

    expect(uploadToR2).toHaveBeenCalledWith(
      expect.objectContaining({ folder: "manuscript-submissions" }),
    );
    expect(createArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "submitted",
        pdfUrl: "https://r2.example/x.pdf",
        authorIds: ["author-jane@example.com", "author-second@example.com"],
      }),
    );
  });

  it("reuses an existing Author record when the corresponding author's email already exists", async () => {
    prisma.author.findFirst.mockResolvedValueOnce({ id: "existing-author-id" });
    await createSubmission(baseParams());

    expect(prisma.author.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "jane@example.com" }) }),
    );
  });

  it("sends a confirmation email to the corresponding author when they gave one", async () => {
    await createSubmission(baseParams());
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jane@example.com", template: "submission-received" }),
    );
  });

  it("never lets an email-sending failure fail the submission itself", async () => {
    sendEmail.mockRejectedValue(new Error("Resend is down"));
    const result = await createSubmission(baseParams());
    expect(result).toEqual({ received: true, title: "A Study of Something" });
  });

  it("returns a minimal, non-sensitive response — not the full admin article shape", async () => {
    const result = await createSubmission(baseParams());
    expect(result).toEqual({ received: true, title: "A Study of Something" });
    expect(result).not.toHaveProperty("id");
  });
});
