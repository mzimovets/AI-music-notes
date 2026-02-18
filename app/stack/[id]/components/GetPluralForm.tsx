export const getPluralForm = (count: number) => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "партитур";
  }

  if (lastDigit === 1) {
    return "партитура";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "партитуры";
  }

  return "партитур";
};
