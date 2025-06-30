
export const generateWeightedPages = (totalSongs = 1000, limit = 10): number[] => {
  const totalPages = Math.ceil(totalSongs / limit);
  const pages: number[] = [];

  for (let i = 1; i <= totalPages; i++) {
    let weight = 1;

    if (i <= 10) weight = 100;               // 🔥 Maximum weight
    else if (i <= 20) weight = 75;
    else if (i <= 50) weight = 50;
    else if (i <= 100) weight = 10;
    else if (i <= 200) weight = 2;
    else weight = 1;                        // Low priority beyond page 200

    pages.push(...Array(weight).fill(i));
  }
console.log(pages)
  return pages;
};
