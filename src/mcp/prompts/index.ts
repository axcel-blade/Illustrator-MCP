import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const user = (text: string) => ({ messages: [{ role: "user" as const, content: { type: "text" as const, text } }] });

/** Rules every template ends with: verify, don't claim, save, export. */
const RULES = `
Validation and delivery (always):
- Check every tool result: "source" must be "illustrator", and verification.missing / warnings must be empty or explained (missing fonts name the fallback used).
- For large designs or batch exports pass background: true and collect the result with wait_for_job.
- Judge visual quality ONLY from a preview image a tool returned (generate_export_preview or a design tool's preview). Never claim how something looks otherwise.
- Save the editable source with save_file (.ai) inside an allowed directory; ask before overwriting an existing file.
- Report exactly which files were written, with paths, and anything that could not be done.`;

const optional = (label: string, v: string | undefined) => (v ? `\n${label}: ${v}` : "");

interface Template {
  name: string;
  title: string;
  description: string;
  args: Record<string, { required: boolean; describe: string }>;
  body: (a: Record<string, string | undefined>) => string;
}

const TEMPLATES: Template[] = [
  {
    name: "design_from_brief",
    title: "Design from brief",
    description: "Plan, execute, inspect and iterate a design from a natural-language brief.",
    args: { brief: { required: true, describe: "What to design" }, iterations: { required: false, describe: "Max revision rounds (default 2)" } },
    body: ({ brief, iterations }) => `Design brief: ${brief}

1. Plan: call plan_design with the brief. Review hierarchy, palette and typography; adjust if the brief demands it.
2. Execute: execute_design_plan with the planId.
3. Critique: critique_design, keeping visual judgements (from the preview) separate from verifiedAnalysis.
4. Iterate: targeted revise_design (by element name) or improve_design, up to ${iterations ?? "2"} rounds.
5. Export with export_multiple_formats if requested.`,
  },
  {
    name: "critique_active_document",
    title: "Critique active document",
    description: "Structured critique of the open Illustrator document using design principles.",
    args: { goals: { required: false, describe: "What the design should achieve" } },
    body: ({ goals }) => `Critique the active Illustrator document${goals ? ` against these goals: ${goals}` : ""}.
Call critique_design. Report (a) verified findings from document properties and (b) your visual assessment of the attached preview, clearly labelled, covering alignment, contrast, balance, hierarchy, proximity, repetition, negative space, typography and color. Then propose specific revise_design or improve_design calls. Do not change anything unless asked.`,
  },
  {
    name: "brand_identity_kit",
    title: "Brand identity kit",
    description: "Logo, palette board, business card and social graphic for one brand.",
    args: { brand: { required: true, describe: "Brand name" }, description: { required: true, describe: "What the brand does" }, style: { required: false, describe: "Visual style" } },
    body: ({ brand, description, style }) => `Create a brand identity kit for "${brand}" (${description})${style ? ` in a ${style} style` : ""}.
Use the same baseColor and style for every piece: create_logo, create_brand_identity, create_business_card, create_social_media_graphic (copy.brand = "${brand}"). Save each as .ai and summarise the files produced.`,
  },
  {
    name: "create_professional_logo",
    title: "Create a professional logo",
    description: "Concept, build and export a logo with variations as editable vectors.",
    args: { brand: { required: true, describe: "Brand name" }, description: { required: true, describe: "Industry, audience, personality" }, style: { required: false, describe: "Visual style" }, colors: { required: false, describe: "Preferred colors (hex)" } },
    body: ({ brand, description, style, colors }) => `Create a professional logo for "${brand}": ${description}.${optional("Style", style)}${optional("Colors", colors)}

1. Understand the brand: audience, personality (3 adjectives), competitors to avoid resembling.
2. Concept: describe 2-3 distinct marks (symbol, wordmark, monogram) and pick one with a reason.
3. Palette and type: search_design_knowledge / recommend_design_system for palette and font pairing; confirm fonts with inspect_fonts { check: [...] }.
4. Build: create_logo (or plan_design + execute_design_plan for a custom mark). Use pathfinder / create_compound_path for symbol geometry so it stays editable.
5. Variations on separate artboards: primary, reversed (dark background), mono, icon-only.
6. Organise: name layers semantically (rename_layers_semantically).
7. Export: export_svg and export_png (transparent) per artboard; convert_text_to_outlines on a copy only if the user wants outlined artwork.${RULES}`,
  },
  {
    name: "corporate_brand_identity",
    title: "Design a corporate brand identity",
    description: "Full corporate identity system: logo, palette, typography, stationery and applications.",
    args: { company: { required: true, describe: "Company name" }, description: { required: true, describe: "What the company does and for whom" }, style: { required: false, describe: "Visual style" } },
    body: ({ company, description, style }) => `Design a corporate brand identity for "${company}": ${description}.${optional("Style", style)}

1. Strategy: positioning statement, 3 brand values, tone of voice in one sentence each.
2. Design system: recommend_design_system, then save_design_system so every piece shares the same tokens.
3. Logo: follow the create_professional_logo steps (primary, reversed, mono, icon).
4. Identity board: create_brand_identity with the same palette and fonts.
5. Stationery: create_business_card (front/back); letterhead via plan_design (A4).
6. Applications: create_social_media_graphic and one create_app_screen or create_landing_page if the company is digital.
7. Keep colors and fonts identical across files (apply_design_system).${RULES}`,
  },
  {
    name: "brand_guidelines_document",
    title: "Create a brand guidelines document",
    description: "Multi-page brand guidelines/manual as editable Illustrator pages.",
    args: { brand: { required: true, describe: "Brand name" }, palette: { required: false, describe: "Brand colors (hex, with names)" }, fonts: { required: false, describe: "Brand fonts" } },
    body: ({ brand, palette, fonts }) => `Create a brand guidelines document for "${brand}".${optional("Palette", palette)}${optional("Fonts", fonts)}

Pages (one plan per page, same size, e.g. 1200x1500 px, run each with background: true):
1. Cover: logo, title "Brand Guidelines", version and date.
2. Logo: primary, reversed, mono; clear space (= mark height) and minimum size.
3. Logo misuse: stretch, recolor, rotate, effects; each clearly marked.
4. Color: swatches with name, HEX, RGB and CMYK; usage ratios.
5. Typography: primary and secondary fonts, type scale, line height.
6. Voice and values.
7. Applications: business card, app UI, social post.
Check fonts first with inspect_fonts { check }. Keep text on a layer above graphics (reorder_layers) and verify each page with generate_export_preview before saving.
Save each page as <Brand>_Guidelines_NN_<Section>.ai and export a PDF per page.${RULES}`,
  },
  {
    name: "business_card",
    title: "Design a business card",
    description: "Print-ready business card front and back.",
    args: { name: { required: true, describe: "Person's name" }, role: { required: true, describe: "Job title" }, company: { required: true, describe: "Company" }, contact: { required: false, describe: "Email, phone, web" }, style: { required: false, describe: "Visual style" } },
    body: ({ name, role, company, contact, style }) => `Design a business card for ${name}, ${role} at ${company}.${optional("Contact", contact)}${optional("Style", style)}

1. Size: 85x55 mm (EU) or 3.5x2 in (US); ask if unknown. CMYK document.
2. create_business_card with front and back; keep text at least 3 mm inside the trim and 7 pt or larger.
3. Check contrast and font availability (analyze_typography, inspect_fonts { check }).
4. Export: export_pdf for print; mention bleed and crop marks must be added at print time if the PDF tool cannot add them.${RULES}`,
  },
  {
    name: "professional_poster",
    title: "Create a professional poster",
    description: "Poster with clear hierarchy, grid and print-ready export.",
    args: { topic: { required: true, describe: "Event or message" }, details: { required: false, describe: "Date, place, copy" }, size: { required: false, describe: "e.g. A3, 18x24 in" }, style: { required: false, describe: "Visual style" } },
    body: ({ topic, details, size, style }) => `Create a professional poster: ${topic}.${optional("Details", details)}${optional("Size", size)}${optional("Style", style)}

1. Hierarchy: one headline, one key visual, supporting details; decide reading order.
2. Grid: create_layout_guides (columns, margins); align everything to it.
3. Build: create_poster (or plan_design + execute_design_plan, background: true for complex art).
4. Review: analyze_composition and critique_design; fix with revise_design.
5. Export: export_pdf (print) and export_png (screen).${RULES}`,
  },
  {
    name: "vector_illustration",
    title: "Create a vector illustration",
    description: "Editable vector illustration built from shapes and paths.",
    args: { subject: { required: true, describe: "What to illustrate" }, style: { required: false, describe: "flat, isometric, line art, ..." }, size: { required: false, describe: "Canvas size" } },
    body: ({ subject, style, size }) => `Create a vector illustration of ${subject}.${optional("Style", style)}${optional("Size", size)}

1. Composition sketch in words: background, midground, foreground, focal point.
2. Palette: 4-6 colors (create_color_palette).
3. Build back to front on separate layers (Background, Midground, Foreground, Details) with create_vector_illustration or draw_* / draw_pen_path; combine shapes with pathfinder; use set_gradient for depth.
4. Group related parts and name them; no stray points (simplify_path where paths are noisy).
5. Export SVG and PNG.${RULES}`,
  },
  {
    name: "character_illustration",
    title: "Create a character illustration",
    description: "Vector character with consistent proportions and named parts.",
    args: { character: { required: true, describe: "Who/what the character is" }, style: { required: false, describe: "cartoon, flat, chibi, ..." }, poses: { required: false, describe: "Poses or expressions" } },
    body: ({ character, style, poses }) => `Create a character illustration: ${character}.${optional("Style", style)}${optional("Poses/expressions", poses)}

1. Define proportions (head-to-body ratio), silhouette and 4-5 color palette.
2. Build parts as separate named groups (Head, Hair, Face, Torso, Arms, Legs, Accessories) on layers, using draw_ellipse / draw_pen_path / pathfinder.
3. Faces: keep features on their own sublayer so expressions can be swapped.
4. Extra poses or expressions on new artboards (duplicate_artboard, then edit).
5. Export SVG per artboard and a PNG sheet.${RULES}`,
  },
  {
    name: "product_packaging",
    title: "Design product packaging",
    description: "Packaging artwork on a dieline with print production checks.",
    args: { product: { required: true, describe: "Product and brand" }, format: { required: true, describe: "box, label, pouch, bottle label + dimensions" }, style: { required: false, describe: "Visual style" } },
    body: ({ product, format, style }) => `Design packaging for ${product}. Format: ${format}.${optional("Style", style)}

1. Dieline: get exact dimensions; build or create_packaging_design with the dieline on its own locked layer named "Dieline" (spot color, not printed).
2. Panels: front (brand, product name, key claim), sides/back (description, ingredients or specs, barcode area, legal text 6 pt or larger).
3. CMYK document; 3 mm bleed beyond the dieline; keep text 3 mm inside folds.
4. Check fonts and linked images (inspect_assets); embed_images before handoff.
5. Export a print PDF and a flat PNG mockup.${RULES}`,
  },
  {
    name: "seamless_pattern",
    title: "Create a seamless pattern",
    description: "Repeating vector pattern tile registered as an Illustrator pattern swatch.",
    args: { motif: { required: true, describe: "Pattern motifs" }, colors: { required: false, describe: "Palette (hex)" }, tileSize: { required: false, describe: "Tile size, e.g. 200 px" } },
    body: ({ motif, colors, tileSize }) => `Create a seamless pattern of ${motif}.${optional("Colors", colors)}${optional("Tile size", tileSize)}

1. Tile: a square artboard of the tile size with a background rectangle.
2. Motifs: place them so anything crossing an edge is duplicated at the opposite edge with an offset of exactly one tile width/height (duplicate_object + move_object), otherwise the repeat shows seams.
3. Register it with create_pattern and apply it to a large test rectangle to check the repeat.
4. Verify with generate_export_preview of the test rectangle; fix any seams.
5. Export the tile as SVG and a repeated preview as PNG.${RULES}`,
  },
  {
    name: "infographic",
    title: "Create an infographic",
    description: "Data-driven infographic with accurate, editable charts.",
    args: { topic: { required: true, describe: "Subject" }, data: { required: true, describe: "The numbers to show" }, format: { required: false, describe: "Size or channel" } },
    body: ({ topic, data, format }) => `Create an infographic about ${topic}.${optional("Format", format)}
Data: ${data}

1. Decide the story: the one takeaway, then 3-5 supporting points.
2. Choose chart types honestly (bars for comparison, lines for trends; no 3D, axes start at zero for bars).
3. Build with create_infographic or plan_design; every number shown must come from the data above, and sizes must be proportional to values.
4. Add source and date in small type.
5. Review hierarchy with analyze_composition; export PNG and PDF.${RULES}`,
  },
  {
    name: "icon_library",
    title: "Create an icon library",
    description: "Consistent SVG icon set on a shared grid.",
    args: { icons: { required: true, describe: "Icon names/concepts" }, style: { required: false, describe: "outline, filled, duotone" }, size: { required: false, describe: "Grid size, default 24 px" } },
    body: ({ icons, style, size }) => `Create an icon library: ${icons}.${optional("Style", style)}

1. Grid: ${size ?? "24 px"} artboard per icon, 2 px padding, consistent stroke width, corner radius and cap/join.
2. Build with create_icon_set (or draw_* per icon), one artboard per icon, named after the icon.
3. Expand strokes only on export copies (outline_stroke) if the target needs filled paths.
4. Check optical consistency in a preview of all artboards side by side.
5. export_artboards to SVG (one file per icon) with background: true for large sets.${RULES}`,
  },
  {
    name: "fashion_technical_drawing",
    title: "Create a fashion technical drawing",
    description: "Garment flat (front/back) with construction details and callouts.",
    args: { garment: { required: true, describe: "Garment type and details" }, views: { required: false, describe: "front, back, side" } },
    body: ({ garment, views }) => `Create a fashion technical drawing (flat) of ${garment}. Views: ${views ?? "front and back"}.

1. Symmetry: draw one half with draw_pen_path, then duplicate_object + flip_objects (horizontal) and join_paths for the other half.
2. Line weights: outline 1.5 pt, seams 0.75 pt, topstitching 0.5 pt dashed (set_stroke dashes).
3. Details: pockets, darts, closures, labels as separate named groups.
4. Callouts: thin leader lines (draw_line) and labels on a "Callouts" layer; measurements in cm or in as specified.
5. Each view on its own artboard; export PDF for the tech pack and SVG.${RULES}`,
  },
  {
    name: "prepare_for_print",
    title: "Prepare artwork for commercial printing",
    description: "Preflight and convert the active document for print production.",
    args: { printer: { required: false, describe: "Printer specs: bleed, color profile, PDF standard" } },
    body: ({ printer }) => `Prepare the active document for commercial printing.${optional("Printer specs", printer)}

1. Inspect: inspect_document, inspect_fonts { documentFonts: true }, inspect_assets (missing links), list_swatches (spots).
2. Report problems before changing anything: RGB mode, missing fonts, missing or low-resolution images (get_image_info), text under 6 pt, hairlines under 0.25 pt.
3. With the user's go-ahead: set_document_color_mode CMYK, embed_images, and outline text on a COPY saved separately (convert_text_to_outlines) if the printer asks for outlines.
4. Bleed and crop marks: apply the printer's bleed; if a setting is not available through the tools, say so rather than assuming it was applied.
5. Export a print PDF with export_pdf and list what was changed versus the original.${RULES}`,
  },
  {
    name: "audit_document",
    title: "Audit and improve an existing Illustrator document",
    description: "Structure, production and design audit with a prioritised fix list.",
    args: { goals: { required: false, describe: "What the document is for" } },
    body: ({ goals }) => `Audit the active Illustrator document${goals ? ` (purpose: ${goals})` : ""}.

1. Structure: inspect_layers and inspect_document { deep: true }: unnamed layers/objects, empty layers, hidden or locked leftovers, stray points.
2. Production: inspect_fonts, inspect_assets, color mode, artboard sizes.
3. Design: analyze_composition, analyze_typography, critique_design (visual notes from the preview only).
4. Report findings grouped as Critical / Recommended / Optional, each with the exact tool call that would fix it.
5. Apply fixes only after the user approves; save to a new file name, never over the original without asking.${RULES}`,
  },
];

export function registerPrompts(server: McpServer): void {
  for (const t of TEMPLATES) {
    const argsSchema = Object.fromEntries(
      Object.entries(t.args).map(([k, v]) => [k, v.required ? z.string().describe(v.describe) : z.string().optional().describe(v.describe)]),
    );
    server.registerPrompt(t.name, { title: t.title, description: t.description, argsSchema }, (args: Record<string, string | undefined>) => user(t.body(args)));
  }
}

export const PROMPT_NAMES = TEMPLATES.map((t) => t.name);
