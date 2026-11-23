/* Object, layer, print-production and document-hygiene operations. Requires bootstrap.jsx, objects.jsx, export.jsx, extended.jsx. */

/* ---------------- objects ---------------- */

/* Shear about each object's center. Angles in degrees; positive x-shear slants the top to the right (y-down convention). */
MCP.ops.shear_objects = function (a) {
  var items = MCP.targets(a);
  var m = app.getIdentityMatrix();
  if (a.angleX) m.mValueC = Math.tan(a.angleX * Math.PI / 180);
  if (a.angleY) m.mValueB = -Math.tan(a.angleY * Math.PI / 180);
  for (var i = 0; i < items.length; i++) items[i].transform(m, true, true, true, true, 1, Transformation.CENTER);
  return MCP.infos(items);
};

MCP.ops.select_all = function (a) {
  var doc = MCP.doc();
  if (a.deselect) { doc.selection = null; return { selected: 0 }; }
  if (a.activeArtboardOnly) { MCP.useArtboard(doc, a.artboard); doc.selectObjectsOnActiveArtboard(); }
  else app.executeMenuCommand("selectall");
  return { selected: doc.selection ? doc.selection.length : 0 };
};

MCP.ops.get_object_properties = function (a) {
  var items = MCP.targets(a);
  var out = [];
  for (var i = 0; i < items.length; i++) {
    var o = MCP.info(items[i], a.deep);
    try { o.parentLayer = MCP.layerOf(items[i]).name; } catch (e) { /* n/a */ }
    try { o.zOrderPosition = items[i].zOrderPosition; } catch (e2) { /* n/a */ }
    try { if (items[i].typename === "PathItem") { o.area = Math.abs(items[i].area); o.length = items[i].length; o.guides = items[i].guides; } } catch (e3) { /* n/a */ }
    try { var m = items[i].matrix; o.matrix = [m.mValueA, m.mValueB, m.mValueC, m.mValueD, m.mValueTX, m.mValueTY]; } catch (e4) { /* only some item types expose a matrix */ }
    out.push(o);
  }
  return { items: out, count: out.length };
};

/* ---------------- layers ---------------- */

MCP.copyLayerInto = function (src, dst) {
  for (var s = src.layers.length - 1; s >= 0; s--) {
    var sub = dst.layers.add();
    sub.name = src.layers[s].name;
    MCP.copyLayerInto(src.layers[s], sub);
    sub.visible = src.layers[s].visible;
    sub.locked = src.layers[s].locked;
  }
  for (var i = src.pageItems.length - 1; i >= 0; i--) {
    var it = src.pageItems[i];
    if (it.parent !== src) continue; /* items of sublayers are copied with the sublayer */
    it.duplicate(dst, ElementPlacement.PLACEATBEGINNING);
  }
};

MCP.ops.duplicate_layer = function (a) {
  var doc = MCP.doc();
  var src = MCP.findLayer(doc, a.name, false);
  var wasLocked = src.locked, wasVisible = src.visible;
  src.locked = false; src.visible = true;
  var dst = doc.layers.add();
  dst.move(src, ElementPlacement.PLACEBEFORE);
  dst.name = a.newName || (src.name + " copy");
  try { MCP.copyLayerInto(src, dst); } finally { src.locked = wasLocked; src.visible = wasVisible; }
  dst.visible = wasVisible;
  return { layer: MCP.layerInfo(dst, 0), sourceItems: src.pageItems.length, copiedItems: dst.pageItems.length };
};

MCP.ops.create_sublayer = function (a) {
  var doc = MCP.doc();
  var parent = MCP.findLayer(doc, a.parent, false);
  var sub = parent.layers.add();
  sub.name = a.name;
  if (a.position === "bottom") sub.move(parent, ElementPlacement.PLACEATEND);
  return { parent: parent.name, sublayer: sub.name, sublayers: MCP.names(parent.layers) };
};

/* ---------------- document ---------------- */

MCP.ops.get_document_settings = function () {
  var doc = MCP.doc();
  var info = MCP.docInfo(doc);
  var r = {};
  try { var rs = doc.rasterEffectSettings; r = { resolution: rs.resolution, antiAliasing: rs.antiAliasing, transparency: rs.transparency, colorModel: String(rs.colorModel) }; } catch (e) { r = null; }
  var origin = null;
  try { origin = [doc.rulerOrigin[0], doc.rulerOrigin[1]]; } catch (e2) { origin = null; }
  return {
    name: info.name, path: info.path, saved: info.saved, colorMode: info.colorMode, rulerUnits: info.rulerUnits,
    rulerOrigin: origin, rasterEffects: r, artboards: info.artboards,
    colorProfile: (function () { try { return doc.colorProfileName; } catch (e3) { return null; } })(),
    counts: { layers: info.layerCount, pageItems: info.pageItemCount, textFrames: info.textFrameCount, swatches: info.swatchCount, symbols: info.symbolCount, placed: info.placedItemCount, raster: info.rasterItemCount },
    note: "Document bleed is set when the document is created and is not exposed to scripts; use export_print_pdf to add bleed and crop marks to the PDF."
  };
};

MCP.ops.set_raster_effects_resolution = function (a) {
  var doc = MCP.doc();
  var rs = doc.rasterEffectSettings;
  rs.resolution = a.resolution;
  doc.rasterEffectSettings = rs;
  var now = doc.rasterEffectSettings.resolution;
  if (Math.abs(now - a.resolution) > 0.5) MCP.fail("ILLUSTRATOR_SCRIPT_ERROR", "Raster effects resolution did not change (still " + now + ").");
  return { resolution: now };
};

/* ---------------- export ---------------- */

MCP.ops.export_tiff = function (a) {
  var doc = MCP.doc();
  var o = new ExportOptionsTIFF();
  o.resolution = a.ppi || 300;
  o.antiAliasing = AntiAliasingMethod.ARTOPTIMIZED;
  o.imageColorSpace = a.colorSpace === "CMYK" ? ImageColorSpace.CMYK : a.colorSpace === "Grayscale" ? ImageColorSpace.GrayScale : ImageColorSpace.RGB;
  o.lZWCompression = a.lzw !== false;
  if (a.artboards) { o.saveMultipleArtboards = true; o.artboardRange = a.artboards; }
  doc.exportFile(new File(a.path), ExportType.TIFF, o);
  if (a.artboards) {
    var f = new File(a.path), folder = f.parent, base = f.name.replace(/\.tiff?$/i, ""), all = folder.getFiles(), files = [];
    for (var i = 0; i < all.length; i++) { var nm = decodeURI(all[i].name); if (nm.indexOf(base) === 0 && /\.tiff?$/i.test(nm)) files.push({ path: all[i].fsName, bytes: all[i].length }); }
    if (!files.length) MCP.fail("ILLUSTRATOR_SCRIPT_ERROR", "Illustrator reported no error but no TIFF was written next to " + a.path);
    return { files: files };
  }
  return { files: [MCP.verifyWritten(a.path)] };
};

/* Copies the targets into a temporary document sized to them, exports it, and closes it without saving. */
MCP.ops.export_selection = function (a) {
  var doc = MCP.doc();
  var items = MCP.targets(a);
  var b = MCP.unionBox(items); /* artboard coords, y down */
  var pad = a.padding || 0;
  var tmp = app.documents.add(doc.documentColorSpace, b.width + 2 * pad, b.height + 2 * pad);
  try {
    var layer = tmp.layers[0];
    for (var i = items.length - 1; i >= 0; i--) items[i].duplicate(layer, ElementPlacement.PLACEATBEGINNING);
    var r = tmp.artboards[0].artboardRect;
    var vb = layer.pageItems[0].visibleBounds, left = vb[0], top = vb[1], right = vb[2], bottom = vb[3];
    for (var k = 1; k < layer.pageItems.length; k++) {
      var v = layer.pageItems[k].visibleBounds;
      left = Math.min(left, v[0]); top = Math.max(top, v[1]); right = Math.max(right, v[2]); bottom = Math.min(bottom, v[3]);
    }
    tmp.artboards[0].artboardRect = [left - pad, top + pad, right + pad, bottom - pad];
    var f = new File(a.path);
    if (a.format === "svg") {
      var so = new ExportOptionsSVG();
      so.embedRasterImages = true; so.fontType = SVGFontType.OUTLINEFONT; so.documentEncoding = SVGDocumentEncoding.UTF8;
      so.coordinatePrecision = 3;
      tmp.exportFile(f, ExportType.SVG, so);
    } else {
      var po = new ExportOptionsPNG24();
      po.transparency = a.transparent !== false; po.antiAliasing = true; po.artBoardClipping = true;
      po.horizontalScale = po.verticalScale = (a.ppi || 144) / 72 * 100;
      tmp.exportFile(f, ExportType.PNG24, po);
    }
    r = null;
  } finally {
    tmp.close(SaveOptions.DONOTSAVECHANGES);
    doc.activate();
    MCP.pinned = doc;
  }
  return { files: [MCP.verifyWritten(a.path)], objects: items.length, size: { width: b.width + 2 * pad, height: b.height + 2 * pad } };
};

/* Print PDF: PDF/X preset, bleed and printer's marks, written as a copy (see MCP.saveCopy). */
MCP.ops.export_print_pdf = function (a) {
  var opts = new PDFSaveOptions();
  opts.pDFPreset = a.preset || "[PDF/X-4:2008]";
  opts.preserveEditability = false;
  opts.generateThumbnails = true;
  var bl = a.bleed || 0;
  opts.bleedLink = true;
  opts.bleedOffsetRect = [bl, bl, bl, bl];
  if (a.cropMarks !== false) { opts.trimMarks = true; opts.trimMarkWeight = PDFTrimMarkWeight.TRIMMARKWEIGHT025; }
  if (a.registrationMarks) opts.registrationMarks = true;
  if (a.colorBars) opts.colorBars = true;
  if (a.pageInfo) opts.pageInformation = true;
  if (a.artboards) opts.artboardRange = a.artboards;
  var res = MCP.saveCopy(a, opts);
  res.settings = { preset: opts.pDFPreset, bleedPt: bl, cropMarks: a.cropMarks !== false, registrationMarks: !!a.registrationMarks, colorBars: !!a.colorBars, pageInfo: !!a.pageInfo };
  return res;
};

/* ---------------- preflight & cleanup ---------------- */

/* A single anchor, or several anchors on one spot: invisible and prints nothing. */
MCP.isStray = function (p) {
  if (p.pathPoints.length < 2) return true;
  try { return p.length < 0.001 && Math.abs(p.area) < 0.001; } catch (e) { return false; }
};

MCP.colorKind = function (c) { try { return c.typename; } catch (e) { return null; } };

MCP.ops.preflight_document = function (a) {
  var doc = MCP.doc();
  var cmyk = doc.documentColorSpace === DocumentColorSpace.CMYK;
  var issues = [];
  var add = function (severity, code, message, item) {
    var nm = null;
    try { nm = item ? (item.name || item.typename) : null; } catch (e) { nm = null; }
    issues.push({ severity: severity, code: code, message: message, object: nm });
  };
  var minText = a.minTextSize || 6, minStroke = a.minStrokeWidth || 0.25, minPpi = a.minPpi || 300;
  if (a.forPrint && !cmyk) add("error", "RGB_DOCUMENT", "Document is RGB; commercial print expects CMYK.");

  var limit = a.limit || 20000, scanned = 0;
  var paths = doc.pathItems;
  for (var i = 0; i < paths.length && scanned < limit; i++, scanned++) {
    var p = paths[i];
    try {
      if (p.guides || p.clipping) continue;
      if (MCP.isStray(p)) { add("warning", "STRAY_POINT", "Stray point: zero-length path (invisible, prints nothing).", p); continue; }
      if (!p.filled && !p.stroked) add("info", "UNPAINTED_PATH", "Path has no fill and no stroke.", p);
      if (p.stroked && p.strokeWidth > 0 && p.strokeWidth < minStroke) add("warning", "HAIRLINE", "Stroke " + p.strokeWidth + " pt is below " + minStroke + " pt and may not print.", p);
      if (a.forPrint && cmyk) {
        if (p.filled && MCP.colorKind(p.fillColor) === "RGBColor") add("warning", "RGB_COLOR", "RGB fill in a CMYK document.", p);
        if (p.stroked && MCP.colorKind(p.strokeColor) === "RGBColor") add("warning", "RGB_COLOR", "RGB stroke in a CMYK document.", p);
      }
    } catch (e) { /* skip unreadable items */ }
  }
  var missingFonts = {};
  for (var t = 0; t < doc.textFrames.length; t++) {
    var tf = doc.textFrames[t];
    try {
      if (tf.contents === "") { add("info", "EMPTY_TEXT", "Empty text frame.", tf); continue; }
      var size = tf.textRange.characterAttributes.size;
      if (size < minText) add("warning", "SMALL_TEXT", "Text size " + Math.round(size * 10) / 10 + " pt is below " + minText + " pt.", tf);
      if (MCP.overflows(tf)) add("error", "OVERSET_TEXT", "Area text overflows its frame; some text is hidden.", tf);
    } catch (e2) { /* n/a */ }
    try { var fn = tf.textRange.characterAttributes.textFont.name; if (!MCP.findFont(fn)) missingFonts[fn] = 1; } catch (e3) { add("error", "MISSING_FONT", "Text uses a font that is not available.", tf); }
  }
  for (var mf in missingFonts) if (missingFonts.hasOwnProperty(mf)) add("error", "MISSING_FONT", "Font not installed: " + mf);
  for (var k = 0; k < doc.placedItems.length; k++) {
    var pl = doc.placedItems[k];
    try { if (!pl.file.exists) add("error", "MISSING_LINK", "Linked file is missing.", pl); } catch (e4) { add("error", "MISSING_LINK", "Linked file is missing.", pl); }
    try { var inf = MCP.imageInfo(pl); if (inf.effectivePpi && a.forPrint && inf.effectivePpi < minPpi) add("warning", "LOW_RESOLUTION", "Effective " + inf.effectivePpi + " ppi (< " + minPpi + ").", pl); } catch (e5) { /* n/a */ }
  }
  for (var r = 0; r < doc.rasterItems.length; r++) {
    try { var ri = MCP.imageInfo(doc.rasterItems[r]); if (ri.effectivePpi && a.forPrint && ri.effectivePpi < minPpi) add("warning", "LOW_RESOLUTION", "Effective " + ri.effectivePpi + " ppi (< " + minPpi + ").", doc.rasterItems[r]); } catch (e6) { /* n/a */ }
  }
  for (var l = 0; l < doc.layers.length; l++) {
    var ly = doc.layers[l];
    if (ly.pageItems.length === 0 && ly.layers.length === 0) add("info", "EMPTY_LAYER", "Layer \"" + ly.name + "\" is empty.");
    if (!ly.visible && ly.pageItems.length) add("info", "HIDDEN_LAYER", "Layer \"" + ly.name + "\" is hidden (" + ly.pageItems.length + " items will not print).");
  }
  var counts = { error: 0, warning: 0, info: 0 };
  for (var c = 0; c < issues.length; c++) counts[issues[c].severity]++;
  var max = a.maxIssues || 300;
  return {
    passed: counts.error === 0, counts: counts, colorMode: cmyk ? "CMYK" : "RGB",
    scannedPaths: scanned, truncated: scanned >= limit || issues.length > max,
    issues: issues.slice(0, max),
    thresholds: { minTextSize: minText, minStrokeWidth: minStroke, minPpi: minPpi, forPrint: !!a.forPrint }
  };
};

MCP.ops.cleanup_document = function (a) {
  var doc = MCP.doc();
  var want = a.remove || ["stray_points", "empty_text", "unpainted_paths", "empty_layers"];
  var has = function (k) { for (var i = 0; i < want.length; i++) if (want[i] === k) return true; return false; };
  var found = [];
  var take = function (kind, item) { var nm = null; try { nm = item.name || item.typename; } catch (e) { nm = null; } found.push({ kind: kind, object: nm, ref: item }); };
  for (var i = doc.pathItems.length - 1; i >= 0; i--) {
    var p = doc.pathItems[i];
    try {
      if (p.locked || p.hidden || p.guides || p.clipping) continue;
      if (MCP.layerOf(p).locked) continue;
      if (has("stray_points") && MCP.isStray(p)) take("stray_point", p);
      else if (has("unpainted_paths") && !p.filled && !p.stroked && p.parent.typename !== "CompoundPathItem") take("unpainted_path", p);
    } catch (e) { /* skip */ }
  }
  if (has("empty_text")) {
    for (var t = doc.textFrames.length - 1; t >= 0; t--) {
      var tf = doc.textFrames[t];
      try { if (!tf.locked && !tf.hidden && tf.contents === "" && !MCP.layerOf(tf).locked) take("empty_text", tf); } catch (e2) { /* skip */ }
    }
  }
  var layers = [];
  if (has("empty_layers")) {
    for (var l = doc.layers.length - 1; l >= 0; l--) {
      var ly = doc.layers[l];
      if (!ly.locked && ly.pageItems.length === 0 && ly.layers.length === 0 && doc.layers.length - layers.length > 1) layers.push(ly);
    }
  }
  var report = [];
  for (var f = 0; f < found.length; f++) report.push({ kind: found[f].kind, object: found[f].object });
  for (var g = 0; g < layers.length; g++) report.push({ kind: "empty_layer", object: layers[g].name });
  if (!a.dryRun) {
    for (var d = 0; d < found.length; d++) found[d].ref.remove();
    for (var h = 0; h < layers.length; h++) layers[h].remove();
  }
  return { dryRun: !!a.dryRun, removedCount: a.dryRun ? 0 : report.length, candidates: report.slice(0, 500), candidateCount: report.length };
};
