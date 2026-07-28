import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const repositoryRoot = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "knowledge-data",
  "node_modules",
]);

const markdownFiles = [];

const collectMarkdownFiles = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(entryPath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      markdownFiles.push(entryPath);
    }
  }
};

const cleanTarget = (rawTarget) => {
  let target = rawTarget.trim();
  if (target.startsWith("<") && target.endsWith(">")) {
    target = target.slice(1, -1);
  }

  target = target.split("#", 1)[0].split("?", 1)[0];
  return target.replaceAll("\\(", "(").replaceAll("\\)", ")");
};

const isExternalTarget = (target) =>
  target.length === 0 ||
  target.startsWith("#") ||
  target.startsWith("//") ||
  /^[a-z][a-z\d+.-]*:/i.test(target);

const brokenLinks = [];

collectMarkdownFiles(repositoryRoot);

for (const markdownFile of markdownFiles) {
  const lines = readFileSync(markdownFile, "utf8").split(/\r?\n/);
  let fence = null;

  lines.forEach((line, index) => {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      fence = fence === marker ? null : fence ?? marker;
      return;
    }
    if (fence) return;

    const targets = [];
    const inlinePattern = /!?\[[^\]]*]\((<[^>]+>|[^)\s]+)(?:\s+["'(][^)]*)?\)/g;
    const referencePattern = /^\s{0,3}\[[^\]]+]:\s*(<[^>]+>|\S+)/;

    for (const match of line.matchAll(inlinePattern)) {
      targets.push(match[1]);
    }

    const referenceMatch = line.match(referencePattern);
    if (referenceMatch) targets.push(referenceMatch[1]);

    for (const rawTarget of targets) {
      const target = cleanTarget(rawTarget);
      if (isExternalTarget(target)) continue;

      let decodedTarget;
      try {
        decodedTarget = decodeURIComponent(target);
      } catch {
        brokenLinks.push({
          file: markdownFile,
          line: index + 1,
          target,
          reason: "invalid URI encoding",
        });
        continue;
      }

      const candidate = decodedTarget.startsWith("/")
        ? path.resolve(repositoryRoot, decodedTarget.slice(1))
        : path.resolve(path.dirname(markdownFile), decodedTarget);
      const candidateFromRoot = path.relative(repositoryRoot, candidate);

      if (candidateFromRoot.startsWith("..") || path.isAbsolute(candidateFromRoot)) {
        brokenLinks.push({
          file: markdownFile,
          line: index + 1,
          target,
          reason: "target escapes repository",
        });
      } else if (!existsSync(candidate)) {
        brokenLinks.push({
          file: markdownFile,
          line: index + 1,
          target,
          reason: "target does not exist",
        });
      }
    }
  });
}

if (brokenLinks.length > 0) {
  console.error(`Broken local Markdown links: ${brokenLinks.length}`);
  for (const broken of brokenLinks) {
    const relativeFile = path.relative(repositoryRoot, broken.file).replaceAll(path.sep, "/");
    console.error(`- ${relativeFile}:${broken.line} -> ${broken.target} (${broken.reason})`);
  }
  process.exit(1);
}

console.log(`Markdown links valid across ${markdownFiles.length} files.`);
