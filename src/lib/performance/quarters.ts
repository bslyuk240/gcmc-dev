export function getQuarters(): { value: string; label: string; periodLabel: string; endDate: Date }[] {
  const now = new Date();
  const year = now.getFullYear();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const months = ["January – March", "April – June", "July – September", "October – December"];
  const endMonths = [2, 5, 8, 11];
  const result = [];

  for (let i = 0; i < 4; i++) {
    let qn = q - i;
    let yr = year;
    if (qn <= 0) {
      qn += 4;
      yr--;
    }
    result.push({
      value: `Q${qn}-${yr}`,
      label: `Q${qn} ${yr} (${months[qn - 1]})`,
      periodLabel: `${months[qn - 1]} ${yr}`,
      endDate: new Date(yr, endMonths[qn - 1], qn === 1 || qn === 4 ? 31 : 30),
    });
  }

  return result;
}

export function getCurrentQuarter() {
  return getQuarters()[0];
}
