
/* [MS-XLSB] 2.4.726 BrtRowHdr */
function parse_BrtRowHdr(data, length) {
	var z = ({}/*:any*/);
	var tgt = data.l + length;
	z.r = data.read_shift(4);
	data.l += 4; // TODO: ixfe
	var miyRw = data.read_shift(2);
	data.l += 1; // TODO: top/bot padding
	var flags = data.read_shift(1);
	data.l = tgt;
	if(flags & 0x07) z.level = flags & 0x07;
	if(flags & 0x10) z.hidden = true;
	if(flags & 0x20) z.hpt = miyRw / 20;
	return z;
}
function write_BrtRowHdr(R/*:number*/, range, ws) {
	var o = new_buf(17+8*16);
	var row = (ws['!rows']||[])[R]||{};
	o.write_shift(4, R);

	o.write_shift(4, 0); /* TODO: ixfe */

	var miyRw = 0x0140;
	if(row.hpx) miyRw = px2pt(row.hpx) * 20;
	else if(row.hpt) miyRw = row.hpt * 20;
	o.write_shift(2, miyRw);

	o.write_shift(1, 0); /* top/bot padding */

	var flags = 0x0;
	if(row.level) flags |= row.level;
	if(row.hidden) flags |= 0x10;
	if(row.hpx || row.hpt) flags |= 0x20;
	o.write_shift(1, flags);

	o.write_shift(1, 0); /* phonetic guide */

	/* [MS-XLSB] 2.5.8 BrtColSpan explains the mechanism */
	var ncolspan = 0, lcs = o.l;
	o.l += 4;

	var caddr = {r:R, c:0};
	var dense = ws["!data"] != null;
	for(var i = 0; i < 16; ++i) {
		if((range.s.c > ((i+1) << 10)) || (range.e.c < (i << 10))) continue;
		var first = -1, last = -1;
		for(var j = (i<<10); j < ((i+1)<<10); ++j) {
			caddr.c = j;
			var cell = dense ? (ws["!data"][caddr.r]||[])[caddr.c] : ws[encode_cell(caddr)];
			if(cell) { if(first < 0) first = j; last = j; }
		}
		if(first < 0) continue;
		++ncolspan;
		o.write_shift(4, first);
		o.write_shift(4, last);
	}

	var l = o.l;
	o.l = lcs;
	o.write_shift(4, ncolspan);
	o.l = l;

	return o.length > o.l ? o.slice(0, o.l) : o;
}
function write_row_header(ba, ws, range, R) {
	var o = write_BrtRowHdr(R, range, ws);
	if((o.length > 17) || (ws['!rows']||[])[R]) write_record(ba, 0x0000 /* BrtRowHdr */, o);
}

/* [MS-XLSB] 2.4.820 BrtWsDim */
var parse_BrtWsDim = parse_UncheckedRfX;
var write_BrtWsDim = write_UncheckedRfX;

/* [MS-XLSB] 2.4.821 BrtWsFmtInfo */
function parse_BrtWsFmtInfo(/*::data, length*/) {
}
//function write_BrtWsFmtInfo(ws, o) { }

/* [MS-XLSB] 2.4.823 BrtWsProp */
function parse_BrtWsProp(data, length) {
	var z = {};
	var f = data[data.l]; ++data.l;
	z.above = !(f & 0x40);
	z.left  = !(f & 0x80);
	/* TODO: pull flags */
	data.l += 18;
	z.name = parse_XLSBCodeName(data, length - 19);
	return z;
}
function write_BrtWsProp(str, outl, o) {
	if(o == null) o = new_buf(84+4*str.length);
	var f = 0xC0;
	if(outl) {
		if(outl.above) f &= ~0x40;
		if(outl.left)  f &= ~0x80;
	}
	o.write_shift(1, f);
	for(var i = 1; i < 3; ++i) o.write_shift(1,0);
	write_BrtColor({auto:1}, o);
	o.write_shift(-4,-1);
	o.write_shift(-4,-1);
	write_XLSBCodeName(str, o);
	return o.slice(0, o.l);
}

/* [MS-XLSB] 2.4.306 BrtCellBlank */
function parse_BrtCellBlank(data) {
	var cell = parse_XLSBCell(data);
	return [cell];
}
function write_BrtCellBlank(cell, ncell, o) {
	if(o == null) o = new_buf(8);
	return write_XLSBCell(ncell, o);
}
function parse_BrtShortBlank(data) {
	var cell = parse_XLSBShortCell(data);
	return [cell];
}
function write_BrtShortBlank(cell, ncell, o) {
	if(o == null) o = new_buf(4);
	return write_XLSBShortCell(ncell, o);
}

/* [MS-XLSB] 2.4.307 BrtCellBool */
function parse_BrtCellBool(data) {
	var cell = parse_XLSBCell(data);
	var fBool = data.read_shift(1);
	return [cell, fBool, 'b'];
}
function write_BrtCellBool(cell, ncell, o) {
	if(o == null) o = new_buf(9);
	write_XLSBCell(ncell, o);
	o.write_shift(1, cell.v ? 1 : 0);
	return o;
}
function parse_BrtShortBool(data) {
	var cell = parse_XLSBShortCell(data);
	var fBool = data.read_shift(1);
	return [cell, fBool, 'b'];
}
function write_BrtShortBool(cell, ncell, o) {
	if(o == null) o = new_buf(5);
	write_XLSBShortCell(ncell, o);
	o.write_shift(1, cell.v ? 1 : 0);
	return o;
}

/* [MS-XLSB] 2.4.308 BrtCellError */
function parse_BrtCellError(data) {
	var cell = parse_XLSBCell(data);
	var bError = data.read_shift(1);
	return [cell, bError, 'e'];
}
function write_BrtCellError(cell, ncell, o) {
	if(o == null) o = new_buf(9);
	write_XLSBCell(ncell, o);
	o.write_shift(1, cell.v);
	return o;
}
function parse_BrtShortError(data) {
	var cell = parse_XLSBShortCell(data);
	var bError = data.read_shift(1);
	return [cell, bError, 'e'];
}
function write_BrtShortError(cell, ncell, o) {
	if(o == null) o = new_buf(8);
	write_XLSBShortCell(ncell, o);
	o.write_shift(1, cell.v);
	o.write_shift(2, 0);
	o.write_shift(1, 0);
	return o;
}


/* [MS-XLSB] 2.4.311 BrtCellIsst */
function parse_BrtCellIsst(data) {
	var cell = parse_XLSBCell(data);
	var isst = data.read_shift(4);
	return [cell, isst, 's'];
}
function write_BrtCellIsst(cell, ncell, o) {
	if(o == null) o = new_buf(12);
	write_XLSBCell(ncell, o);
	o.write_shift(4, ncell.v);
	return o;
}
function parse_BrtShortIsst(data) {
	var cell = parse_XLSBShortCell(data);
	var isst = data.read_shift(4);
	return [cell, isst, 's'];
}
function write_BrtShortIsst(cell, ncell, o) {
	if(o == null) o = new_buf(8);
	write_XLSBShortCell(ncell, o);
	o.write_shift(4, ncell.v);
	return o;
}

/* [MS-XLSB] 2.4.313 BrtCellReal */
function parse_BrtCellReal(data) {
	var cell = parse_XLSBCell(data);
	var value = parse_Xnum(data);
	return [cell, value, 'n'];
}
function write_BrtCellReal(cell, ncell, o) {
	if(o == null) o = new_buf(16);
	write_XLSBCell(ncell, o);
	write_Xnum(cell.v, o);
	return o;
}
function parse_BrtShortReal(data) {
	var cell = parse_XLSBShortCell(data);
	var value = parse_Xnum(data);
	return [cell, value, 'n'];
}
function write_BrtShortReal(cell, ncell, o) {
	if(o == null) o = new_buf(12);
	write_XLSBShortCell(ncell, o);
	write_Xnum(cell.v, o);
	return o;
}

/* [MS-XLSB] 2.4.314 BrtCellRk */
function parse_BrtCellRk(data) {
	var cell = parse_XLSBCell(data);
	var value = parse_RkNumber(data);
	return [cell, value, 'n'];
}
function write_BrtCellRk(cell, ncell, o) {
	if(o == null) o = new_buf(12);
	write_XLSBCell(ncell, o);
	write_RkNumber(cell.v, o);
	return o;
}
function parse_BrtShortRk(data) {
	var cell = parse_XLSBShortCell(data);
	var value = parse_RkNumber(data);
	return [cell, value, 'n'];
}
function write_BrtShortRk(cell, ncell, o) {
	if(o == null) o = new_buf(8);
	write_XLSBShortCell(ncell, o);
	write_RkNumber(cell.v, o);
	return o;
}

/* [MS-XLSB] 2.4.323 BrtCellRString */
function parse_BrtCellRString(data) {
	var cell = parse_XLSBCell(data);
	var value = parse_RichStr(data);
	return [cell, value, 'is'];
}

/* [MS-XLSB] 2.4.317 BrtCellSt */
function parse_BrtCellSt(data) {
	var cell = parse_XLSBCell(data);
	var value = parse_XLWideString(data);
	return [cell, value, 'str'];
}
function write_BrtCellSt(cell, ncell, o) {
	var data = cell.v == null ? "" : String(cell.v);
	if(o == null) o = new_buf(12 + 4 * cell.v.length);
	write_XLSBCell(ncell, o);
	write_XLWideString(data, o);
	return o.length > o.l ? o.slice(0, o.l) : o;
}
function parse_BrtShortSt(data) {
	var cell = parse_XLSBShortCell(data);
	var value = parse_XLWideString(data);
	return [cell, value, 'str'];
}
function write_BrtShortSt(cell, ncell, o) {
	var data = cell.v == null ? "" : String(cell.v);
	if(o == null) o = new_buf(8 + 4 * data.length);
	write_XLSBShortCell(ncell, o);
	write_XLWideString(data, o);
	return o.length > o.l ? o.slice(0, o.l) : o;
}

/* [MS-XLSB] 2.4.653 BrtFmlaBool */
function parse_BrtFmlaBool(data, length, opts) {
	var end = data.l + length;
	var cell = parse_XLSBCell(data);
	cell.r = opts['!row'];
	var value = data.read_shift(1);
	var o = [cell, value, 'b'];
	if(opts.cellFormula) {
		data.l += 2;
		var formula = parse_XLSBCellParsedFormula(data, end - data.l, opts);
		o[3] = stringify_formula(formula, null/*range*/, cell, opts.supbooks, opts);/* TODO */
	}
	else data.l = end;
	return o;
}

/* [MS-XLSB] 2.4.654 BrtFmlaError */
function parse_BrtFmlaError(data, length, opts) {
	var end = data.l + length;
	var cell = parse_XLSBCell(data);
	cell.r = opts['!row'];
	var value = data.read_shift(1);
	var o = [cell, value, 'e'];
	if(opts.cellFormula) {
		data.l += 2;
		var formula = parse_XLSBCellParsedFormula(data, end - data.l, opts);
		o[3] = stringify_formula(formula, null/*range*/, cell, opts.supbooks, opts);/* TODO */
	}
	else data.l = end;
	return o;
}

/* [MS-XLSB] 2.4.655 BrtFmlaNum */
function parse_BrtFmlaNum(data, length, opts) {
	var end = data.l + length;
	var cell = parse_XLSBCell(data);
	cell.r = opts['!row'];
	var value = parse_Xnum(data);
	var o = [cell, value, 'n'];
	if(opts.cellFormula) {
		data.l += 2;
		var formula = parse_XLSBCellParsedFormula(data, end - data.l, opts);
		o[3] = stringify_formula(formula, null/*range*/, cell, opts.supbooks, opts);/* TODO */
	}
	else data.l = end;
	return o;
}

/* [MS-XLSB] 2.4.656 BrtFmlaString */
function parse_BrtFmlaString(data, length, opts) {
	var end = data.l + length;
	var cell = parse_XLSBCell(data);
	cell.r = opts['!row'];
	var value = parse_XLWideString(data);
	var o = [cell, value, 'str'];
	if(opts.cellFormula) {
		data.l += 2;
		var formula = parse_XLSBCellParsedFormula(data, end - data.l, opts);
		o[3] = stringify_formula(formula, null/*range*/, cell, opts.supbooks, opts);/* TODO */
	}
	else data.l = end;
	return o;
}

/* [MS-XLSB] 2.4.682 BrtMergeCell */
var parse_BrtMergeCell = parse_UncheckedRfX;
var write_BrtMergeCell = write_UncheckedRfX;
/* [MS-XLSB] 2.4.107 BrtBeginMergeCells */
function write_BrtBeginMergeCells(cnt, o) {
	if(o == null) o = new_buf(4);
	o.write_shift(4, cnt);
	return o;
}

/* [MS-XLSB] 2.4.662 BrtHLink */
function parse_BrtHLink(data, length/*::, opts*/) {
	var end = data.l + length;
	var rfx = parse_UncheckedRfX(data, 16);
	var relId = parse_XLNullableWideString(data);
	var loc = parse_XLWideString(data);
	var tooltip = parse_XLWideString(data);
	var display = parse_XLWideString(data);
	data.l = end;
	var o = ({rfx:rfx, relId:relId, loc:loc, display:display}/*:any*/);
	if(tooltip) o.Tooltip = tooltip;
	return o;
}
function write_BrtHLink(l, rId) {
	var o = new_buf(50+4*(l[1].Target.length + (l[1].Tooltip || "").length));
	write_UncheckedRfX({s:decode_cell(l[0]), e:decode_cell(l[0])}, o);
	write_RelID("rId" + rId, o);
	var locidx = l[1].Target.indexOf("#");
	var loc = locidx == -1 ? "" : l[1].Target.slice(locidx+1);
	write_XLWideString(loc || "", o);
	write_XLWideString(l[1].Tooltip || "", o);
	write_XLWideString("", o);
	return o.slice(0, o.l);
}

/* [MS-XLSB] 2.4.692 BrtPane */
function parse_BrtPane(/*data, length, opts*/) {
}

/* [MS-XLSB] 2.4.6 BrtArrFmla */
function parse_BrtArrFmla(data, length, opts) {
	var end = data.l + length;
	var rfx = parse_RfX(data, 16);
	var fAlwaysCalc = data.read_shift(1);
	var o = [rfx]; o[2] = fAlwaysCalc;
	if(opts.cellFormula) {
		var formula = parse_XLSBArrayParsedFormula(data, end - data.l, opts);
		o[1] = formula;
	} else data.l = end;
	return o;
}

/* [MS-XLSB] 2.4.750 BrtShrFmla */
function parse_BrtShrFmla(data, length, opts) {
	var end = data.l + length;
	var rfx = parse_UncheckedRfX(data, 16);
	var o = [rfx];
	if(opts.cellFormula) {
		var formula = parse_XLSBSharedParsedFormula(data, end - data.l, opts);
		o[1] = formula;
		data.l = end;
	} else data.l = end;
	return o;
}

/* [MS-XLSB] 2.4.323 BrtColInfo */
/* TODO: once XLS ColInfo is set, combine the functions */
function write_BrtColInfo(C/*:number*/, col, o) {
	if(o == null) o = new_buf(18);
	var p = col_obj_w(C, col);
	o.write_shift(-4, C);
	o.write_shift(-4, C);
	o.write_shift(4, (p.width || 10) * 256);
	o.write_shift(4, 0/*ixfe*/); // style
	var flags = 0;
	if(col.hidden) flags |= 0x01;
	if(typeof p.width == 'number') flags |= 0x02;
	if(col.level) flags |= (col.level << 8);
	o.write_shift(2, flags); // bit flag
	return o;
}

/* [MS-XLSB] 2.4.678 BrtMargins */
var BrtMarginKeys = ["left","right","top","bottom","header","footer"];
function parse_BrtMargins(data/*::, length, opts*/)/*:Margins*/ {
	var margins = ({}/*:any*/);
	BrtMarginKeys.forEach(function(k) { margins[k] = parse_Xnum(data, 8); });
	return margins;
}
function write_BrtMargins(margins/*:Margins*/, o) {
	if(o == null) o = new_buf(6*8);
	default_margins(margins);
	BrtMarginKeys.forEach(function(k) { write_Xnum((margins/*:any*/)[k], o); });
	return o;
}

/* [MS-XLSB] 2.4.299 BrtBeginWsView */
function parse_BrtBeginWsView(data/*::, length, opts*/) {
	var f = data.read_shift(2);
	data.l += 28;
	return { RTL: f & 0x20 };
}
function write_BrtBeginWsView(ws, Workbook, o) {
	if(o == null) o = new_buf(30);
	var f = 0x39c;
	if((((Workbook||{}).Views||[])[0]||{}).RTL) f |= 0x20;
	o.write_shift(2, f); // bit flag
	o.write_shift(4, 0);
	o.write_shift(4, 0); // view first row
	o.write_shift(4, 0); // view first col
	o.write_shift(1, 0); // gridline color ICV
	o.write_shift(1, 0);
	o.write_shift(2, 0);
	o.write_shift(2, 100); // zoom scale
	o.write_shift(2, 0);
	o.write_shift(2, 0);
	o.write_shift(2, 0);
	o.write_shift(4, 0); // workbook view id
	return o;
}

/* [MS-XLSB] 2.4.309 BrtCellIgnoreEC */
function write_BrtCellIgnoreEC(ref) {
	var o = new_buf(24);
	o.write_shift(4, 4);
	o.write_shift(4, 1);
	write_UncheckedRfX(ref, o);
	return o;
}

/* [MS-XLSB] 2.4.748 BrtSheetProtection */
function write_BrtSheetProtection(sp, o) {
	if(o == null) o = new_buf(16*4+2);
	o.write_shift(2, sp.password ? crypto_CreatePasswordVerifier_Method1(sp.password) : 0);
	o.write_shift(4, 1); // this record should not be written if no protection
	[
		["objects",             false], // fObjects
		["scenarios",           false], // fScenarios
		["formatCells",          true], // fFormatCells
		["formatColumns",        true], // fFormatColumns
		["formatRows",           true], // fFormatRows
		["insertColumns",        true], // fInsertColumns
		["insertRows",           true], // fInsertRows
		["insertHyperlinks",     true], // fInsertHyperlinks
		["deleteColumns",        true], // fDeleteColumns
		["deleteRows",           true], // fDeleteRows
		["selectLockedCells",   false], // fSelLockedCells
		["sort",                 true], // fSort
		["autoFilter",           true], // fAutoFilter
		["pivotTables",          true], // fPivotTables
		["selectUnlockedCells", false]  // fSelUnlockedCells
	].forEach(function(n) {
		/*:: if(o == null) throw "unreachable"; */
		if(n[1]) o.write_shift(4, sp[n[0]] != null && !sp[n[0]] ? 1 : 0);
		else      o.write_shift(4, sp[n[0]] != null && sp[n[0]] ? 0 : 1);
	});
	return o;
}

function parse_BrtDVal(/*data, length, opts*/) {
}
function parse_BrtDVal14(/*data, length, opts*/) {
}
/* [MS-XLSB] 2.1.7.62 Worksheet */
function parse_ws_bin(data, _opts, idx, rels, wb/*:WBWBProps*/, themes, styles)/*:Worksheet*/ {
	if(!data) return data;
	var opts = _opts || {};
	if(!rels) rels = {'!id':{}};
	if(DENSE != null && opts.dense == null) opts.dense = DENSE;
	var s/*:Worksheet*/ = ({}); if(opts.dense) s["!data"] = [];

	var ref;
	var refguess = {s: {r:2000000, c:2000000}, e: {r:0, c:0} };

	var state/*:Array<string>*/ = [];
	var pass = false, end = false;
	var row, p, cf, R, C, addr, sstr, rr, cell/*:Cell*/;
	var merges/*:Array<Range>*/ = [];
	opts.biff = 12;
	opts['!row'] = 0;

	var ai = 0, af = false;

	var arrayf/*:Array<[Range, string]>*/ = [];
	var sharedf = {};
	var supbooks = opts.supbooks || /*::(*/wb/*:: :any)*/.supbooks || ([[]]/*:any*/);
	supbooks.sharedf = sharedf;
	supbooks.arrayf = arrayf;
	supbooks.SheetNames = wb.SheetNames || wb.Sheets.map(function(x) { return x.name; });
	if(!opts.supbooks) {
		opts.supbooks = supbooks;
		if(wb.Names) for(var i = 0; i < wb.Names.length; ++i) supbooks[0][i+1] = wb.Names[i];
	}

	var colinfo/*:Array<ColInfo>*/ = [], rowinfo/*:Array<RowInfo>*/ = [];
	var seencol = false;

	XLSBRecordEnum[0x0010] = { n:"BrtShortReal", f:parse_BrtShortReal };

	var cm, vm;
	var date1904 = 1462 * +!!((wb||{}).WBProps||{}).date1904;

	recordhopper(data, function ws_parse(val, RR, RT) {
		if(end) return;
		switch(RT) {
			case 0x0094: /* 'BrtWsDim' */
				ref = val; break;
			case 0x0000: /* 'BrtRowHdr' */
				row = val;
				if(opts.sheetRows && opts.sheetRows <= row.r) end=true;
				rr = encode_row(R = row.r);
				opts['!row'] = row.r;
				if(val.hidden || val.hpt || val.level != null) {
					if(val.hpt) val.hpx = pt2px(val.hpt);
					rowinfo[val.r] = val;
				}
				break;

			case 0x0002: /* 'BrtCellRk' */
			case 0x0003: /* 'BrtCellError' */
			case 0x0004: /* 'BrtCellBool' */
			case 0x0005: /* 'BrtCellReal' */
			case 0x0006: /* 'BrtCellSt' */
			case 0x0007: /* 'BrtCellIsst' */
			case 0x0008: /* 'BrtFmlaString' */
			case 0x0009: /* 'BrtFmlaNum' */
			case 0x000A: /* 'BrtFmlaBool' */
			case 0x000B: /* 'BrtFmlaError' */
			case 0x000D: /* 'BrtShortRk' */
			case 0x000E: /* 'BrtShortError' */
			case 0x000F: /* 'BrtShortBool' */
			case 0x0010: /* 'BrtShortReal' */
			case 0x0011: /* 'BrtShortSt' */
			case 0x0012: /* 'BrtShortIsst' */
			case 0x003E: /* 'BrtCellRString' */
				p = ({t:val[2]}/*:any*/);
				switch(val[2]) {
					case 'n': p.v = val[1]; break;
					case 's': sstr = strs[val[1]]; p.v = sstr.t; p.r = sstr.r; break;
					case 'b': p.v = val[1] ? true : false; break;
					case 'e': p.v = val[1]; if(opts.cellText !== false) p.w = BErr[p.v]; break;
					case 'str': p.t = 's'; p.v = val[1]; break;
					case 'is': p.t = 's'; p.v = val[1].t; break;
				}
				if((cf = styles.CellXf[val[0].iStyleRef])) safe_format(p,cf.numFmtId,null,opts, themes, styles, date1904>0);
				C = val[0].c == -1 ? C + 1 : val[0].c;
				if(opts.dense) { if(!s["!data"][R]) s["!data"][R] = []; s["!data"][R][C] = p; }
				else s[encode_col(C) + rr] = p;
				if(opts.cellFormula) {
					af = false;
					for(ai = 0; ai < arrayf.length; ++ai) {
						var aii = arrayf[ai];
						if(row.r >= aii[0].s.r && row.r <= aii[0].e.r)
							if(C >= aii[0].s.c && C <= aii[0].e.c) {
								p.F = encode_range(aii[0]); af = true;
							}
					}
					if(!af && val.length > 3) p.f = val[3];
				}

				if(refguess.s.r > row.r) refguess.s.r = row.r;
				if(refguess.s.c > C) refguess.s.c = C;
				if(refguess.e.r < row.r) refguess.e.r = row.r;
				if(refguess.e.c < C) refguess.e.c = C;
				if(opts.cellDates && cf && p.t == 'n' && fmt_is_date(table_fmt[cf.numFmtId])) {
					var _d = SSF_parse_date_code(p.v + date1904); if(_d) { p.t = 'd'; p.v = new Date(Date.UTC(_d.y, _d.m-1,_d.d,_d.H,_d.M,_d.S,_d.u)); }
				}
				if(cm) {
					if(cm.type == 'XLDAPR') p.D = true;
					cm = void 0;
				}
				if(vm) vm = void 0;
				break;

			case 0x0001: /* 'BrtCellBlank' */
			case 0x000C: /* 'BrtShortBlank' */
				if(!opts.sheetStubs || pass) break;
				p = ({t:'z',v:void 0}/*:any*/);
				C = val[0].c == -1 ? C + 1 : val[0].c;
				if(opts.dense) { if(!s["!data"][R]) s["!data"][R] = []; s["!data"][R][C] = p; }
				else s[encode_col(C) + rr] = p;
				if(refguess.s.r > row.r) refguess.s.r = row.r;
				if(refguess.s.c > C) refguess.s.c = C;
				if(refguess.e.r < row.r) refguess.e.r = row.r;
				if(refguess.e.c < C) refguess.e.c = C;
				if(cm) {
					if(cm.type == 'XLDAPR') p.D = true;
					cm = void 0;
				}
				if(vm) vm = void 0;
				break;

			case 0x00B0: /* 'BrtMergeCell' */
				merges.push(val); break;

			case 0x0031: { /* 'BrtCellMeta' */
				cm = ((opts.xlmeta||{}).Cell||[])[val-1];
			} break;

			case 0x01EE: /* 'BrtHLink' */
				var rel = rels['!id'][val.relId];
				if(rel) {
					val.Target = rel.Target;
					if(val.loc) val.Target += "#"+val.loc;
					val.Rel = rel;
				} else if(val.relId == '') {
					val.Target = "#" + val.loc;
				}
				for(R=val.rfx.s.r;R<=val.rfx.e.r;++R) for(C=val.rfx.s.c;C<=val.rfx.e.c;++C) {
					if(opts.dense) {
						if(!s["!data"][R]) s["!data"][R] = [];
						if(!s["!data"][R][C]) s["!data"][R][C] = {t:'z',v:undefined};
						s["!data"][R][C].l = val;
					} else {
						addr = encode_col(C) + encode_row(R);
						if(!s[addr]) s[addr] = {t:'z',v:undefined};
						s[addr].l = val;
					}
				}
				break;

			case 0x01AA: /* 'BrtArrFmla' */
				if(!opts.cellFormula) break;
				arrayf.push(val);
				cell = ((opts.dense ? s["!data"][R][C] : s[encode_col(C) + rr])/*:any*/);
				cell.f = stringify_formula(val[1], refguess, {r:row.r, c:C}, supbooks, opts);
				cell.F = encode_range(val[0]);
				break;
			case 0x01AB: /* 'BrtShrFmla' */
				if(!opts.cellFormula) break;
				sharedf[encode_cell(val[0].s)] = val[1];
				cell = (opts.dense ? s["!data"][R][C] : s[encode_col(C) + rr]);
				cell.f = stringify_formula(val[1], refguess, {r:row.r, c:C}, supbooks, opts);
				break;

			/* identical to 'ColInfo' in XLS */
			case 0x003C: /* 'BrtColInfo' */
				if(!opts.cellStyles) break;
				while(val.e >= val.s) {
					colinfo[val.e--] = { width: val.w/256, hidden: !!(val.flags & 0x01), level: val.level };
					if(!seencol) { seencol = true; find_mdw_colw(val.w/256); }
					process_col(colinfo[val.e+1]);
				}
				break;

			case 0x0227: /* 'BrtLegacyDrawing' */
				if(val) s["!legrel"] = val;
				break;

			case 0x00A1: /* 'BrtBeginAFilter' */
				s['!autofilter'] = { ref:encode_range(val) };
				break;

			case 0x01DC: /* 'BrtMargins' */
				s['!margins'] = val;
				break;

			case 0x0093: /* 'BrtWsProp' */
				if(!wb.Sheets[idx]) wb.Sheets[idx] = {};
				if(val.name) wb.Sheets[idx].CodeName = val.name;
				if(val.above || val.left) s['!outline'] = { above: val.above, left: val.left };
				break;

			case 0x0089: /* 'BrtBeginWsView' */
				if(!wb.Views) wb.Views = [{}];
				if(!wb.Views[0]) wb.Views[0] = {};
				if(val.RTL) wb.Views[0].RTL = true;
				break;

			case 0x01E5: /* 'BrtWsFmtInfo' */
				break;

			case 0x0040: /* 'BrtDVal' */
			case 0x041D: /* 'BrtDVal14' */
				break;

			case 0x0097: /* 'BrtPane' */
				break;
			case 0x0098: /* 'BrtSel' */
			case 0x00AF: /* 'BrtAFilterDateGroupItem' */
			case 0x0284: /* 'BrtActiveX' */
			case 0x0271: /* 'BrtBigName' */
			case 0x0232: /* 'BrtBkHim' */
			case 0x018C: /* 'BrtBrk' */
			case 0x0458: /* 'BrtCFIcon' */
			case 0x047A: /* 'BrtCFRuleExt' */
			case 0x01D7: /* 'BrtCFVO' */
			case 0x041A: /* 'BrtCFVO14' */
			case 0x0289: /* 'BrtCellIgnoreEC' */
			case 0x0451: /* 'BrtCellIgnoreEC14' */
			case 0x024D: /* 'BrtCellSmartTagProperty' */
			case 0x025F: /* 'BrtCellWatch' */
			case 0x0234: /* 'BrtColor' */
			case 0x041F: /* 'BrtColor14' */
			case 0x00A8: /* 'BrtColorFilter' */
			case 0x00AE: /* 'BrtCustomFilter' */
			case 0x049C: /* 'BrtCustomFilter14' */
			case 0x01F3: /* 'BrtDRef' */
			case 0x01FB: /* 'BrtDXF' */
			case 0x0226: /* 'BrtDrawing' */
			case 0x00AB: /* 'BrtDynamicFilter' */
			case 0x00A7: /* 'BrtFilter' */
			case 0x0499: /* 'BrtFilter14' */
			case 0x00A9: /* 'BrtIconFilter' */
			case 0x049D: /* 'BrtIconFilter14' */
			case 0x0228: /* 'BrtLegacyDrawingHF' */
			case 0x0295: /* 'BrtListPart' */
			case 0x027F: /* 'BrtOleObject' */
			case 0x01DE: /* 'BrtPageSetup' */
			case 0x0219: /* 'BrtPhoneticInfo' */
			case 0x01DD: /* 'BrtPrintOptions' */
			case 0x0218: /* 'BrtRangeProtection' */
			case 0x044F: /* 'BrtRangeProtection14' */
			case 0x02A8: /* 'BrtRangeProtectionIso' */
			case 0x0450: /* 'BrtRangeProtectionIso14' */
			case 0x0400: /* 'BrtRwDescent' */
			case 0x0297: /* 'BrtSheetCalcProp' */
			case 0x0217: /* 'BrtSheetProtection' */
			case 0x02A6: /* 'BrtSheetProtectionIso' */
			case 0x01F8: /* 'BrtSlc' */
			case 0x0413: /* 'BrtSparkline' */
			case 0x01AC: /* 'BrtTable' */
			case 0x00AA: /* 'BrtTop10Filter' */
			case 0x0C00: /* 'BrtUid' */
			case 0x0032: /* 'BrtValueMeta' */
			case 0x0816: /* 'BrtWebExtension' */
			case 0x0415: /* 'BrtWsFmtInfoEx14' */
				break;

			case 0x0023: /* 'BrtFRTBegin' */
				pass = true; break;
			case 0x0024: /* 'BrtFRTEnd' */
				pass = false; break;
			case 0x0025: /* 'BrtACBegin' */
				state.push(RT); pass = true; break;
			case 0x0026: /* 'BrtACEnd' */
				state.pop(); pass = false; break;

			default:
				if(RR.T){/* empty */}
				else if(!pass || opts.WTF) throw new Error("Unexpected record 0x" + RT.toString(16));
		}
	}, opts);

	delete opts.supbooks;
	delete opts['!row'];

	if(!s["!ref"] && (refguess.s.r < 2000000 || ref && (ref.e.r > 0 || ref.e.c > 0 || ref.s.r > 0 || ref.s.c > 0))) s["!ref"] = encode_range(ref || refguess);
	if(opts.sheetRows && s["!ref"]) {
		var tmpref = safe_decode_range(s["!ref"]);
		if(opts.sheetRows <= +tmpref.e.r) {
			tmpref.e.r = opts.sheetRows - 1;
			if(tmpref.e.r > refguess.e.r) tmpref.e.r = refguess.e.r;
			if(tmpref.e.r < tmpref.s.r) tmpref.s.r = tmpref.e.r;
			if(tmpref.e.c > refguess.e.c) tmpref.e.c = refguess.e.c;
			if(tmpref.e.c < tmpref.s.c) tmpref.s.c = tmpref.e.c;
			s["!fullref"] = s["!ref"];
			s["!ref"] = encode_range(tmpref);
		}
	}
	if(merges.length > 0) s["!merges"] = merges;
	if(colinfo.length > 0) s["!cols"] = colinfo;
	if(rowinfo.length > 0) s["!rows"] = rowinfo;
	if(rels['!id'][s['!legrel']]) s['!legdrawel'] = rels['!id'][s['!legrel']];
	return s;
}

/* TODO: something useful -- this is a stub */
function write_ws_bin_cell(ba/*:BufArray*/, cell/*:Cell*/, R/*:number*/, C/*:number*/, opts, ws/*:Worksheet*/, last_seen/*:boolean*/, date1904/*:boolean*/)/*:boolean*/ {
	var o/*:any*/ = ({r:R, c:C}/*:any*/);
	if(cell.c) ws['!comments'].push([encode_cell(o), cell.c]);
	if(cell.v === undefined) return false;
	var vv = "";
	switch(cell.t) {
		case 'b': vv = cell.v ? "1" : "0"; break;
		case 'd': // no BrtCellDate :(
			cell = dup(cell);
			cell.z = cell.z || table_fmt[14];
			cell.v = datenum(parseDate(cell.v, date1904), date1904); cell.t = 'n';
			break;
		/* falls through */
		case 'n': case 'e': vv = ''+cell.v; break;
		default: vv = cell.v; break;
	}
	/* TODO: cell style */
	o.s = get_cell_style(opts.cellXfs, cell, opts);
	if(cell.l) ws['!links'].push([encode_cell(o), cell.l]);
	switch(cell.t) {
		case 's': case 'str':
			if(opts.bookSST) {
				vv = get_sst_id(opts.Strings, (cell.v == null ? "" : String(cell.v)/*:any*/), opts.revStrings);
				o.t = "s"; o.v = vv;
				if(last_seen) write_record(ba, 0x0012 /* BrtShortIsst */, write_BrtShortIsst(cell, o));
				else write_record(ba, 0x0007 /* BrtCellIsst */, write_BrtCellIsst(cell, o));
			} else {
				o.t = "str";
				if(last_seen) write_record(ba, 0x0011 /* BrtShortSt */, write_BrtShortSt(cell, o));
				else write_record(ba, 0x0006 /* BrtCellSt */, write_BrtCellSt(cell, o));
			}
			return true;
		case 'n':
			/* TODO: determine threshold for Real vs RK */
			if(cell.v == (cell.v | 0) && cell.v > -1000 && cell.v < 1000) {
				if(last_seen) write_record(ba, 0x000D /* BrtShortRk */, write_BrtShortRk(cell, o));
				else write_record(ba, 0x0002 /* BrtCellRk */, write_BrtCellRk(cell, o));
			} else if(!isFinite(cell.v)) {
				o.t = "e";
				if(isNaN(cell.v)) {
					if(last_seen) write_record(ba, 0x000E /* BrtShortError */, write_BrtShortError({t:"e", v: 0x24}, o)); // #NUM!
					else write_record(ba, 0x0003 /* BrtCellError */, write_BrtCellError({t:"e", v: 0x24}, o)); // #NUM!
				} else {
					if(last_seen) write_record(ba, 0x000E /* BrtShortError */, write_BrtShortError({t:"e", v: 0x07}, o)); // #DIV/0!
					else write_record(ba, 0x0003 /* BrtCellError */, write_BrtCellError({t:"e", v: 0x07}, o)); // #DIV/0!
				}
			} else {
				if(last_seen) write_record(ba, 0x0010 /* BrtShortReal */, write_BrtShortReal(cell, o));
				else write_record(ba, 0x0005 /* BrtCellReal */, write_BrtCellReal(cell, o));
			} return true;
		case 'b':
			o.t = "b";
			if(last_seen) write_record(ba, 0x000F /* BrtShortBool */, write_BrtShortBool(cell, o));
			else write_record(ba, 0x0004 /* BrtCellBool */, write_BrtCellBool(cell, o));
			return true;
		case 'e':
			o.t = "e";
			if(last_seen) write_record(ba, 0x000E /* BrtShortError */, write_BrtShortError(cell, o));
			else write_record(ba, 0x0003 /* BrtCellError */, write_BrtCellError(cell, o));
			return true;
	}
	if(last_seen) write_record(ba, 0x000C /* BrtShortBlank */, write_BrtShortBlank(cell, o));
	else write_record(ba, 0x0001 /* BrtCellBlank */, write_BrtCellBlank(cell, o));
	return true;
}

function write_CELLTABLE(ba, ws/*:Worksheet*/, idx/*:number*/, opts, wb/*:Workbook*/) {
	var range = safe_decode_range(ws['!ref'] || "A1"), rr = "", cols/*:Array<string>*/ = [];
	var date1904 = (((wb||{}).Workbook||{}).WBProps||{}).date1904;
	write_record(ba, 0x0091 /* BrtBeginSheetData */);
	var dense = ws["!data"] != null, row = dense ? ws["!data"][range.s.r] : [];
	var cap = range.e.r;
	if(ws['!rows']) cap = Math.max(range.e.r, ws['!rows'].length - 1);
	for(var R = range.s.r; R <= cap; ++R) {
		rr = encode_row(R);
		if(dense) row = ws["!data"][R];
		/* [ACCELLTABLE] */
		/* BrtRowHdr */
		write_row_header(ba, ws, range, R);
		if(dense && !row) continue;
		var last_seen = false;
		if(R <= range.e.r) for(var C = range.s.c; C <= range.e.c; ++C) {
			/* *16384CELL */
			if(R === range.s.r) cols[C] = encode_col(C);
			var cell = dense ? row[C] : ws[cols[C] + rr];
			if(!cell) { last_seen = false; continue; }
			/* write cell */
			last_seen = write_ws_bin_cell(ba, cell, R, C, opts, ws, last_seen, date1904);
		}
	}
	write_record(ba, 0x0092 /* BrtEndSheetData */);
}

function write_MERGECELLS(ba, ws/*:Worksheet*/) {
	if(!ws || !ws['!merges']) return;
	write_record(ba, 0x00B1 /* BrtBeginMergeCells */, write_BrtBeginMergeCells(ws['!merges'].length));
	ws['!merges'].forEach(function(m) { write_record(ba, 0x00B0 /* BrtMergeCell */, write_BrtMergeCell(m)); });
	write_record(ba, 0x00B2 /* BrtEndMergeCells */);
}

function write_COLINFOS(ba, ws/*:Worksheet*//*::, idx:number, opts, wb:Workbook*/) {
	if(!ws || !ws['!cols']) return;
	write_record(ba, 0x0186 /* BrtBeginColInfos */);
	ws['!cols'].forEach(function(m, i) { if(m) write_record(ba, 0x003C /* 'BrtColInfo' */, write_BrtColInfo(i, m)); });
	write_record(ba, 0x0187 /* BrtEndColInfos */);
}

function write_IGNOREECS(ba, ws/*:Worksheet*/) {
	if(!ws || !ws['!ref']) return;
	write_record(ba, 0x0288 /* BrtBeginCellIgnoreECs */);
	write_record(ba, 0x0289 /* BrtCellIgnoreEC */, write_BrtCellIgnoreEC(safe_decode_range(ws['!ref'])));
	write_record(ba, 0x028A /* BrtEndCellIgnoreECs */);
}

function write_HLINKS(ba, ws/*:Worksheet*/, rels) {
	/* *BrtHLink */
	ws['!links'].forEach(function(l) {
		if(!l[1].Target) return;
		var rId = add_rels(rels, -1, l[1].Target.replace(/#[\s\S]*$/, ""), RELS.HLINK);
		write_record(ba, 0x01EE /* BrtHLink */, write_BrtHLink(l, rId));
	});
	delete ws['!links'];
}
function write_LEGACYDRAWING(ba, ws/*:Worksheet*/, idx/*:number*/, rels) {
	/* [BrtLegacyDrawing] */
	if(ws['!comments'].length > 0) {
		var rId = add_rels(rels, -1, "../drawings/vmlDrawing" + (idx+1) + ".vml", RELS.VML);
		write_record(ba, 0x0227 /* BrtLegacyDrawing */, write_RelID("rId" + rId));
		ws['!legacy'] = rId;
	}
}

function write_AUTOFILTER(ba, ws, wb, idx) {
	if(!ws['!autofilter']) return;
	var data = ws['!autofilter'];
	var ref = typeof data.ref === "string" ? data.ref : encode_range(data.ref);

	/* Update FilterDatabase defined name for the worksheet */
	if(!wb.Workbook) wb.Workbook = ({Sheets:[]}/*:any*/);
	if(!wb.Workbook.Names) wb.Workbook.Names = [];
	var names/*: Array<any> */ = wb.Workbook.Names;
	var range = decode_range(ref);
	if(range.s.r == range.e.r) { range.e.r = decode_range(ws["!ref"]).e.r; ref = encode_range(range); }
	for(var i = 0; i < names.length; ++i) {
		var name = names[i];
		if(name.Name != '_xlnm._FilterDatabase') continue;
		if(name.Sheet != idx) continue;
		name.Ref = formula_quote_sheet_name(wb.SheetNames[idx]) + "!" + fix_range(ref); break;
	}
	if(i == names.length) names.push({ Name: '_xlnm._FilterDatabase', Sheet: idx, Ref: formula_quote_sheet_name(wb.SheetNames[idx]) + "!" + fix_range(ref)  });

	write_record(ba, 0x00A1 /* BrtBeginAFilter */, write_UncheckedRfX(safe_decode_range(ref)));
	/* *FILTERCOLUMN */
	/* [SORTSTATE] */
	/* BrtEndAFilter */
	write_record(ba, 0x00A2 /* BrtEndAFilter */);
}

function write_WSVIEWS2(ba, ws, Workbook) {
	write_record(ba, 0x0085 /* BrtBeginWsViews */);
	{ /* 1*WSVIEW2 */
		/* [ACUID] */
		write_record(ba, 0x0089 /* BrtBeginWsView */, write_BrtBeginWsView(ws, Workbook));
		/* [BrtPane] */
		/* *4BrtSel */
		/* *4SXSELECT */
		/* *FRT */
		write_record(ba, 0x008A /* BrtEndWsView */);
	}
	/* *FRT */
	write_record(ba, 0x0086 /* BrtEndWsViews */);
}

function write_WSFMTINFO(/*::ba, ws*/) {
	/* [ACWSFMTINFO] */
	// write_record(ba, 0x01E5 /* BrtWsFmtInfo */, write_BrtWsFmtInfo(ws));
}

function write_SHEETPROTECT(ba, ws) {
	if(!ws['!protect']) return;
	/* [BrtSheetProtectionIso] */
	write_record(ba, 0x0217 /* BrtSheetProtection */, write_BrtSheetProtection(ws['!protect']));
}

function write_ws_bin(idx/*:number*/, opts, wb/*:Workbook*/, rels) {
	var ba = buf_array();
	var s = wb.SheetNames[idx], ws = wb.Sheets[s] || {};
	var c/*:string*/ = s; try { if(wb && wb.Workbook) c = wb.Workbook.Sheets[idx].CodeName || c; } catch(e) {}
	var r = safe_decode_range(ws['!ref'] || "A1");
	if(r.e.c > 0x3FFF || r.e.r > 0xFFFFF) {
		if(opts.WTF) throw new Error("Range " + (ws['!ref'] || "A1") + " exceeds format limit A1:XFD1048576");
		r.e.c = Math.min(r.e.c, 0x3FFF);
		r.e.r = Math.min(r.e.c, 0xFFFFF);
	}
	ws['!links'] = [];
	/* passed back to write_zip and removed there */
	ws['!comments'] = [];
	write_record(ba, 0x0081 /* BrtBeginSheet */);
	if(wb.vbaraw || ws['!outline']) write_record(ba, 0x0093 /* BrtWsProp */, write_BrtWsProp(c, ws['!outline']));
	write_record(ba, 0x0094 /* BrtWsDim */, write_BrtWsDim(r));
	write_WSVIEWS2(ba, ws, wb.Workbook);
	write_WSFMTINFO(ba, ws);
	write_COLINFOS(ba, ws, idx, opts, wb);
	write_CELLTABLE(ba, ws, idx, opts, wb);
	/* [BrtSheetCalcProp] */
	write_SHEETPROTECT(ba, ws);
	/* *([BrtRangeProtectionIso] BrtRangeProtection) */
	/* [SCENMAN] */
	write_AUTOFILTER(ba, ws, wb, idx);
	/* [SORTSTATE] */
	/* [DCON] */
	/* [USERSHVIEWS] */
	write_MERGECELLS(ba, ws);
	/* [BrtPhoneticInfo] */
	/* *CONDITIONALFORMATTING */
	/* [DVALS] */
	write_HLINKS(ba, ws, rels);
	/* [BrtPrintOptions] */
	if(ws['!margins']) write_record(ba, 0x01DC /* BrtMargins */, write_BrtMargins(ws['!margins']));
	/* [BrtPageSetup] */
	/* [HEADERFOOTER] */
	/* [RWBRK] */
	/* [COLBRK] */
	/* *BrtBigName */
	/* [CELLWATCHES] */
	if(!opts || opts.ignoreEC || (opts.ignoreEC == (void 0))) write_IGNOREECS(ba, ws);
	/* [SMARTTAGS] */
	/* [BrtDrawing] */
	write_LEGACYDRAWING(ba, ws, idx, rels);
	/* [BrtLegacyDrawingHF] */
	/* [BrtBkHim] */
	/* [OLEOBJECTS] */
	/* [ACTIVEXCONTROLS] */
	/* [WEBPUBITEMS] */
	/* [LISTPARTS] */
	/* FRTWORKSHEET */
	write_record(ba, 0x0082 /* BrtEndSheet */);
	return ba.end();
}
