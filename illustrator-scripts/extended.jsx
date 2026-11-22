/*
 * Extended operations: path/object commands (offset, outline stroke, expand, blends, warp,
 * releases), styles & swatches (character/paragraph/graphic styles, spot colors, swatch
 * groups, brushes, symbol instances), text layout (area text, threading, columns, character
 * and paragraph attributes, find & replace) and automation (actions, fit artboard, variables,
 * print).
 * Requires bootstrap.jsx, objects.jsx (MCP.targets, MCP.infos), typography.jsx (MCP.textTargets)
 * and advanced.jsx.
 */

/* ---------------- helpers ---------------- */

/* Select exactly the given items, run menu commands, return what Illustrator left selected. */
MCP.runOnSelection = function (items, commands) {
  var doc = MCP.doc();
  for (var i = 0; i < items.length; i++) {
    if (items[i].locked || items[i].hidden) MCP.fail("VALIDATION_ERROR", "Object is locked or hidden: " + (items[i].name || items[i].typename));
  }
  doc.selection = null;
  for (var j = 0; j < items.length; j++) items[j].selected = true;
  for (var k = 0; k < commands.length; k++) { app.executeMenuCommand(commands[k]); try { app.redraw(); } catch (e) { /* no window */ } }
  var sel = doc.selection, out = [];
  if (sel) for (var s = 0; s < sel.length; s++) out.push(sel[s]);
  return out;
};

MCP.resultOf = function (items, name) {
  if (!items.length) MCP.fail("ILLUSTRATOR_SCRIPT_ERROR", "The command produced no result (nothing selected afterwards).");
  if (name) { if (items.length === 1) items[0].name = name; else for (var i = 0; i < items.length; i++) items[i].name = name + " " + (i + 1); }
  MCP.doc().selection = null;
  return MCP.infos(items);
};

MCP.byName = function (collection, name, what) {
  for (var i = 0; i < collection.length; i++) if (collection[i].name === name) return collection[i];
  MCP.fail("OBJECT_NOT_FOUND", what + " not found: " + name);
};

MCP.names = function (collection) {
  var out = [];
  for (var i = 0; i < collection.length; i++) out.push(collection[i].name);
  return out;
};

/* ---------------- path & object ops ---------------- */

MCP.JOINS = { miter: 4, round: 0, bevel: 2 };

MCP.ops.offset_path = function (a) {
  var items = MCP.targets(a);
  var jn = MCP.JOINS[a.join || "miter"];
  var xml = '<LiveEffect name="Adobe Offset Path"><Dict data="R mlim ' + (a.miterLimit || 4) + " R ofst " + a.offset + " I jntp " + jn + ' "/></LiveEffect>';
  var made = [];
  for (var i = 0; i < items.length; i++) {
    var src = items[i];
    /* The live effect replaces the shape on expand; work on a copy unless replace is set. */
    var it = a.replace ? src : src.duplicate(src, ElementPlacement.PLACEBEFORE);
    it.applyEffect(xml);
    var res = MCP.runOnSelection([it], ["expandStyle"]);
    for (var r = 0; r < res.length; r++) made.push(res[r]);
  }
  return MCP.resultOf(made, a.name);
};

MCP.ops.outline_stroke = function (a) {
  var items = MCP.targets(a);
  for (var i = 0; i < items.length; i++) {
    if (items[i].typename === "PathItem" && !items[i].stroked) MCP.fail("VALIDATION_ERROR", "Object has no stroke: " + (items[i].name || items[i].typename));
  }
  return MCP.resultOf(MCP.runOnSelection(items, ["OffsetPath v23"]), a.name);
};

MCP.ops.expand_objects = function (a) {
  var items = MCP.targets(a);
  /* expandStyle flattens live effects/appearance; Expand3 expands fills, strokes, symbols, blends. */
  var cmds = a.mode === "appearance" ? ["expandStyle"] : ["expandStyle", "Expand3"];
  return MCP.resultOf(MCP.runOnSelection(items, cmds), a.name);
};

MCP.ops.create_blend = function (a) {
  var items = MCP.targets(a);
  if (items.length < 2) MCP.fail("VALIDATION_ERROR", "A blend needs at least 2 objects.");
  var cmds = ["Path Blend Make"];
  if (a.expand) cmds.push("Path Blend Expand");
  var res = MCP.runOnSelection(items, cmds);
  if (a.expand && a.name) { for (var i = 0; i < res.length; i++) res[i].name = a.name; }
  return MCP.resultOf(res, a.expand ? undefined : a.name);
};

MCP.ops.release_blend = function (a) {
  return MCP.resultOf(MCP.runOnSelection(MCP.targets(a), ["Path Blend Release"]));
};

MCP.WARPS = { arc: 1, arcLower: 2, arcUpper: 3, arch: 4, bulge: 5, shellLower: 6, shellUpper: 7, flag: 8, wave: 9,
  fish: 10, rise: 11, fisheye: 12, inflate: 13, squeeze: 14, twist: 15 };

MCP.ops.warp_objects = function (a) {
  var items = MCP.targets(a);
  var style = MCP.WARPS[a.style];
  if (!style) MCP.fail("VALIDATION_ERROR", "Unknown warp style " + a.style);
  var xml = '<LiveEffect name="Adobe Deform"><Dict data="R DeformValue ' + (a.bend / 100) + " R DeformVertical " + ((a.distortVertical || 0) / 100) +
    " R DeformHorizontal " + ((a.distortHorizontal || 0) / 100) + " I DeformStyle " + style + " B Rotate " + (a.vertical ? 1 : 0) + ' "/></LiveEffect>';
  for (var i = 0; i < items.length; i++) items[i].applyEffect(xml);
  if (a.expand) return MCP.resultOf(MCP.runOnSelection(items, ["expandStyle"]), a.name);
  return MCP.infos(items);
};

MCP.ops.release_clipping_mask = function (a) {
  var items = MCP.targets(a);
  for (var i = 0; i < items.length; i++) {
    if (!(items[i].typename === "GroupItem" && items[i].clipped)) MCP.fail("VALIDATION_ERROR", "Not a clipping group: " + (items[i].name || items[i].typename));
  }
  return MCP.resultOf(MCP.runOnSelection(items, ["releaseMask"]));
};

MCP.ops.release_compound_path = function (a) {
  var items = MCP.targets(a);
  for (var i = 0; i < items.length; i++) {
    if (items[i].typename !== "CompoundPathItem") MCP.fail("VALIDATION_ERROR", "Not a compound path: " + (items[i].name || items[i].typename));
  }
  return MCP.resultOf(MCP.runOnSelection(items, ["noCompoundPath"]));
};

/* ---------------- styles & swatches ---------------- */

MCP.applyCharAttrs = function (ca, s) {
  if (s.font) ca.textFont = MCP.findFont(s.font);
  if (s.fontSize !== undefined) ca.size = s.fontSize;
  if (s.color) ca.fillColor = MCP.color(s.color);
  if (s.tracking !== undefined) ca.tracking = s.tracking;
  if (s.leading !== undefined) { ca.autoLeading = false; ca.leading = s.leading; }
  if (s.autoLeading) ca.autoLeading = true;
  if (s.kerning !== undefined) {
    if (s.kerning === "auto") ca.kerningMethod = AutoKernType.AUTO;
    else if (s.kerning === "optical") ca.kerningMethod = AutoKernType.OPTICAL;
    else if (s.kerning === "none") ca.kerningMethod = AutoKernType.NOAUTOKERN;
  }
  if (s.baselineShift !== undefined) ca.baselineShift = s.baselineShift;
  if (s.horizontalScale !== undefined) ca.horizontalScale = s.horizontalScale;
  if (s.verticalScale !== undefined) ca.verticalScale = s.verticalScale;
  if (s.rotation !== undefined) ca.rotation = s.rotation;
  if (s.underline !== undefined) ca.underline = s.underline;
  if (s.strikeThrough !== undefined) ca.strikeThrough = s.strikeThrough;
  if (s.capitalization) {
    ca.capitalization = { normal: FontCapsOption.NORMALCAPS, allCaps: FontCapsOption.ALLCAPS, smallCaps: FontCapsOption.SMALLCAPS,
      allSmallCaps: FontCapsOption.ALLSMALLCAPS }[s.capitalization];
  }
  if (s.ligatures !== undefined) ca.ligature = s.ligatures;
  if (s.discretionaryLigatures !== undefined) ca.discretionaryLigature = s.discretionaryLigatures;
  if (s.fractions !== undefined) ca.fractions = s.fractions;
  if (s.ordinals !== undefined) ca.ordinals = s.ordinals;
  if (s.swash !== undefined) ca.swash = s.swash;
  if (s.stylisticAlternates !== undefined) ca.stylisticAlternates = s.stylisticAlternates;
  if (s.figureStyle) {
    ca.figureStyle = { "default": FigureStyleType.DEFAULTFIGURESTYLE, tabularLining: FigureStyleType.TABULAR,
      proportionalOldstyle: FigureStyleType.PROPORTIONALOLDSTYLE, proportionalLining: FigureStyleType.PROPORTIONAL,
      tabularOldstyle: FigureStyleType.TABULAROLDSTYLE }[s.figureStyle];
  }
  if (s.position) {
    ca.baselinePosition = { normal: FontBaselineOption.NORMALBASELINE, superscript: FontBaselineOption.SUPERSCRIPT,
      subscript: FontBaselineOption.SUBSCRIPT }[s.position];
  }
};

MCP.JUSTIFY = { left: "LEFT", center: "CENTER", right: "RIGHT", justify: "FULLJUSTIFYLASTLINELEFT", justifyAll: "FULLJUSTIFY" };

MCP.applyParaAttrs = function (pa, s) {
  if (s.align) pa.justification = Justification[MCP.JUSTIFY[s.align]];
  if (s.firstLineIndent !== undefined) pa.firstLineIndent = s.firstLineIndent;
  if (s.leftIndent !== undefined) pa.leftIndent = s.leftIndent;
  if (s.rightIndent !== undefined) pa.rightIndent = s.rightIndent;
  if (s.spaceBefore !== undefined) pa.spaceBefore = s.spaceBefore;
  if (s.spaceAfter !== undefined) pa.spaceAfter = s.spaceAfter;
  if (s.hyphenation !== undefined) pa.hyphenation = s.hyphenation;
  if (s.tabStops) {
    var stops = [];
    for (var i = 0; i < s.tabStops.length; i++) {
      var t = new TabStopInfo();
      t.position = s.tabStops[i].position;
      t.alignment = { left: TabStopAlignment.Left, center: TabStopAlignment.Center, right: TabStopAlignment.Right,
        decimal: TabStopAlignment.Decimal }[s.tabStops[i].align || "left"];
      if (s.tabStops[i].leader) t.leader = s.tabStops[i].leader;
      stops.push(t);
    }
    pa.tabStops = stops;
  }
};

MCP.upsertStyle = function (collection, name) {
  for (var i = 0; i < collection.length; i++) if (collection[i].name === name) return collection[i];
  return collection.add(name);
};

MCP.ops.create_text_style = function (a) {
  var doc = MCP.doc();
  var st;
  if (a.kind === "character") { st = MCP.upsertStyle(doc.characterStyles, a.name); MCP.applyCharAttrs(st.characterAttributes, a.character || {}); }
  else {
    st = MCP.upsertStyle(doc.paragraphStyles, a.name);
    MCP.applyCharAttrs(st.characterAttributes, a.character || {});
    MCP.applyParaAttrs(st.paragraphAttributes, a.paragraph || {});
  }
  return { name: st.name, kind: a.kind };
};

MCP.ops.apply_text_style = function (a) {
  var doc = MCP.doc();
  var items = MCP.textTargets(a);
  var st = a.kind === "character" ? MCP.byName(doc.characterStyles, a.style, "Character style") : MCP.byName(doc.paragraphStyles, a.style, "Paragraph style");
  for (var i = 0; i < items.length; i++) {
    if (a.kind === "character") st.applyTo(items[i].textRange, a.clearOverrides !== false);
    else for (var p = 0; p < items[i].paragraphs.length; p++) st.applyTo(items[i].paragraphs[p], a.clearOverrides !== false);
  }
  return MCP.infos(items);
};

MCP.ops.list_styles = function () {
  var doc = MCP.doc();
  return { characterStyles: MCP.names(doc.characterStyles), paragraphStyles: MCP.names(doc.paragraphStyles),
    graphicStyles: MCP.names(doc.graphicStyles), brushes: MCP.names(doc.brushes), symbols: MCP.names(doc.symbols) };
};

MCP.ops.apply_graphic_style = function (a) {
  var doc = MCP.doc();
  var st = MCP.byName(doc.graphicStyles, a.style, "Graphic style");
  var items = MCP.targets(a);
  for (var i = 0; i < items.length; i++) { if (a.merge) st.mergeTo(items[i]); else st.applyTo(items[i]); }
  return MCP.infos(items);
};

MCP.ops.apply_brush = function (a) {
  var doc = MCP.doc();
  var br = MCP.byName(doc.brushes, a.brush, "Brush");
  var items = MCP.targets(a);
  for (var i = 0; i < items.length; i++) br.applyTo(items[i]);
  return MCP.infos(items);
};

MCP.ops.create_spot_color = function (a) {
  var doc = MCP.doc();
  var spot;
  for (var i = 0; i < doc.spots.length; i++) if (doc.spots[i].name === a.name) spot = doc.spots[i];
  if (!spot) { spot = doc.spots.add(); spot.name = a.name; }
  spot.color = MCP.color(a.color);
  spot.colorType = a.process ? ColorModel.PROCESS : ColorModel.SPOT;
  var res = { name: spot.name, type: a.process ? "process" : "spot", color: MCP.describeColor(spot.color), applied: 0 };
  if (a.targets) {
    var items = MCP.findAll(doc, a.targets);
    var sc = new SpotColor(); sc.spot = spot; sc.tint = a.tint === undefined ? 100 : a.tint;
    for (var j = 0; j < items.length; j++) {
      if (a.applyTo === "stroke") { items[j].stroked = true; items[j].strokeColor = sc; } else { items[j].filled = true; items[j].fillColor = sc; }
    }
    res.applied = items.length;
  }
  return res;
};

MCP.ops.create_swatch_group = function (a) {
  var doc = MCP.doc();
  var g;
  for (var i = 0; i < doc.swatchGroups.length; i++) if (doc.swatchGroups[i].name === a.name) g = doc.swatchGroups[i];
  if (!g) { g = doc.swatchGroups.add(); g.name = a.name; }
  for (var c = 0; c < a.colors.length; c++) {
    var sw = doc.swatches.add();
    sw.name = a.colors[c].name;
    sw.color = MCP.color(a.colors[c].color);
    g.addSwatch(sw);
  }
  return { name: g.name, swatches: MCP.names(g.getAllSwatches()) };
};

MCP.ops.list_swatches = function () {
  var doc = MCP.doc();
  var groups = [];
  for (var i = 0; i < doc.swatchGroups.length; i++) groups.push({ name: doc.swatchGroups[i].name, swatches: MCP.names(doc.swatchGroups[i].getAllSwatches()) });
  var spots = [];
  for (var s = 0; s < doc.spots.length; s++) {
    try { spots.push({ name: doc.spots[s].name, type: doc.spots[s].colorType === ColorModel.SPOT ? "spot" : "process" }); } catch (e) { /* registration */ }
  }
  return { swatchCount: doc.swatches.length, groups: groups, spots: spots };
};

MCP.ops.place_symbol = function (a) {
  var doc = MCP.doc();
  MCP.useArtboard(doc, a.artboard);
  var sym = MCP.byName(doc.symbols, a.symbol, "Symbol");
  var layer = MCP.targetLayer(doc, a.layer);
  var inst = layer.symbolItems.add(sym);
  if (a.width !== undefined || a.height !== undefined) MCP.resizeTo(inst, a.width, a.height);
  MCP.moveTo(inst, a.x, a.y);
  if (a.name) inst.name = a.name;
  return MCP.info(inst);
};

/* ---------------- text layout ---------------- */

MCP.ops.create_area_text = function (a) {
  var doc = MCP.doc();
  MCP.useArtboard(doc, a.artboard);
  var layer = MCP.targetLayer(doc, a.layer);
  var rect = layer.pathItems.rectangle(-a.y, a.x, a.width, a.height);
  var tf = layer.textFrames.areaText(rect);
  if (a.content) tf.contents = a.content;
  if (a.columns) tf.columnCount = a.columns;
  if (a.rows) tf.rowCount = a.rows;
  if (a.gutter !== undefined) { tf.columnGutter = a.gutter; tf.rowGutter = a.gutter; }
  MCP.applyCharAttrs(tf.textRange.characterAttributes, a.character || {});
  MCP.applyParaAttrs(tf.textRange.paragraphAttributes, a.paragraph || {});
  if (a.name) tf.name = a.name;
  var o = MCP.info(tf);
  o.overflow = MCP.overflows(tf);
  return o;
};

/* An area-text frame overflows when its visible lines hold fewer characters than its story. */
MCP.overflows = function (tf) {
  try {
    if (tf.kind !== TextType.AREATEXT) return false;
    var shown = 0;
    for (var i = 0; i < tf.lines.length; i++) shown += tf.lines[i].characters.length;
    return shown < tf.characters.length;
  } catch (e) { return null; }
};

MCP.ops.thread_text_frames = function (a) {
  var doc = MCP.doc();
  var frames = MCP.findAll(doc, a.targets);
  for (var i = 0; i < frames.length; i++) {
    if (frames[i].typename !== "TextFrame" || frames[i].kind !== TextType.AREATEXT) MCP.fail("VALIDATION_ERROR", "Only area text frames can be threaded: " + (frames[i].name || frames[i].typename));
  }
  for (var j = 0; j < frames.length - 1; j++) frames[j].nextFrame = frames[j + 1];
  var out = [];
  for (var k = 0; k < frames.length; k++) { var o = MCP.info(frames[k]); o.overflow = MCP.overflows(frames[k]); out.push(o); }
  return { items: out, count: out.length };
};

MCP.ops.set_text_columns = function (a) {
  var items = MCP.textTargets(a);
  for (var i = 0; i < items.length; i++) {
    var tf = items[i];
    if (tf.kind !== TextType.AREATEXT) MCP.fail("VALIDATION_ERROR", "Columns need area text: " + tf.name);
    if (a.columns) tf.columnCount = a.columns;
    if (a.rows) tf.rowCount = a.rows;
    if (a.columnGutter !== undefined) tf.columnGutter = a.columnGutter;
    if (a.rowGutter !== undefined) tf.rowGutter = a.rowGutter;
  }
  var o = MCP.info(items[0]);
  o.columns = items[0].columnCount; o.rows = items[0].rowCount; o.overflow = MCP.overflows(items[0]);
  return o;
};

MCP.textRangeOf = function (tf, range) {
  if (!range) return tf.textRange;
  var n = tf.characters.length;
  if (range.start < 0 || range.start >= n) MCP.fail("VALIDATION_ERROR", "Range start " + range.start + " is out of range (0.." + (n - 1) + ").");
  var r = tf.characters[range.start];
  var len = Math.min(range.length || 1, n - range.start);
  if (len > 1) r.length = len;
  return r;
};

MCP.ops.set_text_attributes = function (a) {
  var items = MCP.textTargets(a);
  for (var i = 0; i < items.length; i++) {
    var r = MCP.textRangeOf(items[i], a.range);
    if (a.character) MCP.applyCharAttrs(r.characterAttributes, a.character);
    if (a.paragraph) MCP.applyParaAttrs(r.paragraphAttributes, a.paragraph);
  }
  var o = MCP.info(items[0]);
  var ca = MCP.textRangeOf(items[0], a.range).characterAttributes;
  o.attributes = { size: ca.size, tracking: ca.tracking, leading: ca.autoLeading ? null : ca.leading, baselineShift: ca.baselineShift,
    horizontalScale: ca.horizontalScale, verticalScale: ca.verticalScale, underline: ca.underline, capitalization: String(ca.capitalization) };
  return o;
};

/* Replace inside ranges so formatting around the match is kept. */
MCP.replaceInFrame = function (tf, find, repl, caseSensitive) {
  var count = 0, guard = 0;
  var from = 0;
  while (guard++ < 10000) {
    var s = tf.contents;
    var hay = caseSensitive ? s : s.toLowerCase(), needle = caseSensitive ? find : find.toLowerCase();
    var at = hay.indexOf(needle, from);
    if (at < 0) break;
    var r = tf.characters[at];
    if (find.length > 1) r.length = find.length;
    r.contents = repl;
    from = at + repl.length;
    count++;
  }
  return count;
};

MCP.ops.find_replace_text = function (a) {
  var doc = MCP.doc();
  var frames = a.targets ? MCP.findAll(doc, a.targets) : doc.textFrames;
  var changed = [], total = 0;
  for (var i = 0; i < frames.length; i++) {
    var tf = frames[i];
    if (tf.typename !== "TextFrame" || tf.locked) continue;
    var n = MCP.replaceInFrame(tf, a.find, a.replace, a.caseSensitive === true);
    if (n) { total += n; changed.push({ name: tf.name, replacements: n, contents: tf.contents }); }
  }
  return { replacements: total, frames: changed };
};

/* ---------------- automation ---------------- */

MCP.ops.run_action = function (a) {
  MCP.doc();
  if (a.targets) {
    var items = MCP.findAll(MCP.doc(), a.targets);
    MCP.doc().selection = null;
    for (var i = 0; i < items.length; i++) items[i].selected = true;
  }
  app.doScript(a.action, a.set, false);
  var sel = MCP.doc().selection, out = [];
  if (sel) for (var s = 0; s < sel.length && s < 50; s++) out.push(MCP.info(sel[s]));
  return { action: a.action, set: a.set, selectionAfter: out };
};

MCP.ops.fit_artboard_to_artwork = function (a) {
  var doc = MCP.doc();
  var idx = MCP.useArtboard(doc, a.artboard);
  var pad = a.padding || 0;
  if (a.targets) {
    var items = MCP.findAll(doc, a.targets);
    var b = null;
    for (var i = 0; i < items.length; i++) {
      var v = items[i].visibleBounds;
      b = b ? [Math.min(b[0], v[0]), Math.max(b[1], v[1]), Math.max(b[2], v[2]), Math.min(b[3], v[3])] : [v[0], v[1], v[2], v[3]];
    }
    app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
    var ab = doc.artboards[idx];
    /* Bounds were read in artboard coordinates; convert by the artboard's current origin. */
    var r0 = ab.artboardRect;
    ab.artboardRect = [r0[0] + b[0] - pad, r0[1] + b[1] + pad, r0[0] + b[2] + pad, r0[1] + b[3] - pad];
  } else {
    doc.selection = null;
    doc.selectObjectsOnActiveArtboard();
    if (!doc.selection || doc.selection.length === 0) MCP.fail("VALIDATION_ERROR", "The artboard has no artwork to fit.");
    doc.fitArtboardToSelectedArt(idx);
    if (pad) {
      app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
      var r = doc.artboards[idx].artboardRect;
      doc.artboards[idx].artboardRect = [r[0] - pad, r[1] + pad, r[2] + pad, r[3] - pad];
    }
    doc.selection = null;
  }
  app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;
  var rr = doc.artboards[idx].artboardRect;
  return { index: idx, name: doc.artboards[idx].name, width: rr[2] - rr[0], height: rr[1] - rr[3] };
};

MCP.ops.bind_variable = function (a) {
  var doc = MCP.doc();
  var item = MCP.findOne(doc, a.target);
  var v;
  for (var i = 0; i < doc.variables.length; i++) if (doc.variables[i].name === a.variable) v = doc.variables[i];
  if (!v) {
    v = doc.variables.add();
    v.name = a.variable;
    v.kind = a.kind === "visibility" ? VariableKind.VISIBILITY : VariableKind.TEXTUAL;
  }
  if (a.kind === "visibility") item.visibilityVariable = v;
  else {
    if (item.typename !== "TextFrame") MCP.fail("VALIDATION_ERROR", "Text variables bind to text frames: " + (item.name || item.typename));
    item.contentVariable = v;
  }
  return MCP.ops.list_variables();
};

MCP.ops.list_variables = function () {
  var doc = MCP.doc();
  var vars = [];
  for (var i = 0; i < doc.variables.length; i++) {
    var v = doc.variables[i], bound = [];
    for (var p = 0; p < v.pageItems.length; p++) bound.push(v.pageItems[p].name);
    vars.push({ name: v.name, kind: String(v.kind), boundTo: bound });
  }
  return { variables: vars, dataSets: MCP.names(doc.dataSets) };
};

MCP.ops.capture_dataset = function (a) {
  var doc = MCP.doc();
  var ds = doc.dataSets.add();
  if (a.name) ds.name = a.name;
  return { name: ds.name, dataSets: MCP.names(doc.dataSets) };
};

MCP.ops.apply_dataset = function (a) {
  var doc = MCP.doc();
  MCP.byName(doc.dataSets, a.name, "Data set").display();
  return { applied: a.name };
};

MCP.ops.print_document = function (a) {
  var doc = MCP.doc();
  var opts = new PrintOptions();
  if (a.printer) opts.printerName = a.printer;
  var jo = new PrintJobOptions();
  jo.copies = a.copies || 1;
  opts.jobOptions = jo;
  doc.print(opts);
  return { printed: doc.name, printer: a.printer || "default", copies: jo.copies };
};

