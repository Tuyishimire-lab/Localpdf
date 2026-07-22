'use client';

import { useState, useEffect } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { downloadFile, formatBytes } from '../../../lib/utils';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';

export default function WordToPdfTool() {
  const [files, setFiles] = useState([]);
  const [pageSize, setPageSize] = useState('a4'); // 'a4' | 'letter'
  const [marginSize, setMarginSize] = useState('standard'); // 'none' (20) | 'standard' (50) | 'wide' (80)
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('helvetica'); // 'helvetica' | 'courier' | 'times'
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  const [addPageNumbers, setAddPageNumbers] = useState(true);

  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [poppinsFonts, setPoppinsFonts] = useState(null);
  const [fontsLoading, setFontsLoading] = useState(true);

  // Preload Poppins TTF files for professional PDF styling
  useEffect(() => {
    let active = true;
    const loadFonts = async () => {
      try {
        const fontFiles = [
          { name: 'Regular', url: '/fonts/Poppins-Regular.ttf' },
          { name: 'Bold', url: '/fonts/Poppins-Bold.ttf' },
          { name: 'Italic', url: '/fonts/Poppins-Italic.ttf' },
          { name: 'BoldItalic', url: '/fonts/Poppins-BoldItalic.ttf' }
        ];

        const loadedFonts = {};
        for (const file of fontFiles) {
          const response = await fetch(file.url);
          if (!response.ok) {
            throw new Error(`Failed to load font: ${file.name}`);
          }
          const buffer = await response.arrayBuffer();
          loadedFonts[file.name] = buffer;
        }

        if (active) {
          setPoppinsFonts(loadedFonts);
          setFontsLoading(false);
        }
      } catch (err) {
        console.error("Error preloading Poppins fonts:", err);
        if (active) {
          setFontsLoading(false);
        }
      }
    };

    loadFonts();
    return () => {
      active = false;
    };
  }, []);

  // Utility to convert hex strings to pdf-lib rgb values
  const hexToRgb = (hexStr) => {
    if (!hexStr) return rgb(0.1, 0.1, 0.1);
    let cleanHex = hexStr.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(char => char + char).join('');
    }
    if (cleanHex.length !== 6) return rgb(0.1, 0.1, 0.1);
    
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    
    return rgb(
      isNaN(r) ? 0.1 : r,
      isNaN(g) ? 0.1 : g,
      isNaN(b) ? 0.1 : b
    );
  };

  const handleFilesSelected = (newFiles) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleClear = () => {
    setFiles([]);
    setProcessedBlob(null);
  };

  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  // Extract paragraphs, alignments, and styling runs from a docx XML file
  const extractStructuredParagraphsFromDocx = async (zipDoc) => {
    try {
      const documentXmlFile = zipDoc.file("word/document.xml");
      if (!documentXmlFile) {
        throw new Error("Invalid document: word/document.xml not found");
      }

      const xmlText = await documentXmlFile.async("string");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      // Get all paragraphs using namespace-aware lookup or standard tag lookup
      const getElemsByLocalName = (parent, localName) => {
        if (parent.getElementsByTagNameNS) {
          return parent.getElementsByTagNameNS('*', localName);
        }
        return parent.getElementsByTagName(`w:${localName}`);
      };

      // Parse relationships to resolve image targets
      const relsMap = {};
      const relsFile = zipDoc.file("word/_rels/document.xml.rels");
      if (relsFile) {
        const relsXml = await relsFile.async("string");
        const relsDoc = parser.parseFromString(relsXml, "text/xml");
        const rels = relsDoc.getElementsByTagName('Relationship');
        for (let k = 0; k < rels.length; k++) {
          const id = rels[k].getAttribute('Id');
          const target = rels[k].getAttribute('Target');
          if (id && target) {
            relsMap[id] = target;
          }
        }
      }

      // Track counters per numId+ilvl key for ordered lists
      const listCounters = {};
      // Parse numbering.xml to determine which numIds are ordered (decimal)
      const orderedNumIds = new Set();
      try {
        const numXmlFile = zipDoc.file('word/numbering.xml');
        if (numXmlFile) {
          const numXmlText = await numXmlFile.async('text');
          const numDoc = new DOMParser().parseFromString(numXmlText, 'text/xml');
          const abstractNumElems = getElemsByLocalName(numDoc, 'abstractNum');
          const decimalAbstractIds = new Set();
          for (let k = 0; k < abstractNumElems.length; k++) {
            const lvlElems = getElemsByLocalName(abstractNumElems[k], 'lvl');
            for (let m = 0; m < lvlElems.length; m++) {
              const numFmtElem = getElemsByLocalName(lvlElems[m], 'numFmt')[0];
              if (numFmtElem) {
                const fmtVal = numFmtElem.getAttribute('w:val') || numFmtElem.getAttribute('val');
                if (fmtVal && fmtVal !== 'bullet') {
                  const absId = abstractNumElems[k].getAttribute('w:abstractNumId') || abstractNumElems[k].getAttribute('abstractNumId');
                  if (absId) decimalAbstractIds.add(absId);
                }
              }
            }
          }
          const numElems = getElemsByLocalName(numDoc, 'num');
          for (let k = 0; k < numElems.length; k++) {
            const numId = numElems[k].getAttribute('w:numId') || numElems[k].getAttribute('numId');
            const absRefElem = getElemsByLocalName(numElems[k], 'abstractNumId')[0];
            if (numId && absRefElem) {
              const absId = absRefElem.getAttribute('w:val') || absRefElem.getAttribute('val');
              if (absId && decimalAbstractIds.has(absId)) orderedNumIds.add(numId);
            }
          }
        }
      } catch (numErr) {
        console.warn('Could not parse numbering.xml:', numErr);
      }

      // Helper: parse runs from a single <w:p> element
      const parseParagraphElement = (pElem, pDefaults) => {
        const { fontSize, fontFamily, isListItem: _li, listLevel: _ll, isOrdered: _io, listNumId: _ln, spacingBefore: _sb, spacingAfter: _sa, leftIndent: _li2, rightIndent: _ri } = pDefaults;

        let align = 'left';
        let isListItem = false;
        let listLevel = 0;
        let isOrdered = false;
        let listNumId = null;
        let spacingBefore = 0;
        let spacingAfter = 0;
        let leftIndent = 0;
        let rightIndent = 0;

        const pPrElem = getElemsByLocalName(pElem, 'pPr')[0];
        if (pPrElem) {
          const jcElem = getElemsByLocalName(pPrElem, 'jc')[0];
          if (jcElem) {
            const val = jcElem.getAttribute('w:val') || jcElem.getAttribute('val');
            if (val === 'center') align = 'center';
            else if (val === 'right') align = 'right';
            else if (val === 'both' || val === 'justify') align = 'justify';
          }
          const numPrElem = getElemsByLocalName(pPrElem, 'numPr')[0];
          if (numPrElem) {
            isListItem = true;
            const ilvlElem = getElemsByLocalName(numPrElem, 'ilvl')[0];
            if (ilvlElem) {
              const val = ilvlElem.getAttribute('w:val') || ilvlElem.getAttribute('val');
              listLevel = parseInt(val, 10) || 0;
            }
            const numIdElem = getElemsByLocalName(numPrElem, 'numId')[0];
            if (numIdElem) {
              const nId = numIdElem.getAttribute('w:val') || numIdElem.getAttribute('val');
              isOrdered = nId ? orderedNumIds.has(nId) : false;
              listNumId = nId || null;
            }
          }
          const spacingElem = getElemsByLocalName(pPrElem, 'spacing')[0];
          if (spacingElem) {
            const beforeVal = spacingElem.getAttribute('w:before') || spacingElem.getAttribute('before');
            const afterVal = spacingElem.getAttribute('w:after') || spacingElem.getAttribute('after');
            if (beforeVal && !isNaN(parseInt(beforeVal, 10))) spacingBefore = parseInt(beforeVal, 10) / 20;
            if (afterVal && !isNaN(parseInt(afterVal, 10))) spacingAfter = parseInt(afterVal, 10) / 20;
          }
          const indElem = getElemsByLocalName(pPrElem, 'ind')[0];
          if (indElem) {
            const leftVal = indElem.getAttribute('w:left') || indElem.getAttribute('left');
            const rightVal = indElem.getAttribute('w:right') || indElem.getAttribute('right');
            if (leftVal && !isNaN(parseInt(leftVal, 10))) leftIndent = parseInt(leftVal, 10) / 20;
            if (rightVal && !isNaN(parseInt(rightVal, 10))) rightIndent = parseInt(rightVal, 10) / 20;
          }
        }

        const rElements = getElemsByLocalName(pElem, 'r');
        const runs = [];
        for (let j = 0; j < rElements.length; j++) {
          const rElem = rElements[j];
          const drawingElem = getElemsByLocalName(rElem, 'drawing')[0];
          if (drawingElem) {
            const blipElem = getElemsByLocalName(drawingElem, 'blip')[0];
            const extentElem = getElemsByLocalName(drawingElem, 'extent')[0];
            if (blipElem && extentElem) {
              const embedId = blipElem.getAttribute('r:embed') || blipElem.getAttribute('embed');
              const cx = parseInt(extentElem.getAttribute('cx'), 10);
              const cy = parseInt(extentElem.getAttribute('cy'), 10);
              if (embedId && !isNaN(cx) && !isNaN(cy)) {
                const relTarget = relsMap[embedId];
                if (relTarget) {
                  const zipPath = relTarget.startsWith('media/') ? 'word/' + relTarget : (relTarget.startsWith('/') ? relTarget.substring(1) : 'word/' + relTarget);
                  let isFloating = false, floatX = 0, floatY = 0;
                  const anchorElem = getElemsByLocalName(drawingElem, 'anchor')[0];
                  if (anchorElem) {
                    isFloating = true;
                    const positionH = getElemsByLocalName(anchorElem, 'positionH')[0];
                    if (positionH) { const posOffset = getElemsByLocalName(positionH, 'posOffset')[0]; if (posOffset?.textContent) floatX = parseInt(posOffset.textContent, 10) / 12700; }
                    const positionV = getElemsByLocalName(anchorElem, 'positionV')[0];
                    if (positionV) { const posOffset = getElemsByLocalName(positionV, 'posOffset')[0]; if (posOffset?.textContent) floatY = parseInt(posOffset.textContent, 10) / 12700; }
                  }
                  runs.push({ type: 'image', embedId, zipPath, width: cx / 12700, height: cy / 12700, isFloating, floatX, floatY });
                  continue;
                }
              }
            }
          }
          const brElems = getElemsByLocalName(rElem, 'br');
          let hasPageBreak = false;
          for (let k = 0; k < brElems.length; k++) {
            const brType = brElems[k].getAttribute('w:type') || brElems[k].getAttribute('type');
            if (brType === 'page') { hasPageBreak = true; break; }
          }
          if (hasPageBreak) { runs.push({ type: 'pageBreak' }); continue; }

          const textNode = getElemsByLocalName(rElem, 't')[0];
          if (!textNode) continue;

          let text = textNode.textContent;
          let bold = false, italic = false, underline = false, strike = false;
          let size = fontSize, fontFace = fontFamily, colorHex = null;

          const rPr = getElemsByLocalName(rElem, 'rPr')[0];
          if (rPr) {
            const bElem = getElemsByLocalName(rPr, 'b')[0];
            if (bElem) { const val = bElem.getAttribute('w:val') || bElem.getAttribute('val'); if (val !== 'false' && val !== '0') bold = true; }
            const iElem = getElemsByLocalName(rPr, 'i')[0];
            if (iElem) { const val = iElem.getAttribute('w:val') || iElem.getAttribute('val'); if (val !== 'false' && val !== '0') italic = true; }
            const uElem = getElemsByLocalName(rPr, 'u')[0];
            if (uElem) { const val = uElem.getAttribute('w:val') || uElem.getAttribute('val'); if (val !== 'false' && val !== 'none') underline = true; }
            const strikeElem = getElemsByLocalName(rPr, 'strike')[0];
            if (strikeElem) { const val = strikeElem.getAttribute('w:val') || strikeElem.getAttribute('val'); if (val !== 'false' && val !== '0') strike = true; }
            const szElem = getElemsByLocalName(rPr, 'sz')[0];
            if (szElem) { const val = parseInt(szElem.getAttribute('w:val') || szElem.getAttribute('val'), 10); if (!isNaN(val)) size = val / 2; }
            const rFontsElem = getElemsByLocalName(rPr, 'rFonts')[0];
            if (rFontsElem) {
              const ascii = rFontsElem.getAttribute('w:ascii') || rFontsElem.getAttribute('ascii') || '';
              const hAnsi = rFontsElem.getAttribute('w:hAnsi') || rFontsElem.getAttribute('hAnsi') || '';
              const f = (ascii || hAnsi).toLowerCase();
              if (f.includes('courier') || f.includes('consolas') || f.includes('mono')) fontFace = 'courier';
              else if (f.includes('times') || f.includes('georgia') || f.includes('serif')) fontFace = 'times';
              else fontFace = 'helvetica';
            }
            const colorElem = getElemsByLocalName(rPr, 'color')[0];
            if (colorElem) colorHex = colorElem.getAttribute('w:val') || colorElem.getAttribute('val') || null;
          }
          runs.push({ type: 'text', text, bold, italic, underline, strike, fontSize: size, fontFamily: fontFace, colorHex });
        }

        // Prefix list items
        if (isListItem && runs.length > 0) {
          const indentPrefix = '  '.repeat(listLevel);
          let listPrefix;
          if (isOrdered && listNumId) {
            const counterKey = `${listNumId}:${listLevel}`;
            listCounters[counterKey] = (listCounters[counterKey] || 0) + 1;
            listPrefix = `${indentPrefix}${listCounters[counterKey]}.  `;
          } else {
            listPrefix = `${indentPrefix}\u2022  `;
          }
          const firstRun = runs.find(r => r.type === 'text');
          if (firstRun) { firstRun.text = `${listPrefix}${firstRun.text}`; }
          else { runs.unshift({ type: 'text', text: listPrefix, bold: false, italic: false, underline: false, strike: false, fontSize: runs[0]?.fontSize || fontSize, fontFamily: runs[0]?.fontFamily || fontFamily, colorHex: runs[0]?.colorHex || null }); }
        }

        return { align, runs, spacingBefore, spacingAfter, leftIndent, rightIndent };
      };

      // Helper: parse a <w:tbl> element into table data
      const parseTableElement = (tblElem) => {
        // Parse column widths from tblGrid
        const colWidths = [];
        const tblGridElem = getElemsByLocalName(tblElem, 'tblGrid')[0];
        if (tblGridElem) {
          const gridCols = getElemsByLocalName(tblGridElem, 'gridCol');
          for (let k = 0; k < gridCols.length; k++) {
            const w = parseInt(gridCols[k].getAttribute('w:w') || gridCols[k].getAttribute('w') || '0', 10);
            colWidths.push(w / 20); // dxa to points
          }
        }

        const rows = [];
        const trElems = getElemsByLocalName(tblElem, 'tr');
        for (let r = 0; r < trElems.length; r++) {
          const trElem = trElems[r];
          const cells = [];
          const tcElems = getElemsByLocalName(trElem, 'tc');
          for (let c = 0; c < tcElems.length; c++) {
            const tcElem = tcElems[c];
            // Cell properties
            let cellWidth = colWidths[c] || 72;
            let colSpan = 1;
            let bgColorHex = null;
            const tcPr = getElemsByLocalName(tcElem, 'tcPr')[0];
            if (tcPr) {
              const tcWElem = getElemsByLocalName(tcPr, 'tcW')[0];
              if (tcWElem) {
                const w = parseInt(tcWElem.getAttribute('w:w') || tcWElem.getAttribute('w') || '0', 10);
                if (w > 0) cellWidth = w / 20;
              }
              const gridSpanElem = getElemsByLocalName(tcPr, 'gridSpan')[0];
              if (gridSpanElem) colSpan = parseInt(gridSpanElem.getAttribute('w:val') || gridSpanElem.getAttribute('val') || '1', 10);
              const shdElem = getElemsByLocalName(tcPr, 'shd')[0];
              if (shdElem) {
                const fillVal = shdElem.getAttribute('w:fill') || shdElem.getAttribute('fill');
                if (fillVal && fillVal !== 'auto' && fillVal !== 'FFFFFF' && fillVal.length === 6) bgColorHex = fillVal;
              }
            }
            // Parse paragraphs inside cell
            const cellParagraphs = [];
            const cellPElems = getElemsByLocalName(tcElem, 'p');
            for (let p = 0; p < cellPElems.length; p++) {
              const parsed = parseParagraphElement(cellPElems[p], { fontSize, fontFamily });
              cellParagraphs.push(parsed);
            }
            cells.push({ width: cellWidth, colSpan, bgColorHex, paragraphs: cellParagraphs });
          }
          rows.push(cells);
        }

        const totalWidth = colWidths.reduce((a, b) => a + b, 0);
        return { type: 'table', colWidths, rows, totalWidth };
      };

      // Helper: safely process a single body-level element (p or tbl)
      const processBodyChild = (child) => {
        try {
          if (child.localName === 'p') {
            const parsed = parseParagraphElement(child, { fontSize, fontFamily });
            if (parsed.runs.length > 0) {
              paragraphs.push(parsed);
            } else {
              paragraphs.push({ align: 'left', runs: [{ type: 'text', text: '', bold: false, italic: false, underline: false, strike: false, fontSize, fontFamily }], spacingBefore: parsed.spacingBefore, spacingAfter: parsed.spacingAfter, leftIndent: 0, rightIndent: 0 });
            }
          } else if (child.localName === 'tbl') {
            paragraphs.push(parseTableElement(child));
          } else if (child.localName === 'sdt') {
            // Structured document tag: recurse into sdtContent
            const sdtContent = getElemsByLocalName(child, 'sdtContent')[0];
            if (sdtContent) {
              Array.from(sdtContent.childNodes).forEach(sdtChild => {
                if (sdtChild.localName) processBodyChild(sdtChild);
              });
            }
          }
          // Skip sectPr and other non-content elements
        } catch (childErr) {
          console.warn(`Skipped unparseable body element <${child.localName}>:`, childErr);
        }
      };

      // Iterate body children in document order (paragraphs and tables)
      const bodyElem = getElemsByLocalName(xmlDoc, 'body')[0];
      const paragraphs = [];

      if (bodyElem) {
        Array.from(bodyElem.childNodes).forEach(child => {
          if (child.localName) processBodyChild(child);
        });
      } else {
        // Fallback: no explicit body element found, scan all paragraphs globally
        console.warn('No w:body found, falling back to global paragraph scan');
        const pElements = getElemsByLocalName(xmlDoc, 'p');
        for (let i = 0; i < pElements.length; i++) {
          try {
            const parsed = parseParagraphElement(pElements[i], { fontSize, fontFamily });
            paragraphs.push(parsed);
          } catch (e) { /* skip */ }
        }
      }

      return paragraphs;
    } catch (err) {
      console.error("Error reading docx structured XML:", err);
      throw new Error("Failed to parse Word document formatting.");
    }
  };

  // Extract Markdown files into structured paragraph objects containing runs
  const extractTextFromMarkdown = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result || '';
        const lines = text.split('\n');
        const paragraphs = [];

        for (let line of lines) {
          let align = 'left';
          let runs = [];
          
          // Check for headers
          if (line.startsWith('# ')) {
            runs.push({
              type: 'text',
              text: line.substring(2),
              bold: true,
              italic: false,
              underline: false,
              strike: false,
              fontSize: 20,
              fontFamily: fontFamily
            });
          } else if (line.startsWith('## ')) {
            runs.push({
              type: 'text',
              text: line.substring(3),
              bold: true,
              italic: false,
              underline: false,
              strike: false,
              fontSize: 16,
              fontFamily: fontFamily
            });
          } else if (line.startsWith('### ')) {
            runs.push({
              type: 'text',
              text: line.substring(4),
              bold: true,
              italic: false,
              underline: false,
              strike: false,
              fontSize: 14,
              fontFamily: fontFamily
            });
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            // Unordered list item
            runs.push({
              type: 'text',
              text: '  • ' + line.substring(2),
              bold: false,
              italic: false,
              underline: false,
              strike: false,
              fontSize: fontSize,
              fontFamily: fontFamily
            });
          } else {
            // Plain line
            runs.push({
              type: 'text',
              text: line,
              bold: false,
              italic: false,
              underline: false,
              strike: false,
              fontSize: fontSize,
              fontFamily: fontFamily
            });
          }

          paragraphs.push({ align, runs });
        }
        resolve(paragraphs);
      };
      reader.onerror = (e) => reject(new Error("Failed to read Markdown file."));
      reader.readAsText(file);
    });
  };

  // Extract raw text and convert to a uniform paragraph object list
  const extractTextFromTxt = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result || '';
        const lines = text.split('\n');
        const paragraphs = lines.map((line) => ({
          align: 'left',
          runs: [{
            type: 'text',
            text: line,
            bold: false,
            italic: false,
            underline: false,
            strike: false,
            fontSize: fontSize,
            fontFamily: fontFamily
          }]
        }));
        resolve(paragraphs);
      };
      reader.onerror = (e) => reject(new Error("Failed to read text file."));
      reader.readAsText(file);
    });
  };

  const sanitizeText = (text) => {
    if (!text) return "";
    return text
      // Checkbox / ballot box characters → safe ASCII visual substitutes
      .replace(/\u2611/g, '[v]')   // ☑ BALLOT BOX WITH CHECK
      .replace(/\u2612/g, '[x]')   // ☒ BALLOT BOX WITH X
      .replace(/[\u2610\u25A1\u25FB\u25FD]/g, '[ ]') // □ empty checkbox variants
      .replace(/\u2714/g, '[v]')   // ✔ HEAVY CHECK MARK
      .replace(/\u2717/g, '[x]')   // ✗ BALLOT X
      .replace(/\u25A0/g, '[*]')   // ■ BLACK SQUARE
      // Unicode space variants (common in Word forms for spacing between elements)
      .replace(/[\u2000-\u200B\u202F\u205F\u3000]/g, ' ') // en/em/thin/hair/zero-width spaces
      .replace(/\uFEFF/g, '')      // BOM / zero-width no-break space (strip)
      .replace(/[\uE000-\uF8FF]/g, '') // Private Use Area (Wingdings/Symbol glyphs → strip)
      // Smart punctuation
      .replace(/[\u2018\u2019]/g, "'") // smart single quotes
      .replace(/[\u201C\u201D]/g, '"') // smart double quotes
      .replace(/\u2013/g, "-")         // en dash
      .replace(/\u2014/g, "--")        // em dash
      .replace(/\u2026/g, "...")       // ellipsis
      .replace(/\u00a0/g, " ")         // non-breaking space
      .replace(/[^\x00-\x7F\u00A0-\u00FF\u2022]/g, "?");
  };

  // Embed standard and custom PDF fonts
  const embedStandardFontsMap = async (pdfDoc) => {
    const map = {};
    
    const safeEmbed = async (key, fontName) => {
      try {
        map[key] = await pdfDoc.embedFont(fontName);
      } catch (err) {
        console.warn(`Failed to embed standard font ${fontName}, fallback to Helvetica:`, err);
        if (!map['Helvetica']) {
          map['Helvetica'] = await pdfDoc.embedFont(StandardFonts.Helvetica);
        }
        map[key] = map['Helvetica'];
      }
    };

    await safeEmbed('Helvetica', StandardFonts.Helvetica);
    await safeEmbed('Helvetica-Bold', StandardFonts.HelveticaBold);
    await safeEmbed('Helvetica-Oblique', StandardFonts.HelveticaOblique);
    await safeEmbed('Helvetica-BoldOblique', StandardFonts.HelveticaBoldOblique);
    
    await safeEmbed('Courier', StandardFonts.Courier);
    await safeEmbed('Courier-Bold', StandardFonts.CourierBold);
    await safeEmbed('Courier-Oblique', StandardFonts.CourierOblique);
    await safeEmbed('Courier-BoldOblique', StandardFonts.CourierBoldOblique);
    
    await safeEmbed('Times', StandardFonts.TimesRoman);
    await safeEmbed('Times-Bold', StandardFonts.TimesBold);
    await safeEmbed('Times-Italic', StandardFonts.TimesItalic);
    await safeEmbed('Times-BoldItalic', StandardFonts.TimesBoldItalic);

    // Embed Poppins fonts if preloaded in state
    if (poppinsFonts) {
      try {
        map['Poppins'] = await pdfDoc.embedFont(poppinsFonts.Regular);
        map['Poppins-Bold'] = await pdfDoc.embedFont(poppinsFonts.Bold);
        map['Poppins-Italic'] = await pdfDoc.embedFont(poppinsFonts.Italic);
        map['Poppins-BoldItalic'] = await pdfDoc.embedFont(poppinsFonts.BoldItalic);
      } catch (err) {
        console.error("Failed to embed custom Poppins fonts:", err);
      }
    }

    return map;
  };

  // Wrap structured paragraph runs to printable width using exact character metrics
  const wrapStructuredParagraph = (paragraph, printableWidth, fontsMap) => {
    const wrappedLines = [];
    let currentLine = [];
    let currentLineWidth = 0;

    const getFontForRun = (run) => {
      const family = run.fontFamily;
      const isBold = run.bold;
      const isItalic = run.italic;
      
      let suffix = '';
      if (isBold && isItalic) suffix = 'BoldOblique';
      else if (isBold) suffix = 'Bold';
      else if (isItalic) suffix = 'Oblique';
      
      let prefix = 'Helvetica';
      if (family === 'courier') {
        prefix = 'Courier';
      } else if (family === 'times') {
        prefix = 'Times';
        if (isBold && isItalic) suffix = 'BoldItalic';
        else if (isBold) suffix = 'Bold';
        else if (isItalic) suffix = 'Italic';
      } else {
        // Sans-Serif font: use Poppins if preloaded
        if (fontsMap['Poppins']) {
          prefix = 'Poppins';
          if (isBold && isItalic) suffix = 'BoldItalic';
          else if (isBold) suffix = 'Bold';
          else if (isItalic) suffix = 'Italic';
        }
      }

      const key = suffix ? `${prefix}-${suffix}` : prefix;
      return fontsMap[key] || fontsMap['Helvetica'];
    };

    paragraph.runs.forEach((run) => {
      if (run.type !== 'text') return; // only wrap text runs here
      
      const runFont = getFontForRun(run);
      const text = sanitizeText(run.text);
      const tokens = text.match(/\s+|\S+/g) || [];

      tokens.forEach((token) => {
        let tokenWidth = runFont.widthOfTextAtSize(token, run.fontSize);

        // If the token itself is wider than the entire printable area (e.g. URLs), we must break it character-by-character
        if (tokenWidth > printableWidth) {
          if (currentLine.length > 0) {
            wrappedLines.push(currentLine);
            currentLine = [];
            currentLineWidth = 0;
          }

          let currentSubToken = "";
          let currentSubTokenWidth = 0;

          for (let char of token) {
            const charWidth = runFont.widthOfTextAtSize(char, run.fontSize);
            if (currentSubTokenWidth + charWidth <= printableWidth) {
              currentSubToken += char;
              currentSubTokenWidth += charWidth;
            } else {
              wrappedLines.push([{
                text: currentSubToken,
                font: runFont,
                size: run.fontSize,
                underline: run.underline,
                strike: run.strike,
                colorHex: run.colorHex
              }]);
              currentSubToken = char;
              currentSubTokenWidth = charWidth;
            }
          }

          if (currentSubToken) {
            currentLine = [{
              text: currentSubToken,
              font: runFont,
              size: run.fontSize,
              underline: run.underline,
              strike: run.strike,
              colorHex: run.colorHex
            }];
            currentLineWidth = currentSubTokenWidth;
          }
          return;
        }

        if (currentLineWidth + tokenWidth <= printableWidth) {
          currentLine.push({
            text: token,
            font: runFont,
            size: run.fontSize,
            underline: run.underline,
            strike: run.strike,
            colorHex: run.colorHex
          });
          currentLineWidth += tokenWidth;
        } else {
          // Drop extra whitespaces at the end of the line
          if (/^\s+$/.test(token)) return;

          if (currentLine.length > 0) {
            wrappedLines.push(currentLine);
          }
          currentLine = [{
            text: token,
            font: runFont,
            size: run.fontSize,
            underline: run.underline,
            strike: run.strike,
            colorHex: run.colorHex
          }];
          currentLineWidth = tokenWidth;
        }
      });
    });

    if (currentLine.length > 0) {
      wrappedLines.push(currentLine);
    }

    // Preserve empty paragraphs as empty line placeholders
    if (wrappedLines.length === 0) {
      wrappedLines.push([{
        text: '',
        font: fontsMap['Helvetica'],
        size: 12,
        underline: false,
        strike: false,
        colorHex: null
      }]);
    }

    return wrappedLines;
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setModalOpen(true);

    try {
      const pdfDoc = await PDFDocument.create();
      const fontsMap = await embedStandardFontsMap(pdfDoc);

      // Determine page dimensions
      const pageDimensions = pageSize === 'letter' ? [612, 792] : [595.28, 841.89];
      const [pWidth, pHeight] = pageDimensions;

      // Determine margins
      let margin = 50;
      if (marginSize === 'none') margin = 20;
      else if (marginSize === 'wide') margin = 80;

      const printableWidth = pWidth - 2 * margin;

      for (let file of files) {
        let paragraphs = [];
        let zipDoc = null;
        
        if (file.name.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          const zip = new JSZip();
          zipDoc = await zip.loadAsync(arrayBuffer);
          paragraphs = await extractStructuredParagraphsFromDocx(zipDoc);
          
          // Override styles if user unchecked formatting preservation
          if (!preserveFormatting) {
            paragraphs = paragraphs.map(p => ({
              ...p,
              runs: p.runs.map(r => r.type === 'text' ? {
                ...r,
                fontSize: fontSize,
                fontFamily: fontFamily
              } : r)
            }));
          }
        } else if (file.name.endsWith('.md')) {
          // Markdown format parsing
          paragraphs = await extractTextFromMarkdown(file);
        } else {
          // Plain Text files (.txt, .log)
          paragraphs = await extractTextFromTxt(file);
        }

        let page = pdfDoc.addPage(pageDimensions);
        let currentY = pHeight - margin;

        // Helper to render a table block
        const renderTable = async (tableData) => {
          const { rows, colWidths, totalWidth } = tableData;
          if (!rows.length || !colWidths.length) return;

          // Scale column widths proportionally to fit printable width
          const scale = Math.min(1, printableWidth / (totalWidth || printableWidth));
          const scaledWidths = colWidths.map(w => w * scale);
          const cellPadding = 4;
          const defaultFont = fontsMap['Helvetica'];
          const defaultFontSize = 9;
          const borderColor = rgb(0.6, 0.6, 0.6);

          for (let r = 0; r < rows.length; r++) {
            const rowCells = rows[r];

            // First pass: calculate row height from all cell content
            let rowHeight = defaultFontSize * 1.38 + cellPadding * 2; // min height
            let colIdx = 0;
            for (let c = 0; c < rowCells.length; c++) {
              const cell = rowCells[c];
              let cellW = 0;
              for (let span = 0; span < cell.colSpan && (colIdx + span) < scaledWidths.length; span++) {
                cellW += scaledWidths[colIdx + span];
              }
              const textAreaWidth = Math.max(1, cellW - cellPadding * 2);
              let cellTextHeight = cellPadding * 2;
              for (const cp of cell.paragraphs) {
                const cpFont = fontsMap['Poppins'] || defaultFont;
                const cpSize = (cp.runs[0]?.fontSize) || defaultFontSize;
                const rawText = cp.runs.filter(r => r.type === 'text').map(r => r.text).join('');
                const text = sanitizeText(rawText);
                if (!text.trim()) { cellTextHeight += cpSize * 0.8; continue; }
                const words = text.match(/\s+|\S+/g) || [];
                let lineW = 0;
                let lines = 1;
                for (const word of words) {
                  let ww = 0;
                  try { ww = cpFont.widthOfTextAtSize(word, cpSize); } catch (_) { ww = cpSize * 0.5 * word.length; }
                  if (lineW + ww > textAreaWidth && lineW > 0) { lines++; lineW = ww; }
                  else { lineW += ww; }
                }
                cellTextHeight += lines * cpSize * 1.38 + 3;
              }
              rowHeight = Math.max(rowHeight, cellTextHeight);
              colIdx += cell.colSpan;
            }

            // Check page overflow
            const bottomLimit = addPageNumbers ? (margin + 15) : margin;
            if (currentY - rowHeight < bottomLimit) {
              page = pdfDoc.addPage(pageDimensions);
              currentY = pHeight - margin;
            }

            // Second pass: draw cells
            let cellX = margin;
            colIdx = 0;
            for (let c = 0; c < rowCells.length; c++) {
              const cell = rowCells[c];
              let cellW = 0;
              for (let span = 0; span < cell.colSpan && (colIdx + span) < scaledWidths.length; span++) {
                cellW += scaledWidths[colIdx + span];
              }

              // Draw cell background shading
              if (cell.bgColorHex) {
                try {
                  page.drawRectangle({
                    x: cellX,
                    y: currentY - rowHeight,
                    width: cellW,
                    height: rowHeight,
                    color: hexToRgb(cell.bgColorHex),
                    borderWidth: 0
                  });
                } catch (_) {}
              }

              // Draw cell border
              page.drawRectangle({
                x: cellX,
                y: currentY - rowHeight,
                width: cellW,
                height: rowHeight,
                borderColor,
                borderWidth: 0.5
              });

              // Draw cell text content
              let textY = currentY - cellPadding;
              for (const cp of cell.paragraphs) {
                const cpRuns = cp.runs.filter(r => r.type === 'text' && r.text);
                if (!cpRuns.length) { textY -= defaultFontSize * 0.8; continue; }

                const cellPrintW = Math.max(1, cellW - cellPadding * 2);
                // Simple wrap and draw
                for (const run of cpRuns) {
                  const runFont = (fontsMap['Poppins'] && run.fontFamily === 'helvetica')
                    ? (run.bold && run.italic ? fontsMap['Poppins-BoldItalic'] : run.bold ? fontsMap['Poppins-Bold'] : run.italic ? fontsMap['Poppins-Italic'] : fontsMap['Poppins'])
                    : (fontsMap['Helvetica-Bold'] && run.bold ? fontsMap['Helvetica-Bold'] : defaultFont);
                  const runSize = Math.min(run.fontSize || defaultFontSize, 14);
                  const drawColor = hexToRgb(run.colorHex);
                  const cellText = sanitizeText(run.text || '');
                  const words = cellText.match(/\s+|\S+/g) || [];
                  let lineText = '';
                  let lineW = 0;

                  const flushLine = (txt) => {
                    if (!txt.trim()) return;
                    if (textY - runSize < currentY - rowHeight + cellPadding) return;
                    try {
                      page.drawText(txt.trimStart(), {
                        x: cellX + cellPadding,
                        y: textY - runSize,
                        size: runSize,
                        font: runFont || defaultFont,
                        color: drawColor
                      });
                    } catch (_) {}
                    textY -= runSize * 1.38;
                  };

                  for (const word of words) {
                    const ww = (runFont || defaultFont).widthOfTextAtSize(word, runSize);
                    if (lineW + ww > cellPrintW && lineText) {
                      flushLine(lineText);
                      lineText = /^\s/.test(word) ? '' : word;
                      lineW = /^\s/.test(word) ? 0 : ww;
                    } else {
                      lineText += word;
                      lineW += ww;
                    }
                  }
                  if (lineText) flushLine(lineText);
                }
                textY -= 3; // gap between paragraphs inside cell
              }

              cellX += cellW;
              colIdx += cell.colSpan;
            }

            currentY -= rowHeight;
          }
          currentY -= 8; // spacing after table
        };

        let textRunsAccumulator = [];
        let currentParagraph = null; // Track current paragraph for flushTextAccumulator closure

        const flushTextAccumulator = async () => {
          if (textRunsAccumulator.length === 0) return;
          const paragraph = currentParagraph;
          if (!paragraph) return;
            
            // Check if the accumulated paragraph text runs are completely empty or whitespace
            const isEmptyParagraph = textRunsAccumulator.every(r => r.type === 'text' && (!r.text || r.text.trim() === ''));
            if (isEmptyParagraph) {
              const blankSpacing = 12; // Collapsed spacing for explicit blank lines
              const bottomLimit = addPageNumbers ? (margin + 15) : margin;
              if (currentY - blankSpacing < bottomLimit) {
                page = pdfDoc.addPage(pageDimensions);
                currentY = pHeight - margin;
              }
              currentY -= blankSpacing;
              textRunsAccumulator = [];
              return;
            }

            // Apply paragraph spacingBefore (capped at 20pt, only if larger than default gap)
            if (paragraph.spacingBefore && paragraph.spacingBefore > 8) {
              const cappedBefore = Math.min(paragraph.spacingBefore, 20);
              const bottomLimit = addPageNumbers ? (margin + 15) : margin;
              if (currentY - cappedBefore < bottomLimit) {
                page = pdfDoc.addPage(pageDimensions);
                currentY = pHeight - margin;
              }
              currentY -= cappedBefore;
            }

            const pLeftIndent = paragraph.leftIndent || 0;
            const pRightIndent = paragraph.rightIndent || 0;
            const activePrintableWidth = printableWidth - pLeftIndent - pRightIndent;

            const tempParagraph = { align: paragraph.align, runs: textRunsAccumulator };
            const lines = wrapStructuredParagraph(tempParagraph, activePrintableWidth, fontsMap);
            
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
              const line = lines[lineIndex];
              const maxLineFontSize = Math.max(...line.map(s => s.size), 10);
              const lineSpacing = maxLineFontSize * 1.38; // Optimized line spacing multiplier

              // Check page overflow (leave space at bottom for page numbers)
              const bottomLimit = addPageNumbers ? (margin + 15) : margin;
              if (currentY - lineSpacing < bottomLimit) {
                page = pdfDoc.addPage(pageDimensions);
                currentY = pHeight - margin;
              }

              // Calculate start X coordinate based on alignment
              const lineTotalWidth = line.reduce((acc, span) => {
                try { return acc + span.font.widthOfTextAtSize(sanitizeText(span.text), span.size); }
                catch (_) { return acc + span.size * 0.5 * (span.text || '').length; }
              }, 0);
              let startX = margin + pLeftIndent;
              
              if (paragraph.align === 'center') {
                startX = margin + pLeftIndent + (activePrintableWidth - lineTotalWidth) / 2;
              } else if (paragraph.align === 'right') {
                startX = margin + pLeftIndent + (activePrintableWidth - lineTotalWidth);
              }

              // Calculate word justification offset if needed (omit last line of paragraph)
              const isLastLine = lineIndex === lines.length - 1;
              const isJustified = paragraph.align === 'justify' && !isLastLine;
              const spaceSpans = line.filter(span => /^\s+$/.test(span.text));
              const extraSpaceWidth = (isJustified && spaceSpans.length > 0)
                ? (printableWidth - lineTotalWidth) / spaceSpans.length
                : 0;

              // Draw line spans horizontally
              let currentX = startX;
              line.forEach((span) => {
                const drawColor = hexToRgb(span.colorHex);
                try {
                  page.drawText(span.text, {
                    x: currentX,
                    y: currentY - span.size, // align base
                    size: span.size,
                    font: span.font,
                    color: drawColor
                  });
                } catch (drawErr) {
                  console.warn("Failed drawing text, retrying with raw ASCII sanitization fallback:", drawErr);
                  const asciiText = span.text.replace(/[^\x20-\x7E]/g, '?');
                  try {
                    page.drawText(asciiText, {
                      x: currentX,
                      y: currentY - span.size,
                      size: span.size,
                      font: span.font,
                      color: drawColor
                    });
                  } catch (fallbackErr) {
                    console.error("Critical font fallback failure:", fallbackErr);
                  }
                }
                
                let spanWidth;
                try {
                  spanWidth = span.font.widthOfTextAtSize(sanitizeText(span.text), span.size);
                } catch (_) {
                  spanWidth = span.size * 0.5 * (span.text || '').length;
                }

                // Render underline decoration
                if (span.underline) {
                  page.drawLine({
                    start: { x: currentX, y: currentY - span.size - 2 },
                    end: { x: currentX + spanWidth, y: currentY - span.size - 2 },
                    thickness: 0.8,
                    color: drawColor
                  });
                }

                // Render strikethrough decoration
                if (span.strike) {
                  page.drawLine({
                    start: { x: currentX, y: currentY - (span.size / 2) },
                    end: { x: currentX + spanWidth, y: currentY - (span.size / 2) },
                    thickness: 0.8,
                    color: drawColor
                  });
                }

                if (isJustified && /^\s+$/.test(span.text)) {
                  spanWidth += extraSpaceWidth;
                }
                currentX += spanWidth;
              });

              currentY -= lineSpacing;
            }
            currentY -= (paragraph.spacingAfter !== undefined && paragraph.spacingAfter > 0)
              ? Math.min(paragraph.spacingAfter, 20) // Cap spacingAfter at 20pt to prevent Word over-spacing
              : 8;
            textRunsAccumulator = [];
          };

          for (let paragraph of paragraphs) {
            currentParagraph = paragraph;

            // Handle table blocks
            if (paragraph.type === 'table') {
              await flushTextAccumulator();
              await renderTable(paragraph);
              continue;
            }

          for (let run of paragraph.runs) {
            if (run.type === 'image') {
              if (zipDoc) {
                const imgFile = zipDoc.file(run.zipPath);
                if (imgFile) {
                  try {
                    const imgBytes = await imgFile.async("uint8array");
                    let pdfImg;
                    const lowerPath = run.zipPath.toLowerCase();
                    if (lowerPath.endsWith('.png')) {
                      pdfImg = await pdfDoc.embedPng(imgBytes);
                    } else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
                      pdfImg = await pdfDoc.embedJpg(imgBytes);
                    }
                    
                    if (pdfImg) {
                      let imgWidth = run.width;
                      let imgHeight = run.height;

                      if (run.isFloating) {
                        // Draw anchored/floating image at absolute coordinate offsets
                        // Scale floating images to fit within page if needed
                        if (imgWidth > pWidth - margin) {
                          const scale = (pWidth - margin) / imgWidth;
                          imgWidth = pWidth - margin;
                          imgHeight = imgHeight * scale;
                        }
                        // In Word anchor, Y offset is from page top edge; PDF Y is from bottom
                        const targetX = run.floatX;
                        const targetY = pHeight - run.floatY - imgHeight;
                        const clampedY = Math.max(0, targetY);
                        
                        page.drawImage(pdfImg, {
                          x: targetX,
                          y: clampedY,
                          width: imgWidth,
                          height: imgHeight
                        });

                        // Advance currentY to below the floating image so text flows under it
                        const floatingImageBottomY = clampedY;
                        const textFlowThreshold = currentY - 5;
                        if (floatingImageBottomY < textFlowThreshold) {
                          currentY = floatingImageBottomY - 10;
                        }
                      } else {
                        // Inline block image: flush text runs first
                        await flushTextAccumulator();

                        // Scale down image size if width exceeds margins printableWidth
                        if (imgWidth > printableWidth) {
                          const scale = printableWidth / imgWidth;
                          imgWidth = printableWidth;
                          imgHeight = imgHeight * scale;
                        }

                        // Check height overflow
                        const bottomLimit = addPageNumbers ? (margin + 20) : margin;
                        if (currentY - imgHeight < bottomLimit) {
                          page = pdfDoc.addPage(pageDimensions);
                          currentY = pHeight - margin;
                        }

                        page.drawImage(pdfImg, {
                          x: margin,
                          y: currentY - imgHeight,
                          width: imgWidth,
                          height: imgHeight
                        });

                        currentY -= (imgHeight + 15);
                      }
                    }
                  } catch (imgErr) {
                    console.error("Failed to embed image from docx:", imgErr);
                  }
                }
              }
            } else if (run.type === 'pageBreak') {
              // Flush any text runs before starting a new page
              await flushTextAccumulator();
              page = pdfDoc.addPage(pageDimensions);
              currentY = pHeight - margin;
            } else {
              textRunsAccumulator.push(run);
            }
          }

          // Flush remaining text runs
          await flushTextAccumulator();
        }
      }

      // Render centered footers / page numbers on every page if option selected
      if (addPageNumbers) {
        const pages = pdfDoc.getPages();
        const fontHelvetica = fontsMap['Helvetica'] || await pdfDoc.embedFont(StandardFonts.Helvetica);
        for (let k = 0; k < pages.length; k++) {
          const pageObj = pages[k];
          const pageNumText = `Page ${k + 1} of ${pages.length}`;
          const textWidth = fontHelvetica.widthOfTextAtSize(pageNumText, 8);
          
          pageObj.drawText(pageNumText, {
            x: (pageObj.getWidth() - textWidth) / 2,
            y: 18, // 18pt from bottom
            size: 8,
            font: fontHelvetica,
            color: rgb(0.4, 0.4, 0.4)
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedBlob(blob);
      setProcessing(false);
    } catch (err) {
      console.error("Structured conversion error:", err);
      const msg = err?.message || String(err);
      alert(`Conversion failed: ${msg}\n\nPlease report this error.`);
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const name = files[0].name.substring(0, files[0].name.lastIndexOf('.')) || 'converted';
    downloadFile(processedBlob, `${name}_converted.pdf`);
  };

  const leftPane = files.length > 0 ? (
    <div style={{ width: '100%' }}>
      <div className="preview-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {files.map((file, idx) => (
          <div key={idx} className="preview-card" style={{ cursor: 'default' }}>
            <div className="preview-image-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(7,7,20,0.6)' }}>
              <FileText size={48} style={{ color: 'var(--primary-color)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                {file.name.substring(file.name.lastIndexOf('.'))}
              </span>
            </div>
            <div className="preview-name">{file.name}</div>
            <div className="preview-meta">{formatBytes(file.size)}</div>
            <button className="preview-remove-btn" type="button" onClick={() => removeFile(idx)}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      <Workspace
        title="Word/TXT to PDF"
        icon={FileText}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Convert to PDF"
        processing={processing}
        multiple={true}
        accept=".docx,.txt,.md,.log"
        leftPane={leftPane}
      >
        <div>
          <h3 className="options-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Formatting Options</span>
            {fontsLoading && (
              <span style={{ fontSize: '0.65rem', fontWeight: 'normal', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                Preloading Premium Fonts...
              </span>
            )}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Formatting preservation toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
              <input
                id="preserve-format"
                type="checkbox"
                checked={preserveFormatting}
                onChange={(e) => setPreserveFormatting(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="preserve-format" className="options-label" style={{ userSelect: 'none', cursor: 'pointer' }}>
                Preserve Original Styles (Word)
              </label>
            </div>

            {/* Page numbering checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
              <input
                id="add-page-numbers"
                type="checkbox"
                checked={addPageNumbers}
                onChange={(e) => setAddPageNumbers(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="add-page-numbers" className="options-label" style={{ userSelect: 'none', cursor: 'pointer' }}>
                Add Page Numbers Footer
              </label>
            </div>

            {/* Page Size */}
            <div>
              <label className="options-label" style={{ display: 'block', marginBottom: '0.4rem' }}>
                Page Format
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="options-select"
              >
                <option value="a4">A4 (Standard)</option>
                <option value="letter">US Letter</option>
              </select>
            </div>

            {/* Page Margin */}
            <div>
              <label className="options-label" style={{ display: 'block', marginBottom: '0.4rem' }}>
                Page Margin
              </label>
              <select
                value={marginSize}
                onChange={(e) => setMarginSize(e.target.value)}
                className="options-select"
              >
                <option value="none">Narrow (20pt)</option>
                <option value="standard">Standard (50pt)</option>
                <option value="wide">Wide (80pt)</option>
              </select>
            </div>

            {/* Default override settings (visible only when not preserving, or for text files) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', opacity: (!preserveFormatting || files.some(f => !f.name.endsWith('.docx'))) ? 1 : 0.4, transition: 'opacity 0.2s' }}>
              <h4 className="options-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Text File / Override Styles
              </h4>

              {/* Typography Family */}
              <div>
                <label className="options-label" style={{ display: 'block', marginBottom: '0.4rem' }}>
                  Font Style
                </label>
                <select
                  value={fontFamily}
                  disabled={preserveFormatting && files.every(f => f.name.endsWith('.docx'))}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="options-select"
                >
                  <option value="helvetica">Helvetica (Sans-Serif)</option>
                  <option value="times">Times New Roman (Serif)</option>
                  <option value="courier">Courier (Monospace)</option>
                </select>
              </div>

              {/* Typography Size */}
              <div>
                <label className="options-label" style={{ display: 'block', marginBottom: '0.4rem' }}>
                  Font Size
                </label>
                <select
                  value={fontSize}
                  disabled={preserveFormatting && files.every(f => f.name.endsWith('.docx'))}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="options-select"
                >
                  <option value="10">Small (10pt)</option>
                  <option value="12">Standard (12pt)</option>
                  <option value="14">Large (14pt)</option>
                  <option value="16">Extra Large (16pt)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Office Document Conversion"
        description="Extracting document formatting, layout, alignments, and building PDF pages client-side..."
        isComplete={!processing}
        downloadLabel="Download PDF"
        onDownload={handleDownload}
      />
    </>
  );
}
