export const generateWeightedPages = (totalSongs = 1000, limit = 10): number[] => {
  const totalPages = Math.ceil(totalSongs / limit);
  const pages: number[] = [];

  for (let i = 1; i <= totalPages; i++) {
    let weight = 1;

    if (i <= 10) weight = 10;          // very high priority
    else if (i <= 20) weight = 8;
    else if (i <= 50) weight = 5;
    else if (i <= 100) weight = 3;
    else if (i <= 200) weight = 2;
    else weight = 1;                   // lower priority

    pages.push(...Array(weight).fill(i));
  }

  return pages;
};