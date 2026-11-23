# MCP tool reference

Generated from the server (208 tools) by `node scripts/gen-docs.mjs`. Coordinates follow [COORDINATES.md](COORDINATES.md).

## `illustrator_status`

Detect installed Illustrator versions, bridge readiness (COM on Windows, AppleScript on macOS) and whether Illustrator is running. With probe: true also queries the running application (version, open documents) via a real script call.

| Parameter | Type | Notes |
|---|---|---|
| `probe` | boolean | Execute a status script inside Illustrator (may launch it if auto-launch is enabled) |

## `create_document`

Create a new Illustrator document. Size can be a paper preset (A4, Letter, ...) or width/height in the given units.

| Parameter | Type | Notes |
|---|---|---|
| `name` | string |  |
| `preset` | string |  |
| `width` | number |  |
| `height` | number |  |
| `units` | string |  |
| `orientation` | string |  |
| `colorMode` | string |  |
| `artboards` | integer |  |

## `open_document`

Open an existing .ai/.pdf/.eps/.svg file from an allowed directory.

| Parameter | Type | Notes |
|---|---|---|
| `path` * | string |  |

## `close_document`

Close a document. If it has unsaved changes you must pass save: true, or save: false together with confirm: true to discard them.

> Destructive — requires `confirm: true`.

| Parameter | Type | Notes |
|---|---|---|
| `name` | string | Document name; default active |
| `save` | boolean |  |
| `confirm` | boolean |  |

## `save_document`

Save the active document to its existing file.

## `save_document_as`

Save the active document as a native editable .ai file inside an allowed directory. Existing files are not overwritten unless overwrite: true.

| Parameter | Type | Notes |
|---|---|---|
| `path` * | string | Target .ai path (relative paths resolve inside the output directory) |
| `overwrite` | boolean |  |
| `pdfCompatible` | boolean |  |
| `embedLinkedFiles` | boolean |  |
| `embedICCProfile` | boolean |  |

## `save_file`

Save the active document. Without a path, saves in place (the document must already have a file). With a path, saves as an editable native file whose format follows the extension: .ai, .pdf (Illustrator-editable) or .eps (for a template .ait use save_copy). The open document is re-targeted to the new file. Existing files are not overwritten unless overwrite: true.

| Parameter | Type | Notes |
|---|---|---|
| `path` | string | Target path (relative paths resolve inside the output directory); omit to save in place |
| `overwrite` | boolean |  |
| `pdfCompatible` | boolean | .ai: embed PDF content; .pdf: preserve Illustrator editing capabilities |
| `embedLinkedFiles` | boolean |  |
| `embedICCProfile` | boolean |  |

## `open_file`

Open a file from an allowed directory in Illustrator: native/vector files (.ai, .ait, .pdf, .eps, .svg, .svgz, .dxf, .dwg) or images (.png, .jpg, .jpeg, .tif, .tiff, .gif, .bmp, .psd), which open as new documents. If the file is already open its document is activated instead, unless reopen: true. Subsequent operations target the opened document.

| Parameter | Type | Notes |
|---|---|---|
| `path` * | string |  |
| `reopen` | boolean | Open a second copy even if the file is already open |

## `save_copy`

Save a copy of the active document (File > Save a Copy) as .ai, .pdf (editable), .eps or a template (.ait, File > Save as Template). The open document keeps pointing at its own file. The document must already be saved, with no unsaved changes.

| Parameter | Type | Notes |
|---|---|---|
| `path` * | string | Copy path (relative paths resolve inside the output directory) |
| `overwrite` | boolean |  |
| `pdfCompatible` | boolean |  |
| `embedLinkedFiles` | boolean |  |

## `save_all_documents`

Save every open document that has a file and unsaved changes (File > Save All). Documents that were never saved are listed as skipped.

## `revert_document`

Revert the active document to its last saved version (File > Revert). Unsaved changes are lost, so it requires confirm: true.

> Destructive — requires `confirm: true`.

| Parameter | Type | Notes |
|---|---|---|
| `confirm` | boolean |  |

## `close_all_documents`

Close all open documents (File > Close All), optionally keeping some open. mode: save saves changed documents first (refuses if one was never saved); mode: discard closes without saving and requires confirm: true.

> Destructive — requires `confirm: true`.

| Parameter | Type | Notes |
|---|---|---|
| `mode` * | string |  |
| `except` | array | Document names to keep open |
| `confirm` | boolean |  |

## `list_recent_files`

List Illustrator's recent files (File > Open Recent Files), newest first, with whether each still exists. Open one with open_recent_file or open_file.

| Parameter | Type | Notes |
|---|---|---|
| `limit` | integer |  |

## `open_recent_file`

Open a file from Illustrator's recent-files list by its index from list_recent_files. The file must still be inside an allowed directory.

| Parameter | Type | Notes |
|---|---|---|
| `index` * | integer |  |

## `new_from_template`

Create a new untitled document from an Illustrator template (.ait) (File > New from Template). The template file itself is not changed.

| Parameter | Type | Notes |
|---|---|---|
| `path` * | string |  |

## `inspect_document`

Read the active document: artboards, layers, and every top-level object with bounds (points, artboard top-left origin, y down), fills, strokes and text properties. These are verified Illustrator properties.

| Parameter | Type | Notes |
|---|---|---|
| `artboard` | integer |  |
| `deep` | boolean | Include group children |
| `limit` | integer |  |

## `get_artboards`

List artboards with sizes in points.

## `create_artboard`

Add an artboard. x/y are relative to artboard 0's top-left corner.

| Parameter | Type | Notes |
|---|---|---|
| `name` | string |  |
| `x` * | number |  |
| `y` * | number |  |
| `width` * | number |  |
| `height` * | number |  |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `resize_artboard`

Resize an artboard, anchored at its top-left or center.

| Parameter | Type | Notes |
|---|---|---|
| `index` | integer |  |
| `width` * | number |  |
| `height` * | number |  |
| `anchor` | string |  |
| `name` | string |  |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `set_document_units`

Set the default units this MCP session uses for tool coordinates, and write Illustrator's ruler-unit preference (the preference mapping is not documented by Adobe and is reported as unverified).

| Parameter | Type | Notes |
|---|---|---|
| `units` * | string |  |
| `applyToIllustrator` | boolean |  |

## `set_document_color_mode`

Convert the active document's color mode to RGB or CMYK (verified by reading documentColorSpace back).

| Parameter | Type | Notes |
|---|---|---|
| `mode` * | string |  |

## `draw_rectangle`

Draw a rectangle (optionally rounded). x/y = top-left from the artboard's top-left, y down.

| Parameter | Type | Notes |
|---|---|---|
| `x` * | number |  |
| `y` * | number |  |
| `width` * | number |  |
| `height` * | number |  |
| `cornerRadius` | number |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |
| `fill` | union | Hex fill or "none" (default gray for closed shapes) |
| `stroke` | union |  |
| `opacity` | number |  |
| `rotation` | number |  |

## `draw_circle`

Draw a circle from its center point and radius.

| Parameter | Type | Notes |
|---|---|---|
| `cx` * | number |  |
| `cy` * | number |  |
| `radius` * | number |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |
| `fill` | union | Hex fill or "none" (default gray for closed shapes) |
| `stroke` | union |  |
| `opacity` | number |  |
| `rotation` | number |  |

## `draw_ellipse`

Draw an ellipse by its bounding box (top-left x/y, width, height).

| Parameter | Type | Notes |
|---|---|---|
| `x` * | number |  |
| `y` * | number |  |
| `width` * | number |  |
| `height` * | number |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |
| `fill` | union | Hex fill or "none" (default gray for closed shapes) |
| `stroke` | union |  |
| `opacity` | number |  |
| `rotation` | number |  |

## `draw_polygon`

Draw a regular polygon centered at cx/cy.

| Parameter | Type | Notes |
|---|---|---|
| `cx` * | number |  |
| `cy` * | number |  |
| `radius` * | number |  |
| `sides` * | integer |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |
| `fill` | union | Hex fill or "none" (default gray for closed shapes) |
| `stroke` | union |  |
| `opacity` | number |  |
| `rotation` | number |  |

## `draw_star`

Draw a star centered at cx/cy with outer and inner radius.

| Parameter | Type | Notes |
|---|---|---|
| `cx` * | number |  |
| `cy` * | number |  |
| `radius` * | number |  |
| `innerRadius` * | number |  |
| `points` | integer |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |
| `fill` | union | Hex fill or "none" (default gray for closed shapes) |
| `stroke` | union |  |
| `opacity` | number |  |
| `rotation` | number |  |

## `draw_line`

Draw a straight line segment.

| Parameter | Type | Notes |
|---|---|---|
| `x1` * | number |  |
| `y1` * | number |  |
| `x2` * | number |  |
| `y2` * | number |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |
| `fill` | union | Hex fill or "none" (default gray for closed shapes) |
| `stroke` | union |  |
| `opacity` | number |  |
| `rotation` | number |  |

## `draw_pen_path`

Draw a Bezier path from anchor points with optional absolute in/out handles (like the Pen tool).

| Parameter | Type | Notes |
|---|---|---|
| `points` * | array |  |
| `closed` | boolean |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |
| `fill` | union | Hex fill or "none" (default gray for closed shapes) |
| `stroke` | union |  |
| `opacity` | number |  |
| `rotation` | number |  |

## `draw_freeform_path`

Draw a smooth freeform path through the given points (Catmull-Rom smoothing converted to Bezier handles).

| Parameter | Type | Notes |
|---|---|---|
| `points` * | array |  |
| `closed` | boolean |  |
| `smoothness` | number |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |
| `fill` | union | Hex fill or "none" (default gray for closed shapes) |
| `stroke` | union |  |
| `opacity` | number |  |
| `rotation` | number |  |

## `create_compound_path`

Combine paths into a compound path (overlaps become holes per even-odd/non-zero rules).

| Parameter | Type | Notes |
|---|---|---|
| `targets` * | array |  |
| `name` | string | Object name, used later to target it |
| `fill` | union |  |

## `create_clipping_mask`

Clip target objects with a mask shape (path, compound path or text). The mask's shape defines the visible region.

| Parameter | Type | Notes |
|---|---|---|
| `mask` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` * | array |  |
| `name` | string | Object name, used later to target it |

## `create_symbol`

Register an object as a reusable symbol in the document's Symbols panel; optionally replace it with an instance.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `name` * | string |  |
| `replaceWithInstance` | boolean |  |

## `create_pattern`

Tile an object across an area as an editable clipped group. Note: Illustrator's scripting API cannot create pattern swatches, so the result is a tiled group, not a swatch.

| Parameter | Type | Notes |
|---|---|---|
| `tile` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `x` * | number |  |
| `y` * | number |  |
| `width` * | number |  |
| `height` * | number |  |
| `gapX` | number |  |
| `gapY` | number |  |
| `offsetRows` | boolean |  |
| `removeTile` | boolean |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `add_text`

Add live, editable text. Point text by default; pass width+height for area text. Fonts are tried in order; unavailable fonts produce a warning and are never reported as applied.

| Parameter | Type | Notes |
|---|---|---|
| `content` * | string |  |
| `x` * | number |  |
| `y` * | number | Top of the text |
| `width` | number |  |
| `height` | number |  |
| `font` | union | PostScript name, 'Family Style', or a fallback list |
| `fontSize` | number | Points |
| `weight` | string |  |
| `color` | string | Hex color, e.g. #1A2B3C |
| `align` | string |  |
| `tracking` | number | 1/1000 em |
| `leading` | number | Points |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `edit_text`

Replace the text content of a text object, or replace occurrences of `find` with `content`.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `content` * | string |  |
| `find` | string |  |

## `set_font`

Set the typeface (PostScript name, 'Family Style', or fallback list). Returns an error if none of the fonts are installed.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `range` | object | Character range; default whole text |
| `font` * | union |  |

## `set_font_size`

Set font size in points.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `range` | object | Character range; default whole text |
| `fontSize` * | number |  |

## `set_font_weight`

Switch to another installed style of the same family (e.g. Bold). Warns if the family lacks that weight.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `range` | object | Character range; default whole text |
| `weight` * | string |  |

## `set_text_color`

Set text fill color.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `range` | object | Character range; default whole text |
| `color` * | string | Hex color, e.g. #1A2B3C |

## `set_paragraph_alignment`

Set paragraph justification.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `range` | object | Character range; default whole text |
| `align` * | string |  |

## `set_character_spacing`

Set tracking in 1/1000 em.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `range` | object | Character range; default whole text |
| `tracking` * | number |  |

## `set_line_spacing`

Set leading in points (disables auto leading).

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `range` | object | Character range; default whole text |
| `leading` * | number |  |

## `create_text_on_path`

Flow text along an existing open or closed path.

| Parameter | Type | Notes |
|---|---|---|
| `path` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `content` * | string |  |
| `font` | union |  |
| `fontSize` | number |  |
| `color` | string | Hex color, e.g. #1A2B3C |
| `tracking` | number |  |
| `name` | string | Object name, used later to target it |

## `convert_text_to_outlines`

Convert text to vector outlines (no longer editable as text). Useful before sending to print when fonts may be missing.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |

## `inspect_fonts`

List installed fonts (optionally filtered) and fonts used in the active document. Use check to verify availability of specific fonts.

| Parameter | Type | Notes |
|---|---|---|
| `query` | string |  |
| `limit` | integer |  |
| `documentFonts` | boolean |  |
| `check` | array |  |

## `set_fill_color`

Set a solid fill (or none) on objects. For text objects this sets the text color.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `color` * | union |  |

## `set_gradient`

Apply a linear or radial gradient fill. Creates a named gradient swatch in the document.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `type` | string |  |
| `angle` | number |  |
| `name` | string |  |
| `stops` * | array |  |

## `set_stroke`

Set stroke color, width (pt), dashes, cap and join, or remove it with "none".

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `stroke` * | union |  |

## `set_opacity`

Set object opacity (0–100).

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `opacity` * | number |  |

## `set_blend_mode`

Set the transparency blend mode.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `mode` * | string |  |

## `apply_shadow`

Apply a live Drop Shadow effect (Illustrator CC 2018+ applyEffect). Offsets/blur in points.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `offsetX` | number |  |
| `offsetY` | number |  |
| `blur` | number |  |
| `opacity` | number |  |

## `apply_blur`

Apply a live Gaussian Blur effect (radius in pixels).

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `radius` | number |  |

## `apply_appearance`

Apply several appearance attributes in one call: fill, stroke, opacity, blend mode and effects.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `fill` | union |  |
| `stroke` | union |  |
| `opacity` | number |  |
| `blendMode` | string |  |
| `effects` | array |  |

## `create_color_palette`

Generate a role-based palette (background, surface, primary, secondary, accent, text, muted) from a base color and harmony rule, or return a curated style palette. Computed by the server; nothing is changed in Illustrator.

| Parameter | Type | Notes |
|---|---|---|
| `baseColor` | string |  |
| `harmony` | string |  |
| `style` | string |  |
| `dark` | boolean |  |

## `create_color_swatches`

Add named color swatches to the active document, optionally inside a swatch group.

| Parameter | Type | Notes |
|---|---|---|
| `group` | string |  |
| `colors` * | array |  |

## `apply_color_palette`

Recolor named objects by palette role, e.g. {palette:{primary:'#123456'}, assignments:[{name:'Headline', role:'primary'}]}.

| Parameter | Type | Notes |
|---|---|---|
| `palette` * | object |  |
| `assignments` * | array |  |

## `select_objects`

Select objects by explicit references or by filters (layer, Illustrator type such as PathItem/TextFrame, name substring). Locked/hidden objects are skipped by filters.

| Parameter | Type | Notes |
|---|---|---|
| `targets` | array | Multiple object references; defaults to current selection |
| `layer` | string |  |
| `type` | string |  |
| `nameContains` | string |  |

## `inspect_selection`

Describe the current selection (verified properties).

| Parameter | Type | Notes |
|---|---|---|
| `deep` | boolean |  |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |

## `move_object`

Move objects to an absolute top-left position (x/y) or by a relative offset (dx/dy).

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `x` | number |  |
| `y` | number |  |
| `dx` | number |  |
| `dy` | number |  |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `resize_object`

Resize to an absolute width/height or by scale percent. Proportions are kept when only one dimension is given.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `width` | number |  |
| `height` | number |  |
| `scale` | number | Percent |
| `keepProportions` | boolean |  |
| `scaleStrokes` | boolean |  |
| `anchor` | string |  |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `rotate_object`

Rotate objects by degrees (counter-clockwise positive, Illustrator convention) around an anchor.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `angle` * | number |  |
| `anchor` | string |  |

## `duplicate_object`

Duplicate objects, optionally repeatedly with a step offset (dx/dy per copy).

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `copies` | integer |  |
| `dx` | number |  |
| `dy` | number |  |
| `name` | string | Object name, used later to target it |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `delete_object`

Delete objects. Destructive: requires confirm: true after asking the user.

> Destructive — requires `confirm: true`.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `confirm` | boolean |  |

## `group_objects`

Group objects (they must share a layer; the group is placed on the first object's layer).

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `name` | string | Object name, used later to target it |

## `ungroup_objects`

Release groups into their children. Clipping groups require releaseClipping: true.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `releaseClipping` | boolean |  |

## `lock_objects`

Lock or unlock objects.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `locked` | boolean |  |

## `hide_objects`

Hide or show objects.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `hidden` | boolean |  |

## `rename_object`

Rename an object (multiple targets get numbered suffixes).

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `name` * | string |  |

## `set_object_z_order`

Change stacking order within the layer.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `order` * | string |  |

## `transform_objects`

Apply a combined transform: absolute position/size, scale %, rotation, relative offset and reflection, in that order.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `x` | number |  |
| `y` | number |  |
| `dx` | number |  |
| `dy` | number |  |
| `width` | number |  |
| `height` | number |  |
| `keepProportions` | boolean |  |
| `scale` | number |  |
| `scaleX` | number |  |
| `scaleY` | number |  |
| `rotation` | number |  |
| `reflect` | string |  |
| `anchor` | string |  |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `align_objects`

Align objects' edges or centers relative to their combined bounds, the artboard, or a key object.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `alignment` * | string |  |
| `relativeTo` | string |  |
| `key` | object | Object reference: "selection" or {name, layer?} / {uuid} |

## `distribute_objects`

Distribute 3+ objects with equal gaps along an axis, or apply an explicit spacing.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `axis` | string |  |
| `spacing` | number |  |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `arrange_objects`

Arrange objects into a row, column or grid with a uniform gap, starting at x/y (default: current top-left).

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `mode` | string |  |
| `columns` | integer |  |
| `gap` | number |  |
| `x` | number |  |
| `y` | number |  |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `center_on_artboard`

Center objects (as a unit) on the artboard horizontally, vertically or both.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `axis` | string |  |

## `calculate_object_bounds`

Return geometric and visible bounds of objects and their union (points, artboard top-left origin).

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |

## `create_guides`

Create ruler-style guides at positions on a dedicated, locked Guides layer.

| Parameter | Type | Notes |
|---|---|---|
| `lines` * | array |  |
| `layer` | string |  |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `create_grid`

Draw a visible grid of thin lines as artwork (use create_layout_guides for non-printing guides).

| Parameter | Type | Notes |
|---|---|---|
| `x` | number |  |
| `y` | number |  |
| `width` * | number |  |
| `height` * | number |  |
| `cellWidth` * | number |  |
| `cellHeight` * | number |  |
| `color` | string | Hex color, e.g. #1A2B3C |
| `strokeWidth` | number |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `apply_margins`

Add margin guides inset from every artboard edge.

| Parameter | Type | Notes |
|---|---|---|
| `margin` * | number |  |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `create_layout_guides`

Create a column/row grid as guides: margins, columns and gutters (e.g. 12-column grid).

| Parameter | Type | Notes |
|---|---|---|
| `columns` | integer |  |
| `rows` | integer |  |
| `margin` | number |  |
| `gutter` | number |  |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `create_layout`

Set up a document layout in one step: standard layer stack (Typography, Graphics, Images, Background) plus margin/column guides.

| Parameter | Type | Notes |
|---|---|---|
| `columns` | integer |  |
| `rows` | integer |  |
| `margin` | number |  |
| `gutter` | number |  |
| `layers` | array |  |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `balance_composition`

Measure visual balance (area-weighted center vs. artboard center). With apply: true, shifts the given targets (or all unlocked non-background content) so the visual center moves toward the artboard center by `strength`.

| Parameter | Type | Notes |
|---|---|---|
| `apply` | boolean |  |
| `strength` | number |  |
| `axis` | string |  |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |

## `inspect_layers`

List layers top-to-bottom with visibility, lock state and item counts.

## `create_layer`

Create a new layer at the top (default) or bottom of the stack.

| Parameter | Type | Notes |
|---|---|---|
| `name` * | string |  |
| `position` | string |  |
| `color` | string | Layer highlight color |

## `delete_layer`

Delete a layer and everything on it. Destructive: requires confirm: true.

> Destructive — requires `confirm: true`.

| Parameter | Type | Notes |
|---|---|---|
| `name` * | string |  |
| `confirm` | boolean |  |

## `rename_layer`

Rename a layer.

| Parameter | Type | Notes |
|---|---|---|
| `name` * | string |  |
| `newName` * | object |  |

## `select_layer`

Make a layer the active layer (new objects without an explicit layer go here).

| Parameter | Type | Notes |
|---|---|---|
| `name` * | string |  |

## `lock_layer`

Lock or unlock a layer.

| Parameter | Type | Notes |
|---|---|---|
| `name` * | string |  |
| `locked` | boolean |  |

## `hide_layer`

Hide or show a layer.

| Parameter | Type | Notes |
|---|---|---|
| `name` * | string |  |
| `hidden` | boolean |  |

## `move_object_to_layer`

Move objects to another layer (create: true makes the layer if missing).

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `layer` * | string |  |
| `create` | boolean |  |

## `reorder_layers`

Reorder layers. `order` lists layer names top-to-bottom; unlisted layers stay below.

| Parameter | Type | Notes |
|---|---|---|
| `order` * | array |  |

## `export_png`

Export artboards to PNG-24. Resolution via ppi (72 = 1:1) or a target pixel width. Clipped to the artboard.

| Parameter | Type | Notes |
|---|---|---|
| `path` * | string |  |
| `overwrite` | boolean |  |
| `artboards` | array | Artboard indexes; default active artboard. Multiple artboards get -N suffixes. |
| `ppi` | number |  |
| `width` | integer |  |
| `transparent` | boolean |  |
| `antiAliasing` | boolean |  |

## `export_jpg`

Export artboards to JPEG.

| Parameter | Type | Notes |
|---|---|---|
| `path` * | string |  |
| `overwrite` | boolean |  |
| `artboards` | array | Artboard indexes; default active artboard. Multiple artboards get -N suffixes. |
| `ppi` | number |  |
| `width` | integer |  |
| `quality` | integer |  |
| `antiAliasing` | boolean |  |

## `export_svg`

Export to SVG with configurable coordinate precision; optionally outline text.

| Parameter | Type | Notes |
|---|---|---|
| `path` * | string |  |
| `overwrite` | boolean |  |
| `artboard` | integer |  |
| `precision` | integer |  |
| `outlineText` | boolean |  |
| `embedImages` | boolean |  |

## `export_pdf`

Export to PDF. The document must be saved as .ai first (it is reopened afterwards so the .ai stays the working file), unless allowRetarget: true.

| Parameter | Type | Notes |
|---|---|---|
| `path` * | string |  |
| `overwrite` | boolean |  |
| `compatibility` | string |  |
| `preset` | string | Named PDF preset, e.g. [PDF/X-4:2008] |
| `artboards` | string | Range like '1-3,5' (1-based) |
| `preserveEditability` | boolean |  |
| `allowRetarget` | boolean |  |

## `export_eps`

Export to EPS (same save-first rule as export_pdf).

| Parameter | Type | Notes |
|---|---|---|
| `path` * | string |  |
| `overwrite` | boolean |  |
| `artboards` | string |  |
| `embedFonts` | boolean |  |
| `allowRetarget` | boolean |  |

## `export_multiple_formats`

Export the active document to several formats sharing a base path (extension added per format). Each format is reported individually; one failure does not hide others. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `basePath` * | string | Path without extension |
| `formats` * | array |  |
| `ppi` | number |  |
| `overwrite` | boolean |  |
| `allowRetarget` | boolean |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `generate_export_preview`

Export a real PNG preview of an artboard and return it as an image so the AI client can look at the artwork. If no file could be produced, no image is returned.

| Parameter | Type | Notes |
|---|---|---|
| `artboard` | integer |  |
| `maxWidthPx` | integer |  |

## `place_image`

Place an image from an allowed directory as a linked file, or embed it. Width/height fit proportionally unless fit: 'stretch'. Missing files return FILE_NOT_FOUND.

| Parameter | Type | Notes |
|---|---|---|
| `path` * | string |  |
| `x` | number |  |
| `y` | number |  |
| `width` | number |  |
| `height` | number |  |
| `fit` | string |  |
| `embed` | boolean |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `inspect_assets`

List linked and embedded images in the active document and report linked files that are missing on disk.

## `embed_images`

Embed linked images (all, or one by name) so the .ai no longer depends on external files.

| Parameter | Type | Notes |
|---|---|---|
| `name` | string |  |

## `list_templates`

List professional design templates and supported styles.

## `plan_design`

Turn a brief into a structured, validated design plan (JSON) WITHOUT touching Illustrator. Inspect or edit it, then call execute_design_plan.

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean |  |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |

## `validate_design_plan`

Validate a design plan against the schema plus semantic rules (layer references, palette references, alignment dependencies, contrast).

| Parameter | Type | Notes |
|---|---|---|
| `plan` * | object |  |

## `execute_design_plan`

Execute a stored plan (planId) or an inline plan in Illustrator: creates a new document with layers and editable objects, verifies the result by inspection, and attaches a preview. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `planId` | string |  |
| `version` | integer |  |
| `plan` | object |  |
| `preview` | boolean |  |
| `saveAs` | string |  |
| `overwrite` | boolean |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `get_design_plan`

Return a stored design plan (latest version unless version is given), or list all plans when planId is omitted.

| Parameter | Type | Notes |
|---|---|---|
| `planId` | string |  |
| `version` | integer |  |

## `compare_design_versions`

Diff two versions of a stored plan: added/removed/changed elements, palette and document changes.

| Parameter | Type | Notes |
|---|---|---|
| `planId` * | string |  |
| `from` * | integer |  |
| `to` * | integer |  |

## `generate_design`

Full pipeline from a brief: analyze requirements (category, audience, style, size), plan hierarchy/palette/typography/layers, validate, build editable artwork in Illustrator, verify by inspection and return a preview. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `category` | string |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_logo`

Create a minimalist logo lockup (mark, wordmark, tagline) as editable vectors. Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_poster`

Create a poster with hero image area, headline hierarchy and footer CTA. Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_flyer`

Create a flyer with color block, headline, offer list and CTA button. Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_social_media_graphic`

Create a social media graphic (default 1080×1080 px). Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_business_card`

Create a business card front (85×55 mm, CMYK). Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_brand_identity`

Create a brand identity board: logo lockup, palette swatches with hex labels, type specimens. Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_packaging_design`

Create a flat packaging layout with panels, dieline layer and front artwork. Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_infographic`

Create an infographic with numbered stat rows and bars. Pass copy.items as the data labels. Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_icon_set`

Create a consistent geometric icon set on shared keylines. Pass copy.items as icon labels. Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_vector_illustration`

Create a layered flat vector illustration (landscape scene). Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_editorial_layout`

Create an editorial magazine page with kicker, title, deck, columns and pull quote. Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_app_screen`

Create a mobile app screen (393×852-class frame) in auto layout with UI components: home/dashboard by default; the brief picks login/sign-up or settings screens. Pass copy.items for list rows. Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_landing_page`

Create a desktop website landing page: navbar, hero with CTAs and visual, feature cards. Pass copy.items as feature titles. Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_web_dashboard`

Create a web app dashboard: sidebar nav, header with search, KPI tiles, chart and activity list. Pass copy.items as nav labels. Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `create_ui_kit`

Create a design-system sheet: color tokens, type scale, buttons, inputs, controls, cards, list rows — all themed by style/palette. Same options as generate_design. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean | false = return the plan only |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `revise_design`

Apply targeted revisions to an executed plan without rebuilding: structured updates by element name, additions, removals, palette role changes, and simple instructions ("make the headline bigger", "change background to navy", "move logo up"). Unparsed instructions are reported, not guessed. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `planId` * | string |  |
| `instructions` | string |  |
| `updates` | array |  |
| `add` | array |  |
| `remove` | array |  |
| `palette` | object |  |
| `apply` | boolean |  |
| `preview` | boolean |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `analyze_composition`

Analyze the active document from verified Illustrator properties: margins, alignment near-misses, spacing rhythm, type scale, hierarchy, contrast, overlap and visual balance. Returns a score and findings with suggested fixes. This is geometric analysis, not visual perception.

| Parameter | Type | Notes |
|---|---|---|
| `artboard` | integer |  |

## `critique_design`

Critique the active design: verified property analysis plus an actual exported preview image attached for the AI client's own visual assessment. The server does not perform image recognition; any visual judgement must come from the client viewing the attached image.

| Parameter | Type | Notes |
|---|---|---|
| `artboard` | integer |  |
| `goals` | string | What the design should achieve |

## `improve_design`

Apply the automatic fixes suggested by analyze_composition (margins, alignment snaps, contrast, minimum size, hierarchy) as targeted edits, then re-analyze and report before/after scores. Use dryRun to preview the changes. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `categories` | array |  |
| `findingIds` | array |  |
| `dryRun` | boolean |  |
| `preview` | boolean |  |
| `artboard` | integer |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `generate_design_variations`

Generate N variations of a brief by changing one dimension each (style, palette harmony, or layout). Returns plans; with execute: true each is built as its own document with a preview. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | Natural-language design brief. Quote exact copy, e.g. headline "PURE BEAUTY". |
| `style` | string |  |
| `template` | string | Template id (see list_templates) |
| `copy` | object |  |
| `baseColor` | string | Derive the palette from this color |
| `harmony` | string |  |
| `palette` | object | Override palette roles, e.g. {background:'#E9DDCC'} |
| `size` | object |  |
| `colorMode` | string |  |
| `imagePath` | string | Image to place (must be inside an allowed directory) |
| `designSystem` | boolean | UI briefs: apply the UI/UX Pro Max product palette + font pairing matched from the brief (default: on unless style or baseColor is given) |
| `execute` | boolean |  |
| `preview` | boolean | Export and attach a PNG preview after execution |
| `saveAs` | string | Save the result as this .ai path |
| `count` | integer |  |
| `dimension` | string |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `search_design_knowledge`

Search the UI/UX Pro Max design knowledge base (MIT, 192 product types, 89 styles, 74 font pairings, 120+ UX rules). Domains: product (Product types → recommended style, landing pattern, dashboard style, palette focus); color (Product-type color palettes (primary, secondary, accent, background, foreground, card, muted, border, destructive)); typography (Heading/body font pairings by mood); style (UI styles (glassmorphism, neumorphism, brutalism…) with colors, effects, best-for and do-not-use-for); reasoning (Per-product design reasoning: pattern, style priority, color/typography mood, anti-patterns); landing (Landing page patterns: section order, CTA placement, color strategy); ux (UX guidelines with do / don't and severity); app-interface (Mobile app interface rules (accessibility, touch, navigation)); chart (Chart type recommendations per data type). Use it to ground style, color, type, layout and UX decisions before designing.

| Parameter | Type | Notes |
|---|---|---|
| `domain` * | string |  |
| `query` * | string | Keywords, e.g. "fintech", "glassmorphism", "elegant serif", "touch target" |
| `limit` | integer |  |

## `recommend_design_system`

Recommend a complete design system for a product brief using UI/UX Pro Max reasoning: matched product type, color palette mapped to palette roles (incl. AA-safe subtle/link/onPrimary), font pairing, UI style, landing-page pattern, key considerations and anti-patterns to avoid. Pass the result's palette to create_ui_design or the design tools.

| Parameter | Type | Notes |
|---|---|---|
| `brief` * | string | e.g. "telemedicine app for elderly patients" |

## `list_ui_components`

List the UI component library (button, input, card, navbar, tab-bar, list-item, toggle, stat, chart…) with props, the auto-layout node reference, device frame presets and default design tokens. Read this before create_ui_design.

## `get_design_tokens`

Design system for a style: color roles (incl. AA-safe 'subtle' text color), typography roles, spacing/radius/type-size tokens and control height. Use the token keys in auto-layout nodes.

| Parameter | Type | Notes |
|---|---|---|
| `style` | string |  |
| `platform` | string |  |
| `baseColor` | string |  |
| `harmony` | string |  |
| `palette` | object |  |

## `create_ui_design`

Build a UI screen from an auto-layout tree (Figma-style frames: stacks with gap/padding/alignment, fill/hug sizing, components and design tokens). The server measures and positions everything, validates contrast, then builds editable artwork in Illustrator with a preview. Call list_ui_components first for the node and component reference. execute: false returns the computed plan only. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `name` | string |  |
| `frame` | string | Device preset; or give width/height |
| `width` | number |  |
| `height` | number |  |
| `style` | string |  |
| `product` | string | Product/business description; applies the UI/UX Pro Max palette and font pairing for it (see recommend_design_system) |
| `baseColor` | string |  |
| `harmony` | string |  |
| `palette` | object | Override palette roles |
| `tokens` | object | Override design tokens (spacing, radius, fontSize, controlHeight) |
| `layout` * | array | Auto-layout root nodes; usually one vertical stack with width/height 'fill' |
| `elements` | array | Extra absolutely-positioned plan elements drawn beneath the layout |
| `execute` | boolean |  |
| `preview` | boolean |  |
| `saveAs` | string |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `rename_layers_semantically`

Rename generic objects ("<Path>", "Rectangle 3", unnamed text) in the active document to meaningful names inferred from verified geometry and content, e.g. "Background", "Header Bar", "Button / Sign in", "Heading / Pure Beauty". dryRun returns suggestions only. Inspects top-level objects of each layer.

| Parameter | Type | Notes |
|---|---|---|
| `artboard` | integer |  |
| `all` | boolean | Also rename objects that already have custom names |
| `dryRun` | boolean |  |

## `pathfinder`

Pathfinder boolean operation on 2+ objects: unite (union), minusFront (subtract front from back), intersect, exclude, divide, minusBack. Result is expanded, editable vector paths.

| Parameter | Type | Notes |
|---|---|---|
| `operation` * | string |  |
| `targets` * | array |  |
| `name` | string | Object name, used later to target it |

## `flip_objects`

Mirror objects horizontally or vertically about their own center.

| Parameter | Type | Notes |
|---|---|---|
| `targets` | array | Multiple object references; defaults to current selection |
| `axis` * | string |  |

## `edit_path_points`

Inspect or edit a path's anchor points. action: list | move (index, x, y; handles move along unless in/out given) | set_handles (index, in?, out?, pointType?) | convert (index → corner) | add (after index at x/y, or at the segment midpoint) | remove (index). Coordinates are absolute, artboard origin, y down.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `action` * | string |  |
| `index` | integer |  |
| `x` | number |  |
| `y` | number |  |
| `in` | array | Incoming handle (absolute) |
| `out` | object | Outgoing handle (absolute) |
| `pointType` | string |  |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `reverse_path`

Reverse a path's direction (point order and handles).

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |

## `set_path_closed`

Close an open path (adds the segment from the last to the first anchor) or open a closed one.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `closed` * | boolean |  |

## `split_path`

Split a path at an anchor index. An open path becomes two paths; a closed path becomes one open path starting at that anchor.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `index` * | integer |  |

## `join_paths`

Join open paths at their endpoints (Illustrator's Object > Path > Join).

| Parameter | Type | Notes |
|---|---|---|
| `targets` * | array |  |
| `name` | string | Object name, used later to target it |

## `simplify_path`

Reduce anchor points: removes anchors whose removal moves the outline less than `tolerance` (Ramer–Douglas–Peucker over anchors). Illustrator's own Simplify dialog cannot be driven by scripts, so this is an alternative; curve handles of removed anchors are dropped.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `tolerance` | number |  |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `get_image_info`

Report linked/embedded images: kind, file path, whether the link exists, placed bounds, effective PPI. Omit target for all images. Images are reported as raster (isVector: false).

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |

## `replace_image`

Relink a linked image to another file from an allowed directory, keeping its position and size unless keepBounds: false.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `path` * | string |  |
| `keepBounds` | boolean |  |

## `trace_image`

Convert a placed or raster image to vector paths with Illustrator's Image Trace. preset: an Illustrator tracing preset name (e.g. "[Default]", "Black and White Logo", "6 Colors", "High Fidelity Photo"). expand (default true) produces editable paths; expand: false leaves a live trace object, which is NOT editable vector yet.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `preset` | string |  |
| `expand` | boolean |  |
| `name` | string | Object name, used later to target it |

## `rename_artboard`

Rename an artboard by index.

| Parameter | Type | Notes |
|---|---|---|
| `index` * | integer |  |
| `name` * | string |  |

## `duplicate_artboard`

Duplicate an artboard, placed to its right (gap) or at dx/dy offset, copying the unlocked artwork that lies fully inside it.

| Parameter | Type | Notes |
|---|---|---|
| `index` * | integer |  |
| `name` | string |  |
| `gap` | number |  |
| `dx` | number |  |
| `dy` | number |  |
| `withArtwork` | boolean |  |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `delete_artboard`

Delete an artboard (artwork on it is kept). Destructive: requires confirm: true after asking the user.

> Destructive — requires `confirm: true`.

| Parameter | Type | Notes |
|---|---|---|
| `index` * | integer |  |
| `confirm` | boolean |  |

## `list_documents`

List all open Illustrator documents with path, saved state, color mode and which one is active.

## `activate_document`

Make an open document active, by name or by index from list_documents.

| Parameter | Type | Notes |
|---|---|---|
| `name` | string |  |
| `index` | integer |  |

## `undo`

Undo Illustrator steps in the active document. One step is one internal Illustrator change, not one tool call (a tool that draws 3 shapes creates about 3 steps), so inspect the document afterwards. Use redo to step forward again.

| Parameter | Type | Notes |
|---|---|---|
| `steps` | integer |  |

## `redo`

Redo steps previously undone with undo.

| Parameter | Type | Notes |
|---|---|---|
| `steps` | integer |  |

## `analyze_typography`

Group all text in the active document by font and size, flag inconsistencies (too many families/sizes, near-duplicate sizes, missing fonts, tiny text). Read-only.

## `apply_typography`

Apply fonts/sizes by role across all text, e.g. headings (minSize 24) → "Montserrat Bold", body (maxSize 14) → "Inter Regular". First matching rule wins; locked text is skipped. Use dryRun: true to preview which objects would change.

| Parameter | Type | Notes |
|---|---|---|
| `rules` * | array |  |
| `dryRun` | boolean |  |

## `save_design_system`

Store a reusable design system (palette roles, typography roles, spacing scale, grid, logo variants, guidelines) on disk so it can be applied to any document. Saving under an existing name requires overwrite: true.

| Parameter | Type | Notes |
|---|---|---|
| `system` * | object |  |
| `overwrite` | boolean |  |

## `list_design_systems`

List stored design systems.

## `get_design_system`

Read a stored design system by name.

| Parameter | Type | Notes |
|---|---|---|
| `name` * | string |  |

## `apply_design_system`

Apply a stored design system to the active document: adds its palette as a swatch group and applies its typography roles to matching text. Recolor specific objects afterwards with apply_color_palette using the returned palette. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `name` * | string |  |
| `swatches` | boolean |  |
| `typography` | boolean |  |
| `dryRun` | boolean |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `offset_path`

Offset Path: create a path offset outward (positive) or inward (negative) from each target. Keeps the originals unless replace: true. Result is expanded vector paths.

| Parameter | Type | Notes |
|---|---|---|
| `targets` | array | Multiple object references; defaults to current selection |
| `offset` * | number |  |
| `join` | string |  |
| `miterLimit` | number |  |
| `replace` | boolean |  |
| `name` | string | Object name, used later to target it |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `outline_stroke`

Outline Stroke: convert each target's stroke into a filled path (Object > Path > Outline Stroke).

| Parameter | Type | Notes |
|---|---|---|
| `targets` | array | Multiple object references; defaults to current selection |
| `name` | string | Object name, used later to target it |

## `expand_objects`

Expand targets. mode 'appearance' flattens live effects (Expand Appearance); 'full' also expands fills/strokes, symbols, blends and envelopes into plain paths.

| Parameter | Type | Notes |
|---|---|---|
| `targets` | array | Multiple object references; defaults to current selection |
| `mode` | string |  |
| `name` | string | Object name, used later to target it |

## `create_blend`

Make a blend between 2+ objects (Object > Blend > Make, smooth color steps). expand: true turns it into separate editable paths.

| Parameter | Type | Notes |
|---|---|---|
| `targets` * | array |  |
| `expand` | boolean |  |
| `name` | string | Object name, used later to target it |

## `release_blend`

Release a blend back into its original objects.

| Parameter | Type | Notes |
|---|---|---|
| `targets` | array | Multiple object references; defaults to current selection |

## `release_clipping_mask`

Release a clipping group: the mask path and contents become ordinary objects again.

| Parameter | Type | Notes |
|---|---|---|
| `targets` | array | Multiple object references; defaults to current selection |

## `release_compound_path`

Release a compound path into its separate paths.

| Parameter | Type | Notes |
|---|---|---|
| `targets` | array | Multiple object references; defaults to current selection |

## `create_text_style`

Create or update a named character or paragraph style (sizes in pt). Paragraph styles take both character and paragraph attributes.

| Parameter | Type | Notes |
|---|---|---|
| `kind` * | string |  |
| `name` * | string |  |
| `character` | object |  |
| `paragraph` | object |  |

## `apply_text_style`

Apply a named character or paragraph style to text frames (clears local overrides unless clearOverrides: false).

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `kind` * | string |  |
| `style` * | string |  |
| `clearOverrides` | boolean |  |

## `list_styles`

List the document's character styles, paragraph styles, graphic styles, brushes and symbols.

## `apply_graphic_style`

Apply a graphic style from the Graphic Styles panel to objects (merge: true adds it on top of the current appearance).

| Parameter | Type | Notes |
|---|---|---|
| `targets` | array | Multiple object references; defaults to current selection |
| `style` * | string |  |
| `merge` | boolean |  |

## `apply_brush`

Apply a brush from the document's Brushes panel (calligraphic, art, pattern, bristle, scatter) to paths.

| Parameter | Type | Notes |
|---|---|---|
| `targets` | array | Multiple object references; defaults to current selection |
| `brush` * | string |  |

## `create_spot_color`

Create (or update) a named spot or global process color swatch; optionally apply it with a tint to targets' fill or stroke.

| Parameter | Type | Notes |
|---|---|---|
| `name` * | string |  |
| `color` * | string |  |
| `process` | boolean | true = global process color instead of spot |
| `targets` | array | Multiple object references; defaults to current selection |
| `applyTo` | string |  |
| `tint` | number |  |

## `create_swatch_group`

Create a named swatch group (color group) containing the given colors.

| Parameter | Type | Notes |
|---|---|---|
| `name` * | string |  |
| `colors` * | array |  |

## `list_swatches`

List swatch groups, their swatches and the spot/global colors in the document.

## `place_symbol`

Place an instance of a document symbol at x/y (top-left, artboard origin, y down), optionally resized.

| Parameter | Type | Notes |
|---|---|---|
| `symbol` * | string |  |
| `x` * | number |  |
| `y` * | number |  |
| `width` | number |  |
| `height` | number |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `create_area_text`

Create area (paragraph) text that wraps inside a box, with optional columns/rows and character/paragraph attributes. Reports overflow.

| Parameter | Type | Notes |
|---|---|---|
| `content` * | string |  |
| `x` * | number |  |
| `y` * | number |  |
| `width` * | number |  |
| `height` * | number |  |
| `columns` | integer |  |
| `rows` | integer |  |
| `gutter` | number |  |
| `character` | object |  |
| `paragraph` | object |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `thread_text_frames`

Thread area text frames in order so overflow text flows from each frame into the next.

| Parameter | Type | Notes |
|---|---|---|
| `targets` * | array |  |

## `set_text_columns`

Set rows/columns and gutters of area text (Type > Area Type Options).

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `columns` | integer |  |
| `rows` | integer |  |
| `columnGutter` | number |  |
| `rowGutter` | number |  |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `set_text_attributes`

Set detailed character attributes (tracking, kerning, leading, baseline shift, scale, caps, super/subscript, OpenType ligatures/fractions/figures...) and paragraph attributes (indents, spacing, hyphenation, tab stops) on a frame or a character range. Values in pt.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `range` | object | Character range inside the frame; default whole frame |
| `character` | object |  |
| `paragraph` | object |  |

## `find_replace_text`

Find and replace text across all text frames (or the given targets), keeping surrounding formatting. Plain-text match.

| Parameter | Type | Notes |
|---|---|---|
| `find` * | string |  |
| `replace` * | string |  |
| `caseSensitive` | boolean |  |
| `targets` | array | Multiple object references; defaults to current selection |

## `run_action`

Play a recorded Illustrator action (Actions panel) by action and set name, optionally on selected targets. Actions can do anything the user recorded; confirm with the user first.

> Destructive — requires `confirm: true`.

| Parameter | Type | Notes |
|---|---|---|
| `action` * | string |  |
| `set` * | string |  |
| `targets` | array | Multiple object references; defaults to current selection |
| `confirm` | boolean |  |

## `fit_artboard_to_artwork`

Resize an artboard to fit its artwork (or the given targets), with optional padding.

| Parameter | Type | Notes |
|---|---|---|
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `targets` | array | Multiple object references; defaults to current selection |
| `padding` | number |  |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `export_artboards`

Batch-export every artboard (or listed ones) to separate files in a folder, one file per artboard per format, named <prefix>-<artboard name>.<ext>. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `folder` * | string |  |
| `prefix` | string |  |
| `formats` * | array |  |
| `artboards` | array |  |
| `ppi` | number |  |
| `overwrite` | boolean |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `data_merge_export`

Data merge: for each row, set named text frames' contents (row keys = text object names), export a PNG/JPG/PDF per row, then restore the original text. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `rows` * | array |  |
| `folder` * | string |  |
| `fileNameKey` | string | Row key used for each file name; default row-N |
| `format` | string |  |
| `ppi` | number |  |
| `overwrite` | boolean |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `bind_variable`

Bind an Illustrator variable (Variables panel) to an object: 'text' binds a text frame's content, 'visibility' binds visibility. Creates the variable if missing.

| Parameter | Type | Notes |
|---|---|---|
| `target` * | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `variable` * | string |  |
| `kind` | string |  |

## `list_variables`

List Illustrator variables, what they are bound to, and saved data sets.

## `capture_dataset`

Capture the current values of all variables as a named data set.

| Parameter | Type | Notes |
|---|---|---|
| `name` | string |  |

## `apply_dataset`

Display a saved data set (sets every bound object to that data set's values).

| Parameter | Type | Notes |
|---|---|---|
| `name` * | string |  |

## `print_document`

Print the active document to a printer (physical output). Ask the user first and pass confirm: true.

| Parameter | Type | Notes |
|---|---|---|
| `printer` | string |  |
| `copies` | integer |  |
| `confirm` | boolean |  |

## `draw_triangle`

Draw a triangle inside a box (x/y = top-left, y down): isosceles (apex top-center), right (right angle bottom-left) or equilateral (height derived from width).

| Parameter | Type | Notes |
|---|---|---|
| `kind` | string |  |
| `x` * | number |  |
| `y` * | number |  |
| `width` * | number |  |
| `height` | number |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |
| `fill` | union | Hex fill or "none" (default gray for closed shapes) |
| `stroke` | union |  |
| `opacity` | number |  |
| `rotation` | number |  |

## `draw_arc`

Draw an elliptical arc as true Bezier curves. Angles in degrees, clockwise from 3 o'clock (y down). closure: open (stroke only), pie (closed to the center) or chord.

| Parameter | Type | Notes |
|---|---|---|
| `cx` * | number |  |
| `cy` * | number |  |
| `radius` * | number |  |
| `radiusY` | number |  |
| `startAngle` * | number |  |
| `endAngle` * | number |  |
| `closure` | string |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |
| `fill` | union | Hex fill or "none" (default gray for closed shapes) |
| `stroke` | union |  |
| `opacity` | number |  |
| `rotation` | number |  |

## `draw_spiral`

Draw an Archimedean spiral (open smooth path) around cx/cy from innerRadius to outerRadius over the given number of turns.

| Parameter | Type | Notes |
|---|---|---|
| `cx` * | number |  |
| `cy` * | number |  |
| `outerRadius` * | number |  |
| `innerRadius` | number |  |
| `turns` | number |  |
| `clockwise` | boolean |  |
| `name` | string | Object name, used later to target it |
| `layer` | string | Target layer name (created if missing) |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |
| `fill` | union | Hex fill or "none" (default gray for closed shapes) |
| `stroke` | union |  |
| `opacity` | number |  |
| `rotation` | number |  |

## `shear_objects`

Shear (skew) objects about their centers. angleX slants vertical edges (positive leans the top right); angleY slants horizontal edges.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `angleX` | number |  |
| `angleY` | number |  |

## `select_all`

Select every unlocked, visible object (or only those on one artboard), or clear the selection with deselect: true.

| Parameter | Type | Notes |
|---|---|---|
| `deselect` | boolean |  |
| `activeArtboardOnly` | boolean |  |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |

## `get_object_properties`

Full verified properties of objects: bounds, fill/stroke, text attributes, parent layer, stacking position, path area/length and transformation matrix where Illustrator exposes one.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `deep` | boolean | Include group children |

## `duplicate_layer`

Duplicate a layer with all its objects and sublayers, placed directly above the original.

| Parameter | Type | Notes |
|---|---|---|
| `name` * | string |  |
| `newName` | string |  |

## `create_sublayer`

Create a sublayer inside an existing layer.

| Parameter | Type | Notes |
|---|---|---|
| `parent` * | string |  |
| `name` * | string |  |
| `position` | string |  |

## `get_document_settings`

Document settings: color mode, color profile, ruler units and origin, raster effects resolution, artboards and object counts.

## `set_raster_effects_resolution`

Set Document Raster Effects resolution (ppi) used for shadows, blurs and other raster effects; 300 for print. Verified by reading it back.

| Parameter | Type | Notes |
|---|---|---|
| `resolution` * | integer |  |

## `export_tiff`

Export artboards to TIFF (RGB, CMYK or grayscale) at the given resolution. Multiple artboards get numbered files. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `path` * | string |  |
| `overwrite` | boolean |  |
| `ppi` | number |  |
| `colorSpace` | string |  |
| `lzw` | boolean |  |
| `artboards` | string | Range like '1-3,5' (1-based); default all |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `export_selection`

Export only the given objects (or the selection) to PNG or SVG, cropped to their bounds plus padding. Uses a temporary document that is closed without saving; the original is untouched.

| Parameter | Type | Notes |
|---|---|---|
| `target` | union | Object reference: "selection" or {name, layer?} / {uuid} |
| `targets` | array | Multiple object references; defaults to current selection |
| `artboard` | integer | Artboard index used as the coordinate origin (default: active) |
| `path` * | string |  |
| `overwrite` | boolean |  |
| `format` | string |  |
| `ppi` | number |  |
| `transparent` | boolean |  |
| `padding` | number |  |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |

## `export_print_pdf`

Export a print-ready PDF: PDF/X preset (default [PDF/X-4:2008]), bleed and crop marks, optional registration marks, color bars and page info. Written as a copy; a saved .ai stays the working file (same save-first rule as export_pdf). Run preflight_document first. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `path` * | string |  |
| `overwrite` | boolean |  |
| `preset` | string |  |
| `bleed` | number | Bleed on every side, in `units` (default mm) |
| `units` | string | Units for coordinates/sizes in this call (default: session units, initially pt) |
| `cropMarks` | boolean |  |
| `registrationMarks` | boolean |  |
| `colorBars` | boolean |  |
| `pageInfo` | boolean |  |
| `artboards` | string | Range like '1-3,5' (1-based); default all |
| `allowRetarget` | boolean |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `preflight_document`

Read-only production check: stray points, unpainted paths, hairlines, small or overset text, missing fonts and links, low-resolution images, RGB colors in CMYK documents, empty and hidden layers. Returns issues by severity; passed is false when any error is found. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `forPrint` | boolean |  |
| `minTextSize` | number |  |
| `minStrokeWidth` | number |  |
| `minPpi` | integer |  |
| `limit` | integer |  |
| `maxIssues` | integer |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `cleanup_document`

Remove stray anchor points, empty text frames, unpainted paths and empty layers (locked/hidden items are left alone). dryRun (default) only lists candidates; removing requires dryRun: false and confirm: true.

> Destructive — requires `confirm: true`.

| Parameter | Type | Notes |
|---|---|---|
| `remove` | array |  |
| `dryRun` | boolean |  |
| `confirm` | boolean |  |

## `batch_operation`

Run a list of tool calls in order in one request ({ tool, args } each; any tool except batch/job tools). Each step is validated like a direct call and keeps its own confirm rules. Stops at the first failure unless continueOnError. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `steps` * | array |  |
| `continueOnError` | boolean |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `generate_design_report`

Summary report of the active document for review or handoff: settings, layers, fonts, swatches, linked assets and preflight issues, as structured data plus Markdown. Supports background: true for long runs (returns a jobId; poll get_job).

| Parameter | Type | Notes |
|---|---|---|
| `forPrint` | boolean |  |
| `background` | boolean | Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job. |

## `get_job`

Status of a background job (queued | running | succeeded | failed | cancelled). When it has succeeded, also returns the tool's full result, including any preview image.

| Parameter | Type | Notes |
|---|---|---|
| `jobId` * | string | Id returned by a tool called with background: true |

## `wait_for_job`

Wait up to timeoutSeconds for a background job to finish, then return it as get_job does. If it is still running, call again; the job keeps going either way.

| Parameter | Type | Notes |
|---|---|---|
| `jobId` * | string | Id returned by a tool called with background: true |
| `timeoutSeconds` | integer |  |

## `list_jobs`

List recent background jobs, newest first (results omitted; use get_job).

## `cancel_job`

Cancel a queued background job. A job already running inside Illustrator cannot be interrupted; the result says so.

| Parameter | Type | Notes |
|---|---|---|
| `jobId` * | string | Id returned by a tool called with background: true |
