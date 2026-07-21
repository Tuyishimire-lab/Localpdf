'use client';

import { useState } from 'react';
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

      const pElements = getElemsByLocalName(xmlDoc, 'p');
      const paragraphs = [];

      for (let i = 0; i < pElements.length; i++) {
        const pElem = pElements[i];
        
        // 1. Get paragraph alignment
        let align = 'left';
        const pPrElem = getElemsByLocalName(pElem, 'pPr')[0];
        if (pPrElem) {
          const jcElem = getElemsByLocalName(pPrElem, 'jc')[0];
          if (jcElem) {
            const val = jcElem.getAttribute('w:val') || jcElem.getAttribute('val');
            if (val === 'center') align = 'center';
            else if (val === 'right') align = 'right';
            else if (val === 'both' || val === 'justify') align = 'justify';
          }
        }

        // 2. Extract runs inside paragraph
        const rElements = getElemsByLocalName(pElem, 'r');
        const runs = [];

        for (let j = 0; j < rElements.length; j++) {
          const rElem = rElements[j];
          
          // Check for embedded image (drawing)
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
                  runs.push({
                    type: 'image',
                    embedId,
                    zipPath,
                    width: cx / 12700, // EMU to PDF points conversion
                    height: cy / 12700
                  });
                  continue;
                }
              }
            }
          }

          const textNode = getElemsByLocalName(rElem, 't')[0];
          if (!textNode) continue;

          let text = textNode.textContent;
          let bold = false;
          let italic = false;
          let underline = false;
          let strike = false;
          let size = 11; // default Word size (11pt)
          let fontFace = 'helvetica';

          const rPr = getElemsByLocalName(rElem, 'rPr')[0];
          if (rPr) {
            // Check bold
            const bElem = getElemsByLocalName(rPr, 'b')[0];
            if (bElem) {
              const val = bElem.getAttribute('w:val') || bElem.getAttribute('val');
              if (val !== 'false' && val !== '0') bold = true;
            }

            // Check italic
            const iElem = getElemsByLocalName(rPr, 'i')[0];
            if (iElem) {
              const val = iElem.getAttribute('w:val') || iElem.getAttribute('val');
              if (val !== 'false' && val !== '0') italic = true;
            }

            // Check underline
            const uElem = getElemsByLocalName(rPr, 'u')[0];
            if (uElem) {
              const val = uElem.getAttribute('w:val') || uElem.getAttribute('val');
              if (val !== 'false' && val !== 'none') underline = true;
            }

            // Check strikethrough
            const strikeElem = getElemsByLocalName(rPr, 'strike')[0];
            if (strikeElem) {
              const val = strikeElem.getAttribute('w:val') || strikeElem.getAttribute('val');
              if (val !== 'false' && val !== '0') strike = true;
            }

            // Check size
            const szElem = getElemsByLocalName(rPr, 'sz')[0];
            if (szElem) {
              const val = parseInt(szElem.getAttribute('w:val') || szElem.getAttribute('val'), 10);
              if (!isNaN(val)) {
                size = val / 2; // Word size values are in half-points
              }
            }

            // Check font family mapping
            const rFontsElem = getElemsByLocalName(rPr, 'rFonts')[0];
            if (rFontsElem) {
              const ascii = rFontsElem.getAttribute('w:ascii') || rFontsElem.getAttribute('ascii') || '';
              const hAnsi = rFontsElem.getAttribute('w:hAnsi') || rFontsElem.getAttribute('hAnsi') || '';
              const f = (ascii || hAnsi).toLowerCase();
              if (f.includes('courier') || f.includes('consolas') || f.includes('mono')) {
                fontFace = 'courier';
              } else if (f.includes('times') || f.includes('georgia') || f.includes('serif')) {
                fontFace = 'times';
              }
            }
          }

          runs.push({
            type: 'text',
            text,
            bold,
            italic,
            underline,
            strike,
            fontSize: size,
            fontFamily: fontFace
          });
        }

        paragraphs.push({
          align,
          runs
        });
      }

      return paragraphs;
    } catch (err) {
      console.error("Error reading docx structured:", err);
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
      .replace(/[\u2018\u2019]/g, "'") // smart single quotes
      .replace(/[\u201C\u201D]/g, '"') // smart double quotes
      .replace(/\u2013/g, "-")         // en dash
      .replace(/\u2014/g, "--")        // em dash
      .replace(/\u2022/g, "*")         // bullet point
      .replace(/\u2026/g, "...")       // ellipsis
      .replace(/\u00a0/g, " ")         // non-breaking space
      .replace(/[^\x00-\x7F\u00A0-\u00FF]/g, "?");
  };

  // Embed standard standard PDF fonts family
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
                strike: run.strike
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
              strike: run.strike
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
            strike: run.strike
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
            strike: run.strike
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
        strike: false
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

        for (let paragraph of paragraphs) {
          // Accumulate contiguous text runs to wrap them into cohesive lines
          let textRunsAccumulator = [];

          const flushTextAccumulator = async () => {
            if (textRunsAccumulator.length === 0) return;
            const tempParagraph = { align: paragraph.align, runs: textRunsAccumulator };
            const lines = wrapStructuredParagraph(tempParagraph, printableWidth, fontsMap);
            
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
              const line = lines[lineIndex];
              const maxLineFontSize = Math.max(...line.map(s => s.size), 10);
              const lineSpacing = maxLineFontSize * 1.35;

              // Check page overflow (leave space at bottom for page numbers)
              const bottomLimit = addPageNumbers ? (margin + 15) : margin;
              if (currentY - lineSpacing < bottomLimit) {
                page = pdfDoc.addPage(pageDimensions);
                currentY = pHeight - margin;
              }

              // Calculate start X coordinate based on alignment
              const lineTotalWidth = line.reduce((acc, span) => acc + span.font.widthOfTextAtSize(span.text, span.size), 0);
              let startX = margin;
              
              if (paragraph.align === 'center') {
                startX = margin + (printableWidth - lineTotalWidth) / 2;
              } else if (paragraph.align === 'right') {
                startX = margin + (printableWidth - lineTotalWidth);
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
                try {
                  page.drawText(span.text, {
                    x: currentX,
                    y: currentY - span.size, // align base
                    size: span.size,
                    font: span.font,
                    color: rgb(0.1, 0.1, 0.1)
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
                      color: rgb(0.1, 0.1, 0.1)
                    });
                  } catch (fallbackErr) {
                    console.error("Critical font fallback failure:", fallbackErr);
                  }
                }
                
                let spanWidth = span.font.widthOfTextAtSize(span.text, span.size);

                // Render underline decoration
                if (span.underline) {
                  page.drawLine({
                    start: { x: currentX, y: currentY - span.size - 2 },
                    end: { x: currentX + spanWidth, y: currentY - span.size - 2 },
                    thickness: 0.8,
                    color: rgb(0.1, 0.1, 0.1)
                  });
                }

                // Render strikethrough decoration
                if (span.strike) {
                  page.drawLine({
                    start: { x: currentX, y: currentY - (span.size / 2) },
                    end: { x: currentX + spanWidth, y: currentY - (span.size / 2) },
                    thickness: 0.8,
                    color: rgb(0.1, 0.1, 0.1)
                  });
                }

                if (isJustified && /^\s+$/.test(span.text)) {
                  spanWidth += extraSpaceWidth;
                }
                currentX += spanWidth;
              });

              currentY -= lineSpacing;
            }
            textRunsAccumulator = [];
          };

          for (let run of paragraph.runs) {
            if (run.type === 'image') {
              // Flush any text runs before drawing the block image
              await flushTextAccumulator();

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
                      // Scale down image size if width exceeds margins printableWidth
                      let imgWidth = run.width;
                      let imgHeight = run.height;
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
                  } catch (imgErr) {
                    console.error("Failed to embed image from docx:", imgErr);
                  }
                }
              }
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
      alert("Failed to convert documents to PDF. Check if files are corrupted.");
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
          <h3 className="options-title">Formatting Options</h3>
          
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
