/**
 * pdfFormAndImages.js – AcroForm field inspection/filling and embedded PDF image extraction.
 */

import {
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFOptionList,
} from 'pdf-lib';
import { loadPdfLibSafely } from './pdfGuard';

export async function inspectAcroFormFields(pdfBytes) {
  const pdfDoc = await loadPdfLibSafely(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  return fields.map((field) => {
    const name = field.getName();
    const readOnly = typeof field.isReadOnly === 'function' ? field.isReadOnly() : false;

    if (field instanceof PDFTextField) {
      return {
        name,
        type: 'text',
        value: field.getText() || '',
        options: [],
        readOnly,
      };
    }

    if (field instanceof PDFCheckBox) {
      return {
        name,
        type: 'checkbox',
        value: field.isChecked(),
        options: [],
        readOnly,
      };
    }

    if (field instanceof PDFDropdown) {
      return {
        name,
        type: 'dropdown',
        value: field.getSelected()?.[0] || '',
        options: field.getOptions(),
        readOnly,
      };
    }

    if (field instanceof PDFRadioGroup) {
      return {
        name,
        type: 'radio',
        value: field.getSelected() || '',
        options: field.getOptions(),
        readOnly,
      };
    }

    if (field instanceof PDFOptionList) {
      return {
        name,
        type: 'dropdown',
        value: field.getSelected()?.[0] || '',
        options: field.getOptions(),
        readOnly,
      };
    }

    return {
      name,
      type: 'unsupported',
      value: '',
      options: [],
      readOnly,
    };
  });
}

export async function fillAcroFormFields(
  pdfBytes,
  valuesMap = {},
  { flattenAfterFill = false } = {}
) {
  const pdfDoc = await loadPdfLibSafely(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  for (const field of fields) {
    const name = field.getName();
    if (!(name in valuesMap)) continue;
    if (typeof field.isReadOnly === 'function' && field.isReadOnly()) continue;

    const val = valuesMap[name];
    if (field instanceof PDFTextField) {
      field.setText(String(val ?? ''));
    } else if (field instanceof PDFCheckBox) {
      if (val) field.check();
      else field.uncheck();
    } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
      const options = field.getOptions();
      if (val && options.includes(String(val))) {
        field.select(String(val));
      } else if (!val && typeof field.clear === 'function') {
        field.clear();
      }
    } else if (field instanceof PDFRadioGroup) {
      const options = field.getOptions();
      if (val && options.includes(String(val))) {
        field.select(String(val));
      }
    }
  }

  if (flattenAfterFill) {
    form.flatten();
  }

  return pdfDoc.save();
}

async function resolvePdfObj(objs, objName) {
  return new Promise((resolve) => {
    try {
      if (objs.has(objName)) {
        resolve(objs.get(objName));
        return;
      }
      objs.get(objName, (resolved) => resolve(resolved));
    } catch {
      resolve(null);
    }
  });
}

async function rawImageObjToPngBlob(imgObj) {
  if (!imgObj || !imgObj.width || !imgObj.height) return null;

  const canvas = document.createElement('canvas');
  canvas.width = imgObj.width;
  canvas.height = imgObj.height;
  const ctx = canvas.getContext('2d');

  try {
    if (imgObj.bitmap) {
      ctx.drawImage(imgObj.bitmap, 0, 0);
    } else if (imgObj.data) {
      const totalPixels = imgObj.width * imgObj.height;
      const rgba = new Uint8ClampedArray(totalPixels * 4);
      const src = imgObj.data;
      if (src.length === totalPixels * 4) {
        rgba.set(src);
      } else if (src.length === totalPixels * 3) {
        for (let p = 0, s = 0, d = 0; p < totalPixels; p++, s += 3, d += 4) {
          rgba[d] = src[s];
          rgba[d + 1] = src[s + 1];
          rgba[d + 2] = src[s + 2];
          rgba[d + 3] = 255;
        }
      } else if (src.length === totalPixels) {
        for (let p = 0, d = 0; p < totalPixels; p++, d += 4) {
          rgba[d] = src[p];
          rgba[d + 1] = src[p];
          rgba[d + 2] = src[p];
          rgba[d + 3] = 255;
        }
      } else {
        return null;
      }
      const imageData = ctx.createImageData(imgObj.width, imgObj.height);
      imageData.data.set(rgba);
      ctx.putImageData(imageData, 0, 0);
    } else if (typeof imgObj === 'object' && ('src' in imgObj || imgObj instanceof HTMLImageElement)) {
      ctx.drawImage(imgObj, 0, 0);
    } else {
      return null;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
    if (!blob) return null;
    return {
      width: imgObj.width,
      height: imgObj.height,
      blob,
      dataUrl,
    };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function extractEmbeddedImagesFromPage(page, pageNum) {
  const { OPS } = await import('pdfjs-dist');
  const opList = await page.getOperatorList();
  const seen = new Set();
  const results = [];

  try {
    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      if (fn === OPS.paintImageXObject || fn === OPS.paintImageMaskXObject) {
        const objName = opList.argsArray[i]?.[0];
        if (!objName || seen.has(objName)) continue;
        seen.add(objName);
        const imgObj = await resolvePdfObj(page.objs, objName);
        const converted = await rawImageObjToPngBlob(imgObj);
        if (converted) {
          results.push({
            id: `p${pageNum}_${objName}`,
            pageNum,
            ...converted,
          });
        }
      } else if (fn === OPS.paintInlineImageXObject) {
        const imgObj = opList.argsArray[i]?.[0];
        const converted = await rawImageObjToPngBlob(imgObj);
        if (converted) {
          results.push({
            id: `p${pageNum}_inline_${i}`,
            pageNum,
            ...converted,
          });
        }
      }
    }
    return results;
  } finally {
    page.cleanup?.();
  }
}

