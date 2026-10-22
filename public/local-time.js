// Times arrive in UK time; show them in the reader's own time zone instead.
// And while the page is open, check for news every few minutes.
(() => {
  const year = new Date().getFullYear();
  for (const t of document.querySelectorAll('time[datetime]')) {
    const d = new Date(t.getAttribute('datetime'));
    if (Number.isNaN(d.getTime())) continue;
    t.title = t.textContent;
    t.textContent = d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      ...(d.getFullYear() === year ? {} : { year: 'numeric' }),
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }
  setInterval(() => {
    if (document.visibilityState === 'visible') location.reload();
  }, 5 * 60 * 1000);
})();
