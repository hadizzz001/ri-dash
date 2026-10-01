/**
 * Barcodes are stored as strings (leading zeros matter). The digits printed
 * under an EAN/UPC are grouped with spaces, so whitespace is stripped.
 * An empty value means "no barcode".
 */
export const normalizeBarcode = (value) => {
  const code = String(value ?? '').replace(/\s+/g, '');
  return code || null;
};

/** The product already using `barcode` (ignoring `exceptId`), or null. */
export const findBarcodeOwner = (prisma, barcode, exceptId) =>
  prisma.product1.findFirst({
    where: { barcode, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true, title: true },
  });

export const barcodeTakenResponse = (owner) =>
  new Response(
    JSON.stringify({ error: `This barcode is already used by "${owner.title}".` }),
    { status: 409, headers: { 'Content-Type': 'application/json' } }
  );
