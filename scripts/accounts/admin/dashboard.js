// pages/accounts/admin/dashboard logic: guard + welcome name + date.
// Stat numbers are filled by shell.js via [data-stat].
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    if (!admin) { location.href = 'admin'; return; }
    document.getElementById('dashAdminName').textContent = admin.username || 'Admin';
    try {
      document.getElementById('adminDashDate').textContent =
        new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();
    } catch (e) {}
    // Metric cards navigate to their area (keyboard accessible too).
    document.querySelectorAll('.metric-card[data-link]').forEach((card) => {
      card.addEventListener('click', () => { location.href = card.dataset.link; });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.href = card.dataset.link; }
      });
    });
  });
})();
