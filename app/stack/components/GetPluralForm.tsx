export const getPluralForm = (count) => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  // Исключения: 11-14 всегда "партитур"
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "партитур";
  }

  // 1 -> партитура (21, 31...)
  if (lastDigit === 1) {
    return "партитура";
  }

  // 2, 3, 4 -> партитуры (22, 33, 44...)
  if (lastDigit >= 2 && lastDigit <= 4) {
    return "партитуры";
  }

  // Все остальные (0, 5-9) -> партитур
  return "партитур";
};
