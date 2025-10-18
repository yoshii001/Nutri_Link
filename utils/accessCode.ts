export const generateAccessCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const letters = Array.from({ length: 7 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');

  const symbols = ['$', '@', '#', '*'];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];

  return `${letters}${symbol}`;
};

export const validateAccessCode = (code: string): boolean => {
  if (!code || code.trim().length === 0) return false;

  if (code.length === 8) {
    const letterPart = code.substring(0, 7);
    const symbolPart = code.substring(7, 8);
    const hasValidLetters = /^[A-Za-z]{7}$/.test(letterPart);
    const hasValidSymbol = /^[$@#*]$/.test(symbolPart);
    return hasValidLetters && hasValidSymbol;
  }

  return false;
};
