export const formatAmount = (amount: number): string => {
  const absAmount = Math.abs(amount);
  
  const formatWithSpaces = (num: number) => {
    return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };
  
  if (absAmount >= 1000) {
    if (absAmount >= 1000000) {
      return `${formatWithSpaces(absAmount / 1000)}k ₸`;
    }
    return `${formatWithSpaces(absAmount)} ₸`;
  }
  
  return `${formatWithSpaces(absAmount)} ₸`;
};