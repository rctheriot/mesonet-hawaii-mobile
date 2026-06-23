# Manual

User-facing documentation for the Hawaiʻi Mesonet app, written for a general (non-technical) audience.

## Files

- `Hawaii-Mesonet-User-Guide-v<version>.md` — the step-by-step "how to use" guide.

## Versioning convention

**The guide version tracks the app version** (`version` in the project's `package.json`).

When the app's features change in a way that affects how people use it:

1. Update the guide content.
2. Bump the version in **three places** so they stay in sync:
   - the **filename** (`...-v0.2.1.md` → `...-v0.2.2.md`),
   - the **header block** at the top of the guide,
   - the **footer line** at the bottom of the guide.
3. Keep the filename matching `package.json`'s `version` whenever the guide is meaningfully revised.

Current app version: **0.2.1**

> Tip: Only bump for changes that affect the *user experience* (new buttons, moved features, renamed tabs). Pure bug fixes that don't change how the app is used don't require a new guide.

## Image placeholders

The guide contains numbered figure placeholders marked like this:

> **📷 FIGURE 1 — [title]**
> *Suggested image: [what to capture]*

Replace each one with a real screenshot when producing the final document. The figures are numbered in reading order so they're easy to track.

## Converting to Word / PDF

The guide is plain Markdown so it converts cleanly. The easiest path:

**Using Pandoc (recommended):**

```bash
# Markdown → Word
pandoc Hawaii-Mesonet-User-Guide-v0.2.1.md -o Hawaii-Mesonet-User-Guide-v0.2.1.docx

# Markdown → PDF (requires a LaTeX engine, or use the Word file below)
pandoc Hawaii-Mesonet-User-Guide-v0.2.1.md -o Hawaii-Mesonet-User-Guide-v0.2.1.pdf
```

**Without Pandoc:**

1. Open the `.md` file in any Markdown editor (Typora, VS Code preview, Obsidian, or paste into a Markdown-aware tool).
2. Copy the rendered output into Microsoft Word.
3. Insert the real screenshots where the figure placeholders are.
4. Use **File → Export → PDF** in Word.

The table of contents uses standard Markdown anchor links, which Pandoc preserves automatically. In Word you can also insert a live Table of Contents from the headings (References → Table of Contents).
