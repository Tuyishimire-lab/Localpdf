/**
 * Tool content data for AdSense-compliant publisher content.
 * Each tool has: description, howTo steps, features, and faqs.
 * This content is server-rendered so it is fully crawlable by Googlebot.
 */
const toolContent = {
  compress: {
    title: 'Compress PDF Files',
    description: `Reducing the file size of a PDF is one of the most common document tasks, whether you need to send a file over email, upload it to a web form with a size limit, or simply save storage space. LocalPDF's Compress PDF tool handles this entirely within your browser using advanced client-side algorithms, meaning your document never leaves your device.

Unlike cloud-based compression services that upload your file to a remote server, LocalPDF processes everything locally using WebAssembly-powered libraries running directly in your browser tab. This makes the process not only private and secure, but also extremely fast. There is no waiting for uploads or downloads. The moment you click "Compress", the tool gets to work instantly on your own hardware.

PDF files can grow large for several reasons: embedded high-resolution images, redundant font subsets, unoptimized page streams, and embedded thumbnails. Our compressor targets all of these areas by downscaling image resolution, re-encoding image data with optimized quality settings, and stripping unnecessary metadata, to produce a noticeably smaller output file while preserving document readability.`,
    howTo: [
      'Click "Select PDF Files" or drag and drop your PDF onto the upload area above.',
      'Choose your desired compression level (Extreme, Recommended, or Low).',
      'Click the "Compress PDF" button and wait a moment for processing.',
      'Preview the compressed file and download it to your computer.',
    ],
    features: [
      { title: '100% Private', description: 'Your PDF never leaves your browser. All compression happens locally on your device using WebAssembly with no server uploads, ever.' },
      { title: 'No File Size Limits', description: 'Unlike many online tools that restrict free usage to small files, LocalPDF imposes no artificial size limits on your documents.' },
      { title: 'Adjustable Compression', description: 'Choose between Extreme, Recommended, and Low compression levels to balance file size reduction against output quality.' },
      { title: 'Works Offline', description: 'Once the page has loaded, you can disconnect from the internet and continue compressing PDFs without any interruption.' },
    ],
    faqs: [
      { q: 'How much can I reduce a PDF file size?', a: 'Reduction depends heavily on content. PDFs with many high-resolution images can often be reduced by 50 to 80 percent. Text-only PDFs compress less dramatically, typically 10 to 30 percent, since their data is already efficient.' },
      { q: 'Will compression reduce the visual quality of my PDF?', a: 'At our "Recommended" setting, the quality loss is minimal and usually not noticeable at normal reading zoom. The "Extreme" setting may soften images slightly but keeps text sharp. The "Low" compression setting prioritizes quality over size.' },
      { q: 'Is it safe to compress sensitive documents like contracts or medical records?', a: 'Yes, because LocalPDF processes everything locally in your browser, sensitive documents are never transmitted to any server. Your files stay completely on your device throughout the entire compression process.' },
      { q: 'Why is my PDF still large after compression?', a: 'If your PDF consists mainly of vector text and graphics with no embedded images, there is less data to compress. PDFs with embedded fonts and complex vector art may see only modest reductions. Try splitting the PDF and compressing page ranges separately for very large documents.' },
      { q: 'Can I compress multiple PDFs at once?', a: 'Yes. You can add multiple PDF files and they will be processed individually. Each compressed output can be downloaded separately.' },
    ],
  },

  merge: {
    title: 'Merge PDF Files',
    description: `Combining multiple PDF documents into a single unified file is one of the most frequently needed document tasks across business, academic, and personal contexts. Whether you're assembling a project report from multiple chapters, consolidating invoices for accounting, or gathering scanned pages into one archive, LocalPDF's Merge PDF tool makes this fast and straightforward.

The entire merge operation happens inside your web browser using pdf-lib, a powerful client-side PDF manipulation library. No files are ever sent to a remote server. This is especially important when working with confidential documents such as financial statements, legal contracts, medical records, or personal identification, where privacy and data security are critical.

You have full control over the order in which files are merged. Simply drag and reorder the documents in the file list before clicking the merge button. The output file preserves all page content, embedded fonts, and hyperlinks from the source documents.`,
    howTo: [
      'Click "Select PDF Files" or drag multiple PDFs into the upload area.',
      'Rearrange the files into your desired order using drag-and-drop.',
      'Click the "Merge PDF" button to combine all files into one.',
      'Download the resulting merged PDF to your device.',
    ],
    features: [
      { title: 'Drag-to-Reorder', description: 'Rearrange the order of your PDF files freely before merging. Your desired page sequence is respected exactly.' },
      { title: 'Unlimited Files', description: 'Merge as many PDF files as you need in a single operation. There are no caps on the number of input documents.' },
      { title: 'Preserves Formatting', description: 'All fonts, images, hyperlinks, and page layouts from the source files are preserved intact in the merged output.' },
      { title: 'No Account Required', description: 'Use the merge tool immediately without creating an account, signing up, or providing any personal information.' },
    ],
    faqs: [
      { q: 'How many PDFs can I merge at once?', a: 'There is no hard limit. You can merge as many PDFs as your browser can handle in memory. For very large batches (20 or more large files), we recommend merging in smaller groups first, then combining the results.' },
      { q: 'Will the page order be exactly as I specify?', a: 'Yes. The output PDF follows the order you arrange in the file list. You can drag and drop files to set the exact sequence before merging.' },
      { q: 'Are bookmarks and hyperlinks preserved after merging?', a: 'Internal hyperlinks and most embedded metadata are preserved. Cross-document bookmarks may not carry over, as they reference specific file paths that no longer apply in the merged document.' },
      { q: 'Can I merge password-protected PDFs?', a: 'Password-protected PDFs need to be unlocked first before merging. Use our Unlock PDF tool to remove password protection, then proceed with the merge.' },
      { q: 'Does merging PDFs affect their quality?', a: 'No. Merging does not re-compress or re-render any content. The pages from each source file are inserted directly into the output, maintaining full original quality.' },
    ],
  },

  split: {
    title: 'Split PDF Files',
    description: `Extracting specific pages from a large PDF or dividing it into smaller separate documents is a routine task for students, professionals, and businesses alike. LocalPDF's Split PDF tool gives you precise control over how your document is divided, all without ever uploading a single byte to an external server.

You can split a PDF in multiple ways: extract individual pages, define custom page ranges, or export every page as its own separate PDF file. This is useful when you need to share only a specific section of a document, extract a chapter from a book, or isolate a single form page from a larger packet.

All processing runs client-side in your browser using WebAssembly and pdf-lib. The result is instant splitting with zero privacy risk, as your document content stays entirely on your machine.`,
    howTo: [
      'Upload your PDF by clicking the file picker or dragging the file onto the upload area.',
      'Select your splitting mode: by page range, extract specific pages, or split into individual pages.',
      'Enter the page numbers or ranges you wish to extract (e.g., 1-3, 5, 7-10).',
      'Click "Split PDF" and download the resulting files.',
    ],
    features: [
      { title: 'Multiple Split Modes', description: 'Split by page range, extract specific pages, or export every page as an individual PDF, whatever your workflow requires.' },
      { title: 'Instant Preview', description: 'See page thumbnails before splitting so you can confirm you are extracting the right content.' },
      { title: 'Batch Download', description: 'When splitting into multiple files, download all outputs at once as a ZIP archive for convenience.' },
      { title: 'Zero Data Risk', description: 'Your PDF is processed entirely in-browser. Sensitive content stays on your device with no server transmission.' },
    ],
    faqs: [
      { q: 'Can I extract non-consecutive pages?', a: 'Yes. You can specify individual page numbers separated by commas (e.g., 1, 3, 7) or combine them with ranges (e.g., 1-3, 6, 9-12).' },
      { q: 'What happens to the original file?', a: 'The original PDF is not modified in any way. The split tool reads your file, extracts the requested pages, and creates new output files. Your source document remains untouched.' },
      { q: 'Can I split a password-protected PDF?', a: 'Password-protected files must be unlocked first. Use our Unlock PDF tool to remove the password, then use the Split tool on the unprotected version.' },
      { q: 'How are the split files named?', a: 'Output files are automatically named with the original filename plus the page range, such as "document_pages_1-3.pdf". This makes it easy to identify each output file.' },
      { q: 'Is there a page limit for splitting?', a: 'There is no imposed page limit. However, very large PDFs (hundreds of pages with high-resolution images) may take longer to process depending on your device\'s available RAM.' },
    ],
  },

  edit: {
    title: 'Edit PDF – Add Text and Annotations',
    description: `Adding text overlays, annotations, and custom stamps to PDF pages is a common need when reviewing documents, filling in forms that lack interactive fields, or marking up reports before sharing. LocalPDF's Edit PDF tool lets you do all of this directly in your browser, placing, sizing, and styling text elements over any page of your document.

The editor works by rendering your PDF pages onto an HTML5 canvas element and overlaying an interactive editing layer on top. You can click anywhere on a page to place a text annotation, choose font size and color, and drag elements to reposition them. When you save, the annotations are permanently embedded into the PDF using pdf-lib, producing a standard PDF that any viewer can open without plugins.

Because all editing happens client-side, there is no risk of your document content being read, stored, or processed by any external service. This is particularly valuable for legal documents, personal forms, and confidential business records.`,
    howTo: [
      'Upload your PDF using the file selector or by dragging the file into the upload area.',
      'Click on any location on a PDF page to place a text annotation.',
      'Type your text, adjust the font size and color using the toolbar controls.',
      'Drag your text elements to the exact position you need.',
      'Click "Save PDF" to embed all annotations and download the edited file.',
    ],
    features: [
      { title: 'Click-to-Place Text', description: 'Click anywhere on any PDF page to place a text annotation instantly. Drag to reposition as needed.' },
      { title: 'Custom Styling', description: 'Adjust font size, color, and style for each text element to match your document\'s design.' },
      { title: 'Non-Destructive Preview', description: 'Edit and preview your changes before saving. Nothing is committed until you click the save button.' },
      { title: 'Standard PDF Output', description: 'The saved file is a standard PDF with all annotations permanently embedded and readable by any PDF viewer.' },
    ],
    faqs: [
      { q: 'Can I edit existing text in the PDF?', a: 'The Edit tool adds new text overlays on top of existing content. Editing the original underlying text of a PDF requires full PDF editing capabilities which are computationally intensive. For most form-filling and annotation needs, adding text overlays is the most reliable approach.' },
      { q: 'Will my text appear in the right font?', a: 'Text annotations use standard embedded fonts (Helvetica, Times Roman, Courier) which are universally supported. Custom fonts from the original document are not currently supported for new annotations.' },
      { q: 'Can I undo edits before saving?', a: 'Yes. You can delete or reposition any annotation before clicking Save. Changes are only finalized when you export the PDF.' },
      { q: 'Is the edited PDF compatible with all PDF readers?', a: 'Yes. The output is a standard compliant PDF file. The annotations are embedded as regular page content, so they are visible in Adobe Acrobat, Preview, Chrome, and all other standard PDF viewers.' },
      { q: 'Can I edit scanned PDFs?', a: 'You can add text overlays on top of scanned PDF pages. If you need to extract the text from a scanned document, use our OCR tool first, then use the edit tool to annotate.' },
    ],
  },

  ocr: {
    title: 'OCR PDF – Extract Text from Scanned Documents',
    description: `Optical Character Recognition (OCR) transforms scanned pages, photographed documents, and image-based PDFs into searchable, selectable, and copyable text. This is essential when working with legacy documents, scanned archives, photographed receipts, or any PDF where the content was captured as an image rather than generated digitally.

LocalPDF's OCR tool is uniquely privacy-preserving: the entire recognition process runs on your device using Tesseract.js, a client-side OCR engine built on WebAssembly. Your scanned documents are never transmitted to a cloud service or remote server. All text recognition happens locally in your browser, using your own device's processing power.

The tool supports multiple recognition languages and produces output as extracted plain text that you can copy, search, and use freely. It works on both image-only PDFs (scanned documents) and mixed PDFs where some pages are scanned and others are digitally generated.`,
    howTo: [
      'Upload your scanned or image-based PDF using the file selector.',
      'Select the primary language of the document for best OCR accuracy.',
      'Click "Run OCR" to begin text recognition. This may take a moment for multi-page documents.',
      'Review the extracted text in the output panel and copy or download it.',
    ],
    features: [
      { title: 'Fully Local Processing', description: 'OCR runs entirely in your browser using Tesseract.js over WebAssembly. Your scanned documents are never sent to any server.' },
      { title: 'Multi-Language Support', description: 'Choose from multiple recognition languages to maximize accuracy for documents in English and other supported languages.' },
      { title: 'Works on Any Image PDF', description: 'Compatible with scanned documents, photographed pages, fax conversions, and any PDF where content is stored as raster images.' },
      { title: 'Instant Text Output', description: 'Extracted text is presented immediately in a copyable panel so you can use it directly without downloading additional files.' },
    ],
    faqs: [
      { q: 'What types of documents work best with OCR?', a: 'OCR works best on clearly scanned documents with high contrast between text and background, standard fonts, and good resolution (at least 200 DPI). Handwritten text, decorative fonts, and very low-quality scans produce less accurate results.' },
      { q: 'How accurate is the text recognition?', a: 'For clearly printed, high-resolution documents in supported languages, accuracy is typically 95 to 99 percent. Accuracy decreases for skewed pages, degraded originals, or documents with complex multi-column layouts.' },
      { q: 'Can I use OCR on a PDF that already has selectable text?', a: 'Yes, but it is unnecessary. If your PDF already contains selectable text (you can highlight it with your mouse), the text is already digital. OCR is specifically for image-based content where no text layer exists.' },
      { q: 'Does OCR work for documents in languages other than English?', a: 'Yes, Tesseract supports many languages. Select the appropriate language before running recognition to get the best results.' },
      { q: 'Is there a page limit for OCR processing?', a: 'There is no imposed limit, but OCR is computationally intensive. Very long documents (50 or more pages) may take several minutes to process. Processing time scales with document length and image resolution.' },
    ],
  },

  'pdf-to-jpg': {
    title: 'PDF to JPG – Convert PDF Pages to Images',
    description: `Converting PDF pages to high-quality image files (JPG, PNG) is useful for a wide range of purposes: creating thumbnails or previews, embedding PDF content into presentations, sharing individual pages on social media or in documents that don't support PDF, or archiving content in a universally viewable format.

LocalPDF's PDF to JPG tool renders each PDF page directly using the browser's built-in PDF.js rendering engine onto an HTML5 canvas element, then exports the canvas as an image file. This process happens entirely on your device with no pages uploaded to a server for rendering.

You can choose the output format (JPG for photos, PNG for graphics with transparency needs), and control the resolution (DPI) to balance file size against image quality. Each page is exported as a separate image file, and you can download all pages at once as a ZIP archive.`,
    howTo: [
      'Upload your PDF using the file selector or drag-and-drop.',
      'Choose your preferred output format: JPG or PNG.',
      'Select the desired resolution (DPI) for the output images.',
      'Click "Convert to Images" and wait for rendering to complete.',
      'Download individual image files or click "Download All" to get a ZIP archive.',
    ],
    features: [
      { title: 'High-Resolution Output', description: 'Choose from multiple DPI settings to export crisp, high-quality images suitable for printing or professional use.' },
      { title: 'JPG & PNG Support', description: 'Export as JPG for compact photo-like output, or PNG for lossless quality especially useful for documents with text and graphics.' },
      { title: 'Page-by-Page Previews', description: 'Preview each rendered page before downloading to verify quality and content accuracy.' },
      { title: 'ZIP Batch Download', description: 'Download all page images at once packaged in a ZIP file for convenient handling of multi-page documents.' },
    ],
    faqs: [
      { q: 'What resolution should I choose for the images?', a: '150 DPI is suitable for screen viewing and web use. 300 DPI is recommended for printing. Higher DPI produces sharper images but significantly larger file sizes.' },
      { q: 'Which format is better, JPG or PNG?', a: 'JPG is better for PDFs with photographs or complex imagery where file size matters. PNG is better for documents with text, charts, and line art, as it is lossless and preserves sharp edges without artifacts.' },
      { q: 'Can I convert only specific pages?', a: 'The current tool converts all pages. To convert specific pages, use our Split PDF tool first to extract the desired pages, then convert the resulting PDF to images.' },
      { q: 'Will text be readable in the converted images?', a: 'Yes, text will be clearly readable as long as you choose a sufficient DPI (150 or higher for screen, 300 or higher for print). Very small text requires higher resolution settings.' },
      { q: 'Is there a page limit?', a: 'There is no imposed limit, but large PDFs with many pages will take longer to render. All rendering uses your device\'s GPU and CPU via the browser canvas API.' },
    ],
  },

  'jpg-to-pdf': {
    title: 'JPG to PDF – Convert Images to PDF',
    description: `Converting images to PDF is a fundamental workflow task: gathering photos from a phone, compiling scanned documents, or assembling graphic assets into a portable document for sharing and archiving. LocalPDF's JPG to PDF tool supports JPEG, PNG, and WebP images and creates a properly formatted PDF with each image on its own page, entirely in your browser with no server involvement.

You can customize several aspects of the output: the page size (A4, Letter, or sized to fit each image), the orientation (portrait or landscape), and the margins. Multiple images are assembled in the order you arrange them, so you have full control over the final document structure.

The conversion uses pdf-lib to programmatically construct a PDF document and embed each image as a page element. The result is a valid, standard-compliant PDF that opens correctly in all viewers.`,
    howTo: [
      'Click "Select Image Files" or drag your JPG, PNG, or WebP images into the upload area.',
      'Arrange the images in your desired page order using drag-and-drop.',
      'Choose your page size, orientation, and margin settings.',
      'Click "Convert to PDF" to generate the document.',
      'Download the resulting PDF to your device.',
    ],
    features: [
      { title: 'Multiple Image Formats', description: 'Supports JPEG, PNG, and WebP image files. Mix different formats freely in the same conversion.' },
      { title: 'Custom Page Layout', description: 'Choose from A4, Letter, or image-fitted page sizes. Set portrait or landscape orientation and adjust margins.' },
      { title: 'Drag-to-Reorder', description: 'Rearrange images freely before conversion to control the exact page order in the output PDF.' },
      { title: 'Batch Processing', description: 'Convert many images into a single PDF in one operation. No per-file limits or paywalls.' },
    ],
    faqs: [
      { q: 'Which image formats are supported?', a: 'LocalPDF supports JPEG (.jpg, .jpeg), PNG (.png), and WebP (.webp) images. You can mix different formats in the same conversion batch.' },
      { q: 'Will image quality be reduced in the PDF?', a: 'Images are embedded at their original quality. No re-compression is applied to the image data during the PDF creation process.' },
      { q: 'Can I add more images after starting the upload?', a: 'Yes. You can continue adding images after your initial selection. New images are appended to the list and can be reordered before conversion.' },
      { q: 'What page size should I use?', a: 'For standard document sharing, A4 (international) or Letter (US) are the most compatible choices. "Fit to Image" is ideal when you want each page to exactly match the image dimensions without borders.' },
      { q: 'Does the tool support very large or very high-resolution images?', a: 'Yes, but very large images (e.g., 50 megapixel photos) require significant browser memory. If you encounter issues, try resizing the images to a reasonable resolution (e.g., 2000px wide) before converting.' },
    ],
  },

  sign: {
    title: 'Sign PDF – E-Sign Documents Digitally',
    description: `Electronic signatures are now legally valid in most countries under laws such as the ESIGN Act (US), eIDAS (EU), and equivalent regulations worldwide. LocalPDF's Sign PDF tool lets you apply a signature to any PDF document entirely within your browser, with no account creation, no subscription, and no file upload to a third-party server.

You can create your signature in three ways: draw it freehand using your mouse or touchscreen, type your name and have it rendered in a signature-style font, or upload an existing signature image (PNG with transparent background works best). The signature can be resized, repositioned, and placed on any page of the document.

The signing process uses the HTML5 Canvas API and pdf-lib to embed your signature as an image element permanently into the PDF. The signed output is a standard PDF file that can be opened, printed, and verified by any PDF reader.`,
    howTo: [
      'Upload the PDF document you need to sign.',
      'Click "Add Signature" and choose your signature method: draw, type, or upload an image.',
      'Create or load your signature using the signature panel.',
      'Click on the PDF page where you want to place your signature.',
      'Resize and reposition the signature to fit the signature line.',
      'Click "Save Signed PDF" to download the completed document.',
    ],
    features: [
      { title: 'Three Signature Methods', description: 'Draw freehand with a mouse or finger, type your name in a signature font, or upload a saved signature image.' },
      { title: 'Precise Placement', description: 'Click anywhere on any page to place your signature, then drag and resize it to fit precisely within signature fields.' },
      { title: 'No Account Needed', description: 'Sign documents immediately without creating an account, logging in, or accepting third-party terms.' },
      { title: 'Legally Valid Output', description: 'The signed PDF is a standard document with an embedded signature image, valid for most e-signature use cases.' },
    ],
    faqs: [
      { q: 'Is an electronic signature drawn in this tool legally binding?', a: 'In most jurisdictions, a typed or drawn electronic signature is legally valid under applicable e-signature laws (ESIGN Act, eIDAS, etc.). However, certain high-stakes documents (like real estate deeds or court filings) may require qualified digital signatures with certificates. Consult a legal professional for specific use cases.' },
      { q: 'Can I save my signature for future use?', a: 'You can save your signature as a PNG image on your device after creating it, and upload it in future sessions using the "Upload Image" signature method.' },
      { q: 'Can I sign multiple pages or place multiple signatures?', a: 'Yes. You can add signatures to any number of pages within the same signing session before saving.' },
      { q: 'Is the signing process private?', a: 'Completely. Your PDF and signature are processed entirely in your browser. No document content, no signature data, and no personal information are ever sent to any server.' },
      { q: 'What if the signature field in the PDF is an interactive form field?', a: 'Our Sign tool places a visual signature image on the page. For interactive PDF form fields specifically designed for digital signatures, use Adobe Acrobat or a qualified digital signature service.' },
    ],
  },

  rotate: {
    title: 'Rotate PDF Pages',
    description: `Scanned documents, photographed pages, and PDFs created from cameras or mobile apps frequently arrive in the wrong orientation, rotated 90, 180, or even at an odd angle. Correcting this before sharing or archiving documents saves the recipient from having to manually rotate their view in a PDF reader.

LocalPDF's Rotate PDF tool lets you rotate individual pages or all pages at once in 90-degree increments (clockwise or counter-clockwise), directly in your browser. You see a live thumbnail preview of each page so you can verify the orientation before saving.

The rotation is applied permanently into the PDF's page rotation metadata using pdf-lib. This means the corrected orientation is preserved when the file is opened in any PDF viewer, printed, or shared. It does not just look correct in one application.`,
    howTo: [
      'Upload your PDF using the file picker or drag-and-drop.',
      'View the page thumbnails to identify which pages need rotation.',
      'Click the rotate buttons (90 degrees clockwise or counter-clockwise) on individual pages, or use "Rotate All" for the entire document.',
      'Click "Save PDF" to download the corrected document.',
    ],
    features: [
      { title: 'Page-Level Control', description: 'Rotate individual pages independently. No need to rotate the entire document if only a few pages have wrong orientation.' },
      { title: 'Visual Thumbnails', description: 'See a live preview of every page thumbnail after rotation so you can confirm the correct orientation before saving.' },
      { title: 'Permanent Rotation', description: 'Rotation is embedded into the PDF metadata, so pages open in the correct orientation in all viewers, not just the current session.' },
      { title: 'Rotate All in One Click', description: 'Apply the same rotation to every page simultaneously with the "Rotate All" button, ideal for fully inverted documents.' },
    ],
    faqs: [
      { q: 'Can I rotate pages to arbitrary angles like 45 degrees?', a: 'The tool supports standard PDF rotation values: 90, 180, and 270 degrees. Arbitrary angle rotation is not supported as PDF page rotation is defined in 90-degree increments in the PDF specification.' },
      { q: 'Will rotating a PDF reduce its quality?', a: 'No. Page rotation is a metadata operation and does not re-render or re-compress any page content. All images, text, and graphics remain at full original quality.' },
      { q: 'Can I rotate pages in a password-protected PDF?', a: 'Password-protected files must be unlocked first. Use our Unlock PDF tool to remove the password, then use the Rotate tool.' },
      { q: 'Does rotating a page affect the file size?', a: 'The rotation operation itself adds negligible data to the file as it only modifies a metadata value. File size is essentially unchanged.' },
      { q: 'I rotated a page but it still looks wrong when I open it. Why?', a: 'Some older PDF readers may not respect the PDF rotation metadata. Try opening in a modern viewer such as Chrome, Firefox, or Acrobat Reader. If the issue persists, try rotating the page again by 360 degrees total (e.g., four 90-degree rotations) to confirm the metadata is being written correctly.' },
    ],
  },

  watermark: {
    title: 'Add Watermark to PDF',
    description: `Watermarking PDF documents is a standard practice for protecting intellectual property, indicating document status (DRAFT, CONFIDENTIAL, SAMPLE), asserting copyright, or adding branding to shared materials. LocalPDF's Watermark tool lets you apply custom text or image watermarks to every page of your PDF, directly in your browser with no server processing.

Text watermarks are rendered with fully configurable settings: you choose the text, font size, color, opacity level, and rotation angle. A diagonal watermark at 45 degrees is the traditional choice for status indicators, while horizontal or centered watermarks work well for branding. Image watermarks support PNG files, allowing you to use logos or custom graphics.

The watermark is embedded permanently into each page using pdf-lib, so it appears in all viewers, cannot be easily removed by recipients, and is included when the document is printed.`,
    howTo: [
      'Upload your PDF using the file selector or drag-and-drop.',
      'Choose "Text Watermark" or "Image Watermark" from the options panel.',
      'For text: enter your watermark text, choose font size, color, opacity, and rotation angle.',
      'For image: upload a PNG file to use as the watermark graphic.',
      'Preview the result, then click "Apply Watermark" and download.',
    ],
    features: [
      { title: 'Text & Image Watermarks', description: 'Apply custom text (with configurable font, color, size, and rotation) or a PNG image watermark to your document.' },
      { title: 'Adjustable Opacity', description: 'Control how visible the watermark is, from a subtle ghost watermark to a full-opacity overlay.' },
      { title: 'Applied to All Pages', description: 'The watermark is applied consistently to every page of the document in a single operation.' },
      { title: 'Permanent Embedding', description: 'Watermarks are baked into the PDF page content, not added as a removable overlay layer.' },
    ],
    faqs: [
      { q: 'Can recipients remove my watermark?', a: 'Once embedded using our tool, the watermark is part of the page content stream and cannot be easily removed with standard PDF readers. Advanced PDF editing software could theoretically obscure it, but this requires significant effort.' },
      { q: 'What opacity should I use for a CONFIDENTIAL watermark?', a: 'Typically 20 to 40 percent opacity works well, visible enough to convey the message clearly but not so heavy that it obscures the document content. Adjust based on the background content of your pages.' },
      { q: 'Can I use my company logo as a watermark?', a: 'Yes. Use the "Image Watermark" option and upload a PNG file of your logo. For best results, use a PNG with a transparent background.' },
      { q: 'Can I place the watermark in a specific position rather than centered?', a: 'The tool currently places the watermark centered on each page, which is the standard for most use cases. Opacity and rotation can be adjusted freely.' },
      { q: 'Does watermarking affect page content quality?', a: 'No. Adding a watermark does not re-compress or alter the existing page content. The watermark text or image is added as an additional layer over the existing content.' },
    ],
  },

  'page-numbers': {
    title: 'Add Page Numbers to PDF',
    description: `Page numbers are an essential element of any formal document. Reports, theses, proposals, manuals, and books all require numbered pages for navigation and referencing. If you have assembled a PDF from multiple sources or converted it from another format, it may lack page numbers entirely.

LocalPDF's Page Numbers tool lets you stamp page numbers onto every page of your PDF with full control over positioning (top/bottom, left/center/right), formatting (starting number, number style), font size, and color. Everything is processed locally in your browser with no uploads to any server.

The numbers are embedded directly into each page's content stream using pdf-lib, making them permanent and visible in all PDF viewers and when printed.`,
    howTo: [
      'Upload your PDF using the file selector or drag-and-drop.',
      'Choose the position for page numbers: top or bottom, and left, center, or right alignment.',
      'Set the starting page number and choose the font size and color.',
      'Click "Add Page Numbers" to process the document.',
      'Download the numbered PDF.',
    ],
    features: [
      { title: 'Flexible Positioning', description: 'Place numbers at the top or bottom of each page, aligned left, center, or right to match your document layout.' },
      { title: 'Custom Starting Number', description: 'Set any starting number, useful when your PDF starts at a specific page within a larger document series.' },
      { title: 'Font & Color Control', description: 'Customize the font size and color of page numbers to match your document\'s style.' },
      { title: 'Permanently Embedded', description: 'Page numbers are embedded into the PDF content, visible in all viewers and included in print output.' },
    ],
    faqs: [
      { q: 'Can I skip numbering the first page (title page)?', a: 'Yes. Set the "start from page" option to begin numbering from page 2, leaving the title or cover page without a number.' },
      { q: 'Can I use Roman numerals or letters instead of Arabic numbers?', a: 'The current implementation uses standard Arabic numerals (1, 2, 3...). Roman numerals and alphabetic page numbering are planned for future updates.' },
      { q: 'Will adding page numbers change the document layout?', a: 'Page numbers are added in the margin area of each page. They are positioned to avoid overlapping with typical document content, but very narrow-margin documents may see slight overlap. You can adjust margin positions to compensate.' },
      { q: 'Can I add page numbers to only certain pages?', a: 'The tool currently applies page numbers to all pages. To number a subset, split the PDF into sections first, add numbers to the desired section, then re-merge.' },
      { q: 'Does this work on scanned PDFs?', a: 'Yes. Scanned PDFs are treated the same as any other PDF. The page number text is added as a new layer on top of the existing scanned image content.' },
    ],
  },

  protect: {
    title: 'Protect PDF – Password Encrypt Documents',
    description: `Adding password protection to a PDF is one of the most direct ways to control who can view, print, or modify a sensitive document. LocalPDF's Protect PDF tool implements AES-128 encryption directly in your browser, creating a password-protected PDF that requires the correct password to open.

You can set two types of password: a user password (required to open and view the document) and an owner password (required to change permissions such as printing or copying). You can also set specific permissions even for authorized users, for example allowing viewing but prohibiting printing or content copying.

All encryption is performed client-side using pdf-lib's built-in encryption support. No password is ever transmitted to any server, and your document content is never exposed to third parties.`,
    howTo: [
      'Upload the PDF you want to protect.',
      'Enter a User Password (required to open the document).',
      'Optionally set an Owner Password to control editing permissions.',
      'Configure permission settings (allow/deny printing, copying, editing).',
      'Click "Protect PDF" and download the encrypted document.',
    ],
    features: [
      { title: 'AES Encryption', description: 'Industry-standard AES-128 encryption protects your document content from unauthorized access.' },
      { title: 'User & Owner Passwords', description: 'Set separate passwords for opening the document and for controlling editing permissions independently.' },
      { title: 'Granular Permissions', description: 'Control whether authorized users can print, copy content, or make modifications to the protected document.' },
      { title: 'Client-Side Security', description: 'Encryption happens entirely in your browser. Your password is never transmitted to any server.' },
    ],
    faqs: [
      { q: 'How strong is the PDF password protection?', a: 'The tool applies AES-128 encryption, which is the standard for PDF security and is strong enough for most use cases. For highly sensitive documents requiring maximum security, consider AES-256 encryption using dedicated security software.' },
      { q: 'What happens if I forget the password?', a: 'There is no recovery mechanism. Keep a secure record of your password. If you lose the password, the document content cannot be accessed without specialized password recovery tools.' },
      { q: 'Can recipients open the protected PDF on any device?', a: 'Yes. Password-protected PDFs are a standard format supported by all PDF readers including Adobe Acrobat, Preview (macOS), Foxit, Chrome, and mobile apps on iOS and Android.' },
      { q: 'Is the encryption applied client-side?', a: 'Yes. The entire encryption process runs in your browser using pdf-lib. Your password and document are never sent to any server.' },
      { q: 'Can I protect a PDF that already has a password?', a: 'You need to unlock the existing password first using our Unlock PDF tool, then apply a new password using the Protect tool.' },
    ],
  },

  unlock: {
    title: 'Unlock PDF – Remove Password Protection',
    description: `Receiving a password-protected PDF that you need to share with others, print without restrictions, or process with other tools can be frustrating, especially if the document is your own and the protection is no longer necessary. LocalPDF's Unlock PDF tool removes the password requirement from a PDF document, making it freely accessible.

Important: this tool is intended for documents where you have legitimate access, meaning documents you encrypted yourself, or documents where you have been provided the password and wish to remove the restriction for your own convenience. You must provide the correct password to unlock the file.

The unlocking process uses pdf-lib to decrypt the document client-side and export a new, unencrypted version. Your document and password are never sent to any server.`,
    howTo: [
      'Upload the password-protected PDF.',
      'Enter the password for the document when prompted.',
      'Click "Unlock PDF" to remove the password protection.',
      'Download the unlocked, unprotected PDF.',
    ],
    features: [
      { title: 'Client-Side Decryption', description: 'The password and document are processed entirely in your browser. Nothing is sent to any external server.' },
      { title: 'Instant Results', description: 'Unlocking is near-instantaneous for most documents with no waiting for server processing or queue times.' },
      { title: 'Standard Output', description: 'The resulting file is a standard, unprotected PDF compatible with all tools and viewers.' },
      { title: 'Privacy Guaranteed', description: 'Your password and document content stay on your device throughout the entire process.' },
    ],
    faqs: [
      { q: 'Can I unlock a PDF without knowing the password?', a: 'No. Unlocking requires the correct document password. LocalPDF does not perform brute-force or dictionary attacks on passwords. This tool is designed for legitimate access to your own documents.' },
      { q: 'What is the difference between a User password and an Owner password?', a: 'A User (open) password is required to view the document. An Owner password controls editing and printing permissions. If a document only has an Owner password, it can often be viewed without a password but editing is restricted.' },
      { q: 'Is it legal to remove password protection from a PDF?', a: 'It is legal if you own the document or have explicit permission from the owner. Removing protection from documents you do not own or have permission to access may violate copyright or terms of use.' },
      { q: 'Will the unlocked PDF retain all its content?', a: 'Yes. Only the encryption layer is removed. All text, images, hyperlinks, and formatting remain exactly as in the original.' },
      { q: 'What if I only know the User password but not the Owner password?', a: 'In most cases, knowing the User password is sufficient to unlock viewing restrictions. Owner-password-only restrictions (like printing bans) require the Owner password to fully remove.' },
    ],
  },

  'word-to-pdf': {
    title: 'Word & TXT to PDF Converter',
    description: `Converting Word documents (.docx) and plain text files (.txt) to PDF is one of the most common document workflows in business, academic, and personal contexts. PDF is the preferred format for sharing finalized documents because it preserves formatting exactly across all devices and platforms, requires no specific software to view, and is universally supported.

LocalPDF's Word to PDF tool performs this conversion entirely client-side in your browser. For .docx files, the tool parses the Word XML structure (OOXML format) to extract text runs, paragraph formatting, fonts, colors, bold/italic styling, lists, tables, and embedded images, then reconstructs a high-fidelity PDF using pdf-lib. For .txt and .md files, clean paginated PDFs are generated with configurable fonts and margins.

Because all processing happens locally, your documents are never uploaded to any cloud service. This matters especially for draft documents, confidential business communications, academic work, and personal writing.`,
    howTo: [
      'Click "Select Files" and choose your .docx, .txt, or .md files.',
      'Configure output options: page size, margins, font, and font size.',
      'Choose whether to preserve the document\'s original formatting.',
      'Click "Convert to PDF" to generate the output.',
      'Download the resulting PDF to your device.',
    ],
    features: [
      { title: 'DOCX Format Support', description: 'Parses Microsoft Word .docx files including text formatting, paragraph styles, lists, tables, and embedded images.' },
      { title: 'Plain Text & Markdown', description: 'Convert .txt and .md files to clean, paginated PDFs with configurable typography.' },
      { title: 'Formatting Preservation', description: 'Bold, italic, underline, font sizes, colors, alignment, and list styles from the original document are reproduced in the PDF.' },
      { title: 'Fully Local Conversion', description: 'No file is ever sent to a server. Conversion happens entirely in your browser for complete document privacy.' },
    ],
    faqs: [
      { q: 'Does the output PDF look exactly like the Word document?', a: 'The tool achieves high fidelity for standard formatted documents. Complex layouts with text boxes, custom styles, and specific Word-only features may differ slightly. For pixel-perfect output, Microsoft Word or LibreOffice with a native export function produces the most accurate results.' },
      { q: 'Are images embedded in my Word document preserved?', a: 'Yes. Images embedded in .docx files are extracted and embedded into the PDF at their original size and quality.' },
      { q: 'Can I convert multiple Word documents at once?', a: 'Yes. Add multiple .docx or .txt files to the queue. Each file is converted individually and can be downloaded separately or as a ZIP archive.' },
      { q: 'What fonts are used in the converted PDF?', a: 'The tool maps Word fonts to the closest available PDF standard fonts (Helvetica for sans-serif, Times for serif, Courier for monospace). For best typography, select "Preserve Formatting" which uses the original font specifications where possible.' },
      { q: 'Can I convert .doc files (older Word format)?', a: 'Currently, the tool supports .docx (Office Open XML) format. Legacy .doc files are not supported. You can convert .doc to .docx for free using LibreOffice, Google Docs, or Word Online before using this tool.' },
    ],
  },

  organize: {
    title: 'Organize PDF – Reorder, Delete & Insert Pages',
    description: `Managing the page structure of a PDF document, such as reordering pages, removing unwanted pages, rotating individual pages, or inserting blank pages, is a common need when assembling or editing multi-page documents. LocalPDF's Organize PDF tool gives you a visual, drag-and-drop interface for all of these operations.

Every page of your PDF is rendered as a thumbnail in a scrollable grid. You can drag thumbnails to reorder pages, click the delete button to remove specific pages, rotate individual pages, or duplicate pages, all without any page being sent to a remote server.

When you are satisfied with the page arrangement, saving generates a new PDF containing only the pages you have kept in your specified order. All original page content, including images, text, and embedded fonts, is preserved exactly.`,
    howTo: [
      'Upload your PDF using the file selector or drag-and-drop.',
      'View all pages as thumbnails in the page grid.',
      'Drag thumbnails to rearrange the page order.',
      'Click the delete icon on any page to remove it.',
      'Use rotate buttons on individual pages if needed.',
      'Click "Save PDF" to download the reorganized document.',
    ],
    features: [
      { title: 'Visual Drag-and-Drop', description: 'Drag page thumbnails in the grid to rearrange them in any order. See the result visually before saving.' },
      { title: 'Page Deletion', description: 'Remove any unwanted pages with a single click. Delete multiple pages in one session before saving.' },
      { title: 'Rotate Individual Pages', description: 'Rotate any page independently by 90-degree increments within the organizer view.' },
      { title: 'Duplicate Pages', description: 'Duplicate any page to create copies at any position in the document.' },
    ],
    faqs: [
      { q: 'Can I undo page deletions before saving?', a: 'Yes. Changes are only applied when you click "Save PDF". You can freely delete, reorder, and restore pages within the session before committing.' },
      { q: 'Can I insert pages from another PDF?', a: 'The Organize tool works within a single PDF. To combine content from multiple PDFs, use our Merge PDF tool first, then use Organize to fine-tune the page order.' },
      { q: 'Will image and text quality be preserved when reorganizing?', a: 'Completely. The organize operation moves page content blocks without re-rendering or re-compressing anything. All content quality is preserved exactly.' },
      { q: 'Is there a limit to how many pages I can reorganize?', a: 'There is no imposed limit. Very large documents (100 or more pages) with high-resolution images may render thumbnails more slowly due to browser memory constraints.' },
      { q: 'Can I add blank pages between existing pages?', a: 'Yes. Use the "Insert Blank Page" feature to add an empty white page at any position in the document, useful for spacers in formatted reports or booklets.' },
    ],
  },
};

export default toolContent;
