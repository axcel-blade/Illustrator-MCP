import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PROJECT_ROOT } from "../../config/index.js";

export const SCRIPT_DIR = join(PROJECT_ROOT, "illustrator-scripts");
const MODULES = ["bootstrap.jsx", "document.jsx", "shapes.jsx", "typography.jsx", "objects.jsx", "layers.jsx", "export.jsx", "design.jsx", "advanced.jsx", "extended.jsx", "production.jsx"];

/**
 * Operations the JSX layer implements. The bridge refuses anything else before Illustrator
 * is contacted, and the JSX dispatcher refuses again on its side.
 */
export const ALLOWED_OPS = new Set([
  "status", "create_document", "open_document", "close_document", "save_document", "save_document_as", "save_file", "open_file",
  "inspect_document", "get_artboards", "create_artboard", "resize_artboard", "set_document_color_mode",
  "set_document_units", "place_image", "inspect_assets", "embed_images",
  "draw_rectangle", "draw_ellipse", "draw_polygon", "draw_star", "draw_line", "draw_pen_path",
  "create_compound_path", "create_clipping_mask", "create_symbol", "create_pattern",
  "add_text", "style_text", "edit_text", "create_text_on_path", "convert_text_to_outlines", "inspect_fonts", "check_fonts",
  "select_objects", "inspect_selection", "transform_objects", "duplicate_object", "delete_object", "group_objects",
  "ungroup_objects", "set_properties", "set_z_order", "set_appearance", "apply_effect", "create_swatches",
  "align_objects", "distribute_objects", "arrange_objects", "center_on_artboard", "calculate_object_bounds",
  "create_guides", "create_grid",
  "inspect_layers", "create_layer", "delete_layer", "update_layer", "move_object_to_layer", "reorder_layers",
  "export_png", "export_jpg", "export_svg", "export_pdf", "export_eps",
  "execute_plan", "update_elements",
  "pathfinder", "flip_objects", "edit_path_points", "reverse_path", "set_path_closed", "split_path", "join_paths", "simplify_path",
  "get_image_info", "replace_image", "trace_image", "rename_artboard", "delete_artboard", "duplicate_artboard",
  "list_documents", "activate_document", "undo", "redo", "analyze_typography", "apply_typography_roles",
  "offset_path", "outline_stroke", "expand_objects", "create_blend", "release_blend", "release_clipping_mask", "release_compound_path",
  "create_text_style", "apply_text_style", "list_styles", "apply_graphic_style", "apply_brush", "create_spot_color", "create_swatch_group", "list_swatches", "place_symbol",
  "create_area_text", "thread_text_frames", "set_text_columns", "set_text_attributes", "find_replace_text",
  "shear_objects", "select_all", "get_object_properties", "duplicate_layer", "create_sublayer", "get_document_settings", "set_raster_effects_resolution",
  "export_tiff", "export_selection", "export_print_pdf", "preflight_document", "cleanup_document",
  "run_action", "fit_artboard_to_artwork", "bind_variable", "list_variables", "capture_dataset", "apply_dataset", "print_document",
]);

let cachedLibrary: string | undefined;

export function loadScriptLibrary(): string {
  if (!cachedLibrary) {
    cachedLibrary = MODULES.map((m) => `// ---- ${m} ----\n` + readFileSync(join(SCRIPT_DIR, m), "utf8")).join("\n");
  }
  return cachedLibrary;
}

/** JSON is valid ES3 when non-ASCII and the U+2028/9 separators are escaped. */
export function toJsxLiteral(value: unknown): string {
  return JSON.stringify(value).replace(/[\u007f-￿]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

/** `doc` pins the target document: the JSX activates it (when open) before running the op. */
export function buildScript(op: string, args: unknown, resultPath: string, doc?: string): string {
  const command = toJsxLiteral(doc === undefined ? { op, args } : { op, args, doc });
  const result = toJsxLiteral(resultPath);
  return `${loadScriptLibrary()}\n// ---- invocation ----\nMCP.main(${command}, ${result});\n`;
}
