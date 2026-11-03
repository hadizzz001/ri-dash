'use client';

/**
 * Barcode field for a USB / Bluetooth scanner gun (it types the code and
 * presses Enter). The code can also be typed by hand.
 *
 * Enter never submits the surrounding form — scanner guns always send it —
 * and selects the code, so the next scan replaces it instead of appending.
 */
export default function BarcodeInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type or scan the barcode',
  className = '',
  inputClassName = 'rd-mono',
  autoFocus = false,
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.select();
          onSubmit?.(e.currentTarget.value.trim());
        }
      }}
      placeholder={placeholder}
      autoFocus={autoFocus}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      className={`rd-input ${inputClassName} ${className}`}
    />
  );
}
