/**
 * Barcodes are stored as strings (leading zeros matter) exactly as typed,
 * with runs of whitespace collapsed to one space. Spaces are kept so a code
 * like "1111 rafidaham 1111" is shown and indexed by Google as separate
 * words. Comparisons ignore spaces/case, so scanning works either way.
 * An empty value means "no barcode".
 */
export const normalizeBarcode = (value) => {
  const code = String(value ?? '').replace(/\s+/g, ' ').trim();
  return code || null;
};

/** Comparison key: no whitespace or hyphens, lower-case. */
export const barcodeKey = (value) =>
  String(value ?? '').replace(/[\s-]+/g, '').toLowerCase();

/** The product already using `barcode` (ignoring `exceptId`), or null. */
export const findBarcodeOwner = async (prisma, barcode, exceptId) => {
  const key = barcodeKey(barcode);
  if (!key) return null;
  const rows = await prisma.product1.findMany({
    where: { barcode: { not: null }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true, title: true, barcode: true },
  });
  return rows.find((r) => barcodeKey(r.barcode) === key) ?? null;
};

export const barcodeTakenResponse = (owner) =>
  new Response(
    JSON.stringify({ error: `This barcode is already used by "${owner.title}".` }),
    { status: 409, headers: { 'Content-Type': 'application/json' } }
  );
