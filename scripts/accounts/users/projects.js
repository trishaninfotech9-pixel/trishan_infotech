// pages/accounts/projects.html logic: guard + welcome name.
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('trishan_user') || 'null'); } catch (e) { user = null; }
    if (!user) { location.href = 'login.html'; return; }
    document.getElementById('projName').textContent = user.first_name || 'User';
  });
})();
