/* Document, artboard and asset operations. Requires bootstrap.jsx. */

MCP.ops.status = function () {
  var docs = [];
  for (var i = 0; i < app.documents.length; i++) {
    var d = app.documents[i];
    var p = null;
    try { if (d.fullName && d.fullName.exists) p = String(d.fullName.fsName); } catch (e) { p = null; }
    docs.push({ name: d.name, saved: p !== null && d.saved, path: p });
  }
  return {
    application: app.name, version: app.version, buildNumber: app.buildNumber,
    locale: app.locale, documentCount: app.documents.length,
    activeDocument: app.documents.length ? app.activeDocument.name : null, documents: docs
  };
};

MCP.docInfo = function (doc) {
  var abs = [];
  for (var i = 0; i < doc.artboards.length; i++) {
    var r = doc.artboards[i].artboardRect; /* document coordinates, y up */
    abs.push({ index: i, name: doc.artboards[i].name, width: r[2] - r[0], height: r[1] - r[3],
      left: r[0], top: r[1], active: i === doc.artboards.getActiveArtboardIndex() });
  }
  /* A never-saved document reports saved=true while empty and a fullName relative to
     Illustrator's install folder, so only trust a fullName that exists on disk. */
  var path = null;
  try { if (doc.fullName && doc.fullName.exists) path = doc.fullName.fsName; } catch (e) { path = null; }
  return {
    name: doc.name, path: path, saved: path !== null && doc.saved,
    colorMode: doc.documentColorSpace === DocumentColorSpace.CMYK ? "CMYK" : "RGB",
    rulerUnits: String(doc.rulerUnits), artboards: abs,
    layerCount: doc.layers.length, pageItemCount: doc.pageItems.length,
    swatchCount: doc.swatches.length, symbolCount: doc.symbols.length,
    placedItemCount: doc.placedItems.length, rasterItemCount: doc.rasterItems.length,
    textFrameCount: doc.textFrames.length
  };
};

MCP.ops.create_document = function (a) {
  var preset = new DocumentPreset();
  preset.width = a.width;
  preset.height = a.height;
  preset.colorMode = a.colorMode === "CMYK" ? DocumentColorSpace.CMYK : DocumentColorSpace.RGB;
  preset.title = a.name || "Untitled";
  preset.numArtboards = a.artboards || 1;
  if (a.units) {
    var u = { pt: RulerUnits.Points, px: RulerUnits.Pixels, mm: RulerUnits.Millimeters, cm: RulerUnits.Centimeters,
      "in": RulerUnits.Inches, pc: RulerUnits.Picas }[a.units];
    if (u) preset.units = u;
  }
  var doc = app.documents.addDocument(a.colorMode === "CMYK" ? "Print" : "Web", preset);
  MCP.pinned = doc; /* activeDocument may still report the previous document right after creation */
  return MCP.docInfo(doc);
};

MCP.ops.open_document = function (a) {
  var f = new File(a.path);
  if (!f.exists) MCP.fail("FILE_NOT_FOUND", "File not found: " + a.path);
  MCP.pinned = app.open(f);
  return MCP.docInfo(MCP.pinned);
};

MCP.findDoc = function (name) {
  if (!name) return MCP.doc();
  for (var i = 0; i < app.documents.length; i++) if (app.documents[i].name === name) return app.documents[i];
  MCP.fail("OBJECT_NOT_FOUND", "Document not open: " + name);
};

MCP.ops.close_document = function (a) {
  var doc = MCP.findDoc(a.name);
  var name = doc.name;
  if (!doc.saved && a.save === undefined) {
    MCP.fail("CONFIRMATION_REQUIRED", "Document has unsaved changes. Pass save: true to save or save: false to discard.");
  }
  doc.close(a.save ? SaveOptions.SAVECHANGES : SaveOptions.DONOTSAVECHANGES);
  return { closed: name };
};

MCP.ops.save_document = function () {
  var doc = MCP.doc();
  var hasPath = false;
  try { hasPath = doc.fullName && doc.fullName.exists; } catch (e) { hasPath = false; }
  if (!hasPath) MCP.fail("VALIDATION_ERROR", "Document has never been saved; use save_document_as.");
  doc.save();
  return MCP.docInfo(doc);
};

MCP.ops.save_document_as = function (a) {
  var doc = MCP.doc();
  var opts = new IllustratorSaveOptions();
  opts.pdfCompatible = a.pdfCompatible !== false;
  opts.embedICCProfile = !!a.embedICCProfile;
  opts.embedLinkedFiles = !!a.embedLinkedFiles;
  opts.fontSubsetThreshold = 100;
  doc.saveAs(new File(a.path), opts);
  var f = new File(a.path);
  if (!f.exists) MCP.fail("ILLUSTRATOR_SCRIPT_ERROR", "Illustrator reported no error but the file was not written: " + a.path);
  return MCP.docInfo(doc);
};

/* Save the active document. Without a path it saves in place; with a path it re-targets the
   document to that file, choosing native save options from the extension (.ai/.ait/.pdf/.eps). */
MCP.ops.save_file = function (a) {
  var doc = MCP.doc();
  if (!a.path) {
    var hasPath = false;
    try { hasPath = doc.fullName && doc.fullName.exists; } catch (e) { hasPath = false; }
    if (!hasPath) MCP.fail("VALIDATION_ERROR", "Document has never been saved; pass a path.");
    doc.save();
    var info0 = MCP.docInfo(doc); info0.format = "in-place"; return info0;
  }
  var fmt = a.format, opts;
  if (fmt === "pdf") {
    opts = new PDFSaveOptions();
    opts.preserveEditability = a.pdfCompatible !== false;
    opts.viewAfterSaving = false;
  } else if (fmt === "eps") {
    opts = new EPSSaveOptions();
    opts.embedLinkedFiles = !!a.embedLinkedFiles;
  } else {
    opts = new IllustratorSaveOptions();
    opts.pdfCompatible = a.pdfCompatible !== false;
    opts.embedICCProfile = !!a.embedICCProfile;
    opts.embedLinkedFiles = !!a.embedLinkedFiles;
    opts.fontSubsetThreshold = 100;
  }
  doc.saveAs(new File(a.path), opts);
  if (!new File(a.path).exists) MCP.fail("ILLUSTRATOR_SCRIPT_ERROR", "Illustrator reported no error but the file was not written: " + a.path);
  MCP.pinned = doc;
  var info = MCP.docInfo(doc); info.format = fmt; info.savedTo = a.path; return info;
};

/* Open any file Illustrator can read. If the file is already open, activate that document instead. */
MCP.ops.open_file = function (a) {
  var f = new File(a.path);
  if (!f.exists) MCP.fail("FILE_NOT_FOUND", "File not found: " + a.path);
  var target = String(f.fsName).toLowerCase();
  for (var i = 0; i < app.documents.length; i++) {
    var d = app.documents[i], p = null;
    try { if (d.fullName && d.fullName.exists) p = String(d.fullName.fsName).toLowerCase(); } catch (e) { p = null; }
    if (p === target && !a.reopen) {
      d.activate(); MCP.pinned = d;
      var info0 = MCP.docInfo(d); info0.alreadyOpen = true; return info0;
    }
  }
  MCP.pinned = app.open(f);
  var info = MCP.docInfo(MCP.pinned); info.alreadyOpen = false; return info;
};

/* ---------------- File menu: copies, revert, save/close all, recent files ---------------- */

MCP.filePath = function (doc) {
  try { if (doc.fullName && doc.fullName.exists) return doc.fullName; } catch (e) { /* never saved */ }
  return null;
};

MCP.saveOptionsFor = function (fmt, a) {
  var o;
  if (fmt === "pdf") { o = new PDFSaveOptions(); o.preserveEditability = a.pdfCompatible !== false; o.viewAfterSaving = false; return o; }
  if (fmt === "eps") { o = new EPSSaveOptions(); o.embedLinkedFiles = !!a.embedLinkedFiles; return o; }
  o = new IllustratorSaveOptions();
  o.pdfCompatible = a.pdfCompatible !== false; o.embedLinkedFiles = !!a.embedLinkedFiles; o.fontSubsetThreshold = 100;
  return o;
};

/*
 * Save a Copy: write the document to another file while the open document keeps pointing at its own file.
 * Scripting only has saveAs (which re-targets), so the copy is written with saveAs and the original .ai is
 * reopened. That needs the original saved first, otherwise unsaved changes would be lost.
 */
MCP.ops.save_copy = function (a) {
  var doc = MCP.doc();
  var original = MCP.filePath(doc);
  if (!original) MCP.fail("VALIDATION_ERROR", "The document has never been saved. Use save_file to give it a file first; a copy needs an original to return to.");
  if (!doc.saved) MCP.fail("CONFIRMATION_REQUIRED", "The document has unsaved changes. Save it first (save_file with no path) so the copy and the original match.");
  if (String(original.fsName).toLowerCase() === String(new File(a.path).fsName).toLowerCase()) MCP.fail("VALIDATION_ERROR", "The copy path is the document's own file.");
  /* Illustrator's native save always writes .ai, so a template is written as .ai next to the target and renamed. */
  var target = a.format === "ait" ? a.path.replace(/\.ait$/i, ".ai") : a.path;
  if (String(new File(target).fsName).toLowerCase() === String(original.fsName).toLowerCase()) MCP.fail("VALIDATION_ERROR", "Choose a template name different from the document's own file name.");
  if (a.format === "ait" && new File(target).exists) MCP.fail("FILE_EXISTS", "A file with the template's temporary name exists: " + target);
  doc.saveAs(new File(target), MCP.saveOptionsFor(a.format, a));
  if (!new File(target).exists) MCP.fail("ILLUSTRATOR_SCRIPT_ERROR", "Illustrator reported no error but the copy was not written: " + target);
  app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
  if (a.format === "ait") {
    var finalFile = new File(a.path);
    if (finalFile.exists) finalFile.remove(); /* overwrite was already approved by the server */
    if (!new File(target).rename(finalFile.name)) MCP.fail("ILLUSTRATOR_SCRIPT_ERROR", "The template was written as " + target + " but could not be renamed to .ait.");
  }
  MCP.pinned = app.open(original);
  return { copy: a.path, format: a.format, bytes: new File(a.path).length, document: MCP.docInfo(MCP.pinned) };
};

MCP.ops.revert_document = function () {
  var doc = MCP.doc();
  var f = MCP.filePath(doc);
  if (!f) MCP.fail("VALIDATION_ERROR", "The document has never been saved, so there is nothing to revert to.");
  var hadChanges = !doc.saved;
  doc.close(SaveOptions.DONOTSAVECHANGES);
  MCP.pinned = app.open(f);
  return { reverted: f.fsName, discardedChanges: hadChanges, document: MCP.docInfo(MCP.pinned) };
};

MCP.ops.save_all_documents = function () {
  var saved = [], skipped = [];
  for (var i = 0; i < app.documents.length; i++) {
    var d = app.documents[i];
    if (!MCP.filePath(d)) { skipped.push({ name: d.name, reason: "never saved; use save_file with a path" }); continue; }
    if (d.saved) { skipped.push({ name: d.name, reason: "no unsaved changes" }); continue; }
    d.save();
    saved.push({ name: d.name, path: d.fullName.fsName });
  }
  return { saved: saved, skipped: skipped };
};

/* mode: save (save documents that have a file; refuse if any unsaved one has no file) | discard (close without saving) */
MCP.ops.close_all_documents = function (a) {
  var closed = [], refused = [];
  if (a.mode === "save") {
    /* A never-saved document can report saved=true while empty; closing it with SAVECHANGES opens a Save dialog
       that blocks Illustrator, so every document without a file is refused regardless of its saved flag. */
    var keepSave = {};
    for (var ks = 0; a.except && ks < a.except.length; ks++) keepSave[a.except[ks]] = 1;
    for (var c = 0; c < app.documents.length; c++) {
      var dc = app.documents[c];
      if (!keepSave[dc.name] && !MCP.filePath(dc)) refused.push(dc.name);
    }
    if (refused.length) MCP.fail("CONFIRMATION_REQUIRED", "These documents were never saved and would need a file name: " + refused.join(", ") + ". Save them with save_file first, or close with mode: discard.");
  }
  var keep = {};
  for (var k = 0; a.except && k < a.except.length; k++) keep[a.except[k]] = 1;
  for (var i = app.documents.length - 1; i >= 0; i--) {
    var d = app.documents[i];
    if (keep[d.name]) continue;
    var dirty = !d.saved, name = d.name;
    d.close(a.mode === "save" ? SaveOptions.SAVECHANGES : SaveOptions.DONOTSAVECHANGES);
    closed.push({ name: name, hadUnsavedChanges: dirty, saved: a.mode === "save" && dirty });
  }
  MCP.pinned = null;
  return { closed: closed, remaining: app.documents.length };
};

/* Illustrator keeps its recent-file list in preferences: plugin/MixedFileList/file0..N/{path,lastOpentime}, not in date order. */
MCP.ops.list_recent_files = function (a) {
  var found = [], max = a.limit || 20, slots = 0;
  try { slots = app.preferences.getIntegerPreference("RecentFileNumber"); } catch (e0) { slots = 0; }
  if (!slots || slots < 1) slots = 30;
  for (var i = 0; i < Math.min(slots, 100); i++) {
    var key = "plugin/MixedFileList/file" + i + "/", p = "", t = "";
    try { p = app.preferences.getStringPreference(key + "path"); } catch (e) { p = ""; }
    if (!p) continue;
    try { t = app.preferences.getStringPreference(key + "lastOpentime"); } catch (e2) { t = ""; }
    var f = new File(p);
    found.push({ path: f.fsName, name: decodeURI(f.name), exists: f.exists, lastOpened: t || null });
  }
  found.sort(function (x, y) { var a1 = x.lastOpened || "", b1 = y.lastOpened || ""; return a1 < b1 ? 1 : a1 > b1 ? -1 : 0; });
  var out = found.slice(0, max);
  for (var k = 0; k < out.length; k++) out[k].index = k;
  return { files: out, count: out.length };
};

MCP.ops.inspect_document = function (a) {
  var doc = MCP.doc();
  MCP.useArtboard(doc, a.artboard);
  var info = MCP.docInfo(doc);
  var items = [];
  var limit = a.limit || 500;
  for (var l = 0; l < doc.layers.length; l++) {
    var layer = doc.layers[l];
    for (var i = 0; i < layer.pageItems.length && items.length < limit; i++) {
      items.push(MCP.info(layer.pageItems[i], a.deep));
    }
  }
  info.items = items;
  info.truncated = doc.pageItems.length > items.length && !a.deep;
  info.layers = MCP.ops.inspect_layers({}).layers;
  info.coordinateSpace = "points, origin at artboard " + doc.artboards.getActiveArtboardIndex() + " top-left, y down";
  return info;
};

MCP.ops.get_artboards = function () {
  return { artboards: MCP.docInfo(MCP.doc()).artboards };
};

/* Artboard rects are given relative to artboard 0's top-left, y down. */
MCP.ops.create_artboard = function (a) {
  var doc = MCP.doc();
  var r0 = doc.artboards[0].artboardRect;
  var left = r0[0] + a.x, top = r0[1] - a.y;
  var ab = doc.artboards.add([left, top, left + a.width, top - a.height]);
  if (a.name) ab.name = a.name;
  return { artboards: MCP.docInfo(doc).artboards };
};

MCP.ops.resize_artboard = function (a) {
  var doc = MCP.doc();
  var i = a.index || 0;
  if (i >= doc.artboards.length) MCP.fail("VALIDATION_ERROR", "Artboard index " + i + " does not exist.");
  var r = doc.artboards[i].artboardRect;
  var left = r[0], top = r[1];
  if (a.anchor === "center") {
    left = (r[0] + r[2]) / 2 - a.width / 2;
    top = (r[1] + r[3]) / 2 + a.height / 2;
  }
  doc.artboards[i].artboardRect = [left, top, left + a.width, top - a.height];
  if (a.name) doc.artboards[i].name = a.name;
  return { artboards: MCP.docInfo(doc).artboards };
};

MCP.ops.set_document_color_mode = function (a) {
  var doc = MCP.doc();
  app.executeMenuCommand(a.mode === "CMYK" ? "doc-color-cmyk" : "doc-color-rgb");
  var now = doc.documentColorSpace === DocumentColorSpace.CMYK ? "CMYK" : "RGB";
  if (now !== a.mode) MCP.fail("ILLUSTRATOR_SCRIPT_ERROR", "Color mode change did not take effect (still " + now + ").");
  return { colorMode: now };
};

/* Ruler units are read-only on Document; Illustrator stores them in the "rulerType" preference
   (0=in, 1=mm, 2=pt, 3=pc, 4=cm, 6=px; mapping not documented by Adobe - unverified). Applies to new documents and the UI rulers. */
MCP.ops.set_document_units = function (a) {
  var code = { pt: 2, pc: 3, "in": 0, mm: 1, cm: 4, px: 6 }[a.units];
  app.preferences.setIntegerPreference("rulerType", code);
  return { requested: a.units, rulerUnits: String(MCP.doc().rulerUnits),
    note: "Ruler preference written; Illustrator may require reopening the document for rulers to update." };
};

/* ---------------- assets ---------------- */
MCP.ops.place_image = function (a) {
  var doc = MCP.doc();
  MCP.useArtboard(doc, a.artboard);
  var f = new File(a.path);
  if (!f.exists) MCP.fail("FILE_NOT_FOUND", "Image not found: " + a.path);
  var layer = MCP.targetLayer(doc, a.layer);
  var item = layer.placedItems.add();
  item.file = f;
  if (a.width || a.height) {
    var b = MCP.box(item.geometricBounds);
    var w = a.width, h = a.height;
    if (a.fit !== "stretch") {
      var s = Math.min((w || b.width * 1e9) / b.width, (h || b.height * 1e9) / b.height);
      w = b.width * s; h = b.height * s;
    }
    MCP.resizeTo(item, w, h);
  }
  MCP.moveTo(item, a.x || 0, a.y || 0);
  if (a.name) item.name = a.name;
  var result = item;
  if (a.embed) { item.embed(); result = layer.pageItems[0]; if (a.name) result.name = a.name; }
  return MCP.info(result);
};

MCP.ops.inspect_assets = function () {
  var doc = MCP.doc();
  var placed = [], raster = [];
  for (var i = 0; i < doc.placedItems.length; i++) placed.push(MCP.info(doc.placedItems[i]));
  for (var j = 0; j < doc.rasterItems.length; j++) raster.push(MCP.info(doc.rasterItems[j]));
  var missing = [];
  for (var k = 0; k < placed.length; k++) if (!placed[k].linkExists) missing.push(placed[k].name || ("placed #" + k));
  return { linked: placed, embedded: raster, missingLinks: missing };
};

MCP.ops.embed_images = function (a) {
  var doc = MCP.doc();
  var n = 0;
  for (var i = doc.placedItems.length - 1; i >= 0; i--) {
    var p = doc.placedItems[i];
    if (a.name && p.name !== a.name) continue;
    p.embed(); n++;
  }
  return { embedded: n };
};
