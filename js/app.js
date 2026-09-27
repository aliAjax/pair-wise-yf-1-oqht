/** 简易 hash 路由：切换四个页面 */
(function () {
  var root = document.getElementById('page');
  var links = document.querySelectorAll('#nav a');

  function route() {
    var name = (location.hash || '#/register').replace('#/', '');
    var page = window.OBS_PAGES[name] || window.OBS_PAGES.register;
    links.forEach(function (a) {
      a.classList.toggle('active', a.dataset.route === name);
    });
    page(root);
  }

  window.addEventListener('hashchange', route);
  route();
})();
