# Supported features

What the server can do in Adobe Illustrator, how it does it, and what has been checked against a real
Illustrator. Tool details: [TOOLS.md](TOOLS.md) (generated). Protocol details: [API_REFERENCE.md](API_REFERENCE.md).

**Legend**
- **Live**: verified by an end-to-end suite against a real Illustrator.
- **Unit**: covered by automated tests on the mock adapter only.
- **Partial**: works with the stated limit.
- **Not scriptable**: Illustrator's scripting API (v31) does not expose it, so the server does not offer it.

Live suites were last run on **Illustrator 2027 (31.0), Windows 11, COM bridge**: `test:e2e:jobs` (14/14),
`test:e2e:resources` (14/14) and `test:e2e:production` (26/26) and `test:e2e:file-menu` (16/16), all on 2026-11-23. Older suites (`test:e2e`, `test:e2e:design`,
`test:e2e:advanced`, `test:e2e:extended`) were verified on Illustrator 2026 (30.8); see [TEST_REPORT.md](TEST_REPORT.md).
macOS (AppleScript bridge) is implemented but less exercised.

## Documents and files

| Feature | Tools | Status |
|---|---|---|
| Create, open, close, list, switch documents | `create_document`, `open_document`, `open_file`, `close_document`, `list_documents`, `activate_document` | Live |
| Open AI, AIT, PDF, EPS, SVG, SVGZ, DXF, DWG, PNG, JPG, TIFF, GIF, BMP, PSD | `open_file` | Live (`.ai`); other formats use Illustrator's own importer |
| Save in place / as AI, editable PDF, EPS | `save_file`, `save_document`, `save_document_as` | Live |
| Save a Copy (AI, PDF, EPS) and Save as Template (.ait); the open document keeps its own file | `save_copy` | Live (document must be saved first) |
| Save All, Close All (save or discard, with exceptions), Revert | `save_all_documents`, `close_all_documents`, `revert_document` | Live; Close All with save refuses never-saved documents, discard and revert need `confirm: true` |
| Open Recent, New from Template | `list_recent_files`, `open_recent_file`, `new_from_template` | Live; the list is Illustrator's own and may not yet show files opened by scripts |
| Place / import files (images, AI, PDF, SVG, EPS) | `place_image` | Live |
| Document info and settings (color mode, profile, units, raster effects) | `inspect_document`, `get_document_settings`, `set_raster_effects_resolution`, `set_document_color_mode` | Live |
| Units | `set_document_units` | Partial: sets the session default and a ruler preference; `Document.rulerUnits` is read-only |
| Ruler origin, document bleed | — | Not offered: bleed is fixed at creation (applied at PDF export instead); ruler origin not yet verified |

## Artboards

| Feature | Tools | Status |
|---|---|---|
| Create, resize, rename, duplicate (with artwork), delete, list | `create_artboard`, `resize_artboard`, `rename_artboard`, `duplicate_artboard`, `delete_artboard`, `get_artboards` | Live |
| Fit to artwork | `fit_artboard_to_artwork` | Live |
| Export one or all artboards | `export_artboards`, `export_png` etc. with `artboards` | Live |

## Drawing

| Feature | Tools | Status |
|---|---|---|
| Rectangle (rounded), ellipse, circle, polygon, star, line | `draw_rectangle`, `draw_ellipse`, `draw_circle`, `draw_polygon`, `draw_star`, `draw_line` | Live |
| Triangle, arc (open/pie/chord), spiral | `draw_triangle`, `draw_arc`, `draw_spiral` | Live |
| Bezier paths, freeform smoothing | `draw_pen_path`, `draw_freeform_path` | Live |
| Anchor editing: list, move, handles, convert, add, remove | `edit_path_points` | Live |
| Join, split, reverse, open/close, simplify, offset, outline stroke | `join_paths`, `split_path`, `reverse_path`, `set_path_closed`, `simplify_path`, `offset_path`, `outline_stroke` | Live; `simplify_path` uses its own tolerance algorithm (Illustrator's Simplify dialog cannot be scripted) |
| Grids and guides | `create_grid`, `create_guides`, `create_layout_guides` | Live |

## Objects

| Feature | Tools | Status |
|---|---|---|
| Select (references, filters, all, none), inspect | `select_objects`, `select_all`, `inspect_selection`, `get_object_properties` | Live |
| Move, resize, rotate, reflect, shear, combined transform | `move_object`, `resize_object`, `rotate_object`, `flip_objects`, `shear_objects`, `transform_objects` | Live |
| Duplicate, delete, group, ungroup, lock/unlock, hide/show, rename, stacking | `duplicate_object`, `delete_object`, `group_objects`, `ungroup_objects`, `lock_objects`, `hide_objects`, `rename_object`, `set_object_z_order` | Live |
| Align, distribute, arrange, center, bounds | `align_objects`, `distribute_objects`, `arrange_objects`, `center_on_artboard`, `calculate_object_bounds` | Live |
| Pathfinder: unite, minus front, intersect, exclude, divide, trim, merge, crop, outline | `pathfinder` | Live (runs Live Pathfinder and expands) |
| Compound paths, clipping masks | `create_compound_path`, `release_compound_path`, `create_clipping_mask`, `release_clipping_mask` | Live |
| Blends | `create_blend`, `release_blend` | Live |
| Expand appearance | `expand_objects` | Live |
| Shape Builder, Puppet Warp, Intertwine, Live Paint editing | — | Not scriptable |

## Color and appearance

| Feature | Tools | Status |
|---|---|---|
| Fill, stroke (width, dashes, cap, join), opacity, blend modes | `set_fill_color`, `set_stroke`, `set_opacity`, `set_blend_mode` | Live |
| Linear and radial gradients | `set_gradient` | Live |
| Swatches, swatch groups, spot colors, palettes | `create_color_swatches`, `create_swatch_group`, `create_spot_color`, `create_color_palette`, `apply_color_palette`, `list_swatches` | Live |
| Drop shadow, blur, glows | `apply_shadow`, `apply_blur`, `apply_appearance` | Partial: uses LiveEffect XML, the least-tested area |
| Graphic styles, brushes (apply existing) | `apply_graphic_style`, `apply_brush`, `list_styles` | Live |
| Creating new brushes | — | Not scriptable (apply brushes that already exist in the document) |
| Freeform gradients, gradient mesh creation, overprint, opacity masks | — | Not scriptable / not yet verified |

## Typography

| Feature | Tools | Status |
|---|---|---|
| Point, area and path text; edit, find/replace, outline | `add_text`, `create_area_text`, `create_text_on_path`, `edit_text`, `find_replace_text`, `convert_text_to_outlines` | Live |
| Font, size, weight, color, alignment, tracking, leading | `set_font`, `set_font_size`, `set_font_weight`, `set_text_color`, `set_paragraph_alignment`, `set_character_spacing`, `set_line_spacing` | Live |
| Kerning, baseline, scale, caps, OpenType features, indents, tabs | `set_text_attributes` | Live |
| Threading and columns | `thread_text_frames`, `set_text_columns` | Live |
| Character/paragraph styles | `create_text_style`, `apply_text_style` | Live |
| Font availability (checked before use, fallbacks reported) | `inspect_fonts`, `illustrator://fonts` | Live |

## Layers

| Feature | Tools | Status |
|---|---|---|
| Create, delete, rename, reorder, lock, hide, select, move objects | `create_layer`, `delete_layer`, `rename_layer`, `reorder_layers`, `lock_layer`, `hide_layer`, `select_layer`, `move_object_to_layer` | Live |
| Duplicate layer (with sublayers), sublayers | `duplicate_layer`, `create_sublayer` | Live |
| Semantic renaming | `rename_layers_semantically` | Live (needs Illustrator 2020+) |

## Symbols, patterns, data

| Feature | Tools | Status |
|---|---|---|
| Symbols: create, place | `create_symbol`, `place_symbol` | Live |
| Patterns | `create_pattern` | Partial: pattern swatches cannot be created by script; builds a tiled clipping group and says so |
| Variables and data merge | `bind_variable`, `list_variables`, `capture_dataset`, `apply_dataset`, `data_merge_export` | Live |
| Actions | `run_action` | Live (requires `confirm: true`) |

## Images

| Feature | Tools | Status |
|---|---|---|
| Place (linked or embedded), embed, replace (relink), info and effective ppi | `place_image`, `embed_images`, `replace_image`, `get_image_info`, `inspect_assets` | Live; embedded images cannot be relinked |
| Image Trace | `trace_image` | Live |

## Export and print

| Feature | Tools | Status |
|---|---|---|
| PNG, JPG, SVG, PDF, EPS, TIFF | `export_png`, `export_jpg`, `export_svg`, `export_pdf`, `export_eps`, `export_tiff` | Live |
| Several formats at once, all artboards | `export_multiple_formats`, `export_artboards` | Live |
| Selected objects only (PNG/SVG) | `export_selection` | Live |
| Print PDF: PDF/X preset, bleed, crop/registration marks, color bars | `export_print_pdf` | Live |
| Preflight (fonts, links, resolution, hairlines, small/overset text, RGB in CMYK, stray points) | `preflight_document` | Live |
| Print | `print_document` | Live (requires `confirm: true`) |

## Design intelligence

| Feature | Tools | Status |
|---|---|---|
| Brief to plan, plan validation, execution with verification | `plan_design`, `validate_design_plan`, `execute_design_plan`, `generate_design` | Live |
| Logos, posters, flyers, social graphics, business cards, brand identity, packaging, infographics, icon sets, illustrations, editorial layouts | `create_*` design tools | Live (template-based; refine with `revise_design`) |
| UI: app screens, landing pages, dashboards, UI kits, auto layout, tokens | `create_app_screen`, `create_landing_page`, `create_web_dashboard`, `create_ui_kit`, `create_ui_design` | Live |
| Critique, composition and typography analysis, improvement, variations | `critique_design`, `analyze_composition`, `analyze_typography`, `improve_design`, `generate_design_variations` | Live; visual judgement relies on the client viewing the preview image |
| Design systems | `save_design_system`, `apply_design_system`, `recommend_design_system`, `search_design_knowledge` | Live |

## Workflow and reliability

| Feature | Tools | Status |
|---|---|---|
| Background jobs for long runs (no MCP timeout) | `background: true` on 30 tools; `get_job`, `wait_for_job`, `list_jobs`, `cancel_job` | Live |
| Batch of tool calls in one request | `batch_operation` | Live |
| Cleanup (stray points, empty text, unpainted paths, empty layers) | `cleanup_document` | Live (dry run by default; removal needs `confirm: true`) |
| Report for review/handoff | `generate_design_report` | Live |
| Undo / redo | `undo`, `redo` | Partial: one step is one Illustrator change, not one tool call |
| Arbitrary script execution | — | Not offered (only allowlisted operations run inside Illustrator) |

## Not scriptable in Illustrator (v31)

Freeform gradients, creating gradient meshes, Puppet Warp, Intertwine, Shape Builder, drawing on the
Perspective Grid, Live Paint editing, creating brushes and pattern swatches, opacity masks. Possible partial routes
through menu commands (Repeat radial/grid/mirror, Live Paint make/expand, 3D and warp effects) are tracked in
[GAP_ANALYSIS.md](GAP_ANALYSIS.md) and will only be listed here once verified live.
