/**
 * pdfCoords.js – Normalized coordinate and rotation/CropBox transforms
 * Maps visual top-left normalized rectangles (matching PDF.js rendering) into
 * unrotated pdf-lib page coordinates respecting /Rotate (0/90/180/270) and CropBox.
 */

export function getVisualPageBox(page) {
  const size = typeof page.getSize === 'function' ? page.getSize() : { width: 612, height: 792 };
  const crop =
    typeof page.getCropBox === 'function'
      ? page.getCropBox()
      : { x: 0, y: 0, width: size.width, height: size.height };

  const boxX = Number.isFinite(crop?.x) ? crop.x : 0;
  const boxY = Number.isFinite(crop?.y) ? crop.y : 0;
  const boxWidth = Number.isFinite(crop?.width) ? crop.width : size.width;
  const boxHeight = Number.isFinite(crop?.height) ? crop.height : size.height;

  const rawAngle =
    typeof page.getRotation === 'function' ? page.getRotation()?.angle ?? 0 : 0;
  const rotation = ((rawAngle % 360) + 360) % 360;
  const swapped = rotation === 90 || rotation === 270;

  return {
    boxX,
    boxY,
    boxWidth,
    boxHeight,
    rotation,
    visualWidth: swapped ? boxHeight : boxWidth,
    visualHeight: swapped ? boxWidth : boxHeight,
  };
}

/**
 * Maps a visual top-left normalized rectangle ({ x, y, width, height } in 0..1)
 * to { x, y, width, height, rotateAngle } in pdf-lib drawImage/drawRectangle/drawText space.
 */
export function mapNormalizedRectToPdf(page, rect = {}) {
  const {
    boxX,
    boxY,
    boxWidth,
    boxHeight,
    rotation,
    visualWidth,
    visualHeight,
  } = getVisualPageBox(page);

  const nx = Number.isFinite(rect.x) ? rect.x : 0;
  const ny = Number.isFinite(rect.y) ? rect.y : 0;
  const nw = Number.isFinite(rect.width) ? rect.width : 0;
  const nh = Number.isFinite(rect.height) ? rect.height : 0;

  const vx = nx * visualWidth;
  const vy = ny * visualHeight;
  const vw = nw * visualWidth;
  const vh = nh * visualHeight;

  if (rotation === 90) {
    return {
      x: boxX + vy + vh,
      y: boxY + vx,
      width: vw,
      height: vh,
      rotateAngle: 90,
    };
  }

  if (rotation === 180) {
    return {
      x: boxX + boxWidth - vx,
      y: boxY + vy + vh,
      width: vw,
      height: vh,
      rotateAngle: 180,
    };
  }

  if (rotation === 270) {
    return {
      x: boxX + boxWidth - vy - vh,
      y: boxY + boxHeight - vx,
      width: vw,
      height: vh,
      rotateAngle: 270,
    };
  }

  return {
    x: boxX + vx,
    y: boxY + boxHeight - vy - vh,
    width: vw,
    height: vh,
    rotateAngle: 0,
  };
}

/**
 * Convenience wrapper mapping visual top-left point coordinates (in PDF points)
 * into pdf-lib page coordinates.
 */
export function mapVisualPointToPdf(page, vx, vy, itemWidth = 0, itemHeight = 0) {
  const { visualWidth, visualHeight } = getVisualPageBox(page);
  return mapNormalizedRectToPdf(page, {
    x: visualWidth > 0 ? vx / visualWidth : 0,
    y: visualHeight > 0 ? vy / visualHeight : 0,
    width: visualWidth > 0 ? itemWidth / visualWidth : 0,
    height: visualHeight > 0 ? itemHeight / visualHeight : 0,
  });
}

