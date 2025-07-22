
// === DEVICE IDENTIFIER ===
function getDeviceId() {
  const info = navigator.userAgent + navigator.platform + navigator.language;
  let hash = 0;
  for (let i = 0; i < info.length; i++) {
    hash = (hash << 5) - hash + info.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

const deviceId = getDeviceId();

// === REDIRECT PAGE HANDLER ===
if (window.location.pathname.includes('redirect.html')) {
  const urlParams = new URLSearchParams(window.location.search);
  const targetName = urlParams.get('target');
  const trackingId = urlParams.get('id');

  if (!targetName || !trackingId) {
    location.href = 'lacak.html';
  } else {
    const log = {
      id: trackingId,
      target: targetName,
      timestamp: new Date().toISOString(),
      referrer: document.referrer || 'Direct',
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenWidth: screen.width,
      screenHeight: screen.height,
      language: navigator.language,
      deviceId: deviceId,
    };

    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        log.ip = data.ip;
        log.city = data.city;
        log.region = data.region;
        log.country = data.country_name;
        saveLog(log);
      })
      .catch(() => {
        log.ip = 'Unknown';
        saveLog(log);
      });

    function saveLog(entry) {
      const logs = JSON.parse(localStorage.getItem('trackingLogs') || '[]');
      logs.unshift(entry);
      localStorage.setItem('trackingLogs', JSON.stringify(logs));
      setTimeout(() => {
        window.location.href = `https://google.com/search?q=${encodeURIComponent(targetName)}`;
      }, 2000);
    }
  }
}

// === LACAK PAGE HANDLER ===
if (window.location.pathname.includes('lacak.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('linkInput');
    const addBtn = document.getElementById('addButton');
    const list = document.getElementById('linkList');

    function loadLinks() {
      const links = JSON.parse(localStorage.getItem('trackingLinks') || '[]');
      list.innerHTML = links.length === 0 ? '<div class="empty-state">Belum ada link tracking.</div>' : '';

      links.forEach(link => {
        const el = document.createElement('div');
        el.className = 'link-item';
        el.innerHTML = `
          <div>
            <div class="link-name">${link.name}</div>
            <div class="link-url">${link.url}</div>
          </div>
          <div class="link-actions">
            <button class="action-btn copy-btn" data-url="${link.url}">Copy</button>
            <button class="action-btn delete-btn" data-id="${link.id}">Delete</button>
          </div>`;
        list.appendChild(el);
      });

      list.querySelectorAll('.copy-btn').forEach(btn => {
        btn.onclick = () => {
          navigator.clipboard.writeText(btn.dataset.url);
          alert('Link copied!');
        };
      });

      list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          let links = JSON.parse(localStorage.getItem('trackingLinks') || '[]');
          links = links.filter(l => l.id !== id);
          localStorage.setItem('trackingLinks', JSON.stringify(links));
          loadLinks();
        };
      });
    }

    addBtn.onclick = () => {
      const name = input.value.trim();
      if (!name) return;
      const id = 'id-' + Date.now();
      const url = `${location.origin}/redirect.html?target=${encodeURIComponent(name)}&id=${id}`;
      const links = JSON.parse(localStorage.getItem('trackingLinks') || '[]');
      links.push({ id, name, url, createdAt: new Date().toISOString() });
      localStorage.setItem('trackingLinks', JSON.stringify(links));
      input.value = '';
      loadLinks();
    };

    loadLinks();
  });
}

// === ADMIN PAGE HANDLER ===
if (window.location.pathname.includes('admin.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    const viewMyBtn = document.getElementById('viewMyDevice');
    const viewAllBtn = document.getElementById('viewAllDevices');
    const tbody = document.getElementById('trackingTableBody');
    let viewMode = 'my';

    function render() {
      let logs = JSON.parse(localStorage.getItem('trackingLogs') || '[]');
      const links = JSON.parse(localStorage.getItem('trackingLinks') || '[]');
      if (viewMode === 'my') logs = logs.filter(l => l.deviceId === deviceId);
      tbody.innerHTML = '';
      if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No data</td></tr>';
        return;
      }

      logs.forEach(log => {
        const link = links.find(l => l.id === log.id);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${log.id}</td>
          <td>${link ? link.name : 'Unknown'}</td>
          <td>${log.ip || 'N/A'}</td>
          <td>${log.city || 'N/A'}, ${log.country || 'N/A'}</td>
          <td>${log.referrer}</td>
          <td>${new Date(log.timestamp).toLocaleString()}</td>
          <td>${log.deviceId}</td>`;
        tbody.appendChild(row);
      });
    }

    viewMyBtn.onclick = () => {
      viewMode = 'my';
      viewMyBtn.classList.add('active');
      viewAllBtn.classList.remove('active');
      render();
    };

    viewAllBtn.onclick = () => {
      viewMode = 'all';
      viewAllBtn.classList.add('active');
      viewMyBtn.classList.remove('active');
      render();
    };

    render();
  });
}
