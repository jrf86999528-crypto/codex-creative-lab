(function () {
  var params = new URLSearchParams(location.search);
  var plaza = params.get('plaza');
  var started = Date.now();
  function ready() {
    return typeof STATE !== 'undefined' && STATE.data && document.getElementById('app') && !document.getElementById('app').hidden;
  }
  function select() {
    if (ready()) {
      if (plaza && STATE.data.plaza_table.some(function (row) { return row.name === plaza; })) {
        setPlaza(plaza);
        var target = document.getElementById('regional-workbench');
        if (target) target.scrollIntoView({block:'start'});
      } else if (location.hash) {
        var id = location.hash.replace(/^#/, '').split('=')[0];
        var el = document.getElementById(id);
        if (el) requestAnimationFrame(function () { el.scrollIntoView({block:'start'}); });
      }
    } else if (Date.now() - started < 20000) {
      setTimeout(select, 100);
    }
  }
  select();
}());
